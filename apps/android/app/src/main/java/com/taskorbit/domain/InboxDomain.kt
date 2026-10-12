package com.taskorbit.domain

import com.taskorbit.data.common.IdGenerator
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.InboxItem
import com.taskorbit.domain.model.InboxItemKind

object InboxDomain {

    fun createInboxItem(
        title: String,
        description: String = "",
        projectId: String? = null,
        createdAt: Long = System.currentTimeMillis()
    ): InboxItem {
        val trimmedTitle = title.trim()
        val trimmedDesc = description.trim()
        require(trimmedTitle.isNotEmpty()) { "标题不能为空。" }
        val combinedContent = if (trimmedDesc.isNotEmpty()) "$trimmedTitle\n$trimmedDesc" else trimmedTitle
        return InboxItem(
            id = IdGenerator.uid("inbox_"),
            title = trimmedTitle,
            description = trimmedDesc,
            content = combinedContent,
            done = false,
            projectId = projectId,
            createdAt = createdAt,
            updatedAt = createdAt
        )
    }

    fun createInboxItem(
        content: String,
        projectId: String? = null,
        createdAt: Long = System.currentTimeMillis()
    ): InboxItem {
        val trimmed = content.trim()
        require(trimmed.isNotEmpty()) { "内容不能为空。" }
        val lines = trimmed.split("\n", limit = 2)
        val title = lines.getOrNull(0)?.trim().orEmpty().ifEmpty { "未命名待办" }
        val desc = lines.getOrNull(1)?.trim().orEmpty()
        return createInboxItem(
            title = title,
            description = desc,
            projectId = projectId,
            createdAt = createdAt
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
        title: String? = null,
        description: String? = null,
        content: String? = null,
        done: Boolean? = null,
        projectId: String? = null,
        clearProject: Boolean = false
    ): AppState {
        var found = false
        val nextItems = state.inboxItems.map { item ->
            if (item.id == id) {
                found = true
                var nextTitle = title?.trim() ?: item.title
                var nextDesc = description?.trim() ?: item.description
                if (title == null && description == null && content != null) {
                    val lines = content.trim().split("\n", limit = 2)
                    nextTitle = lines.getOrNull(0)?.trim().orEmpty().ifEmpty { item.title }
                    nextDesc = lines.getOrNull(1)?.trim().orEmpty()
                }
                require(nextTitle.isNotEmpty()) { "标题不能为空。" }
                val nextContent = if (nextDesc.isNotEmpty()) "$nextTitle\n$nextDesc" else nextTitle
                val nextProjectId = if (clearProject) null else (projectId ?: item.projectId)
                item.copy(
                    title = nextTitle,
                    description = nextDesc,
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

    fun updateInboxItemState(
        state: AppState,
        id: String,
        content: String?,
        done: Boolean?,
        projectId: String?,
        clearProject: Boolean
    ): AppState = updateInboxItemState(
        state = state,
        id = id,
        title = null,
        description = null,
        content = content,
        done = done,
        projectId = projectId,
        clearProject = clearProject
    )

    fun deleteInboxItemState(state: AppState, id: String): AppState {
        val nextItems = state.inboxItems.filterNot { it.id == id }
        if (nextItems.size == state.inboxItems.size) return state
        return state.copy(inboxItems = nextItems)
    }
}
