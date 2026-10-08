package com.taskorbit.data.common

import com.taskorbit.data.migrations.MigrationManager
import com.taskorbit.domain.TaskDomain
import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.deriveTaskStatus
import kotlinx.serialization.json.*

class UnsupportedDataVersionException(message: String) : IllegalArgumentException(message)

/** Shared boundary for local files, imported snapshots and WebDAV state. */
object StateCodec {
    val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    fun decode(raw: String): AppState {
        val migrated = MigrationManager.migrate(raw)
        val decoded = json.decodeFromString<AppState>(migrated)
        val state = decoded.copy(tasks = decoded.tasks.map { task ->
            val start = task.startDate?.trim()?.takeIf { it.isNotEmpty() }
            val end = task.endDate?.trim()?.takeIf { it.isNotEmpty() }
            TaskDomain.validateSchedule(start, end)
            task.copy(startDate = start, endDate = end, status = deriveTaskStatus(task.done, start, end))
        })
        StateValidator.validate(state)
        return state
    }

    fun requireEnvelopeVersion(root: JsonObject, supported: Int) {
        val version = root["formatVersion"]?.jsonPrimitive?.intOrNull ?: 1
        if (version > supported) throw UnsupportedDataVersionException("文件格式版本 $version 高于当前版本 $supported，请升级应用。")
        require(version >= 1) { "文件格式版本无效。" }
    }
}
