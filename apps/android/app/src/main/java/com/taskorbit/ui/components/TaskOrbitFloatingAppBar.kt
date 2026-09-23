package com.taskorbit.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FloatingAppBarDefaults
import androidx.compose.material3.HorizontalFloatingAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.taskorbit.ui.theme.ShapeTokens

/**
 * Task Orbit Expressive 浮动工具栏（Floating App Bar）
 * 基于 Material 3 Expressive 的 [HorizontalFloatingAppBar] 封装，
 * 呈现悬浮胶囊岛屿视觉，支持随滚动或状态动态展开与收缩。
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
    contentPadding: PaddingValues = PaddingValues(horizontal = if (expanded) 12.dp else 16.dp, vertical = 6.dp),
    leadingContent: (@Composable RowScope.() -> Unit)? = null,
    trailingContent: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable RowScope.() -> Unit
) {
    Surface(
        modifier = modifier.shadow(elevation = elevation, shape = shape),
        shape = shape,
        color = containerColor,
        border = border,
        tonalElevation = 4.dp
    ) {
        HorizontalFloatingAppBar(
            expanded = expanded,
            containerColor = Color.Transparent,
            shape = shape,
            contentPadding = contentPadding,
            leadingContent = leadingContent,
            trailingContent = trailingContent,
            content = content
        )
    }
}
