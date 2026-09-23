package com.taskorbit.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FloatingAppBarDefaults
import androidx.compose.material3.HorizontalFloatingAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.taskorbit.ui.theme.ShapeTokens

/**
 * Task Orbit Expressive 浮动工具栏（Floating App Bar）
 * 基于 Material 3 Expressive 的 [HorizontalFloatingAppBar] 封装，
 * 呈现悬浮胶囊岛屿视觉，结合 MaterialTheme.motionScheme 弹簧物理规范，
 * 支持随滚动或状态动态丝滑展开与收缩（Pill Morphing）。
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TaskOrbitFloatingAppBar(
    expanded: Boolean,
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surfaceContainerHigh,
    shape: Shape = ShapeTokens.Full,
    elevation: Dp = 6.dp,
    border: BorderStroke? = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
    contentPadding: PaddingValues? = null,
    leadingContent: (@Composable RowScope.() -> Unit)? = null,
    trailingContent: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable RowScope.() -> Unit
) {
    val animatedHorizontalPadding by animateDpAsState(
        targetValue = if (expanded) 12.dp else 14.dp,
        animationSpec = MaterialTheme.motionScheme.defaultSpatialSpec(),
        label = "floatingAppBarPadding"
    )

    Surface(
        modifier = modifier.animateContentSize(
            animationSpec = MaterialTheme.motionScheme.defaultSpatialSpec(),
            alignment = Alignment.Center
        ),
        shape = shape,
        color = containerColor,
        border = border,
        tonalElevation = 4.dp,
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
