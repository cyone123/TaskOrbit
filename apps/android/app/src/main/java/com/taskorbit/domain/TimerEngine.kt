package com.taskorbit.domain

import com.taskorbit.data.common.IdGenerator
import com.taskorbit.domain.model.ActiveTimer
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.PomodoroKind
import com.taskorbit.domain.model.PomodoroLink
import com.taskorbit.domain.model.PomodoroSession
import com.taskorbit.domain.model.Settings
import com.taskorbit.domain.model.TimerStatus
import kotlin.math.ceil
import kotlin.math.max

data class CompletedFocus(
    val projectId: String? = null,
    val taskId: String? = null,
    val dailyPlanId: String? = null,
    val kind: PomodoroKind = PomodoroKind.FOCUS,
    val startedAt: Long,
    val endedAt: Long,
    val minutes: Int
)

data class TimerReconcileResult(
    val timer: ActiveTimer?,
    val completed: List<CompletedFocus>,
    val warning: String? = null,
    val changed: Boolean
)

object TimerEngine {

    const val MAX_TIMER_CATCH_UP_PHASES = 1000

    fun durationForPhase(settings: Settings, phase: PomodoroKind): Long {
        val minutes = when (phase) {
            PomodoroKind.FOCUS -> settings.focusMinutes
            PomodoroKind.SHORT_BREAK -> settings.shortBreakMinutes
            PomodoroKind.LONG_BREAK -> settings.longBreakMinutes
        }
        return minutes * 60_000L
    }

    fun createPausedTimer(
        settings: Settings,
        phase: PomodoroKind = PomodoroKind.FOCUS,
        link: PomodoroLink = PomodoroLink(),
        focusCount: Int = 0
    ): ActiveTimer {
        val durationMs = durationForPhase(settings, phase)
        return ActiveTimer(
            phase = phase,
            status = TimerStatus.PAUSED,
            focusCount = focusCount,
            durationMs = durationMs,
            remainingMs = durationMs,
            phaseStartedAt = null,
            endAt = null,
            projectId = link.projectId,
            taskId = link.taskId,
            dailyPlanId = link.dailyPlanId
        )
    }

    fun startTimer(
        timer: ActiveTimer?,
        settings: Settings,
        link: PomodoroLink,
        now: Long = System.currentTimeMillis()
    ): ActiveTimer {
        val base = timer ?: createPausedTimer(settings, PomodoroKind.FOCUS, link)
        if (base.status == TimerStatus.RUNNING) {
            return base.copy(
                projectId = link.projectId,
                taskId = link.taskId,
                dailyPlanId = link.dailyPlanId
            )
        }
        return base.copy(
            projectId = link.projectId,
            taskId = link.taskId,
            dailyPlanId = link.dailyPlanId,
            status = TimerStatus.RUNNING,
            phaseStartedAt = base.phaseStartedAt ?: now,
            endAt = now + max(0L, base.remainingMs)
        )
    }

    fun pauseTimer(timer: ActiveTimer?, now: Long = System.currentTimeMillis()): ActiveTimer? {
        if (timer == null || timer.status != TimerStatus.RUNNING || timer.endAt == null) return timer
        return timer.copy(
            status = TimerStatus.PAUSED,
            remainingMs = max(0L, timer.endAt - now),
            endAt = null
        )
    }

    fun skipTimer(timer: ActiveTimer?, settings: Settings): ActiveTimer {
        val base = timer ?: createPausedTimer(settings)
        val focusCount = if (base.phase == PomodoroKind.FOCUS) base.focusCount + 1 else base.focusCount
        val nextPhase = if (base.phase == PomodoroKind.FOCUS) {
            if (focusCount % settings.longBreakInterval == 0) {
                PomodoroKind.LONG_BREAK
            } else {
                PomodoroKind.SHORT_BREAK
            }
        } else {
            PomodoroKind.FOCUS
        }

        return createPausedTimer(
            settings = settings,
            phase = nextPhase,
            link = PomodoroLink(base.projectId, base.taskId, base.dailyPlanId),
            focusCount = focusCount
        )
    }

