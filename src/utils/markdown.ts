export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(value: string): string | null {
  const href = value.trim();
  if (/^(https?:|mailto:|obsidian:)/i.test(href)) return escapeHtml(href);
  return null;
}

export function inlineMarkdown(value: string): string {
  let html = escapeHtml(value);
  // Obsidian wikilinks: [[Target|Label]] or [[Target]]
  html = html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, label?: string) => {
    const displayText = escapeHtml((label ?? target).trim());
    return `<span class="markdown-wiki-link" data-wiki-target="${escapeHtml(target.trim())}">${displayText}</span>`;
  });
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, source: string) => {
    const href = safeHref(source);
    return href ? `<img src="${href}" alt="${alt}" />` : alt;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, source: string) => {
    const href = safeHref(source);
    return href ? `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>` : label;
  });
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");
  return html;
}

/**
 * Render the small, safe Markdown subset used by the note preview. Raw HTML
 * is escaped before the supported Markdown constructs are expanded.
 */
export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let inCode = false;
  let codeLanguage = "";
  let codeLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paragraph: string[] = [];
  let tableLines: string[] = [];

  const closeList = () => {
    if (listType) {
      output.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushParagraph = () => {
    if (paragraph.length > 0) {
      output.push(`<p>${paragraph.map(inlineMarkdown).join("<br />")}</p>`);
      paragraph = [];
    }
  };
  const flushTable = () => {
    if (tableLines.length > 0) {
      output.push(renderTable(tableLines));
      tableLines = [];
    }
  };
  const flushCode = () => {
    output.push(
      `<pre><code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
    );
    codeLines = [];
    codeLanguage = "";
  };

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      flushParagraph();
      closeList();
      flushTable();
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
        codeLanguage = line.trim().slice(3).trim();
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      flushTable();
      continue;
    }

    // Markdown Table row (| ... |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushParagraph();
      closeList();
      tableLines.push(line);
      continue;
    }
    flushTable();

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (/^(---+|\*\*\*+)$/.test(trimmed)) {
      flushParagraph();
      closeList();
      output.push("<hr />");
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      flushParagraph();
      closeList();
      output.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }
    const unordered = /^[-*+]\s+(.*)$/.exec(trimmed);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        output.push(`<${listType}>`);
      }
      const item = (unordered ?? ordered)?.[1] ?? "";
      const task = /^\[([ xX])\]\s+(.*)$/.exec(item);
      if (task) {
        const checked = task[1].toLowerCase() === "x";
        output.push(
          `<li class="markdown-task"><span class="markdown-task__box ${checked ? "is-checked" : ""}">${checked ? "✓" : ""}</span>${inlineMarkdown(task[2])}</li>`,
        );
      } else {
        output.push(`<li>${inlineMarkdown(item)}</li>`);
      }
      continue;
    }
    paragraph.push(line);
  }

  if (inCode) flushCode();
  flushTable();
  flushParagraph();
  closeList();
  return output.join("");
}

/**
 * Render a single Markdown line for the Live Preview widget.
 * Uses purely inline <span> elements so line-height is completely uniform with wrapped text,
 * and CodeMirror's height oracle accurately measures lines.
 */
export function renderMarkdownLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) {
    return "";
  }

  // Heading (# to ######)
  const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
  if (heading) {
    const level = heading[1].length;
    return `<span class="md-header md-h${level}">${inlineMarkdown(heading[2])}</span>`;
  }

  // Horizontal rule (---, ***, ___)
  if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
    return `<span class="md-hr"></span>`;
  }

  // Blockquote (> text)
  const quote = /^>\s?(.*)$/.exec(trimmed);
  if (quote) {
    return `<span class="md-blockquote">${inlineMarkdown(quote[1])}</span>`;
  }

  // Task list item: - [ ] or - [x] or * [ ] or + [ ]
  const task = /^([-*+])\s+\[([ xX])\]\s+(.*)$/.exec(trimmed);
  if (task) {
    const checked = task[2].toLowerCase() === "x";
    return `<span class="md-task ${checked ? "is-checked" : ""}"><span class="md-task-box ${checked ? "is-checked" : ""}" data-task-box="true">${checked ? "✓" : ""}</span><span class="md-task-label">${inlineMarkdown(task[3])}</span></span>`;
  }

  // Unordered list item: - or * or +
  const unordered = /^([-*+])\s+(.*)$/.exec(trimmed);
  if (unordered) {
    return `<span class="md-list-item"><span class="md-list-bullet">•</span> <span class="md-list-content">${inlineMarkdown(unordered[2])}</span></span>`;
  }

  // Ordered list item: 1. or 1)
  const ordered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
  if (ordered) {
    return `<span class="md-list-item"><span class="md-list-number">${ordered[1]}.</span> <span class="md-list-content">${inlineMarkdown(ordered[2])}</span></span>`;
  }

  // Regular line: inline markdown directly
  return `<span class="md-text">${inlineMarkdown(line)}</span>`;
}

/**
 * Render a fenced code block into HTML.
 */
export function renderCodeBlock(code: string, language = ""): string {
  const langClass = language.trim() ? ` class="language-${escapeHtml(language.trim())}"` : "";
  return `<pre class="markdown-pre"><code${langClass}>${escapeHtml(code)}</code></pre>`;
}

/**
 * Render GFM Markdown table rows into a semantic MD3 HTML table.
 * Handles header, cell alignments (:---, :---:, ---:), and inline formatting.
 */
export function renderTable(rows: string[]): string {
  if (rows.length === 0) return "";

  const parseRow = (row: string): string[] | null => {
    const trimmed = row.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
    const inner = trimmed.slice(1, -1);
    const cells: string[] = [];
    let current = "";
    let escaped = false;
    for (let i = 0; i < inner.length; i++) {
      const char = inner[i];
      if (char === "\\" && !escaped) {
        escaped = true;
        current += char;
      } else if (char === "|" && !escaped) {
        cells.push(current.trim());
        current = "";
      } else {
        escaped = false;
        current += char;
      }
    }
    cells.push(current.trim());
    return cells.map((cell) => cell.replace(/\\\|/g, "|"));
  };

  const isSeparator = (row: string): boolean => {
    const trimmed = row.trim();
    return /^\|[-:\s|]+\|$/.test(trimmed) && trimmed.includes("-");
  };

  let headerRow: string[] | null = null;
  let alignments: Array<"left" | "center" | "right" | null> = [];
  const bodyRows: string[][] = [];
  let separatorFound = false;

  for (const row of rows) {
    if (isSeparator(row)) {
      separatorFound = true;
      const cells = parseRow(row);
      if (cells) {
        alignments = cells.map((cell) => {
          const left = cell.startsWith(":");
          const right = cell.endsWith(":");
          if (left && right) return "center";
          if (right) return "right";
          if (left) return "left";
          return null;
        });
      }
      continue;
    }

    const cells = parseRow(row);
    if (!cells) continue;

    if (!separatorFound && !headerRow) {
      headerRow = cells;
    } else {
      bodyRows.push(cells);
    }
  }

  if (!headerRow) return "";

  let html = '<div class="md-table-wrapper"><table class="md-table">';

  // Thead
  html += "<thead><tr>";
  for (let i = 0; i < headerRow.length; i++) {
    const align = alignments[i] ? ` style="text-align: ${alignments[i]}"` : "";
    html += `<th${align}>${inlineMarkdown(headerRow[i])}</th>`;
  }
  html += "</tr></thead>";

  // Tbody
  if (bodyRows.length > 0) {
    html += "<tbody>";
    for (const row of bodyRows) {
      html += "<tr>";
      for (let i = 0; i < headerRow.length; i++) {
        const cell = row[i] ?? "";
        const align = alignments[i] ? ` style="text-align: ${alignments[i]}"` : "";
        html += `<td${align}>${inlineMarkdown(cell)}</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody>";
  }

  html += "</table></div>";
  return html;
}


