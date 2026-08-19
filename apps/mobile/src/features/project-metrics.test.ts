import { createEmptyState, type AppState } from "@task-orbit/core";
import { describe, expect, it } from "vitest";

import { calculateProjectMetrics } from "./project-metrics";

describe("project metrics", () => {
  it("uses the same task, plan and focus project relationships as the desktop app", () => {
    const base = createEmptyState();
    const state: AppState = {
      ...base,
      projects: [{ id: "p1", name: "MVP", description: "", color: "violet", startDate: "2026-08-01", endDate: "2026-08-30", archived: false, archivedAt: null, createdAt: 1, updatedAt: 1 }],
      tasks: [
        { id: "t1", projectId: "p1", name: "A", description: "", startDate: "2026-08-01", endDate: "2026-08-10", done: true, priority: "high", createdAt: 1, updatedAt: 1 },
        { id: "t2", projectId: "p1", name: "B", description: "", startDate: "2026-08-01", endDate: "2026-08-20", done: false, priority: "medium", createdAt: 1, updatedAt: 1 },
      ],
      dailyPlans: [{ id: "pl1", projectId: "p1", taskId: "t1", name: "安排", description: "", date: "2026-08-20", startTime: "09:00", endTime: "10:00", done: true, estimatedMinutes: 60, recurrence: { frequency: "none", count: 1, seriesId: null, occurrence: 1 }, createdAt: 1, updatedAt: 1 }],
      pomodoroSessions: [{ id: "s1", projectId: "p1", taskId: null, dailyPlanId: null, projectNameSnapshot: "MVP", taskNameSnapshot: null, dailyPlanNameSnapshot: null, kind: "focus", startedAt: 1, endedAt: 1_500_001, minutes: 25 }],
    };
    expect(calculateProjectMetrics(state, "p1", "2026-08-20")).toEqual({
      taskTotal: 2, taskDone: 1, taskProgress: 50,
      planTotal: 1, planDone: 1, planProgress: 100,
      remainingDays: 10, focusSessions: 1, focusMinutes: 25,
    });
  });
});
