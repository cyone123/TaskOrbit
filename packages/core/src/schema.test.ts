import { describe, expect, it } from "vitest";
import { createEmptyState, parsePersistedState } from "./schema";

describe("persisted state schema", () => {
  it("starts with an empty state", () => {
    const state = createEmptyState();

    expect(state.version).toBe(6);
    expect(state.projects).toHaveLength(0);
    expect(state.tasks).toHaveLength(0);
    expect(state.dailyPlans).toHaveLength(0);
    expect(state.inboxItems).toHaveLength(0);
    expect(state.pomodoroSessions).toHaveLength(0);
    expect(state.activeTimer).toBeNull();
  });

  it("migrates v1 project and session data", () => {
    const state = parsePersistedState({
      version: 1,
      projects: [
        {
          id: "p_1",
          name: "项目一",
          description: "",
          color: "blue",
          startDate: "2026-08-17",
          endDate: "2026-08-20",
          archived: false,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      tasks: [],
      dailyPlans: [],
      pomodoroSessions: [
        {
          id: "s_1",
          projectId: "p_1",
          taskId: null,
          dailyPlanId: null,
          kind: "focus",
          startedAt: 100,
          endedAt: 1_600,
          minutes: 25,
        },
      ],
      settings: {
        theme: "system",
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
      },
    });

    expect(state.version).toBe(6);
    expect(state.projects[0].archivedAt).toBeNull();
    expect(state.pomodoroSessions[0].projectNameSnapshot).toBe("项目一");
  });

  it("rejects an orphan task relationship", () => {
    expect(() =>
      parsePersistedState({
        version: 2,
        projects: [],
        tasks: [
          {
            id: "t_1",
            projectId: "missing",
            name: "孤儿任务",
            description: "",
            startDate: "2026-08-17",
            endDate: "2026-08-17",
            done: false,
            priority: "medium",
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        dailyPlans: [],
        pomodoroSessions: [],
        settings: {},
      }),
    ).toThrow("引用了不存在的项目");
  });

  it("migrates v2 data without an active timer", () => {
    const state = parsePersistedState({
      version: 2,
      projects: [],
      tasks: [],
      dailyPlans: [],
      pomodoroSessions: [],
      settings: {},
    });

    expect(state.version).toBe(6);
    expect(state.activeTimer).toBeNull();
  });

  it("migrates v3 daily plans to non-repeating occurrences", () => {
    const state = parsePersistedState({
      version: 3,
      projects: [],
      tasks: [],
      dailyPlans: [
        {
          id: "pl_1",
          projectId: null,
          taskId: null,
          name: "旧计划",
          description: "",
          date: "2026-08-17",
          startTime: "09:00",
          endTime: "10:00",
          done: false,
          estimatedMinutes: 60,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      pomodoroSessions: [],
      settings: {},
    });

    expect(state.version).toBe(6);
    expect(state.dailyPlans[0].recurrence).toEqual({
      frequency: "none",
      count: 1,
      seriesId: null,
      occurrence: 1,
    });
  });

  it("rejects an active timer with an invalid relation", () => {
    expect(() =>
      parsePersistedState({
        version: 3,
        projects: [],
        tasks: [],
        dailyPlans: [],
        pomodoroSessions: [],
        settings: {},
        activeTimer: {
          projectId: "missing",
          taskId: null,
          dailyPlanId: null,
          phase: "focus",
          status: "paused",
          focusCount: 0,
          durationMs: 25 * 60_000,
          remainingMs: 25 * 60_000,
          phaseStartedAt: null,
          endAt: null,
        },
      }),
    ).toThrow("计时器引用了不存在的项目");
  });

  it("migrates v5 data with an empty inbox", () => {
    const state = parsePersistedState({
      version: 5,
      projects: [],
      tasks: [],
      dailyPlans: [],
      pomodoroSessions: [],
      settings: {},
      vaultSettings: {},
    });

    expect(state.version).toBe(6);
    expect(state.inboxItems).toEqual([]);
  });

  it("rejects completed notes", () => {
    expect(() =>
      parsePersistedState({
        version: 6,
        projects: [],
        tasks: [],
        dailyPlans: [],
        inboxItems: [
          {
            id: "i_1",
            kind: "note",
            content: "一条备忘",
            done: true,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        pomodoroSessions: [],
        settings: {},
        vaultSettings: {},
      }),
    ).toThrow("备忘不能标记为完成");
  });
});
