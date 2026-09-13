import { useEffect, useRef, useState } from "react";
import { emitTo, listen, TauriEvent } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon } from "../components/Icon";
import { FilledButton, IconButton, LinearProgress } from "../components/material";
import {
  MAIN_WINDOW_LABEL,
  POMODORO_MINI_LABEL,
  POMODORO_MINI_READY_EVENT,
  POMODORO_MINI_STATE_EVENT,
  sendPomodoroMiniAction,
  type PomodoroMiniSnapshot,
} from "../desktop/pomodoro-window";

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function phaseLabel(phase: "focus" | "shortBreak" | "longBreak"): string {
  if (phase === "shortBreak") return "短休息";
  if (phase === "longBreak") return "长休息";
  return "专注";
}

export function PomodoroMiniView() {
  const [snapshot, setSnapshot] = useState<PomodoroMiniSnapshot | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const reconciledEndAtRef = useRef<number | null>(null);
  const timer = snapshot?.timer ?? null;
  const running = timer?.status === "running";
  const phase = timer?.phase ?? "focus";

  useEffect(() => {
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    void Promise.all([
      listen<PomodoroMiniSnapshot>(POMODORO_MINI_STATE_EVENT, (event) => {
        setSnapshot(event.payload);
      }),
      listen(
        TauriEvent.WINDOW_DESTROYED,
        () => {
          void getCurrentWindow().close();
        },
        { target: { kind: "Window", label: MAIN_WINDOW_LABEL } },
      ),
    ]).then((nextUnlisteners) => {
      if (disposed) {
        nextUnlisteners.forEach((unlisten) => unlisten());
        return;
      }
      unlisteners.push(...nextUnlisteners);
      void emitTo(MAIN_WINDOW_LABEL, POMODORO_MINI_READY_EVENT, {
        window: POMODORO_MINI_LABEL,
      });
    });

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const theme = snapshot?.theme ?? "system";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    };
    apply();
    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [snapshot?.theme]);

  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running, timer?.endAt]);

  useEffect(() => {
    if (!running || timer?.endAt === null || timer?.endAt === undefined) {
      reconciledEndAtRef.current = null;
      return;
    }
    if (timer.endAt <= now && reconciledEndAtRef.current !== timer.endAt) {
      reconciledEndAtRef.current = timer.endAt;
      void sendPomodoroMiniAction({ type: "reconcile" });
    }
  }, [now, running, timer?.endAt]);

  const focusDuration = (snapshot?.focusMinutes ?? 25) * 60_000;
  const remaining = timer
    ? running && timer.endAt !== null
      ? Math.max(0, timer.endAt - now)
      : timer.remainingMs
    : focusDuration;
  const total = timer?.durationMs ?? focusDuration;
  const progress = total > 0 ? remaining / total : 0;
  const status = running ? "进行中" : timer ? "已暂停" : "准备开始";

  const toggle = () => {
    void sendPomodoroMiniAction({ type: "toggle" });
  };

  return (
    <div className={`pomodoro-mini-root pomo-phase-${phase}${running ? " is-running" : ""}`}>
      <div className="pomodoro-mini-surface">
        <div className="pomodoro-mini-topbar">
          <button
            type="button"
            className="pomodoro-mini-drag"
            onMouseDown={(event) => {
              if (event.button === 0) void getCurrentWindow().startDragging();
            }}
            aria-label="拖动番茄钟小窗"
            title="拖动小窗"
          >
            <span className="pomodoro-mini-phase-dot" />
            <span className="label-lg">{phaseLabel(phase)}</span>
            <span className="label-sm muted">{status}</span>
          </button>
          <IconButton
            className="pomodoro-mini-close"
            onClick={() => void getCurrentWindow().close()}
            aria-label="关闭小窗"
            title="关闭小窗"
          >
            <Icon name="close" size={18} />
          </IconButton>
        </div>

        <div className="pomodoro-mini-content">
          <div className="pomodoro-mini-clock tabular-nums">
            {snapshot ? clock(remaining) : "--:--"}
          </div>
          <div className="body-sm muted pomodoro-mini-target ellipsis">
            {snapshot?.targetLabel ?? "正在同步…"}
          </div>
          <LinearProgress className="pomodoro-mini-progress" value={snapshot ? progress : 0} />

          <div className="pomodoro-mini-controls">
            <IconButton
              onClick={() => void sendPomodoroMiniAction({ type: "reset" })}
              aria-label="重置"
              title="重置"
            >
              <Icon name="replay" size={21} />
            </IconButton>
            <FilledButton className="pomodoro-mini-primary" onClick={toggle}>
              <Icon name={running ? "pause" : "play_arrow"} slot="icon" size={20} />
              {running ? "暂停" : timer ? "继续" : "开始"}
            </FilledButton>
            <IconButton
              onClick={() => void sendPomodoroMiniAction({ type: "skip" })}
              aria-label="跳过"
              title="跳过"
            >
              <Icon name="skip_next" size={21} />
            </IconButton>
          </div>
        </div>

        <button
          type="button"
          className="pomodoro-mini-resize"
          onMouseDown={(event) => {
            if (event.button === 0) {
              event.preventDefault();
              event.stopPropagation();
              void getCurrentWindow().startResizeDragging("SouthEast");
            }
          }}
          aria-label="调整小窗大小"
          title="拖动调整大小"
        >
          <Icon name="south_east" size={14} />
        </button>
      </div>
    </div>
  );
}
