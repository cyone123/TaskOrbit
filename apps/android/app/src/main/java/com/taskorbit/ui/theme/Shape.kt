package com.taskorbit.ui.theme

import androidx.compose.foundation.shape.CornerBasedShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val TaskOrbitShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

object ShapeTokens {
    val None: CornerBasedShape = RoundedCornerShape(0.dp)
    val ExtraSmall: CornerBasedShape = RoundedCornerShape(4.dp)
    val Small: CornerBasedShape = RoundedCornerShape(8.dp)
    val Medium: CornerBasedShape = RoundedCornerShape(12.dp)
    val Large: CornerBasedShape = RoundedCornerShape(16.dp)
    val ExtraLarge: CornerBasedShape = RoundedCornerShape(28.dp)
    val Full: CornerBasedShape = RoundedCornerShape(9999.dp)
}
