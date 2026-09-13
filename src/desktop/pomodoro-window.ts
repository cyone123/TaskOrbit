import type { ActiveTimer, AppState, Settings } from "@task-orbit/core";
import { emitTo } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauri } from "../store/persistence";

export const MAIN_WINDOW_LABEL = "main";
export const POMODORO_MINI_LABEL = "pomodoro-mini";
export const POMODORO_MINI_STATE_EVENT = "pomodoro:state";
export const POMODORO_MINI_READY_EVENT = "pomodoro:mini-ready";
export const POMODORO_MINI_ACTION_EVENT = "pomodoro:action";

export interface PomodoroMiniSnapshot {
  timer: ActiveTimer | null;
  targetLabel: string;
  focusMinutes: number;
  theme: Settings["theme"];
}

export type PomodoroMiniAction =
  | { type: "toggle" }
  | { type: "reset" }
  | { type: "skip" }
  | { type: "reconcile" };

export function supportsPomodoroMiniWindow(): boolean {
  return isTauri();
}

function timerTargetLabel(state: AppState): string {
  const timer = state.activeTimer;
  if (!timer) return "自由专注";

  if (timer.dailyPlanId) {
    return state.dailyPlans.find((plan) => plan.id === timer.dailyPlanId)?.name ?? "每日计划";
  }
  if (timer.taskId) {
    return state.tasks.find((task) => task.id === timer.taskId)?.name ?? "任务";
  }
  if (timer.projectId) {
    return state.projects.find((project) => project.id === timer.projectId)?.name ?? "项目";
  }
  return "自由专注";
}

export function createPomodoroMiniSnapshot(state: AppState): PomodoroMiniSnapshot {
  return {
    timer: state.activeTimer,
    targetLabel: timerTargetLabel(state),
    focusMinutes: state.settings.focusMinutes,
    theme: state.settings.theme,
  };
}

export async function sendPomodoroMiniAction(action: PomodoroMiniAction): Promise<void> {
  if (!isTauri()) return;
  await emitTo(MAIN_WINDOW_LABEL, POMODORO_MINI_ACTION_EVENT, action);
}

export async function openPomodoroMiniWindow(): Promise<void> {
  if (!isTauri()) return;

  const existing = await WebviewWindow.getByLabel(POMODORO_MINI_LABEL);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const miniWindow = new WebviewWindow(POMODORO_MINI_LABEL, {
      url: "index.html?window=pomodoro-mini",
      title: "番茄钟",
      width: 360,
      height: 224,
      minWidth: 300,
      minHeight: 190,
      maxWidth: 720,
      maxHeight: 440,
      center: true,
      resizable: true,
      maximizable: false,
      minimizable: false,
      fullscreen: false,
      focus: true,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      shadow: false,
    });

    void miniWindow.once("tauri://created", () => resolve());
    void miniWindow.once("tauri://error", (event) => {
      reject(new Error(`创建番茄钟小窗失败：${String(event.payload)}`));
    });
  });
}
