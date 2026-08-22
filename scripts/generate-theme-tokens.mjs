/**
 * Generates src/theme/palette.css from Task Orbit brand seeds using
 * @material/material-color-utilities (the engine behind Material Theme Builder).
 *
 * Run: pnpm generate:tokens
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  argbFromHex,
  customColor,
  hexFromArgb,
} from "@material/material-color-utilities";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(__dirname, "../src/theme/palette.css");

/** Task Orbit brand seed — "轨道蓝" indigo, matches the app's 靛蓝 project color. */
export const BRAND_SEED = "#3949AB";

/** Semantic accents kept hue-stable across themes (blend=false). */
const CUSTOM_COLORS = [
  { name: "success", value: "#176B3A", blend: false },
  { name: "warning", value: "#8A4E00", blend: false },
  { name: "info", value: "#00639C", blend: false },
];

const TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];

function schemeCss(scheme) {
  const mdc = MaterialDynamicColors;
  const role = (fn) => hexFromArgb(fn.getArgb(scheme));
  return [
    ["primary", role(mdc.primary)],
    ["on-primary", role(mdc.onPrimary)],
    ["primary-container", role(mdc.primaryContainer)],
    ["on-primary-container", role(mdc.onPrimaryContainer)],
    ["primary-fixed", role(mdc.primaryFixed)],
    ["primary-fixed-dim", role(mdc.primaryFixedDim)],
    ["on-primary-fixed", role(mdc.onPrimaryFixed)],
    ["on-primary-fixed-variant", role(mdc.onPrimaryFixedVariant)],
    ["secondary", role(mdc.secondary)],
    ["on-secondary", role(mdc.onSecondary)],
    ["secondary-container", role(mdc.secondaryContainer)],
    ["on-secondary-container", role(mdc.onSecondaryContainer)],
    ["secondary-fixed", role(mdc.secondaryFixed)],
    ["secondary-fixed-dim", role(mdc.secondaryFixedDim)],
    ["on-secondary-fixed", role(mdc.onSecondaryFixed)],
    ["on-secondary-fixed-variant", role(mdc.onSecondaryFixedVariant)],
    ["tertiary", role(mdc.tertiary)],
    ["on-tertiary", role(mdc.onTertiary)],
    ["tertiary-container", role(mdc.tertiaryContainer)],
    ["on-tertiary-container", role(mdc.onTertiaryContainer)],
    ["tertiary-fixed", role(mdc.tertiaryFixed)],
    ["tertiary-fixed-dim", role(mdc.tertiaryFixedDim)],
    ["on-tertiary-fixed", role(mdc.onTertiaryFixed)],
    ["on-tertiary-fixed-variant", role(mdc.onTertiaryFixedVariant)],
    ["error", role(mdc.error)],
    ["on-error", role(mdc.onError)],
    ["error-container", role(mdc.errorContainer)],
    ["on-error-container", role(mdc.onErrorContainer)],
    ["background", role(mdc.background)],
    ["on-background", role(mdc.onBackground)],
    ["surface", role(mdc.surface)],
    ["surface-dim", role(mdc.surfaceDim)],
    ["surface-bright", role(mdc.surfaceBright)],
    ["surface-container-lowest", role(mdc.surfaceContainerLowest)],
    ["surface-container-low", role(mdc.surfaceContainerLow)],
    ["surface-container", role(mdc.surfaceContainer)],
    ["surface-container-high", role(mdc.surfaceContainerHigh)],
    ["surface-container-highest", role(mdc.surfaceContainerHighest)],
    ["on-surface", role(mdc.onSurface)],
    ["surface-variant", role(mdc.surfaceVariant)],
    ["on-surface-variant", role(mdc.onSurfaceVariant)],
    ["outline", role(mdc.outline)],
    ["outline-variant", role(mdc.outlineVariant)],
    ["inverse-surface", role(mdc.inverseSurface)],
    ["inverse-on-surface", role(mdc.inverseOnSurface)],
    ["inverse-primary", role(mdc.inversePrimary)],
    ["shadow", role(mdc.shadow)],
    ["scrim", role(mdc.scrim)],
    ["surface-tint", role(mdc.surfaceTint)],
  ];
}

