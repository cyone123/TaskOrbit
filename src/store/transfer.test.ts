import { describe, expect, it } from "vitest";
import { createEmptyState } from "./schema";
import {
  parseImportSnapshot,
  serializeExportSnapshot,
} from "./transfer";

describe("snapshot transfer", () => {
  it("exports an envelope without the active timer and imports it back", () => {
    const state = {
      ...createEmptyState(),
      activeTimer: {
        projectId: null,
        taskId: null,
        dailyPlanId: null,
        phase: "focus" as const,
        status: "paused" as const,
        focusCount: 0,
        durationMs: 25 * 60_000,
        remainingMs: 25 * 60_000,
        phaseStartedAt: null,
        endAt: null,
      },
    };
    const exported = JSON.parse(serializeExportSnapshot(state, 123));

    expect(exported.format).toBe("task-orbit-export");
    expect(exported.exportedAt).toBe(123);
    expect(exported.state.activeTimer).toBeNull();
    expect(parseImportSnapshot(exported)).toMatchObject({
      version: 3,
      activeTimer: null,
    });
  });

  it("imports a legacy raw v2 state and clears any runtime timer", () => {
    const state = parseImportSnapshot({
      version: 2,
      projects: [],
      tasks: [],
      dailyPlans: [],
      pomodoroSessions: [],
      settings: {},
    });

    expect(state.version).toBe(3);
    expect(state.activeTimer).toBeNull();
  });

  it("rejects a future export format", () => {
    expect(() =>
      parseImportSnapshot({
        format: "task-orbit-export",
        formatVersion: 999,
        exportedAt: 1,
        state: createEmptyState(),
      }),
    ).toThrow("高于当前版本");
  });
});
