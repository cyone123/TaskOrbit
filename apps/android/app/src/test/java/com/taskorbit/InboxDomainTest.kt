package com.taskorbit

import com.taskorbit.domain.InboxDomain
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.InboxItemKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InboxDomainTest {

    @Test
    fun `createInboxItem creates valid todo item`() {
        val item = InboxDomain.createInboxItem(
            kind = InboxItemKind.TODO,
            content = "买牛奶",
            createdAt = 1000L
        )

        assertEquals(InboxItemKind.TODO, item.kind)
        assertEquals("买牛奶", item.content)
        assertFalse(item.done)
        assertEquals(1000L, item.createdAt)
        assertTrue(item.id.startsWith("inbox_"))
    }

    @Test
    fun `appendInboxItem adds item to front of list`() {
        val initial = AppState()
        val item1 = InboxDomain.createInboxItem(InboxItemKind.TODO, "第一条")
        val item2 = InboxDomain.createInboxItem(InboxItemKind.NOTE, "第二条")

        val state1 = InboxDomain.appendInboxItem(initial, item1)
        val state2 = InboxDomain.appendInboxItem(state1, item2)

        assertEquals(2, state2.inboxItems.size)
        assertEquals("第二条", state2.inboxItems[0].content)
        assertEquals("第一条", state2.inboxItems[1].content)
    }

    @Test
    fun `toggleInboxItemState toggles todo and keeps note false`() {
        val initial = AppState()
        val todo = InboxDomain.createInboxItem(InboxItemKind.TODO, "待办事项")
        val note = InboxDomain.createInboxItem(InboxItemKind.NOTE, "备忘事项")

        var state = InboxDomain.appendInboxItem(initial, todo)
        state = InboxDomain.appendInboxItem(state, note)

        // 切换待办为完成
        state = InboxDomain.toggleInboxItemState(state, todo.id, done = true)
        val updatedTodo = state.inboxItems.find { it.id == todo.id }!!
        assertTrue(updatedTodo.done)

        // 尝试切换备忘为完成，应保持为 false
        state = InboxDomain.toggleInboxItemState(state, note.id, done = true)
        val updatedNote = state.inboxItems.find { it.id == note.id }!!
        assertFalse(updatedNote.done)
    }

    @Test
    fun `deleteInboxItemState removes item correctly`() {
        val initial = AppState()
        val item1 = InboxDomain.createInboxItem(InboxItemKind.TODO, "待删除")
        val item2 = InboxDomain.createInboxItem(InboxItemKind.TODO, "保留")

        var state = InboxDomain.appendInboxItem(initial, item1)
        state = InboxDomain.appendInboxItem(state, item2)
        assertEquals(2, state.inboxItems.size)

        state = InboxDomain.deleteInboxItemState(state, item1.id)
        assertEquals(1, state.inboxItems.size)
        assertEquals("保留", state.inboxItems[0].content)
    }
}
