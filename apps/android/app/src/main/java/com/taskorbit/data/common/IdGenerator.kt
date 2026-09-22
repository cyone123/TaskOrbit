package com.taskorbit.data.common

import java.util.UUID

object IdGenerator {
    fun uid(prefix: String = ""): String {
        val randomPart = UUID.randomUUID().toString().replace("-", "").take(12)
        val timestamp = System.currentTimeMillis().toString(36)
        return "$prefix$timestamp$randomPart"
    }
}
