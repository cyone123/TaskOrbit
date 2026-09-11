import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { renderMarkdownLine, renderTable } from "../utils/markdown";

/**
 * Inline widget that renders a single unfocused line as formatted Markdown.
 * Uses <span> with inline display to preserve uniform line-height with wrapped lines,
 * and ensure CodeMirror's height oracle measures lines accurately.
 */
class MarkdownPreviewWidget extends WidgetType {
  constructor(
    public readonly content: string,
    public readonly lineFrom: number,
    public readonly lineTo: number,
  ) {
    super();
  }

  override toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "cm-markdown-preview";
    wrapper.innerHTML = renderMarkdownLine(this.content);

    const lineFrom = this.lineFrom;
    const lineTo = this.lineTo;
    const content = this.content;

    wrapper.addEventListener("mousedown", (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      // 1. Task checkbox click: toggle [ ] <-> [x] without moving cursor
      const taskBox = target?.closest('[data-task-box="true"]');
      if (taskBox) {
        event.preventDefault();
        event.stopPropagation();
        const isChecked = /\[[xX]\]/.test(content);
        const nextContent = isChecked
          ? content.replace(/\[[xX]\]/, "[ ]")
          : content.replace(/\[ \]/, "[x]");

        view.dispatch({
          changes: { from: lineFrom, to: lineTo, insert: nextContent },
        });
        return;
      }

      // 2. Link click: open safely
      const link = target?.closest("a");
      if (link && link.href) {
        event.preventDefault();
        event.stopPropagation();
        window.open(link.href, "_blank", "noopener,noreferrer");
        return;
      }

      // 3. Normal text click: estimate character position and focus line
      event.preventDefault();
      event.stopPropagation();

      const rect = wrapper.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      let charOffset = 0;

      if (rect.width > 0 && content.length > 0) {
        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
        charOffset = Math.round(ratio * content.length);
      }

      const targetPos = Math.max(lineFrom, Math.min(lineTo, lineFrom + charOffset));

      view.dispatch({
        selection: { anchor: targetPos },
        scrollIntoView: true,
      });
      view.focus();
    });

    return wrapper;
  }

  override eq(other: MarkdownPreviewWidget): boolean {
    return (
      other.content === this.content &&
      other.lineFrom === this.lineFrom &&
      other.lineTo === this.lineTo
    );
  }

  override ignoreEvent(event: Event): boolean {
    return event.type !== "mousedown";
  }
}

/**
 * Widget that renders a Markdown table as an interactive MD3 HTML table.
 * If user clicks on the table, it locates the target row and places the cursor there,
 * smoothly revealing the raw table markdown for inline editing.
 */
class TableWidget extends WidgetType {
  constructor(
    public readonly rows: string[],
    public readonly tableStartLine: number,
    public readonly tableEndLine: number,
    public readonly tableFrom: number,
    public readonly tableTo: number,
  ) {
    super();
  }

  override toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-table-preview";
    wrapper.innerHTML = renderTable(this.rows);

    wrapper.addEventListener("mousedown", (event: MouseEvent) => {
      // 1. Link click: open safely without moving cursor
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (link && link.href) {
        event.preventDefault();
        event.stopPropagation();
        window.open(link.href, "_blank", "noopener,noreferrer");
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // 2. Identify clicked row to place cursor directly on that line
      const tr = (event.target as HTMLElement | null)?.closest("tr");
      let targetPos = this.tableFrom;

      if (tr) {
        const rowIndex = tr.rowIndex; // 0 for thead tr, 1..N for tbody tr
        // In Markdown, line 0 is header, line 1 is delimiter |---|---|, lines 2..N are data rows
        const targetLineNum =
          rowIndex === 0
            ? this.tableStartLine
            : this.tableStartLine + 1 + rowIndex;

        const clampedLineNum = Math.min(
          Math.max(this.tableStartLine, targetLineNum),
          this.tableEndLine,
        );
        const line = view.state.doc.line(clampedLineNum);
        targetPos = line.from;
      }

      view.dispatch({
        selection: { anchor: targetPos },
        scrollIntoView: true,
      });
      view.focus();
    });

    return wrapper;
  }

