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

    fun getTombstones(): List<Tombstone> = tombstones.toList()
}
