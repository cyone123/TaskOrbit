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
import {
  clearPersistedState,
  loadPersistedState,
  persistState,
  type PersistedLoadResult,
} from "./persistence";
import { createDefaultState } from "./seed";
import { parsePersistedState, validateAppState } from "./schema";

export { STATE_VERSION } from "./version";

export interface ProjectInput {
  name: string;
  description: string;
  color: string;
  startDate: string;
  endDate: string;
}

export type ProjectPatch = Partial<ProjectInput>;

export interface TaskInput {
  projectId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  priority: Priority;
}

export type TaskPatch = Partial<
  Pick<Task, "name" | "description" | "startDate" | "endDate" | "done" | "priority">
>;

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

export type DailyPlanPatch = Partial<
  Pick<
    DailyPlan,
    | "projectId"
    | "taskId"
    | "name"
    | "description"
    | "date"
    | "startTime"
    | "endTime"
    | "done"
    | "estimatedMinutes"
  >
>;

export interface PomodoroInput {
  projectId: string | null;
  taskId: string | null;
  dailyPlanId: string | null;
  kind: PomodoroSession["kind"];
  startedAt: number;
  endedAt: number;
  minutes: number;
}

type StoreStatus = "loading" | "ready" | "error";

interface StoreApi {
  state: AppState;
  status: StoreStatus;
  ready: boolean;
  loadWarning: string | null;
  loadError: string | null;
  persistenceError: string | null;
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
  addPomodoroSession: (input: PomodoroInput) => PomodoroSession;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => Promise<void>;
}

const StoreContext = createContext<StoreApi | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireProject(state: AppState, projectId: string): Project {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("请选择一个有效的项目。");
  return project;
}

function assertPlanRelation(
  state: AppState,
  projectId: string | null,
  taskId: string | null,
  allowArchivedProject = true,
): void {
  if (projectId) {
    const project = requireProject(state, projectId);
    if (!allowArchivedProject && project.archived) {
      throw new Error("归档项目不能添加新计划。");
    }
  }
  if (!taskId) return;

  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("请选择一个有效的任务。");
  if (!projectId || task.projectId !== projectId) {
    throw new Error("计划的项目必须与任务所属项目一致。");
  }
}

function snapshotForSession(state: AppState, input: PomodoroInput) {
  const project = input.projectId
    ? state.projects.find((item) => item.id === input.projectId)
    : undefined;
  const task = input.taskId
    ? state.tasks.find((item) => item.id === input.taskId)
    : undefined;
  const plan = input.dailyPlanId
    ? state.dailyPlans.find((item) => item.id === input.dailyPlanId)
    : undefined;

  return {
    projectNameSnapshot: project?.name ?? null,
    taskNameSnapshot: task?.name ?? null,
    dailyPlanNameSnapshot: plan?.name ?? null,
  };
}

