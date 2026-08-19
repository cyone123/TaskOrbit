import type {
  ActiveTimer,
  PomodoroKind,
  PomodoroLink,
  Settings,
} from "./types";

export const MAX_TIMER_CATCH_UP_PHASES = 1000;

export interface CompletedFocus {
  projectId: string | null;
  taskId: string | null;
  dailyPlanId: string | null;
  kind: "focus";
  startedAt: number;
  endedAt: number;
  minutes: number;
}

export interface TimerReconcileResult {
  timer: ActiveTimer | null;
  completed: CompletedFocus[];
  warning: string | null;
  changed: boolean;
}

export function durationForPhase(settings: Settings, phase: PomodoroKind): number {
  if (phase === "focus") return settings.focusMinutes * 60_000;
  if (phase === "shortBreak") return settings.shortBreakMinutes * 60_000;
  return settings.longBreakMinutes * 60_000;
}

export function createPausedTimer(
  settings: Settings,
  phase: PomodoroKind = "focus",
  link: PomodoroLink = { projectId: null, taskId: null, dailyPlanId: null },
  focusCount = 0,
): ActiveTimer {
  const durationMs = durationForPhase(settings, phase);
  return {
    ...link,
    phase,
    status: "paused",
    focusCount,
    durationMs,
    remainingMs: durationMs,
    phaseStartedAt: null,
    endAt: null,
  };
}

export function startTimer(
  timer: ActiveTimer | null,
  settings: Settings,
  link: PomodoroLink,
  now = Date.now(),
): ActiveTimer {
  const base = timer ?? createPausedTimer(settings, "focus", link);
  if (base.status === "running") return { ...base, ...link };
  return {
    ...base,
    ...link,
    status: "running",
    phaseStartedAt: base.phaseStartedAt ?? now,
    endAt: now + Math.max(0, base.remainingMs),
  };
}

export function pauseTimer(timer: ActiveTimer | null, now = Date.now()): ActiveTimer | null {
  if (!timer || timer.status !== "running" || timer.endAt === null) return timer;
  return {
    ...timer,
    status: "paused",
    remainingMs: Math.max(0, timer.endAt - now),
    endAt: null,
  };
}

export function resumeTimer(
  timer: ActiveTimer | null,
  settings: Settings,
  now = Date.now(),
): ActiveTimer {
  const base = timer ?? createPausedTimer(settings);
  return startTimer(base, settings, {
    projectId: base.projectId,
    taskId: base.taskId,
    dailyPlanId: base.dailyPlanId,
  }, now);
}

export function selectTimerPhase(
  timer: ActiveTimer | null,
  settings: Settings,
  phase: PomodoroKind,
): ActiveTimer {
  const base = timer ?? createPausedTimer(settings);
  return createPausedTimer(
    settings,
    phase,
    {
      projectId: base.projectId,
      taskId: base.taskId,
      dailyPlanId: base.dailyPlanId,
    },
    base.focusCount,
  );
}

export function skipTimer(
  timer: ActiveTimer | null,
  settings: Settings,
): ActiveTimer {
  const base = timer ?? createPausedTimer(settings);
  const focusCount = base.phase === "focus" ? base.focusCount + 1 : base.focusCount;
  const phase =
    base.phase === "focus"
      ? focusCount % settings.longBreakInterval === 0
        ? "longBreak"
        : "shortBreak"
      : "focus";
  return createPausedTimer(
    settings,
    phase,
    {
      projectId: base.projectId,
      taskId: base.taskId,
      dailyPlanId: base.dailyPlanId,
    },
    focusCount,
  );
}

export function resetTimer(): null {
  return null;
}

export function updateTimerLink(
  timer: ActiveTimer | null,
  settings: Settings,
  link: PomodoroLink,
): ActiveTimer {
  const base = timer ?? createPausedTimer(settings);
  return { ...base, ...link };
}

function transitionAfterCompletion(
  timer: ActiveTimer,
  settings: Settings,
  endedAt: number,
): ActiveTimer {
  const focusCompleted = timer.phase === "focus";
  const focusCount = focusCompleted ? timer.focusCount + 1 : timer.focusCount;
  const phase = focusCompleted
    ? focusCount % settings.longBreakInterval === 0
      ? "longBreak"
      : "shortBreak"
    : "focus";
  const durationMs = durationForPhase(settings, phase);
  return {
    ...timer,
    phase,
    status: "running",
    focusCount,
    durationMs,
    remainingMs: durationMs,
    phaseStartedAt: endedAt,
    endAt: endedAt + durationMs,
  };
}

export function reconcileTimer(
  timer: ActiveTimer | null,
  settings: Settings,
  now = Date.now(),
): TimerReconcileResult {
  if (!timer || timer.status !== "running" || timer.endAt === null || timer.endAt > now) {
    return { timer, completed: [], warning: null, changed: false };
  }

  let current = timer;
  const completed: CompletedFocus[] = [];
  let transitions = 0;

  while (
    current.status === "running" &&
    current.endAt !== null &&
    current.endAt <= now &&
    transitions < MAX_TIMER_CATCH_UP_PHASES
  ) {
    const endedAt = current.endAt;
    if (current.phase === "focus") {
      completed.push({
        projectId: current.projectId,
        taskId: current.taskId,
        dailyPlanId: current.dailyPlanId,
        kind: "focus",
        startedAt: current.phaseStartedAt ?? endedAt - current.durationMs,
        endedAt,
        minutes: Math.max(1, Math.ceil(current.durationMs / 60_000)),
      });
    }
    current = transitionAfterCompletion(current, settings, endedAt);
    transitions += 1;
  }

  let warning: string | null = null;
  if (current.status === "running" && current.endAt !== null && current.endAt <= now) {
    current = {
      ...current,
      status: "paused",
      remainingMs: current.durationMs,
      phaseStartedAt: null,
      endAt: null,
    };
    warning = `计时器离线追赶超过 ${MAX_TIMER_CATCH_UP_PHASES} 个阶段，已暂停以保护数据。`;
  }

  return { timer: current, completed, warning, changed: true };
}
