package com.taskorbit.ui.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.FastOutLinearInEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.scale
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback

object MotionTokens {
    // Duration in milliseconds
    const val DurationShort1 = 50
    const val DurationShort2 = 100
    const val DurationShort3 = 150
    const val DurationShort4 = 200

    const val DurationMedium1 = 250
    const val DurationMedium2 = 300
    const val DurationMedium3 = 350
    const val DurationMedium4 = 400

    const val DurationLong1 = 450
    const val DurationLong2 = 500
    const val DurationLong3 = 550
    const val DurationLong4 = 600

    // MD3 Easing Curves
    val StandardEasing: Easing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)
    val StandardDecelerateEasing: Easing = CubicBezierEasing(0.0f, 0.0f, 0.0f, 1.0f)
    val StandardAccelerateEasing: Easing = CubicBezierEasing(0.3f, 0.0f, 1.0f, 1.0f)

    val EmphasizedEasing: Easing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)
    val EmphasizedDecelerateEasing: Easing = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1.0f)
    val EmphasizedAccelerateEasing: Easing = CubicBezierEasing(0.3f, 0.0f, 0.8f, 0.15f)

    // Material 3 Expressive 弹簧物理规范
    val ExpressiveSpatialSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMediumLow
    )

    val ExpressiveTouchSpring = spring<Float>(
        dampingRatio = 0.75f,
        stiffness = 400f
    )
}

/**
 * 物理弹簧按压微交互修饰符：
 * 按下时产生 0.975x 缩放与触觉反馈，释放时由 Expressive 弹簧阻尼自然过冲回弹。
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
fun Modifier.bouncyClickable(
    enabled: Boolean = true,
    pressedScale: Float = 0.975f,
    onClick: () -> Unit
): Modifier = composed {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val haptic = LocalHapticFeedback.current

    val springSpec = MaterialTheme.motionScheme.fastSpatialSpec<Float>()

    val scale by animateFloatAsState(
        targetValue = if (isPressed && enabled) pressedScale else 1f,
        animationSpec = springSpec,
        label = "bouncyScale"
    )

    this
        .then(if (scale != 1f) Modifier.scale(scale) else Modifier)
        .clickable(
            interactionSource = interactionSource,
            indication = ripple(),
            enabled = enabled,
            onClick = {
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            }
        )
}

/**
 * 仅用于产生物理弹簧按压缩放效果（配合已有点击处理）
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
fun Modifier.bouncyPress(
    enabled: Boolean = true,
    pressedScale: Float = 0.975f
): Modifier = composed {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val springSpec = MaterialTheme.motionScheme.fastSpatialSpec<Float>()

    val scale by animateFloatAsState(
        targetValue = if (isPressed && enabled) pressedScale else 1f,
        animationSpec = springSpec,
        label = "bouncyScale"
    )

    this.then(if (scale != 1f) Modifier.scale(scale) else Modifier)
}
