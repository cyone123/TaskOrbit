import {
  DEFAULT_SETTINGS,
  DEFAULT_VAULT_SETTINGS,
  DEFAULT_WEBDAV_SETTINGS,
  STATE_VERSION,
  addDays,
  createEmptyState,
  toISODate,
  todayISO,
  uid,
  type AppState,
  type DailyPlan,
  type PomodoroSession,
  type Priority,
  type Project,
  type Task,
} from "@task-orbit/core";

function d(offset: number): string {
  return toISODate(addDays(new Date(), offset));
}

function mkProject(
  name: string,
  color: string,
  startOffset: number,
  endOffset: number,
  description = "",
): Project {
  const now = Date.now();
  return {
    id: uid("p_"),
    name,
    description,
    color,
    startDate: d(startOffset),
    endDate: d(endOffset),
    archived: false,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function mkTask(
  projectId: string,
  name: string,
  startOffset: number,
  endOffset: number,
  priority: Priority,
  done = false,
  description = "",
): Task {
  const now = Date.now();
  return {
    id: uid("t_"),
    projectId,
    name,
    description,
    startDate: d(startOffset),
    endDate: d(endOffset),
    done,
    priority,
    createdAt: now,
    updatedAt: now,
  };
}

function mkPlan(
  input: Omit<DailyPlan, "id" | "done" | "createdAt" | "updatedAt" | "estimatedMinutes" | "recurrence"> &
    Partial<Pick<DailyPlan, "recurrence">> &
    Partial<Pick<DailyPlan, "done" | "estimatedMinutes">>,
): DailyPlan {
  const now = Date.now();
  return {
    id: uid("pl_"),
    done: input.done ?? false,
    estimatedMinutes: input.estimatedMinutes ?? 60,
    recurrence: input.recurrence ?? {
      frequency: "none",
      count: 1,
      seriesId: null,
      occurrence: 1,
    },
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

/**
 * A new installation intentionally starts empty. Demo data is kept in a
 * separate factory so development fixtures remain available without leaking
 * into the user's first-run experience.
 */
export function createDefaultState(): AppState {
  return createEmptyState();
}

/** Development fixture. This is never loaded automatically. */
export function createDemoState(): AppState {
  const release = mkProject("产品发布", "violet", -14, 20, "App 2.0 版本发布计划");
  const learn = mkProject("个人学习", "blue", -7, 30, "持续学习与自我提升");
  const fitness = mkProject("健身计划", "green", -10, 40, "减脂与增肌");

  const tasks: Task[] = [
    mkTask(release.id, "需求评审", -10, -5, "high", true, "梳理并冻结 2.0 需求"),
    mkTask(release.id, "UI 设计", -5, 3, "medium", false, "完成核心页面视觉稿"),
    mkTask(release.id, "开发迭代", 1, 10, "high", false, "前端 + 后端联调开发"),
    mkTask(release.id, "测试与修复", 8, 16, "medium", false, "回归测试与缺陷修复"),
    mkTask(learn.id, "Rust 学习", -7, 14, "medium", false, "系统学习 Rust 语言"),
    mkTask(learn.id, "英语阅读", 0, 21, "low", false, "每日英文原版阅读"),
    mkTask(fitness.id, "减脂期", -10, 20, "high", false, "控制饮食 + 有氧"),
    mkTask(fitness.id, "增肌期", 21, 45, "low", false, "力量训练 + 增肌"),
  ];

  const uiTask = tasks[1];
  const devTask = tasks[2];
  const rustTask = tasks[4];

  const plans: DailyPlan[] = [
    mkPlan({
      projectId: release.id,
      taskId: uiTask.id,
      name: "设计首页原型",
      description: "输出首页高保真原型",
      date: todayISO(),
      startTime: "09:00",
      endTime: "11:00",
    }),
    mkPlan({
      projectId: release.id,
      taskId: uiTask.id,
      name: "评审设计稿",
      description: "与团队评审视觉稿",
      date: d(1),
      startTime: "14:00",
      endTime: "15:30",
    }),
    mkPlan({
      projectId: release.id,
      taskId: devTask.id,
      name: "搭建项目骨架",
      description: "初始化前端工程与目录结构",
      date: d(1),
      startTime: "09:30",
      endTime: "12:00",
    }),
    mkPlan({
      projectId: learn.id,
      taskId: rustTask.id,
      name: "所有权与借用",
      description: "学习 Rust 所有权系统",
      date: todayISO(),
      startTime: "20:00",
      endTime: "21:30",
    }),
    mkPlan({
      projectId: learn.id,
      taskId: null,
      name: "晨间阅读",
      description: "英语原版书阅读",
      date: todayISO(),
      startTime: "07:30",
      endTime: "08:00",
      estimatedMinutes: 30,
    }),
    mkPlan({
      projectId: fitness.id,
      taskId: null,
      name: "晨跑 5km",
      description: "有氧慢跑",
      date: todayISO(),
      startTime: "06:30",
      endTime: "07:30",
    }),
    mkPlan({
      projectId: null,
      taskId: null,
      name: "整理房间",
      description: "收拾书桌与卧室",
      date: todayISO(),
      startTime: "18:00",
      endTime: "19:00",
    }),
    mkPlan({
      projectId: release.id,
      taskId: null,
      name: "版本发布准备",
      description: "准备发布说明与物料",
      date: d(2),
      startTime: "10:00",
      endTime: "11:30",
    }),
  ];

  // A few historical pomodoro sessions for the stats view.
  const sessions: PomodoroSession[] = [];
  const pushSession = (dayOffset: number, minutes: number, projectId: string | null, taskId: string | null) => {
    const end = new Date();
    end.setDate(end.getDate() + dayOffset);
    end.setHours(10 + Math.floor(minutes / 60), end.getMinutes() + (minutes % 60), 0, 0);
    const project = projectId ? [release, learn, fitness].find((p) => p.id === projectId) : null;
    const task = taskId ? tasks.find((t) => t.id === taskId) : null;
    sessions.push({
      id: uid("s_"),
      projectId,
      taskId,
      dailyPlanId: null,
      projectNameSnapshot: project?.name ?? null,
      taskNameSnapshot: task?.name ?? null,
      dailyPlanNameSnapshot: null,
      kind: "focus",
      startedAt: end.getTime() - minutes * 60_000,
      endedAt: end.getTime(),
      minutes,
    });
  };
  pushSession(0, 25, release.id, uiTask.id);
  pushSession(0, 25, release.id, uiTask.id);
  pushSession(-1, 50, release.id, uiTask.id);
  pushSession(-1, 25, learn.id, rustTask.id);
  pushSession(-2, 75, fitness.id, null);
  pushSession(-3, 50, release.id, null);
  pushSession(-4, 25, learn.id, null);
  pushSession(-5, 100, release.id, null);
  pushSession(-6, 50, fitness.id, null);

  return {
    version: STATE_VERSION,
    projects: [release, learn, fitness],
    tasks,
    dailyPlans: plans,
    inboxItems: [],
    pomodoroSessions: sessions,
    activeTimer: null,
    vaultSettings: { ...DEFAULT_VAULT_SETTINGS },
    webDavSettings: { ...DEFAULT_WEBDAV_SETTINGS },
    settings: {
      ...DEFAULT_SETTINGS,
    },
  };
}
