package com.taskorbit

import com.taskorbit.data.migrations.MigrationManager
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.TaskStatus
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test

class V11MigrationTest {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Test
    fun `every supported recent version preserves configuration and timestamps`() {
        for (version in 7..10) {
            val raw = """{
                "version": $version,
                "settings": {"focusMinutes": 42, "dayStartHour": 8},
                "webDavSettings": {"password": "web-secret", "remoteDir": "existing"},
                "aiSettings": {"provider": "my-provider", "apiKey": "top-secret",
                  "customProviders": [{"id":"my-provider","name":"自定义","apiKey":"custom-secret"}],
                  "providersConfig": {"openai":{"apiKey":"remembered-secret","protocol":"openai_responses"}}},
                "tasks": [{"id":"t","projectId":"p","name":"任务","startDate":" 2026-10-01 ",
                  "endDate":"2026-10-08","done":false,"createdAt":123,"updatedAt":456}]
            }"""
            val migrated = MigrationManager.migrate(raw)
            val state = json.decodeFromString<AppState>(migrated)
            assertEquals(11, state.version)
            assertEquals(42, state.settings.focusMinutes)
            assertEquals(8, state.settings.dayStartHour)
            assertEquals(24, state.settings.dayEndHour)
            assertEquals("web-secret", state.webDavSettings.password)
            assertEquals("existing", state.webDavSettings.remoteDir)
            assertEquals("my-provider", state.aiSettings.provider)
            assertEquals("top-secret", state.aiSettings.apiKey)
            assertEquals("custom-secret", state.aiSettings.customProviders.single().apiKey)
            assertEquals("remembered-secret", state.aiSettings.providersConfig.getValue("openai").apiKey)
            assertEquals(TaskStatus.IN_PROGRESS, state.tasks.single().status)
            assertEquals("2026-10-01", state.tasks.single().startDate)
            assertEquals(123L, state.tasks.single().createdAt)
            assertEquals(456L, state.tasks.single().updatedAt)
            assertEquals(migrated, MigrationManager.migrate(migrated))
        }
    }

    @Test
    fun `unscheduled and completed tasks migrate without fabricated dates`() {
        val state = json.decodeFromString<AppState>(MigrationManager.migrate("""{
          "version":10,"tasks":[
            {"id":"a","projectId":"p","name":"待办","startDate":" ","endDate":null,"done":false,"createdAt":1,"updatedAt":2},
            {"id":"b","projectId":"p","name":"完成","startDate":null,"endDate":null,"done":true,"createdAt":1,"updatedAt":2}
          ]} """))
        assertNull(state.tasks[0].startDate)
        assertNull(state.tasks[0].endDate)
        assertEquals(TaskStatus.TODO, state.tasks[0].status)
        assertEquals(TaskStatus.DONE, state.tasks[1].status)
        val encoded = json.encodeToString(AppState.serializer(), state)
        assertEquals(state, json.decodeFromString<AppState>(encoded))
    }

    @Test
    fun `new state uses desktop defaults`() {
        val state = AppState()
        assertEquals(11, state.version)
        assertEquals(6, state.settings.weekDetailStartHour)
        assertEquals(3, state.settings.monthMaxTaskTracks)
        assertEquals("deepseek", state.aiSettings.provider)
        assertEquals("/taskorbit", state.webDavSettings.remoteDir)
        assertEquals(15, state.webDavSettings.syncIntervalMinutes)
    }
}
