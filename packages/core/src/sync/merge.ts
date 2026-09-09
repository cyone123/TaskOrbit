import type {
  AppState,
  DailyPlan,
  EntityType,
  InboxItem,
  PomodoroSession,
  Project,
  Task,
  Tombstone,
} from "../types";
import { validateAppState } from "../schema";
import type { MergeResult, SyncPayloadState } from "./types";

export const TOMBSTONE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Clean expired tombstones. */
export function pruneTombstones(tombstones: Tombstone[], now = Date.now()): Tombstone[] {
  const cutoff = now - TOMBSTONE_MAX_AGE_MS;
  const latestById = new Map<string, Tombstone>();

  for (const item of tombstones) {
    if (item.deletedAt < cutoff) continue;
    const existing = latestById.get(item.id);
    if (!existing || item.deletedAt > existing.deletedAt) {
      latestById.set(item.id, item);
    }
  }

  return Array.from(latestById.values());
}

interface IdentifiableWithTimestamp {
  id: string;
  updatedAt: number;
}

function mergeEntities<T extends IdentifiableWithTimestamp>(
  localList: T[],
  remoteList: T[],
  tombstoneMap: Map<string, number>,
): { merged: T[]; revivedIds: Set<string> } {
  const localMap = new Map(localList.map((item) => [item.id, item]));
  const remoteMap = new Map(remoteList.map((item) => [item.id, item]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

  const merged: T[] = [];
  const revivedIds = new Set<string>();

  for (const id of allIds) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);
    const tombstoneDeletedAt = tombstoneMap.get(id);

    const maxUpdatedAt = Math.max(local?.updatedAt ?? 0, remote?.updatedAt ?? 0);

    // If deleted and not updated after deletion, skip it.
    if (tombstoneDeletedAt !== undefined && tombstoneDeletedAt >= maxUpdatedAt) {
      continue;
    }

    // If updated after deletion, it was revived on one peer.
    if (tombstoneDeletedAt !== undefined && maxUpdatedAt > tombstoneDeletedAt) {
      revivedIds.add(id);
    }

    if (local && remote) {
      // Last write wins (LWW)
      merged.push(remote.updatedAt > local.updatedAt ? remote : local);
    } else if (local) {
      merged.push(local);
    } else if (remote) {
      merged.push(remote);
    }
  }

  return { merged, revivedIds };
}

function mergeSessions(local: PomodoroSession[], remote: PomodoroSession[]): PomodoroSession[] {
  const byId = new Map<string, PomodoroSession>();

  // Collect all unique sessions by ID
  for (const session of local) {
    byId.set(session.id, session);
  }
  for (const session of remote) {
    if (!byId.has(session.id)) {
      byId.set(session.id, session);
    }
  }

  // Sort descending by startedAt to match Task Orbit convention
  return Array.from(byId.values()).sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * Perform a three-way / LWW intelligent merge between local AppState and remote sync payload.
 * Local credentials (webDavSettings), transient state (activeTimer), and machine-specific
 * vault paths are preserved from the local state.
 */
export function mergeAppState(
  localState: AppState,
  localTombstones: Tombstone[],
  remotePayload: SyncPayloadState,
  remoteTombstones: Tombstone[],
  now = Date.now(),
): MergeResult {
  // 1. Combine and prune tombstones
  const allTombstones = pruneTombstones([...localTombstones, ...remoteTombstones], now);
  const tombstoneMap = new Map(allTombstones.map((t) => [t.id, t.deletedAt]));

  // 2. Merge mutable entities
  const { merged: mergedProjects, revivedIds: revivedProjects } = mergeEntities<Project>(
    localState.projects,
    remotePayload.projects,
    tombstoneMap,
  );

  const { merged: rawTasks, revivedIds: revivedTasks } = mergeEntities<Task>(
    localState.tasks,
    remotePayload.tasks,
    tombstoneMap,
  );

  const { merged: rawDailyPlans, revivedIds: revivedPlans } = mergeEntities<DailyPlan>(
    localState.dailyPlans,
    remotePayload.dailyPlans,
    tombstoneMap,
  );

  const { merged: mergedInbox, revivedIds: revivedInbox } = mergeEntities<InboxItem>(
    localState.inboxItems,
    remotePayload.inboxItems,
    tombstoneMap,
  );

  // 3. Foreign key integrity enforcement:
  // Any task whose project was deleted must be discarded and marked as deleted
  const projectIds = new Set(mergedProjects.map((p) => p.id));
  const validTasks: Task[] = [];
  const cascadedTombstones: Tombstone[] = [];

  for (const task of rawTasks) {
    if (projectIds.has(task.projectId)) {
      validTasks.push(task);
    } else {
      cascadedTombstones.push({ id: task.id, type: "task", deletedAt: now });
    }
  }

  // Any daily plan whose task or project was deleted must be adjusted
  const taskIds = new Set(validTasks.map((t) => t.id));
  const validPlans: DailyPlan[] = [];

  for (const plan of rawDailyPlans) {
    let projectId = plan.projectId;
    let taskId = plan.taskId;

    if (taskId && !taskIds.has(taskId)) {
      taskId = null;
    }
    if (projectId && !projectIds.has(projectId)) {
      projectId = null;
      taskId = null;
    }

    validPlans.push({
      ...plan,
      projectId,
      taskId,
    });
  }

  // 4. Merge read-only sessions
  const mergedSessions = mergeSessions(localState.pomodoroSessions, remotePayload.pomodoroSessions);

  // 5. Clean up revived IDs from final tombstones
  const allRevived = new Set([
    ...revivedProjects,
    ...revivedTasks,
    ...revivedPlans,
    ...revivedInbox,
  ]);

  const finalTombstones = pruneTombstones(
    [...allTombstones, ...cascadedTombstones].filter((t) => !allRevived.has(t.id)),
    now,
  );

  // 6. Assemble candidate merged AppState
  const candidateState: AppState = {
    version: localState.version,
    projects: mergedProjects,
    tasks: validTasks,
    dailyPlans: validPlans,
    inboxItems: mergedInbox,
    pomodoroSessions: mergedSessions,
    settings: { ...remotePayload.settings, ...localState.settings },
    vaultSettings: { ...localState.vaultSettings },
    activeTimer: localState.activeTimer,
    webDavSettings: localState.webDavSettings,
  };

  // 7. Validate through Zod to guarantee consistency
  const validatedState = validateAppState(candidateState);

  // Check if anything changed compared to local state
  const hasChanges =
    JSON.stringify(candidateState.projects) !== JSON.stringify(localState.projects) ||
    JSON.stringify(candidateState.tasks) !== JSON.stringify(localState.tasks) ||
    JSON.stringify(candidateState.dailyPlans) !== JSON.stringify(localState.dailyPlans) ||
    JSON.stringify(candidateState.inboxItems) !== JSON.stringify(localState.inboxItems) ||
    JSON.stringify(candidateState.pomodoroSessions) !== JSON.stringify(localState.pomodoroSessions);

  return {
    mergedState: validatedState,
    mergedTombstones: finalTombstones,
    hasChanges,
  };
}

/** Record a deletion tombstone when an entity is removed locally. */
export function recordTombstone(
  currentTombstones: Tombstone[],
  id: string,
  type: EntityType,
  deletedAt = Date.now(),
): Tombstone[] {
  return pruneTombstones([...currentTombstones, { id, type, deletedAt }], deletedAt);
}
