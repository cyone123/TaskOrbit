package com.taskorbit

import com.taskorbit.domain.*
import com.taskorbit.domain.model.*
import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate

class TaskSchedulingTest {
    @Test
    fun `scheduling completion clearing and rescheduling derive consistent status`() {
        val task = TaskDomain.createTask(TaskInput("p", "任务"), 1)
        var state = AppState(tasks = listOf(task))
        assertEquals(TaskStatus.TODO, task.status)
        state = TaskDomain.updateTaskState(state, task.id, TaskPatch(startDate = "2026-10-01", endDate = "2026-10-08"), 2)
        assertEquals(TaskStatus.IN_PROGRESS, state.tasks.single().status)
        state = TaskDomain.toggleTaskState(state, task.id, true)
        assertEquals(TaskStatus.DONE, state.tasks.single().status)
        state = TaskDomain.toggleTaskState(state, task.id, false)
        assertEquals(TaskStatus.IN_PROGRESS, state.tasks.single().status)
        state = TaskDomain.updateTaskState(state, task.id, TaskPatch(clearSchedule = true))
        assertNull(state.tasks.single().startDate)
        assertEquals(TaskStatus.TODO, state.tasks.single().status)
        val days = listOf(LocalDate.parse("2026-10-01"))
        assertTrue(CalendarModel.tasksByDate(state.tasks, days).values.single().isEmpty())
        assertNull(CalendarModel.taskRangeInWeek(state.tasks.single(), CalendarModel.weekDays(days.single())))
        state = TaskDomain.toggleTaskState(state, task.id, true)
        state = TaskDomain.toggleTaskState(state, task.id, false)
        assertEquals(TaskStatus.TODO, state.tasks.single().status)
        state = TaskDomain.updateTaskState(state, task.id, TaskPatch(startDate = "2026-10-01", endDate = "2026-10-02"))
        assertEquals(TaskStatus.IN_PROGRESS, state.tasks.single().status)
        assertEquals(1L, state.tasks.single().createdAt)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `partial schedule is rejected`() {
        TaskDomain.createTask(TaskInput("p", "任务", startDate = "2026-10-01"))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `reversed schedule is rejected`() {
        TaskDomain.createTask(TaskInput("p", "任务", startDate = "2026-10-08", endDate = "2026-10-01"))
    }
}
