package com.taskorbit

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.taskorbit.ui.screens.MainScreen
import com.taskorbit.ui.theme.TaskOrbitTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TaskOrbitTheme {
                MainScreen()
            }
        }
    }
}
