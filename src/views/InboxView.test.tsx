import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StoreProvider } from "../store/store";
import { SnackbarProvider } from "../components/ui";
import { AiChatProvider } from "../store/ai-chat-store";
import { ViewStateProvider } from "../store/view-state";
import { InboxView, getFirstLine } from "./InboxView";

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

describe("InboxView component render", () => {
  it("renders quick capture with multi-line field and project select, and status filters", () => {
    const html = renderToStaticMarkup(
      <StoreProvider>
        <SnackbarProvider>
          <AiChatProvider>
            <ViewStateProvider>
              <InboxView />
            </ViewStateProvider>
          </AiChatProvider>
        </SnackbarProvider>
      </StoreProvider>
    );

    // Hero and layout
    expect(html).toContain("收集箱");
    expect(html).toContain("快速收集");
    expect(html).toContain("关联项目");
    expect(html).toContain("收下待办");

    // Status filter
    expect(html).toContain("按状态筛选");
    expect(html).toContain("全部待办");
    expect(html).toContain("待处理");
    expect(html).toContain("已完成");
  });
});
