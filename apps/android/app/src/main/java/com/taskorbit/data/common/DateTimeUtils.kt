package com.taskorbit.data.common

import java.time.LocalDate
import java.time.format.DateTimeFormatter

object DateTimeUtils {
    private val ISO_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    fun todayISO(): String {
        return LocalDate.now().format(ISO_DATE_FORMATTER)
    }

    fun isValidISODate(dateStr: String): Boolean {
        return try {
            LocalDate.parse(dateStr, ISO_DATE_FORMATTER)
            true
        } catch (_: Exception) {
            false
        }
    }
}
