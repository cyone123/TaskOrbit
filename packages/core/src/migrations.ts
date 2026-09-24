import {
  DEFAULT_SETTINGS,
  DEFAULT_VAULT_SETTINGS,
  DEFAULT_WEBDAV_SETTINGS,
} from "./schemaDefaults";
import { STATE_VERSION } from "./version";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * v1 did not have archive timestamps or snapshots for historical sessions.
 * Add those fields while the related entities are still available so old
 * history keeps its human-readable labels after a later permanent delete.
 */
function migrateV1ToV2(input: JsonRecord): JsonRecord {
  const projects = asArray(input.projects);
  const tasks = asArray(input.tasks);
  const plans = asArray(input.dailyPlans);
  const sessions = asArray(input.pomodoroSessions);

  const projectNames = new Map<string, string>();
  const taskNames = new Map<string, string>();
  const planNames = new Map<string, string>();
  const taskProjects = new Map<string, string>();

  for (const project of projects) {
    const id = asString(project.id);
    const name = asString(project.name);
    if (id && name) projectNames.set(id, name);
  }
  for (const task of tasks) {
    const id = asString(task.id);
    const name = asString(task.name);
    const projectId = asString(task.projectId);
    if (id && name) taskNames.set(id, name);
    if (id && projectId) taskProjects.set(id, projectId);
  }
  for (const plan of plans) {
    const id = asString(plan.id);
    const name = asString(plan.name);
    if (id && name) planNames.set(id, name);
  }

  return {
    ...input,
    version: 2,
    projects: projects.map((project) => ({
      ...project,
      archivedAt: project.archivedAt ?? null,
    })),
    tasks,
    dailyPlans: plans,
    pomodoroSessions: sessions.map((session) => {
      const projectId = asString(session.projectId);
      const taskId = asString(session.taskId);
      const dailyPlanId = asString(session.dailyPlanId);
      const resolvedProjectId = projectId ?? (taskId ? taskProjects.get(taskId) : null);
      return {
        ...session,
        projectNameSnapshot:
          session.projectNameSnapshot ??
          (resolvedProjectId ? projectNames.get(resolvedProjectId) ?? null : null),
        taskNameSnapshot:
          session.taskNameSnapshot ?? (taskId ? taskNames.get(taskId) ?? null : null),
        dailyPlanNameSnapshot:
          session.dailyPlanNameSnapshot ??
          (dailyPlanId ? planNames.get(dailyPlanId) ?? null : null),
      };
    }),
    settings: { ...DEFAULT_SETTINGS, ...asRecord(input.settings) },
  };
}

/** v3 adds the persisted active timer. Existing data has no running timer. */
function migrateV2ToV3(input: JsonRecord): JsonRecord {
  return {
    ...input,
    version: 3,
    activeTimer: input.activeTimer ?? null,
  };
}

/** v4 adds repeat metadata to every persisted daily-plan occurrence. */
function migrateV3ToV4(input: JsonRecord): JsonRecord {
  return {
    ...input,
    version: 4,
    dailyPlans: asArray(input.dailyPlans).map((plan) => ({
      ...plan,
      recurrence: plan.recurrence ?? {
        frequency: "none",
        count: 1,
        seriesId: null,
        occurrence: 1,
      },
    })),
  };
}

/** v5 adds the local Obsidian-compatible Vault connection settings. */
function migrateV4ToV5(input: JsonRecord): JsonRecord {
  return {
    ...input,
    version: 5,
    vaultSettings: { ...DEFAULT_VAULT_SETTINGS, ...asRecord(input.vaultSettings) },
  };
}

/** v6 adds the lightweight capture inbox. */
function migrateV5ToV6(input: JsonRecord): JsonRecord {
  return {
    ...input,
    version: 6,
    inboxItems: asArray(input.inboxItems),
  };
}

/** v7 adds WebDAV synchronization settings. */
function migrateV6ToV7(input: JsonRecord): JsonRecord {
  return {
    ...input,
    version: 7,
    webDavSettings: { ...DEFAULT_WEBDAV_SETTINGS, ...asRecord(input.webDavSettings) },
  };
}

/** v8 adds calendar display settings to settings. */
function migrateV7ToV8(input: JsonRecord): JsonRecord {
  return {
    ...input,
    version: STATE_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...asRecord(input.settings) },
  };
}

/** Apply every migration from the stored version to the current version. */
export function migratePersistedState(raw: unknown): unknown {
  const input = asRecord(raw);
  const rawVersion = input.version;
  const version = typeof rawVersion === "number" && Number.isInteger(rawVersion) ? rawVersion : 1;

  if (version > STATE_VERSION) {
    throw new Error(
      `数据版本 ${version} 高于当前版本 ${STATE_VERSION}，请升级应用后再打开。`,
    );
  }

  let migrated = input;
  if (version <= 1) migrated = migrateV1ToV2(migrated);
  if (version <= 2) migrated = migrateV2ToV3(migrated);
  if (version <= 3) migrated = migrateV3ToV4(migrated);
  if (version <= 4) migrated = migrateV4ToV5(migrated);
  if (version <= 5) migrated = migrateV5ToV6(migrated);
  if (version <= 6) migrated = migrateV6ToV7(migrated);
  if (version <= 7) migrated = migrateV7ToV8(migrated);

  return migrated;
}
