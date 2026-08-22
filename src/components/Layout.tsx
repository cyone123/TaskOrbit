import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ViewKey } from "@task-orbit/core";
import { useWindowSizeClass } from "../hooks/useWindowSizeClass";
import { useStore } from "../store/store";
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
            {actions}
          </header>
        )}
        <div
          ref={contentRef}
          className={`content ${isProjectWorkspace ? "content--projects" : ""}`}
        >
          {children}
        </div>
      </div>
      <DataManagementDialog
        open={dataDialogOpen}
        onClose={() => setDataDialogOpen(false)}
      />
    </div>
  );
}
