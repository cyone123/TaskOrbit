package com.taskorbit

import com.taskorbit.data.migrations.MigrationManager
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class MigrationManagerTest {

    @Test
    fun `migrate v1 state to v7 with complete default fields`() {
        val rawV1 = """
            {
                "version": 1,
                "projects": [
                    {
                        "id": "p1",
                        "name": "测试项目",
                        "description": "描述",
                        "color": "violet",
                        "startDate": "2026-09-01",
                        "endDate": "2026-09-30",
                        "archived": false,
                        "createdAt": 1000,
                        "updatedAt": 1000
                    }
                ],
                "tasks": [],
                "dailyPlans": [],
                "pomodoroSessions": []
            }
        """.trimIndent()

        val migratedJson = MigrationManager.migrate(rawV1)
        val root = Json.parseToJsonElement(migratedJson).jsonObject

        assertEquals(7, root["version"]?.jsonPrimitive?.intOrNull)
        assertNotNull(root["webDavSettings"])
        assertNotNull(root["inboxItems"])
        assertNotNull(root["vaultSettings"])
    }
}
