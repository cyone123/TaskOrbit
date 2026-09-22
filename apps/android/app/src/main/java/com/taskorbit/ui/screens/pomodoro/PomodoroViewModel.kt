package com.taskorbit.ui.screens.pomodoro

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.taskorbit.data.repository.AppStateRepository
import com.taskorbit.domain.TimerEngine
import com.taskorbit.domain.model.ActiveTimer
import com.taskorbit.domain.model.DailyPlan
import com.taskorbit.domain.model.PomodoroKind
import com.taskorbit.domain.model.PomodoroLink
import com.taskorbit.domain.model.PomodoroSession
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.Settings
import com.taskorbit.domain.model.Task
import com.taskorbit.domain.model.TimerStatus
import com.taskorbit.service.PomodoroForegroundService
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.max

data class TodayFocusStats(
    val completedCount: Int = 0,
    val totalMinutes: Int = 0,
    val sessions: List<PomodoroSession> = emptyList()
)

class PomodoroViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AppStateRepository.getInstance(application)

    val activeTimer: StateFlow<ActiveTimer?> = repository.state
        .map { it.activeTimer }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val settings: StateFlow<Settings> = repository.state
        .map { it.settings }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), Settings())

    val projects: StateFlow<List<Project>> = repository.state
        .map { it.projects.filter { p -> !p.archived } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val tasks: StateFlow<List<Task>> = repository.state
        .map { it.tasks.filter { t -> !t.done } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val dailyPlans: StateFlow<List<DailyPlan>> = repository.state
        .map { it.dailyPlans }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // 选中/关联状态
    private val _selectedProjectId = MutableStateFlow<String?>(null)
    val selectedProjectId: StateFlow<String?> = _selectedProjectId.asStateFlow()

    private val _selectedTaskId = MutableStateFlow<String?>(null)
    val selectedTaskId: StateFlow<String?> = _selectedTaskId.asStateFlow()

    // 独立的高频 UI 显示倒计时（250ms tick，不写入 AppState/磁盘）
    private val _displayRemainingMs = MutableStateFlow(25 * 60_000L)
    val displayRemainingMs: StateFlow<Long> = _displayRemainingMs.asStateFlow()

    // 今日专注统计
    val todayStats: StateFlow<TodayFocusStats> = repository.state
        .map { state ->
            val today = LocalDate.now()
            val todaySessions = state.pomodoroSessions.filter { session ->
                val sessionDate = Instant.ofEpochMilli(session.endedAt)
                    .atZone(ZoneId.systemDefault())
                    .toLocalDate()
                sessionDate == today && session.kind == PomodoroKind.FOCUS
            }
            TodayFocusStats(
                completedCount = todaySessions.size,
                totalMinutes = todaySessions.sumOf { it.minutes },
                sessions = todaySessions
            )
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), TodayFocusStats())

    private var tickJob: Job? = null

    init {
        // 观察 activeTimer 与 settings 变化，驱动 UI 倒计时
        viewModelScope.launch {
            repository.state.collectLatest { state ->
                val timer = state.activeTimer
                val currentSettings = state.settings

                if (timer != null) {
                    _selectedProjectId.value = timer.projectId
                    _selectedTaskId.value = timer.taskId
                }

                tickJob?.cancel()

                if (timer == null) {
                    _displayRemainingMs.value = TimerEngine.durationForPhase(currentSettings, PomodoroKind.FOCUS)
                } else if (timer.status == TimerStatus.PAUSED) {
                    _displayRemainingMs.value = timer.remainingMs
                } else if (timer.status == TimerStatus.RUNNING) {
                    tickJob = launch {
                        while (isActive) {
                            val now = System.currentTimeMillis()
                            val endAt = timer.endAt ?: now
                            val remaining = max(0L, endAt - now)
                            _displayRemainingMs.value = remaining

                            if (remaining <= 0L) {
                                // 阶段已到期，执行对账
                                repository.reconcileTimer()
                                break
                            }
                            delay(250L)
                        }
                    }
                }
            }
        }
    }

    fun selectProject(projectId: String?) {
        _selectedProjectId.value = projectId
        // 如果更换了项目，且当前选中的任务不属于该项目，重置任务选择
        if (projectId != null && _selectedTaskId.value != null) {
            val task = repository.state.value.tasks.find { it.id == _selectedTaskId.value }
            if (task?.projectId != projectId) {
                _selectedTaskId.value = null
            }
        }
        // 若当前有计时器，更新其关联
        val currentTimer = repository.state.value.activeTimer
        if (currentTimer != null) {
            updateLink(projectId, _selectedTaskId.value)
        }
    }

    fun selectTask(taskId: String?) {
        _selectedTaskId.value = taskId
        if (taskId != null) {
            val task = repository.state.value.tasks.find { it.id == taskId }
            if (task?.projectId != null) {
                _selectedProjectId.value = task.projectId
            }
        }
        val currentTimer = repository.state.value.activeTimer
        if (currentTimer != null) {
            updateLink(_selectedProjectId.value, taskId)
        }
    }

    private fun updateLink(projectId: String?, taskId: String?) {
        val link = PomodoroLink(projectId = projectId, taskId = taskId)
        repository.startPomodoro(link)
    }

    fun start() {
        val link = PomodoroLink(
            projectId = _selectedProjectId.value,
            taskId = _selectedTaskId.value
        )
        repository.startPomodoro(link)
        PomodoroForegroundService.startService(getApplication())
    }

    fun pause() {
        repository.pausePomodoro()
    }

    fun skip() {
        repository.skipPomodoro()
    }

    fun reset() {
        repository.resetPomodoro()
        PomodoroForegroundService.stopService(getApplication())
    }

    fun updateSettings(
        focusMinutes: Int? = null,
        shortBreakMinutes: Int? = null,
        longBreakMinutes: Int? = null,
        longBreakInterval: Int? = null
    ) {
        repository.updatePomodoroSettings(
            focusMinutes = focusMinutes,
            shortBreakMinutes = shortBreakMinutes,
            longBreakMinutes = longBreakMinutes,
            longBreakInterval = longBreakInterval
        )
    }
}
