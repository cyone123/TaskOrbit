import { describe, expect, it } from "vitest";
import { commitInboxProposal } from "./commit";
import { createEmptyState, validateAppState } from "../schema";
import type { AppState, InboxItem, Project } from "../types";
import type { InboxOrganizationProposalPayload } from "./types";

function createMockState(): AppState {
  const base = createEmptyState();

  const projectA: Project = {
    id: "p_main",
    name: "主工程",
    description: "主项目",
    color: "blue",
    startDate: "2026-09-01",
    endDate: "2026-10-01",
    archived: false,
    archivedAt: null,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const projectArchived: Project = {
    id: "p_archived",
    name: "已归档工程",
    description: "",
    color: "gray",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    archived: true,
    archivedAt: 2000,
    createdAt: 500,
    updatedAt: 2000,
  };

  const item1: InboxItem = {
    id: "i_1",
    kind: "todo",
    content: "完成系统架构设计文档",
    done: false,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const item2: InboxItem = {
    id: "i_2",
    kind: "note",
    content: "明天下午两点去图书馆查资料",
    done: false,
    createdAt: 1100,
    updatedAt: 1100,
  };

  const item3: InboxItem = {
    id: "i_3",
    kind: "todo",
    content: "给花浇水",
    done: false,
    createdAt: 1200,
    updatedAt: 1200,
  };

  return {
    ...base,
    projects: [projectA, projectArchived],
    inboxItems: [item1, item2, item3],
  };
}

describe("commitInboxProposal", () => {
  it("converts inbox item to a project task and marks inbox item as done", () => {
    const state = createMockState();
    const payload: InboxOrganizationProposalPayload = {
      proposals: [
        {
          inboxItemId: "i_1",
          sourceContent: "完成系统架构设计文档",
          action: "convert_to_task",
          targetProjectName: "主工程",
          taskData: {
            projectId: "p_main",
            name: "编写系统架构设计文档",
            description: "包含核心模块与接口设计",
            startDate: "2026-09-26",
            endDate: "2026-09-28",
            priority: "high",
          },
          reason: "属于主工程的核心开发任务",
        },
      ],
    };

    const nextState = commitInboxProposal(state, payload, 5000);

    // Schema validation succeeds without throwing
    expect(() => validateAppState(nextState)).not.toThrow();

    // Inbox item i_1 is marked done
    const updatedItem = nextState.inboxItems.find((i) => i.id === "i_1");
    expect(updatedItem?.done).toBe(true);
    expect(updatedItem?.updatedAt).toBe(5000);

    // New task is created in p_main
    const newTask = nextState.tasks.find((t) => t.name === "编写系统架构设计文档");
    expect(newTask).toBeDefined();
    expect(newTask?.projectId).toBe("p_main");
    expect(newTask?.priority).toBe("high");
    expect(newTask?.description).toBe("包含核心模块与接口设计");
    expect(newTask?.done).toBe(false);
  });

  it("converts inbox item to a daily plan and marks inbox item as done", () => {
    const state = createMockState();
    const payload: InboxOrganizationProposalPayload = {
      proposals: [
        {
          inboxItemId: "i_2",
          sourceContent: "明天下午两点去图书馆查资料",
          action: "convert_to_daily_plan",
          dailyPlanData: {
            projectId: "p_main",
            name: "图书馆查资料",
            description: "参考相关论文",
            date: "2026-09-27",
            startTime: "14:00",
            endTime: "16:00",
            estimatedMinutes: 120,
          },
          reason: "有明确时间与安排，适合作为日程计划",
        },
      ],
    };

    const nextState = commitInboxProposal(state, payload, 6000);
    expect(() => validateAppState(nextState)).not.toThrow();

    // Notes that are organized into plans are cleaned up from inbox (avoiding illegal note.done: true)
    const updatedItem = nextState.inboxItems.find((i) => i.id === "i_2");
    expect(updatedItem).toBeUndefined();

    const newPlan = nextState.dailyPlans.find((p) => p.name === "图书馆查资料");
    expect(newPlan).toBeDefined();
    expect(newPlan?.date).toBe("2026-09-27");
    expect(newPlan?.startTime).toBe("14:00");
    expect(newPlan?.endTime).toBe("16:00");
    expect(newPlan?.estimatedMinutes).toBe(120);
    expect(newPlan?.projectId).toBe("p_main");
  });

  it("marks inbox item as done directly when action is mark_done", () => {
    const state = createMockState();
    const payload: InboxOrganizationProposalPayload = {
      proposals: [
        {
          inboxItemId: "i_3",
          action: "mark_done",
          reason: "日常琐事，已经处理完毕",
        },
      ],
    };

    const nextState = commitInboxProposal(state, payload, 7000);
    expect(() => validateAppState(nextState)).not.toThrow();

    const updatedItem = nextState.inboxItems.find((i) => i.id === "i_3");
    expect(updatedItem?.done).toBe(true);
    expect(nextState.tasks.length).toBe(0);
    expect(nextState.dailyPlans.length).toBe(0);
  });

  it("leaves inbox item untouched when action is dismiss", () => {
    const state = createMockState();
    const payload: InboxOrganizationProposalPayload = {
      proposals: [
        {
          inboxItemId: "i_3",
          action: "dismiss",
          reason: "暂不处理，保留在收集箱",
        },
      ],
    };

    const nextState = commitInboxProposal(state, payload, 8000);
    expect(() => validateAppState(nextState)).not.toThrow();

    const item = nextState.inboxItems.find((i) => i.id === "i_3");
    expect(item?.done).toBe(false);
  });

  it("handles batch proposals of different actions together", () => {
    const state = createMockState();
    const payload: InboxOrganizationProposalPayload = {
      proposals: [
        {
          inboxItemId: "i_1",
          action: "convert_to_task",
          taskData: {
            projectId: "p_main",
            name: "设计文档",
            startDate: "2026-09-26",
            endDate: "2026-09-27",
          },
        },
        {
          inboxItemId: "i_2",
          action: "convert_to_daily_plan",
          dailyPlanData: {
            name: "下午查资料",
            date: "2026-09-27",
            startTime: "14:00",
            endTime: "15:00",
          },
        },
        {
          inboxItemId: "i_3",
          action: "mark_done",
        },
      ],
    };

    const nextState = commitInboxProposal(state, payload);
    expect(() => validateAppState(nextState)).not.toThrow();

    // i_1 and i_3 are marked done, i_2 (note) is cleanly organized and removed
    expect(nextState.inboxItems.length).toBe(2);
    expect(nextState.inboxItems.every((i) => i.done)).toBe(true);
    expect(nextState.tasks.length).toBe(1);
    expect(nextState.dailyPlans.length).toBe(1);
  });

  it("gracefully falls back when task target project is invalid or archived", () => {
    const state = createMockState();
    const payload: InboxOrganizationProposalPayload = {
      proposals: [
        {
          inboxItemId: "i_1",
          action: "convert_to_task",
          taskData: {
            projectId: "p_non_existent", // Invalid ID
            name: "备选项目任务",
            startDate: "2026-09-26",
            endDate: "2026-09-27",
          },
        },
      ],
    };

    const nextState = commitInboxProposal(state, payload);
    expect(() => validateAppState(nextState)).not.toThrow();

    // Fallbacks to p_main (the only active project)
    const task = nextState.tasks.find((t) => t.name === "备选项目任务");
    expect(task).toBeDefined();
    expect(task?.projectId).toBe("p_main");
  });

  it("safely handles non-existent inbox items or empty proposals", () => {
    const state = createMockState();
    const payload: InboxOrganizationProposalPayload = {
      proposals: [
        {
          inboxItemId: "i_ghost",
          action: "convert_to_task",
          taskData: {
            projectId: "p_main",
            name: "不存在",
            startDate: "2026-09-26",
            endDate: "2026-09-27",
          },
        },
      ],
    };

    const nextState = commitInboxProposal(state, payload);
    expect(nextState).toEqual(state);

    const emptyNext = commitInboxProposal(state, { proposals: [] });
    expect(emptyNext).toEqual(state);
  });
});
