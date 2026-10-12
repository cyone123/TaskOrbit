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

    private val _title = MutableStateFlow("")
    val title: StateFlow<String> = _title.asStateFlow()

    private val _description = MutableStateFlow("")
    val description: StateFlow<String> = _description.asStateFlow()

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

    fun onTitleChange(text: String) {
        _title.value = text
    }

    fun onDescriptionChange(text: String) {
        _description.value = text
    }

    fun onContentChange(text: String) {
        _content.value = text
        val lines = text.split("\n", limit = 2)
        _title.value = lines.getOrNull(0).orEmpty()
        _description.value = lines.getOrNull(1).orEmpty()
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
        val trimmedTitle = _title.value.trim().ifEmpty { _content.value.trim() }
        if (trimmedTitle.isEmpty()) return
        val trimmedDesc = _description.value.trim()
        repository.addInbox(title = trimmedTitle, description = trimmedDesc, projectId = _draftProjectId.value)
        _title.value = ""
        _description.value = ""
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

    fun saveEditing(id: String, title: String, description: String, projectId: String?) {
        val trimmedTitle = title.trim()
        if (trimmedTitle.isEmpty()) return
        val trimmedDesc = description.trim()
        repository.updateInbox(
            id = id,
            title = trimmedTitle,
            description = trimmedDesc,
            projectId = projectId,
            clearProject = projectId == null
        )
        _editingItem.value = null
    }

    fun saveEditing(id: String, content: String, projectId: String?) {
        val lines = content.trim().split("\n", limit = 2)
        saveEditing(
            id = id,
            title = lines.getOrNull(0)?.trim().orEmpty(),
            description = lines.getOrNull(1)?.trim().orEmpty(),
            projectId = projectId
        )
    }
}
