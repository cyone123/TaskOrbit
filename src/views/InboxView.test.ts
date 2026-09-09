import { describe, expect, it } from "vitest";
import { getFirstLine } from "./InboxView";

describe("InboxView getFirstLine", () => {
  it("returns the first line of a multi-line memo", () => {
    const memo = "第一行备忘\n第二行内容\n第三行内容";
    expect(getFirstLine(memo)).toBe("第一行备忘");
  });

  it("handles windows style CRLF newlines", () => {
    const memo = "CRLF 第一行\r\n第二行内容";
    expect(getFirstLine(memo)).toBe("CRLF 第一行");
  });

  it("skips leading blank lines and trims surrounding spaces", () => {
    const memo = "\n\n   有缩进的第一行内容   \n第二行内容";
    expect(getFirstLine(memo)).toBe("有缩进的第一行内容");
  });

  it("returns single line content as is (trimmed)", () => {
    const memo = "仅有一行短内容";
    expect(getFirstLine(memo)).toBe("仅有一行短内容");
  });

  it("handles empty or whitespace-only content gracefully", () => {
    expect(getFirstLine("")).toBe("");
    expect(getFirstLine("   \n   \n")).toBe("");
  });
});
