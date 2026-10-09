package com.taskorbit.ui.screens.stats

import android.app.Application
import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.taskorbit.data.repository.AppStateRepository
import com.taskorbit.domain.OverviewStats
import com.taskorbit.domain.StatsEngine
import com.taskorbit.domain.model.AiProviderConfig
import com.taskorbit.domain.model.AiSettings
import com.taskorbit.domain.model.WebDavSettings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate

sealed interface StatsUiEvent {
    data class Success(val message: String) : StatsUiEvent
    data class Error(val message: String) : StatsUiEvent
}

class StatsViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AppStateRepository.getInstance(application)

    val overviewStats: StateFlow<OverviewStats> = repository.state
        .map { StatsEngine.calculateOverview(it) }
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5000),
            StatsEngine.calculateOverview(repository.state.value)
        )

    val themePreference: StateFlow<String> = repository.state
        .map { it.settings.theme }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "system")

    val webDavSettings: StateFlow<WebDavSettings> = repository.state
        .map { it.webDavSettings }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), WebDavSettings())

    val aiSettings: StateFlow<AiSettings> = repository.state
        .map { it.aiSettings }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AiSettings())

    val syncStatus = repository.syncStatus
    val lastSyncAt = repository.lastSyncAt
    val syncErrorMessage = repository.syncErrorMessage

    private val _isBusy = MutableStateFlow(false)
    val isBusy: StateFlow<Boolean> = _isBusy.asStateFlow()

    private val _events = MutableSharedFlow<StatsUiEvent>()
    val events: SharedFlow<StatsUiEvent> = _events.asSharedFlow()

    fun updateTheme(theme: String) {
        repository.updateTheme(theme)
    }

    fun updateWebDavSettings(settings: WebDavSettings) {
        repository.updateWebDavSettings(settings)
    }

    fun updateAiProvider(provider: String, config: AiProviderConfig) {
        try {
            repository.updateAiProvider(provider, config)
            viewModelScope.launch {
                _events.emit(StatsUiEvent.Success("AI 助手配置已更新"))
            }
        } catch (e: Exception) {
            viewModelScope.launch {
                _events.emit(StatsUiEvent.Error("保存失败: ${e.message}"))
            }
        }
    }

    suspend fun testWebDavConnection(settings: WebDavSettings): com.taskorbit.data.sync.WebDavConnectionTestResult {
        return repository.testWebDavConnection(settings)
    }

    fun syncNow() {
        viewModelScope.launch {
            _isBusy.value = true
            try {
                val res = repository.syncNow()
                if (res.success) {
                    _events.emit(StatsUiEvent.Success(if (res.hasChanges) "同步完成：已完成双向合并" else "同步完成：数据已是最新"))
                } else {
                    _events.emit(StatsUiEvent.Error("同步失败: ${res.message}"))
                }
            } catch (e: Exception) {
                _events.emit(StatsUiEvent.Error("同步异常: ${e.message}"))
            } finally {
                _isBusy.value = false
            }
        }
    }

    suspend fun prepareExportFile(): Uri? = withContext(Dispatchers.IO) {
        _isBusy.value = true
        try {
            val jsonContent = repository.exportSnapshot()
            val fileName = "task-orbit-export-${LocalDate.now()}.json"
            val file = File(getApplication<Application>().cacheDir, fileName)
            file.writeText(jsonContent, Charsets.UTF_8)

            val uri = FileProvider.getUriForFile(
                getApplication(),
                "${getApplication<Application>().packageName}.fileprovider",
                file
            )
            uri
        } catch (e: Exception) {
            _events.emit(StatsUiEvent.Error("导出失败: ${e.message}"))
            null
        } finally {
            _isBusy.value = false
        }
    }

    fun importFromUri(uri: Uri) {
        viewModelScope.launch {
            _isBusy.value = true
            try {
                val rawJson = withContext(Dispatchers.IO) {
                    getApplication<Application>().contentResolver.openInputStream(uri)?.use { stream ->
                        stream.reader(Charsets.UTF_8).readText()
                    } ?: throw IllegalStateException("无法读取所选文件")
                }

                repository.importSnapshot(rawJson)
                _events.emit(StatsUiEvent.Success("数据导入成功，已更新当前工作区"))
            } catch (e: Exception) {
                _events.emit(StatsUiEvent.Error("导入失败: ${e.message}"))
            } finally {
                _isBusy.value = false
            }
        }
    }

    fun resetData() {
        viewModelScope.launch {
            _isBusy.value = true
            try {
                repository.resetAllData()
                _events.emit(StatsUiEvent.Success("全部数据已重置"))
            } catch (e: Exception) {
                _events.emit(StatsUiEvent.Error("重置失败: ${e.message}"))
            } finally {
                _isBusy.value = false
            }
        }
    }
}
