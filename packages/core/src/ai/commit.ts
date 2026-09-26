import {
  appendDailyPlan,
  appendTask,
  assertPlanRelation,
  createDailyPlan,
  createTask,
  deleteDailyPlanState,
  deleteInboxItemState,
  updateDailyPlanState,
  updateInboxItemState,
} from "../domain";
import { isTimeRangeValid, timeToMinutes } from "../date";
import { validateAppState } from "../schema";
import type { AppState, InboxItem, Priority } from "../types";
import type {
  DailyPlanScheduleProposalPayload,
  InboxOrganizationProposalPayload,
} from "./types";

function finalizeInboxItem(state: AppState, item: InboxItem, now: number): AppState {
  if (item.kind === "note") {
    return deleteInboxItemState(state, item.id);
  }
  return updateInboxItemState(state, item.id, { done: true }, now);
}

const VALID_PRIORITIES = new Set<Priority>(["low", "medium", "high"]);

export function commitInboxProposal(
  state: AppState,
  payload: InboxOrganizationProposalPayload,
  now = Date.now(),
): AppState {
  if (!payload || !Array.isArray(payload.proposals) || payload.proposals.length === 0) {
    return state;
  }

  let nextState = state;

  for (const proposal of payload.proposals) {
    const item = nextState.inboxItems.find((i) => i.id === proposal.inboxItemId);
    if (!item) {
      // Item was already deleted or not found, safely continue
      continue;
    }

    switch (proposal.action) {
      case "convert_to_task": {
        const data = proposal.taskData;
        if (!data || !data.name?.trim()) {
          continue;
        }

        let targetProjectId = data.projectId;
        let project = nextState.projects.find((p) => p.id === targetProjectId && !p.archived);

        // Fallback to first active project if specified project is missing or archived
        if (!project) {
          project = nextState.projects.find((p) => !p.archived);
          if (!project) {
            // Cannot create task without an active project
            continue;
          }
          targetProjectId = project.id;
        }

        const priority: Priority =
          data.priority && VALID_PRIORITIES.has(data.priority)
            ? data.priority
            : "medium";

        const task = createTask(
          {
            projectId: targetProjectId,
            name: data.name.trim(),
            description: data.description?.trim() || "",
            startDate: data.startDate || project.startDate,
            endDate: data.endDate || project.endDate,
            priority,
          },
          now,
        );

        nextState = appendTask(nextState, task);
        nextState = finalizeInboxItem(nextState, item, now);
        break;
      }

      case "convert_to_daily_plan": {
        const data = proposal.dailyPlanData;
        if (!data || !data.name?.trim() || !data.date || !data.startTime || !data.endTime) {
          continue;
        }

        let projectId: string | null = data.projectId || null;
        let taskId: string | null = data.taskId || null;

        // Verify task exists and matches project
        if (taskId) {
          const task = nextState.tasks.find((t) => t.id === taskId);
          if (!task) {
            taskId = null;
          } else {
            projectId = task.projectId;
          }
        }

        // Verify project exists and is not archived
        if (projectId) {
          const project = nextState.projects.find((p) => p.id === projectId && !p.archived);
          if (!project) {
            projectId = null;
            taskId = null;
          }
        }

        try {
          assertPlanRelation(nextState, projectId, taskId, false);
        } catch {
          projectId = null;
          taskId = null;
        }

        const plan = createDailyPlan(
          {
            projectId,
            taskId,
            name: data.name.trim(),
            description: data.description?.trim() || "",
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            estimatedMinutes:
              typeof data.estimatedMinutes === "number" && data.estimatedMinutes > 0
                ? data.estimatedMinutes
                : 30,
            repeat: "none",
          },
          now,
        );

        nextState = appendDailyPlan(nextState, plan);
        nextState = finalizeInboxItem(nextState, item, now);
        break;
      }

      case "mark_done": {
        nextState = finalizeInboxItem(nextState, item, now);
        break;
      }

      case "dismiss":
      default:
        // Do nothing to this item
        break;
    }
  }

  // Validate resulting state against schema
  return validateAppState(nextState);
}

