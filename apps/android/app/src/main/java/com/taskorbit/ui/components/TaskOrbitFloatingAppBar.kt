package com.taskorbit.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalFloatingAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Task Orbit Expressive 浮动工具栏（Floating App Bar）
 * 基于 Material 3 Expressive 的 [HorizontalFloatingAppBar] 规范，
 * 呈现悬浮胶囊岛屿视觉，结合 MaterialTheme.motionScheme 弹簧物理规范，
 * 支持随滚动或状态动态丝滑展开与收缩（Pill Morphing）。
 * 遵循 MD3 扁平化高级质感规范，采用表面容器对比色与精密描边，消除硬投影截断。
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TaskOrbitFloatingAppBar(
    expanded: Boolean,
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surfaceContainerHigh,
    shape: Shape = CircleShape,
    elevation: Dp = 0.dp,
    border: BorderStroke? = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
    contentPadding: PaddingValues? = null,
    onClick: (() -> Unit)? = null,
    leadingContent: (@Composable RowScope.() -> Unit)? = null,
    trailingContent: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable RowScope.() -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed && !expanded) 0.96f else 1f,
        animationSpec = MaterialTheme.motionScheme.fastSpatialSpec(),
        label = "floatingBarPressScale"
    )

    val animatedHorizontalPadding by animateDpAsState(
        targetValue = if (expanded) 12.dp else 14.dp,
        animationSpec = MaterialTheme.motionScheme.defaultSpatialSpec(),
        label = "floatingAppBarPadding"
    )

    val surfaceModifier = modifier.animateContentSize(
        animationSpec = MaterialTheme.motionScheme.defaultSpatialSpec(),
        alignment = Alignment.Center
    )

    if (onClick != null) {
        Surface(
            onClick = { if (!expanded) onClick() },
            modifier = surfaceModifier,
            enabled = !expanded,
            shape = shape,
            color = containerColor,
            border = border,
            tonalElevation = 3.dp,
            shadowElevation = elevation,
            interactionSource = interactionSource
        ) {
            Box(
                modifier = if (scale != 1f) Modifier.scale(scale) else Modifier,
                contentAlignment = Alignment.Center
            ) {
                HorizontalFloatingAppBar(
                    expanded = expanded,
                    containerColor = Color.Transparent,
                    shape = shape,
                    contentPadding = contentPadding ?: PaddingValues(horizontal = animatedHorizontalPadding, vertical = 6.dp),
                    leadingContent = leadingContent,
                    trailingContent = trailingContent,
                    content = content
                )
            }
        }
    } else {
        Surface(
            modifier = surfaceModifier,
            shape = shape,
            color = containerColor,
            border = border,
            tonalElevation = 3.dp,
            shadowElevation = elevation
        ) {
            HorizontalFloatingAppBar(
                expanded = expanded,
                containerColor = Color.Transparent,
                shape = shape,
                contentPadding = contentPadding ?: PaddingValues(horizontal = animatedHorizontalPadding, vertical = 6.dp),
                leadingContent = leadingContent,
                trailingContent = trailingContent,
                content = content
            )
        }
    }
}
