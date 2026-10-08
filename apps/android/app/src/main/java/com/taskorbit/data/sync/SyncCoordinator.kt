package com.taskorbit.data.sync

import com.taskorbit.domain.model.AppState
import com.taskorbit.domain.model.Tombstone
import com.taskorbit.domain.model.WebDavSettings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

interface SyncCoordinatorCallbacks {
    fun getState(): AppState
    fun getTombstones(): List<Tombstone>
    fun getLastRemoteEtag(): String?
    fun isLocalDirty(): Boolean
    suspend fun onStateMerged(mergedState: AppState, mergedTombstones: List<Tombstone>)
    suspend fun onSyncSuccess(etag: String?, timestamp: Long)
}

class SyncCoordinator(
    private val deviceId: String,
    private val callbacks: SyncCoordinatorCallbacks
) {
    private val mutex = Mutex()
    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    suspend fun sync(): SyncResult = withContext(Dispatchers.IO) {
        if (!mutex.tryLock()) {
            return@withContext SyncResult(success = false, message = "同步正在进行中", hasChanges = false)
        }

        try {
            val state = callbacks.getState()
            val webDav = state.webDavSettings

            if (!webDav.enabled) {
                return@withContext SyncResult(success = false, message = "WebDAV 云同步未启用", hasChanges = false)
            }
            if (webDav.serverUrl.trim().isEmpty()) {
                return@withContext SyncResult(success = false, message = "未配置 WebDAV 服务器地址", hasChanges = false)
            }

            performSyncWithRetries(webDav, maxRetries = 3)
        } catch (e: Exception) {
            SyncResult(success = false, message = "同步失败: ${e.message ?: "未知异常"}", hasChanges = false)
        } finally {
            mutex.unlock()
        }
    }

    private suspend fun performSyncWithRetries(webDav: WebDavSettings, maxRetries: Int): SyncResult {
        var lastError: Exception? = null
        for (attempt in 1..maxRetries) {
            try {
                return performSync(webDav)
            } catch (e: WebDavPreconditionFailedException) {
                lastError = e
                // 发生并发修改冲突，立即重试拉取最新远端文件合并
                continue
            } catch (e: Exception) {
                return SyncResult(success = false, message = "同步异常: ${e.message}", hasChanges = false)
            }
        }
        return SyncResult(
            success = false,
            message = "并发同步冲突过多 (${lastError?.message})，已自动取消",
            hasChanges = false
        )
    }

    private suspend fun performSync(webDav: WebDavSettings): SyncResult {
        val client = WebDavClient(webDav)
        val remoteDir = webDav.remoteDir.trim().ifEmpty { "/taskorbit" }
        val cleanDir = remoteDir.replace(Regex("/+$"), "")
        val remoteFilePath = "$cleanDir/task-orbit-data.json"

        // 1. 确保远端目录存在
        client.ensureDir(remoteDir)

        // 2. 检查远端文件元数据
        val meta = client.getFileMeta(remoteFilePath)
        val lastEtag = callbacks.getLastRemoteEtag()
        val localDirty = callbacks.isLocalDirty()
        val currentState = callbacks.getState()

        // Case A: 远端文件尚不存在（首次同步）
        if (!meta.exists) {
            val envelope = buildEnvelope(currentState, callbacks.getTombstones())
            val newEtag = client.putFile(remoteFilePath, json.encodeToString(envelope))
            val now = System.currentTimeMillis()
            callbacks.onSyncSuccess(newEtag, now)
            return SyncResult(success = true, message = "初次同步完成", hasChanges = true)
        }

        // Case B: 远端文件未变 (ETag 匹配)
        if (meta.etag != null && lastEtag != null && meta.etag == lastEtag) {
            if (!localDirty) {
                // 本地与远端均无任何变化
                val now = System.currentTimeMillis()
                callbacks.onSyncSuccess(meta.etag, now)
                return SyncResult(success = true, message = "数据已是最新", hasChanges = false)
            }

            // 本地有修改，带 If-Match 乐观锁上传
            val envelope = buildEnvelope(currentState, callbacks.getTombstones())
            val newEtag = client.putFile(remoteFilePath, json.encodeToString(envelope), meta.etag)
            val now = System.currentTimeMillis()
            callbacks.onSyncSuccess(newEtag, now)
            return SyncResult(success = true, message = "本地更改已上传", hasChanges = true)
        }

        // Case C: 远端文件已变更（或首次从已有云端拉取）
        val (content, remoteEtag) = client.getFile(remoteFilePath)
        val remoteEnvelope = try {
            decodeEnvelope(content)
        } catch (e: Exception) {
            throw IllegalArgumentException("远端同步文件解析失败: ${e.message}", e)
        }

        if (remoteEnvelope.format != SYNC_ENVELOPE_FORMAT) {
            throw IllegalArgumentException("远端文件不是有效的 Task Orbit 同步格式: ${remoteEnvelope.format}")
        }

        val localTombstones = callbacks.getTombstones()
        val mergeResult = SyncMergeEngine.mergeAppState(
            localState = currentState,
            localTombstones = localTombstones,
            remotePayload = remoteEnvelope.state,
            remoteTombstones = remoteEnvelope.tombstones
        )

        // 应用合并后的本地状态
        callbacks.onStateMerged(mergeResult.mergedState, mergeResult.mergedTombstones)

        // 将合并结果组装 envelope 并上传至远端
        val mergedEnvelope = buildEnvelope(mergeResult.mergedState, mergeResult.mergedTombstones)
        val putEtag = client.putFile(remoteFilePath, json.encodeToString(mergedEnvelope), remoteEtag)

        val now = System.currentTimeMillis()
        callbacks.onSyncSuccess(putEtag, now)

        return SyncResult(
            success = true,
            message = if (mergeResult.hasChanges) "双向合并完成" else "数据已是最新",
            hasChanges = mergeResult.hasChanges
        )
    }

    companion object {
        fun decodeEnvelope(content: String): WebDavSyncEnvelope {
            val codec = com.taskorbit.data.common.StateCodec
            val root = codec.json.parseToJsonElement(content) as? kotlinx.serialization.json.JsonObject
                ?: throw IllegalArgumentException("同步文件格式无效。")
            require(root["format"] == kotlinx.serialization.json.JsonPrimitive(SYNC_ENVELOPE_FORMAT)) { "同步文件格式无效。" }
            codec.requireEnvelopeVersion(root, SYNC_ENVELOPE_VERSION)
            val state = codec.decode(root["state"]?.toString() ?: error("同步文件缺少 state。"))
            val normalized = kotlinx.serialization.json.JsonObject(root + ("state" to codec.json.encodeToJsonElement(AppState.serializer(), state)))
            return codec.json.decodeFromJsonElement(WebDavSyncEnvelope.serializer(), normalized)
        }
    }

    private fun buildEnvelope(state: AppState, tombstones: List<Tombstone>): WebDavSyncEnvelope {
        val portableState = state.copy(
            activeTimer = null,
            webDavSettings = com.taskorbit.domain.model.WebDavSettings()
        )
        return WebDavSyncEnvelope(
            format = SYNC_ENVELOPE_FORMAT,
            formatVersion = SYNC_ENVELOPE_VERSION,
            deviceId = deviceId,
            updatedAt = System.currentTimeMillis(),
            state = portableState,
            tombstones = tombstones
        )
    }
}
