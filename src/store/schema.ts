import { z } from "zod";
import type { AppState } from "../types";
import { migratePersistedState } from "./migrations";
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
});

const persistedEnvelopeSchema = z
  .object({
    version: z.number().int().optional(),
    projects: z.array(z.unknown()).optional(),
    tasks: z.array(z.unknown()).optional(),
    dailyPlans: z.array(z.unknown()).optional(),
    pomodoroSessions: z.array(z.unknown()).optional(),
    settings: z.unknown().optional(),
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

  return parsed;
}
