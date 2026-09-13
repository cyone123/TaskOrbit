import { useEffect, useRef } from "react";
import type { ActiveTimer } from "@task-orbit/core";
import { useSnackbar } from "../components/ui";
import { useStore } from "../store/store";

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

export function PomodoroNotifier() {
  const timer = useStore().state.activeTimer;
  const { show } = useSnackbar();
  const previousTimerRef = useRef<ActiveTimer | null>(timer);

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
        playBeep(3);
        show(
          timer.phase === "longBreak"
            ? "专注完成！进入长休息"
            : "专注完成！进入短休息",
        );
      } else {
        playBeep(2);
        show("休息结束，开始新的专注");
      }
    }
    previousTimerRef.current = timer;
  }, [show, timer]);

  return null;
}
