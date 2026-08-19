import type { Settings } from "@task-orbit/core";
import { useColorScheme } from "react-native";

import { useAppStore } from "@/store/app-store";

export const LIGHT_COLORS = {
  background: "#FFFBFE",
  surface: "#FFFBFE",
  surfaceVariant: "#E7E0EC",
  surfaceContainer: "#F3EDF7",
  surfaceContainerHigh: "#ECE6F0",
  text: "#1D1B20",
  textMuted: "#49454F",
  border: "#CAC4D0",
  outline: "#79747E",
  primary: "#6750A4",
  onPrimary: "#FFFFFF",
  primarySoft: "#EADDFF",
  onPrimarySoft: "#21005D",
  secondary: "#625B71",
  secondarySoft: "#E8DEF8",
  onSecondarySoft: "#1D192B",
  success: "#386A20",
  successSoft: "#B7F397",
  danger: "#B3261E",
  dangerSoft: "#F9DEDC",
  warning: "#A64500",
  warningSoft: "#FFDBC8",
  tabInactive: "#79747E",
} as const;

export const DARK_COLORS = {
  background: "#141218",
  surface: "#141218",
  surfaceVariant: "#49454F",
  surfaceContainer: "#211F26",
  surfaceContainerHigh: "#2B2930",
  text: "#E6E1E5",
  textMuted: "#CAC4D0",
  border: "#938F99",
  outline: "#938F99",
  primary: "#D0BCFF",
  onPrimary: "#381E72",
  primarySoft: "#4F378B",
  onPrimarySoft: "#EADDFF",
  secondary: "#CCC2DC",
  secondarySoft: "#4A4458",
  onSecondarySoft: "#E8DEF8",
  success: "#9CD67D",
  successSoft: "#235107",
  danger: "#FFB4AB",
  dangerSoft: "#8C1D18",
  warning: "#FFB68A",
  warningSoft: "#7A2E00",
  tabInactive: "#CAC4D0",
} as const;

export type AppColors = { [Key in keyof typeof LIGHT_COLORS]: string };

export interface AppTheme {
  preference: Settings["theme"];
  isDark: boolean;
  colors: AppColors;
}

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
