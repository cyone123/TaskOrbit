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
  reorderProjectsState,
  restoreProjectState,
  serializeExportSnapshot,
  skipTimer,
  startTimer,
  updateDailyPlanState,
  updateInboxItemState,
  updateProjectState,
  updateSettingsState,
  updateTaskState,
  updateWebDavSettingsState,
  validateAppState,
  SyncCoordinator,
  recordTombstone,
  pruneTombstones,
  WebDavClient,
  uid,
  type AppState,
  type DailyPlanInput,
  type DailyPlanPatch,
  type InboxItemKind,
  type PomodoroLink,
  type Priority,
  type ProjectInput,
  type Settings,
  type TaskInput,
  type WebDavSettings,
  type Tombstone,
  type SyncStatus,
  type SyncResult,
  type WebDavConnectionTestResult,
} from "@task-orbit/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { mobileHttpTransport } from "./webdav-transport";

type Mutator = (state: AppState) => AppState;

interface AppStoreValue {
  state: AppState;
  ready: boolean;
  error: string | null;
  notice: string | null;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  syncErrorMessage: string | null;
  clearNotice(): void;
  syncNow(): Promise<SyncResult>;
  testWebDavConnection(settings?: WebDavSettings): Promise<WebDavConnectionTestResult>;
  updateWebDavSettings(patch: Partial<WebDavSettings>): void;
  addInbox(kind: InboxItemKind, content: string): void;
  toggleInbox(id: string, done: boolean): void;
  removeInbox(id: string): void;
  addProject(input: ProjectInput): void;
  updateProject(id: string, input: ProjectInput): void;
  reorderProjects(orderedIds: string[]): void;
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

const TOMBSTONES_KEY = "task-orbit.mobile.tombstones";
const LAST_REMOTE_ETAG_KEY = "task-orbit.mobile.webdav.etag";
const LAST_SYNC_AT_KEY = "task-orbit.mobile.webdav.lastSync";
const DEVICE_ID_KEY = "task-orbit.mobile.deviceId";

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(() => createEmptyState());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const latestState = useRef(state);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tombstonesRef = useRef<Tombstone[]>([]);
  const lastRemoteEtagRef = useRef<string | null>(null);
  const deviceIdRef = useRef<string>("mobile_init");
  const localDirtyRef = useRef(false);
  const autoSyncDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coordinatorRef = useRef<SyncCoordinator | null>(null);

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

    AsyncStorage.multiGet([TOMBSTONES_KEY, LAST_REMOTE_ETAG_KEY, LAST_SYNC_AT_KEY, DEVICE_ID_KEY])
      .then((entries) => {
        if (!active) return;
        if (entries[0][1]) {
          try {
            tombstonesRef.current = pruneTombstones(JSON.parse(entries[0][1]));
          } catch {}
        }
        lastRemoteEtagRef.current = entries[1][1];
        if (entries[2][1]) setLastSyncAt(Number(entries[2][1]));
        if (entries[3][1]) {
          deviceIdRef.current = entries[3][1];
        } else {
          const newId = uid("dev_m_");
          deviceIdRef.current = newId;
          AsyncStorage.setItem(DEVICE_ID_KEY, newId).catch(() => undefined);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!coordinatorRef.current) {
      return { success: false, message: "同步未就绪", hasChanges: false };
    }
    setSyncStatus("syncing");
    setSyncErrorMessage(null);
    try {
      const res = await coordinatorRef.current.sync();
      if (res.success) {
        setSyncStatus("success");
      } else {
        setSyncStatus("error");
        setSyncErrorMessage(res.message ?? "同步失败");
      }
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncStatus("error");
      setSyncErrorMessage(msg);
      return { success: false, message: msg, hasChanges: false };
    }
  }, []);

