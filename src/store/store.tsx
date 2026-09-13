import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  appendDailyPlans,
  appendInboxItem,
  appendPomodoroSession,
  appendProject,
  appendTask,
  archiveProjectState,
  createDailyPlans,
  createInboxItem,
  createProject,
  createTask,
  deleteDailyPlanState,
  deleteInboxItemState,
  deleteProjectState,
  deleteTaskState,
  parseImportSnapshot,
  parsePersistedState,
  pauseTimer as pauseTimerState,
  reconcileTimer,
  resetTimer as resetTimerState,
  restoreProjectState,
  resumeTimer as resumeTimerState,
  selectTimerPhase as selectTimerPhaseState,
  serializeExportSnapshot,
  skipTimer as skipTimerState,
  startTimer as startTimerState,
  uid,
  updateDailyPlanState,
  updateInboxItemState,
  updateProjectState,
  updateSettingsState,
  updateTaskState,
  updateTimerLink,
  updateVaultSettingsState,
  updateWebDavSettingsState,
  validateAppState,
  SyncCoordinator,
  recordTombstone,
  pruneTombstones,
  WebDavClient,
  type DailyPlanInput,
  type DailyPlanPatch,
  type InboxItemInput,
  type InboxItemPatch,
  type PomodoroInput,
  type ProjectInput,
  type ProjectPatch,
  type TaskInput,
  type TaskPatch,
  type AppState,
  type DailyPlan,
  type InboxItem,
  type PomodoroKind,
  type PomodoroLink,
  type PomodoroSession,
  type Project,
  type Settings,
  type Task,
  type VaultSettings,
  type WebDavSettings,
  type Tombstone,
  type SyncStatus,
  type SyncResult,
  type WebDavConnectionTestResult,
} from "@task-orbit/core";
import {
  clearPersistedState,
  loadPersistedState,
  persistState,
  type PersistedLoadResult,
} from "./persistence";
import { createDefaultState } from "./seed";
import { desktopHttpTransport } from "./webdav-transport";

export { STATE_VERSION } from "@task-orbit/core";
export type {
  DailyPlanInput,
  DailyPlanPatch,
  InboxItemInput,
  InboxItemPatch,
  PomodoroInput,
  ProjectInput,
  ProjectPatch,
  TaskInput,
  TaskPatch,
  WebDavSettings,
  SyncStatus,
  SyncResult,
  WebDavConnectionTestResult,
} from "@task-orbit/core";

export type StoreStatus = "loading" | "ready" | "error";

export interface StoreApi {
  state: AppState;
  status: StoreStatus;
  ready: boolean;
  loadWarning: string | null;
  loadError: string | null;
  persistenceError: string | null;
  timerRecoveryWarning: string | null;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  syncErrorMessage: string | null;
  syncNow: () => Promise<SyncResult>;
  testWebDavConnection: (settings?: WebDavSettings) => Promise<WebDavConnectionTestResult>;
  updateWebDavSettings: (patch: Partial<WebDavSettings>) => void;
  retryLoad: () => void;
  addProject: (input: ProjectInput) => Project;
  updateProject: (id: string, patch: ProjectPatch) => void;
  archiveProject: (id: string) => void;
  restoreProject: (id: string) => void;
  deleteProject: (id: string) => void;
  addTask: (input: TaskInput) => Task;
  updateTask: (id: string, patch: TaskPatch) => void;
  deleteTask: (id: string) => void;
  addDailyPlan: (input: DailyPlanInput) => DailyPlan;
  updateDailyPlan: (id: string, patch: DailyPlanPatch) => void;
  deleteDailyPlan: (id: string) => void;
  addInboxItem: (input: InboxItemInput) => InboxItem;
  updateInboxItem: (id: string, patch: InboxItemPatch) => void;
  deleteInboxItem: (id: string) => void;
  addPomodoroSession: (input: PomodoroInput) => PomodoroSession;
  updateSettings: (patch: Partial<Settings>) => void;
  updateVaultSettings: (patch: Partial<VaultSettings>) => void;
  startTimer: (link: PomodoroLink) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  selectTimerPhase: (phase: PomodoroKind) => void;
  skipTimer: () => void;
  resetTimer: () => void;
  updateTimerLink: (link: PomodoroLink) => void;
  reconcileTimerNow: () => void;
  exportSnapshot: () => string;
  importSnapshot: (raw: unknown) => Promise<void>;
  resetAll: () => Promise<void>;
}

