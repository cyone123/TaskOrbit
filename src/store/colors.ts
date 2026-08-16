import type { ColorOption } from "../types";

export const PROJECT_COLORS: ColorOption[] = [
  { key: "violet", name: "紫罗兰", hex: "#6750A4" },
  { key: "indigo", name: "靛蓝", hex: "#3949AB" },
  { key: "blue", name: "蓝色", hex: "#1E88E5" },
  { key: "cyan", name: "天蓝", hex: "#00ACC1" },
  { key: "teal", name: "青色", hex: "#00897B" },
  { key: "green", name: "绿色", hex: "#43A047" },
  { key: "lime", name: "青柠", hex: "#7CB342" },
  { key: "amber", name: "琥珀", hex: "#F9A825" },
  { key: "orange", name: "橙色", hex: "#FB8C00" },
  { key: "red", name: "红色", hex: "#E53935" },
  { key: "pink", name: "粉色", hex: "#D81B60" },
  { key: "brown", name: "棕色", hex: "#6D4C41" },
];

export function colorByKey(key: string): string {
  return PROJECT_COLORS.find((c) => c.key === key)?.hex ?? PROJECT_COLORS[0].hex;
}

/** Choose a readable text color (dark or light) for a given hex background. */
export function contrastText(hex: string): string {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return "#ffffff";
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? "#1D1B20" : "#FFFFFF";
}
