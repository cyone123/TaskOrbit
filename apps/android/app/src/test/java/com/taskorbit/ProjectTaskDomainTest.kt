package com.taskorbit

import com.taskorbit.domain.ProjectDomain
import com.taskorbit.domain.ProjectInput
import com.taskorbit.domain.TaskDomain
import com.taskorbit.domain.TaskInput
import com.taskorbit.domain.TaskPatch
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.Priority
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProjectTaskDomainTest {

    @Test
    fun `calculateProjectProgress matches core algorithm`() {
        val proj = ProjectDomain.createProject(
            ProjectInput("P1", "Desc", "violet", "2026-09-01", "2026-09-30")
        )

        // Case 1: 2 tasks, task1 has 2 plans (1 done), task2 has 0 plans (done) -> 75%
        val task1 = TaskDomain.createTask(TaskInput(proj.id, "T1", "", "2026-09-01", "2026-09-10", Priority.MEDIUM))
        val task2 = TaskDomain.createTask(TaskInput(proj.id, "T2", "", "2026-09-01", "2026-09-10", Priority.MEDIUM)).copy(done = true)

        val plan1 = DailyPlan(id = "pl1", projectId = proj.id, taskId = task1.id, name = "P1", date = "2026-09-02", startTime = "09:00", endTime = "10:00", done = true, createdAt = 0, updatedAt = 0)
        val plan2 = DailyPlan(id = "pl2", projectId = proj.id, taskId = task1.id, name = "P2", date = "2026-09-03", startTime = "09:00", endTime = "10:00", done = false, createdAt = 0, updatedAt = 0)

        val progress1 = ProjectDomain.calculateProjectProgress(listOf(task1, task2), listOf(plan1, plan2))
        assertEquals(75, progress1)

        // Case 2: 0 tasks, 0 plans -> 0%
        val progress2 = ProjectDomain.calculateProjectProgress(emptyList(), emptyList())
        assertEquals(0, progress2)

        // Case 3: 0 tasks, 2 standalone plans (1 done) -> 50%
        val standalone1 = DailyPlan(id = "s1", projectId = proj.id, taskId = null, name = "S1", date = "2026-09-02", startTime = "09:00", endTime = "10:00", done = true, createdAt = 0, updatedAt = 0)
        val standalone2 = DailyPlan(id = "s2", projectId = proj.id, taskId = null, name = "S2", date = "2026-09-03", startTime = "09:00", endTime = "10:00", done = false, createdAt = 0, updatedAt = 0)
        val progress3 = ProjectDomain.calculateProjectProgress(emptyList(), listOf(standalone1, standalone2))
        assertEquals(50, progress3)
    }

    @Test
    fun `updateTaskState cascades done status to associated plans`() {
        val proj = ProjectDomain.createProject(ProjectInput("P1", "", "violet", "2026-09-01", "2026-09-30"))
        val task = TaskDomain.createTask(TaskInput(proj.id, "T1", "", "2026-09-01", "2026-09-10", Priority.MEDIUM))
        val plan = DailyPlan(id = "pl1", projectId = proj.id, taskId = task.id, name = "Plan", date = "2026-09-02", startTime = "09:00", endTime = "10:00", done = false, createdAt = 0, updatedAt = 0)

        var state = AppState()
        state = ProjectDomain.appendProject(state, proj)
        state = TaskDomain.appendTask(state, task)
        state = state.copy(dailyPlans = listOf(plan))

        assertFalse(state.tasks[0].done)
        assertFalse(state.dailyPlans[0].done)

        // 完成任务，计划也应被级联标记为完成
        state = TaskDomain.updateTaskState(state, task.id, TaskPatch(done = true))
        assertTrue(state.tasks[0].done)
        assertTrue(state.dailyPlans[0].done)
    }

    @Test
    fun `deleteProjectState cascades delete of tasks and plans`() {
        val proj = ProjectDomain.createProject(ProjectInput("P1", "", "violet", "2026-09-01", "2026-09-30"))
        val task = TaskDomain.createTask(TaskInput(proj.id, "T1", "", "2026-09-01", "2026-09-10", Priority.MEDIUM))
        val plan = DailyPlan(id = "pl1", projectId = proj.id, taskId = task.id, name = "Plan", date = "2026-09-02", startTime = "09:00", endTime = "10:00", done = false, createdAt = 0, updatedAt = 0)

        var state = AppState()
        state = ProjectDomain.appendProject(state, proj)
        state = TaskDomain.appendTask(state, task)
        state = state.copy(dailyPlans = listOf(plan))

        // 未归档时无法删除
        state = ProjectDomain.deleteProjectState(state, proj.id)
        assertEquals(1, state.projects.size)

        // 归档后删除
        state = ProjectDomain.archiveProjectState(state, proj.id)
        state = ProjectDomain.deleteProjectState(state, proj.id)

        assertEquals(0, state.projects.size)
        assertEquals(0, state.tasks.size)
        assertEquals(0, state.dailyPlans.size)
    }

    @Test
    fun `appendDailyPlans allows standalone project plans and task-linked plans`() {
        val proj = ProjectDomain.createProject(ProjectInput("P1", "", "violet", "2026-09-01", "2026-09-30"))
        val task = TaskDomain.createTask(TaskInput(proj.id, "T1", "", "2026-09-01", "2026-09-10", Priority.MEDIUM))

        var state = AppState()
        state = ProjectDomain.appendProject(state, proj)
        state = TaskDomain.appendTask(state, task)

        // 1. 添加任务关联计划
        val taskPlanInput = com.taskorbit.domain.DailyPlanInput(
            projectId = proj.id,
            taskId = task.id,
            name = "Task Plan",
            date = "2026-09-05",
            startTime = "09:00",
            endTime = "10:00"
        )
        val taskPlans = com.taskorbit.domain.DailyPlanDomain.createDailyPlans(taskPlanInput)
        state = com.taskorbit.domain.DailyPlanDomain.appendDailyPlans(state, taskPlans)
        assertEquals(1, state.dailyPlans.size)
        assertEquals(task.id, state.dailyPlans[0].taskId)

        // 2. 添加项目独立计划（无关联任务）
        val projectPlanInput = com.taskorbit.domain.DailyPlanInput(
            projectId = proj.id,
            taskId = null,
            name = "Project Standalone Plan",
            date = "2026-09-06",
            startTime = "14:00",
            endTime = "15:30"
        )
        val projPlans = com.taskorbit.domain.DailyPlanDomain.createDailyPlans(projectPlanInput)
        state = com.taskorbit.domain.DailyPlanDomain.appendDailyPlans(state, projPlans)
        assertEquals(2, state.dailyPlans.size)
    }
}
