import { useColorScheme } from "react-native";

export const LIGHT_COLORS = {
  background: "#F8F7FC",
  surface: "#FFFFFF",
  surfaceVariant: "#F0EDF6",
  text: "#1D1B20",
  textMuted: "#625F68",
  border: "#E5E0EA",
  primary: "#6750A4",
  primarySoft: "#EADDFF",
  onPrimarySoft: "#21005D",
  tabInactive: "#79747E",
  success: "#386A20",
  danger: "#B3261E",
  warning: "#A64500",
} as const;

export const DARK_COLORS = {
  background: "#141218",
  surface: "#211F26",
  surfaceVariant: "#2B2930",
  text: "#E6E1E5",
  textMuted: "#CAC4D0",
  border: "#49454F",
  primary: "#D0BCFF",
  primarySoft: "#4F378B",
  onPrimarySoft: "#EADDFF",
  tabInactive: "#CAC4D0",
  success: "#9CD67D",
  danger: "#FFB4AB",
  warning: "#FFB68A",
} as const;

export type AppColors = {
  [Key in keyof typeof LIGHT_COLORS]: string;
};

export function useAppColors(): AppColors {
  return useColorScheme() === "dark" ? DARK_COLORS : LIGHT_COLORS;
}
