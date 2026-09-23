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

    fun weekDays(anchor: LocalDate): List<LocalDate> {
        val monday = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        return (0..6).map { monday.plusDays(it.toLong()) }
    }

    fun monthGridDays(anchor: LocalDate): List<LocalDate> {
        val firstDayOfMonth = anchor.withDayOfMonth(1)
        val gridStart = firstDayOfMonth.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        return (0 until 42).map { gridStart.plusDays(it.toLong()) }
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
}