function customColorCss(group) {
  return [
    ["color", group.color],
    ["on-color", group.onColor],
    ["color-container", group.colorContainer],
    ["on-color-container", group.onColorContainer],
  ];
}

function toRgbTriplet(hex) {
  const raw = hex.replace("#", "");
  return `${parseInt(raw.slice(0, 2), 16)}, ${parseInt(raw.slice(2, 4), 16)}, ${parseInt(raw.slice(4, 6), 16)}`;
}

function render() {
  const source = argbFromHex(BRAND_SEED);
  const light = new SchemeTonalSpot(Hct.fromInt(source), false, 0);
  const dark = new SchemeTonalSpot(Hct.fromInt(source), true, 0);
  const customs = CUSTOM_COLORS.map((c) => ({
    ...c,
    group: customColor(source, {
      name: c.name,
      value: argbFromHex(c.value),
      blend: c.blend,
    }),
  }));

  const lines = [];
  lines.push("/* ==========================================================================");
  lines.push("   GENERATED FILE — do not edit by hand.");
  lines.push(`   Source: scripts/generate-theme-tokens.mjs (seed ${BRAND_SEED}, tonal-spot).`);
  lines.push("   Regenerate with: pnpm generate:tokens");
  lines.push("   ========================================================================== */");
  lines.push("");
  lines.push(":root {");
  lines.push("  /* Reference tonal palettes */");
  const palettes = {
    primary: light.primaryPalette,
    secondary: light.secondaryPalette,
    tertiary: light.tertiaryPalette,
    error: light.errorPalette,
    neutral: light.neutralPalette,
    "neutral-variant": light.neutralVariantPalette,
  };
  for (const [name, palette] of Object.entries(palettes)) {
    for (const tone of TONES) {
      lines.push(`  --md-ref-palette-${name}-${tone}: ${hexFromArgb(palette.tone(tone))};`);
    }
  }
  lines.push("");
  lines.push("  /* System color roles — light */");
  for (const [roleName, hex] of schemeCss(light)) {
    lines.push(`  --md-sys-color-${roleName}: ${hex};`);
  }
  lines.push("");
  lines.push("  /* Semantic accent roles — light */");
  for (const custom of customs) {
    for (const [slot, value] of customColorCss(custom.group.light)) {
      lines.push(
        `  --md-custom-color-${custom.name}${slot === "color" ? "" : `-${slot}`}: ${hexFromArgb(value)};`,
      );
    }
  }
  lines.push("");
  lines.push("  /* RGB triplets for state layers */");
  lines.push(`  --md-primary-rgb: ${toRgbTriplet(hexFromArgb(MaterialDynamicColors.primary.getArgb(light)))};`);
  lines.push(`  --md-on-surface-rgb: ${toRgbTriplet(hexFromArgb(MaterialDynamicColors.onSurface.getArgb(light)))};`);
  lines.push(`  --md-on-surface-variant-rgb: ${toRgbTriplet(hexFromArgb(MaterialDynamicColors.onSurfaceVariant.getArgb(light)))};`);
  lines.push("}");
  lines.push("");
  lines.push('[data-theme="dark"] {');
  lines.push("  /* System color roles — dark */");
  for (const [roleName, hex] of schemeCss(dark)) {
    lines.push(`  --md-sys-color-${roleName}: ${hex};`);
  }
  lines.push("");
  lines.push("  /* Semantic accent roles — dark */");
  for (const custom of customs) {
    for (const [slot, value] of customColorCss(custom.group.dark)) {
      lines.push(
        `  --md-custom-color-${custom.name}${slot === "color" ? "" : `-${slot}`}: ${hexFromArgb(value)};`,
      );
    }
  }
  lines.push("");
  lines.push("  /* RGB triplets for state layers */");
  lines.push(`  --md-primary-rgb: ${toRgbTriplet(hexFromArgb(MaterialDynamicColors.primary.getArgb(dark)))};`);
  lines.push(`  --md-on-surface-rgb: ${toRgbTriplet(hexFromArgb(MaterialDynamicColors.onSurface.getArgb(dark)))};`);
  lines.push(`  --md-on-surface-variant-rgb: ${toRgbTriplet(hexFromArgb(MaterialDynamicColors.onSurfaceVariant.getArgb(dark)))};`);
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, render(), "utf8");
console.log(`Wrote ${OUT_FILE}`);
