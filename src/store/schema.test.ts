import { describe, expect, it } from "vitest";
import { createEmptyState, parsePersistedState } from "./schema";

describe("persisted state schema", () => {
  it("starts with an empty state", () => {
    const state = createEmptyState();

    expect(state.version).toBe(2);
    expect(state.projects).toHaveLength(0);
    expect(state.tasks).toHaveLength(0);
    expect(state.dailyPlans).toHaveLength(0);
    expect(state.pomodoroSessions).toHaveLength(0);
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

    expect(state.version).toBe(2);
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
});
