import { useState } from "react";
import { Layout } from "./components/Layout";
import { SnackbarProvider } from "./components/ui";
import { StoreProvider } from "./store/store";
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

export default function App() {
  return (
    <StoreProvider>
      <SnackbarProvider>
        <ThemeManager />
        <Shell />
      </SnackbarProvider>
    </StoreProvider>
  );
}
