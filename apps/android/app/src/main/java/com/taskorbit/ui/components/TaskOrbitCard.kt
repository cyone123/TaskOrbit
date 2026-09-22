package com.taskorbit.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.material3.Card
import androidx.compose.material3.CardColors
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CardElevation
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Shape
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
    when (variant) {
        CardVariant.ELEVATED -> {
            if (onClick != null) {
                ElevatedCard(
                    onClick = onClick,
                    modifier = modifier,
                    shape = shape,
                    colors = CardDefaults.elevatedCardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                    ),
                    content = content
                )
            } else {
                ElevatedCard(
                    modifier = modifier,
                    shape = shape,
                    colors = CardDefaults.elevatedCardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                    ),
                    content = content
                )
            }
        }
        CardVariant.FILLED -> {
            if (onClick != null) {
                Card(
                    onClick = onClick,
                    modifier = modifier,
                    shape = shape,
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer
                    ),
                    content = content
                )
            } else {
                Card(
                    modifier = modifier,
                    shape = shape,
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer
                    ),
                    content = content
                )
            }
        }
        CardVariant.OUTLINED -> {
            val border = BorderStroke(
                width = CardDefaults.outlinedCardBorder().width,
                color = MaterialTheme.colorScheme.outlineVariant
            )
            if (onClick != null) {
                OutlinedCard(
                    onClick = onClick,
                    modifier = modifier,
                    shape = shape,
                    border = border,
                    colors = CardDefaults.outlinedCardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    content = content
                )
            } else {
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
