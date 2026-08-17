import type { AppState, PomodoroSession, Project } from "../types";

export function selectActiveProjects(state: AppState): Project[] {
  return state.projects.filter((project) => !project.archived);
}

export function selectFocusSessions(state: AppState): PomodoroSession[] {
  return state.pomodoroSessions.filter((session) => session.kind === "focus");
}

export function selectTodayFocusSessions(state: AppState, today: string): PomodoroSession[] {
  return selectFocusSessions(state).filter((session) => {
    const date = new Date(session.endedAt);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return iso === today;
  });
}

/** Resolve the live project first, then fall back to historical snapshots. */
export function resolveSessionProjectId(
  session: PomodoroSession,
  state: AppState,
): string | null {
  if (session.projectId) return session.projectId;
  if (session.taskId) {
    return state.tasks.find((task) => task.id === session.taskId)?.projectId ?? null;
  }
  if (session.dailyPlanId) {
    return state.dailyPlans.find((plan) => plan.id === session.dailyPlanId)?.projectId ?? null;
  }
  return null;
}

export function selectProjectSessions(state: AppState, projectId: string): PomodoroSession[] {
  return selectFocusSessions(state).filter(
    (session) => resolveSessionProjectId(session, state) === projectId,
  );
}
