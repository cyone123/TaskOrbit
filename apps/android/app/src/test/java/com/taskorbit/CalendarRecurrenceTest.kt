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
        val weekDays = CalendarModel.weekDays(LocalDate.of(2026, 9, 21)) // 2026-09-21 (Mon) to 2026-09-27 (Sun)

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
}