export function commitScheduleProposal(
  state: AppState,
  payload: DailyPlanScheduleProposalPayload,
  now = Date.now(),
): AppState {
  if (!payload || !Array.isArray(payload.proposals) || payload.proposals.length === 0) {
    return state;
  }

  let nextState = state;

  for (const proposal of payload.proposals) {
    switch (proposal.action) {
      case "create": {
        const data = proposal.newPlan;
        if (!data || !data.name?.trim() || !data.date || !data.startTime || !data.endTime) {
          continue;
        }

        if (!isTimeRangeValid(data.startTime, data.endTime)) {
          continue;
        }

        let projectId: string | null = data.projectId || null;
        let taskId: string | null = data.taskId || null;

        if (taskId) {
          const task = nextState.tasks.find((t) => t.id === taskId);
          if (!task) {
            taskId = null;
          } else {
            projectId = task.projectId;
          }
        }

        if (projectId) {
          const project = nextState.projects.find((p) => p.id === projectId && !p.archived);
          if (!project) {
            projectId = null;
            taskId = null;
          }
        }

        try {
          assertPlanRelation(nextState, projectId, taskId, false);
        } catch {
          projectId = null;
          taskId = null;
        }

        const calculatedMinutes = Math.max(
          15,
          timeToMinutes(data.endTime) - timeToMinutes(data.startTime),
        );

        const plan = createDailyPlan(
          {
            projectId,
            taskId,
            name: data.name.trim(),
            description: data.description?.trim() || "",
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            estimatedMinutes:
              typeof data.estimatedMinutes === "number" && data.estimatedMinutes > 0
                ? data.estimatedMinutes
                : calculatedMinutes,
            repeat: "none",
          },
          now,
        );

        nextState = appendDailyPlan(nextState, plan);
        break;
      }

      case "reschedule": {
        if (!proposal.planId) continue;
        const currentPlan = nextState.dailyPlans.find((p) => p.id === proposal.planId);
        if (!currentPlan) continue;

        const data = proposal.newPlan;
        const targetDate = data?.date || proposal.originalTime?.date || currentPlan.date;
        const targetStartTime = data?.startTime || currentPlan.startTime;
        const targetEndTime = data?.endTime || currentPlan.endTime;

        if (!isTimeRangeValid(targetStartTime, targetEndTime)) {
          continue;
        }

        let targetProjectId =
          data?.projectId !== undefined ? data.projectId : currentPlan.projectId;
        let targetTaskId = data?.taskId !== undefined ? data.taskId : currentPlan.taskId;

        if (targetTaskId) {
          const task = nextState.tasks.find((t) => t.id === targetTaskId);
          if (!task) {
            targetTaskId = null;
          } else {
            targetProjectId = task.projectId;
          }
        }

        if (targetProjectId) {
          const project = nextState.projects.find((p) => p.id === targetProjectId && !p.archived);
          if (!project) {
            targetProjectId = null;
            targetTaskId = null;
          }
        }

        try {
          assertPlanRelation(nextState, targetProjectId, targetTaskId, false);
        } catch {
          targetProjectId = null;
          targetTaskId = null;
        }

        const calculatedMinutes = Math.max(
          15,
          timeToMinutes(targetEndTime) - timeToMinutes(targetStartTime),
        );

        nextState = updateDailyPlanState(
          nextState,
          proposal.planId,
          {
            name: data?.name ? data.name.trim() : currentPlan.name,
            description:
              data?.description !== undefined ? data.description.trim() : currentPlan.description,
            date: targetDate,
            startTime: targetStartTime,
            endTime: targetEndTime,
            projectId: targetProjectId,
            taskId: targetTaskId,
            estimatedMinutes:
              typeof data?.estimatedMinutes === "number" && data.estimatedMinutes > 0
                ? data.estimatedMinutes
                : calculatedMinutes,
          },
          now,
        );
        break;
      }

      case "delete": {
        if (!proposal.planId) continue;
        nextState = deleteDailyPlanState(nextState, proposal.planId);
        break;
      }
    }
  }

  return validateAppState(nextState);
}
