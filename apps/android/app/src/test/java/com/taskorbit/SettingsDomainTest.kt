package com.taskorbit

import com.taskorbit.domain.CalendarModel
import com.taskorbit.domain.SettingsDomain
import com.taskorbit.domain.model.*
import kotlinx.serialization.json.*
import org.junit.Assert.*
import org.junit.Test

class SettingsDomainTest {
    @Test
    fun `calendar preferences control range and retain midnight`() {
        assertEquals(6 to 24, CalendarModel.visibleHourRange(emptyList(), preferredStart = 6, preferredEnd = 24))
        assertEquals(9 to 17, CalendarModel.visibleHourRange(emptyList(), preferredStart = 9, preferredEnd = 17))
        val early = DailyPlan("d", name = "早间", date = "2026-10-08", startTime = "05:00", endTime = "06:00", createdAt = 1, updatedAt = 1)
        assertEquals(5 to 17, CalendarModel.visibleHourRange(listOf(early), preferredStart = 9, preferredEnd = 17))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `invalid calendar preference is rejected`() {
        SettingsDomain.validate(Settings(dayStartHour = 20, dayEndHour = 8))
    }

    @Test
    fun `switching provider remembers prior key and updates selected custom provider`() {
        val original = AiSettings(apiKey = "prior", customProviders = listOf(CustomAiProvider("mine", "自定义")))
        val updated = SettingsDomain.updateAiProvider(original, "mine", AiProviderConfig(baseUrl = "https://example.com", apiKey = "next", model = "m", temperature = 0.4))
        assertEquals("prior", updated.providersConfig.getValue("deepseek").apiKey)
        assertEquals("next", updated.customProviders.single().apiKey)
        assertEquals("mine", updated.provider)
        assertEquals(0.4, updated.temperature, 0.0)
    }

    @Test
    fun `optional AI fields are omitted rather than serialized as null`() {
        val json = Json { encodeDefaults = true }
        val encoded = json.encodeToJsonElement(AiSettings.serializer(), AiSettings()).jsonObject
        assertFalse(encoded.containsKey("protocol"))
        val config = json.encodeToJsonElement(AiProviderConfig.serializer(), AiProviderConfig()).jsonObject
        assertFalse(config.containsKey("protocol"))
        assertFalse(config.containsKey("temperature"))
    }
}
