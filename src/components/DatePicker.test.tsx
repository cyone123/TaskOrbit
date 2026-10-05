import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DatePicker } from "./DatePicker";

describe("DatePicker", () => {
  it("renders with label and trailing calendar icon", () => {
    const html = renderToStaticMarkup(
      <DatePicker
        label="开始日期"
        value="2026-10-05"
        onChange={() => {}}
      />
    );

    expect(html).toContain('aria-label="开始日期"');
    expect(html).toContain("calendar_today");
    expect(html).toContain("md3-picker-container");
    expect(html).toContain("md3-picker-trailing-btn");
  });

  it("renders with custom label and container class", () => {
    const html = renderToStaticMarkup(
      <DatePicker
        label="结束日期"
        value="2026-10-20"
        onChange={() => {}}
        align="right"
        className="custom-date-picker"
      />
    );

    expect(html).toContain('aria-label="结束日期"');
    expect(html).toContain("custom-date-picker");
  });
});
