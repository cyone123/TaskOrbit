/**
 * Utility functions for handling lightweight rich-text HTML used in instant notes.
 */

/**
 * Strips HTML tags and collapses whitespace, returning a clean plain-text string.
 * Useful for snippets, previews, and fallbacks.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/h[1-6]>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a string contains known HTML tags.
 */
export function isHtmlContent(content: string): boolean {
  return /<\/?(p|b|strong|h[1-6]|ul|ol|li|br|div|span|em|i)\b[^>]*>/i.test(content);
}

/**
 * Escapes characters for HTML.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Converts a plain-text string to simple paragraph-based HTML.
 * If already HTML, returns as-is.
 */
export function plainTextToHtml(text: string): string {
  if (!text) return "";
  if (isHtmlContent(text)) return text;

  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const paragraphs = lines
    .filter((line) => line.length > 0)
    .map((line) => `<p>${escapeHtml(line)}</p>`);

  return paragraphs.join("") || "";
}

/**
 * Sanitizes note HTML to ensure only allowed lightweight tags are kept:
 * <p>, <b>, <strong>, <h3>, <h4>, <ul>, <ol>, <li>, <br>
 * Strips dangerous tags, script, inline styles, event handlers, etc.
 */
export function sanitizeNoteHtml(html: string): string {
  if (!html) return "";

  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const allowedTags = new Set([
      "p",
      "b",
      "strong",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "br",
      "#text",
    ]);

    function cleanNode(node: Node): Node | null {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.cloneNode(false);
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        if (!allowedTags.has(tagName)) {
          const fragment = document.createDocumentFragment();
          for (const child of Array.from(el.childNodes)) {
            const cleanedChild = cleanNode(child);
            if (cleanedChild) fragment.appendChild(cleanedChild);
          }
          return fragment;
        }

        const cleanEl = document.createElement(tagName);
        for (const child of Array.from(el.childNodes)) {
          const cleanedChild = cleanNode(child);
          if (cleanedChild) cleanEl.appendChild(cleanedChild);
        }
        return cleanEl;
      }
      return null;
    }

    const container = document.createElement("div");
    for (const child of Array.from(doc.body.childNodes)) {
      const cleaned = cleanNode(child);
      if (cleaned) container.appendChild(cleaned);
    }
    return container.innerHTML;
  }

  // Regex fallback for non-DOM environments
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(?!\/?(p|b|strong|h3|h4|ul|ol|li|br)\b)[^>]+>/gi, "");
}