function assertPomodoroRelation(state: AppState, input: PomodoroInput): void {
  const project = input.projectId
    ? state.projects.find((item) => item.id === input.projectId)
    : undefined;
  if (input.projectId && !project) throw new Error("专注对象引用了不存在的项目。");

  const task = input.taskId
    ? state.tasks.find((item) => item.id === input.taskId)
    : undefined;
  if (input.taskId && !task) throw new Error("专注对象引用了不存在的任务。");
  if (task && input.projectId !== task.projectId) {
    throw new Error("专注对象的项目与任务不一致。");
  }

  const plan = input.dailyPlanId
    ? state.dailyPlans.find((item) => item.id === input.dailyPlanId)
    : undefined;
  if (input.dailyPlanId && !plan) throw new Error("专注对象引用了不存在的计划。");
  if (plan && (plan.projectId !== input.projectId || plan.taskId !== input.taskId)) {
    throw new Error("专注对象的项目、任务与计划不一致。");
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const readyRef = useRef(false);
  const loadRequestRef = useRef(0);
  const saveGenerationRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const loadState = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    readyRef.current = false;
    setStatus("loading");
    setLoadError(null);
    setLoadWarning(null);

    try {
      const result: PersistedLoadResult = await loadPersistedState();
      if (!mountedRef.current || requestId !== loadRequestRef.current) return;

      let nextState;
      let warning = result.warning ?? null;
      try {
        nextState = parsePersistedState(result.state);
      } catch (primaryError) {
        if (result.backupState == null) throw primaryError;
        nextState = parsePersistedState(result.backupState);
        warning = "主数据格式无效，已从备份恢复。";
      }

      setState(nextState);
      setLoadWarning(warning);
      readyRef.current = true;
      setStatus("ready");
    } catch (error) {
      if (!mountedRef.current || requestId !== loadRequestRef.current) return;
      readyRef.current = false;
      setLoadError(errorMessage(error));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadState();
    return () => {
      mountedRef.current = false;
    };
  }, [loadState]);

  // Debounced, serialized persistence. A later save waits for an earlier one
  // so a slow disk write cannot be overwritten by an older snapshot.
  useEffect(() => {
    if (!readyRef.current) return;
    const timer = window.setTimeout(() => {
      const snapshot = state;
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
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state]);

  const mutate = useCallback((fn: (s: AppState) => AppState) => {
    setState((previous) => {
      try {
        return validateAppState(fn(previous));
      } catch (error) {
        console.error("rejected invalid state mutation", error);
        return previous;
      }
    });
  }, []);

  const now = () => Date.now();

  const addProject = useCallback<StoreApi["addProject"]>((input) => {
    const createdAt = now();
    const project: Project = {
      id: uid("p_"),
      ...input,
      archived: false,
      archivedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    mutate((s) => ({ ...s, projects: [project, ...s.projects] }));
    return project;
  }, [mutate]);

  const updateProject = useCallback<StoreApi["updateProject"]>((id, patch) => {
    mutate((s) => ({
      ...s,
      projects: s.projects.map((project) =>
        project.id === id ? { ...project, ...patch, updatedAt: now() } : project,
      ),
    }));
  }, [mutate]);

  const archiveProject = useCallback<StoreApi["archiveProject"]>((id) => {
    mutate((s) => ({
      ...s,
      projects: s.projects.map((project) =>
        project.id === id
          ? { ...project, archived: true, archivedAt: now(), updatedAt: now() }
          : project,
      ),
    }));
  }, [mutate]);

  const restoreProject = useCallback<StoreApi["restoreProject"]>((id) => {
    mutate((s) => ({
      ...s,
      projects: s.projects.map((project) =>
        project.id === id
          ? { ...project, archived: false, archivedAt: null, updatedAt: now() }
          : project,
      ),
    }));
  }, [mutate]);

  /** Permanently delete an archived project and its active descendants. */
  const deleteProject = useCallback<StoreApi["deleteProject"]>((id) => {
    mutate((s) => {
      const project = s.projects.find((item) => item.id === id);
      if (!project || !project.archived) return s;

      const taskIds = new Set(
        s.tasks.filter((task) => task.projectId === id).map((task) => task.id),
      );
      const planIds = new Set(
        s.dailyPlans
          .filter((plan) => plan.projectId === id || (plan.taskId && taskIds.has(plan.taskId)))
          .map((plan) => plan.id),
      );
      const taskNames = new Map(
        s.tasks.filter((task) => taskIds.has(task.id)).map((task) => [task.id, task.name]),
      );
      const planNames = new Map(
        s.dailyPlans.filter((plan) => planIds.has(plan.id)).map((plan) => [plan.id, plan.name]),
      );

      return {
        ...s,
        projects: s.projects.filter((item) => item.id !== id),
        tasks: s.tasks.filter((task) => task.projectId !== id),
        dailyPlans: s.dailyPlans.filter((plan) => !planIds.has(plan.id)),
        pomodoroSessions: s.pomodoroSessions.map((session) => {
          const belongsToProject = session.projectId === id;
          const belongsToTask = session.taskId ? taskIds.has(session.taskId) : false;
          const belongsToPlan = session.dailyPlanId ? planIds.has(session.dailyPlanId) : false;
          if (!belongsToProject && !belongsToTask && !belongsToPlan) return session;
          return {
            ...session,
            // Keep the historical project ID as a stable grouping key even
            // though the live project entity has been permanently deleted.
            projectId:
              belongsToProject || belongsToTask || belongsToPlan ? id : session.projectId,
            taskId: null,
            dailyPlanId: null,
            projectNameSnapshot: session.projectNameSnapshot ?? project.name,
            taskNameSnapshot:
              session.taskNameSnapshot ??
              (session.taskId ? taskNames.get(session.taskId) ?? null : null),
            dailyPlanNameSnapshot:
              session.dailyPlanNameSnapshot ??
              (session.dailyPlanId ? planNames.get(session.dailyPlanId) ?? null : null),
          };
        }),
      };
    });
  }, [mutate]);

  const addTask = useCallback<StoreApi["addTask"]>((input) => {
    const createdAt = now();
    const task: Task = {
      id: uid("t_"),
      ...input,
      done: false,
      createdAt,
      updatedAt: createdAt,
    };
    mutate((s) => {
      const project = requireProject(s, input.projectId);
      if (project.archived) throw new Error("归档项目不能添加新任务。");
      return { ...s, tasks: [task, ...s.tasks] };
    });
    return task;
  }, [mutate]);

  const updateTask = useCallback<StoreApi["updateTask"]>((id, patch) => {
    mutate((s) => ({
      ...s,
      tasks: s.tasks.map((task) =>
        task.id === id ? { ...task, ...patch, updatedAt: now() } : task,
      ),
    }));
  }, [mutate]);

  const deleteTask = useCallback<StoreApi["deleteTask"]>((id) => {
    mutate((s) => {
      const task = s.tasks.find((item) => item.id === id);
      if (!task) return s;
      const planIds = new Set(
        s.dailyPlans.filter((plan) => plan.taskId === id).map((plan) => plan.id),
      );
      const planNames = new Map(
        s.dailyPlans.filter((plan) => planIds.has(plan.id)).map((plan) => [plan.id, plan.name]),
      );
      return {
        ...s,
        tasks: s.tasks.filter((item) => item.id !== id),
        dailyPlans: s.dailyPlans.filter((plan) => plan.taskId !== id),
        pomodoroSessions: s.pomodoroSessions.map((session) =>
          session.taskId === id || (session.dailyPlanId ? planIds.has(session.dailyPlanId) : false)
            ? {
                ...session,
                taskId: null,
                dailyPlanId: null,
                taskNameSnapshot: session.taskNameSnapshot ?? task.name,
                dailyPlanNameSnapshot:
                  session.dailyPlanNameSnapshot ??
                  (session.dailyPlanId ? planNames.get(session.dailyPlanId) ?? null : null),
              }
            : session,
        ),
      };
    });
  }, [mutate]);

  const addDailyPlan = useCallback<StoreApi["addDailyPlan"]>((input) => {
    const createdAt = now();
    const plan: DailyPlan = {
      id: uid("pl_"),
      ...input,
      done: false,
      createdAt,
      updatedAt: createdAt,
    };
    mutate((s) => {
      assertPlanRelation(s, input.projectId, input.taskId, false);
      return { ...s, dailyPlans: [plan, ...s.dailyPlans] };
    });
    return plan;
  }, [mutate]);

  const updateDailyPlan = useCallback<StoreApi["updateDailyPlan"]>((id, patch) => {
    mutate((s) => {
      const current = s.dailyPlans.find((plan) => plan.id === id);
      if (!current) return s;
      const projectId = patch.projectId !== undefined ? patch.projectId : current.projectId;
      const taskId = patch.taskId !== undefined ? patch.taskId : current.taskId;
      assertPlanRelation(s, projectId, taskId);
      return {
        ...s,
        dailyPlans: s.dailyPlans.map((plan) =>
          plan.id === id ? { ...plan, ...patch, updatedAt: now() } : plan,
        ),
      };
    });
  }, [mutate]);

  const deleteDailyPlan = useCallback<StoreApi["deleteDailyPlan"]>((id) => {
    mutate((s) => {
      const plan = s.dailyPlans.find((item) => item.id === id);
      if (!plan) return s;
      return {
        ...s,
        dailyPlans: s.dailyPlans.filter((item) => item.id !== id),
        pomodoroSessions: s.pomodoroSessions.map((session) =>
          session.dailyPlanId === id
            ? {
                ...session,
                dailyPlanId: null,
                dailyPlanNameSnapshot: session.dailyPlanNameSnapshot ?? plan.name,
              }
            : session,
        ),
      };
    });
  }, [mutate]);

  const addPomodoroSession = useCallback<StoreApi["addPomodoroSession"]>((input) => {
    const session: PomodoroSession = {
      id: uid("s_"),
      ...input,
      projectNameSnapshot: null,
      taskNameSnapshot: null,
      dailyPlanNameSnapshot: null,
    };
    mutate((s) => {
      assertPomodoroRelation(s, input);
      return {
        ...s,
        pomodoroSessions: [
          { ...session, ...snapshotForSession(s, input) },
          ...s.pomodoroSessions,
        ],
      };
    });
    return session;
  }, [mutate]);

  const updateSettings = useCallback<StoreApi["updateSettings"]>((patch) => {
    mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, [mutate]);

  const resetAll = useCallback(async () => {
    saveGenerationRef.current += 1;
    await saveQueueRef.current.catch(() => undefined);
    try {
      await clearPersistedState();
      if (!mountedRef.current) return;
      setState(createDefaultState());
      setLoadError(null);
      setLoadWarning(null);
      setPersistenceError(null);
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
        retryLoad,
        addProject,
        updateProject,
        archiveProject,
        restoreProject,
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
