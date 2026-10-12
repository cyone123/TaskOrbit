package com.taskorbit.ui.screens.inbox

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.taskorbit.data.repository.AppStateRepository
import com.taskorbit.domain.model.InboxItem
import com.taskorbit.domain.model.Project
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

enum class InboxStatusFilter(val label: String) {
    ALL("全部"),
    PENDING("待处理"),
    DONE("已完成")
}

class InboxViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AppStateRepository.getInstance(application)

    val inboxItems: StateFlow<List<InboxItem>> = repository.state
        .map { it.inboxItems }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val projects: StateFlow<List<Project>> = repository.state
        .map { it.projects.filter { p -> !p.archived } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val pendingCount: StateFlow<Int> = repository.state
        .map { it.inboxItems.count { item -> !item.done } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    private val _content = MutableStateFlow("")
    val content: StateFlow<String> = _content.asStateFlow()

    private val _draftProjectId = MutableStateFlow<String?>(null)
    val draftProjectId: StateFlow<String?> = _draftProjectId.asStateFlow()

    private val _statusFilter = MutableStateFlow(InboxStatusFilter.ALL)
    val statusFilter: StateFlow<InboxStatusFilter> = _statusFilter.asStateFlow()

    private val _projectFilter = MutableStateFlow<String?>("all") // "all", "none", or a specific projectId
    val projectFilter: StateFlow<String?> = _projectFilter.asStateFlow()

    private val _isFocused = MutableStateFlow(false)
    val isFocused: StateFlow<Boolean> = _isFocused.asStateFlow()

    private val _editingItem = MutableStateFlow<InboxItem?>(null)
    val editingItem: StateFlow<InboxItem?> = _editingItem.asStateFlow()

    fun onContentChange(text: String) {
        _content.value = text
    }

    fun onDraftProjectChange(projectId: String?) {
        _draftProjectId.value = projectId
    }

    fun onStatusFilterChange(filter: InboxStatusFilter) {
        _statusFilter.value = filter
    }

    fun onProjectFilterChange(projectFilter: String?) {
        _projectFilter.value = projectFilter
    }

    fun onFocusChange(focused: Boolean) {
        _isFocused.value = focused
    }

    fun submit() {
        val trimmed = _content.value.trim()
        if (trimmed.isEmpty()) return
        repository.addInbox(content = trimmed, projectId = _draftProjectId.value)
        _content.value = ""
        _draftProjectId.value = null
    }

    fun toggleDone(id: String, done: Boolean) {
        repository.toggleInbox(id, done)
    }

    fun removeItem(id: String) {
        repository.removeInbox(id)
    }

    fun startEditing(item: InboxItem) {
        _editingItem.value = item
    }

    fun dismissEditing() {
        _editingItem.value = null
    }

    fun saveEditing(id: String, content: String, projectId: String?) {
        val trimmed = content.trim()
        if (trimmed.isEmpty()) return
        repository.updateInbox(
            id = id,
            content = trimmed,
            projectId = projectId,
            clearProject = projectId == null
        )
        _editingItem.value = null
    }
}
