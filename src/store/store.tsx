import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppState,
  DailyPlan,
  InboxItem,
  PomodoroKind,
  PomodoroLink,
  PomodoroSession,
  Project,
  Settings,
  Task,
  VaultSettings,
} from "../types";
import { uid } from "../utils/id";
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
  updateDailyPlanState,
  updateInboxItemState,
  updateProjectState,
  updateSettingsState,
  updateTaskState,
  updateVaultSettingsState,
  restoreProjectState,
  type DailyPlanInput,
  type DailyPlanPatch,
  type InboxItemInput,
  type InboxItemPatch,
  type PomodoroInput,
  type ProjectInput,
  type ProjectPatch,
  type TaskInput,
  type TaskPatch,
} from "./domain";
import {
  clearPersistedState,
  loadPersistedState,
  persistState,
  type PersistedLoadResult,
} from "./persistence";
import { createDefaultState } from "./seed";
import { parseImportSnapshot, serializeExportSnapshot } from "./transfer";
import {
  pauseTimer as pauseTimerState,
  reconcileTimer,
  resetTimer as resetTimerState,
  resumeTimer as resumeTimerState,
  selectTimerPhase as selectTimerPhaseState,
  skipTimer as skipTimerState,
  startTimer as startTimerState,
  updateTimerLink,
} from "./timer";
import { parsePersistedState, validateAppState } from "./schema";

export { STATE_VERSION } from "./version";
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
} from "./domain";

export type StoreStatus = "loading" | "ready" | "error";

export interface StoreApi {
  state: AppState;
  status: StoreStatus;
  ready: boolean;
  loadWarning: string | null;
  loadError: string | null;
  persistenceError: string | null;
  timerRecoveryWarning: string | null;
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [timerRecoveryWarning, setTimerRecoveryWarning] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const readyRef = useRef(false);
  const stateRef = useRef(state);
  const loadRequestRef = useRef(0);
  const saveGenerationRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveTimerRef = useRef<number | undefined>(undefined);
  const skipNextStatePersistRef = useRef(false);
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

  const mutate = useCallback((fn: (state: AppState) => AppState) => {
    setState((previous) => {
      try {
        const next = validateAppState(fn(previous));
        stateRef.current = next;
        return next;
      } catch (error) {
        console.error("rejected invalid state mutation", error);
        return previous;
      }
    });
  }, []);

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

  const deleteProject = useCallback<StoreApi["deleteProject"]>((id) => {
    mutate((state) => deleteProjectState(state, id));
  }, [mutate]);

  const addTask = useCallback<StoreApi["addTask"]>((input) => {
    const task = createTask(input);
    mutate((state) => appendTask(state, task));
    return task;
  }, [mutate]);

  const updateTask = useCallback<StoreApi["updateTask"]>((id, patch) => {
    mutate((state) => updateTaskState(state, id, patch));
  }, [mutate]);

  const deleteTask = useCallback<StoreApi["deleteTask"]>((id) => {
    mutate((state) => deleteTaskState(state, id));
  }, [mutate]);

  const addInboxItem = useCallback<StoreApi["addInboxItem"]>((input) => {
    const item = createInboxItem(input);
    mutate((state) => appendInboxItem(state, item));
    return item;
  }, [mutate]);

  const updateInboxItem = useCallback<StoreApi["updateInboxItem"]>((id, patch) => {
    mutate((state) => updateInboxItemState(state, id, patch));
  }, [mutate]);

  const deleteInboxItem = useCallback<StoreApi["deleteInboxItem"]>((id) => {
    mutate((state) => deleteInboxItemState(state, id));
  }, [mutate]);

  const addDailyPlan = useCallback<StoreApi["addDailyPlan"]>((input) => {
    const plans = createDailyPlans(input);
    mutate((state) => appendDailyPlans(state, plans));
    return plans[0];
  }, [mutate]);

  const updateDailyPlan = useCallback<StoreApi["updateDailyPlan"]>((id, patch) => {
    mutate((state) => updateDailyPlanState(state, id, patch));
  }, [mutate]);

  const deleteDailyPlan = useCallback<StoreApi["deleteDailyPlan"]>((id) => {
    mutate((state) => deleteDailyPlanState(state, id));
  }, [mutate]);

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
