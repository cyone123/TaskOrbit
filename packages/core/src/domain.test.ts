import { describe, expect, it } from "vitest";
import {
  appendDailyPlan,
  appendDailyPlans,
  appendPomodoroSession,
  appendProject,
  appendTask,
  archiveProjectState,
  createDailyPlan,
  createDailyPlans,
  createInboxItem,
  createProject,
  createTask,
  deleteInboxItemState,
  deleteProjectState,
  updateDailyPlanState,
  updateInboxItemState,
  updateTaskState,
} from "./domain";
import { createEmptyState, validateAppState } from "./schema";

function fixtureState() {
  const project = createProject({
    name: "项目一",
    description: "",
    color: "blue",
    startDate: "2026-08-17",
    endDate: "2026-08-20",
  }, 1);
  const withProject = appendProject(createEmptyState(), project);
  const task = createTask({
    projectId: project.id,
    name: "任务一",
    description: "",
    startDate: "2026-08-17",
    endDate: "2026-08-18",
    priority: "medium",
  }, 2);
  const withTask = appendTask(withProject, task);
  const plan = createDailyPlan({
    projectId: project.id,
    taskId: task.id,
    name: "计划一",
    description: "",
    date: "2026-08-17",
    startTime: "09:00",
    endTime: "10:00",
    estimatedMinutes: 60,
  }, 3);
  return { project, task, plan, state: appendDailyPlan(withTask, plan) };
}

