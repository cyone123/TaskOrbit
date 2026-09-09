import type {
  AppState,
  DailyPlan,
  DailyPlanRecurrence,
  DailyPlanRepeat,
  InboxItem,
  InboxItemKind,
  PomodoroLink,
  PomodoroSession,
  Priority,
  Project,
  Task,
  Settings,
  VaultSettings,
  WebDavSettings,
} from "./types";
import { uid } from "./id";
import { expandDailyPlanDates, normalizeDailyPlanRepeat } from "./recurrence";

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

export interface InboxItemInput {
  kind: InboxItemKind;
  content: string;
}

export type InboxItemPatch = Partial<Pick<InboxItem, "content" | "done">>;

export interface DailyPlanInput {
  projectId: string | null;
  taskId: string | null;
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  estimatedMinutes: number;
  /** Optional creation-time rule; persisted plans contain concrete recurrence metadata. */
  repeat?: DailyPlanRepeat;
  /** Total occurrences, including the initial date. */
  repeatCount?: number;
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

export interface PomodoroInput extends PomodoroLink {
  kind: PomodoroSession["kind"];
  startedAt: number;
  endedAt: number;
  minutes: number;
}

function requireProject(state: AppState, projectId: string): Project {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("请选择一个有效的项目。");
  return project;
}

export function assertPlanRelation(
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

export function assertPomodoroRelation(state: AppState, input: PomodoroLink): void {
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

function sessionSnapshots(state: AppState, input: PomodoroLink) {
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

export function createProject(input: ProjectInput, createdAt = Date.now()): Project {
  return {
    id: uid("p_"),
    ...input,
    archived: false,
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

export function appendProject(state: AppState, project: Project): AppState {
  return { ...state, projects: [project, ...state.projects] };
}

export function updateProjectState(
  state: AppState,
  id: string,
  patch: ProjectPatch,
  updatedAt = Date.now(),
): AppState {
  return {
    ...state,
    projects: state.projects.map((project) =>
      project.id === id ? { ...project, ...patch, updatedAt } : project,
    ),
  };
}

export function archiveProjectState(state: AppState, id: string, archivedAt = Date.now()): AppState {
  return {
    ...state,
    projects: state.projects.map((project) =>
      project.id === id
        ? { ...project, archived: true, archivedAt, updatedAt: archivedAt }
        : project,
    ),
  };
}

export function restoreProjectState(state: AppState, id: string, updatedAt = Date.now()): AppState {
  return {
    ...state,
    projects: state.projects.map((project) =>
      project.id === id
        ? { ...project, archived: false, archivedAt: null, updatedAt }
        : project,
    ),
  };
}

function timerReferencesProject(state: AppState, id: string): boolean {
  const timer = state.activeTimer;
  return Boolean(
    timer &&
      (timer.projectId === id ||
        (timer.taskId && state.tasks.some((task) => task.id === timer.taskId && task.projectId === id)) ||
        (timer.dailyPlanId &&
          state.dailyPlans.some((plan) => plan.id === timer.dailyPlanId && plan.projectId === id))),
  );
}

export function deleteProjectState(state: AppState, id: string): AppState {
  const project = state.projects.find((item) => item.id === id);
  if (!project || !project.archived) return state;

  const taskIds = new Set(
    state.tasks.filter((task) => task.projectId === id).map((task) => task.id),
  );
  const planIds = new Set(
    state.dailyPlans
      .filter((plan) => plan.projectId === id || (plan.taskId && taskIds.has(plan.taskId)))
      .map((plan) => plan.id),
  );
  const taskNames = new Map(
    state.tasks.filter((task) => taskIds.has(task.id)).map((task) => [task.id, task.name]),
  );
  const planNames = new Map(
    state.dailyPlans.filter((plan) => planIds.has(plan.id)).map((plan) => [plan.id, plan.name]),
  );

  return {
    ...state,
    projects: state.projects.filter((item) => item.id !== id),
    tasks: state.tasks.filter((task) => task.projectId !== id),
    dailyPlans: state.dailyPlans.filter((plan) => !planIds.has(plan.id)),
    activeTimer: timerReferencesProject(state, id) ? null : state.activeTimer,
    pomodoroSessions: state.pomodoroSessions.map((session) => {
      const belongsToProject = session.projectId === id;
      const belongsToTask = session.taskId ? taskIds.has(session.taskId) : false;
      const belongsToPlan = session.dailyPlanId ? planIds.has(session.dailyPlanId) : false;
      if (!belongsToProject && !belongsToTask && !belongsToPlan) return session;
      return {
        ...session,
        projectId: id,
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
}

export function createTask(input: TaskInput, createdAt = Date.now()): Task {
  return {
    id: uid("t_"),
    ...input,
    done: false,
    createdAt,
    updatedAt: createdAt,
  };
}

export function appendTask(state: AppState, task: Task): AppState {
  const project = requireProject(state, task.projectId);
  if (project.archived) throw new Error("归档项目不能添加新任务。");
  return { ...state, tasks: [task, ...state.tasks] };
}

export function updateTaskState(
  state: AppState,
  id: string,
  patch: TaskPatch,
  updatedAt = Date.now(),
): AppState {
  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === id ? { ...task, ...patch, updatedAt } : task,
    ),
  };
}

export function deleteTaskState(state: AppState, id: string): AppState {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return state;
  const planIds = new Set(
    state.dailyPlans.filter((plan) => plan.taskId === id).map((plan) => plan.id),
  );
  const planNames = new Map(
    state.dailyPlans.filter((plan) => planIds.has(plan.id)).map((plan) => [plan.id, plan.name]),
  );

  return {
    ...state,
    tasks: state.tasks.filter((item) => item.id !== id),
    dailyPlans: state.dailyPlans.filter((plan) => plan.taskId !== id),
    activeTimer:
      state.activeTimer?.taskId === id ||
      (state.activeTimer?.dailyPlanId ? planIds.has(state.activeTimer.dailyPlanId) : false)
        ? null
        : state.activeTimer,
    pomodoroSessions: state.pomodoroSessions.map((session) =>
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
}

export function createInboxItem(input: InboxItemInput, createdAt = Date.now()): InboxItem {
  return {
    id: uid("i_"),
    kind: input.kind,
    content: input.content.trim(),
    done: false,
    createdAt,
    updatedAt: createdAt,
  };
}

export function appendInboxItem(state: AppState, item: InboxItem): AppState {
  return { ...state, inboxItems: [item, ...state.inboxItems] };
}

export function updateInboxItemState(
  state: AppState,
  id: string,
  patch: InboxItemPatch,
  updatedAt = Date.now(),
): AppState {
  return {
    ...state,
    inboxItems: state.inboxItems.map((item) =>
      item.id === id
        ? {
            ...item,
            ...patch,
            content: patch.content === undefined ? item.content : patch.content.trim(),
            updatedAt,
          }
        : item,
    ),
  };
}

export function deleteInboxItemState(state: AppState, id: string): AppState {
  return {
    ...state,
    inboxItems: state.inboxItems.filter((item) => item.id !== id),
  };
}

function createDailyPlanOccurrence(
  input: DailyPlanInput,
  recurrence: DailyPlanRecurrence,
  createdAt: number,
): DailyPlan {
  const { repeat: _repeat, repeatCount: _repeatCount, ...planInput } = input;
  return {
    id: uid("pl_"),
    ...planInput,
    recurrence,
    done: false,
    createdAt,
    updatedAt: createdAt,
  };
}

/** Create the first occurrence for compatibility with the existing CRUD API. */
export function createDailyPlan(input: DailyPlanInput, createdAt = Date.now()): DailyPlan {
  return createDailyPlans(input, createdAt)[0];
}

/** Expand a creation-time repeat rule into concrete persisted plan instances. */
export function createDailyPlans(input: DailyPlanInput, createdAt = Date.now()): DailyPlan[] {
  const repeat = normalizeDailyPlanRepeat(input.repeat, input.repeatCount);
  const dates = expandDailyPlanDates(input.date, repeat.frequency, repeat.count);
  const seriesId = repeat.frequency === "none" ? null : uid("prs_");

  return dates.map((date, index) =>
    createDailyPlanOccurrence(
      { ...input, date },
      {
        frequency: repeat.frequency,
        count: repeat.count,
        seriesId,
        occurrence: index + 1,
      },
      createdAt,
    ),
  );
}

export function appendDailyPlans(state: AppState, plans: DailyPlan[]): AppState {
  for (const plan of plans) {
    assertPlanRelation(state, plan.projectId, plan.taskId, false);
  }
  return { ...state, dailyPlans: [...plans, ...state.dailyPlans] };
}

export function appendDailyPlan(state: AppState, plan: DailyPlan): AppState {
  return appendDailyPlans(state, [plan]);
}

export function updateDailyPlanState(
  state: AppState,
  id: string,
  patch: DailyPlanPatch,
  updatedAt = Date.now(),
): AppState {
  const current = state.dailyPlans.find((plan) => plan.id === id);
  if (!current) return state;
  const projectId = patch.projectId !== undefined ? patch.projectId : current.projectId;
  const taskId = patch.taskId !== undefined ? patch.taskId : current.taskId;
  assertPlanRelation(state, projectId, taskId);
  return {
    ...state,
    dailyPlans: state.dailyPlans.map((plan) =>
      plan.id === id ? { ...plan, ...patch, updatedAt } : plan,
    ),
  };
}

export function deleteDailyPlanState(state: AppState, id: string): AppState {
  const plan = state.dailyPlans.find((item) => item.id === id);
  if (!plan) return state;
  return {
    ...state,
    dailyPlans: state.dailyPlans.filter((item) => item.id !== id),
    activeTimer: state.activeTimer?.dailyPlanId === id ? null : state.activeTimer,
    pomodoroSessions: state.pomodoroSessions.map((session) =>
      session.dailyPlanId === id
        ? {
            ...session,
            dailyPlanId: null,
            dailyPlanNameSnapshot: session.dailyPlanNameSnapshot ?? plan.name,
          }
        : session,
    ),
  };
}

export function createPomodoroSession(
  state: AppState,
  input: PomodoroInput,
  id = uid("s_"),
): PomodoroSession {
  assertPomodoroRelation(state, input);
  return {
    id,
    ...input,
    ...sessionSnapshots(state, input),
  };
}

export function appendPomodoroSession(
  state: AppState,
  input: PomodoroInput,
  id = uid("s_"),
): { state: AppState; session: PomodoroSession } {
  const session = createPomodoroSession(state, input, id);
  return {
    state: {
      ...state,
      pomodoroSessions: [session, ...state.pomodoroSessions],
    },
    session,
  };
}

export function updateSettingsState(state: AppState, patch: Partial<Settings>): AppState {
  return { ...state, settings: { ...state.settings, ...patch } };
}

export function updateVaultSettingsState(
  state: AppState,
  patch: Partial<VaultSettings>,
): AppState {
  return { ...state, vaultSettings: { ...state.vaultSettings, ...patch } };
}

export function updateWebDavSettingsState(
  state: AppState,
  patch: Partial<WebDavSettings>,
): AppState {
  return { ...state, webDavSettings: { ...state.webDavSettings, ...patch } };
}
