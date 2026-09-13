import { useEffect, useMemo, useRef } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { useStore } from "../store/store";
import { isTauri } from "../store/persistence";
import {
  createPomodoroMiniSnapshot,
  POMODORO_MINI_ACTION_EVENT,
  POMODORO_MINI_LABEL,
  POMODORO_MINI_READY_EVENT,
  POMODORO_MINI_STATE_EVENT,
  type PomodoroMiniAction,
  type PomodoroMiniSnapshot,
} from "./pomodoro-window";

const EMPTY_LINK = {
  projectId: null,
  taskId: null,
  dailyPlanId: null,
};

export function PomodoroWindowBridge() {
  const store = useStore();
  const {
    state,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipTimer,
    reconcileTimerNow,
  } = store;

  const snapshot = useMemo(
    () => createPomodoroMiniSnapshot(state),
    [
      state.activeTimer,
      state.settings.focusMinutes,
      state.settings.theme,
      state.projects,
      state.tasks,
      state.dailyPlans,
    ],
  );
  const snapshotRef = useRef<PomodoroMiniSnapshot>(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
    if (!isTauri()) return;
    void emitTo(POMODORO_MINI_LABEL, POMODORO_MINI_STATE_EVENT, snapshot).catch(() => undefined);
  }, [snapshot]);

  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    const unlisteners: Array<() => void> = [];

    void Promise.all([
      listen(POMODORO_MINI_READY_EVENT, () => {
        void emitTo(
          POMODORO_MINI_LABEL,
          POMODORO_MINI_STATE_EVENT,
          snapshotRef.current,
        ).catch(() => undefined);
      }),
      listen<PomodoroMiniAction>(POMODORO_MINI_ACTION_EVENT, (event) => {
        switch (event.payload?.type) {
          case "toggle":
            if (snapshotRef.current.timer?.status === "running") {
              pauseTimer();
            } else if (snapshotRef.current.timer) {
              resumeTimer();
            } else {
              startTimer(EMPTY_LINK);
            }
            break;
          case "reset":
            resetTimer();
            break;
          case "skip":
            skipTimer();
            break;
          case "reconcile":
            reconcileTimerNow();
            break;
          default:
            break;
        }
      }),
    ]).then((nextUnlisteners) => {
      if (disposed) {
        nextUnlisteners.forEach((unlisten) => unlisten());
        return;
      }
      unlisteners.push(...nextUnlisteners);
    });

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [pauseTimer, reconcileTimerNow, resetTimer, resumeTimer, skipTimer, startTimer]);

  return null;
}
