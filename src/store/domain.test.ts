import { describe, expect, it } from "vitest";
import {
  appendDailyPlan,
  appendPomodoroSession,
  appendProject,
  appendTask,
  archiveProjectState,
  createDailyPlan,
  createProject,
  createTask,
  deleteProjectState,
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
});
