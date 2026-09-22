package com.taskorbit.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

// MD3 Light Colors
val MdThemeLightPrimary = Color(0xFF525A92)
val MdThemeLightOnPrimary = Color(0xFFFFFFFF)
val MdThemeLightPrimaryContainer = Color(0xFFDEE0FF)
val MdThemeLightOnPrimaryContainer = Color(0xFF3A4379)

val MdThemeLightSecondary = Color(0xFF5B5D72)
val MdThemeLightOnSecondary = Color(0xFFFFFFFF)
val MdThemeLightSecondaryContainer = Color(0xFFE0E1F9)
val MdThemeLightOnSecondaryContainer = Color(0xFF434559)

val MdThemeLightTertiary = Color(0xFF77536D)
val MdThemeLightOnTertiary = Color(0xFFFFFFFF)
val MdThemeLightTertiaryContainer = Color(0xFFFFD7F1)
val MdThemeLightOnTertiaryContainer = Color(0xFF5D3C54)

val MdThemeLightError = Color(0xFFBA1A1A)
val MdThemeLightOnError = Color(0xFFFFFFFF)
val MdThemeLightErrorContainer = Color(0xFFFFDAD6)
val MdThemeLightOnErrorContainer = Color(0xFF93000A)

val MdThemeLightBackground = Color(0xFFFBF8FF)
val MdThemeLightOnBackground = Color(0xFF1B1B21)
val MdThemeLightSurface = Color(0xFFFBF8FF)
val MdThemeLightOnSurface = Color(0xFF1B1B21)
val MdThemeLightSurfaceVariant = Color(0xFFE3E1EC)
val MdThemeLightOnSurfaceVariant = Color(0xFF46464F)

// MD3 Surface Containers (Elevation Levels 0 - 5)
val MdThemeLightSurfaceContainerLowest = Color(0xFFFFFFFF)
val MdThemeLightSurfaceContainerLow = Color(0xFFF5F2FA)
val MdThemeLightSurfaceContainer = Color(0xFFEFEDF4)
val MdThemeLightSurfaceContainerHigh = Color(0xFFE9E7EF)
val MdThemeLightSurfaceContainerHighest = Color(0xFFE4E1E9)

val MdThemeLightOutline = Color(0xFF767680)
val MdThemeLightOutlineVariant = Color(0xFFC7C5D0)

val MdThemeLightInverseSurface = Color(0xFF303036)
val MdThemeLightInverseOnSurface = Color(0xFFF2EFF7)
val MdThemeLightInversePrimary = Color(0xFFBBC3FF)

// MD3 Dark Colors
val MdThemeDarkPrimary = Color(0xFFBBC3FF)
val MdThemeDarkOnPrimary = Color(0xFF232C61)
val MdThemeDarkPrimaryContainer = Color(0xFF3A4379)
val MdThemeDarkOnPrimaryContainer = Color(0xFFDEE0FF)

val MdThemeDarkSecondary = Color(0xFFC4C5DD)
val MdThemeDarkOnSecondary = Color(0xFF2D2F42)
val MdThemeDarkSecondaryContainer = Color(0xFF434559)
val MdThemeDarkOnSecondaryContainer = Color(0xFFE0E1F9)

val MdThemeDarkTertiary = Color(0xFFE6BAD7)
val MdThemeDarkOnTertiary = Color(0xFF45263D)
val MdThemeDarkTertiaryContainer = Color(0xFF5D3C54)
val MdThemeDarkOnTertiaryContainer = Color(0xFFFFD7F1)

val MdThemeDarkError = Color(0xFFFFB4AB)
val MdThemeDarkOnError = Color(0xFF690005)
val MdThemeDarkErrorContainer = Color(0xFF93000A)
val MdThemeDarkOnErrorContainer = Color(0xFFFFDAD6)

val MdThemeDarkBackground = Color(0xFF131318)
val MdThemeDarkOnBackground = Color(0xFFE4E1E9)
val MdThemeDarkSurface = Color(0xFF131318)
val MdThemeDarkOnSurface = Color(0xFFE4E1E9)
val MdThemeDarkSurfaceVariant = Color(0xFF46464F)
val MdThemeDarkOnSurfaceVariant = Color(0xFFC7C5D0)

// MD3 Surface Containers Dark
val MdThemeDarkSurfaceContainerLowest = Color(0xFF0D0E13)
val MdThemeDarkSurfaceContainerLow = Color(0xFF1B1B21)
val MdThemeDarkSurfaceContainer = Color(0xFF1F1F25)
val MdThemeDarkSurfaceContainerHigh = Color(0xFF29292F)
val MdThemeDarkSurfaceContainerHighest = Color(0xFF34343A)

val MdThemeDarkOutline = Color(0xFF90909A)
val MdThemeDarkOutlineVariant = Color(0xFF46464F)

val MdThemeDarkInverseSurface = Color(0xFFE4E1E9)
val MdThemeDarkInverseOnSurface = Color(0xFF303036)
val MdThemeDarkInversePrimary = Color(0xFF525A92)

// Semantic Accents
val SuccessLight = Color(0xFF016D38)
val OnSuccessLight = Color(0xFFFFFFFF)
val SuccessContainerLight = Color(0xFF9BF6B2)
val OnSuccessContainerLight = Color(0xFF00210D)

val SuccessDark = Color(0xFF80D998)
val OnSuccessDark = Color(0xFF00391A)
val SuccessContainerDark = Color(0xFF005228)
val OnSuccessContainerDark = Color(0xFF9BF6B2)

