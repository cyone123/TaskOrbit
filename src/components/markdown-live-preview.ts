import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { renderMarkdownLine } from "../utils/markdown";

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

  // Pre-scan code blocks
  const { codeBlocks, codeBlockLines } = scanCodeBlocks(doc);

  // Process visible ranges in ascending order
  for (const { from, to } of view.visibleRanges) {
    const startLineNum = doc.lineAt(from).number;
    const endLineNum = doc.lineAt(to).number;

    for (let i = startLineNum; i <= endLineNum; i++) {
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
