package com.taskorbit.domain

import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.Task
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters

data class PlanColumnLayout(
    val column: Int,
    val columnCount: Int
)

data class SpanningTaskSegment(
    val task: Task,
    val startCol: Int,
    val endCol: Int,
    val isStart: Boolean,
    val isEnd: Boolean,
    val slot: Int
)

data class WeekSpanningLayout(
    val visibleSegments: List<SpanningTaskSegment>,
    val overflowPerCol: Map<Int, Int> = emptyMap(),
    val totalSlots: Int = 0
)

enum class CalendarMode {
    DAY,
    WEEK,
    MONTH
}

enum class WeekCalendarMode {
    GANTT,
    PLANS
}

object CalendarModel {

    private val DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    fun timeToMinutes(hhmm: String): Int {
        val parts = hhmm.split(":")
        val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
        val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
        return h * 60 + m
    }

    fun minutesToTime(totalMinutes: Int): String {
        val m = ((totalMinutes % 1440) + 1440) % 1440
        val h = m / 60
        val min = m % 60
        return String.format("%02d:%02d", h, min)
    }

    /**
     * 重叠计划分列计算：
     * 针对在同一时间段内有重叠的计划，按聚类（Cluster）分组，并分配在并排的不同列中。
     */
    fun layoutPlanColumns(plans: List<DailyPlan>): Map<String, PlanColumnLayout> {
        val layouts = mutableMapOf<String, PlanColumnLayout>()
        if (plans.isEmpty()) return layouts

        val sorted = plans.sortedWith(
            compareBy<DailyPlan> { timeToMinutes(it.startTime) }
                .thenByDescending { timeToMinutes(it.endTime) }
        )

        val clusters = mutableListOf<MutableList<DailyPlan>>()
        var currentCluster = mutableListOf<DailyPlan>()
        var clusterEnd = -1

        for (plan in sorted) {
            val start = timeToMinutes(plan.startTime)
            val end = timeToMinutes(plan.endTime)

            if (currentCluster.isEmpty() || start < clusterEnd) {
                currentCluster.add(plan)
                clusterEnd = maxOf(clusterEnd, end)
            } else {
                clusters.add(currentCluster)
                currentCluster = mutableListOf(plan)
                clusterEnd = end
            }
        }
        if (currentCluster.isNotEmpty()) {
            clusters.add(currentCluster)
        }

        for (cluster in clusters) {
            val columns = mutableListOf<MutableList<DailyPlan>>()

            for (plan in cluster) {
                val start = timeToMinutes(plan.startTime)
                val reusableIndex = columns.indexOfFirst { col ->
                    val last = col.lastOrNull()
                    last != null && timeToMinutes(last.endTime) <= start
                }

                val colIndex = if (reusableIndex == -1) {
                    columns.add(mutableListOf())
                    columns.size - 1
                } else {
                    reusableIndex
                }
                columns[colIndex].add(plan)
            }

            val count = columns.size
            columns.forEachIndexed { colIdx, colPlans ->
                colPlans.forEach { plan ->
                    layouts[plan.id] = PlanColumnLayout(column = colIdx, columnCount = count)
                }
            }
        }

        return layouts
    }

    fun visibleHourRange(plans: List<DailyPlan>, includeHour: Int? = null): Pair<Int, Int> {
        val earliest = if (plans.isNotEmpty()) plans.minOf { timeToMinutes(it.startTime) } else 8 * 60
        val latest = if (plans.isNotEmpty()) plans.maxOf { timeToMinutes(it.endTime) } else 18 * 60

        val minLimit = if (includeHour != null) minOf(8, earliest / 60, includeHour) else minOf(8, earliest / 60)
        val maxLimit = if (includeHour != null) maxOf(20, (latest + 59) / 60, includeHour + 1) else maxOf(20, (latest + 59) / 60)

        val startHour = maxOf(0, minLimit)
        val endHour = minOf(23, maxLimit)
        return Pair(startHour, endHour)
    }

    fun weekDays(anchor: LocalDate, startOfWeek: DayOfWeek = DayOfWeek.SUNDAY): List<LocalDate> {
        val start = anchor.with(TemporalAdjusters.previousOrSame(startOfWeek))
        return (0..6).map { start.plusDays(it.toLong()) }
    }

    fun monthGridDays(anchor: LocalDate, startOfWeek: DayOfWeek = DayOfWeek.SUNDAY): List<LocalDate> {
        val firstDayOfMonth = anchor.withDayOfMonth(1)
        val gridStart = firstDayOfMonth.with(TemporalAdjusters.previousOrSame(startOfWeek))
        return (0 until 42).map { gridStart.plusDays(it.toLong()) }
    }

    fun tasksByDate(tasks: List<Task>, days: List<LocalDate>): Map<LocalDate, List<Task>> {
        val map = days.associateWith { day ->
            val iso = day.format(DATE_FORMATTER)
            tasks.filter { it.startDate <= iso && it.endDate >= iso }
        }
        return map
    }

