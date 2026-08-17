import { useState } from "react";
import { Icon } from "./components/Icon";
import { Layout } from "./components/Layout";
import { SnackbarProvider } from "./components/ui";
import { StoreProvider, useStore } from "./store/store";
import { ThemeManager } from "./theme/theme";
import type { ViewKey } from "./types";
import { CalendarView } from "./views/CalendarView";
import { PomodoroView } from "./views/PomodoroView";
import { ProjectsView } from "./views/ProjectsView";
import { StatsView } from "./views/StatsView";

const TITLES: Record<ViewKey, string> = {
  projects: "项目",
  calendar: "日历",
  pomodoro: "番茄钟",
  stats: "统计",
};

function Shell() {
  const [view, setView] = useState<ViewKey>("projects");

  return (
    <Layout view={view} title={TITLES[view]} onNavigate={setView}>
      {view === "projects" && <ProjectsView />}
      {view === "calendar" && <CalendarView />}
      {view === "pomodoro" && <PomodoroView />}
      {view === "stats" && <StatsView />}
    </Layout>
  );
}

function BootstrapGate() {
  const {
    status,
    loadError,
    loadWarning,
    persistenceError,
    timerRecoveryWarning,
    retryLoad,
    resetAll,
  } = useStore();

  if (status === "loading") {
    return (
      <div className="bootstrap-screen">
        <div className="card bootstrap-card">
          <Icon name="sync" size={40} />
          <div className="title-md mt-16">正在加载本地数据</div>
          <div className="body-md muted mt-8">请稍候，Task Orbit 正在准备工作区。</div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bootstrap-screen">
        <div className="card bootstrap-card">
          <Icon name="error_outline" size={40} style={{ color: "var(--md-error)" }} />
          <div className="title-md mt-16">本地数据无法加载</div>
          <div className="body-md mt-8">{loadError ?? "发生了未知错误。"}</div>
          <div className="body-sm muted mt-8">
            可以重试读取，或清空本地数据后从空工作区开始。清空操作不可恢复，请先确认已有备份。
          </div>
          <div className="row gap-8 mt-16">
            <button className="btn btn--outlined" onClick={retryLoad}>
              <Icon name="refresh" size={18} /> 重试
            </button>
            <button
              className="btn btn--filled-danger"
              onClick={() => {
                void resetAll().catch(() => undefined);
              }}
            >
              清空并重新开始
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {loadWarning && <div className="app-notice app-notice--warning">{loadWarning}</div>}
      {persistenceError && (
        <div className="app-notice app-notice--error">
          本地保存失败：{persistenceError}
        </div>
      )}
      {timerRecoveryWarning && (
        <div className="app-notice app-notice--warning" style={{ top: 60 }}>
          {timerRecoveryWarning}
        </div>
      )}
      <ThemeManager />
      <Shell />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <SnackbarProvider>
        <BootstrapGate />
      </SnackbarProvider>
    </StoreProvider>
  );
}
