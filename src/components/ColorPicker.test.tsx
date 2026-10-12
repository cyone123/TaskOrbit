import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ColorPicker } from "./ColorPicker";

describe("ColorPicker component", () => {
  it("renders preset color options and custom palette trigger button", () => {
    const html = renderToStaticMarkup(
      <ColorPicker
        value="violet"
        onChange={() => {}}
      />
    );

    // Preset color buttons
    expect(html).toContain('title="紫罗兰"');
    expect(html).toContain('title="蓝色"');
    expect(html).toContain('title="绿色"');

    // Selected preset should have check icon
    expect(html).toContain("check");

    // Palette custom color button
    expect(html).toContain("color-dot--custom");
    expect(html).toContain("自定义颜色（调色盘）");
    expect(html).toContain("palette");
  });

  it("renders custom color as selected with active hex and contrast", () => {
    const html = renderToStaticMarkup(
      <ColorPicker
        value="#FF5722"
        onChange={() => {}}
      />
    );

    // Should indicate custom color is selected
    expect(html).toContain("color-dot--custom selected");
    expect(html).toContain("#FF5722");
    expect(html).toContain('background:#ff5722');
  });

  it("renders custom label when provided", () => {
    const html = renderToStaticMarkup(
      <ColorPicker
        value="blue"
        onChange={() => {}}
        label="选择项目色彩"
      />
    );

    expect(html).toContain("选择项目色彩");
  });
});
