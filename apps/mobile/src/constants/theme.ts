import type { Settings } from "@task-orbit/core";
import { Easing, type TextStyle, useColorScheme, type ViewStyle } from "react-native";

import { useAppStore } from "@/store/app-store";

export const LIGHT_COLORS = {
  // MD3 Primary
  primary: "#525A92",
  onPrimary: "#FFFFFF",
  primaryContainer: "#DEE0FF",
  onPrimaryContainer: "#3A4379",

  // MD3 Secondary
  secondary: "#5B5D72",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E0E1F9",
  onSecondaryContainer: "#434559",

  // MD3 Tertiary
  tertiary: "#77536D",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#FFD7F1",
  onTertiaryContainer: "#5D3C54",

  // MD3 Error
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#93000A",

  // MD3 Surface & Background
  background: "#FBF8FF",
  onBackground: "#1B1B21",
  surface: "#FBF8FF",
  onSurface: "#1B1B21",
  surfaceVariant: "#E3E1EC",
  onSurfaceVariant: "#46464F",

  // MD3 Surface Containers (Elevation Levels 0 - 5)
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F5F2FA",
  surfaceContainer: "#EFEDF4",
  surfaceContainerHigh: "#E9E7EF",
  surfaceContainerHighest: "#E4E1E9",

  // MD3 Outline
  outline: "#767680",
  outlineVariant: "#C7C5D0",

  // MD3 Inverse
  inverseSurface: "#303036",
  inverseOnSurface: "#F2EFF7",
  inversePrimary: "#BBC3FF",

  // Semantic Accents
  success: "#016D38",
  onSuccess: "#FFFFFF",
  successContainer: "#9BF6B2",
  onSuccessContainer: "#00210D",

  warning: "#8C4F00",
  onWarning: "#FFFFFF",
  warningContainer: "#FFDCBF",
  onWarningContainer: "#2D1600",

  info: "#00639C",
  onInfo: "#FFFFFF",
  infoContainer: "#CEE5FF",
  onInfoContainer: "#001D33",

  // Backward compatibility aliases
  text: "#1B1B21",
  textMuted: "#46464F",
  border: "#C7C5D0",
  primarySoft: "#DEE0FF",
  onPrimarySoft: "#3A4379",
  secondarySoft: "#E0E1F9",
  onSecondarySoft: "#434559",
  danger: "#BA1A1A",
  dangerSoft: "#FFDAD6",
  successSoft: "#9BF6B2",
  warningSoft: "#FFDCBF",
  tabInactive: "#767680",
} as const;

export const DARK_COLORS = {
  // MD3 Primary
  primary: "#BBC3FF",
  onPrimary: "#232C61",
  primaryContainer: "#3A4379",
  onPrimaryContainer: "#DEE0FF",

  // MD3 Secondary
  secondary: "#C4C5DD",
  onSecondary: "#2D2F42",
  secondaryContainer: "#434559",
  onSecondaryContainer: "#E0E1F9",

  // MD3 Tertiary
  tertiary: "#E6BAD7",
  onTertiary: "#45263D",
  tertiaryContainer: "#5D3C54",
  onTertiaryContainer: "#FFD7F1",

  // MD3 Error
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",

  // MD3 Surface & Background
  background: "#131318",
  onBackground: "#E4E1E9",
  surface: "#131318",
  onSurface: "#E4E1E9",
  surfaceVariant: "#46464F",
  onSurfaceVariant: "#C7C5D0",

  // MD3 Surface Containers (Elevation Levels 0 - 5)
  surfaceContainerLowest: "#0D0E13",
  surfaceContainerLow: "#1B1B21",
  surfaceContainer: "#1F1F25",
  surfaceContainerHigh: "#29292F",
  surfaceContainerHighest: "#34343A",

  // MD3 Outline
  outline: "#90909A",
  outlineVariant: "#46464F",

  // MD3 Inverse
  inverseSurface: "#E4E1E9",
  inverseOnSurface: "#303036",
  inversePrimary: "#525A92",

  // Semantic Accents
  success: "#80D998",
  onSuccess: "#00391A",
  successContainer: "#005228",
  onSuccessContainer: "#9BF6B2",

  warning: "#FFB874",
  onWarning: "#4B2800",
  warningContainer: "#6B3B00",
  onWarningContainer: "#FFDCBF",

  info: "#97CBFF",
  onInfo: "#003354",
  infoContainer: "#004A77",
  onInfoContainer: "#CEE5FF",

  // Backward compatibility aliases
  text: "#E4E1E9",
  textMuted: "#C7C5D0",
  border: "#46464F",
  primarySoft: "#3A4379",
  onPrimarySoft: "#DEE0FF",
  secondarySoft: "#434559",
  onSecondarySoft: "#E0E1F9",
  danger: "#FFB4AB",
  dangerSoft: "#93000A",
  successSoft: "#005228",
  warningSoft: "#6B3B00",
  tabInactive: "#90909A",
} as const;

export type AppColors = { [Key in keyof typeof LIGHT_COLORS]: string };

export interface AppTheme {
  preference: Settings["theme"];
  isDark: boolean;
  colors: AppColors;
}

export const MD3Typography: Record<string, TextStyle> = {
  displaySmall: { fontSize: 36, lineHeight: 44, fontWeight: "400" },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: "500" },
  headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: "500" },
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: "500" },
  titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: "500" },
};

export const MD3Shape = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
} as const;

export const MD3Elevation: Record<
  "level0" | "level1" | "level2" | "level3" | "level4" | "level5",
  ViewStyle
> = {
  level0: {
    shadowOpacity: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  level2: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  level3: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  level4: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  level5: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 12,
  },
};

export const MD3Duration = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  medium3: 350,
  medium4: 400,
  long1: 450,
  long2: 500,
} as const;

export const MD3Easing = {
  standard: Easing.bezier(0.2, 0.0, 0, 1.0),
  standardDecelerate: Easing.bezier(0, 0, 0.2, 1),
  standardAccelerate: Easing.bezier(0.4, 0, 1, 1),
  emphasized: Easing.bezier(0.2, 0.0, 0.0, 1.0),
  emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1.0),
  emphasizedAccelerate: Easing.bezier(0.3, 0.0, 0.8, 0.15),
};

export const MD3Spring = {
  press: { tension: 300, friction: 20, useNativeDriver: true },
  pop: { tension: 240, friction: 14, useNativeDriver: true },
  pill: { tension: 220, friction: 22, useNativeDriver: true },
  sheet: { tension: 180, friction: 24, useNativeDriver: true },
} as const;

export function useAppTheme(): AppTheme {
  const systemScheme = useColorScheme();
  const { state } = useAppStore();
  const preference = state.settings.theme;
  const isDark = preference === "dark" || (preference === "system" && systemScheme === "dark");
  return { preference, isDark, colors: isDark ? DARK_COLORS : LIGHT_COLORS };
}

export function useAppColors(): AppColors {
  return useAppTheme().colors;
}