  override eq(other: TableWidget): boolean {
    if (
      this.tableStartLine !== other.tableStartLine ||
      this.tableEndLine !== other.tableEndLine ||
      this.tableFrom !== other.tableFrom ||
      this.tableTo !== other.tableTo ||
      this.rows.length !== other.rows.length
    ) {
      return false;
    }
    for (let i = 0; i < this.rows.length; i++) {
      if (this.rows[i] !== other.rows[i]) return false;
    }
    return true;
  }

  override ignoreEvent(event: Event): boolean {
    return event.type !== "mousedown";
  }
}

export interface TableBlock {
  start: number;
  end: number;
  rows: string[];
}

function isTableDelimiterRow(line: string): boolean {
  const trimmed = line.trim();
  return /^\|[-:\s|]+\|$/.test(trimmed) && trimmed.includes("-");
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length >= 2;
}

/**
 * Scan all Markdown tables across the document.
 */
export function scanTables(
  doc: EditorView["state"]["doc"],
  codeBlockLines: Set<number>,
): {
  tables: TableBlock[];
  tableLines: Set<number>;
  tableMap: Map<number, TableBlock>;
} {
  const tables: TableBlock[] = [];
  const tableLines = new Set<number>();
  const tableMap = new Map<number, TableBlock>();

  let i = 1;
  while (i <= doc.lines) {
    if (codeBlockLines.has(i)) {
      i++;
      continue;
    }

    const currentText = doc.line(i).text;
    if (isTableRow(currentText) && i < doc.lines) {
      const nextText = doc.line(i + 1).text;
      if (!codeBlockLines.has(i + 1) && isTableDelimiterRow(nextText)) {
        const start = i;
        const rows: string[] = [currentText, nextText];
        let j = i + 2;
        while (j <= doc.lines && !codeBlockLines.has(j) && isTableRow(doc.line(j).text)) {
          rows.push(doc.line(j).text);
          j++;
        }
        const end = j - 1;
        const block: TableBlock = { start, end, rows };
        tables.push(block);
        for (let l = start; l <= end; l++) {
          tableLines.add(l);
          tableMap.set(l, block);
        }
        i = j;
        continue;
      }
    }
    i++;
  }

  return { tables, tableLines, tableMap };
}

interface CodeBlock {
  start: number;
  end: number;
}

/**
 * Scan all fenced code blocks across the document.
 */
function scanCodeBlocks(doc: EditorView["state"]["doc"]): {
  codeBlocks: CodeBlock[];
  codeBlockLines: Set<number>;
} {
  const codeBlocks: CodeBlock[] = [];
  const codeBlockLines = new Set<number>();
  let blockStart: number | null = null;

  for (let i = 1; i <= doc.lines; i++) {
    const lineText = doc.line(i).text.trimStart();
    if (lineText.startsWith("```")) {
      if (blockStart !== null) {
        // Closing fence
        codeBlocks.push({ start: blockStart, end: i });
        for (let l = blockStart; l <= i; l++) {
          codeBlockLines.add(l);
        }
        blockStart = null;
      } else {
        // Opening fence
        blockStart = i;
      }
    } else if (blockStart !== null) {
      codeBlockLines.add(i);
    }
  }

  return { codeBlocks, codeBlockLines };
}

/**
 * Build decorations set for the current visible ranges in the viewport.
 * Avoids any block: true decorations so CodeMirror never crashes or halts rendering.
 */
function buildLivePreviewDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const doc = state.doc;
  const builder = new RangeSetBuilder<Decoration>();

  // Determine lines covered by the cursor or selection (only when editor is focused)
  const focusedLines = new Set<number>();
  if (view.hasFocus) {
    for (const range of state.selection.ranges) {
      const startLine = doc.lineAt(range.from).number;
      const endLine = doc.lineAt(range.to).number;
      for (let l = startLine; l <= endLine; l++) {
        focusedLines.add(l);
      }
    }
  }

  // Pre-scan code blocks and tables
  const { codeBlocks, codeBlockLines } = scanCodeBlocks(doc);
  const { tables, tableLines, tableMap } = scanTables(doc, codeBlockLines);

  let lastProcessedLine = 0;

  // Process visible ranges in ascending order
  for (const { from, to } of view.visibleRanges) {
    let startLineNum = doc.lineAt(from).number;
    let endLineNum = doc.lineAt(to).number;

    // Expand visible range to completely encompass any intersecting table block
    for (const table of tables) {
      if (table.start <= endLineNum && table.end >= startLineNum) {
        startLineNum = Math.min(startLineNum, table.start);
        endLineNum = Math.max(endLineNum, table.end);
      }
    }

    for (let i = startLineNum; i <= endLineNum; i++) {
      if (i <= lastProcessedLine) continue;
      lastProcessedLine = i;

      const line = doc.line(i);

      // Handle code block lines
      if (codeBlockLines.has(i)) {
        const block = codeBlocks.find((b) => i >= b.start && i <= b.end);
        let blockHasFocus = false;
        if (block) {
          for (let l = block.start; l <= block.end; l++) {
            if (focusedLines.has(l)) {
              blockHasFocus = true;
              break;
            }
          }
        }

        const isFence = block && (i === block.start || i === block.end);
        const lineClass = blockHasFocus
          ? "cm-code-block-line cm-code-block-focused"
          : isFence
          ? "cm-code-block-line cm-code-block-fence"
          : "cm-code-block-line";

        builder.add(line.from, line.from, Decoration.line({ class: lineClass }));
        continue;
      }

      // Handle table lines
      if (tableLines.has(i)) {
        const table = tableMap.get(i);
        if (table) {
          let tableHasFocus = false;
          for (let l = table.start; l <= table.end; l++) {
            if (focusedLines.has(l)) {
              tableHasFocus = true;
              break;
            }
          }

          if (tableHasFocus) {
            // Table is in edit mode: show raw markdown for each line
            const isCursorLine = focusedLines.has(i);
            const lineClass = isCursorLine
              ? "cm-table-line cm-table-line-focused cm-active-line-source"
              : "cm-table-line";
            builder.add(line.from, line.from, Decoration.line({ class: lineClass }));
          } else {
            // Table is in preview mode (unfocused)
            if (i === table.start) {
              const startLine = doc.line(table.start);
              const endLine = doc.line(table.end);
              builder.add(
                line.from,
                line.to,
                Decoration.replace({
                  widget: new TableWidget(
                    table.rows,
                    table.start,
                    table.end,
                    startLine.from,
                    endLine.to,
                  ),
                  inclusive: false,
                  block: false,
                }),
              );
            } else {
              builder.add(line.from, line.from, Decoration.line({ class: "cm-hidden-line" }));
              if (line.from < line.to) {
                builder.add(
                  line.from,
                  line.to,
                  Decoration.replace({
                    inclusive: false,
                    block: false,
                  }),
                );
              }
            }
          }
          continue;
        }
      }

      // Handle lines with active cursor / selection
      if (focusedLines.has(i)) {
        builder.add(
          line.from,
          line.from,
          Decoration.line({ class: "cm-active-line-source" }),
        );
        continue;
      }

      // Unfocused normal line: if not empty, replace with inline MarkdownPreviewWidget
      const text = line.text;
      if (text.trim().length > 0) {
        builder.add(
          line.from,
          line.to,
          Decoration.replace({
            widget: new MarkdownPreviewWidget(text, line.from, line.to),
            inclusive: false,
            block: false,
          }),
        );
      }
    }
  }

  return builder.finish();
}

/**
 * CodeMirror 6 Live Preview ViewPlugin
 */
export const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildLivePreviewDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        update.focusChanged
      ) {
        this.decorations = buildLivePreviewDecorations(update.view);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
);
