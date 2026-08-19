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
  updateInboxItemState,
} from "./domain";
import { createEmptyState } from "./schema";

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
});