const StoreContext = createContext<StoreApi | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function reconcileAppState(
  state: AppState,
  now = Date.now(),
): { state: AppState; warning: string | null; changed: boolean } {
  const result = reconcileTimer(state.activeTimer, state.settings, now);
  if (!result.changed) return { state, warning: null, changed: false };

  let nextState: AppState = { ...state, activeTimer: result.timer };
  for (const completion of result.completed) {
    nextState = appendPomodoroSession(nextState, completion).state;
  }
  return {
    state: validateAppState(nextState),
    warning: result.warning,
    changed: true,
  };
}

const LS_TOMBSTONES_KEY = "task-orbit-tombstones";
const LS_LAST_REMOTE_ETAG_KEY = "task-orbit-webdav-etag";
const LS_LAST_SYNC_AT_KEY = "task-orbit-webdav-last-sync";
const LS_DEVICE_ID_KEY = "task-orbit-device-id";

function getDeviceId(): string {
  if (typeof window === "undefined") return "node_runtime";
  let id = localStorage.getItem(LS_DEVICE_ID_KEY);
  if (!id) {
    id = uid("dev_");
    localStorage.setItem(LS_DEVICE_ID_KEY, id);
  }
  return id;
}

function loadLocalTombstones(): Tombstone[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_TOMBSTONES_KEY);
    return raw ? pruneTombstones(JSON.parse(raw) as Tombstone[]) : [];
  } catch {
    return [];
  }
}

