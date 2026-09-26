import { describe, expect, it } from "vitest";
import { commitScheduleProposal } from "./commit";
import { createEmptyState, validateAppState } from "../schema";
import type { AppState, DailyPlan, Project, Task } from "../types";
import type { DailyPlanScheduleProposalPayload } from "./types";

function createMockState(): AppState {
  const base = createEmptyState();

  const project: Project = {
    id: "p_dev",
    name: "应用开发",
    description: "开发项目",
    color: "blue",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    archived: false,
    archivedAt: null,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const task: Task = {
    id: "t_code",
    projectId: "p_dev",
    name: "核心逻辑编写",
    description: "开发测试",
    startDate: "2026-09-10",
    endDate: "2026-09-30",
    done: false,
    priority: "high",
    createdAt: 1000,
    updatedAt: 1000,
  };

  const existingPlan: DailyPlan = {
    id: "pl_existing",
    projectId: "p_dev",
    taskId: "t_code",
    name: "编写数据结构",
    description: "",
    date: "2026-09-26",
    startTime: "09:00",
    endTime: "10:30",
    done: false,
    estimatedMinutes: 90,
    recurrence: {
      frequency: "none",
      count: 1,
      seriesId: null,
      occurrence: 1,
    },
    createdAt: 1000,
    updatedAt: 1000,
  };

  return {
    ...base,
    projects: [project],
    tasks: [task],
    dailyPlans: [existingPlan],
  };
}

describe("commitScheduleProposal", () => {
  it("creates a new daily plan time block and passes validation", () => {
    const state = createMockState();
    const payload: DailyPlanScheduleProposalPayload = {
      targetDate: "2026-09-26",
      proposals: [
        {
          action: "create",
          newPlan: {
            projectId: "p_dev",
            taskId: "t_code",
            name: "编写排期算法单元测试",
            description: "验证时间块重排逻辑",
            date: "2026-09-26",
            startTime: "14:00",
            endTime: "15:30",
            estimatedMinutes: 90,
          },
          reason: "下午空闲时间段，适合集中编写测试",
        },
      ],
    };

    const nextState = commitScheduleProposal(state, payload, 5000);
    expect(() => validateAppState(nextState)).not.toThrow();

    const createdPlan = nextState.dailyPlans.find(
      (p) => p.name === "编写排期算法单元测试",
    );
    expect(createdPlan).toBeDefined();
    expect(createdPlan?.date).toBe("2026-09-26");
    expect(createdPlan?.startTime).toBe("14:00");
    expect(createdPlan?.endTime).toBe("15:30");
    expect(createdPlan?.estimatedMinutes).toBe(90);
    expect(createdPlan?.projectId).toBe("p_dev");
    expect(createdPlan?.taskId).toBe("t_code");
  });

  it("reschedules an existing daily plan with updated times", () => {
    const state = createMockState();
    const payload: DailyPlanScheduleProposalPayload = {
      targetDate: "2026-09-26",
      proposals: [
        {
          action: "reschedule",
          planId: "pl_existing",
          originalTime: {
            date: "2026-09-26",
            startTime: "09:00",
            endTime: "10:30",
          },
          newPlan: {
            name: "编写数据结构(顺延)",
            date: "2026-09-26",
            startTime: "10:30",
            endTime: "12:00",
            estimatedMinutes: 90,
          },
          reason: "避免与早会冲突，顺延至10:30",
        },
      ],
    };

    const nextState = commitScheduleProposal(state, payload, 6000);
    expect(() => validateAppState(nextState)).not.toThrow();

    const updatedPlan = nextState.dailyPlans.find((p) => p.id === "pl_existing");
    expect(updatedPlan).toBeDefined();
    expect(updatedPlan?.name).toBe("编写数据结构(顺延)");
    expect(updatedPlan?.startTime).toBe("10:30");
    expect(updatedPlan?.endTime).toBe("12:00");
    expect(updatedPlan?.estimatedMinutes).toBe(90);
  });

  it("deletes a daily plan when action is delete", () => {
    const state = createMockState();
    const payload: DailyPlanScheduleProposalPayload = {
      targetDate: "2026-09-26",
      proposals: [
        {
          action: "delete",
          planId: "pl_existing",
          reason: "用户取消该计划",
        },
      ],
    };

    const nextState = commitScheduleProposal(state, payload, 7000);
    expect(() => validateAppState(nextState)).not.toThrow();

    const deletedPlan = nextState.dailyPlans.find((p) => p.id === "pl_existing");
    expect(deletedPlan).toBeUndefined();
    expect(nextState.dailyPlans.length).toBe(0);
  });

  it("handles batch create, reschedule, and delete proposals together", () => {
    const state = createMockState();
    const payload: DailyPlanScheduleProposalPayload = {
      targetDate: "2026-09-26",
      proposals: [
        {
          action: "reschedule",
          planId: "pl_existing",
          newPlan: {
            name: "早间编码",
            date: "2026-09-26",
            startTime: "08:30",
            endTime: "09:30",
          },
        },
        {
          action: "create",
          newPlan: {
            name: "下午代码评审",
            date: "2026-09-26",
            startTime: "16:00",
            endTime: "17:00",
          },
        },
      ],
    };

    const nextState = commitScheduleProposal(state, payload);
    expect(() => validateAppState(nextState)).not.toThrow();

    expect(nextState.dailyPlans.length).toBe(2);
    const existing = nextState.dailyPlans.find((p) => p.id === "pl_existing");
    expect(existing?.startTime).toBe("08:30");
    const created = nextState.dailyPlans.find((p) => p.name === "下午代码评审");
    expect(created?.startTime).toBe("16:00");
  });

  it("safely ignores proposals with invalid time ranges or non-existent plan IDs", () => {
    const state = createMockState();
    const payload: DailyPlanScheduleProposalPayload = {
      targetDate: "2026-09-26",
      proposals: [
        {
          action: "create",
          newPlan: {
            name: "非法时间计划",
            date: "2026-09-26",
            startTime: "15:00",
            endTime: "14:00", // Invalid: end <= start
          },
        },
        {
          action: "reschedule",
          planId: "pl_not_found",
          newPlan: {
            name: "找不到",
            date: "2026-09-26",
            startTime: "10:00",
            endTime: "11:00",
          },
        },
      ],
    };

    const nextState = commitScheduleProposal(state, payload);
    expect(nextState).toEqual(state);
  });
});
