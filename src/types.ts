// ---- Domain model -----------------------------------------------------------

export type Priority = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string; // key into the project palette
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  archived: boolean;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  done: boolean;
  priority: Priority;
  createdAt: number;
  updatedAt: number;
}

export interface DailyPlan {
  id: string;
  projectId: string | null; // null -> fully independent plan
  taskId: string | null; // null -> not nested under a task
  name: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  done: boolean;
  estimatedMinutes: number;
  createdAt: number;
  updatedAt: number;
}

export type PomodoroKind = "focus" | "shortBreak" | "longBreak";

export interface PomodoroSession {
  id: string;
  projectId: string | null;
  taskId: string | null;
  dailyPlanId: string | null;
  // Snapshots keep historical statistics readable after permanent deletion.
  projectNameSnapshot: string | null;
  taskNameSnapshot: string | null;
  dailyPlanNameSnapshot: string | null;
  kind: PomodoroKind;
  startedAt: number;
  endedAt: number;
  minutes: number; // actual duration in minutes (rounded up)
}

export interface Settings {
  theme: "light" | "dark" | "system";
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number; // number of focus sessions before a long break
}

export interface AppState {
  version: number;
  projects: Project[];
  tasks: Task[];
  dailyPlans: DailyPlan[];
  pomodoroSessions: PomodoroSession[];
  settings: Settings;
}

// ---- Small helper types -----------------------------------------------------

export type ViewKey = "projects" | "calendar" | "pomodoro" | "stats";

export interface ColorOption {
  key: string;
  name: string;
  hex: string;
}
