import { useEffect, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
} from "@codemirror/commands";
import {
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
} from "@codemirror/view";
import { markdown, markdownKeymap } from "@codemirror/lang-markdown";
import { livePreviewPlugin } from "./markdown-live-preview";

export interface LiveMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  mode?: "live" | "source";
  placeholder?: string;
  className?: string;
}

const md3EditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    fontFamily: "var(--font)",
    color: "var(--md-on-surface)",
    backgroundColor: "transparent",
  },
  ".cm-content": {
    minHeight: "360px",
    padding: "8px 16px 40px",
    caretColor: "var(--md-primary)",
    lineHeight: "1.75",
  },
  ".cm-line": {
    padding: "0 2px",
    lineHeight: "1.75",
  },
  "&.cm-focused": {
    outline: "none",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--md-primary)",
    borderLeftWidth: "2px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--md-primary) 24%, transparent) !important",
  },
  ".cm-active-line-source": {
    backgroundColor: "color-mix(in srgb, var(--md-surface-container-high) 45%, transparent)",
    borderRadius: "var(--shape-xs, 4px)",
    fontFamily: "var(--font-mono)",
    lineHeight: "1.75",
  },
  ".cm-scroller": {
    fontFamily: "inherit",
    lineHeight: "1.75",
    overflow: "auto",
  },
  ".cm-placeholder": {
    color: "var(--md-on-surface-variant)",
    fontStyle: "italic",
  },
});

export function LiveMarkdownEditor({
  value,
  onChange,
  mode = "live",
  placeholder = "输入 Markdown 笔记内容…",
  className = "",
}: LiveMarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const modeCompartmentRef = useRef<Compartment>(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Initialize CodeMirror instance once
  useEffect(() => {
    if (!containerRef.current) return;

    const modeCompartment = modeCompartmentRef.current;

    const startState = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...markdownKeymap]),
        markdown(),
        EditorView.lineWrapping,
        cmPlaceholder(placeholder),
        md3EditorTheme,
        modeCompartment.of(mode === "live" ? livePreviewPlugin : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external document changes (e.g. selecting another note or external Vault sync)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  // Reconfigure live preview mode dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: modeCompartmentRef.current.reconfigure(
        mode === "live" ? livePreviewPlugin : [],
      ),
    });
  }, [mode]);

  return (
    <div
      ref={containerRef}
      className={`live-markdown-editor-container ${className}`}
      data-editor-mode={mode}
    />
  );
}
