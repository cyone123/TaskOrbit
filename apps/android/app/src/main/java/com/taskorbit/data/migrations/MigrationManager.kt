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
    const val CURRENT_VERSION = com.taskorbit.domain.model.STATE_VERSION

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
            throw com.taskorbit.data.common.UnsupportedDataVersionException("数据版本 $version 高于当前版本 $CURRENT_VERSION，请升级应用。")
        }

        var migrated = root
        if (version <= 1) migrated = migrateV1ToV2(migrated)
        if (version <= 2) migrated = migrateV2ToV3(migrated)
        if (version <= 3) migrated = migrateV3ToV4(migrated)
        if (version <= 4) migrated = migrateV4ToV5(migrated)
        if (version <= 5) migrated = migrateV5ToV6(migrated)
        if (version <= 6) migrated = migrateV6ToV7(migrated)
        if (version <= 7) migrated = migrateV7ToV8(migrated)
        if (version <= 8) migrated = migrateV8ToV9(migrated)
        if (version <= 9) migrated = migrateV9ToV10(migrated)
        if (version <= 10) migrated = migrateV10ToV11(migrated)
        if (version <= 11) migrated = migrateV11ToV12(migrated)

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
                    put("notesFolder", JsonPrimitive("Task Orbit/Notes"))
                    put("autoReload", JsonPrimitive(true))
                    put("openWithObsidian", JsonPrimitive(true))
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
            put("version", JsonPrimitive(7))
            if ("webDavSettings" !in input) {
                put("webDavSettings", buildJsonObject {
                    put("enabled", JsonPrimitive(false))
                    put("serverUrl", JsonPrimitive(""))
                    put("username", JsonPrimitive(""))
                    put("password", JsonPrimitive(""))
                    put("remoteDir", JsonPrimitive("/taskorbit"))
                    put("autoSync", JsonPrimitive(true))
                    put("syncIntervalMinutes", JsonPrimitive(15))
                })
            }
        }
    }

    private fun withDefaults(input: JsonObject, version: Int, key: String, defaults: JsonObject): JsonObject =
        JsonObject(input + mapOf(
            "version" to JsonPrimitive(version),
            key to JsonObject(defaults + (input[key] as? JsonObject ?: JsonObject(emptyMap())))
        ))

    private fun aiDefaults(): JsonObject = json.encodeToJsonElement(
        com.taskorbit.domain.model.AiSettings.serializer(), com.taskorbit.domain.model.AiSettings()
    ).jsonObject

    private fun migrateV7ToV8(input: JsonObject): JsonObject = withDefaults(
        input, 8, "settings", json.encodeToJsonElement(
            com.taskorbit.domain.model.Settings.serializer(), com.taskorbit.domain.model.Settings()
        ).jsonObject
    )

    private fun migrateV8ToV9(input: JsonObject): JsonObject = withDefaults(input, 9, "aiSettings", aiDefaults())

    private fun migrateV9ToV10(input: JsonObject): JsonObject {
        val ai = input["aiSettings"] as? JsonObject ?: JsonObject(emptyMap())
        val migrated = withDefaults(input, 10, "aiSettings", aiDefaults())
        return JsonObject(migrated + ("aiSettings" to JsonObject(migrated.getValue("aiSettings").jsonObject + mapOf(
            "customProviders" to (ai["customProviders"] as? JsonArray ?: JsonArray(emptyList())),
            "providersConfig" to (ai["providersConfig"] as? JsonObject ?: JsonObject(emptyMap()))
        ))))
    }

    private fun migrateV10ToV11(input: JsonObject): JsonObject {
        val tasks = JsonArray((input["tasks"] as? JsonArray ?: JsonArray(emptyList())).map { element ->
            val task = element.jsonObject
            fun date(key: String): String? = (task[key] as? JsonPrimitive)
                ?.takeUnless { it is JsonNull }?.content?.trim()?.takeIf { it.isNotEmpty() }
            val start = date("startDate")
            val end = date("endDate")
            val done = (task["done"] as? JsonPrimitive)?.content == "true"
            val status = if (done) "done" else if (start != null && end != null) "in_progress" else "todo"
            JsonObject(task + mapOf(
                "startDate" to (start?.let(::JsonPrimitive) ?: JsonNull),
                "endDate" to (end?.let(::JsonPrimitive) ?: JsonNull),
                "done" to JsonPrimitive(done), "status" to JsonPrimitive(status)
            ))
        })
        return JsonObject(input + mapOf("version" to JsonPrimitive(11), "tasks" to tasks))
    }

    private fun migrateV11ToV12(input: JsonObject): JsonObject {
        val inboxItems = JsonArray((input["inboxItems"] as? JsonArray ?: JsonArray(emptyList())).map { element ->
            val item = element.jsonObject
            val isNote = (item["kind"] as? JsonPrimitive)?.content == "note"
            val done = if (isNote) false else ((item["done"] as? JsonPrimitive)?.content == "true")
            val projectId = (item["projectId"] as? JsonPrimitive)
                ?.takeUnless { it is JsonNull }?.content?.trim()?.takeIf { it.isNotEmpty() }
            JsonObject(item + mapOf(
                "kind" to JsonPrimitive("todo"),
                "done" to JsonPrimitive(done),
                "projectId" to (projectId?.let(::JsonPrimitive) ?: JsonNull)
            ))
        })
        return JsonObject(input + mapOf("version" to JsonPrimitive(12), "inboxItems" to inboxItems))
    }
}