    fun resetTimer(): ActiveTimer? = null

    private fun transitionAfterCompletion(
        timer: ActiveTimer,
        settings: Settings,
        endedAt: Long
    ): ActiveTimer {
        val focusCompleted = timer.phase == PomodoroKind.FOCUS
        val focusCount = if (focusCompleted) timer.focusCount + 1 else timer.focusCount
        val nextPhase = if (focusCompleted) {
            if (focusCount % settings.longBreakInterval == 0) {
                PomodoroKind.LONG_BREAK
            } else {
                PomodoroKind.SHORT_BREAK
            }
        } else {
            PomodoroKind.FOCUS
        }
        val durationMs = durationForPhase(settings, nextPhase)

        return timer.copy(
            phase = nextPhase,
            status = TimerStatus.RUNNING,
            focusCount = focusCount,
            durationMs = durationMs,
            remainingMs = durationMs,
            phaseStartedAt = endedAt,
            endAt = endedAt + durationMs
        )
    }

    fun reconcileTimer(
        timer: ActiveTimer?,
        settings: Settings,
        now: Long = System.currentTimeMillis()
    ): TimerReconcileResult {
        if (timer == null || timer.status != TimerStatus.RUNNING || timer.endAt == null || timer.endAt > now) {
            return TimerReconcileResult(timer = timer, completed = emptyList(), warning = null, changed = false)
        }

        var current: ActiveTimer = timer
        val completed = mutableListOf<CompletedFocus>()
        var transitions = 0

        while (
            current.status == TimerStatus.RUNNING &&
            current.endAt != null &&
            current.endAt!! <= now &&
            transitions < MAX_TIMER_CATCH_UP_PHASES
        ) {
            val endedAt = current.endAt!!
            if (current.phase == PomodoroKind.FOCUS) {
                val minutes = max(1, ceil(current.durationMs / 60_000.0).toInt())
                completed.add(
                    CompletedFocus(
                        projectId = current.projectId,
                        taskId = current.taskId,
                        dailyPlanId = current.dailyPlanId,
                        kind = PomodoroKind.FOCUS,
                        startedAt = current.phaseStartedAt ?: (endedAt - current.durationMs),
                        endedAt = endedAt,
                        minutes = minutes
                    )
                )
            }
            current = transitionAfterCompletion(current, settings, endedAt)
            transitions++
        }

        var warning: String? = null
        if (current.status == TimerStatus.RUNNING && current.endAt != null && current.endAt!! <= now) {
            current = current.copy(
                status = TimerStatus.PAUSED,
                remainingMs = current.durationMs,
                phaseStartedAt = null,
                endAt = null
            )
            warning = "计时器离线追赶超过 $MAX_TIMER_CATCH_UP_PHASES 个阶段，已自动暂停以保护数据。"
        }

        return TimerReconcileResult(timer = current, completed = completed, warning = warning, changed = true)
    }

    /**
     * 将对账完成的历史 sessions 转换为领域 PomodoroSession 并附加快照
     */
    fun convertCompletedToSessions(
        state: AppState,
        completed: List<CompletedFocus>
    ): List<PomodoroSession> {
        val projectNames = state.projects.associate { it.id to it.name }
        val taskNames = state.tasks.associate { it.id to it.name }
        val planNames = state.dailyPlans.associate { it.id to it.name }

        return completed.map { item ->
            PomodoroSession(
                id = IdGenerator.uid("ps_"),
                projectId = item.projectId,
                taskId = item.taskId,
                dailyPlanId = item.dailyPlanId,
                projectNameSnapshot = item.projectId?.let { projectNames[it] },
                taskNameSnapshot = item.taskId?.let { taskNames[it] },
                dailyPlanNameSnapshot = item.dailyPlanId?.let { planNames[it] },
                kind = item.kind,
                startedAt = item.startedAt,
                endedAt = item.endedAt,
                minutes = item.minutes
            )
        }
    }
}