val WarningLight = Color(0xFF8C4F00)
val OnWarningLight = Color(0xFFFFFFFF)
val WarningContainerLight = Color(0xFFFFDCBF)
val OnWarningContainerLight = Color(0xFF2D1600)

val WarningDark = Color(0xFFFFB874)
val OnWarningDark = Color(0xFF4B2800)
val WarningContainerDark = Color(0xFF6B3B00)
val OnWarningContainerDark = Color(0xFFFFDCBF)

val InfoLight = Color(0xFF00639C)
val OnInfoLight = Color(0xFFFFFFFF)
val InfoContainerLight = Color(0xFFCEE5FF)
val OnInfoContainerLight = Color(0xFF001D33)

val InfoDark = Color(0xFF97CBFF)
val OnInfoDark = Color(0xFF003354)
val InfoContainerDark = Color(0xFF004A77)
val OnInfoContainerDark = Color(0xFFCEE5FF)

// Project Color Palette (align with core/domain)
val PROJECT_COLOR_MAP = mapOf(
    "violet" to Color(0xFF6750A4),
    "blue" to Color(0xFF1D6FBE),
    "teal" to Color(0xFF006A60),
    "green" to Color(0xFF2E6C31),
    "yellow" to Color(0xFF725C00),
    "orange" to Color(0xFF8A5100),
    "red" to Color(0xFFBA1A1A),
    "pink" to Color(0xFF8E4A6E),
    "brown" to Color(0xFF6F5B40),
    "gray" to Color(0xFF5A5F62)
)

val TaskOrbitLightColorScheme = lightColorScheme(
    primary = MdThemeLightPrimary,
    onPrimary = MdThemeLightOnPrimary,
    primaryContainer = MdThemeLightPrimaryContainer,
    onPrimaryContainer = MdThemeLightOnPrimaryContainer,
    secondary = MdThemeLightSecondary,
    onSecondary = MdThemeLightOnSecondary,
    secondaryContainer = MdThemeLightSecondaryContainer,
    onSecondaryContainer = MdThemeLightOnSecondaryContainer,
    tertiary = MdThemeLightTertiary,
    onTertiary = MdThemeLightOnTertiary,
    tertiaryContainer = MdThemeLightTertiaryContainer,
    onTertiaryContainer = MdThemeLightOnTertiaryContainer,
    error = MdThemeLightError,
    onError = MdThemeLightOnError,
    errorContainer = MdThemeLightErrorContainer,
    onErrorContainer = MdThemeLightOnErrorContainer,
    background = MdThemeLightBackground,
    onBackground = MdThemeLightOnBackground,
    surface = MdThemeLightSurface,
    onSurface = MdThemeLightOnSurface,
    surfaceVariant = MdThemeLightSurfaceVariant,
    onSurfaceVariant = MdThemeLightOnSurfaceVariant,
    outline = MdThemeLightOutline,
    outlineVariant = MdThemeLightOutlineVariant,
    surfaceContainerLowest = MdThemeLightSurfaceContainerLowest,
    surfaceContainerLow = MdThemeLightSurfaceContainerLow,
    surfaceContainer = MdThemeLightSurfaceContainer,
    surfaceContainerHigh = MdThemeLightSurfaceContainerHigh,
    surfaceContainerHighest = MdThemeLightSurfaceContainerHighest,
    inverseSurface = MdThemeLightInverseSurface,
    inverseOnSurface = MdThemeLightInverseOnSurface,
    inversePrimary = MdThemeLightInversePrimary
)

val TaskOrbitDarkColorScheme = darkColorScheme(
    primary = MdThemeDarkPrimary,
    onPrimary = MdThemeDarkOnPrimary,
    primaryContainer = MdThemeDarkPrimaryContainer,
    onPrimaryContainer = MdThemeDarkOnPrimaryContainer,
    secondary = MdThemeDarkSecondary,
    onSecondary = MdThemeDarkOnSecondary,
    secondaryContainer = MdThemeDarkSecondaryContainer,
    onSecondaryContainer = MdThemeDarkOnSecondaryContainer,
    tertiary = MdThemeDarkTertiary,
    onTertiary = MdThemeDarkOnTertiary,
    tertiaryContainer = MdThemeDarkTertiaryContainer,
    onTertiaryContainer = MdThemeDarkOnTertiaryContainer,
    error = MdThemeDarkError,
    onError = MdThemeDarkOnError,
    errorContainer = MdThemeDarkErrorContainer,
    onErrorContainer = MdThemeDarkOnErrorContainer,
    background = MdThemeDarkBackground,
    onBackground = MdThemeDarkOnBackground,
    surface = MdThemeDarkSurface,
    onSurface = MdThemeDarkOnSurface,
    surfaceVariant = MdThemeDarkSurfaceVariant,
    onSurfaceVariant = MdThemeDarkOnSurfaceVariant,
    outline = MdThemeDarkOutline,
    outlineVariant = MdThemeDarkOutlineVariant,
    surfaceContainerLowest = MdThemeDarkSurfaceContainerLowest,
    surfaceContainerLow = MdThemeDarkSurfaceContainerLow,
    surfaceContainer = MdThemeDarkSurfaceContainer,
    surfaceContainerHigh = MdThemeDarkSurfaceContainerHigh,
    surfaceContainerHighest = MdThemeDarkSurfaceContainerHighest,
    inverseSurface = MdThemeDarkInverseSurface,
    inverseOnSurface = MdThemeDarkInverseOnSurface,
    inversePrimary = MdThemeDarkInversePrimary
)
