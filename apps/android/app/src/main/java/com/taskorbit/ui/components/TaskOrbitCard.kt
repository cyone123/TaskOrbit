package com.taskorbit.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import com.taskorbit.ui.theme.TaskOrbitShapes

enum class CardVariant {
    ELEVATED,
    FILLED,
    OUTLINED
}

@Composable
fun TaskOrbitCard(
    modifier: Modifier = Modifier,
    variant: CardVariant = CardVariant.FILLED,
    shape: Shape = TaskOrbitShapes.medium,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val isDark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val darkSubtleBorder = if (isDark) {
        BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
    } else null

    if (onClick != null) {
        val interactionSource = remember { MutableInteractionSource() }
        val isPressed by interactionSource.collectIsPressedAsState()
        val haptic = LocalHapticFeedback.current

        val scale by animateFloatAsState(
            targetValue = if (isPressed) 0.975f else 1f,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            ),
            label = "cardBouncyScale"
        )

        val cardModifier = modifier.scale(scale)
        val wrappedOnClick = {
            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            onClick()
        }

        when (variant) {
            CardVariant.ELEVATED -> {
                val elevatedModifier = if (darkSubtleBorder != null) cardModifier.border(darkSubtleBorder, shape) else cardModifier
                ElevatedCard(
                    onClick = wrappedOnClick,
                    modifier = elevatedModifier,
                    shape = shape,
                    colors = CardDefaults.elevatedCardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                    ),
                    interactionSource = interactionSource,
                    content = content
                )
            }
            CardVariant.FILLED -> {
                Card(
                    onClick = wrappedOnClick,
                    modifier = cardModifier,
                    shape = shape,
                    border = darkSubtleBorder,
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer
                    ),
                    interactionSource = interactionSource,
                    content = content
                )
            }
            CardVariant.OUTLINED -> {
                val border = BorderStroke(
                    width = CardDefaults.outlinedCardBorder().width,
                    color = MaterialTheme.colorScheme.outlineVariant
                )
                OutlinedCard(
                    onClick = wrappedOnClick,
                    modifier = cardModifier,
                    shape = shape,
                    border = border,
                    colors = CardDefaults.outlinedCardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    interactionSource = interactionSource,
                    content = content
                )
            }
        }
    } else {
        when (variant) {
            CardVariant.ELEVATED -> {
                val elevatedModifier = if (darkSubtleBorder != null) modifier.border(darkSubtleBorder, shape) else modifier
                ElevatedCard(
                    modifier = elevatedModifier,
                    shape = shape,
                    colors = CardDefaults.elevatedCardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                    ),
                    content = content
                )
            }
            CardVariant.FILLED -> {
                Card(
                    modifier = modifier,
                    shape = shape,
                    border = darkSubtleBorder,
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer
                    ),
                    content = content
                )
            }
            CardVariant.OUTLINED -> {
                val border = BorderStroke(
                    width = CardDefaults.outlinedCardBorder().width,
                    color = MaterialTheme.colorScheme.outlineVariant
                )
                OutlinedCard(
                    modifier = modifier,
                    shape = shape,
                    border = border,
                    colors = CardDefaults.outlinedCardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    content = content
                )
            }
        }
    }
}
