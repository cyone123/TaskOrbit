package com.taskorbit

import com.taskorbit.domain.InboxDomain
import com.taskorbit.domain.ProjectDomain
import com.taskorbit.domain.ProjectInput
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.InboxItemKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InboxDomainTest {

    @Test
    fun `createInboxItem creates valid todo item with optional projectId`() {
        val item = InboxDomain.createInboxItem(
            content = "买牛奶",
            projectId = "p_1",
            createdAt = 1000L
        )

        assertEquals("买牛奶", item.content)
        assertFalse(item.done)
        assertEquals("p_1", item.projectId)
        assertEquals(1000L, item.createdAt)
        assertTrue(item.id.startsWith("inbox_"))
    }

    @Test
    fun `appendInboxItem adds item to front of list`() {
        val initial = AppState()
        val item1 = InboxDomain.createInboxItem(content = "第一条")
        val item2 = InboxDomain.createInboxItem(content = "第二条")

        val state1 = InboxDomain.appendInboxItem(initial, item1)
        val state2 = InboxDomain.appendInboxItem(state1, item2)

        assertEquals(2, state2.inboxItems.size)
        assertEquals("第二条", state2.inboxItems[0].content)
        assertEquals("第一条", state2.inboxItems[1].content)
    }

    @Test
    fun `toggleInboxItemState toggles done status`() {
        val initial = AppState()
        val item = InboxDomain.createInboxItem(content = "待办事项")

        var state = InboxDomain.appendInboxItem(initial, item)
        state = InboxDomain.toggleInboxItemState(state, item.id, done = true)
        val updated = state.inboxItems.find { it.id == item.id }!!
        assertTrue(updated.done)

        state = InboxDomain.toggleInboxItemState(state, item.id, done = false)
        val reverted = state.inboxItems.find { it.id == item.id }!!
        assertFalse(reverted.done)
    }

    @Test
    fun `updateInboxItemState updates content and projectId`() {
        val initial = AppState()
        val item = InboxDomain.createInboxItem(content = "原始待办", projectId = "p_1")
        var state = InboxDomain.appendInboxItem(initial, item)

        state = InboxDomain.updateInboxItemState(state, item.id, content = "新待办", projectId = "p_2")
        val updated = state.inboxItems.find { it.id == item.id }!!
        assertEquals("新待办", updated.content)
        assertEquals("p_2", updated.projectId)

        state = InboxDomain.updateInboxItemState(state, item.id, clearProject = true)
        val cleared = state.inboxItems.find { it.id == item.id }!!
        assertNull(cleared.projectId)
    }

    @Test
    fun `deleteProjectState unlinks associated inbox items`() {
        val initial = AppState()
        val project = ProjectDomain.createProject(
            ProjectInput(name = "测试项目", startDate = "2026-10-01", endDate = "2026-10-31")
        )
        var state = ProjectDomain.appendProject(initial, project)
        val itemWithProject = InboxDomain.createInboxItem(content = "关联项目待办", projectId = project.id)
        val itemWithoutProject = InboxDomain.createInboxItem(content = "独立待办", projectId = null)
        state = InboxDomain.appendInboxItem(state, itemWithProject)
        state = InboxDomain.appendInboxItem(state, itemWithoutProject)

        state = ProjectDomain.archiveProjectState(state, project.id)
        state = ProjectDomain.deleteProjectState(state, project.id)

        assertEquals(2, state.inboxItems.size)
        assertNull(state.inboxItems[0].projectId)
        assertNull(state.inboxItems[1].projectId)
    }

    @Test
    fun `deleteInboxItemState removes item correctly`() {
        val initial = AppState()
        val item1 = InboxDomain.createInboxItem(content = "待删除")
        val item2 = InboxDomain.createInboxItem(content = "保留")

        var state = InboxDomain.appendInboxItem(initial, item1)
        state = InboxDomain.appendInboxItem(state, item2)
        assertEquals(2, state.inboxItems.size)

        state = InboxDomain.deleteInboxItemState(state, item1.id)
        assertEquals(1, state.inboxItems.size)
        assertEquals("保留", state.inboxItems[0].content)
    }

    @Test
    fun `multi-line content is preserved faithfully in InboxItem`() {
        val multiLineText = "第一行待办\n第二行详情\n第三行备注"
        val item = InboxDomain.createInboxItem(content = multiLineText, projectId = "p_1")
        assertEquals(multiLineText, item.content)
        assertEquals(3, item.content.lines().size)
    }
}
