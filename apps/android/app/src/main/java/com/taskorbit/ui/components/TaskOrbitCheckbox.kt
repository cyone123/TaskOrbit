package com.taskorbit.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialShapes
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.toShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/**
 * Material 3 Expressive 风格的弹性星芒复选框：
 * 勾选瞬间产生轻微挤压（Squash），随后弹出绽放 12 角柔和星芒（SoftBurst），
 * 配合物理弹簧阻尼与触觉反馈，赋予任务完成愉悦的情绪共鸣。
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TaskOrbitCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val haptic = LocalHapticFeedback.current
    val burstShape = MaterialShapes.SoftBurst.toShape()

    // 挤压与弹簧缩放
    val scaleAnim = remember { Animatable(1f) }
    // 星芒光环缩放与透明度
    val burstScale = remember { Animatable(0.4f) }
    val burstAlpha = remember { Animatable(0f) }

    // 监听 checked 变化并触发弹性星芒绽放
    LaunchedEffect(checked) {
        if (checked) {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            // 1. 挤压 -> 弹性过冲回弹
            launch {
                scaleAnim.animateTo(0.82f, tween(80))
                scaleAnim.animateTo(
                    targetValue = 1f,
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioMediumBouncy,
                        stiffness = Spring.StiffnessMediumLow
                    )
                )
            }
            // 2. 星芒光环向外绽放并淡出
            launch {
                burstScale.snapTo(0.5f)
                burstAlpha.snapTo(0.85f)
                burstScale.animateTo(
                    targetValue = 1.45f,
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioLowBouncy,
                        stiffness = Spring.StiffnessLow
                    )
                )
            }
            launch {
                burstAlpha.animateTo(
                    targetValue = 0f,
                    animationSpec = tween(durationMillis = 400)
                )
            }
        }
    }

    Box(
        modifier = modifier.size(44.dp),
        contentAlignment = Alignment.Center
    ) {
        // 绽放层：SoftBurst 柔和星芒多边形
        if (burstAlpha.value > 0.01f) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .scale(burstScale.value)
                    .alpha(burstAlpha.value)
                    .background(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.35f),
                        shape = burstShape
                    )
            )
        }

        // 核心 Checkbox，附加弹性缩放
        Checkbox(
            checked = checked,
            onCheckedChange = { newChecked ->
                onCheckedChange(newChecked)
            },
            modifier = Modifier.scale(scaleAnim.value),
            enabled = enabled,
            colors = CheckboxDefaults.colors(
                checkedColor = MaterialTheme.colorScheme.primary,
                uncheckedColor = MaterialTheme.colorScheme.outline,
                checkmarkColor = MaterialTheme.colorScheme.onPrimary
            )
        )
    }
}