    fun taskRangeInWeek(task: Task, weekDays: List<LocalDate>): Pair<Int, Int>? {
        val weekStart = weekDays.first()
        val weekEnd = weekDays.last()

        val taskStart = try { LocalDate.parse(task.startDate, DATE_FORMATTER) } catch (_: Exception) { return null }
        val taskEnd = try { LocalDate.parse(task.endDate, DATE_FORMATTER) } catch (_: Exception) { return null }

        if (taskEnd.isBefore(weekStart) || taskStart.isAfter(weekEnd)) return null

        val visibleStart = if (taskStart.isBefore(weekStart)) weekStart else taskStart
        val visibleEnd = if (taskEnd.isAfter(weekEnd)) weekEnd else taskEnd

        val startIdx = java.time.temporal.ChronoUnit.DAYS.between(weekStart, visibleStart).toInt().coerceIn(0, 6)
        val endIdx = java.time.temporal.ChronoUnit.DAYS.between(weekStart, visibleEnd).toInt().coerceIn(0, 6)

        return Pair(startIdx, endIdx)
    }

    /**
     * 月视图周行中多天连续任务条（Spanning Task Bars）贪心槽位排布算法：
     * 1. 筛选落入该周的任务，跨多天任务优先分配顶部连续槽位；
     * 2. 在不重叠前提下尽量复用槽位；
     * 3. 计算超限溢出（overflow），超过最大可见槽位展示 +N 提示。
     */
    fun layoutSpanningTasksInWeek(
        tasks: List<Task>,
        weekDays: List<LocalDate>,
        maxVisibleSlots: Int = 3
    ): WeekSpanningLayout {
        if (tasks.isEmpty() || weekDays.isEmpty()) {
            return WeekSpanningLayout(emptyList(), emptyMap(), 0)
        }

        val weekStart = weekDays.first()
        val weekEnd = weekDays.last()
        val weekStartIso = weekStart.format(DATE_FORMATTER)
        val weekEndIso = weekEnd.format(DATE_FORMATTER)

        // 筛选落入本周并计算有效跨列范围的任务
        val candidateTasks = tasks.mapNotNull { task ->
            val range = taskRangeInWeek(task, weekDays) ?: return@mapNotNull null
            val isStart = task.startDate >= weekStartIso
            val isEnd = task.endDate <= weekEndIso
            Triple(task, range, Pair(isStart, isEnd))
        }

        if (candidateTasks.isEmpty()) {
            return WeekSpanningLayout(emptyList(), emptyMap(), 0)
        }

        // 排序：多天跨度优先（保持跨天长条在上方稳定连贯），其次按起始列、起始日期与任务 ID 排序
        val sorted = candidateTasks.sortedWith(
            compareByDescending<Triple<Task, Pair<Int, Int>, Pair<Boolean, Boolean>>> { it.second.second - it.second.first + 1 }
                .thenBy { it.second.first }
                .thenBy { it.first.startDate }
                .thenBy { it.first.id }
        )

        val slots = mutableListOf<BooleanArray>()
        val allSegments = mutableListOf<SpanningTaskSegment>()
        val dayCounts = IntArray(7)

        for ((task, range, bounds) in sorted) {
            val (startCol, endCol) = range
            val (isStart, isEnd) = bounds

            for (c in startCol..endCol) {
                dayCounts[c]++
            }

            var assignedSlot = -1
            for (s in slots.indices) {
                var canFit = true
                for (c in startCol..endCol) {
                    if (slots[s][c]) {
                        canFit = false
                        break
                    }
                }
                if (canFit) {
                    assignedSlot = s
                    break
                }
            }

            if (assignedSlot == -1) {
                assignedSlot = slots.size
                slots.add(BooleanArray(7))
            }

            for (c in startCol..endCol) {
                slots[assignedSlot][c] = true
            }

            allSegments.add(
                SpanningTaskSegment(
                    task = task,
                    startCol = startCol,
                    endCol = endCol,
                    isStart = isStart,
                    isEnd = isEnd,
                    slot = assignedSlot
                )
            )
        }

        // 确定各天是否存在溢出（超出 maxVisibleSlots）
        val overflowMap = mutableMapOf<Int, Int>()
        for (c in 0..6) {
            if (dayCounts[c] > maxVisibleSlots) {
                // 超出的任务数量（由于最后 1 个可见槽位用于展示 "+N" 胶囊，因此多出来的任务数是 dayCounts[c] - (maxVisibleSlots - 1)）
                overflowMap[c] = dayCounts[c] - (maxVisibleSlots - 1)
            }
        }

        // 筛选可见的横条：
        // 1. 如果 slot < maxVisibleSlots - 1（如 slot 0, 1），始终可见
        // 2. 如果 slot == maxVisibleSlots - 1（如 slot 2），仅在其跨越的列中没有任意一列发生溢出时保留；若存在溢出列，则该列由 "+N" 承载
        val visibleSegments = allSegments.filter { seg ->
            if (seg.slot < maxVisibleSlots - 1) {
                true
            } else if (seg.slot == maxVisibleSlots - 1) {
                (seg.startCol..seg.endCol).none { c -> overflowMap.containsKey(c) }
            } else {
                false
            }
        }

        return WeekSpanningLayout(
            visibleSegments = visibleSegments,
            overflowPerCol = overflowMap,
            totalSlots = slots.size
        )
    }
}
