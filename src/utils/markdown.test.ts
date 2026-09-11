import { describe, expect, it } from "vitest";
import { inlineMarkdown, renderCodeBlock, renderMarkdown, renderMarkdownLine } from "./markdown";

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

  it("supports Obsidian wikilinks and strikethrough", () => {
    const html = inlineMarkdown("参考 [[项目计划|计划链接]] 与 ~~已废弃内容~~");
    expect(html).toContain("markdown-wiki-link");
    expect(html).toContain("data-wiki-target=\"项目计划\"");
    expect(html).toContain("计划链接");
    expect(html).toContain("<del>已废弃内容</del>");
  });

  it("renders single lines with renderMarkdownLine", () => {
    expect(renderMarkdownLine("## 二级标题")).toContain("<span class=\"md-header md-h2\">二级标题</span>");
    expect(renderMarkdownLine("- [ ] 待办项")).toContain("md-task");
    expect(renderMarkdownLine("- [x] 已完成")).toContain("is-checked");
    expect(renderMarkdownLine("> 引用段落")).toContain("<span class=\"md-blockquote\">引用段落</span>");
    expect(renderMarkdownLine("---")).toContain("<span class=\"md-hr\"></span>");
    expect(renderMarkdownLine("")).toBe("");
  });

  it("renders fenced code blocks with renderCodeBlock", () => {
    const code = renderCodeBlock("const a = 1;\nconsole.log(a);", "typescript");
    expect(code).toContain("language-typescript");
    expect(code).toContain("const a = 1;");
  });
});

