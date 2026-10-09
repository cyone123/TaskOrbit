package com.taskorbit.domain

import com.taskorbit.domain.model.*

object SettingsDomain {
    fun validate(settings: Settings) {
        require(settings.dayStartHour in 0..23 && settings.dayEndHour in 1..24 && settings.dayEndHour > settings.dayStartHour) { "日视图结束时间必须晚于开始时间。" }
        require(settings.weekDetailStartHour in 0..23 && settings.weekDetailEndHour in 1..24 && settings.weekDetailEndHour > settings.weekDetailStartHour) { "周视图结束时间必须晚于开始时间。" }
        require(settings.monthMaxTaskTracks in 1..10) { "月视图任务轨道数应为 1～10。" }
        require(settings.monthMaxDailyPlans in 1..20) { "月视图每日计划数应为 1～20。" }
        require(settings.focusMinutes > 0 && settings.shortBreakMinutes > 0 && settings.longBreakMinutes > 0 && settings.longBreakInterval > 0) { "计时设置必须大于零。" }
    }

    fun updateAiProvider(settings: AiSettings, provider: String, config: AiProviderConfig): AiSettings {
        require(provider.isNotBlank()) { "请选择供应商。" }
        require(config.temperature == null || config.temperature in 0.0..2.0) { "温度应为 0～2。" }
        require(config.protocol == null || config.protocol in listOf("openai_chat", "openai_responses", "anthropic", "gemini")) { "请选择有效协议。" }
        val remembered = settings.providersConfig + (settings.provider to AiProviderConfig(
            settings.protocol, settings.baseUrl, settings.apiKey, settings.model, settings.temperature
        )) + (provider to config)
        return settings.copy(
            provider = provider, protocol = config.protocol, baseUrl = config.baseUrl.trim(),
            apiKey = config.apiKey, model = config.model.trim(), temperature = config.temperature ?: 0.7,
            providersConfig = remembered,
            customProviders = settings.customProviders.map { custom ->
                if (custom.id == provider) custom.copy(protocol = config.protocol, baseUrl = config.baseUrl.trim(), apiKey = config.apiKey, model = config.model.trim(), temperature = config.temperature ?: 0.7) else custom
            }
        )
    }
}
