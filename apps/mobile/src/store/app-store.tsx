import {
  appendDailyPlans,
  appendInboxItem,
  appendPomodoroSession,
  appendProject,
  appendTask,
  archiveProjectState,
  createDailyPlans,
  createEmptyState,
  createInboxItem,
  createPausedTimer,
  createProject,
  createTask,
  deleteDailyPlanState,
  deleteInboxItemState,
  deleteProjectState,
  deleteTaskState,
  parseImportSnapshot,
  pauseTimer,
  reconcileTimer,
  restoreProjectState,
  serializeExportSnapshot,
  skipTimer,
  startTimer,
  updateDailyPlanState,
  updateInboxItemState,
  updateProjectState,
  updateSettingsState,
  updateTaskState,
  validateAppState,
  type AppState,
  type DailyPlanInput,
  type DailyPlanPatch,
  type InboxItemKind,
  type PomodoroLink,
  type Priority,
  type ProjectInput,
  type Settings,
  type TaskInput,
} from "@task-orbit/core";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState as NativeAppState } from "react-native";

import { cancelTimerNotification, configureNotifications, scheduleTimerNotification } from "./notifications";
import { loadState, replaceState, saveState } from "./persistence";

type Mutator = (state: AppState) => AppState;

interface AppStoreValue {
  state: AppState;
  ready: boolean;
  error: string | null;
  notice: string | null;
  clearNotice(): void;
  addInbox(kind: InboxItemKind, content: string): void;
  toggleInbox(id: string, done: boolean): void;
  removeInbox(id: string): void;
  addProject(input: ProjectInput): void;
  updateProject(id: string, input: ProjectInput): void;
  archiveProject(id: string): void;
  restoreProject(id: string): void;
  removeProject(id: string): void;
  addTask(input: TaskInput): void;
  updateTask(id: string, input: Omit<TaskInput, "projectId">): void;
  toggleTask(id: string, done: boolean): void;
  removeTask(id: string): void;
  addPlans(input: DailyPlanInput): void;
  togglePlan(id: string, done: boolean): void;
  updatePlan(id: string, patch: DailyPlanPatch): void;
  removePlan(id: string): void;
  updateTheme(theme: Settings["theme"]): void;
  updatePomodoroSettings(patch: Pick<Settings, "focusMinutes" | "shortBreakMinutes" | "longBreakMinutes" | "longBreakInterval">): void;
  startPomodoro(link: PomodoroLink): Promise<boolean>;
  pausePomodoro(): void;
  skipPomodoro(): void;
  resetPomodoro(): void;
  exportSnapshot(): string;
  importSnapshot(raw: string): Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(() => createEmptyState());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const latestState = useRef(state);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    configureNotifications().catch(() => undefined);
    loadState()
      .then((result) => {
        if (!active) return;
        latestState.current = result.state;
        setState(result.state);
        if (result.recoveredFromBackup) setNotice("主数据损坏，已从本地备份恢复。");
      })
      .catch((loadError) => setError(String(loadError)))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  const mutate = useCallback((recipe: Mutator) => {
    setState((current) => {
      try {
        const next = validateAppState(recipe(current));
        latestState.current = next;
        setError(null);
        return next;
      } catch (mutationError) {
        setError(mutationError instanceof Error ? mutationError.message : String(mutationError));
        return current;
      }
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState(state).catch((saveError) => setError(`保存失败：${String(saveError)}`));
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [ready, state]);

  const reconcile = useCallback(() => {
    mutate((current) => {
      const result = reconcileTimer(current.activeTimer, current.settings);
      if (!result.changed) return current;
      let next = { ...current, activeTimer: result.timer };
      for (const completed of result.completed) {
        next = appendPomodoroSession(next, completed).state;
      }
      if (result.warning) setNotice(result.warning);
      if (result.timer?.status === "running") scheduleTimerNotification(result.timer).catch(() => undefined);
      return next;
    });
  }, [mutate]);

  useEffect(() => {
    if (!ready) return;
    reconcile();
    const interval = setInterval(reconcile, 1_000);
    const subscription = NativeAppState.addEventListener("change", (next) => {
      if (next === "active") reconcile();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [ready, reconcile]);

  const value = useMemo<AppStoreValue>(() => ({
    state,
    ready,
    error,
    notice,
    clearNotice: () => setNotice(null),
    addInbox: (kind, content) => mutate((current) => appendInboxItem(current, createInboxItem({ kind, content }))),
    toggleInbox: (id, done) => mutate((current) => updateInboxItemState(current, id, { done })),
    removeInbox: (id) => mutate((current) => deleteInboxItemState(current, id)),
    addProject: (input) => mutate((current) => appendProject(current, createProject(input))),
    updateProject: (id, input) => mutate((current) => updateProjectState(current, id, input)),
    archiveProject: (id) => mutate((current) => archiveProjectState(current, id)),
    restoreProject: (id) => mutate((current) => restoreProjectState(current, id)),
    removeProject: (id) => mutate((current) => deleteProjectState(current, id)),
    addTask: (input) => mutate((current) => appendTask(current, createTask(input))),
    updateTask: (id, input) => mutate((current) => updateTaskState(current, id, input)),
    toggleTask: (id, done) => mutate((current) => updateTaskState(current, id, { done })),
    removeTask: (id) => mutate((current) => deleteTaskState(current, id)),
    addPlans: (input) => mutate((current) => appendDailyPlans(current, createDailyPlans(input))),
    togglePlan: (id, done) => mutate((current) => updateDailyPlanState(current, id, { done })),
    updatePlan: (id, patch) => mutate((current) => updateDailyPlanState(current, id, patch)),
    removePlan: (id) => mutate((current) => deleteDailyPlanState(current, id)),
    updateTheme: (theme) => mutate((current) => updateSettingsState(current, { theme })),
    updatePomodoroSettings: (patch) => {
      cancelTimerNotification().catch(() => undefined);
      mutate((current) => {
        const next = updateSettingsState(current, patch);
        return { ...next, activeTimer: createPausedTimer(next.settings) };
      });
    },
    startPomodoro: async (link) => {
      const nextTimer = startTimer(latestState.current.activeTimer, latestState.current.settings, link);
      mutate((current) => ({ ...current, activeTimer: nextTimer }));
      return scheduleTimerNotification(nextTimer);
    },
    pausePomodoro: () => {
      cancelTimerNotification().catch(() => undefined);
      mutate((current) => ({ ...current, activeTimer: pauseTimer(current.activeTimer) }));
    },
    skipPomodoro: () => {
      cancelTimerNotification().catch(() => undefined);
      mutate((current) => ({ ...current, activeTimer: skipTimer(current.activeTimer, current.settings) }));
    },
    resetPomodoro: () => {
      cancelTimerNotification().catch(() => undefined);
      mutate((current) => ({ ...current, activeTimer: createPausedTimer(current.settings) }));
    },
    exportSnapshot: () => serializeExportSnapshot(latestState.current),
    importSnapshot: async (raw) => {
      const imported = parseImportSnapshot(raw);
      await cancelTimerNotification();
      await replaceState(imported);
      latestState.current = imported;
      setState(imported);
      setNotice("数据已导入，本地原数据已保留为备份。");
      setError(null);
    },
  }), [error, mutate, notice, ready, state]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext);
  if (!value) throw new Error("useAppStore 必须在 AppStoreProvider 内使用。");
  return value;
}

export const PROJECT_COLORS = ["violet", "blue", "green", "orange", "rose"] as const;
export const PROJECT_COLOR_HEX: Record<string, string> = {
  violet: "#6750A4",
  blue: "#1769AA",
  green: "#386A20",
  orange: "#A64500",
  rose: "#B3261E",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};
