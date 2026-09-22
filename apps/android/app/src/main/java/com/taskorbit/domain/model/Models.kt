package com.taskorbit.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Priority {
    @SerialName("low") LOW,
    @SerialName("medium") MEDIUM,
    @SerialName("high") HIGH;

    val label: String
        get() = when (this) {
            LOW -> "低优先级"
            MEDIUM -> "中优先级"
            HIGH -> "高优先级"
        }
}

@Serializable
data class Project(
    val id: String,
    val name: String,
    val description: String = "",
    val color: String = "violet",
    val startDate: String, // YYYY-MM-DD
    val endDate: String,   // YYYY-MM-DD
    val archived: Boolean = false,
    val archivedAt: Long? = null,
    val createdAt: Long,
    val updatedAt: Long
)

@Serializable
enum class DailyPlanRepeat {
    @SerialName("none") NONE,
    @SerialName("daily") DAILY,
    @SerialName("weekly") WEEKLY,
    @SerialName("monthly") MONTHLY;

    val label: String
        get() = when (this) {
            NONE -> "不重复"
            DAILY -> "每天"
            WEEKLY -> "每周"
            MONTHLY -> "每月"
        }
}

@Serializable
data class DailyPlanRecurrence(
    val frequency: DailyPlanRepeat = DailyPlanRepeat.NONE,
    val count: Int = 1,
    val seriesId: String? = null,
    val occurrence: Int = 1
)

@Serializable
data class DailyPlan(
    val id: String,
    val projectId: String? = null,
    val taskId: String? = null,
    val name: String,
    val description: String = "",
    val date: String, // YYYY-MM-DD
    val startTime: String, // HH:mm
    val endTime: String,   // HH:mm
    val done: Boolean = false,
    val estimatedMinutes: Int = 0,
    val recurrence: DailyPlanRecurrence = DailyPlanRecurrence(),
    val createdAt: Long,
    val updatedAt: Long
)

@Serializable
data class Task(
    val id: String,
    val projectId: String,
    val name: String,
    val description: String = "",
    val startDate: String, // YYYY-MM-DD
    val endDate: String,   // YYYY-MM-DD
    val done: Boolean = false,
    val priority: Priority = Priority.MEDIUM,
    val createdAt: Long,
    val updatedAt: Long
)

@Serializable
enum class InboxItemKind {
    @SerialName("todo") TODO,
    @SerialName("note") NOTE;

    val label: String
        get() = when (this) {
            TODO -> "待办"
            NOTE -> "备忘"
        }
}

@Serializable
data class InboxItem(
    val id: String,
    val kind: InboxItemKind = InboxItemKind.TODO,
    val content: String,
    val done: Boolean = false,
    val createdAt: Long,
    val updatedAt: Long
)

@Serializable
enum class PomodoroKind {
    @SerialName("focus") FOCUS,
    @SerialName("shortBreak") SHORT_BREAK,
    @SerialName("longBreak") LONG_BREAK;

    val label: String
        get() = when (this) {
            FOCUS -> "专注"
            SHORT_BREAK -> "短休息"
            LONG_BREAK -> "长休息"
        }
}

@Serializable
enum class TimerStatus {
    @SerialName("running") RUNNING,
    @SerialName("paused") PAUSED
}

@Serializable
data class PomodoroLink(
    val projectId: String? = null,
    val taskId: String? = null,
    val dailyPlanId: String? = null
)

@Serializable
data class ActiveTimer(
    val phase: PomodoroKind = PomodoroKind.FOCUS,
    val status: TimerStatus = TimerStatus.PAUSED,
    val focusCount: Int = 0,
    val durationMs: Long = 25 * 60 * 1000L,
    val remainingMs: Long = 25 * 60 * 1000L,
    val phaseStartedAt: Long? = null,
    val endAt: Long? = null,
    val projectId: String? = null,
    val taskId: String? = null,
    val dailyPlanId: String? = null
)

@Serializable
data class PomodoroSession(
    val id: String,
    val projectId: String? = null,
    val taskId: String? = null,
    val dailyPlanId: String? = null,
    val projectNameSnapshot: String? = null,
    val taskNameSnapshot: String? = null,
    val dailyPlanNameSnapshot: String? = null,
    val kind: PomodoroKind = PomodoroKind.FOCUS,
    val startedAt: Long,
    val endedAt: Long,
    val minutes: Int
)

@Serializable
data class Settings(
    val theme: String = "system", // "light" | "dark" | "system"
    val focusMinutes: Int = 25,
    val shortBreakMinutes: Int = 5,
    val longBreakMinutes: Int = 15,
    val longBreakInterval: Int = 4
)

@Serializable
data class VaultSettings(
    val enabled: Boolean = false,
    val rootPath: String? = null,
    val vaultName: String? = null,
    val notesFolder: String = "Notes",
    val autoReload: Boolean = true,
    val openWithObsidian: Boolean = false
)

@Serializable
data class WebDavSettings(
    val enabled: Boolean = false,
    val serverUrl: String = "",
    val username: String = "",
    val password: String = "",
    val remoteDir: String = "TaskOrbit",
    val autoSync: Boolean = false,
    val syncIntervalMinutes: Int = 30
)

@Serializable
enum class EntityType {
    @SerialName("project") PROJECT,
    @SerialName("task") TASK,
    @SerialName("dailyPlan") DAILY_PLAN,
    @SerialName("inboxItem") INBOX_ITEM
}

@Serializable
data class Tombstone(
    val id: String,
    val type: EntityType,
    val deletedAt: Long
)

@Serializable
data class AppState(
    val version: Int = 7,
    val projects: List<Project> = emptyList(),
    val tasks: List<Task> = emptyList(),
    val dailyPlans: List<DailyPlan> = emptyList(),
    val inboxItems: List<InboxItem> = emptyList(),
    val pomodoroSessions: List<PomodoroSession> = emptyList(),
    val settings: Settings = Settings(),
    val vaultSettings: VaultSettings = VaultSettings(),
    val activeTimer: ActiveTimer? = null,
    val webDavSettings: WebDavSettings = WebDavSettings()
)
