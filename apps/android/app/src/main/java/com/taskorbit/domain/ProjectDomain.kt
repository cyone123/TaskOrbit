package com.taskorbit.domain

import com.taskorbit.data.common.IdGenerator
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.Task
import kotlin.math.roundToInt

data class ProjectInput(
    val name: String,
    val description: String = "",
    val color: String = "violet",
    val startDate: String,
    val endDate: String
)

object ProjectDomain {

    fun createProject(
        input: ProjectInput,
        createdAt: Long = System.currentTimeMillis()
    ): Project {
        val trimmedName = input.name.trim()
        require(trimmedName.isNotEmpty()) { "项目名称不能为空。" }
        return Project(
            id = IdGenerator.uid("p_"),
            name = trimmedName,
            description = input.description.trim(),
            color = input.color,
            startDate = input.startDate,
            endDate = input.endDate,
            archived = false,
            archivedAt = null,
            createdAt = createdAt,
            updatedAt = createdAt
        )
    }

    fun appendProject(state: AppState, project: Project): AppState {
        return state.copy(projects = listOf(project) + state.projects)
    }

    fun updateProjectState(
        state: AppState,
        id: String,
        input: ProjectInput,
        updatedAt: Long = System.currentTimeMillis()
    ): AppState {
        val nextProjects = state.projects.map { project ->
            if (project.id == id) {
                val trimmedName = input.name.trim()
                require(trimmedName.isNotEmpty()) { "项目名称不能为空。" }
                project.copy(
                    name = trimmedName,
                    description = input.description.trim(),
                    color = input.color,
                    startDate = input.startDate,
                    endDate = input.endDate,
                    updatedAt = updatedAt
                )
            } else {
                project
            }
        }
        return state.copy(projects = nextProjects)
    }

    fun archiveProjectState(
        state: AppState,
        id: String,
        archivedAt: Long = System.currentTimeMillis()
    ): AppState {
        val nextProjects = state.projects.map { project ->
            if (project.id == id) {
                project.copy(archived = true, archivedAt = archivedAt, updatedAt = archivedAt)
            } else {
                project
            }
        }
        return state.copy(projects = nextProjects)
    }

    fun restoreProjectState(
        state: AppState,
        id: String,
        updatedAt: Long = System.currentTimeMillis()
    ): AppState {
        val nextProjects = state.projects.map { project ->
            if (project.id == id) {
                project.copy(archived = false, archivedAt = null, updatedAt = updatedAt)
            } else {
                project
            }
        }
        return state.copy(projects = nextProjects)
    }

    fun deleteProjectState(state: AppState, id: String): AppState {
        val project = state.projects.find { it.id == id } ?: return state
        if (!project.archived) return state // 只能删除归档状态的项目

        val taskIds = state.tasks.filter { it.projectId == id }.map { it.id }.toSet()
        val planIds = state.dailyPlans.filter { it.projectId == id || (it.taskId != null && it.taskId in taskIds) }
            .map { it.id }.toSet()

        val taskNames = state.tasks.filter { it.id in taskIds }.associate { it.id to it.name }
        val planNames = state.dailyPlans.filter { it.id in planIds }.associate { it.id to it.name }

        val timerRefsProject = state.activeTimer?.let { timer ->
            timer.projectId == id ||
                    (timer.taskId != null && timer.taskId in taskIds) ||
                    (timer.dailyPlanId != null && timer.dailyPlanId in planIds)
        } ?: false

        val nextSessions = state.pomodoroSessions.map { session ->
            val belongsToProject = session.projectId == id
            val belongsToTask = session.taskId != null && session.taskId in taskIds
            val belongsToPlan = session.dailyPlanId != null && session.dailyPlanId in planIds

            if (!belongsToProject && !belongsToTask && !belongsToPlan) {
                session
            } else {
                session.copy(
                    projectId = id,
                    taskId = null,
                    dailyPlanId = null,
                    projectNameSnapshot = session.projectNameSnapshot ?: project.name,
                    taskNameSnapshot = session.taskNameSnapshot ?: (session.taskId?.let { taskNames[it] }),
                    dailyPlanNameSnapshot = session.dailyPlanNameSnapshot ?: (session.dailyPlanId?.let { planNames[it] })
                )
            }
        }

        val nextInboxItems = state.inboxItems.map { item ->
            if (item.projectId == id) item.copy(projectId = null, updatedAt = System.currentTimeMillis())
            else item
        }

        return state.copy(
            projects = state.projects.filterNot { it.id == id },
            tasks = state.tasks.filterNot { it.projectId == id },
            dailyPlans = state.dailyPlans.filterNot { it.id in planIds },
            activeTimer = if (timerRefsProject) null else state.activeTimer,
            pomodoroSessions = nextSessions,
            inboxItems = nextInboxItems
        )
    }

    /**
     * 计算项目整体完成度百分比 (0 - 100)
     */
    fun calculateProjectProgress(tasks: List<Task>, plans: List<DailyPlan>): Int {
        val taskPlansMap = mutableMapOf<String, Pair<Int, Int>>() // total, done
        var standaloneTotal = 0
        var standaloneDone = 0

        for (plan in plans) {
            if (plan.taskId != null) {
                val current = taskPlansMap[plan.taskId] ?: (0 to 0)
                val nextDone = if (plan.done) current.second + 1 else current.second
                taskPlansMap[plan.taskId] = (current.first + 1) to nextDone
            } else {
                standaloneTotal += 1
                if (plan.done) standaloneDone += 1
            }
        }

        var totalUnits = tasks.size
        var progressSum = 0.0

        for (task in tasks) {
            val stats = taskPlansMap[task.id]
            if (stats != null && stats.first > 0) {
                progressSum += stats.second.toDouble() / stats.first
            } else {
                progressSum += if (task.done) 1.0 else 0.0
            }
        }

        if (standaloneTotal > 0) {
            totalUnits += 1
            progressSum += standaloneDone.toDouble() / standaloneTotal
        }

        if (totalUnits == 0) return 0
        return ((progressSum / totalUnits) * 100.0).roundToInt().coerceIn(0, 100)
    }

    fun formatDateShort(isoDate: String): String {
        val parts = isoDate.split("-")
        if (parts.size != 3) return isoDate
        val month = parts[1].toIntOrNull() ?: return isoDate
        val day = parts[2].toIntOrNull() ?: return isoDate
        return "$month/$day"
    }

    fun relativeRangeLabel(startDate: String, endDate: String): String {
        return "${formatDateShort(startDate)} - ${formatDateShort(endDate)}"
    }
}
