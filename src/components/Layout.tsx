import type { ReactNode } from "react";
import { useStore } from "../store/store";
import type { ViewKey } from "../types";
import { Icon } from "./Icon";

const NAV: { key: ViewKey; label: string; icon: string }[] = [
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
          <button
            key={n.key}
            className={`nav-item ${view === n.key ? "active" : ""}`}
            onClick={() => onNavigate(n.key)}
            title={n.label}
          >
            <Icon name={n.icon} size={24} fill={view === n.key} />
            <span className="nav-item__label">{n.label}</span>
          </button>
        ))}
        <div className="nav-rail__spacer" />
      </nav>

      <div className="main-area">
        <header className="top-bar">
          <span className="top-bar__title">{title}</span>
          <div className="ml-auto" />
          {actions}
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={isDark ? "切换到浅色模式" : "切换到深色模式"}
          >
            <Icon name={isDark ? "light_mode" : "dark_mode"} />
          </button>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
