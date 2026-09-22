package com.taskorbit.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material.icons.outlined.Timer
import com.taskorbit.ui.components.NavigationItem

sealed class Destination(val route: String) {
    data object Inbox : Destination("inbox")
    data object Projects : Destination("projects")
    data object Calendar : Destination("calendar")
    data object Pomodoro : Destination("pomodoro")
    data object Stats : Destination("stats")

    data object ProjectDetail : Destination("project/{id}") {
        fun createRoute(id: String) = "project/$id"
    }
}

val TOP_LEVEL_DESTINATIONS = listOf(
    NavigationItem(
        route = Destination.Inbox.route,
        title = "收件箱",
        filledIcon = Icons.Filled.Inbox,
        outlineIcon = Icons.Outlined.Inbox
    ),
    NavigationItem(
        route = Destination.Projects.route,
        title = "项目",
        filledIcon = Icons.Filled.Folder,
        outlineIcon = Icons.Outlined.Folder
    ),
    NavigationItem(
        route = Destination.Calendar.route,
        title = "日历",
        filledIcon = Icons.Filled.CalendarMonth,
        outlineIcon = Icons.Outlined.CalendarMonth
    ),
    NavigationItem(
        route = Destination.Pomodoro.route,
        title = "番茄钟",
        filledIcon = Icons.Filled.Timer,
        outlineIcon = Icons.Outlined.Timer
    ),
    NavigationItem(
        route = Destination.Stats.route,
        title = "统计",
        filledIcon = Icons.Filled.BarChart,
        outlineIcon = Icons.Outlined.BarChart
    )
)
