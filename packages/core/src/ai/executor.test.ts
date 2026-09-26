import { describe, expect, it } from "vitest";
import { executeReadTool } from "./executor";
import { createEmptyState } from "../schema";
import type { AppState, DailyPlan, InboxItem, PomodoroSession, Project, Task } from "../types";

function createMockState(): AppState {
  const base = createEmptyState();

  const p1: Project = {
    id: "p_1",
    name: "项目A",
    description: "开发项目",
    color: "blue",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    archived: false,
    archivedAt: null,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const p2: Project = {
    id: "p_2",
    name: "项目B已归档",
    description: "",
    color: "green",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    archived: true,
    archivedAt: 2000,
    createdAt: 500,
    updatedAt: 2000,
  };

  const t1: Task = {
    id: "t_1",
    projectId: "p_1",
    name: "任务1",
    description: "设计前端",
    startDate: "2026-09-01",
    endDate: "2026-09-10",
    done: true,
    priority: "high",
    createdAt: 1000,
    updatedAt: 1500,
  };

  const t2: Task = {
    id: "t_2",
    projectId: "p_1",
    name: "任务2",
    description: "测试后端",
    startDate: "2026-09-11",
    endDate: "2026-09-20",
    done: false,
    priority: "medium",
    createdAt: 1000,
    updatedAt: 1000,
  };

  const plan1: DailyPlan = {
    id: "pl_1",
    projectId: "p_1",
    taskId: "t_1",
    name: "今日计划1",
    description: "",
    date: "2026-09-26",
    startTime: "09:00",
    endTime: "10:00",
    done: true,
    estimatedMinutes: 60,
    recurrence: { frequency: "none", count: 1, seriesId: null, occurrence: 1 },
    createdAt: 1000,
    updatedAt: 1500,
  };

  const plan2: DailyPlan = {
    id: "pl_2",
    projectId: "p_1",
    taskId: "t_2",
    name: "今日计划2",
    description: "",
    date: "2026-09-26",
    startTime: "14:00",
    endTime: "15:30",
    done: false,
    estimatedMinutes: 90,
    recurrence: { frequency: "none", count: 1, seriesId: null, occurrence: 1 },
    createdAt: 1000,
    updatedAt: 1000,
  };

  const planTomorrow: DailyPlan = {
    id: "pl_3",
    projectId: null,
    taskId: null,
    name: "明日独立计划",
    description: "",
    date: "2026-09-27",
    startTime: "10:00",
    endTime: "11:00",
    done: false,
    estimatedMinutes: 60,
    recurrence: { frequency: "none", count: 1, seriesId: null, occurrence: 1 },
    createdAt: 1000,
    updatedAt: 1000,
  };

  const item1: InboxItem = {
    id: "inbox_1",
    kind: "todo",
    content: "未完成待办",
    done: false,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const item2: InboxItem = {
    id: "inbox_2",
    kind: "note",
    content: "一条备忘",
    done: false,
    createdAt: 1100,
    updatedAt: 1100,
  };

  const item3: InboxItem = {
    id: "inbox_3",
    kind: "todo",
    content: "已完成待办",
    done: true,
    createdAt: 800,
    updatedAt: 900,
  };

  const session1: PomodoroSession = {
    id: "s_1",
    projectId: "p_1",
    taskId: "t_1",
    dailyPlanId: "pl_1",
    projectNameSnapshot: "项目A",
    taskNameSnapshot: "任务1",
    dailyPlanNameSnapshot: "今日计划1",
    kind: "focus",
    startedAt: new Date("2026-09-26T09:00:00").getTime(),
    endedAt: new Date("2026-09-26T09:25:00").getTime(),
    minutes: 25,
  };

  const session2: PomodoroSession = {
    id: "s_2",
    projectId: "p_1",
    taskId: null,
    dailyPlanId: null,
    projectNameSnapshot: "项目A",
    taskNameSnapshot: null,
    dailyPlanNameSnapshot: null,
    kind: "focus",
    startedAt: new Date("2026-09-25T15:00:00").getTime(),
    endedAt: new Date("2026-09-25T15:50:00").getTime(),
    minutes: 50,
  };

  return {
    ...base,
    projects: [p1, p2],
    tasks: [t1, t2],
    dailyPlans: [plan1, plan2, planTomorrow],
    inboxItems: [item1, item2, item3],
    pomodoroSessions: [session1, session2],
  };
}

describe("executeReadTool", () => {
  const state = createMockState();
  const testNow = new Date("2026-09-26T12:00:00").getTime();

  it("executes get_workspace_summary", () => {
    const summary = executeReadTool(state, "get_workspace_summary", {}, testNow) as {
      currentDate: string;
      totalActiveProjects: number;
      projects: Array<{ id: string; name: string }>;
      todayPlans: { total: number; completed: number };
      inboxPendingCount: number;
      hasActiveTimer: boolean;
    };

    expect(summary.currentDate).toBe("2026-09-26");
    expect(summary.totalActiveProjects).toBe(1);
    expect(summary.projects[0].name).toBe("项目A");
    expect(summary.todayPlans.total).toBe(2);
    expect(summary.todayPlans.completed).toBe(1);
    expect(summary.inboxPendingCount).toBe(2); // item1 & item2
    expect(summary.hasActiveTimer).toBe(false);
  });

  it("executes get_inbox_items with filters", () => {
    // default: uncompleted items
    const pending = executeReadTool(state, "get_inbox_items", {}, testNow) as {
      total: number;
      items: InboxItem[];
    };
    expect(pending.total).toBe(2);

    // completed only
    const doneOnly = executeReadTool(state, "get_inbox_items", { done: true }, testNow) as {
      total: number;
      items: InboxItem[];
    };
    expect(doneOnly.total).toBe(1);
    expect(doneOnly.items[0].content).toBe("已完成待办");

    // note kind only
    const notes = executeReadTool(state, "get_inbox_items", { kind: "note" }, testNow) as {
      total: number;
      items: InboxItem[];
    };
    expect(notes.total).toBe(1);
    expect(notes.items[0].kind).toBe("note");
  });

  it("executes get_projects_and_tasks", () => {
    const res = executeReadTool(state, "get_projects_and_tasks", {}) as {
      projects: Array<{ id: string; tasks: Task[] }>;
    };
    // Default excludes archived project
    expect(res.projects).toHaveLength(1);
    expect(res.projects[0].id).toBe("p_1");
    expect(res.projects[0].tasks).toHaveLength(2);

    // Including archived
    const withArchived = executeReadTool(state, "get_projects_and_tasks", {
      includeArchivedProjects: true,
    }) as { projects: Array<{ id: string }> };
    expect(withArchived.projects).toHaveLength(2);

    // Filter by projectId
    const byId = executeReadTool(state, "get_projects_and_tasks", {
      projectId: "p_1",
      includeDoneTasks: false,
    }) as { projects: Array<{ tasks: Task[] }> };
    expect(byId.projects[0].tasks).toHaveLength(1);
    expect(byId.projects[0].tasks[0].name).toBe("任务2");
  });

  it("executes get_daily_plans", () => {
    const plansRes = executeReadTool(state, "get_daily_plans", {
      startDate: "2026-09-26",
      endDate: "2026-09-27",
    }, testNow) as { total: number; plans: DailyPlan[] };

    expect(plansRes.total).toBe(3);
    expect(plansRes.plans[0].name).toBe("今日计划1");
    expect(plansRes.plans[1].name).toBe("今日计划2");
    expect(plansRes.plans[2].name).toBe("明日独立计划");
  });

  it("executes get_pomodoro_stats", () => {
    const stats = executeReadTool(state, "get_pomodoro_stats", {
      days: 7,
    }, testNow) as {
      totalFocusMinutes: number;
      totalSessions: number;
      byProject: Array<{ projectName: string; minutes: number; percentage: number }>;
      byDate: Array<{ date: string; minutes: number }>;
    };

    expect(stats.totalFocusMinutes).toBe(75); // 25 + 50
    expect(stats.totalSessions).toBe(2);
    expect(stats.byProject[0].projectName).toBe("项目A");
    expect(stats.byProject[0].minutes).toBe(75);
    expect(stats.byProject[0].percentage).toBe(100);
    expect(stats.byDate).toHaveLength(2);
  });

  it("throws error on unknown tool name", () => {
    expect(() => executeReadTool(state, "unknown_tool", {}, testNow)).toThrow("未知的只读工具");
  });
});
