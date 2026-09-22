package com.taskorbit.data.migrations

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

object MigrationManager {
    const val CURRENT_VERSION = 7

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    fun migrate(rawJson: String): String {
        val root = try {
            json.parseToJsonElement(rawJson).jsonObject
        } catch (_: Exception) {
            return rawJson
        }

        val version = root["version"]?.jsonPrimitive?.intOrNull ?: 1
        if (version > CURRENT_VERSION) {
            throw IllegalArgumentException("数据版本 $version 高于当前版本 $CURRENT_VERSION，请升级应用。")
        }

        var migrated = root
        if (version <= 1) migrated = migrateV1ToV2(migrated)
        if (version <= 2) migrated = migrateV2ToV3(migrated)
        if (version <= 3) migrated = migrateV3ToV4(migrated)
        if (version <= 4) migrated = migrateV4ToV5(migrated)
        if (version <= 5) migrated = migrateV5ToV6(migrated)
        if (version <= 6) migrated = migrateV6ToV7(migrated)

        return migrated.toString()
    }

    private fun migrateV1ToV2(input: JsonObject): JsonObject {
        val projects = input["projects"]?.jsonArray ?: JsonArray(emptyList())
        val sessions = input["pomodoroSessions"]?.jsonArray ?: JsonArray(emptyList())

        val migratedProjects = JsonArray(projects.map { elem ->
            val obj = elem.jsonObject
            buildJsonObject {
                obj.forEach { (k, v) -> put(k, v) }
                if ("archivedAt" !in obj) put("archivedAt", JsonNull)
            }
        })

        val migratedSessions = JsonArray(sessions.map { elem ->
            val obj = elem.jsonObject
            buildJsonObject {
                obj.forEach { (k, v) -> put(k, v) }
                if ("projectNameSnapshot" !in obj) put("projectNameSnapshot", JsonNull)
                if ("taskNameSnapshot" !in obj) put("taskNameSnapshot", JsonNull)
                if ("dailyPlanNameSnapshot" !in obj) put("dailyPlanNameSnapshot", JsonNull)
            }
        })

        return buildJsonObject {
            input.forEach { (k, v) -> put(k, v) }
            put("version", JsonPrimitive(2))
            put("projects", migratedProjects)
            put("pomodoroSessions", migratedSessions)
        }
    }

    private fun migrateV2ToV3(input: JsonObject): JsonObject {
        return buildJsonObject {
            input.forEach { (k, v) -> put(k, v) }
            put("version", JsonPrimitive(3))
            if ("activeTimer" !in input) put("activeTimer", JsonNull)
        }
    }

    private fun migrateV3ToV4(input: JsonObject): JsonObject {
        val plans = input["dailyPlans"]?.jsonArray ?: JsonArray(emptyList())
        val migratedPlans = JsonArray(plans.map { elem ->
            val obj = elem.jsonObject
            buildJsonObject {
                obj.forEach { (k, v) -> put(k, v) }
                if ("recurrence" !in obj) {
                    put("recurrence", buildJsonObject {
                        put("frequency", JsonPrimitive("none"))
                        put("count", JsonPrimitive(1))
                        put("seriesId", JsonNull)
                        put("occurrence", JsonPrimitive(1))
                    })
                }
            }
        })
        return buildJsonObject {
            input.forEach { (k, v) -> put(k, v) }
            put("version", JsonPrimitive(4))
            put("dailyPlans", migratedPlans)
        }
    }

    private fun migrateV4ToV5(input: JsonObject): JsonObject {
        return buildJsonObject {
            input.forEach { (k, v) -> put(k, v) }
            put("version", JsonPrimitive(5))
            if ("vaultSettings" !in input) {
                put("vaultSettings", buildJsonObject {
                    put("enabled", JsonPrimitive(false))
                    put("rootPath", JsonNull)
                    put("vaultName", JsonNull)
                    put("notesFolder", JsonPrimitive("Notes"))
                    put("autoReload", JsonPrimitive(true))
                    put("openWithObsidian", JsonPrimitive(false))
                })
            }
        }
    }

    private fun migrateV5ToV6(input: JsonObject): JsonObject {
        return buildJsonObject {
            input.forEach { (k, v) -> put(k, v) }
            put("version", JsonPrimitive(6))
            if ("inboxItems" !in input) {
                put("inboxItems", JsonArray(emptyList()))
            }
        }
    }

    private fun migrateV6ToV7(input: JsonObject): JsonObject {
        return buildJsonObject {
            input.forEach { (k, v) -> put(k, v) }
            put("version", JsonPrimitive(CURRENT_VERSION))
            if ("webDavSettings" !in input) {
                put("webDavSettings", buildJsonObject {
                    put("enabled", JsonPrimitive(false))
                    put("serverUrl", JsonPrimitive(""))
                    put("username", JsonPrimitive(""))
                    put("password", JsonPrimitive(""))
                    put("remoteDir", JsonPrimitive("TaskOrbit"))
                    put("autoSync", JsonPrimitive(false))
                    put("syncIntervalMinutes", JsonPrimitive(30))
                })
            }
        }
    }
}
