package com.taskorbit

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.taskorbit.data.repository.AppStateRepository
import com.taskorbit.ui.screens.MainScreen
import com.taskorbit.ui.theme.TaskOrbitTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val repository = AppStateRepository.getInstance(application)
            val state by repository.state.collectAsState()
            val loadError by repository.loadError.collectAsState()
            val isReady by repository.isReady.collectAsState()
            val themeSetting = state.settings.theme
            val isDark = when (themeSetting) {
                "dark" -> true
                "light" -> false
                else -> isSystemInDarkTheme()
            }

            DisposableEffect(isDark) {
                val statusBarStyle = if (isDark) {
                    SystemBarStyle.dark(Color.TRANSPARENT)
                } else {
                    SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
                }
                val navigationBarStyle = if (isDark) {
                    SystemBarStyle.dark(Color.TRANSPARENT)
                } else {
                    SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
                }
                enableEdgeToEdge(
                    statusBarStyle = statusBarStyle,
                    navigationBarStyle = navigationBarStyle
                )
                onDispose {}
            }

            TaskOrbitTheme(darkTheme = isDark) {
                if (loadError != null) {
                    com.taskorbit.ui.components.TaskOrbitEmptyState(
                        title = "请升级应用后打开",
                        description = loadError.orEmpty(),
                        icon = androidx.compose.material.icons.Icons.Filled.Inbox
                    )
                } else if (isReady) MainScreen()
            }
        }
    }
}
