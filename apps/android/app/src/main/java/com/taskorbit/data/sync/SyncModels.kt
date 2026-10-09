package com.taskorbit.data.sync

import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.Tombstone
import kotlinx.serialization.Serializable

const val SYNC_ENVELOPE_FORMAT = "task-orbit-webdav-sync"
const val SYNC_ENVELOPE_VERSION = 1

@Serializable
data class WebDavSyncEnvelope(
    val format: String = SYNC_ENVELOPE_FORMAT,
    val formatVersion: Int = SYNC_ENVELOPE_VERSION,
    val deviceId: String,
    val updatedAt: Long,
    val state: AppState,
    val tombstones: List<Tombstone> = emptyList()
)

data class MergeResult(
    val mergedState: AppState,
    val mergedTombstones: List<Tombstone>,
    val hasChanges: Boolean
)

enum class SyncStatus {
    IDLE,
    SYNCING,
    SUCCESS,
    ERROR
}

data class SyncResult(
    val success: Boolean,
    val message: String? = null,
    val hasChanges: Boolean = false
)

data class WebDavConnectionTestResult(
    val success: Boolean,
    val message: String,
    val statusCode: Int = 0
)

data class WebDavFileMeta(
    val exists: Boolean,
    val etag: String? = null,
    val lastModified: String? = null,
    val isDirectory: Boolean = false
)
