import { useEffect, useRef } from "react";
import type { ActiveTimer } from "@task-orbit/core";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useSnackbar } from "../components/ui";
import { useStore } from "../store/store";
import { isTauri } from "../store/persistence";

function playBeep(times = 3) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      const t = ctx.currentTime + i * 0.35;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  } catch {
    /* audio unavailable */
  }
}

let notificationPermissionPromise: Promise<boolean> | null = null;

function ensureNotificationPermission(): Promise<boolean> {
  if (!isTauri()) return Promise.resolve(false);
  if (notificationPermissionPromise) return notificationPermissionPromise;

  notificationPermissionPromise = (async () => {
    try {
      if (await isPermissionGranted()) return true;
      return (await requestPermission()) === "granted";
    } catch {
      return false;
    }
  })();

  return notificationPermissionPromise;
}

async function notifySystem(title: string, body: string): Promise<void> {
  if (!(await ensureNotificationPermission())) return;
  try {
    sendNotification({ title, body });
  } catch {
    /* system notification unavailable */
  }
}

export function PomodoroNotifier() {
  const timer = useStore().state.activeTimer;
  const { show } = useSnackbar();
  const previousTimerRef = useRef<ActiveTimer | null>(timer);

  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  useEffect(() => {
    const previous = previousTimerRef.current;
    if (
      previous &&
      timer &&
      previous.phase !== timer.phase &&
      previous.status === "running" &&
      timer.status === "running"
    ) {
      if (previous.phase === "focus") {
        const message =
          timer.phase === "longBreak"
            ? "专注完成！进入长休息"
            : "专注完成！进入短休息";
        playBeep(3);
        show(message);
        void notifySystem("Task Orbit · 专注完成", message);
      } else {
        const message = "休息结束，开始新的专注";
        playBeep(2);
        show(message);
        void notifySystem("Task Orbit · 休息结束", message);
      }
    }
    previousTimerRef.current = timer;
  }, [show, timer]);

  return null;
}