function saveLocalTombstones(tombstones: Tombstone[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_TOMBSTONES_KEY, JSON.stringify(tombstones));
  } catch {}
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [timerRecoveryWarning, setTimerRecoveryWarning] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(LS_LAST_SYNC_AT_KEY);
    return raw ? Number(raw) : null;
  });
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const readyRef = useRef(false);
  const stateRef = useRef(state);
  const loadRequestRef = useRef(0);
  const saveGenerationRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveTimerRef = useRef<number | undefined>(undefined);
  const skipNextStatePersistRef = useRef(false);
  const localDirtyRef = useRef(false);
  const tombstonesRef = useRef<Tombstone[]>(loadLocalTombstones());
  const autoSyncDebounceTimerRef = useRef<number | undefined>(undefined);
  stateRef.current = state;

  const enqueuePersist = useCallback((snapshot: AppState): Promise<void> => {
    const generation = saveGenerationRef.current;
    const queued = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (generation !== saveGenerationRef.current) return;
        await persistState(snapshot);
      });
    saveQueueRef.current = queued;
    queued.then(
      () => {
        if (mountedRef.current) setPersistenceError(null);
      },
      (error) => {
        if (mountedRef.current) setPersistenceError(errorMessage(error));
      },
    );
    return queued;
  }, []);

  const flushPendingSave = useCallback(
    async (snapshot: AppState) => {
      if (saveTimerRef.current !== undefined) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
      }
      await enqueuePersist(snapshot);
      await saveQueueRef.current.catch(() => undefined);
    },
    [enqueuePersist],
  );

  const loadState = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    readyRef.current = false;
    setStatus("loading");
    setLoadError(null);
    setLoadWarning(null);
    setTimerRecoveryWarning(null);

    try {
      const result: PersistedLoadResult = await loadPersistedState();
      if (!mountedRef.current || requestId !== loadRequestRef.current) return;

      let nextState: AppState;
      let warning = result.warning ?? null;
      try {
        nextState = parsePersistedState(result.state);
      } catch (primaryError) {
        if (result.backupState == null) throw primaryError;
        nextState = parsePersistedState(result.backupState);
        warning = "主数据格式无效，已从备份恢复。";
      }

      const reconciled = reconcileAppState(nextState);
      if (reconciled.changed) {
        skipNextStatePersistRef.current = true;
        void enqueuePersist(reconciled.state);
      }
      stateRef.current = reconciled.state;
      setState(reconciled.state);
      setLoadWarning(warning);
      setTimerRecoveryWarning(reconciled.warning);
      readyRef.current = true;
      setStatus("ready");
    } catch (error) {
      if (!mountedRef.current || requestId !== loadRequestRef.current) return;
      readyRef.current = false;
      setLoadError(errorMessage(error));
      setStatus("error");
    }
  }, [enqueuePersist]);

  useEffect(() => {
    mountedRef.current = true;
    void loadState();
    return () => {
      mountedRef.current = false;
    };
  }, [loadState]);

  // Persist only durable state transitions. The PomodoroView's display tick
  // never updates AppState, so it cannot cause a disk write every 250ms.
  useEffect(() => {
    if (!readyRef.current) return;
    if (skipNextStatePersistRef.current) {
      skipNextStatePersistRef.current = false;
      return;
    }
    if (saveTimerRef.current !== undefined) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = undefined;
      void enqueuePersist(state);
    }, 400);
    return () => {
      if (saveTimerRef.current !== undefined) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
      }
    };
  }, [state, enqueuePersist]);

  const reconcileTimerState = useCallback(() => {
    const result = reconcileAppState(stateRef.current, Date.now());
    if (!result.changed) return;
    stateRef.current = result.state;
    setState(result.state);
    setTimerRecoveryWarning(result.warning);
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    const interval = window.setInterval(reconcileTimerState, 1000);
    const onFocus = () => reconcileTimerState();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") reconcileTimerState();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status, reconcileTimerState]);

  const coordinatorRef = useRef<SyncCoordinator | null>(null);

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
      deviceId: getDeviceId(),
      transport: desktopHttpTransport,
      getState: () => stateRef.current,
      getTombstones: () => tombstonesRef.current,
      getLastRemoteEtag: () => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(LS_LAST_REMOTE_ETAG_KEY);
      },
      isLocalDirty: () => localDirtyRef.current,
      onStateMerged: async (mergedState, mergedTombstones) => {
        tombstonesRef.current = mergedTombstones;
        saveLocalTombstones(mergedTombstones);
        skipNextStatePersistRef.current = true;
        stateRef.current = mergedState;
        setState(mergedState);
        await enqueuePersist(mergedState);
      },
      onSyncSuccess: async (etag, timestamp) => {
        localDirtyRef.current = false;
        if (etag && typeof window !== "undefined") {
          localStorage.setItem(LS_LAST_REMOTE_ETAG_KEY, etag);
        }
        if (typeof window !== "undefined") {
          localStorage.setItem(LS_LAST_SYNC_AT_KEY, String(timestamp));
        }
        setLastSyncAt(timestamp);
      },
    });
  }

  const triggerAutoSyncDebounced = useCallback(() => {
    if (typeof window === "undefined") return;
    if (autoSyncDebounceTimerRef.current !== undefined) {
      window.clearTimeout(autoSyncDebounceTimerRef.current);
    }
    autoSyncDebounceTimerRef.current = window.setTimeout(() => {
      autoSyncDebounceTimerRef.current = undefined;
      const s = stateRef.current.webDavSettings;
      if (s.enabled && s.autoSync && s.serverUrl.trim()) {
        void syncNow();
      }
    }, 10_000);
  }, [syncNow]);

  const addTombstone = useCallback(
    (id: string, type: "project" | "task" | "dailyPlan" | "inboxItem") => {
      const next = recordTombstone(tombstonesRef.current, id, type);
      tombstonesRef.current = next;
      saveLocalTombstones(next);
      localDirtyRef.current = true;
      triggerAutoSyncDebounced();
    },
    [triggerAutoSyncDebounced],
  );

  const testWebDavConnection = useCallback(
    async (settingsOverride?: WebDavSettings): Promise<WebDavConnectionTestResult> => {
      const s = settingsOverride ?? stateRef.current.webDavSettings;
      const client = new WebDavClient(s, desktopHttpTransport);
      return client.testConnection();
    },
    [],
  );

  // Background auto-sync on ready
  useEffect(() => {
    if (status !== "ready") return;
    const s = stateRef.current.webDavSettings;
    if (s.enabled && s.autoSync && s.serverUrl.trim()) {
      void syncNow();
    }
  }, [status, syncNow]);

  // Periodic background auto-sync
  useEffect(() => {
    if (status !== "ready") return;
    const s = state.webDavSettings;
    if (!s.enabled || !s.autoSync || !s.serverUrl.trim()) return;

    const intervalMs = Math.max(1, s.syncIntervalMinutes) * 60_000;
    const timer = setInterval(() => {
      void syncNow();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [
    status,
    state.webDavSettings.enabled,
    state.webDavSettings.autoSync,
    state.webDavSettings.syncIntervalMinutes,
    state.webDavSettings.serverUrl,
    syncNow,
  ]);

  const mutate = useCallback(
    (fn: (state: AppState) => AppState) => {
      setState((previous) => {
        try {
          const next = validateAppState(fn(previous));
          stateRef.current = next;
          localDirtyRef.current = true;
          triggerAutoSyncDebounced();
          return next;
        } catch (error) {
          console.error("rejected invalid state mutation", error);
          return previous;
        }
      });
    },
    [triggerAutoSyncDebounced],
  );

  const updateWebDavSettings = useCallback<StoreApi["updateWebDavSettings"]>(
    (patch) => {
      mutate((state) => updateWebDavSettingsState(state, patch));
    },
    [mutate],
  );

  const addProject = useCallback<StoreApi["addProject"]>((input) => {
    const project = createProject(input);
    mutate((state) => appendProject(state, project));
    return project;
  }, [mutate]);

  const updateProject = useCallback<StoreApi["updateProject"]>((id, patch) => {
    mutate((state) => updateProjectState(state, id, patch));
  }, [mutate]);

  const archiveProject = useCallback<StoreApi["archiveProject"]>((id) => {
    mutate((state) => archiveProjectState(state, id));
  }, [mutate]);

  const restoreProject = useCallback<StoreApi["restoreProject"]>((id) => {
    mutate((state) => restoreProjectState(state, id));
  }, [mutate]);

  const deleteProject = useCallback<StoreApi["deleteProject"]>(
    (id) => {
      addTombstone(id, "project");
      mutate((state) => deleteProjectState(state, id));
    },
    [mutate, addTombstone],
  );

  const addTask = useCallback<StoreApi["addTask"]>((input) => {
    const task = createTask(input);
    mutate((state) => appendTask(state, task));
    return task;
  }, [mutate]);

  const updateTask = useCallback<StoreApi["updateTask"]>((id, patch) => {
    mutate((state) => updateTaskState(state, id, patch));
  }, [mutate]);

  const deleteTask = useCallback<StoreApi["deleteTask"]>(
    (id) => {
      addTombstone(id, "task");
      mutate((state) => deleteTaskState(state, id));
    },
    [mutate, addTombstone],
  );

  const addInboxItem = useCallback<StoreApi["addInboxItem"]>((input) => {
    const item = createInboxItem(input);
    mutate((state) => appendInboxItem(state, item));
    return item;
  }, [mutate]);

  const updateInboxItem = useCallback<StoreApi["updateInboxItem"]>((id, patch) => {
    mutate((state) => updateInboxItemState(state, id, patch));
  }, [mutate]);

  const deleteInboxItem = useCallback<StoreApi["deleteInboxItem"]>(
    (id) => {
      addTombstone(id, "inboxItem");
      mutate((state) => deleteInboxItemState(state, id));
    },
    [mutate, addTombstone],
  );

  const addDailyPlan = useCallback<StoreApi["addDailyPlan"]>((input) => {
    const plans = createDailyPlans(input);
    mutate((state) => appendDailyPlans(state, plans));
    return plans[0];
  }, [mutate]);

  const updateDailyPlan = useCallback<StoreApi["updateDailyPlan"]>(
    (id, patch) => {
      mutate((state) => {
        const prevPlanIds = new Set(state.dailyPlans.map((p) => p.id));
        const nextState = updateDailyPlanState(state, id, patch);
        for (const planId of prevPlanIds) {
          if (!nextState.dailyPlans.some((p) => p.id === planId)) {
            addTombstone(planId, "dailyPlan");
          }
        }
        return nextState;
      });
    },
    [mutate, addTombstone],
  );

  const deleteDailyPlan = useCallback<StoreApi["deleteDailyPlan"]>(
    (id) => {
      addTombstone(id, "dailyPlan");
      mutate((state) => deleteDailyPlanState(state, id));
    },
    [mutate, addTombstone],
  );

  const addPomodoroSession = useCallback<StoreApi["addPomodoroSession"]>((input) => {
    const session: PomodoroSession = {
      id: uid("s_"),
      ...input,
      projectNameSnapshot: null,
      taskNameSnapshot: null,
      dailyPlanNameSnapshot: null,
    };
    mutate((state) => appendPomodoroSession(state, input, session.id).state);
    return session;
  }, [mutate]);

  const updateSettings = useCallback<StoreApi["updateSettings"]>((patch) => {
    mutate((state) => updateSettingsState(state, patch));
  }, [mutate]);

  const updateVaultSettings = useCallback<StoreApi["updateVaultSettings"]>((patch) => {
    mutate((state) => updateVaultSettingsState(state, patch));
  }, [mutate]);

  const startTimer = useCallback<StoreApi["startTimer"]>((link) => {
    setTimerRecoveryWarning(null);
    mutate((state) => ({
      ...state,
      activeTimer: startTimerState(state.activeTimer, state.settings, link),
    }));
  }, [mutate]);

  const pauseTimer = useCallback<StoreApi["pauseTimer"]>(() => {
    mutate((state) => ({
      ...state,
      activeTimer: pauseTimerState(state.activeTimer),
    }));
  }, [mutate]);

  const resumeTimer = useCallback<StoreApi["resumeTimer"]>(() => {
    setTimerRecoveryWarning(null);
    mutate((state) => ({
      ...state,
      activeTimer: resumeTimerState(state.activeTimer, state.settings),
    }));
  }, [mutate]);

  const selectTimerPhase = useCallback<StoreApi["selectTimerPhase"]>((phase) => {
    mutate((state) => ({
      ...state,
      activeTimer: selectTimerPhaseState(state.activeTimer, state.settings, phase),
    }));
  }, [mutate]);

  const skipTimer = useCallback<StoreApi["skipTimer"]>(() => {
    mutate((state) => ({
      ...state,
      activeTimer: skipTimerState(state.activeTimer, state.settings),
    }));
  }, [mutate]);

  const resetTimer = useCallback<StoreApi["resetTimer"]>(() => {
    mutate((state) => ({ ...state, activeTimer: resetTimerState() }));
  }, [mutate]);

  const updateTimerLinkValue = useCallback<StoreApi["updateTimerLink"]>((link) => {
    mutate((state) => ({
      ...state,
      activeTimer: updateTimerLink(state.activeTimer, state.settings, link),
    }));
  }, [mutate]);

  const exportSnapshot = useCallback(() => {
    return serializeExportSnapshot(stateRef.current);
  }, []);

  const importSnapshot = useCallback(async (raw: unknown) => {
    const imported = parseImportSnapshot(raw);
    const nextState = validateAppState({ ...imported, activeTimer: null });
    const currentState = stateRef.current;

    try {
      await flushPendingSave(currentState);
      saveGenerationRef.current += 1;
      await persistState(nextState);
      if (!mountedRef.current) return;
      skipNextStatePersistRef.current = true;
      stateRef.current = nextState;
      setState(nextState);
      setLoadWarning(null);
      setLoadError(null);
      setTimerRecoveryWarning(null);
      setPersistenceError(null);
    } catch (error) {
      if (mountedRef.current) setPersistenceError(errorMessage(error));
      throw error;
    }
  }, [flushPendingSave]);

  const resetAll = useCallback(async () => {
    saveGenerationRef.current += 1;
    if (saveTimerRef.current !== undefined) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }
    await saveQueueRef.current.catch(() => undefined);
    try {
      await clearPersistedState();
      if (!mountedRef.current) return;
      const nextState = createDefaultState();
      stateRef.current = nextState;
      setState(nextState);
      setLoadError(null);
      setLoadWarning(null);
      setPersistenceError(null);
      setTimerRecoveryWarning(null);
      readyRef.current = true;
      setStatus("ready");
    } catch (error) {
      if (mountedRef.current) setPersistenceError(errorMessage(error));
      throw error;
    }
  }, []);

  const retryLoad = useCallback(() => {
    void loadState();
  }, [loadState]);

  return (
    <StoreContext.Provider
      value={{
        state,
        status,
        ready: status === "ready",
        loadWarning,
        loadError,
        persistenceError,
        timerRecoveryWarning,
        syncStatus,
        lastSyncAt,
        syncErrorMessage,
        syncNow,
        testWebDavConnection,
        updateWebDavSettings,
        retryLoad,
        addProject,
        updateProject,
        archiveProject,
        restoreProject,
        deleteProject,
        addTask,
        updateTask,
        deleteTask,
        addInboxItem,
        updateInboxItem,
        deleteInboxItem,
        addDailyPlan,
        updateDailyPlan,
        deleteDailyPlan,
        addPomodoroSession,
        updateSettings,
        updateVaultSettings,
        startTimer,
        pauseTimer,
        resumeTimer,
        selectTimerPhase,
        skipTimer,
        resetTimer,
        updateTimerLink: updateTimerLinkValue,
        reconcileTimerNow: reconcileTimerState,
        exportSnapshot,
        importSnapshot,
        resetAll,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return ctx;
}
