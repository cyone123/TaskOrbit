package com.taskorbit.domain

import com.taskorbit.data.common.IdGenerator
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.DailyPlanRecurrence
import com.taskorbit.domain.model.DailyPlanRepeat

data class DailyPlanInput(
    val projectId: String? = null,
    val taskId: String? = null,
    val name: String,
    val description: String = "",
    val date: String,
    val startTime: String,
    val endTime: String,
    val estimatedMinutes: Int = 0,
    val repeat: DailyPlanRepeat = DailyPlanRepeat.NONE,
    val repeatCount: Int = 1
)

data class DailyPlanPatch(
    val projectId: String? = null,
    val taskId: String? = null,
    val name: String? = null,
    val description: String? = null,
    val date: String? = null,
    val startTime: String? = null,
    val endTime: String? = null,
    val estimatedMinutes: Int? = null,
    val done: Boolean? = null
)

object DailyPlanDomain {

    fun createDailyPlans(
        input: DailyPlanInput,
        createdAt: Long = System.currentTimeMillis()
    ): List<DailyPlan> {
        val trimmedName = input.name.trim()
        require(trimmedName.isNotEmpty()) { "计划名称不能为空。" }

        val dates = RecurrenceEngine.expandDates(input.date, input.repeat, input.repeatCount)
        val seriesId = if (input.repeat == DailyPlanRepeat.NONE || dates.size <= 1) null else IdGenerator.uid("prs_")

        return dates.mapIndexed { index, dateStr ->
            DailyPlan(
                id = IdGenerator.uid("pl_"),
                projectId = input.projectId,
                taskId = input.taskId,
                name = trimmedName,
                description = input.description.trim(),
                date = dateStr,
                startTime = input.startTime,
                endTime = input.endTime,
                done = false,
                estimatedMinutes = input.estimatedMinutes,
                recurrence = DailyPlanRecurrence(
                    frequency = input.repeat,
                    count = dates.size,
                    seriesId = seriesId,
                    occurrence = index + 1
                ),
                createdAt = createdAt,
                updatedAt = createdAt
            )
        }
    }

    fun appendDailyPlans(state: AppState, plans: List<DailyPlan>): AppState {
        for (plan in plans) {
            if (plan.projectId != null) {
                val project = state.projects.find { it.id == plan.projectId }
                    ?: throw IllegalArgumentException("计划引用的项目不存在。")
                if (project.archived) {
                    throw IllegalArgumentException("归档项目不能添加新计划。")
                }
            }
            if (plan.taskId != null) {
                val task = state.tasks.find { it.id == plan.taskId }
                    ?: throw IllegalArgumentException("计划引用的任务不存在。")
                if (plan.projectId != null && task.projectId != plan.projectId) {
                    throw IllegalArgumentException("计划的项目必须与任务所属项目一致。")
                }
            }
        }
        return state.copy(dailyPlans = plans + state.dailyPlans)
    }

    fun updateDailyPlanState(
        state: AppState,
        id: String,
        patch: DailyPlanPatch,
        updatedAt: Long = System.currentTimeMillis()
    ): AppState {
        val nextPlans = state.dailyPlans.map { plan ->
            if (plan.id == id) {
                val nextName = patch.name?.trim() ?: plan.name
                require(nextName.isNotEmpty()) { "计划名称不能为空。" }

                plan.copy(
                    projectId = patch.projectId ?: plan.projectId,
                    taskId = patch.taskId ?: plan.taskId,
                    name = nextName,
                    description = patch.description?.trim() ?: plan.description,
                    date = patch.date ?: plan.date,
                    startTime = patch.startTime ?: plan.startTime,
                    endTime = patch.endTime ?: plan.endTime,
                    estimatedMinutes = patch.estimatedMinutes ?: plan.estimatedMinutes,
                    done = patch.done ?: plan.done,
                    updatedAt = updatedAt
                )
            } else {
                plan
            }
        }
        return state.copy(dailyPlans = nextPlans)
    }

    fun toggleDailyPlanState(state: AppState, id: String, done: Boolean): AppState {
        return updateDailyPlanState(state, id, DailyPlanPatch(done = done))
    }

    fun deleteDailyPlanState(state: AppState, id: String): AppState {
        val plan = state.dailyPlans.find { it.id == id } ?: return state

        val timerRefsPlan = state.activeTimer?.dailyPlanId == id

        val nextSessions = state.pomodoroSessions.map { session ->
            if (session.dailyPlanId == id) {
                session.copy(
                    dailyPlanId = null,
                    dailyPlanNameSnapshot = session.dailyPlanNameSnapshot ?: plan.name
                )
            } else {
                session
            }
        }

        return state.copy(
            dailyPlans = state.dailyPlans.filterNot { it.id == id },
            activeTimer = if (timerRefsPlan) null else state.activeTimer,
            pomodoroSessions = nextSessions
        )
    }
}
