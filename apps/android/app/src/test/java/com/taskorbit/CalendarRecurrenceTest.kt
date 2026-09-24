package com.taskorbit

import com.taskorbit.domain.CalendarModel
import com.taskorbit.domain.DailyPlanDomain
import com.taskorbit.domain.DailyPlanInput
import com.taskorbit.domain.RecurrenceEngine
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.DailyPlanRepeat
import com.taskorbit.domain.model.Task
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
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
}
