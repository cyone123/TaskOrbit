import { describe, expect, it } from "vitest";
import { createEmptyState } from "../schema";
import type { AppState, DailyPlan, Project, Task, Tombstone } from "../types";
import { mergeAppState, pruneTombstones, recordTombstone, TOMBSTONE_MAX_AGE_MS } from "./merge";
import type { SyncPayloadState } from "./types";

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...createEmptyState(),
    ...overrides,
  };
}

function toPayload(state: AppState): SyncPayloadState {
  const { activeTimer: _a, webDavSettings: _w, ...payload } = state;
  return payload;
}

const mockProject: Project = {
  id: "p1",
  name: "项目一",
  description: "",
  color: "blue",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  archived: false,
  archivedAt: null,
  createdAt: 1000,
  updatedAt: 1000,
};

const mockTask: Task = {
  id: "t1",
  projectId: "p1",
  name: "任务一",
  description: "",
  startDate: "2026-09-01",
  endDate: "2026-09-05",
  done: false,
  priority: "medium",
  createdAt: 1000,
  updatedAt: 1000,
};

describe("sync/merge", () => {
  it("merges newly created entities from both sides", () => {
    const local = makeState({
      projects: [mockProject],
      tasks: [mockTask],
    });

    const remoteProject: Project = {
      ...mockProject,
      id: "p2",
      name: "远端项目",
      createdAt: 2000,
      updatedAt: 2000,
    };
    const remote = toPayload(makeState({ projects: [remoteProject] }));

    const result = mergeAppState(local, [], remote, []);
    expect(result.hasChanges).toBe(true);
    expect(result.mergedState.projects).toHaveLength(2);
    expect(result.mergedState.tasks).toHaveLength(1);
  });

  it("applies Last-Write-Wins (LWW) on concurrent property edits", () => {
    const local = makeState({
      projects: [mockProject],
      tasks: [{ ...mockTask, name: "本地修改名称", updatedAt: 2000 }],
    });

    const remote = toPayload(
      makeState({
        projects: [mockProject],
        tasks: [{ ...mockTask, name: "远端修改名称 (最新)", done: true, updatedAt: 3000 }],
      }),
    );

    const result = mergeAppState(local, [], remote, []);
    expect(result.mergedState.tasks[0].name).toBe("远端修改名称 (最新)");
    expect(result.mergedState.tasks[0].done).toBe(true);
  });

  it("deletes entity when tombstone exists and entity was not updated after deletion", () => {
    const local = makeState({
      projects: [mockProject],
      tasks: [mockTask], // local still has it
    });

    const remote = toPayload(
      makeState({
        projects: [mockProject],
        tasks: [], // remote deleted it
      }),
    );
    const remoteTombstones: Tombstone[] = [{ id: "t1", type: "task", deletedAt: 2000 }];

    const result = mergeAppState(local, [], remote, remoteTombstones, 5000);
    expect(result.mergedState.tasks).toHaveLength(0);
    expect(result.mergedTombstones).toHaveLength(1);
    expect(result.mergedTombstones[0].id).toBe("t1");
  });

  it("revives entity if updated after tombstone deletion time", () => {
    const local = makeState({
      projects: [mockProject],
      tasks: [{ ...mockTask, updatedAt: 3000, name: "删除后的新修改" }],
    });

    const remote = toPayload(makeState({ projects: [mockProject], tasks: [] }));
    const remoteTombstones: Tombstone[] = [{ id: "t1", type: "task", deletedAt: 2000 }];

    const result = mergeAppState(local, [], remote, remoteTombstones, 5000);
    expect(result.mergedState.tasks).toHaveLength(1);
    expect(result.mergedState.tasks[0].name).toBe("删除后的新修改");
    // Tombstone should be removed since entity was revived
    expect(result.mergedTombstones.find((t) => t.id === "t1")).toBeUndefined();
  });

  it("cascades deletion of tasks when their project was deleted", () => {
    const local = makeState({
      projects: [], // Project was deleted
      tasks: [],
    });
    const localTombstones: Tombstone[] = [{ id: "p1", type: "project", deletedAt: 2000 }];

    const remote = toPayload(
      makeState({
        projects: [mockProject],
        tasks: [mockTask],
      }),
    );

    const result = mergeAppState(local, localTombstones, remote, [], 5000);
    // Task t1 belongs to p1 which is deleted; it must not be retained
    expect(result.mergedState.projects).toHaveLength(0);
    expect(result.mergedState.tasks).toHaveLength(0);
    // Should have created cascaded tombstone for task
    expect(result.mergedTombstones.some((t) => t.id === "t1")).toBe(true);
  });

  it("merges and deduplicates pomodoro sessions", () => {
    const s1 = {
      id: "s1",
      projectId: null,
      taskId: null,
      dailyPlanId: null,
      projectNameSnapshot: null,
      taskNameSnapshot: null,
      dailyPlanNameSnapshot: null,
      kind: "focus" as const,
      startedAt: 1000,
      endedAt: 2500,
      minutes: 25,
    };
    const s2 = { ...s1, id: "s2", startedAt: 3000, endedAt: 4500 };

    const local = makeState({ pomodoroSessions: [s1] });
    const remote = toPayload(makeState({ pomodoroSessions: [s1, s2] }));

    const result = mergeAppState(local, [], remote, []);
    expect(result.mergedState.pomodoroSessions).toHaveLength(2);
    expect(result.mergedState.pomodoroSessions[0].id).toBe("s2"); // sorted by startedAt desc
  });

  it("prunes tombstones older than 30 days", () => {
    const now = 100_000_000_000;
    const oldTombstone: Tombstone = {
      id: "old",
      type: "task",
      deletedAt: now - TOMBSTONE_MAX_AGE_MS - 1000,
    };
    const freshTombstone: Tombstone = {
      id: "fresh",
      type: "task",
      deletedAt: now - 1000,
    };

    const pruned = pruneTombstones([oldTombstone, freshTombstone], now);
    expect(pruned).toHaveLength(1);
    expect(pruned[0].id).toBe("fresh");
  });
});
