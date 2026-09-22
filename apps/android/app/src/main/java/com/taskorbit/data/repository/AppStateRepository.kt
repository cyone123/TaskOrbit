package com.taskorbit.data.repository

import android.content.Context
import com.taskorbit.data.common.StateValidator
import com.taskorbit.data.persistence.AtomicFilePersistence
import com.taskorbit.domain.InboxDomain
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.EntityType
import com.taskorbit.domain.model.InboxItemKind
import com.taskorbit.domain.model.Tombstone
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class AppStateRepository private constructor(context: Context) {

    companion object {
        @Volatile
        private var INSTANCE: AppStateRepository? = null

        fun getInstance(context: Context): AppStateRepository {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: AppStateRepository(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val persistence = AtomicFilePersistence(context, applicationScope)
    private val mutateMutex = Mutex()

    private val _state = MutableStateFlow(AppState())
    val state: StateFlow<AppState> = _state.asStateFlow()

    private val _isReady = MutableStateFlow(false)
    val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    private val _notice = MutableStateFlow<String?>(null)
    val notice: StateFlow<String?> = _notice.asStateFlow()

    private val tombstones = mutableListOf<Tombstone>()

    init {
        applicationScope.launch {
            val result = persistence.loadState()
            _state.value = result.state
            if (result.recoveredFromBackup) {
                _notice.value = "主数据异常，已从本地备份恢复。"
            }
            _isReady.value = true
        }
    }

    fun clearNotice() {
        _notice.value = null
    }

    fun mutate(mutator: (AppState) -> AppState) {
        applicationScope.launch {
            mutateMutex.withLock {
                val current = _state.value
                val next = mutator(current)
                try {
                    StateValidator.validate(next)
                    _state.value = next
                    persistence.scheduleSave(next)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    // --- Inbox Operations ---

    fun addInbox(kind: InboxItemKind, content: String) {
        val item = InboxDomain.createInboxItem(kind = kind, content = content)
        mutate { InboxDomain.appendInboxItem(it, item) }
    }

    fun toggleInbox(id: String, done: Boolean) {
        mutate { InboxDomain.toggleInboxItemState(it, id, done) }
    }

    fun removeInbox(id: String) {
        tombstones.add(Tombstone(id = id, type = EntityType.INBOX_ITEM, deletedAt = System.currentTimeMillis()))
        mutate { InboxDomain.deleteInboxItemState(it, id) }
    }

    // --- Project Operations ---

    fun addProject(input: com.taskorbit.domain.ProjectInput) {
        val project = com.taskorbit.domain.ProjectDomain.createProject(input)
        mutate { com.taskorbit.domain.ProjectDomain.appendProject(it, project) }
    }

    fun updateProject(id: String, input: com.taskorbit.domain.ProjectInput) {
        mutate { com.taskorbit.domain.ProjectDomain.updateProjectState(it, id, input) }
    }

    fun archiveProject(id: String) {
        mutate { com.taskorbit.domain.ProjectDomain.archiveProjectState(it, id) }
    }

    fun restoreProject(id: String) {
        mutate { com.taskorbit.domain.ProjectDomain.restoreProjectState(it, id) }
    }

    fun removeProject(id: String) {
        tombstones.add(Tombstone(id = id, type = EntityType.PROJECT, deletedAt = System.currentTimeMillis()))
        mutate { com.taskorbit.domain.ProjectDomain.deleteProjectState(it, id) }
    }

    // --- Task Operations ---

    fun addTask(input: com.taskorbit.domain.TaskInput) {
        val task = com.taskorbit.domain.TaskDomain.createTask(input)
        mutate { com.taskorbit.domain.TaskDomain.appendTask(it, task) }
    }

    fun updateTask(id: String, patch: com.taskorbit.domain.TaskPatch) {
        mutate { com.taskorbit.domain.TaskDomain.updateTaskState(it, id, patch) }
    }

    fun toggleTask(id: String, done: Boolean) {
        mutate { com.taskorbit.domain.TaskDomain.toggleTaskState(it, id, done) }
    }

    fun removeTask(id: String) {
        tombstones.add(Tombstone(id = id, type = EntityType.TASK, deletedAt = System.currentTimeMillis()))
        mutate { com.taskorbit.domain.TaskDomain.deleteTaskState(it, id) }
    }

    // --- DailyPlan Operations ---

    fun addPlans(input: com.taskorbit.domain.DailyPlanInput) {
        val plans = com.taskorbit.domain.DailyPlanDomain.createDailyPlans(input)
        mutate { com.taskorbit.domain.DailyPlanDomain.appendDailyPlans(it, plans) }
    }

    fun updatePlan(id: String, patch: com.taskorbit.domain.DailyPlanPatch) {
        mutate { com.taskorbit.domain.DailyPlanDomain.updateDailyPlanState(it, id, patch) }
    }

    fun togglePlan(id: String, done: Boolean) {
        mutate { com.taskorbit.domain.DailyPlanDomain.toggleDailyPlanState(it, id, done) }
    }

    fun removePlan(id: String) {
        tombstones.add(Tombstone(id = id, type = EntityType.DAILY_PLAN, deletedAt = System.currentTimeMillis()))
        mutate { com.taskorbit.domain.DailyPlanDomain.deleteDailyPlanState(it, id) }
    }

    // --- Pomodoro Operations ---

    fun startPomodoro(link: com.taskorbit.domain.model.PomodoroLink) {
        mutate { state ->
            val nextTimer = com.taskorbit.domain.TimerEngine.startTimer(state.activeTimer, state.settings, link)
            state.copy(activeTimer = nextTimer)
        }
    }

    fun pausePomodoro() {
        mutate { state ->
            val nextTimer = com.taskorbit.domain.TimerEngine.pauseTimer(state.activeTimer)
            state.copy(activeTimer = nextTimer)
        }
    }

    fun skipPomodoro() {
        mutate { state ->
            val nextTimer = com.taskorbit.domain.TimerEngine.skipTimer(state.activeTimer, state.settings)
            state.copy(activeTimer = nextTimer)
        }
    }

    fun resetPomodoro() {
        mutate { state ->
            state.copy(activeTimer = com.taskorbit.domain.TimerEngine.resetTimer())
        }
    }

    fun reconcileTimer() {
        val current = _state.value
        val result = com.taskorbit.domain.TimerEngine.reconcileTimer(current.activeTimer, current.settings)
        if (result.changed) {
            val sessions = com.taskorbit.domain.TimerEngine.convertCompletedToSessions(current, result.completed)
            mutate { state ->
                state.copy(
                    activeTimer = result.timer,
                    pomodoroSessions = sessions + state.pomodoroSessions
                )
            }
        }
    }

    fun updatePomodoroSettings(
        focusMinutes: Int? = null,
        shortBreakMinutes: Int? = null,
        longBreakMinutes: Int? = null,
        longBreakInterval: Int? = null
    ) {
        mutate { state ->
            val nextSettings = state.settings.copy(
                focusMinutes = focusMinutes ?: state.settings.focusMinutes,
                shortBreakMinutes = shortBreakMinutes ?: state.settings.shortBreakMinutes,
                longBreakMinutes = longBreakMinutes ?: state.settings.longBreakMinutes,
                longBreakInterval = longBreakInterval ?: state.settings.longBreakInterval
            )
            state.copy(settings = nextSettings)
        }
    }

    fun getTombstones(): List<Tombstone> = tombstones.toList()
}
