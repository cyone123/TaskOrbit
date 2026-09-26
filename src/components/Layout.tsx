import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ViewKey } from "@task-orbit/core";
import { useWindowSizeClass } from "../hooks/useWindowSizeClass";
import { useStore } from "../store/store";
import { useAiChat } from "../store/ai-chat-store";
import { AiChatDrawer } from "./ai/AiChatDrawer";
import { DataManagementDialog } from "./DataManagementDialog";
import { Icon } from "./Icon";
import { IconButton, Ripple } from "./material";

const NAV: { key: ViewKey; label: string; icon: string }[] = [
  { key: "inbox", label: "收集箱", icon: "inbox" },
  { key: "projects", label: "项目", icon: "space_dashboard" },
  { key: "calendar", label: "日历", icon: "calendar_month" },
  { key: "pomodoro", label: "专注", icon: "timer" },
  { key: "stats", label: "统计", icon: "monitoring" },
];

interface LayoutProps {
  view: ViewKey;
  title: string;
  onNavigate: (view: ViewKey) => void;
  actions?: ReactNode;
  children: ReactNode;
}

export function Layout({ view, title, onNavigate, actions, children }: LayoutProps) {
  const { state, updateSettings } = useStore();
  const { isOpen: aiDrawerOpen, toggleDrawer: toggleAiDrawer } = useAiChat();
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const windowClass = useWindowSizeClass();
  const theme = state.settings.theme;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    updateSettings({ theme: isDark ? "light" : "dark" });
  };
  const isProjectWorkspace = view === "projects";

  // Global shortcut (Ctrl+J or Cmd+J) to toggle AI Assistant
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleAiDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAiDrawer]);

  // The content region owns scrolling for every view. Listening in the capture
  // phase also catches inner scrollers (e.g. the project detail pane).
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScrollCapture = (event: Event) => {
      const target = event.target as HTMLElement | null;
      setScrolled(!!target && target.scrollTop > 4);
    };
    el.addEventListener("scroll", onScrollCapture, true);
    return () => el.removeEventListener("scroll", onScrollCapture, true);
  }, []);

  useEffect(() => {
    setScrolled(false);
  }, [view]);

  return (
    <div className="app-shell" data-window={windowClass}>
      <nav className="nav-rail" aria-label="主导航">
        <div className="nav-rail__brand">T</div>
        <div className="nav-rail__items">
          {NAV.map((n) => {
            const active = view === n.key;
            return (
              <button
                key={n.key}
                type="button"
                className={`nav-item ${active ? "is-active" : ""}`}
                aria-label={n.label}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(n.key)}
              >
                <span className="nav-item__indicator">
                  <Icon name={n.icon} size={24} fill={active} />
                </span>
                <span className="nav-item__label">{n.label}</span>
                <Ripple />
              </button>
            );
          })}
        </div>
        <div className="nav-rail__spacer" />
        <div className="nav-rail__utilities">
          <IconButton
            onClick={toggleAiDrawer}
            aria-label={aiDrawerOpen ? "收起 AI 助理 (Ctrl+J)" : "打开 AI 助理 (Ctrl+J)"}
            title={aiDrawerOpen ? "收起 AI 助理 (Ctrl+J)" : "打开 AI 助理 (Ctrl+J)"}
          >
            <Icon
              name="smart_toy"
              size={22}
              fill={aiDrawerOpen}
              style={{ color: aiDrawerOpen ? "var(--md-primary)" : undefined }}
            />
          </IconButton>
          <IconButton
            onClick={() => setDataDialogOpen(true)}
            aria-label="数据管理"
            title="数据管理"
          >
            <Icon name="import_export" size={22} />
          </IconButton>
          <IconButton
            onClick={toggleTheme}
            aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
            title={isDark ? "切换到浅色模式" : "切换到深色模式"}
          >
            <Icon name={isDark ? "light_mode" : "dark_mode"} size={22} />
          </IconButton>
        </div>
      </nav>

      <div className="main-area">
        {!isProjectWorkspace && (
          <header className={`top-bar ${scrolled ? "top-bar--scrolled" : ""}`}>
            <h1 className="top-bar__title">{title}</h1>
            <div className="ml-auto" />
            <div className="row items-center gap-4">
              {actions}
              <IconButton
                onClick={toggleAiDrawer}
                aria-label={aiDrawerOpen ? "收起 AI 助理" : "展开 AI 助理"}
                title="AI 助理 (Ctrl+J)"
              >
                <Icon
                  name="smart_toy"
                  size={22}
                  fill={aiDrawerOpen}
                  style={{ color: aiDrawerOpen ? "var(--md-primary)" : undefined }}
                />
              </IconButton>
            </div>
          </header>
        )}
        <div
          ref={contentRef}
          className={`content ${isProjectWorkspace ? "content--projects" : ""}`}
        >
          {children}
        </div>
      </div>
      <AiChatDrawer />
      <DataManagementDialog
        open={dataDialogOpen}
        onClose={() => setDataDialogOpen(false)}
      />
    </div>
  );
}
