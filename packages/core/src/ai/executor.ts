import { addDays, toISODate } from "../date";
import { calculateProjectProgress } from "../domain";
import type { AppState } from "../types";

export function executeReadTool(
  state: AppState,
  toolName: string,
  args: Record<string, unknown> = {},
  now = Date.now(),
): unknown {
  const currentDate = toISODate(new Date(now));

  switch (toolName) {
    case "get_workspace_summary": {
      const activeProjects = state.projects.filter((p) => !p.archived);
      const projectSummaries = activeProjects.map((project) => {
        const projectTasks = state.tasks.filter((t) => t.projectId === project.id);
        const projectPlans = state.dailyPlans.filter((p) => p.projectId === project.id);
        const progress = calculateProjectProgress(projectTasks, projectPlans);
        return {
          id: project.id,
          name: project.name,
          startDate: project.startDate,
          endDate: project.endDate,
          taskCount: projectTasks.length,
          completedTaskCount: projectTasks.filter((t) => t.done).length,
          progress: Math.round(progress),
        };
      });

      const todayPlans = state.dailyPlans
        .filter((plan) => plan.date === currentDate)
        .map((plan) => {
          const project = plan.projectId
            ? state.projects.find((p) => p.id === plan.projectId)
            : null;
          const task = plan.taskId ? state.tasks.find((t) => t.id === plan.taskId) : null;
          return {
            id: plan.id,
            name: plan.name,
            startTime: plan.startTime,
            endTime: plan.endTime,
            estimatedMinutes: plan.estimatedMinutes,
            done: plan.done,
            projectName: project?.name ?? null,
            taskName: task?.name ?? null,
          };
        });

      const pendingInboxCount = state.inboxItems.filter((item) => !item.done).length;

      return {
        currentDate,
        totalActiveProjects: activeProjects.length,
        projects: projectSummaries,
        todayPlans: {
          total: todayPlans.length,
          completed: todayPlans.filter((p) => p.done).length,
          plans: todayPlans,
        },
        inboxPendingCount: pendingInboxCount,
        hasActiveTimer:
          state.activeTimer !== null && state.activeTimer.status === "running",
        activeTimerPhase: state.activeTimer?.phase ?? null,
      };
    }

    case "get_inbox_items": {
      const kind = (args.kind as string) ?? "all";
      const done = typeof args.done === "boolean" ? args.done : false;

      let items = state.inboxItems.filter((item) => item.done === done);
      if (kind === "todo" || kind === "note") {
        items = items.filter((item) => item.kind === kind);
      }

      return {
        total: items.length,
        items: items.map((item) => ({
          id: item.id,
          kind: item.kind,
          content: item.content,
          done: item.done,
          createdAt: item.createdAt,
        })),
      };
    }

    case "get_projects_and_tasks": {
      const targetProjectId = typeof args.projectId === "string" ? args.projectId : null;
      const includeArchived = Boolean(args.includeArchivedProjects);
      const includeDoneTasks = args.includeDoneTasks !== false;

      let projects = state.projects;
      if (!includeArchived) {
        projects = projects.filter((p) => !p.archived);
      }
      if (targetProjectId) {
        projects = projects.filter((p) => p.id === targetProjectId);
      }

      const result = projects.map((project) => {
        let tasks = state.tasks.filter((t) => t.projectId === project.id);
        if (!includeDoneTasks) {
          tasks = tasks.filter((t) => !t.done);
        }
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          startDate: project.startDate,
          endDate: project.endDate,
          archived: project.archived,
          tasks: tasks.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            priority: t.priority,
            startDate: t.startDate,
            endDate: t.endDate,
            done: t.done,
          })),
        };
      });

      return { projects: result };
    }

    case "get_daily_plans": {
      const startDate = (args.startDate as string) || currentDate;
      const endDate = (args.endDate as string) || startDate;

      const plans = state.dailyPlans
        .filter((plan) => plan.date >= startDate && plan.date <= endDate)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.startTime.localeCompare(b.startTime);
        })
        .map((plan) => {
          const project = plan.projectId
            ? state.projects.find((p) => p.id === plan.projectId)
            : null;
          const task = plan.taskId ? state.tasks.find((t) => t.id === plan.taskId) : null;
          return {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            date: plan.date,
            startTime: plan.startTime,
            endTime: plan.endTime,
            estimatedMinutes: plan.estimatedMinutes,
            done: plan.done,
            projectId: plan.projectId,
            projectName: project?.name ?? null,
            taskId: plan.taskId,
            taskName: task?.name ?? null,
          };
        });

      return {
        startDate,
        endDate,
        total: plans.length,
        plans,
      };
    }

    case "get_pomodoro_stats": {
      const days = typeof args.days === "number" && args.days > 0 ? args.days : 7;
      let startIso = typeof args.startDate === "string" ? args.startDate : "";
      let endIso = typeof args.endDate === "string" ? args.endDate : "";

      if (!startIso || !endIso) {
        const nowDate = new Date(now);
        endIso = toISODate(nowDate);
        startIso = toISODate(addDays(nowDate, -days + 1));
      }

      const startMs = new Date(`${startIso}T00:00:00`).getTime();
      const endMs = new Date(`${endIso}T23:59:59.999`).getTime();

      const filteredSessions = state.pomodoroSessions.filter(
        (s) => s.kind === "focus" && s.startedAt >= startMs && s.startedAt <= endMs,
      );

      const totalMinutes = filteredSessions.reduce((acc, s) => acc + s.minutes, 0);
      const totalSessions = filteredSessions.length;

      const byProjectMap = new Map<string, { minutes: number; count: number }>();
      const byDateMap = new Map<string, { minutes: number; count: number }>();

      for (const session of filteredSessions) {
        const sessionDate = toISODate(new Date(session.startedAt));
        const projName =
          session.projectNameSnapshot ||
          (session.projectId
            ? state.projects.find((p) => p.id === session.projectId)?.name
            : null) ||
          "独立专注";

        const pData = byProjectMap.get(projName) || { minutes: 0, count: 0 };
        pData.minutes += session.minutes;
        pData.count += 1;
        byProjectMap.set(projName, pData);

        const dData = byDateMap.get(sessionDate) || { minutes: 0, count: 0 };
        dData.minutes += session.minutes;
        dData.count += 1;
        byDateMap.set(sessionDate, dData);
      }

      const byProject = Array.from(byProjectMap.entries()).map(([projectName, data]) => ({
        projectName,
        minutes: data.minutes,
        sessions: data.count,
        percentage:
          totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 100) : 0,
      }));

      const byDate = Array.from(byDateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          minutes: data.minutes,
          sessions: data.count,
        }));

      return {
        startDate: startIso,
        endDate: endIso,
        totalFocusMinutes: totalMinutes,
        totalSessions,
        byProject,
        byDate,
      };
    }

    default:
      throw new Error(`未知的只读工具: ${toolName}`);
  }
}
