package com.taskorbit.domain

import com.taskorbit.data.migrations.MigrationManager
import com.taskorbit.domain.model.AppState
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

const val EXPORT_FORMAT = "task-orbit-export"
const val EXPORT_FORMAT_VERSION = 1

@Serializable
data class TaskOrbitExportEnvelope(
    val format: String = EXPORT_FORMAT,
    val formatVersion: Int = EXPORT_FORMAT_VERSION,
    val exportedAt: Long,
    val state: AppState
)

object TransferEngine {

    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    /**
     * 将当前 AppState 序列化为标准的 Task Orbit 备份 JSON
     * 运行中的计时器与机器相关密码/路径将被安全排除
     */
    fun serializeExportSnapshot(state: AppState, exportedAt: Long = System.currentTimeMillis()): String {
        val portableVaultSettings = state.vaultSettings.copy(
            enabled = false,
            rootPath = null,
            vaultName = null
        )
        val portableWebDavSettings = state.webDavSettings.copy(
            enabled = false,
            password = ""
        )

        val portableState = state.copy(
            activeTimer = null,
            vaultSettings = portableVaultSettings,
            webDavSettings = portableWebDavSettings
        )

        val envelope = TaskOrbitExportEnvelope(
            format = EXPORT_FORMAT,
            formatVersion = EXPORT_FORMAT_VERSION,
            exportedAt = exportedAt,
            state = portableState
        )

        return json.encodeToString(envelope)
    }

    /**
     * 解析外部快照 JSON（支持 envelope 信封格式及直接导出的纯 AppState）
     * 自动通过 MigrationManager 迁移旧版本数据，并重置 activeTimer
     */
    fun parseImportSnapshot(rawJson: String): AppState {
        val rootElement = try {
            json.parseToJsonElement(rawJson)
        } catch (e: Exception) {
            throw IllegalArgumentException("导入文件不是有效的 JSON: ${e.message}", e)
        }

        val stateString = if (rootElement is JsonObject && rootElement.containsKey("format")) {
            val format = rootElement["format"]?.jsonPrimitive?.content
            if (format != EXPORT_FORMAT) {
                throw IllegalArgumentException("不支持的文件格式: $format")
            }
            val formatVersion = rootElement["formatVersion"]?.jsonPrimitive?.int ?: 1
            if (formatVersion > EXPORT_FORMAT_VERSION) {
                throw IllegalArgumentException("快照格式版本 $formatVersion 高于当前版本，请升级应用后再导入。")
            }
            val stateObj = rootElement["state"]?.jsonObject ?: throw IllegalArgumentException("快照中缺少有效的 state 节点。")
            stateObj.toString()
        } else if (rootElement is JsonObject) {
            rootElement.toString()
        } else {
            throw IllegalArgumentException("导入文件内容格式不正确。")
        }

        // 版本平滑迁移至当前最新版
        val migrated = MigrationManager.migrate(stateString)
        val state = json.decodeFromString(AppState.serializer(), migrated)

        // 导入状态强制将 activeTimer 置空
        return state.copy(activeTimer = null)
    }
}
