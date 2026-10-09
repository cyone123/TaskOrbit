package com.taskorbit.domain

import com.taskorbit.domain.model.ActiveTimer
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.PomodoroKind
import com.taskorbit.domain.model.PomodoroLink
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.Settings
import com.taskorbit.domain.model.Task
import com.taskorbit.domain.model.TimerStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TimerEngineTest {

    private val defaultSettings = Settings(
        focusMinutes = 25,
        shortBreakMinutes = 5,
        longBreakMinutes = 15,
        longBreakInterval = 4
    )

    @Test
    fun testDurationForPhase() {
        assertEquals(25 * 60_000L, TimerEngine.durationForPhase(defaultSettings, PomodoroKind.FOCUS))
        assertEquals(5 * 60_000L, TimerEngine.durationForPhase(defaultSettings, PomodoroKind.SHORT_BREAK))
        assertEquals(15 * 60_000L, TimerEngine.durationForPhase(defaultSettings, PomodoroKind.LONG_BREAK))
    }

    @Test
    fun testCreatePausedTimer() {
        val timer = TimerEngine.createPausedTimer(defaultSettings, PomodoroKind.FOCUS)
        assertEquals(TimerStatus.PAUSED, timer.status)
        assertEquals(PomodoroKind.FOCUS, timer.phase)
        assertEquals(25 * 60_000L, timer.durationMs)
        assertEquals(25 * 60_000L, timer.remainingMs)
        assertNull(timer.endAt)
        assertNull(timer.phaseStartedAt)
        assertEquals(0, timer.focusCount)
    }

    @Test
    fun testStartTimer() {
        val now = 1_000_000L
        val link = PomodoroLink(projectId = "p1", taskId = "t1")
        val timer = TimerEngine.startTimer(null, defaultSettings, link, now = now)

        assertEquals(TimerStatus.RUNNING, timer.status)
        assertEquals(PomodoroKind.FOCUS, timer.phase)
        assertEquals(now, timer.phaseStartedAt)
        assertEquals(now + 25 * 60_000L, timer.endAt)
        assertEquals("p1", timer.projectId)
        assertEquals("t1", timer.taskId)
    }

    @Test
    fun testPauseAndResumeTimer() {
        val start = 1_000_000L
        val running = TimerEngine.startTimer(null, defaultSettings, PomodoroLink(), now = start)

        // 过了 10 分钟暂停
        val pauseTime = start + 10 * 60_000L
        val paused = TimerEngine.pauseTimer(running, now = pauseTime)
        assertNotNull(paused)
        assertEquals(TimerStatus.PAUSED, paused!!.status)
        assertEquals(15 * 60_000L, paused.remainingMs)
        assertNull(paused.endAt)

        // 再过了 5 分钟恢复
        val resumeTime = pauseTime + 5 * 60_000L
        val resumed = TimerEngine.startTimer(paused, defaultSettings, PomodoroLink(), now = resumeTime)
        assertEquals(TimerStatus.RUNNING, resumed.status)
        assertEquals(resumeTime + 15 * 60_000L, resumed.endAt)
    }

    @Test
    fun testSkipTimerPhases() {
        var timer = TimerEngine.createPausedTimer(defaultSettings, PomodoroKind.FOCUS, focusCount = 0)

        // 1st focus skip -> short break, focusCount becomes 1
        timer = TimerEngine.skipTimer(timer, defaultSettings)
        assertEquals(PomodoroKind.SHORT_BREAK, timer.phase)
        assertEquals(1, timer.focusCount)

        // 1st break skip -> focus
        timer = TimerEngine.skipTimer(timer, defaultSettings)
        assertEquals(PomodoroKind.FOCUS, timer.phase)
        assertEquals(1, timer.focusCount)

        // 2nd focus skip -> short break, focusCount 2
        timer = TimerEngine.skipTimer(timer, defaultSettings)
        assertEquals(PomodoroKind.SHORT_BREAK, timer.phase)
        assertEquals(2, timer.focusCount)

        // 2nd break skip -> focus
        timer = TimerEngine.skipTimer(timer, defaultSettings)
        // 3rd focus skip -> short break, focusCount 3
        timer = TimerEngine.skipTimer(timer, defaultSettings)
        assertEquals(PomodoroKind.SHORT_BREAK, timer.phase)
        assertEquals(3, timer.focusCount)

        // 3rd break skip -> focus
        timer = TimerEngine.skipTimer(timer, defaultSettings)
        // 4th focus skip -> reach interval (4) -> LONG_BREAK!
        timer = TimerEngine.skipTimer(timer, defaultSettings)
        assertEquals(PomodoroKind.LONG_BREAK, timer.phase)
        assertEquals(4, timer.focusCount)
        assertEquals(15 * 60_000L, timer.durationMs)
    }

    @Test
    fun testReconcileTimerNotExpired() {
        val now = 1_000_000L
        val running = TimerEngine.startTimer(null, defaultSettings, PomodoroLink(), now = now)

        val result = TimerEngine.reconcileTimer(running, defaultSettings, now = now + 10 * 60_000L)
        assertFalse(result.changed)
        assertTrue(result.completed.isEmpty())
        assertNull(result.warning)
    }

    @Test
    fun testReconcileTimerSingleFocusCompletion() {
        val start = 1_000_000L
        val running = TimerEngine.startTimer(
            null,
            defaultSettings,
            PomodoroLink(projectId = "p1", taskId = "t1"),
            now = start
        )

        // 25 分钟后，正好完成
        val finishTime = start + 25 * 60_000L
        val result = TimerEngine.reconcileTimer(running, defaultSettings, now = finishTime)

        assertTrue(result.changed)
        assertEquals(1, result.completed.size)
        val completed = result.completed[0]
        assertEquals("p1", completed.projectId)
        assertEquals("t1", completed.taskId)
        assertEquals(25, completed.minutes)
        assertEquals(start, completed.startedAt)
        assertEquals(finishTime, completed.endedAt)

        // 自动流转为短休息并且处于 RUNNING 状态
        val nextTimer = result.timer
        assertNotNull(nextTimer)
        assertEquals(PomodoroKind.SHORT_BREAK, nextTimer!!.phase)
        assertEquals(TimerStatus.RUNNING, nextTimer.status)
        assertEquals(1, nextTimer.focusCount)
        assertEquals(finishTime, nextTimer.phaseStartedAt)
        assertEquals(finishTime + 5 * 60_000L, nextTimer.endAt)
    }

    @Test
    fun testReconcileTimerMultipleCatchUp() {
        val start = 1_000_000L
        val running = TimerEngine.startTimer(null, defaultSettings, PomodoroLink(), now = start)

        // 离线过去 58 分钟：
        // 0-25m: Focus (completed) -> 25-30m: ShortBreak (completed) -> 30-55m: Focus (completed) -> 55-60m: ShortBreak (in progress at 58m)
        val passTime = start + 58 * 60_000L
        val result = TimerEngine.reconcileTimer(running, defaultSettings, now = passTime)

        assertTrue(result.changed)
        assertEquals(2, result.completed.size)
        assertEquals(25, result.completed[0].minutes)
        assertEquals(25, result.completed[1].minutes)

        val nextTimer = result.timer
        assertNotNull(nextTimer)
        assertEquals(PomodoroKind.SHORT_BREAK, nextTimer!!.phase)
        assertEquals(2, nextTimer.focusCount)
    }

    @Test
    fun testConvertCompletedToSessions() {
        val state = AppState(
            projects = listOf(
                Project(
                    id = "p1",
                    name = "测试项目",
                    startDate = "2026-09-22",
                    endDate = "2026-09-22",
                    createdAt = 1_000_000L,
                    updatedAt = 1_000_000L
                )
            ),
            tasks = listOf(
                Task(
                    id = "t1",
                    projectId = "p1",
                    name = "核心功能实现",
                    startDate = "2026-09-22",
                    endDate = "2026-09-22",
                    createdAt = 1_000_000L,
                    updatedAt = 1_000_000L
                )
            )
        )

        val completed = listOf(
            CompletedFocus(
                projectId = "p1",
                taskId = "t1",
                startedAt = 1_000_000L,
                endedAt = 1_000_000L + 25 * 60_000L,
                minutes = 25
            )
        )

        val sessions = TimerEngine.convertCompletedToSessions(state, completed)
        assertEquals(1, sessions.size)
        val s = sessions[0]
        assertEquals("测试项目", s.projectNameSnapshot)
        assertEquals("核心功能实现", s.taskNameSnapshot)
        assertEquals(25, s.minutes)
    }
}
