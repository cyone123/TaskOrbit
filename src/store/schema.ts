import { z } from "zod";
import type { AppState } from "../types";
import { migratePersistedState } from "./migrations";
import { MAX_DAILY_PLAN_REPEAT_COUNT } from "./recurrence";
import { DEFAULT_SETTINGS } from "./schemaDefaults";
import { STATE_VERSION } from "./version";

export { STATE_VERSION } from "./version";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isValidISODate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

const isoDate = z.string().refine(isValidISODate, "必须是有效的 YYYY-MM-DD 日期");
const time = z.string().regex(HHMM_RE, "必须是有效的 HH:mm 时间");
const timestamp = z.number().int().nonnegative();

const dailyPlanRecurrenceSchema = z
  .object({
    frequency: z.enum(["none", "daily", "weekly", "monthly"]),
    count: z.number().int().min(1).max(MAX_DAILY_PLAN_REPEAT_COUNT),
    seriesId: z.string().min(1).nullable(),
    occurrence: z.number().int().min(1).max(MAX_DAILY_PLAN_REPEAT_COUNT),
  })
  .superRefine((recurrence, ctx) => {
    if (recurrence.frequency === "none") {
      if (recurrence.count !== 1 || recurrence.seriesId !== null || recurrence.occurrence !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["frequency"],
          message: "不重复计划的重复信息必须是单次执行",
        });
      }
      return;
    }
    if (recurrence.count < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["count"],
        message: "重复计划至少需要执行 2 次",
      });
    }
    if (!recurrence.seriesId) {
      ctx.addIssue({
        code: "custom",
        path: ["seriesId"],
        message: "重复计划必须包含系列 ID",
      });
    }
    if (recurrence.occurrence > recurrence.count) {
      ctx.addIssue({
        code: "custom",
        path: ["occurrence"],
        message: "重复计划序号不能大于总次数",
      });
    }
  });

const projectSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    description: z.string(),
    color: z.string().min(1),
    startDate: isoDate,
    endDate: isoDate,
    archived: z.boolean(),
    archivedAt: timestamp.nullable().default(null),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .passthrough()
  .superRefine((project, ctx) => {
    if (project.endDate < project.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "结束日期不能早于开始日期",
      });
    }
  });

const taskSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    name: z.string().trim().min(1),
    description: z.string(),
    startDate: isoDate,
    endDate: isoDate,
    done: z.boolean(),
    priority: z.enum(["low", "medium", "high"]),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .passthrough()
  .superRefine((task, ctx) => {
    if (task.endDate < task.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "结束日期不能早于开始日期",
      });
    }
  });

const dailyPlanSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1).nullable(),
    taskId: z.string().min(1).nullable(),
    name: z.string().trim().min(1),
    description: z.string(),
    date: isoDate,
    startTime: time,
    endTime: time,
    done: z.boolean(),
    estimatedMinutes: z.number().int().min(1).default(60),
    recurrence: dailyPlanRecurrenceSchema,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .passthrough()
  .superRefine((plan, ctx) => {
    if (plan.endTime <= plan.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "结束时间必须晚于开始时间",
      });
    }
    if (plan.taskId && !plan.projectId) {
      ctx.addIssue({
        code: "custom",
        path: ["projectId"],
        message: "任务计划必须同时关联项目",
      });
    }
  });

const pomodoroSessionSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1).nullable(),
    taskId: z.string().min(1).nullable(),
    dailyPlanId: z.string().min(1).nullable(),
    projectNameSnapshot: z.string().nullable().default(null),
    taskNameSnapshot: z.string().nullable().default(null),
    dailyPlanNameSnapshot: z.string().nullable().default(null),
    kind: z.enum(["focus", "shortBreak", "longBreak"]),
    startedAt: timestamp,
    endedAt: timestamp,
    minutes: z.number().int().min(1),
  })
  .superRefine((session, ctx) => {
    if (session.endedAt < session.startedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "结束时间不能早于开始时间",
      });
    }
  });

const activeTimerSchema = z
  .object({
    projectId: z.string().min(1).nullable(),
    taskId: z.string().min(1).nullable(),
    dailyPlanId: z.string().min(1).nullable(),
    phase: z.enum(["focus", "shortBreak", "longBreak"]),
    status: z.enum(["running", "paused"]),
    focusCount: z.number().int().min(0),
    durationMs: z.number().int().min(1),
    remainingMs: z.number().int().min(0),
    phaseStartedAt: timestamp.nullable(),
    endAt: timestamp.nullable(),
  })
  .superRefine((timer, ctx) => {
    if (timer.remainingMs > timer.durationMs) {
      ctx.addIssue({
        code: "custom",
        path: ["remainingMs"],
        message: "剩余时间不能大于阶段总时长",
      });
    }
    if (timer.status === "running" && (timer.phaseStartedAt === null || timer.endAt === null)) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "运行中的计时器必须包含开始时间和结束时间",
      });
    }
    if (timer.status === "paused" && timer.endAt !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "暂停中的计时器不能包含结束时间",
      });
    }
  });

