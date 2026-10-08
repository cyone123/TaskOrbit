package com.taskorbit.domain

import com.taskorbit.domain.model.ActiveTimer
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.PomodoroKind
import com.taskorbit.domain.model.Project
import com.taskorbit.domain.model.TimerStatus
import com.taskorbit.domain.model.VaultSettings
import com.taskorbit.domain.model.WebDavSettings
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class TransferEngineTest {

    @Test
    fun testSerializeExportSnapshotExcludesSensitiveData() {
        val state = AppState(
            activeTimer = ActiveTimer(
                phase = PomodoroKind.FOCUS,
                status = TimerStatus.RUNNING,
                focusCount = 1,
                durationMs = 25 * 60_000L,
                remainingMs = 20 * 60_000L,
                phaseStartedAt = 1000L,
                endAt = 25000L
            ),
            vaultSettings = VaultSettings(
                enabled = true,
                rootPath = "/home/user/vault",
                vaultName = "MyNotes"
            ),
            webDavSettings = WebDavSettings(
                enabled = true,
                serverUrl = "https://dav.example.com",
                username = "admin",
                password = "supersecretpassword"
            ),
            projects = listOf(
                Project(
                    id = "p1",
                    name = "重要项目",
                    startDate = "2026-09-22",
                    endDate = "2026-09-22",
                    createdAt = 1000L,
                    updatedAt = 1000L
                )
            )
        )

        val exportedJson = TransferEngine.serializeExportSnapshot(state, exportedAt = 5000L)
        assertTrue(exportedJson.contains("\"format\": \"task-orbit-export\""))
        assertTrue(exportedJson.contains("\"formatVersion\": 1"))
        assertTrue(exportedJson.contains("\"exportedAt\": 5000"))

        // 验证敏感信息被排除
        assertFalse(exportedJson.contains("supersecretpassword"))
        assertFalse(exportedJson.contains("/home/user/vault"))
        assertFalse(exportedJson.contains("MyNotes"))

        // 导入回来的状态校验
        val imported = TransferEngine.parseImportSnapshot(exportedJson)
        assertNull(imported.activeTimer)
        assertFalse(imported.vaultSettings.enabled)
        assertNull(imported.vaultSettings.rootPath)
        assertFalse(imported.webDavSettings.enabled)
        assertEquals("", imported.webDavSettings.password)
        assertEquals(1, imported.projects.size)
        assertEquals("重要项目", imported.projects[0].name)
    }

    @Test
    fun testParseImportLegacySnapshotWithMigration() {
        // v1 格式的旧版 JSON 快照
        val legacyJson = """
            {
                "version": 1,
                "projects": [],
                "tasks": [],
                "dailyPlans": [],
                "inboxItems": [],
                "pomodoroSessions": [],
                "settings": {
                    "focusMinutes": 30,
                    "shortBreakMinutes": 5,
                    "longBreakMinutes": 15,
                    "longBreakInterval": 4,
                    "theme": "dark"
                }
            }
        """.trimIndent()

        val imported = TransferEngine.parseImportSnapshot(legacyJson)
        assertEquals(11, imported.version)
        assertEquals(30, imported.settings.focusMinutes)
        assertEquals("dark", imported.settings.theme)
        assertNotNull(imported.vaultSettings)
        assertNotNull(imported.webDavSettings)
        assertNull(imported.activeTimer)
    }

    @Test
    fun testParseImportInvalidJsonThrows() {
        try {
            TransferEngine.parseImportSnapshot("invalid json text here")
            fail("Should throw IllegalArgumentException")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message?.contains("有效") == true)
        }
    }

    @Test
    fun testParseImportUnsupportedFormatThrows() {
        val wrongFormatJson = """
            {
                "format": "wrong-app-export",
                "formatVersion": 1,
                "exportedAt": 12345,
                "state": {}
            }
        """.trimIndent()

        try {
            TransferEngine.parseImportSnapshot(wrongFormatJson)
            fail("Should throw IllegalArgumentException")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message?.contains("不支持") == true)
        }
    }
}
