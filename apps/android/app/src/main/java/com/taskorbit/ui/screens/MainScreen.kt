package com.taskorbit.ui.screens

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
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
import com.taskorbit.ui.theme.MotionTokens

@Composable
fun MainScreen(
    navController: NavHostController = rememberNavController()
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Destination.Inbox.route

    val isTopLevel = TOP_LEVEL_DESTINATIONS.any { it.route == currentRoute }

    Box(
        modifier = Modifier.fillMaxSize()
    ) {
        NavHost(
            navController = navController,
            startDestination = Destination.Inbox.route,
            modifier = Modifier.fillMaxSize(),
            enterTransition = {
                fadeIn(animationSpec = tween(MotionTokens.DurationMedium2, easing = MotionTokens.StandardEasing)) +
                    scaleIn(initialScale = 0.96f, animationSpec = tween(MotionTokens.DurationMedium2, easing = MotionTokens.StandardEasing))
            },
            exitTransition = {
                fadeOut(animationSpec = tween(MotionTokens.DurationShort4, easing = MotionTokens.StandardAccelerateEasing))
            },
            popEnterTransition = {
                fadeIn(animationSpec = tween(MotionTokens.DurationMedium2, easing = MotionTokens.StandardEasing)) +
                    scaleIn(initialScale = 0.96f, animationSpec = tween(MotionTokens.DurationMedium2, easing = MotionTokens.StandardEasing))
            },
            popExitTransition = {
                fadeOut(animationSpec = tween(MotionTokens.DurationShort4, easing = MotionTokens.StandardAccelerateEasing))
            }
        ) {
            composable(Destination.Inbox.route) {
                com.taskorbit.ui.screens.inbox.InboxScreen(
                    onNavigateToPomodoro = {
                        navController.navigate(Destination.Pomodoro.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
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
                arguments = listOf(androidx.navigation.navArgument("id") { type = androidx.navigation.NavType.StringType }),
                enterTransition = {
                    slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Start,
                        animationSpec = tween(MotionTokens.DurationMedium2, easing = MotionTokens.EmphasizedDecelerateEasing)
                    ) + fadeIn(animationSpec = tween(MotionTokens.DurationMedium2))
                },
                exitTransition = {
                    slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Start,
                        animationSpec = tween(MotionTokens.DurationMedium2, easing = MotionTokens.EmphasizedAccelerateEasing)
                    ) + fadeOut(animationSpec = tween(MotionTokens.DurationShort4))
                },
                popEnterTransition = {
                    slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.End,
                        animationSpec = tween(MotionTokens.DurationMedium2, easing = MotionTokens.EmphasizedDecelerateEasing)
                    ) + fadeIn(animationSpec = tween(MotionTokens.DurationMedium2))
                },
                popExitTransition = {
                    slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.End,
                        animationSpec = tween(MotionTokens.DurationMedium2, easing = MotionTokens.EmphasizedAccelerateEasing)
                    ) + fadeOut(animationSpec = tween(MotionTokens.DurationShort4))
                }
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
                },
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }
    }
}