describe("domain commands", () => {
  it("keeps historical names when permanently deleting an archived project", () => {
    const { project, task, plan, state } = fixtureState();
    const withSession = appendPomodoroSession(state, {
      projectId: project.id,
      taskId: task.id,
      dailyPlanId: plan.id,
      kind: "focus",
      startedAt: 10,
      endedAt: 20,
      minutes: 1,
    }).state;
    const archived = archiveProjectState(withSession, project.id, 4);
    const deleted = deleteProjectState(archived, project.id);

    expect(deleted.projects).toHaveLength(0);
    expect(deleted.tasks).toHaveLength(0);
    expect(deleted.dailyPlans).toHaveLength(0);
    expect(deleted.pomodoroSessions[0]).toMatchObject({
      projectId: project.id,
      taskId: null,
      dailyPlanId: null,
      projectNameSnapshot: "项目一",
      taskNameSnapshot: "任务一",
      dailyPlanNameSnapshot: "计划一",
    });
  });

  it("rejects a plan whose task belongs to another project", () => {
    const first = fixtureState();
    const secondProject = createProject({
      name: "项目二",
      description: "",
      color: "green",
      startDate: "2026-08-17",
      endDate: "2026-08-20",
    }, 5);
    const state = appendProject(first.state, secondProject);

    expect(() =>
      appendDailyPlan(
        state,
        createDailyPlan({
          projectId: secondProject.id,
          taskId: first.task.id,
          name: "错误计划",
          description: "",
          date: "2026-08-17",
          startTime: "09:00",
          endTime: "10:00",
          estimatedMinutes: 60,
        }, 6),
      ),
    ).toThrow("项目必须与任务所属项目一致");
  });

  it("expands repeated plans into linked concrete occurrences", () => {
    const { project, task, state } = fixtureState();
    const plans = createDailyPlans({
      projectId: project.id,
      taskId: task.id,
      name: "重复计划",
      description: "",
      date: "2026-08-17",
      startTime: "09:00",
      endTime: "10:00",
      estimatedMinutes: 60,
      repeat: "weekly",
      repeatCount: 3,
    }, 10);
    const next = appendDailyPlans(state, plans);

    expect(plans).toHaveLength(3);
    expect(plans.map((plan) => plan.date)).toEqual([
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
    expect(new Set(plans.map((plan) => plan.id)).size).toBe(3);
    expect(new Set(plans.map((plan) => plan.recurrence.seriesId)).size).toBe(1);
    expect(plans.map((plan) => plan.recurrence.occurrence)).toEqual([1, 2, 3]);
    expect(next.dailyPlans).toHaveLength(4);
  });

  it("captures, edits, completes and deletes lightweight inbox items", () => {
    const state = createEmptyState();
    const todo = createInboxItem({ kind: "todo", content: "  整理收件箱  " }, 10);
    const note = createInboxItem({ kind: "note", content: "记录一个想法" }, 11);
    const withItems = {
      ...state,
      inboxItems: [todo, note],
    };

    expect(todo.content).toBe("整理收件箱");
    expect(updateInboxItemState(withItems, todo.id, { done: true }, 12).inboxItems[0]).toMatchObject({
      id: todo.id,
      done: true,
      updatedAt: 12,
    });
    const edited = updateInboxItemState(withItems, note.id, { content: "  更新后的想法  " }, 13);
    expect(edited.inboxItems.find((item) => item.id === note.id)?.content).toBe("更新后的想法");
    expect(deleteInboxItemState(edited, todo.id).inboxItems).toHaveLength(1);
  });

  describe("edit daily plan recurrence", () => {
    it("converts a single plan to a repeating series", () => {
      const { state, plan } = fixtureState();
      expect(plan.recurrence.frequency).toBe("none");

      const next = updateDailyPlanState(
        state,
        plan.id,
        {
          name: "更新后的每日计划",
          repeat: "daily",
          repeatCount: 3,
        },
        20,
      );

      validateAppState(next);
      const updatedSeries = next.dailyPlans.filter(
        (p) => p.recurrence.seriesId && p.name === "更新后的每日计划",
      );
      expect(updatedSeries).toHaveLength(3);
      expect(updatedSeries.map((p) => p.date).sort()).toEqual([
        "2026-08-17",
        "2026-08-18",
        "2026-08-19",
      ]);
      const target = next.dailyPlans.find((p) => p.id === plan.id);
      expect(target?.recurrence).toMatchObject({
        frequency: "daily",
        count: 3,
        occurrence: 1,
      });
      expect(target?.name).toBe("更新后的每日计划");
    });

    it("increases repeat count for an existing series", () => {
      const { state, project, task } = fixtureState();
      const plans = createDailyPlans({
        projectId: project.id,
        taskId: task.id,
        name: "系列计划",
        description: "",
        date: "2026-08-17",
        startTime: "09:00",
        endTime: "10:00",
        estimatedMinutes: 60,
        repeat: "daily",
        repeatCount: 3,
      });
      const withPlans = appendDailyPlans(state, plans);

      const firstPlan = plans[0];
      const updated = updateDailyPlanState(
        withPlans,
        firstPlan.id,
        {
          repeat: "daily",
          repeatCount: 5,
        },
        30,
      );

      validateAppState(updated);
      const series = updated.dailyPlans.filter(
        (p) => p.recurrence.seriesId === firstPlan.recurrence.seriesId,
      );
      expect(series).toHaveLength(5);
      expect(series.every((p) => p.recurrence.count === 5)).toBe(true);
      expect(series.map((p) => p.recurrence.occurrence).sort((a, b) => a - b)).toEqual([
        1, 2, 3, 4, 5,
      ]);
    });

    it("decreases repeat count and cleans up unworked occurrences", () => {
      const { state, project, task } = fixtureState();
      const plans = createDailyPlans({
        projectId: project.id,
        taskId: task.id,
        name: "系列计划",
        description: "",
        date: "2026-08-17",
        startTime: "09:00",
        endTime: "10:00",
        estimatedMinutes: 60,
        repeat: "daily",
        repeatCount: 4,
      });
      const withPlans = appendDailyPlans(state, plans);
      const firstPlan = plans[0];

      const updated = updateDailyPlanState(
        withPlans,
        firstPlan.id,
        {
          repeat: "daily",
          repeatCount: 2,
        },
        30,
      );

      validateAppState(updated);
      const series = updated.dailyPlans.filter(
        (p) => p.recurrence.seriesId === firstPlan.recurrence.seriesId,
      );
      expect(series).toHaveLength(2);
      expect(series.every((p) => p.recurrence.count === 2)).toBe(true);
      expect(series.map((p) => p.recurrence.occurrence).sort((a, b) => a - b)).toEqual([1, 2]);
    });

    it("cancels repeat and preserves completed occurrences as standalone plans", () => {
      const { state, project, task } = fixtureState();
      const plans = createDailyPlans({
        projectId: project.id,
        taskId: task.id,
        name: "系列计划",
        description: "",
        date: "2026-08-17",
        startTime: "09:00",
        endTime: "10:00",
        estimatedMinutes: 60,
        repeat: "daily",
        repeatCount: 3,
      });
      // Mark occurrence 2 as done
      plans[1].done = true;
      const withPlans = appendDailyPlans(state, plans);
      const firstPlan = plans[0];

      const updated = updateDailyPlanState(
        withPlans,
        firstPlan.id,
        {
          repeat: "none",
          repeatCount: 1,
        },
        40,
      );

      validateAppState(updated);
      // Occurrence 1 updated to none
      const p1 = updated.dailyPlans.find((p) => p.id === firstPlan.id);
      expect(p1?.recurrence).toEqual({
        frequency: "none",
        count: 1,
        seriesId: null,
        occurrence: 1,
      });

      // Occurrence 2 was done, so it is preserved detached
      const p2 = updated.dailyPlans.find((p) => p.id === plans[1].id);
      expect(p2).toBeDefined();
      expect(p2?.done).toBe(true);
      expect(p2?.recurrence.frequency).toBe("none");

      // Occurrence 3 was unworked, so it was removed
      const p3 = updated.dailyPlans.find((p) => p.id === plans[2].id);
      expect(p3).toBeUndefined();
    });

    it("changes repeat frequency and creates new dates", () => {
      const { state, project, task } = fixtureState();
      const plans = createDailyPlans({
        projectId: project.id,
        taskId: task.id,
        name: "系列计划",
        description: "",
        date: "2026-08-17",
        startTime: "09:00",
        endTime: "10:00",
        estimatedMinutes: 60,
        repeat: "daily",
        repeatCount: 3,
      });
      const withPlans = appendDailyPlans(state, plans);
      const firstPlan = plans[0];

      const updated = updateDailyPlanState(
        withPlans,
        firstPlan.id,
        {
          repeat: "weekly",
          repeatCount: 3,
        },
        50,
      );

      validateAppState(updated);
      const target = updated.dailyPlans.find((p) => p.id === firstPlan.id);
      expect(target?.recurrence.frequency).toBe("weekly");
      const series = updated.dailyPlans.filter(
        (p) => p.recurrence.seriesId === target?.recurrence.seriesId,
      );
      expect(series).toHaveLength(3);
      expect(series.map((p) => p.date).sort()).toEqual([
        "2026-08-17",
        "2026-08-24",
        "2026-08-31",
      ]);
    });

    it("automatically marks task done when all its daily plans are completed, and uncompletes task when a plan is unchecked", () => {
      const { state, project, task, plan } = fixtureState();
      expect(task.done).toBe(false);

      const plan2 = createDailyPlan({
        projectId: project.id,
        taskId: task.id,
        name: "计划2",
        description: "",
        date: "2026-08-18",
        startTime: "09:00",
        endTime: "10:00",
        estimatedMinutes: 60,
      });

      const withTwoPlans = appendDailyPlan(state, plan2);

      // Complete only plan -> task should still be false because plan2 is not done
      const step1 = updateDailyPlanState(withTwoPlans, plan.id, { done: true });
      expect(step1.tasks.find((t) => t.id === task.id)?.done).toBe(false);

      // Complete plan2 -> task should now be auto-completed (true)
      const step2 = updateDailyPlanState(step1, plan2.id, { done: true });
      expect(step2.tasks.find((t) => t.id === task.id)?.done).toBe(true);

      // Uncheck plan1 -> task should now be automatically uncompleted (false)
      const step3 = updateDailyPlanState(step2, plan.id, { done: false });
      expect(step3.tasks.find((t) => t.id === task.id)?.done).toBe(false);
    });

    it("automatically checks or unchecks all plans under a task when task completion is toggled", () => {
      const { state, project, task, plan } = fixtureState();
      const plan2 = createDailyPlan({
        projectId: project.id,
        taskId: task.id,
        name: "计划2",
        description: "",
        date: "2026-08-18",
        startTime: "09:00",
        endTime: "10:00",
        estimatedMinutes: 60,
      });

      const withTwoPlans = appendDailyPlan(state, plan2);

      // Check task -> both plans under this task should automatically become done: true
      const checkedTask = updateTaskState(withTwoPlans, task.id, { done: true });
      expect(checkedTask.tasks.find((t) => t.id === task.id)?.done).toBe(true);
      expect(checkedTask.dailyPlans.find((p) => p.id === plan.id)?.done).toBe(true);
      expect(checkedTask.dailyPlans.find((p) => p.id === plan2.id)?.done).toBe(true);

      // Uncheck task -> both plans under this task should automatically become done: false
      const uncheckedTask = updateTaskState(checkedTask, task.id, { done: false });
      expect(uncheckedTask.tasks.find((t) => t.id === task.id)?.done).toBe(false);
      expect(uncheckedTask.dailyPlans.find((p) => p.id === plan.id)?.done).toBe(false);
      expect(uncheckedTask.dailyPlans.find((p) => p.id === plan2.id)?.done).toBe(false);
    });
  });
});

