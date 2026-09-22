package com.taskorbit.domain

import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.PomodoroKind
import com.taskorbit.domain.model.PomodoroSession
import com.taskorbit.domain.model.Project
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

data class ProjectTimeDistribution(
    val projectId: String,
    val projectName: String,
    val projectColor: String,
    val minutes: Int,
    val percentage: Float, // 相对总专注时长的占比 (0f ~ 1f)
    val relativeBarRatio: Float // 相对最大项目时长的条形比例 (0f ~ 1f)
)

data class OverviewStats(
    val todayMinutes: Int,
    val todayFocusCount: Int,
    val totalMinutes: Int,
    val totalFocusCount: Int,
    val totalTasks: Int,
    val completedTasks: Int,
    val taskCompletionRate: Float,
    val totalPlans: Int,
    val completedPlans: Int,
    val planCompletionRate: Float,
    val projectDistribution: List<ProjectTimeDistribution>
)

object StatsEngine {

    fun calculateOverview(
        state: AppState,
        todayDate: LocalDate = LocalDate.now(),
        zoneId: ZoneId = ZoneId.systemDefault()
    ): OverviewStats {
        val focusSessions = state.pomodoroSessions.filter { it.kind == PomodoroKind.FOCUS }

        // 今日专注
        val todaySessions = focusSessions.filter { session ->
            val date = Instant.ofEpochMilli(session.endedAt).atZone(zoneId).toLocalDate()
            date == todayDate
        }
        val todayMinutes = todaySessions.sumOf { it.minutes }
        val todayFocusCount = todaySessions.size

        // 累计专注
        val totalMinutes = focusSessions.sumOf { it.minutes }
        val totalFocusCount = focusSessions.size

        // 任务统计
        val totalTasks = state.tasks.size
        val completedTasks = state.tasks.count { it.done }
        val taskCompletionRate = if (totalTasks > 0) completedTasks.toFloat() / totalTasks else 0f

        // 计划统计
        val totalPlans = state.dailyPlans.size
        val completedPlans = state.dailyPlans.count { it.done }
        val planCompletionRate = if (totalPlans > 0) completedPlans.toFloat() / totalPlans else 0f

        // 项目投入分布
        val projectMap = state.projects.associateBy { it.id }
        val sessionMinutesByProject = mutableMapOf<String, Int>()

        for (session in focusSessions) {
            val pid = session.projectId
            if (pid != null) {
                sessionMinutesByProject[pid] = (sessionMinutesByProject[pid] ?: 0) + session.minutes
            }
        }

        val rawDistribution = sessionMinutesByProject.mapNotNull { (pid, minutes) ->
            val project = projectMap[pid]
            if (project != null && minutes > 0) {
                Triple(project, minutes, if (totalMinutes > 0) minutes.toFloat() / totalMinutes else 0f)
            } else null
        }.sortedByDescending { it.second }

        val maxMinutes = rawDistribution.maxOfOrNull { it.second } ?: 1
        val distribution = rawDistribution.map { (project, minutes, percentage) ->
            ProjectTimeDistribution(
                projectId = project.id,
                projectName = project.name,
                projectColor = project.color,
                minutes = minutes,
                percentage = percentage,
                relativeBarRatio = (minutes.toFloat() / maxMinutes).coerceIn(0f, 1f)
            )
        }

        return OverviewStats(
            todayMinutes = todayMinutes,
            todayFocusCount = todayFocusCount,
            totalMinutes = totalMinutes,
            totalFocusCount = totalFocusCount,
            totalTasks = totalTasks,
            completedTasks = completedTasks,
            taskCompletionRate = taskCompletionRate,
            totalPlans = totalPlans,
            completedPlans = completedPlans,
            planCompletionRate = planCompletionRate,
            projectDistribution = distribution
        )
    }

    fun formatDuration(minutes: Int): String {
        return if (minutes < 60) {
            "${minutes}m"
        } else {
            val hours = minutes / 60
            val rem = minutes % 60
            if (rem == 0) "${hours}h" else "${hours}h ${rem}m"
        }
    }
}
