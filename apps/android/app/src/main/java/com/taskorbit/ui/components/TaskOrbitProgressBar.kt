package com.taskorbit.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.taskorbit.ui.theme.MotionTokens
import com.taskorbit.ui.theme.ShapeTokens

@Composable
fun TaskOrbitProgressBar(
    progress: Int, // 0 - 100
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary,
    trackColor: Color = MaterialTheme.colorScheme.surfaceContainerHighest,
    height: Dp = 6.dp
) {
    val animatedProgress by animateFloatAsState(
        targetValue = (progress.coerceIn(0, 100)) / 100f,
        animationSpec = tween(
            durationMillis = MotionTokens.DurationMedium2,
            easing = MotionTokens.StandardEasing
        ),
        label = "progressBar"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .clip(ShapeTokens.Full)
            .background(trackColor)
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(animatedProgress)
                .clip(ShapeTokens.Full)
                .background(color)
        )
    }
}
