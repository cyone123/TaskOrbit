import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DailyPlan, Project, Task } from "@task-orbit/core";
import { Icon } from "./Icon";
import { IconButton } from "./material";
import { colorByKey } from "../store/colors";
import { useStore } from "../store/store";
import {
  isHtmlContent,
  plainTextToHtml,
  sanitizeNoteHtml,
  stripHtml,
} from "../utils/htmlText";

export interface InstantNoteTarget {
  type: "task" | "plan";
  id: string;
}

export interface InstantNotePanelProps {
  target: InstantNoteTarget;
  onClose: () => void;
}

interface ActiveFormats {
  bold: boolean;
  heading: boolean;
  bulletList: boolean;
  numberList: boolean;
}

const DEFAULT_FORMATS: ActiveFormats = {
  bold: false,
  heading: false,
  bulletList: false,
  numberList: false,
};

export function InstantNotePanel({ target, onClose }: InstantNotePanelProps) {
  const store = useStore();
  const { state } = store;

  // Resolve target item and project
  const task: Task | null = useMemo(() => {
    if (target.type === "task") {
      return state.tasks.find((item) => item.id === target.id) ?? null;
    }
    if (target.type === "plan") {
      const plan = state.dailyPlans.find((item) => item.id === target.id);
      return plan?.taskId
        ? state.tasks.find((item) => item.id === plan.taskId) ?? null
        : null;
    }
    return null;
  }, [target, state.tasks, state.dailyPlans]);

  const plan: DailyPlan | null = useMemo(() => {
    if (target.type === "plan") {
      return state.dailyPlans.find((item) => item.id === target.id) ?? null;
    }
    return null;
  }, [target, state.dailyPlans]);

  const project: Project | null = useMemo(() => {
    const projectId = target.type === "task" ? task?.projectId : plan?.projectId;
    if (!projectId) return null;
    return state.projects.find((item) => item.id === projectId) ?? null;
  }, [target.type, task?.projectId, plan?.projectId, state.projects]);

  const targetName = target.type === "task" ? task?.name ?? "" : plan?.name ?? "";
  const initialDescription =
    target.type === "task" ? task?.description ?? "" : plan?.description ?? "";

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(DEFAULT_FORMATS);

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTargetRef = useRef<InstantNoteTarget>(target);
  currentTargetRef.current = target;

  const currentContentRef = useRef<string>(initialDescription);
  const lastTargetKeyRef = useRef<string>("");
  const targetKey = `${target.type}:${target.id}`;

  // Save current editor content to store
  const flushSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (!editorRef.current) return;

    let html = editorRef.current.innerHTML.trim();
    // Normalize empty content
    if (
      !html ||
      html === "<p></p>" ||
      html === "<p><br></p>" ||
      html === "<p><br/></p>" ||
      html === "<div><br></div>" ||
      html === "<br>"
    ) {
      html = "";
    }

    const cleaned = sanitizeNoteHtml(html);
    currentContentRef.current = cleaned;

    const currentTarget = currentTargetRef.current;
    if (currentTarget.type === "task") {
      store.updateTask(currentTarget.id, { description: cleaned });
    } else {
      store.updateDailyPlan(currentTarget.id, { description: cleaned });
    }
    setSaveStatus("saved");
  }, [store]);

  // Load initial content into editor only when target changes or external update occurs while blurred
  useEffect(() => {
    if (lastTargetKeyRef.current !== targetKey) {
      // Target changed: flush previous and load new target content
      if (saveTimeoutRef.current) {
        flushSave();
      }
      lastTargetKeyRef.current = targetKey;
      if (editorRef.current) {
        const formattedHtml = isHtmlContent(initialDescription)
          ? initialDescription
          : plainTextToHtml(initialDescription);
        editorRef.current.innerHTML = formattedHtml;
        currentContentRef.current = formattedHtml;
        setSaveStatus("saved");
      }
    } else if (
      editorRef.current &&
      initialDescription !== currentContentRef.current &&
      document.activeElement !== editorRef.current
    ) {
      // External change while editor is not focused
      const formattedHtml = isHtmlContent(initialDescription)
        ? initialDescription
        : plainTextToHtml(initialDescription);
      editorRef.current.innerHTML = formattedHtml;
      currentContentRef.current = formattedHtml;
    }
  }, [targetKey, initialDescription, flushSave]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        flushSave();
      }
    };
  }, [flushSave]);

  // Check current selection formatting
  const checkSelectionFormats = useCallback(() => {
    if (!editorRef.current) return;
    try {
      const bold = document.queryCommandState("bold");
      const bulletList = document.queryCommandState("insertUnorderedList");
      const numberList = document.queryCommandState("insertOrderedList");

      // Check if current block is H3 or H4
      let heading = false;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.getRangeAt(0).startContainer;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = (node as HTMLElement).tagName.toLowerCase();
            if (tagName === "h3" || tagName === "h4") {
              heading = true;
              break;
            }
          }
          node = node.parentNode;
        }
      }

      setActiveFormats({
        bold,
        heading,
        bulletList,
        numberList,
      });
    } catch {
      // Ignore queryCommand errors if editor is not focused
    }
  }, []);

  // Track selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      if (
        editorRef.current &&
        document.activeElement &&
        editorRef.current.contains(document.activeElement)
      ) {
        checkSelectionFormats();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [checkSelectionFormats]);

  // Handle user input with debounced save
  const handleInput = () => {
    setSaveStatus("saving");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      flushSave();
    }, 1500);
    checkSelectionFormats();
  };

  // Keyboard shortcut handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      flushSave();
      onClose();
      return;
    }
  };

  // Toolbar action helpers (prevent default on mousedown to preserve text selection)
  const applyFormat = (command: string, value: string | undefined = undefined) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const toggleHeading = () => {
    if (activeFormats.heading) {
      applyFormat("formatBlock", "<p>");
    } else {
      applyFormat("formatBlock", "<h3>");
    }
  };

  const toggleNormal = () => {
    applyFormat("formatBlock", "<p>");
  };

  const toggleBold = () => {
    applyFormat("bold");
  };

  const toggleBulletList = () => {
    applyFormat("insertUnorderedList");
  };

  const toggleNumberList = () => {
    applyFormat("insertOrderedList");
  };

  // Paste handler: paste as clean plain text or sanitized HTML
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (text) {
      document.execCommand("insertText", false, text);
      handleInput();
    }
  };

  const projectColor = project ? colorByKey(project.color) : "var(--md-primary)";

  return (
    <section className="project-panel instant-note-panel">
      {/* Header */}
      <div className="instant-note-header">
        <div className="instant-note-header__identity">
          <div className="row gap-6 align-center">
            <span
              className="dot"
              style={{ background: projectColor, width: 8, height: 8 }}
            />
            <span className="chip chip--small instant-note-type-chip">
              {target.type === "task" ? "任务笔记" : "计划笔记"}
            </span>
            <span
              className={`instant-note-save-status ${
                saveStatus === "saving" ? "is-saving" : "is-saved"
              }`}
            >
              {saveStatus === "saving" ? "正在输入..." : "已自动保存"}
            </span>
          </div>
          <div className="title-md instant-note-title" title={targetName}>
            {targetName || "未命名"}
          </div>
        </div>

        <IconButton
          aria-label="关闭笔记并返回日程 (Esc)"
          title="关闭笔记并返回日程 (Esc)"
          onClick={() => {
            flushSave();
            onClose();
          }}
        >
          <Icon name="close" size={20} />
        </IconButton>
      </div>

      {/* Formatting Toolbar */}
      <div className="instant-note-toolbar" role="toolbar" aria-label="笔记格式工具栏">
        <button
          type="button"
          className={`instant-note-tool-btn ${
            !activeFormats.heading && !activeFormats.bulletList && !activeFormats.numberList
              ? "is-active"
              : ""
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            toggleNormal();
          }}
          title="普通文本 (段落)"
          aria-label="普通文本"
        >
          <Icon name="text_fields" size={16} />
          <span>正文</span>
        </button>

        <button
          type="button"
          className={`instant-note-tool-btn ${activeFormats.heading ? "is-active" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            toggleHeading();
          }}
          title="小标题 (H3)"
          aria-label="小标题"
        >
          <Icon name="title" size={17} />
          <span>标题</span>
        </button>

        <div className="instant-note-toolbar__divider" />

        <button
          type="button"
          className={`instant-note-tool-btn instant-note-tool-btn--icon-only ${
            activeFormats.bold ? "is-active" : ""
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            toggleBold();
          }}
          title="粗体 (Ctrl+B)"
          aria-label="粗体"
        >
          <Icon name="format_bold" size={18} />
        </button>

        <button
          type="button"
          className={`instant-note-tool-btn instant-note-tool-btn--icon-only ${
            activeFormats.bulletList ? "is-active" : ""
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            toggleBulletList();
          }}
          title="无序列表"
          aria-label="无序列表"
        >
          <Icon name="format_list_bulleted" size={18} />
        </button>

        <button
          type="button"
          className={`instant-note-tool-btn instant-note-tool-btn--icon-only ${
            activeFormats.numberList ? "is-active" : ""
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            toggleNumberList();
          }}
          title="有序列表"
          aria-label="有序列表"
        >
          <Icon name="format_list_numbered" size={18} />
        </button>
      </div>

      {/* Editor Body */}
      <div className="instant-note-editor-wrapper">
        <div
          ref={editorRef}
          className="instant-note-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={checkSelectionFormats}
          onMouseUp={checkSelectionFormats}
          onPaste={handlePaste}
          onBlur={flushSave}
          data-placeholder="在此记录任务与计划的即时笔记..."
        />
      </div>

      {/* Footer hint */}
      <div className="instant-note-footer">
        <span className="body-xs muted">
          数据保存在描述字段 · 按 Esc 关闭并返回日程
        </span>
      </div>
    </section>
  );
}
