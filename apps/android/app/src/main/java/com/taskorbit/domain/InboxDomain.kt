package com.taskorbit.domain

import com.taskorbit.data.common.IdGenerator
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.InboxItem
import com.taskorbit.domain.model.InboxItemKind

object InboxDomain {

    fun createInboxItem(
        content: String,
        projectId: String? = null,
        createdAt: Long = System.currentTimeMillis()
    ): InboxItem {
        val trimmed = content.trim()
        require(trimmed.isNotEmpty()) { "内容不能为空。" }
        return InboxItem(
            id = IdGenerator.uid("inbox_"),
            kind = InboxItemKind.TODO,
            content = trimmed,
            done = false,
            projectId = projectId,
            createdAt = createdAt,
            updatedAt = createdAt
        )
    }

    fun createInboxItem(
        kind: InboxItemKind,
        content: String,
        createdAt: Long = System.currentTimeMillis()
    ): InboxItem = createInboxItem(content = content, projectId = null, createdAt = createdAt)

    fun appendInboxItem(state: AppState, item: InboxItem): AppState {
        return state.copy(
            inboxItems = listOf(item) + state.inboxItems
        )
    }

    fun toggleInboxItemState(state: AppState, id: String, done: Boolean): AppState {
        var found = false
        val nextItems = state.inboxItems.map { item ->
            if (item.id == id) {
                found = true
                item.copy(
                    done = done,
                    updatedAt = System.currentTimeMillis()
                )
            } else {
                item
            }
        }
        if (!found) return state
        return state.copy(inboxItems = nextItems)
    }

    fun updateInboxItemState(
        state: AppState,
        id: String,
        content: String? = null,
        done: Boolean? = null,
        projectId: String? = null,
        clearProject: Boolean = false
    ): AppState {
        var found = false
        val nextItems = state.inboxItems.map { item ->
            if (item.id == id) {
                found = true
                val nextContent = content?.trim() ?: item.content
                require(nextContent.isNotEmpty()) { "内容不能为空。" }
                val nextProjectId = if (clearProject) null else (projectId ?: item.projectId)
                item.copy(
                    content = nextContent,
                    done = done ?: item.done,
                    projectId = nextProjectId,
                    updatedAt = System.currentTimeMillis()
                )
            } else {
                item
            }
        }
        if (!found) return state
        return state.copy(inboxItems = nextItems)
    }

    fun deleteInboxItemState(state: AppState, id: String): AppState {
        val nextItems = state.inboxItems.filterNot { it.id == id }
        if (nextItems.size == state.inboxItems.size) return state
        return state.copy(inboxItems = nextItems)
    }
}
