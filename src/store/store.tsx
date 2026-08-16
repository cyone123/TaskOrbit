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
  PomodoroSession,
  Priority,
  Project,
  Settings,
  Task,
} from "../types";
import { uid } from "../utils/id";
import { clearPersistedState, loadPersistedState, persistState } from "./persistence";
import { createDefaultState } from "./seed";

export const STATE_VERSION = 1;

export interface ProjectInput {
  name: string;
  description: string;
  color: string;
  startDate: string;
  endDate: string;
}

export interface TaskInput {
  projectId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  priority: Priority;
}

export interface DailyPlanInput {
  projectId: string | null;
  taskId: string | null;
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  estimatedMinutes: number;
}

export interface PomodoroInput {
  projectId: string | null;
  taskId: string | null;
  dailyPlanId: string | null;
  kind: PomodoroSession["kind"];
  startedAt: number;
  endedAt: number;
  minutes: number;
}

interface StoreApi {
  state: AppState;
  ready: boolean;
  addProject: (input: ProjectInput) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addTask: (input: TaskInput) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addDailyPlan: (input: DailyPlanInput) => DailyPlan;
  updateDailyPlan: (id: string, patch: Partial<DailyPlan>) => void;
  deleteDailyPlan: (id: string) => void;
  addPomodoroSession: (input: PomodoroInput) => PomodoroSession;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

function normalizeState(saved: Partial<AppState> | null): AppState {
  const def = createDefaultState();
  if (!saved) return def;
  return {
    version: STATE_VERSION,
    projects: Array.isArray(saved.projects) ? saved.projects : [],
    tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
    dailyPlans: Array.isArray(saved.dailyPlans) ? saved.dailyPlans : [],
    pomodoroSessions: Array.isArray(saved.pomodoroSessions)
      ? saved.pomodoroSessions
      : [],
    settings: { ...def.settings, ...(saved.settings ?? {}) },
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadPersistedState();
        if (!cancelled) {
          setState(normalizeState(saved));
        }
      } catch (err) {
        console.error("failed to load persisted state", err);
      } finally {
        if (!cancelled) {
          readyRef.current = true;
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced persistence.
  useEffect(() => {
    if (!readyRef.current) return;
    const t = setTimeout(() => {
      persistState(state).catch((err) =>
        console.error("failed to persist state", err),
      );
    }, 400);
    return () => clearTimeout(t);
  }, [state]);

  const mutate = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => fn(prev));
  }, []);

  const now = () => Date.now();

  const addProject = useCallback<StoreApi["addProject"]>((input) => {
    const project: Project = {
      id: uid("p_"),
      ...input,
      archived: false,
      createdAt: now(),
      updatedAt: now(),
    };
    mutate((s) => ({ ...s, projects: [project, ...s.projects] }));
    return project;
  }, [mutate]);

  const updateProject = useCallback<StoreApi["updateProject"]>((id, patch) => {
    mutate((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: now() } : p,
      ),
    }));
  }, [mutate]);

  const deleteProject = useCallback<StoreApi["deleteProject"]>((id) => {
    mutate((s) => {
      const taskIds = new Set(
        s.tasks.filter((t) => t.projectId === id).map((t) => t.id),
      );
      return {
        ...s,
        projects: s.projects.filter((p) => p.id !== id),
        tasks: s.tasks.filter((t) => t.projectId !== id),
        dailyPlans: s.dailyPlans.filter(
          (pl) => pl.projectId !== id && !(pl.taskId && taskIds.has(pl.taskId)),
        ),
        pomodoroSessions: s.pomodoroSessions.map((sess) =>
          sess.projectId === id
            ? { ...sess, projectId: null, taskId: null, dailyPlanId: null }
            : sess,
        ),
      };
    });
  }, [mutate]);

  const addTask = useCallback<StoreApi["addTask"]>((input) => {
    const task: Task = {
      id: uid("t_"),
      ...input,
      done: false,
      createdAt: now(),
      updatedAt: now(),
    };
    mutate((s) => ({ ...s, tasks: [task, ...s.tasks] }));
    return task;
  }, [mutate]);

  const updateTask = useCallback<StoreApi["updateTask"]>((id, patch) => {
    mutate((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: now() } : t,
      ),
    }));
  }, [mutate]);

  const deleteTask = useCallback<StoreApi["deleteTask"]>((id) => {
    mutate((s) => ({
      ...s,
      tasks: s.tasks.filter((t) => t.id !== id),
      dailyPlans: s.dailyPlans.filter((pl) => pl.taskId !== id),
      pomodoroSessions: s.pomodoroSessions.map((sess) =>
        sess.taskId === id
          ? { ...sess, taskId: null, dailyPlanId: null }
          : sess,
      ),
    }));
  }, [mutate]);

  const addDailyPlan = useCallback<StoreApi["addDailyPlan"]>((input) => {
    const plan: DailyPlan = {
      id: uid("pl_"),
      ...input,
      done: false,
      createdAt: now(),
      updatedAt: now(),
    };
    mutate((s) => ({ ...s, dailyPlans: [plan, ...s.dailyPlans] }));
    return plan;
  }, [mutate]);

  const updateDailyPlan = useCallback<StoreApi["updateDailyPlan"]>((id, patch) => {
    mutate((s) => ({
      ...s,
      dailyPlans: s.dailyPlans.map((pl) =>
        pl.id === id ? { ...pl, ...patch, updatedAt: now() } : pl,
      ),
    }));
  }, [mutate]);

  const deleteDailyPlan = useCallback<StoreApi["deleteDailyPlan"]>((id) => {
    mutate((s) => ({
      ...s,
      dailyPlans: s.dailyPlans.filter((pl) => pl.id !== id),
      pomodoroSessions: s.pomodoroSessions.map((sess) =>
        sess.dailyPlanId === id ? { ...sess, dailyPlanId: null } : sess,
      ),
    }));
  }, [mutate]);

  const addPomodoroSession = useCallback<StoreApi["addPomodoroSession"]>((input) => {
    const session: PomodoroSession = { id: uid("s_"), ...input };
    mutate((s) => ({ ...s, pomodoroSessions: [session, ...s.pomodoroSessions] }));
    return session;
  }, [mutate]);

  const updateSettings = useCallback<StoreApi["updateSettings"]>((patch) => {
    mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, [mutate]);

  const resetAll = useCallback(() => {
    setState(createDefaultState());
    clearPersistedState().catch((err) =>
      console.error("failed to clear state", err),
    );
  }, []);

  return (
    <StoreContext.Provider
      value={{
        state,
        ready,
        addProject,
        updateProject,
        deleteProject,
        addTask,
        updateTask,
        deleteTask,
        addDailyPlan,
        updateDailyPlan,
        deleteDailyPlan,
        addPomodoroSession,
        updateSettings,
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
