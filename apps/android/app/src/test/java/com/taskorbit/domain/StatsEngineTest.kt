package com.taskorbit.domain

import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.PomodoroKind
import com.taskorbit.domain.model.PomodoroSession
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.Task
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

class StatsEngineTest {

    @Test
    fun testCalculateOverview() {
        val today = LocalDate.of(2026, 9, 22)
        val zoneId = ZoneId.of("UTC")
        val todayEpochMs = today.atStartOfDay(zoneId).toInstant().toEpochMilli() + 3600_000L // 1:00 AM UTC
        val yesterdayEpochMs = todayEpochMs - 24 * 3600_000L

        val state = AppState(
            projects = listOf(
                Project(id = "p1", name = "移动端开发", color = "blue", startDate = "2026-09-01", endDate = "2026-09-30", createdAt = 1L, updatedAt = 1L),
                Project(id = "p2", name = "UI 设计系统", color = "violet", startDate = "2026-09-01", endDate = "2026-09-30", createdAt = 1L, updatedAt = 1L)
            ),
            tasks = listOf(
                Task(id = "t1", projectId = "p1", name = "任务 1", done = true, startDate = "2026-09-01", endDate = "2026-09-30", createdAt = 1L, updatedAt = 1L),
                Task(id = "t2", projectId = "p1", name = "任务 2", done = false, startDate = "2026-09-01", endDate = "2026-09-30", createdAt = 1L, updatedAt = 1L),
                Task(id = "t3", projectId = "p2", name = "任务 3", done = true, startDate = "2026-09-01", endDate = "2026-09-30", createdAt = 1L, updatedAt = 1L)
            ),
            dailyPlans = listOf(
                DailyPlan(id = "dp1", name = "计划 1", date = "2026-09-22", startTime = "09:00", endTime = "10:00", done = true, createdAt = 1L, updatedAt = 1L),
                DailyPlan(id = "dp2", name = "计划 2", date = "2026-09-22", startTime = "10:00", endTime = "11:00", done = false, createdAt = 1L, updatedAt = 1L)
            ),
            pomodoroSessions = listOf(
                // 今日 p1 25m
                PomodoroSession(id = "s1", projectId = "p1", kind = PomodoroKind.FOCUS, startedAt = todayEpochMs - 25 * 60_000L, endedAt = todayEpochMs, minutes = 25),
                // 今日 p2 50m
                PomodoroSession(id = "s2", projectId = "p2", kind = PomodoroKind.FOCUS, startedAt = todayEpochMs, endedAt = todayEpochMs + 50 * 60_000L, minutes = 50),
                // 昨日 p1 25m
                PomodoroSession(id = "s3", projectId = "p1", kind = PomodoroKind.FOCUS, startedAt = yesterdayEpochMs - 25 * 60_000L, endedAt = yesterdayEpochMs, minutes = 25),
                // 休息 session（不计入专注）
                PomodoroSession(id = "s4", kind = PomodoroKind.SHORT_BREAK, startedAt = todayEpochMs, endedAt = todayEpochMs + 5 * 60_000L, minutes = 5)
            )
        )

        val overview = StatsEngine.calculateOverview(state, todayDate = today, zoneId = zoneId)

        // 今日：25 + 50 = 75 分钟，2 次专注
        assertEquals(75, overview.todayMinutes)
        assertEquals(2, overview.todayFocusCount)

        // 累计：25 + 50 + 25 = 100 分钟，3 次专注
        assertEquals(100, overview.totalMinutes)
        assertEquals(3, overview.totalFocusCount)

        // 任务完成率：2/3
        assertEquals(3, overview.totalTasks)
        assertEquals(2, overview.completedTasks)
        assertEquals(2f / 3f, overview.taskCompletionRate, 0.001f)

        // 计划完成率：1/2
        assertEquals(2, overview.totalPlans)
        assertEquals(1, overview.completedPlans)
        assertEquals(0.5f, overview.planCompletionRate, 0.001f)

        // 项目分布：p1 共 50m, p2 共 50m
        assertEquals(2, overview.projectDistribution.size)
        // 相对比例为 1.0f (最大为 50m)
        assertEquals(1.0f, overview.projectDistribution[0].relativeBarRatio, 0.001f)
        assertEquals(0.5f, overview.projectDistribution[0].percentage, 0.001f)
    }

    @Test
    fun testFormatDuration() {
        assertEquals("45m", StatsEngine.formatDuration(45))
        assertEquals("1h", StatsEngine.formatDuration(60))
        assertEquals("1h 30m", StatsEngine.formatDuration(90))
        assertEquals("2h 15m", StatsEngine.formatDuration(135))
    }
}
