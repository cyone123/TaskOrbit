package com.taskorbit

import com.taskorbit.domain.CalendarModel
import com.taskorbit.domain.DailyPlanDomain
import com.taskorbit.domain.DailyPlanInput
import com.taskorbit.domain.RecurrenceEngine
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.DailyPlanRepeat
import com.taskorbit.domain.model.Task
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class CalendarRecurrenceTest {

    @Test
    fun `expandDates expands daily, weekly and monthly correctly`() {
        // none
        val noneDates = RecurrenceEngine.expandDates("2026-09-01", DailyPlanRepeat.NONE, 5)
        assertEquals(listOf("2026-09-01"), noneDates)

        // daily
        val dailyDates = RecurrenceEngine.expandDates("2026-09-01", DailyPlanRepeat.DAILY, 3)
        assertEquals(listOf("2026-09-01", "2026-09-02", "2026-09-03"), dailyDates)

        // weekly
        val weeklyDates = RecurrenceEngine.expandDates("2026-09-01", DailyPlanRepeat.WEEKLY, 3)
        assertEquals(listOf("2026-09-01", "2026-09-08", "2026-09-15"), weeklyDates)

        // monthly
        val monthlyDates = RecurrenceEngine.expandDates("2026-01-31", DailyPlanRepeat.MONTHLY, 2)
        assertEquals(listOf("2026-01-31", "2026-02-28"), monthlyDates)
    }

    @Test
    fun `createDailyPlans expands repeat rules into multiple instances`() {
        val input = DailyPlanInput(
            name = "站会",
            date = "2026-09-01",
            startTime = "09:30",
            endTime = "10:00",
            repeat = DailyPlanRepeat.DAILY,
            repeatCount = 3
        )

        val plans = DailyPlanDomain.createDailyPlans(input)
        assertEquals(3, plans.size)
        assertEquals("2026-09-01", plans[0].date)
        assertEquals("2026-09-02", plans[1].date)
        assertEquals("2026-09-03", plans[2].date)

        assertNotNull(plans[0].recurrence.seriesId)
        assertEquals(plans[0].recurrence.seriesId, plans[1].recurrence.seriesId)
        assertEquals(1, plans[0].recurrence.occurrence)
        assertEquals(2, plans[1].recurrence.occurrence)
        assertEquals(3, plans[2].recurrence.occurrence)
    }

    @Test
    fun `layoutPlanColumns allocates overlapping plans into distinct columns`() {
        val p1 = DailyPlan(id = "1", name = "Plan 1", date = "2026-09-01", startTime = "09:00", endTime = "10:00", createdAt = 0, updatedAt = 0)
        val p2 = DailyPlan(id = "2", name = "Plan 2", date = "2026-09-01", startTime = "09:30", endTime = "10:30", createdAt = 0, updatedAt = 0)
        val p3 = DailyPlan(id = "3", name = "Plan 3", date = "2026-09-01", startTime = "10:30", endTime = "11:30", createdAt = 0, updatedAt = 0)

        val layouts = CalendarModel.layoutPlanColumns(listOf(p1, p2, p3))

        // p1 和 p2 重叠，必须在不同列，columnCount 至少为 2
        val l1 = layouts["1"]!!
        val l2 = layouts["2"]!!
        assertEquals(2, l1.columnCount)
        assertEquals(2, l2.columnCount)
        assertEquals(0, l1.column)
        assertEquals(1, l2.column)

        // p3 与 p1 不重叠，可复用第 0 列
        val l3 = layouts["3"]!!
        assertEquals(0, l3.column)
    }

    @Test
    fun `taskRangeInWeek computes correct horizontal span indices`() {
        val weekDays = CalendarModel.weekDays(LocalDate.of(2026, 9, 21), java.time.DayOfWeek.MONDAY) // 2026-09-21 (Mon) to 2026-09-27 (Sun)

        // 任务跨越周二至周五
        val task1 = Task(id = "t1", projectId = "p1", name = "T1", startDate = "2026-09-22", endDate = "2026-09-25", createdAt = 0, updatedAt = 0)
        val range1 = CalendarModel.taskRangeInWeek(task1, weekDays)
        assertNotNull(range1)
        assertEquals(1, range1!!.first) // 0-indexed: Mon=0, Tue=1
        assertEquals(4, range1.second) // Fri=4

        // 任务完全在当前周之前
        val task2 = Task(id = "t2", projectId = "p1", name = "T2", startDate = "2026-09-10", endDate = "2026-09-15", createdAt = 0, updatedAt = 0)
        val range2 = CalendarModel.taskRangeInWeek(task2, weekDays)
        assertNull(range2)
    }

    @Test
    fun `weekDays defaults to Sunday first and tasksByDate correctly maps tasks`() {
        val sunWeekDays = CalendarModel.weekDays(LocalDate.of(2026, 9, 23)) // Wednesday
        assertEquals(java.time.DayOfWeek.SUNDAY, sunWeekDays.first().dayOfWeek)
        assertEquals(java.time.DayOfWeek.SATURDAY, sunWeekDays.last().dayOfWeek)

        val taskA = Task(id = "a", projectId = "p1", name = "A", startDate = "2026-09-20", endDate = "2026-09-21", createdAt = 0, updatedAt = 0)
        val taskB = Task(id = "b", projectId = "p2", name = "B", startDate = "2026-09-21", endDate = "2026-09-22", createdAt = 0, updatedAt = 0)
        val byDate = CalendarModel.tasksByDate(listOf(taskA, taskB), sunWeekDays)

        assertEquals(1, byDate[LocalDate.of(2026, 9, 20)]?.size) // taskA only
        assertEquals(2, byDate[LocalDate.of(2026, 9, 21)]?.size) // taskA and taskB
        assertEquals(1, byDate[LocalDate.of(2026, 9, 22)]?.size) // taskB only
        assertEquals(0, byDate[LocalDate.of(2026, 9, 23)]?.size) // none
    }

    @Test
    fun `timeToMinutes and minutesToTime accurately convert and snap 15-minute slots`() {
        assertEquals(570, CalendarModel.timeToMinutes("09:30"))
        assertEquals("09:30", CalendarModel.minutesToTime(570))
        assertEquals("00:00", CalendarModel.minutesToTime(0))
        assertEquals("23:45", CalendarModel.minutesToTime(1425))

        // 模拟拖拽微小位移后的 15 分钟槽位吸附（Snap）
        val rawMinutes = 570 + 8 // 移动了 8 分钟 -> 应四舍五入吸附到 585 (09:45)
        val snappedMinutes = ((rawMinutes + 7) / 15) * 15
        assertEquals(585, snappedMinutes)
        assertEquals("09:45", CalendarModel.minutesToTime(snappedMinutes))
    }

    @Test
    fun `reschedule daily plan updates start and end time with proper duration preservation`() {
        val plan = DailyPlan(
            id = "plan-1",
            name = "架构评审",
            date = "2026-09-23",
            startTime = "10:00",
            endTime = "11:00",
            estimatedMinutes = 60,
            createdAt = 1000L,
            updatedAt = 1000L
        )
        val initialAppState = com.taskorbit.domain.model.AppState(dailyPlans = listOf(plan))

        val patch = com.taskorbit.domain.DailyPlanPatch(
            startTime = "14:30",
            endTime = "15:30",
            estimatedMinutes = 60
        )
        val updatedState = DailyPlanDomain.updateDailyPlanState(initialAppState, "plan-1", patch)
        val updatedPlan = updatedState.dailyPlans.find { it.id == "plan-1" }

        assertNotNull(updatedPlan)
        assertEquals("14:30", updatedPlan!!.startTime)
        assertEquals("15:30", updatedPlan.endTime)
        assertEquals(60, updatedPlan.estimatedMinutes)
        assertEquals("架构评审", updatedPlan.name)
    }

    @Test
    fun `visibleHourRange provides standard bounds even with empty plans`() {
        val emptyRange = CalendarModel.visibleHourRange(emptyList())
        assertEquals(8, emptyRange.first)
        assertEquals(20, emptyRange.second)

        val earlyPlan = DailyPlan(id = "e", name = "Early", date = "2026-09-23", startTime = "06:15", endTime = "07:00", createdAt = 0, updatedAt = 0)
        val earlyRange = CalendarModel.visibleHourRange(listOf(earlyPlan))
        assertEquals(6, earlyRange.first)
        assertEquals(20, earlyRange.second)
    }

    @Test
    fun `visibleHourRange dynamically expands bounds to guarantee inclusion of current time`() {
        // Early morning at 5 AM (before default 8 AM)
        val earlyMorningRange = CalendarModel.visibleHourRange(emptyList(), includeHour = 5)
        assertEquals(5, earlyMorningRange.first)
        assertEquals(20, earlyMorningRange.second)

        // Late night at 22 (10 PM, after default 20)
        val lateNightRange = CalendarModel.visibleHourRange(emptyList(), includeHour = 22)
        assertEquals(8, lateNightRange.first)
        assertEquals(23, lateNightRange.second)
        assertEquals(24, CalendarModel.visibleHourRange(emptyList(), includeHour = 23).second)

        // Mid-day at 14 (within standard 8..20)
        val midDayRange = CalendarModel.visibleHourRange(emptyList(), includeHour = 14)
        assertEquals(8, midDayRange.first)
        assertEquals(20, midDayRange.second)
    }

    @Test
    fun `drag snap boundary clamping preserves validity and duration`() {
        val origStartMin = CalendarModel.timeToMinutes("10:00") // 600
        val origEndMin = CalendarModel.timeToMinutes("11:30")   // 690, duration = 90 min
        val durMin = origEndMin - origStartMin

        // 1. 向上拖拽越界（比如 delta = -700，想要拖到负数时间）
        val rawEarly = origStartMin - 700
        val maxStartSlot = maxOf(0, ((1439 - durMin) / 15) * 15)
        val snappedEarlyStart = (((rawEarly + 7) / 15) * 15).coerceIn(0, maxStartSlot)
        val snappedEarlyEnd = snappedEarlyStart + durMin
        assertEquals(0, snappedEarlyStart) // 00:00
        assertEquals(90, snappedEarlyEnd)  // 01:30
        assertEquals("00:00", CalendarModel.minutesToTime(snappedEarlyStart))
        assertEquals("01:30", CalendarModel.minutesToTime(snappedEarlyEnd))

        // 2. 向下拖拽越界（比如 delta = +900，想要拖到深更半夜甚至第二天）
        val rawLate = origStartMin + 900
        val snappedLateStart = (((rawLate + 7) / 15) * 15).coerceIn(0, maxStartSlot)
        val snappedLateEnd = snappedLateStart + durMin
        // maxStartSlot for 90min: (1439 - 90) = 1349 / 15 * 15 = 1335 (22:15)
        assertEquals(1335, snappedLateStart)
        assertEquals(1425, snappedLateEnd) // 23:45
        assertEquals("22:15", CalendarModel.minutesToTime(snappedLateStart))
        assertEquals("23:45", CalendarModel.minutesToTime(snappedLateEnd))
        assertEquals(durMin, snappedLateEnd - snappedLateStart)
    }

    @Test
    fun `layoutSpanningTasksInWeek assigns continuous multi-day slots and reuses non-overlapping slots`() {
        val weekDays = CalendarModel.weekDays(LocalDate.of(2026, 9, 23)) // Sun 2026-09-20 to Sat 2026-09-26

        // Task 1: Mon(1) to Wed(3) (span = 3)
        val task1 = Task(id = "t1", projectId = "p1", name = "设计评审", startDate = "2026-09-21", endDate = "2026-09-23", createdAt = 0, updatedAt = 0)
        // Task 2: Wed(3) to Fri(5) (span = 3) -> overlaps task1 on Wed(3), should be in slot 1
        val task2 = Task(id = "t2", projectId = "p2", name = "代码重构", startDate = "2026-09-23", endDate = "2026-09-25", createdAt = 0, updatedAt = 0)
        // Task 3: Thu(4) to Fri(5) (span = 2) -> does NOT overlap task1(1..3), should reuse slot 0
        val task3 = Task(id = "t3", projectId = "p1", name = "单元测试", startDate = "2026-09-24", endDate = "2026-09-25", createdAt = 0, updatedAt = 0)

        val layout = CalendarModel.layoutSpanningTasksInWeek(listOf(task1, task2, task3), weekDays, maxVisibleSlots = 3)

        assertEquals(3, layout.visibleSegments.size)
        val seg1 = layout.visibleSegments.find { it.task.id == "t1" }!!
        val seg2 = layout.visibleSegments.find { it.task.id == "t2" }!!
        val seg3 = layout.visibleSegments.find { it.task.id == "t3" }!!

        assertEquals(0, seg1.slot)
        assertEquals(1, seg1.startCol)
        assertEquals(3, seg1.endCol)
        assertTrue(seg1.isStart)
        assertTrue(seg1.isEnd)

        assertEquals(1, seg2.slot)
        assertEquals(3, seg2.startCol)
        assertEquals(5, seg2.endCol)

        // seg3 reuses slot 0 without collision!
        assertEquals(0, seg3.slot)
        assertEquals(4, seg3.startCol)
        assertEquals(5, seg3.endCol)
    }

    @Test
    fun `interleaved tasks use only the maximum concurrent tracks`() {
        val weekDays = CalendarModel.weekDays(LocalDate.of(2026, 9, 23))
        val tasks = listOf(
            spanningTask("a", "2026-09-20", "2026-09-22"),
            spanningTask("b", "2026-09-22", "2026-09-23"),
            spanningTask("c", "2026-09-23", "2026-09-24"),
            spanningTask("d", "2026-09-24", "2026-09-26")
        )

        val layout = CalendarModel.layoutSpanningTasksInWeek(tasks, weekDays, maxVisibleSlots = 2)

        assertEquals(2, layout.totalSlots)
        assertEquals(4, layout.visibleSegments.size)
        assertTrue(layout.overflowPerCol.isEmpty())
    }

    @Test
    fun `overflow indicator does not consume the last task track`() {
        val weekDays = CalendarModel.weekDays(LocalDate.of(2026, 9, 23))
        val tasks = listOf(
            spanningTask("a", "2026-09-20", "2026-09-26"),
            spanningTask("b", "2026-09-20", "2026-09-26"),
            spanningTask("c", "2026-09-20", "2026-09-26"),
            spanningTask("d", "2026-09-23", "2026-09-23")
        )

        val layout = CalendarModel.layoutSpanningTasksInWeek(tasks, weekDays, maxVisibleSlots = 3)
        val lastTrack = layout.visibleSegments.single { it.task.id == "c" }

        assertEquals(mapOf(3 to 1), layout.overflowPerCol)
        assertEquals(0, lastTrack.startCol)
        assertEquals(6, lastTrack.endCol)
        assertTrue(lastTrack.isStart)
        assertTrue(lastTrack.isEnd)
        for (col in 0..6) {
            val visibleCount = layout.visibleSegments.count { col in it.startCol..it.endCol }
            assertEquals(3, visibleCount)
        }
    }

    @Test
    fun `hidden continuing tasks remain counted after other tracks end`() {
        val weekDays = CalendarModel.weekDays(LocalDate.of(2026, 9, 23))
        val tasks = listOf(
            spanningTask("a", "2026-09-20", "2026-09-22"),
            spanningTask("b", "2026-09-21", "2026-09-24")
        )

        val layout = CalendarModel.layoutSpanningTasksInWeek(tasks, weekDays, maxVisibleSlots = 1)

        assertEquals(mapOf(1 to 1, 2 to 1, 3 to 1, 4 to 1), layout.overflowPerCol)
        val visible = layout.visibleSegments.single()
        assertEquals("a", visible.task.id)
        assertEquals(0, visible.startCol)
        assertEquals(2, visible.endCol)
        assertTrue(visible.isStart)
        assertTrue(visible.isEnd)
    }

    private fun spanningTask(id: String, startDate: String, endDate: String) = Task(
        id = id, projectId = "p", name = id, startDate = startDate, endDate = endDate,
        createdAt = 0, updatedAt = 0
    )

    @Test
    fun `month tracks match desktop fixed tracks and daily hidden counts`() {
        val weekDays = CalendarModel.weekDays(LocalDate.of(2026, 9, 23), java.time.DayOfWeek.MONDAY)
        val tasks = listOf(
            spanningTask("d", "2026-09-25", "2026-09-27"),
            spanningTask("c", "2026-09-22", "2026-09-25"),
            spanningTask("b", "2026-09-18", "2026-09-22"),
            spanningTask("a", "2026-09-21", "2026-09-24")
        )

        val fullLayout = CalendarModel.layoutSpanningTasksInWeek(tasks, weekDays, maxVisibleSlots = 3)
        assertEquals(listOf("a" to 0, "b" to 1, "c" to 2, "d" to 0),
            fullLayout.visibleSegments.map { it.task.id to it.slot })
        assertFalse(fullLayout.visibleSegments.single { it.task.id == "b" }.isStart)

        val limitedLayout = CalendarModel.layoutSpanningTasksInWeek(tasks, weekDays, maxVisibleSlots = 2)
        assertEquals(listOf("a", "b", "d"), limitedLayout.visibleSegments.map { it.task.id })
        assertEquals(mapOf(1 to 1, 2 to 1, 3 to 1, 4 to 1), limitedLayout.overflowPerCol)
        // 周五低轨道已空出，桌面端仍保持 c 在轨道 2，避免跨天横条跳轨。
        assertEquals(1, limitedLayout.visibleSegments.count { 4 in it.startCol..it.endCol })
    }

    @Test
    fun `month tracks normalize reversed dates like desktop`() {
        val weekDays = CalendarModel.weekDays(LocalDate.of(2026, 9, 23), java.time.DayOfWeek.MONDAY)
        val layout = CalendarModel.layoutSpanningTasksInWeek(
            listOf(spanningTask("a", "2026-09-23", "2026-09-18")), weekDays
        )
        val segment = layout.visibleSegments.single()
        assertEquals(0, segment.startCol)
        assertEquals(2, segment.endCol)
        assertFalse(segment.isStart)
        assertTrue(segment.isEnd)
    }

    @Test
    fun `layoutSpanningTasksInWeek marks continuation boundaries across weeks and calculates overflow`() {
        val weekDays = CalendarModel.weekDays(LocalDate.of(2026, 9, 23)) // Sun 2026-09-20 to Sat 2026-09-26

        // 跨周任务：上一周开始 (09-18)，在当前周周二结束 (09-22)
        val crossTask = Task(id = "c1", projectId = "p1", name = "跨周任务", startDate = "2026-09-18", endDate = "2026-09-22", createdAt = 0, updatedAt = 0)
        val layout1 = CalendarModel.layoutSpanningTasksInWeek(listOf(crossTask), weekDays)
        val seg = layout1.visibleSegments.first()
        assertEquals(0, seg.startCol) // Sun=0
        assertEquals(2, seg.endCol)   // Tue=2
        assertFalse(seg.isStart)      // Started before this week
        assertTrue(seg.isEnd)         // Ends in this week

        // 溢出测试：在周三 (2026-09-23, col=3) 堆叠 4 个任务
        val tA = Task(id = "a", projectId = "p", name = "A", startDate = "2026-09-23", endDate = "2026-09-23", createdAt = 0, updatedAt = 0)
        val tB = Task(id = "b", projectId = "p", name = "B", startDate = "2026-09-23", endDate = "2026-09-23", createdAt = 0, updatedAt = 0)
        val tC = Task(id = "c", projectId = "p", name = "C", startDate = "2026-09-23", endDate = "2026-09-23", createdAt = 0, updatedAt = 0)
        val tD = Task(id = "d", projectId = "p", name = "D", startDate = "2026-09-23", endDate = "2026-09-23", createdAt = 0, updatedAt = 0)

        val overflowLayout = CalendarModel.layoutSpanningTasksInWeek(listOf(tA, tB, tC, tD), weekDays, maxVisibleSlots = 3)
        // 3 条任务轨道全部可见，额外的任务通过独立 +N 行显示。
        assertEquals(3, overflowLayout.visibleSegments.size)
        assertEquals(1, overflowLayout.overflowPerCol[3])
    }
}
