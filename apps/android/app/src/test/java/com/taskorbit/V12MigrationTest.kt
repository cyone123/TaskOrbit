package com.taskorbit

import com.taskorbit.data.common.StateValidator
import com.taskorbit.data.migrations.MigrationManager
import com.taskorbit.domain.model.AppState
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class V12MigrationTest {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Test
    fun `v11 to v12 converts notes to todos and populates projectId`() {
        val rawV11 = """{
            "version": 11,
            "projects": [
                {
                    "id": "p_1",
                    "name": "活跃项目",
                    "description": "",
                    "color": "blue",
                    "startDate": "2026-10-01",
                    "endDate": "2026-10-31",
                    "archived": false,
                    "createdAt": 1000,
                    "updatedAt": 1000
                }
            ],
            "tasks": [],
            "dailyPlans": [],
            "inboxItems": [
                {
                    "id": "i_1",
                    "kind": "note",
                    "content": "多行备忘\n灵感内容",
                    "done": false,
                    "createdAt": 1000,
                    "updatedAt": 1000
                },
                {
                    "id": "i_2",
                    "kind": "todo",
                    "content": "普通待办",
                    "done": true,
                    "createdAt": 1100,
                    "updatedAt": 1100
                },
                {
                    "id": "i_3",
                    "kind": "todo",
                    "content": "项目待办",
                    "done": false,
                    "projectId": "p_1",
                    "createdAt": 1200,
                    "updatedAt": 1200
                }
            ]
        }"""

        val migrated = MigrationManager.migrate(rawV11)
        val state = json.decodeFromString<AppState>(migrated)

        assertEquals(12, state.version)
        assertEquals(3, state.inboxItems.size)

        // note -> todo, done=false, projectId=null, split title & description
        val item1 = state.inboxItems[0]
        assertEquals("多行备忘", item1.title)
        assertEquals("灵感内容", item1.description)
        assertEquals("多行备忘\n灵感内容", item1.content)
        assertFalse(item1.done)
        assertNull(item1.projectId)

        // todo, done=true, projectId=null
        val item2 = state.inboxItems[1]
        assertEquals("普通待办", item2.title)
        assertEquals("", item2.description)
        assertEquals("普通待办", item2.content)
        assertTrue(item2.done)
        assertNull(item2.projectId)

        // todo, projectId="p_1"
        val item3 = state.inboxItems[2]
        assertEquals("项目待办", item3.title)
        assertEquals("", item3.description)
        assertEquals("项目待办", item3.content)
        assertEquals("p_1", item3.projectId)

        // 校验通过 StateValidator
        StateValidator.validate(state)
    }

    @Test(expected = StateValidator.ValidationException::class)
    fun `StateValidator rejects inbox item referencing non-existent project`() {
        val state = AppState(
            version = 12,
            projects = emptyList(),
            inboxItems = listOf(
                com.taskorbit.domain.model.InboxItem(
                    id = "i_bad",
                    content = "孤立项目待办",
                    projectId = "p_non_existent",
                    createdAt = 1000L,
                    updatedAt = 1000L
                )
            )
        )
        StateValidator.validate(state)
    }
}
