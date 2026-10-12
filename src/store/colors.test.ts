import { describe, expect, it } from "vitest";
import { PROJECT_COLORS, colorByKey, contrastText, hexToHsv, hsvToHex, normalizeHex } from "./colors";

describe("colors helper", () => {
  it("resolves preset colors by key", () => {
    expect(colorByKey("violet")).toBe("#6750A4");
    expect(colorByKey("blue")).toBe("#1E88E5");
    expect(colorByKey("green")).toBe("#43A047");
  });

  it("resolves custom hex colors directly", () => {
    expect(colorByKey("#E91E63")).toBe("#E91E63");
    expect(colorByKey("#123456")).toBe("#123456");
    expect(colorByKey("rgb(10, 20, 30)")).toBe("rgb(10, 20, 30)");
  });

  it("falls back to default color for null or invalid keys", () => {
    expect(colorByKey(null)).toBe(PROJECT_COLORS[0].hex);
    expect(colorByKey(undefined)).toBe(PROJECT_COLORS[0].hex);
    expect(colorByKey("")).toBe(PROJECT_COLORS[0].hex);
    expect(colorByKey("nonexistent")).toBe(PROJECT_COLORS[0].hex);
  });

  it("normalizes hex codes for color inputs", () => {
    expect(normalizeHex("#fff")).toBe("#ffffff");
    expect(normalizeHex("#FFF")).toBe("#ffffff");
    expect(normalizeHex("#E91E63")).toBe("#e91e63");
    expect(normalizeHex("#123456")).toBe("#123456");
    expect(normalizeHex("violet")).toBe(PROJECT_COLORS[0].hex.toLowerCase());
    expect(normalizeHex(null)).toBe(PROJECT_COLORS[0].hex);
    expect(normalizeHex("invalid")).toBe(PROJECT_COLORS[0].hex);
  });

  it("calculates contrast text color correctly for dark and light backgrounds", () => {
    expect(contrastText("#ffffff")).toBe("#1D1B20");
    expect(contrastText("#FFFF00")).toBe("#1D1B20");
    expect(contrastText("#000000")).toBe("#FFFFFF");
    expect(contrastText("#1E88E5")).toBe("#FFFFFF");
    expect(contrastText("#6750A4")).toBe("#FFFFFF");
    expect(contrastText("#fff")).toBe("#1D1B20");
    expect(contrastText("#000")).toBe("#FFFFFF");
  });

  it("converts HSV to hex and vice versa", () => {
    const hex = "#ff5722";
    const hsv = hexToHsv(hex);
    expect(hsv.h).toBeGreaterThanOrEqual(13);
    expect(hsv.h).toBeLessThanOrEqual(16);
    expect(hsv.s).toBeCloseTo(0.86, 1);
    expect(hsv.v).toBeCloseTo(1, 1);

    const backHex = hsvToHex(hsv.h, hsv.s, hsv.v);
    expect(backHex).toBe(hex);

    // Black and White
    expect(hsvToHex(0, 0, 0)).toBe("#000000");
    expect(hsvToHex(0, 0, 1)).toBe("#ffffff");
  });
});
