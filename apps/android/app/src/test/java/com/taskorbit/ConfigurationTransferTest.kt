package com.taskorbit

import com.taskorbit.data.sync.SyncCoordinator
import com.taskorbit.data.sync.SyncMergeEngine
import com.taskorbit.domain.TransferEngine
import com.taskorbit.domain.model.*
import org.junit.Assert.*
import org.junit.Test

class ConfigurationTransferTest {
    private val ai = AiSettings(
        enabled = true, provider = "mine", apiKey = "top-secret",
        customProviders = listOf(CustomAiProvider("mine", "我的服务", apiKey = "custom-secret", model = "model-x")),
        providersConfig = mapOf("openai" to AiProviderConfig(apiKey = "remembered-secret", protocol = "openai_responses"))
    )

    @Test
    fun `export removes every AI key while retaining provider configuration`() {
        val state = AppState(aiSettings = ai)
        val exported = TransferEngine.serializeExportSnapshot(state)
        for (secret in listOf("top-secret", "custom-secret", "remembered-secret")) assertFalse(exported.contains(secret))
        val imported = TransferEngine.parseImportSnapshot(exported)
        assertFalse(imported.aiSettings.enabled)
        assertEquals("mine", imported.aiSettings.provider)
        assertEquals("model-x", imported.aiSettings.customProviders.single().model)
        assertEquals("", imported.aiSettings.customProviders.single().apiKey)
        assertEquals("openai_responses", imported.aiSettings.providersConfig.getValue("openai").protocol)
        assertEquals(ai, state.aiSettings)
    }

    @Test
    fun `sync preserves local preferences and AI but upload retains all AI keys`() {
        val local = AppState(settings = Settings(dayStartHour = 9), aiSettings = ai)
        val remote = AppState(settings = Settings(dayStartHour = 6), aiSettings = AiSettings(provider = "remote"))
        val result = SyncMergeEngine.mergeAppState(local, emptyList(), remote, emptyList())
        assertEquals(local.settings, result.mergedState.settings)
        assertEquals(ai, result.mergedState.aiSettings)
        assertEquals(ai, SyncCoordinator.portableState(result.mergedState).aiSettings)
        assertEquals(local.webDavSettings, result.mergedState.webDavSettings)
    }
}
