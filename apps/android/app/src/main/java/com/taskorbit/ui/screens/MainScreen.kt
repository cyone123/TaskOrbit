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
                com.taskorbit.ui.screens.inbox.InboxScreen()
            }
            composable(Destination.Projects.route) {
                com.taskorbit.ui.screens.projects.ProjectsScreen(
                    onProjectClick = { id ->
                        navController.navigate(Destination.ProjectDetail.createRoute(id))
                    }
                )
            }
            composable(
                route = Destination.ProjectDetail.route,
                arguments = listOf(androidx.navigation.navArgument("id") { type = androidx.navigation.NavType.StringType })
            ) { backStackEntry ->
                val projectId = backStackEntry.arguments?.getString("id") ?: ""
                val context = androidx.compose.ui.platform.LocalContext.current
                val viewModel: com.taskorbit.ui.screens.projectdetail.ProjectDetailViewModel = androidx.lifecycle.viewmodel.compose.viewModel(
                    factory = com.taskorbit.ui.screens.projectdetail.ProjectDetailViewModel.Factory(
                        application = context.applicationContext as android.app.Application,
                        projectId = projectId
                    )
                )
                com.taskorbit.ui.screens.projectdetail.ProjectDetailScreen(
                    onBack = { navController.popBackStack() },
                    viewModel = viewModel
                )
            }
            composable(Destination.Calendar.route) {
                com.taskorbit.ui.screens.calendar.CalendarScreen()
            }
            composable(Destination.Pomodoro.route) {
                com.taskorbit.ui.screens.pomodoro.PomodoroScreen()
            }
            composable(Destination.Stats.route) {
                com.taskorbit.ui.screens.stats.StatsScreen()
            }
        }
    }
}
