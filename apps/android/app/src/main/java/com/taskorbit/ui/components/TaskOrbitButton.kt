package com.taskorbit.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonColors
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonColors
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedIconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

enum class ButtonVariant {
    FILLED,
    TONAL,
    OUTLINED,
    TEXT
}

@Composable
fun TaskOrbitButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.FILLED,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = null
) {
    val iconContent: @Composable () -> Unit = {
        if (leadingIcon != null) {
            Icon(
                imageVector = leadingIcon,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
        }
    }

    when (variant) {
        ButtonVariant.FILLED -> {
            Button(
                onClick = onClick,
                modifier = modifier,
                enabled = enabled
            ) {
                if (leadingIcon != null) {
                    iconContent()
                    androidx.compose.foundation.layout.Spacer(Modifier.size(8.dp))
                }
                Text(text)
            }
        }
        ButtonVariant.TONAL -> {
            FilledTonalButton(
                onClick = onClick,
                modifier = modifier,
                enabled = enabled
            ) {
                if (leadingIcon != null) {
                    iconContent()
                    androidx.compose.foundation.layout.Spacer(Modifier.size(8.dp))
                }
                Text(text)
            }
        }
        ButtonVariant.OUTLINED -> {
            OutlinedButton(
                onClick = onClick,
                modifier = modifier,
                enabled = enabled
            ) {
                if (leadingIcon != null) {
                    iconContent()
                    androidx.compose.foundation.layout.Spacer(Modifier.size(8.dp))
                }
                Text(text)
            }
        }
        ButtonVariant.TEXT -> {
            TextButton(
                onClick = onClick,
                modifier = modifier,
                enabled = enabled
            ) {
                if (leadingIcon != null) {
                    iconContent()
                    androidx.compose.foundation.layout.Spacer(Modifier.size(8.dp))
                }
                Text(text)
            }
        }
    }
}

enum class IconButtonVariant {
    STANDARD,
    FILLED,
    TONAL,
    OUTLINED
}

@Composable
fun TaskOrbitIconButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: IconButtonVariant = IconButtonVariant.STANDARD,
    enabled: Boolean = true,
    danger: Boolean = false
) {
    val dangerColors = if (danger) {
        IconButtonDefaults.iconButtonColors(
            contentColor = MaterialTheme.colorScheme.error
        )
    } else {
        IconButtonDefaults.iconButtonColors()
    }

    Box(
        modifier = modifier.minimumInteractiveComponentSize(),
        contentAlignment = Alignment.Center
    ) {
        when (variant) {
            IconButtonVariant.STANDARD -> {
                IconButton(
                    onClick = onClick,
                    enabled = enabled,
                    colors = dangerColors
                ) {
                    Icon(imageVector = icon, contentDescription = contentDescription)
                }
            }
            IconButtonVariant.FILLED -> {
                androidx.compose.material3.FilledIconButton(
                    onClick = onClick,
                    enabled = enabled
                ) {
                    Icon(imageVector = icon, contentDescription = contentDescription)
                }
            }
            IconButtonVariant.TONAL -> {
                FilledTonalIconButton(
                    onClick = onClick,
                    enabled = enabled
                ) {
                    Icon(imageVector = icon, contentDescription = contentDescription)
                }
            }
            IconButtonVariant.OUTLINED -> {
                OutlinedIconButton(
                    onClick = onClick,
                    enabled = enabled
                ) {
                    Icon(imageVector = icon, contentDescription = contentDescription)
                }
            }
        }
    }
}
