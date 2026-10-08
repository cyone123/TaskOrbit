import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  isHtmlContent,
  plainTextToHtml,
  sanitizeNoteHtml,
  stripHtml,
} from "./htmlText";

describe("htmlText utilities", () => {
  describe("stripHtml", () => {
    it("returns empty string for empty input", () => {
      expect(stripHtml("")).toBe("");
    });

    it("strips simple HTML tags and collapses spaces", () => {
      const html = "<p>Hello <b>World</b>!</p><p>Second paragraph</p>";
      expect(stripHtml(html)).toBe("Hello World! Second paragraph");
    });

    it("handles list items and headings", () => {
      const html = "<h3>Title</h3><ul><li>Item 1</li><li>Item 2</li></ul>";
      expect(stripHtml(html)).toBe("Title Item 1 Item 2");
    });

    it("unescapes common HTML entities", () => {
      const html = "Task &amp; Plan &lt;1 &gt; 0 &quot;quoted&quot;";
      expect(stripHtml(html)).toBe("Task & Plan <1 > 0 \"quoted\"");
    });
  });

  describe("isHtmlContent", () => {
    it("identifies plain text", () => {
      expect(isHtmlContent("Just some plain text")).toBe(false);
      expect(isHtmlContent("3 < 5 and 7 > 2")).toBe(false);
    });

    it("identifies html tags", () => {
      expect(isHtmlContent("<p>Paragraph</p>")).toBe(true);
      expect(isHtmlContent("Text with <b>bold</b>")).toBe(true);
      expect(isHtmlContent("<h3>Heading</h3>")).toBe(true);
    });
  });

  describe("plainTextToHtml", () => {
    it("converts multi-line plain text to paragraphs", () => {
      const plain = "First line\nSecond line\n\nThird line";
      expect(plainTextToHtml(plain)).toBe(
        "<p>First line</p><p>Second line</p><p>Third line</p>",
      );
    });

    it("escapes special characters in plain text", () => {
      const plain = "Review <Task> & Plan";
      expect(plainTextToHtml(plain)).toBe("<p>Review &lt;Task&gt; &amp; Plan</p>");
    });

    it("leaves already HTML content untouched", () => {
      const html = "<p>Already <b>formatted</b></p>";
      expect(plainTextToHtml(html)).toBe(html);
    });
  });

  describe("sanitizeNoteHtml", () => {
    it("keeps allowed tags", () => {
      const html = "<h3>Title</h3><p>Text with <b>bold</b></p><ul><li>Item</li></ul>";
      expect(sanitizeNoteHtml(html)).toBe(html);
    });

    it("strips disallowed tags like script and style", () => {
      const malicious = '<p>Safe</p><script>alert("xss")</script><style>body { color: red; }</style>';
      const sanitized = sanitizeNoteHtml(malicious);
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("<style>");
      expect(sanitized).toContain("<p>Safe</p>");
    });
  });
});