  if (!coordinatorRef.current) {
    coordinatorRef.current = new SyncCoordinator({
      deviceId: deviceIdRef.current,
      transport: mobileHttpTransport,
      getState: () => latestState.current,
      getTombstones: () => tombstonesRef.current,
      getLastRemoteEtag: () => lastRemoteEtagRef.current,
      isLocalDirty: () => localDirtyRef.current,
      onStateMerged: async (mergedState, mergedTombstones) => {
        tombstonesRef.current = mergedTombstones;
        AsyncStorage.setItem(TOMBSTONES_KEY, JSON.stringify(mergedTombstones)).catch(() => undefined);
        latestState.current = mergedState;
        setState(mergedState);
        await saveState(mergedState);
      },
      onSyncSuccess: async (etag, timestamp) => {
        localDirtyRef.current = false;
        lastRemoteEtagRef.current = etag;
        if (etag) AsyncStorage.setItem(LAST_REMOTE_ETAG_KEY, etag).catch(() => undefined);
        AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(timestamp)).catch(() => undefined);
        setLastSyncAt(timestamp);
      },
    });
  }

  const triggerAutoSyncDebounced = useCallback(() => {
    if (autoSyncDebounceTimer.current) clearTimeout(autoSyncDebounceTimer.current);
    autoSyncDebounceTimer.current = setTimeout(() => {
      autoSyncDebounceTimer.current = null;
      const s = latestState.current.webDavSettings;
      if (s.enabled && s.autoSync && s.serverUrl.trim()) {
        void syncNow();
      }
    }, 10_000);
  }, [syncNow]);

  const addTombstone = useCallback(
    (id: string, type: "project" | "task" | "dailyPlan" | "inboxItem") => {
      const next = recordTombstone(tombstonesRef.current, id, type);
      tombstonesRef.current = next;
      AsyncStorage.setItem(TOMBSTONES_KEY, JSON.stringify(next)).catch(() => undefined);
      localDirtyRef.current = true;
      triggerAutoSyncDebounced();
    },
    [triggerAutoSyncDebounced],
  );

  const testWebDavConnection = useCallback(
    async (settingsOverride?: WebDavSettings): Promise<WebDavConnectionTestResult> => {
      const s = settingsOverride ?? latestState.current.webDavSettings;
      const client = new WebDavClient(s, mobileHttpTransport);
      return client.testConnection();
    },
    [],
  );

  const mutate = useCallback(
    (recipe: Mutator) => {
      setState((current) => {
        try {
          const next = validateAppState(recipe(current));
          latestState.current = next;
          localDirtyRef.current = true;
          triggerAutoSyncDebounced();
          setError(null);
          return next;
        } catch (mutationError) {
          setError(mutationError instanceof Error ? mutationError.message : String(mutationError));
          return current;
        }
      });
    },
    [triggerAutoSyncDebounced],
  );

  const updateWebDavSettings = useCallback(
    (patch: Partial<WebDavSettings>) => {
      mutate((current) => updateWebDavSettingsState(current, patch));
    },
    [mutate],
  );

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

  // Initial auto sync on ready
  useEffect(() => {
    if (!ready) return;
    const s = latestState.current.webDavSettings;
    if (s.enabled && s.autoSync && s.serverUrl.trim()) {
      void syncNow();
    }
  }, [ready, syncNow]);

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
      if (next === "active") {
        reconcile();
        const s = latestState.current.webDavSettings;
        if (s.enabled && s.autoSync && s.serverUrl.trim()) {
          void syncNow();
        }
      }
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [ready, reconcile, syncNow]);

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      ready,
      error,
      notice,
      syncStatus,
      lastSyncAt,
      syncErrorMessage,
      clearNotice: () => setNotice(null),
      syncNow,
      testWebDavConnection,
      updateWebDavSettings,
      addInbox: (kind, content) =>
        mutate((current) => appendInboxItem(current, createInboxItem({ kind, content }))),
      toggleInbox: (id, done) =>
        mutate((current) => updateInboxItemState(current, id, { done })),
      removeInbox: (id) => {
        addTombstone(id, "inboxItem");
        mutate((current) => deleteInboxItemState(current, id));
      },
      addProject: (input) =>
        mutate((current) => appendProject(current, createProject(input))),
      updateProject: (id, input) =>
        mutate((current) => updateProjectState(current, id, input)),
      reorderProjects: (orderedIds) =>
        mutate((current) => reorderProjectsState(current, orderedIds)),
      archiveProject: (id) =>
        mutate((current) => archiveProjectState(current, id)),
      restoreProject: (id) =>
        mutate((current) => restoreProjectState(current, id)),
      removeProject: (id) => {
        addTombstone(id, "project");
        mutate((current) => deleteProjectState(current, id));
      },
      addTask: (input) =>
        mutate((current) => appendTask(current, createTask(input))),
      updateTask: (id, input) =>
        mutate((current) => updateTaskState(current, id, input)),
      toggleTask: (id, done) =>
        mutate((current) => updateTaskState(current, id, { done })),
      removeTask: (id) => {
        addTombstone(id, "task");
        mutate((current) => deleteTaskState(current, id));
      },
      addPlans: (input) =>
        mutate((current) => appendDailyPlans(current, createDailyPlans(input))),
      togglePlan: (id, done) =>
        mutate((current) => updateDailyPlanState(current, id, { done })),
      updatePlan: (id, patch) =>
        mutate((current) => {
          const prevPlanIds = new Set(current.dailyPlans.map((p) => p.id));
          const next = updateDailyPlanState(current, id, patch);
          for (const planId of prevPlanIds) {
            if (!next.dailyPlans.some((p) => p.id === planId)) {
              addTombstone(planId, "dailyPlan");
            }
          }
          return next;
        }),
      removePlan: (id) => {
        addTombstone(id, "dailyPlan");
        mutate((current) => deleteDailyPlanState(current, id));
      },
      updateTheme: (theme) =>
        mutate((current) => updateSettingsState(current, { theme })),
      updatePomodoroSettings: (patch) => {
        cancelTimerNotification().catch(() => undefined);
        mutate((current) => {
          const next = updateSettingsState(current, patch);
          return { ...next, activeTimer: createPausedTimer(next.settings) };
        });
      },
      startPomodoro: async (link) => {
        const nextTimer = startTimer(
          latestState.current.activeTimer,
          latestState.current.settings,
          link,
        );
        mutate((current) => ({ ...current, activeTimer: nextTimer }));
        return scheduleTimerNotification(nextTimer);
      },
      pausePomodoro: () => {
        cancelTimerNotification().catch(() => undefined);
        mutate((current) => ({
          ...current,
          activeTimer: pauseTimer(current.activeTimer),
        }));
      },
      skipPomodoro: () => {
        cancelTimerNotification().catch(() => undefined);
        mutate((current) => ({
          ...current,
          activeTimer: skipTimer(current.activeTimer, current.settings),
        }));
      },
      resetPomodoro: () => {
        cancelTimerNotification().catch(() => undefined);
        mutate((current) => ({
          ...current,
          activeTimer: createPausedTimer(current.settings),
        }));
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
    }),
    [
      addTombstone,
      error,
      lastSyncAt,
      mutate,
      notice,
      ready,
      state,
      syncErrorMessage,
      syncNow,
      syncStatus,
      testWebDavConnection,
      updateWebDavSettings,
    ],
  );

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
