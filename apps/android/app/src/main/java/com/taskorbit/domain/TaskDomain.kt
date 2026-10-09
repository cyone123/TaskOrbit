package com.taskorbit.domain

import com.taskorbit.data.common.IdGenerator
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.Priority
import com.taskorbit.domain.model.Task
import com.taskorbit.domain.model.TaskStatus
import com.taskorbit.domain.model.deriveTaskStatus

data class TaskInput(
    val projectId: String,
    val name: String,
    val description: String = "",
    val startDate: String? = null,
    val endDate: String? = null,
    val priority: Priority = Priority.MEDIUM
)

data class TaskPatch(
    val name: String? = null,
    val description: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val priority: Priority? = null,
    val done: Boolean? = null,
    val status: TaskStatus? = null,
    val clearSchedule: Boolean = false
)

object TaskDomain {

    fun createTask(
        input: TaskInput,
        createdAt: Long = System.currentTimeMillis()
    ): Task {
        val trimmedName = input.name.trim()
        require(trimmedName.isNotEmpty()) { "任务名称不能为空。" }
        val start = normalizeDate(input.startDate)
        val end = normalizeDate(input.endDate)
        validateSchedule(start, end)
        return Task(
            id = IdGenerator.uid("t_"),
            projectId = input.projectId,
            name = trimmedName,
            description = input.description.trim(),
            startDate = start,
            endDate = end,
            done = false,
            priority = input.priority,
            createdAt = createdAt,
            updatedAt = createdAt
        )
    }

    fun appendTask(state: AppState, task: Task): AppState {
        val project = state.projects.find { it.id == task.projectId }
            ?: throw IllegalArgumentException("请选择一个有效的项目。")
        if (project.archived) {
            throw IllegalArgumentException("归档项目不能添加新任务。")
        }
        return state.copy(tasks = listOf(task) + state.tasks)
    }

    fun updateTaskState(
        state: AppState,
        id: String,
        patch: TaskPatch,
        updatedAt: Long = System.currentTimeMillis()
    ): AppState {
        val current = state.tasks.find { it.id == id } ?: return state
        val clear = patch.clearSchedule || patch.status == TaskStatus.TODO
        val start = if (clear && patch.startDate == null) null else normalizeDate(patch.startDate ?: current.startDate)
        val end = if (clear && patch.endDate == null) null else normalizeDate(patch.endDate ?: current.endDate)
        validateSchedule(start, end)
        val done = when (patch.status) {
            TaskStatus.DONE -> true
            TaskStatus.TODO, TaskStatus.IN_PROGRESS -> false
            null -> patch.done ?: current.done
        }
        val status = deriveTaskStatus(done, start, end)
        val nextTasks = state.tasks.map { task ->
            if (task.id == id) {
                val nextName = patch.name?.trim() ?: task.name
                require(nextName.isNotEmpty()) { "任务名称不能为空。" }
                task.copy(
                    name = nextName,
                    description = patch.description?.trim() ?: task.description,
                    startDate = start,
                    endDate = end,
                    priority = patch.priority ?: task.priority,
                    done = done,
                    status = status,
                    updatedAt = updatedAt
                )
            } else {
                task
            }
        }

        // 级联同步任务下每日计划的完成状态
        val nextPlans = if (done != current.done) {
            val targetDone = done
            state.dailyPlans.map { plan ->
                if (plan.taskId == id && plan.done != targetDone) {
                    plan.copy(done = targetDone, updatedAt = updatedAt)
                } else {
                    plan
                }
            }
        } else {
            state.dailyPlans
        }

        return state.copy(tasks = nextTasks, dailyPlans = nextPlans)
    }

    private fun normalizeDate(value: String?): String? = value?.trim()?.takeIf { it.isNotEmpty() }

    fun validateSchedule(start: String?, end: String?) {
        require((start == null) == (end == null)) { "任务起止日期必须同时提供或同时为空。" }
        if (start != null && end != null) {
            val startDate = java.time.LocalDate.parse(start)
            val endDate = java.time.LocalDate.parse(end)
            require(!endDate.isBefore(startDate)) { "结束日期不能早于开始日期。" }
        }
    }

    fun toggleTaskState(state: AppState, id: String, done: Boolean): AppState {
        return updateTaskState(state, id, TaskPatch(done = done))
    }

    fun deleteTaskState(state: AppState, id: String): AppState {
        val task = state.tasks.find { it.id == id } ?: return state
        val planIds = state.dailyPlans.filter { it.taskId == id }.map { it.id }.toSet()
        val planNames = state.dailyPlans.filter { it.id in planIds }.associate { it.id to it.name }

        val timerRefsTask = state.activeTimer?.let { timer ->
            timer.taskId == id || (timer.dailyPlanId != null && timer.dailyPlanId in planIds)
        } ?: false

        val nextSessions = state.pomodoroSessions.map { session ->
            if (session.taskId == id || (session.dailyPlanId != null && session.dailyPlanId in planIds)) {
                session.copy(
                    taskId = null,
                    dailyPlanId = null,
                    taskNameSnapshot = session.taskNameSnapshot ?: task.name,
                    dailyPlanNameSnapshot = session.dailyPlanNameSnapshot ?: (session.dailyPlanId?.let { planNames[it] })
                )
            } else {
                session
            }
        }

        return state.copy(
            tasks = state.tasks.filterNot { it.id == id },
            dailyPlans = state.dailyPlans.filterNot { it.taskId == id },
            activeTimer = if (timerRefsTask) null else state.activeTimer,
            pomodoroSessions = nextSessions
        )
    }
}
