package com.taskorbit.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.taskorbit.navigation.Destination
import com.taskorbit.navigation.TOP_LEVEL_DESTINATIONS
import com.taskorbit.ui.components.TaskOrbitEmptyState
import com.taskorbit.ui.components.TaskOrbitNavigationBar

@Composable
fun MainScreen(
    navController: NavHostController = rememberNavController()
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Destination.Inbox.route

    val isTopLevel = TOP_LEVEL_DESTINATIONS.any { it.route == currentRoute }

    Scaffold(
        bottomBar = {
            if (isTopLevel) {
                TaskOrbitNavigationBar(
                    items = TOP_LEVEL_DESTINATIONS,
                    currentRoute = currentRoute,
                    onItemClick = { item ->
                        navController.navigate(item.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Destination.Inbox.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            composable(Destination.Inbox.route) {
                // Placeholder for Inbox Screen (Slice 1)
                Box(modifier = Modifier.fillMaxSize()) {
                    TaskOrbitEmptyState(
                        icon = Icons.Filled.Inbox,
                        title = "收件箱",
                        description = "将想法与待办事项记录于此（切片 1 即将完成）"
                    )
                }
            }
            composable(Destination.Projects.route) {
                // Placeholder for Projects Screen (Slice 2)
                Box(modifier = Modifier.fillMaxSize()) {
                    TaskOrbitEmptyState(
                        icon = Icons.Outlined.Folder,
                        title = "项目",
                        description = "管理项目、任务与甘特排期（切片 2）"
                    )
                }
            }
            composable(Destination.Calendar.route) {
                // Placeholder for Calendar Screen (Slice 3)
                Box(modifier = Modifier.fillMaxSize()) {
                    TaskOrbitEmptyState(
                        icon = Icons.Outlined.CalendarMonth,
                        title = "日历",
                        description = "日/周/月日程与排期（切片 3）"
                    )
                }
            }
            composable(Destination.Pomodoro.route) {
                // Placeholder for Pomodoro Screen (Slice 4)
                Box(modifier = Modifier.fillMaxSize()) {
                    TaskOrbitEmptyState(
                        icon = Icons.Outlined.Timer,
                        title = "番茄钟",
                        description = "沉浸式专注与前台常驻服务（切片 4）"
                    )
                }
            }
            composable(Destination.Stats.route) {
                // Placeholder for Stats Screen (Slice 5)
                Box(modifier = Modifier.fillMaxSize()) {
                    TaskOrbitEmptyState(
                        icon = Icons.Outlined.BarChart,
                        title = "统计与设置",
                        description = "专注统计、WebDAV 同步与数据备份（切片 5 & 6）"
                    )
                }
            }
        }
    }
}
