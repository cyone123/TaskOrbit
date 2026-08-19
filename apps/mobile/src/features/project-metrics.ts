import { DAY_MS, parseISODate, resolveSessionProjectId, todayISO, type AppState } from "@task-orbit/core";

export interface ProjectMetrics {
  taskTotal: number;
  taskDone: number;
  taskProgress: number;
  planTotal: number;
  planDone: number;
  planProgress: number;
  remainingDays: number;
  focusSessions: number;
  focusMinutes: number;
}

export function calculateProjectMetrics(state: AppState, projectId: string, today = todayISO()): ProjectMetrics {
  const project = state.projects.find((item) => item.id === projectId);
  const tasks = state.tasks.filter((task) => task.projectId === projectId);
  const plans = state.dailyPlans.filter((plan) => plan.projectId === projectId);
  const sessions = state.pomodoroSessions.filter((session) => session.kind === "focus" && resolveSessionProjectId(session, state) === projectId);
  const taskDone = tasks.filter((task) => task.done).length;
  const planDone = plans.filter((plan) => plan.done).length;
  return {
    taskTotal: tasks.length,
    taskDone,
    taskProgress: tasks.length ? Math.round(taskDone / tasks.length * 100) : 0,
    planTotal: plans.length,
    planDone,
    planProgress: plans.length ? Math.round(planDone / plans.length * 100) : 0,
    remainingDays: project ? Math.max(0, Math.ceil((parseISODate(project.endDate).getTime() - parseISODate(today).getTime()) / DAY_MS)) : 0,
    focusSessions: sessions.length,
    focusMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0),
  };
}