export const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default(DEFAULT_SETTINGS.theme),
  focusMinutes: z.number().int().min(1).default(DEFAULT_SETTINGS.focusMinutes),
  shortBreakMinutes: z.number().int().min(1).default(DEFAULT_SETTINGS.shortBreakMinutes),
  longBreakMinutes: z.number().int().min(1).default(DEFAULT_SETTINGS.longBreakMinutes),
  longBreakInterval: z.number().int().min(1).default(DEFAULT_SETTINGS.longBreakInterval),
});

export const appStateSchema = z.object({
  version: z.literal(STATE_VERSION),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
  dailyPlans: z.array(dailyPlanSchema),
  pomodoroSessions: z.array(pomodoroSessionSchema),
  settings: settingsSchema,
  activeTimer: activeTimerSchema.nullable(),
});

const persistedEnvelopeSchema = z
  .object({
    version: z.number().int().optional(),
    projects: z.array(z.unknown()).optional(),
    tasks: z.array(z.unknown()).optional(),
    dailyPlans: z.array(z.unknown()).optional(),
    pomodoroSessions: z.array(z.unknown()).optional(),
    settings: z.unknown().optional(),
    activeTimer: z.unknown().optional(),
  })
  .passthrough();

export function createEmptyState(): AppState {
  return {
    version: STATE_VERSION,
    projects: [],
    tasks: [],
    dailyPlans: [],
    pomodoroSessions: [],
    settings: { ...DEFAULT_SETTINGS },
    activeTimer: null,
  };
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "state"}: ${issue.message}`)
    .join("；");
}

/** Parse, migrate and validate untrusted persisted data. */
export function parsePersistedState(raw: unknown): AppState {
  if (raw == null) return createEmptyState();

  const envelope = persistedEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    throw new Error(`数据结构无效：${formatIssues(envelope.error)}`);
  }

  const migrated = migratePersistedState({
    ...envelope.data,
    projects: envelope.data.projects ?? [],
    tasks: envelope.data.tasks ?? [],
    dailyPlans: envelope.data.dailyPlans ?? [],
    pomodoroSessions: envelope.data.pomodoroSessions ?? [],
    settings: envelope.data.settings ?? {},
    activeTimer: envelope.data.activeTimer ?? null,
  });
  const parsed = appStateSchema.safeParse(migrated);
  if (!parsed.success) {
    throw new Error(`数据校验失败：${formatIssues(parsed.error)}`);
  }
  return validateAppState(parsed.data as AppState);
}

/** Validate both record shapes and the active entity relationships. */
export function validateAppState(state: AppState): AppState {
  const parsed = appStateSchema.parse(state) as AppState;
  const projectIds = new Set(parsed.projects.map((project) => project.id));
  const taskById = new Map(parsed.tasks.map((task) => [task.id, task]));

  for (const task of parsed.tasks) {
    if (!projectIds.has(task.projectId)) {
      throw new Error(`任务「${task.name}」引用了不存在的项目。`);
    }
  }

  for (const plan of parsed.dailyPlans) {
    if (plan.projectId && !projectIds.has(plan.projectId)) {
      throw new Error(`计划「${plan.name}」引用了不存在的项目。`);
    }
    if (plan.taskId) {
      const task = taskById.get(plan.taskId);
      if (!task) throw new Error(`计划「${plan.name}」引用了不存在的任务。`);
      if (plan.projectId !== task.projectId) {
        throw new Error(`计划「${plan.name}」的项目与任务不一致。`);
      }
    }
  }

  const timer = parsed.activeTimer;
  if (timer) {
    if (timer.projectId && !projectIds.has(timer.projectId)) {
      throw new Error("计时器引用了不存在的项目。");
    }
    if (timer.taskId) {
      const task = taskById.get(timer.taskId);
      if (!task) throw new Error("计时器引用了不存在的任务。");
      if (timer.projectId !== task.projectId) {
        throw new Error("计时器的项目与任务不一致。");
      }
    }
    if (timer.dailyPlanId) {
      const plan = parsed.dailyPlans.find((item) => item.id === timer.dailyPlanId);
      if (!plan) throw new Error("计时器引用了不存在的计划。");
      if (plan.projectId !== timer.projectId || plan.taskId !== timer.taskId) {
        throw new Error("计时器的项目、任务与计划不一致。");
      }
    }
  }

  return parsed;
}
