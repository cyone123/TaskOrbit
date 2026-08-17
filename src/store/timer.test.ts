import { describe, expect, it } from "vitest";
import type { PomodoroLink, Settings } from "../types";
import {
  MAX_TIMER_CATCH_UP_PHASES,
  createPausedTimer,
  pauseTimer,
  reconcileTimer,
  resetTimer,
  resumeTimer,
  selectTimerPhase,
  skipTimer,
  startTimer,
  updateTimerLink,
} from "./timer";

const settings: Settings = {
  theme: "system",
  focusMinutes: 1,
  shortBreakMinutes: 1,
  longBreakMinutes: 2,
  longBreakInterval: 2,
};

const link: PomodoroLink = {
  projectId: "p_1",
  taskId: "t_1",
  dailyPlanId: null,
};

describe("active timer state machine", () => {
  it("starts, pauses, resumes and resets without changing the planned duration", () => {
    const started = startTimer(null, settings, link, 1_000);
    expect(started.status).toBe("running");
    expect(started.endAt).toBe(61_000);
    expect(started.durationMs).toBe(60_000);

    const paused = pauseTimer(started, 31_000);
    expect(paused?.status).toBe("paused");
    expect(paused?.remainingMs).toBe(30_000);
    expect(paused?.endAt).toBeNull();

    const resumed = resumeTimer(paused, settings, 40_000);
    expect(resumed.status).toBe("running");
    expect(resumed.endAt).toBe(70_000);
    expect(resumed.durationMs).toBe(60_000);

    expect(resetTimer()).toBeNull();
  });

  it("selects phases, updates links and skips without recording a session", () => {
    const selected = selectTimerPhase(null, settings, "longBreak");
    expect(selected.phase).toBe("longBreak");
    expect(selected.status).toBe("paused");
    expect(selected.durationMs).toBe(120_000);

    const linked = updateTimerLink(selected, settings, link);
    expect(linked.projectId).toBe("p_1");

    const skipped = skipTimer(linked, settings);
    expect(skipped.phase).toBe("focus");
    expect(skipped.focusCount).toBe(0);
    expect(skipped.status).toBe("paused");
  });

  it("catches up multiple wall-clock phases and records completed focus phases", () => {
    const started = startTimer(null, settings, link, 0);
    const result = reconcileTimer(started, settings, 240_000);

    expect(result.changed).toBe(true);
    expect(result.warning).toBeNull();
    expect(result.completed).toHaveLength(2);
    expect(result.completed[0]).toMatchObject({ startedAt: 0, endedAt: 60_000, minutes: 1 });
    expect(result.completed[1]).toMatchObject({ startedAt: 120_000, endedAt: 180_000, minutes: 1 });
    expect(result.timer?.phase).toBe("longBreak");
    expect(result.timer?.status).toBe("running");
    expect(result.timer?.phaseStartedAt).toBe(180_000);
    expect(result.timer?.endAt).toBe(300_000);
  });

  it("freezes the current phase duration when settings change", () => {
    const started = startTimer(null, settings, link, 0);
    const changedSettings = { ...settings, shortBreakMinutes: 5 };
    const result = reconcileTimer(started, changedSettings, 60_000);

    expect(result.completed[0].minutes).toBe(1);
    expect(result.timer?.phase).toBe("shortBreak");
    expect(result.timer?.durationMs).toBe(5 * 60_000);
  });

  it("pauses and warns when offline catch-up reaches the safety cap", () => {
    const started = startTimer(null, settings, link, 0);
    const result = reconcileTimer(started, settings, MAX_TIMER_CATCH_UP_PHASES * 120_000);

    expect(result.warning).toContain(String(MAX_TIMER_CATCH_UP_PHASES));
    expect(result.timer?.status).toBe("paused");
    expect(result.timer?.endAt).toBeNull();
    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.completed.length).toBeLessThanOrEqual(MAX_TIMER_CATCH_UP_PHASES);
  });
});
