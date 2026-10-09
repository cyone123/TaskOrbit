package com.taskorbit.ui.screens.inbox

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.taskorbit.data.repository.AppStateRepository
import com.taskorbit.domain.model.InboxItem
import com.taskorbit.domain.model.InboxItemKind
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

class InboxViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AppStateRepository.getInstance(application)

    val inboxItems: StateFlow<List<InboxItem>> = repository.state
        .map { it.inboxItems }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val pendingCount: StateFlow<Int> = repository.state
        .map { it.inboxItems.count { item -> !item.done && item.kind == InboxItemKind.TODO } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    private val _content = MutableStateFlow("")
    val content: StateFlow<String> = _content.asStateFlow()

    private val _kind = MutableStateFlow(InboxItemKind.TODO)
    val kind: StateFlow<InboxItemKind> = _kind.asStateFlow()

    private val _isFocused = MutableStateFlow(false)
    val isFocused: StateFlow<Boolean> = _isFocused.asStateFlow()

    fun onContentChange(text: String) {
        _content.value = text
    }

    fun onFocusChange(focused: Boolean) {
        _isFocused.value = focused
    }

    fun toggleKind() {
        _kind.value = if (_kind.value == InboxItemKind.TODO) {
            InboxItemKind.NOTE
        } else {
            InboxItemKind.TODO
        }
    }

    fun submit() {
        val trimmed = _content.value.trim()
        if (trimmed.isEmpty()) return
        repository.addInbox(_kind.value, trimmed)
        _content.value = ""
    }

    fun toggleDone(id: String, done: Boolean) {
        repository.toggleInbox(id, done)
    }

    fun removeItem(id: String) {
        repository.removeInbox(id)
    }
}
