package com.taskorbit.domain

import com.taskorbit.domain.model.DailyPlanRepeat
import java.time.LocalDate
import java.time.format.DateTimeFormatter

object RecurrenceEngine {

    const val MAX_REPEAT_COUNT = 365
    private val DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    data class NormalizedRepeat(
        val frequency: DailyPlanRepeat,
        val count: Int
    )

    fun normalize(frequency: DailyPlanRepeat, count: Int): NormalizedRepeat {
        val safeCount = count.coerceIn(1, MAX_REPEAT_COUNT)
        if (frequency == DailyPlanRepeat.NONE || safeCount <= 1) {
            return NormalizedRepeat(DailyPlanRepeat.NONE, 1)
        }
        return NormalizedRepeat(frequency, safeCount)
    }

    fun expandDates(
        startISO: String,
        frequency: DailyPlanRepeat = DailyPlanRepeat.NONE,
        count: Int = 1
    ): List<String> {
        val normalized = normalize(frequency, count)
        val startDate = LocalDate.parse(startISO, DATE_FORMATTER)

        return (0 until normalized.count).map { index ->
            val date = when (normalized.frequency) {
                DailyPlanRepeat.DAILY -> startDate.plusDays(index.toLong())
                DailyPlanRepeat.WEEKLY -> startDate.plusWeeks(index.toLong())
                DailyPlanRepeat.MONTHLY -> startDate.plusMonths(index.toLong())
                DailyPlanRepeat.NONE -> startDate
            }
            date.format(DATE_FORMATTER)
        }
    }
}
