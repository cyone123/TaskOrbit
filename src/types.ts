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

export type DailyPlanRepeat = "none" | "daily" | "weekly" | "monthly";

export interface DailyPlanRecurrence {
  frequency: DailyPlanRepeat;
  /** Total number of occurrences, including the first one. */
  count: number;
  /** Shared identifier for occurrences created from the same repeat rule. */
  seriesId: string | null;
  /** One-based occurrence number within the series. */
  occurrence: number;
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
  recurrence: DailyPlanRecurrence;
  createdAt: number;
  updatedAt: number;
}

export type PomodoroKind = "focus" | "shortBreak" | "longBreak";

export type TimerStatus = "running" | "paused";

export interface PomodoroLink {
  projectId: string | null;
  taskId: string | null;
  dailyPlanId: string | null;
}

export interface ActiveTimer extends PomodoroLink {
  phase: PomodoroKind;
  status: TimerStatus;
  focusCount: number;
  durationMs: number;
  remainingMs: number;
  phaseStartedAt: number | null;
  endAt: number | null;
}

export interface PomodoroSession extends PomodoroLink {
  id: string;
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

export interface VaultSettings {
  enabled: boolean;
  rootPath: string | null;
  vaultName: string | null;
  notesFolder: string;
  autoReload: boolean;
  openWithObsidian: boolean;
}

export interface AppState {
  version: number;
  projects: Project[];
  tasks: Task[];
  dailyPlans: DailyPlan[];
  pomodoroSessions: PomodoroSession[];
  settings: Settings;
  vaultSettings: VaultSettings;
  activeTimer: ActiveTimer | null;
}

// ---- Small helper types -----------------------------------------------------

export type ViewKey = "projects" | "calendar" | "pomodoro" | "stats";

export interface ColorOption {
  key: string;
  name: string;
  hex: string;
}
