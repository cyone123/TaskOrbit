import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TimePicker } from "./TimePicker";

describe("TimePicker", () => {
  it("renders with label and trailing clock icon", () => {
    const html = renderToStaticMarkup(
      <TimePicker
        label="开始时间"
        value="09:30"
        onChange={() => {}}
      />
    );

    expect(html).toContain('aria-label="开始时间"');
    expect(html).toContain("schedule");
    expect(html).toContain("md3-picker-container");
    expect(html).toContain("md3-picker-trailing-btn");
  });

  it("renders with custom label and container class", () => {
    const html = renderToStaticMarkup(
      <TimePicker
        label="结束时间"
        value="10:30"
        onChange={() => {}}
        align="right"
        className="custom-time-picker"
      />
    );

    expect(html).toContain('aria-label="结束时间"');
    expect(html).toContain("custom-time-picker");
  });
});
