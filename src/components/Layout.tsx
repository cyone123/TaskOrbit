import type { ReactNode } from "react";
import { useState } from "react";
import { useStore } from "../store/store";
import type { ViewKey } from "../types";
import { DataManagementDialog } from "./DataManagementDialog";
import { Icon } from "./Icon";
import { IconButton } from "./material";

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
  const isProjectWorkspace = view === "projects";
  const theme = state.settings.theme;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    updateSettings({ theme: isDark ? "light" : "dark" });
  };

  return (
    <div className="app-shell">
      <nav className="nav-rail">
        <div className="nav-rail__brand">T</div>
        {NAV.map((n) => (
          <div
            key={n.key}
            className={`nav-item ${view === n.key ? "active" : ""}`}
          >
            <IconButton
              className="nav-item__control"
              aria-label={n.label}
              toggle
              selected={view === n.key}
              onClick={() => onNavigate(n.key)}
            >
              <Icon name={n.icon} size={24} fill={view === n.key} />
            </IconButton>
            <span className="nav-item__label">{n.label}</span>
          </div>
        ))}
        <div className="nav-rail__spacer" />
        {isProjectWorkspace && (
          <div className="nav-rail__utilities">
            <IconButton onClick={() => setDataDialogOpen(true)} aria-label="数据管理" title="数据管理">
              <Icon name="import_export" size={21} />
            </IconButton>
            <IconButton
              onClick={toggleTheme}
              aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
              title={isDark ? "切换到浅色模式" : "切换到深色模式"}
            >
              <Icon name={isDark ? "light_mode" : "dark_mode"} size={21} />
            </IconButton>
          </div>
        )}
      </nav>

      <div className="main-area">
        {!isProjectWorkspace && (
          <header className="top-bar">
            <span className="top-bar__title">{title}</span>
            <div className="ml-auto" />
            {actions}
            <IconButton
              onClick={() => setDataDialogOpen(true)}
              aria-label="数据管理"
            >
              <Icon name="import_export" />
            </IconButton>
            <IconButton
              onClick={toggleTheme}
              aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
            >
              <Icon name={isDark ? "light_mode" : "dark_mode"} />
            </IconButton>
          </header>
        )}
        <div className={`content ${isProjectWorkspace ? "content--projects" : ""}`}>{children}</div>
      </div>
      <DataManagementDialog
        open={dataDialogOpen}
        onClose={() => setDataDialogOpen(false)}
      />
    </div>
  );
}
