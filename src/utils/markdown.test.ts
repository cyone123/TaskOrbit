import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("markdown preview", () => {
  it("renders the supported Markdown blocks", () => {
    const html = renderMarkdown("# 标题\n\n- [x] 完成\n- 下一步\n\n> 记录");

    expect(html).toContain("<h1>标题</h1>");
    expect(html).toContain("markdown-task__box is-checked");
    expect(html).toContain("<blockquote>记录</blockquote>");
  });

  it("escapes raw HTML and blocks unsafe links", () => {
    const html = renderMarkdown("<script>alert(1)</script>\n\n[危险](javascript:alert(1))");

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("href=\"javascript:");
  });
});
