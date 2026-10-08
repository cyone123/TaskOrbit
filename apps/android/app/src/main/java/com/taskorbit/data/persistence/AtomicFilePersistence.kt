package com.taskorbit.data.persistence

import android.content.Context
import com.taskorbit.data.common.StateValidator
import com.taskorbit.data.migrations.MigrationManager
import com.taskorbit.domain.model.AppState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.io.File
import java.io.FileOutputStream

class AtomicFilePersistence(
    private val filesDir: File,
    private val scope: CoroutineScope
) {
    constructor(context: Context, scope: CoroutineScope) : this(context.filesDir, scope)
    companion object {
        private const val MAIN_FILE_NAME = "data.json"
        private const val BACKUP_FILE_NAME = "data.json.bak"
        private const val TMP_FILE_NAME = "data.json.tmp"
        private const val CORRUPT_FILE_NAME = "data.json.corrupt"
        private const val DEBOUNCE_MS = 400L
    }

    private val json = Json {
        prettyPrint = false
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private val mutex = Mutex()
    private var debounceJob: Job? = null
    private val mainFile: File get() = File(filesDir, MAIN_FILE_NAME)
    private val backupFile: File get() = File(filesDir, BACKUP_FILE_NAME)
    private val tmpFile: File get() = File(filesDir, TMP_FILE_NAME)
    private val corruptFile: File get() = File(filesDir, CORRUPT_FILE_NAME)
    @Volatile private var writesBlocked = false

    data class LoadResult(
        val state: AppState,
        val recoveredFromBackup: Boolean = false
    )

    suspend fun loadState(): LoadResult = withContext(Dispatchers.IO) {
        mutex.withLock {
            if (mainFile.exists()) {
                try {
                    val raw = mainFile.readText(Charsets.UTF_8)
                    val state = com.taskorbit.data.common.StateCodec.decode(raw)
                    return@withLock LoadResult(state = state, recoveredFromBackup = false)
                } catch (e: Exception) {
                    if (e is com.taskorbit.data.common.UnsupportedDataVersionException) {
                        writesBlocked = true
                        throw e
                    }
                    // 主文件解析失败或校验失败，将其备份为 .corrupt
                    try {
                        mainFile.copyTo(corruptFile, overwrite = true)
                    } catch (_: Exception) {}
                }
            }

            // 尝试从备份恢复
            if (backupFile.exists()) {
                try {
                    val raw = backupFile.readText(Charsets.UTF_8)
                    val state = com.taskorbit.data.common.StateCodec.decode(raw)
                    return@withLock LoadResult(state = state, recoveredFromBackup = true)
                } catch (e: Exception) {
                    if (e is com.taskorbit.data.common.UnsupportedDataVersionException) {
                        writesBlocked = true
                        throw e
                    }
                }
            }

            // 无可用文件，返回空状态
            LoadResult(state = AppState(), recoveredFromBackup = false)
        }
    }

    fun scheduleSave(state: AppState) {
        debounceJob?.cancel()
        debounceJob = scope.launch {
            delay(DEBOUNCE_MS)
            saveImmediately(state)
        }
    }

    suspend fun saveImmediately(state: AppState) = withContext(Dispatchers.IO) {
        mutex.withLock {
            check(!writesBlocked) { "数据版本不受支持，已停止保存，请升级应用。" }
            try {
                StateValidator.validate(state)
                val serialized = json.encodeToString(AppState.serializer(), state)

                // 1. 写入临时文件并物理刷盘
                FileOutputStream(tmpFile).use { fos ->
                    fos.write(serialized.toByteArray(Charsets.UTF_8))
                    fos.flush()
                    fos.fd.sync()
                }

                // 2. 将主文件轮换为备份文件
                if (mainFile.exists()) {
                    mainFile.copyTo(backupFile, overwrite = true)
                }

                // 3. 原子重命名 tmp -> main
                if (!tmpFile.renameTo(mainFile)) {
                    // 若 renameTo 失败（部分 Android 目录可能发生），使用覆盖复制
                    tmpFile.copyTo(mainFile, overwrite = true)
                    tmpFile.delete()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
