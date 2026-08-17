import { invoke } from "@tauri-apps/api/core";
import type { AppState } from "../types";

const LS_KEY = "task-orbit-state";
const LS_BACKUP_KEY = "task-orbit-state-backup";

export type PersistedLoadSource = "empty" | "primary" | "backup";

export interface PersistedLoadResult {
  state: unknown | null;
  backupState?: unknown | null;
  source: PersistedLoadSource;
  warning?: string | null;
}

/** True when running inside the Tauri webview. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function parseBrowserValue(raw: string, source: "primary" | "backup"): PersistedLoadResult {
  try {
    return { state: JSON.parse(raw) as unknown, source };
  } catch (error) {
    throw new Error(`${source === "primary" ? "主数据" : "备份数据"}无法解析：${String(error)}`);
  }
}

export async function loadPersistedState(): Promise<PersistedLoadResult> {
  if (isTauri()) {
    return invoke<PersistedLoadResult>("load_state");
  }

  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      let backupState: unknown | null = null;
      const backupRaw = localStorage.getItem(LS_BACKUP_KEY);
      if (backupRaw) {
        try {
          backupState = JSON.parse(backupRaw) as unknown;
        } catch {
          backupState = null;
        }
      }
      return { state: JSON.parse(raw) as unknown, backupState, source: "primary" };
    } catch {
      const backup = localStorage.getItem(LS_BACKUP_KEY);
      if (backup) {
        const result = parseBrowserValue(backup, "backup");
        return {
          ...result,
          warning: "主数据损坏，已自动从浏览器备份恢复。",
        };
      }
      throw new Error("主数据损坏，且没有可用备份。");
    }
  }

  const backup = localStorage.getItem(LS_BACKUP_KEY);
  if (backup) {
    const result = parseBrowserValue(backup, "backup");
    return {
      ...result,
      warning: "未找到主数据，已从浏览器备份恢复。",
    };
  }

  return { state: null, source: "empty" };
}

export async function persistState(state: AppState): Promise<void> {
  if (isTauri()) {
    await invoke("save_state", { state });
    return;
  }

  const serialized = JSON.stringify(state);
  const previous = localStorage.getItem(LS_KEY);
  if (previous) localStorage.setItem(LS_BACKUP_KEY, previous);
  localStorage.setItem(LS_KEY, serialized);
}

export async function clearPersistedState(): Promise<void> {
  if (isTauri()) {
    await invoke("reset_state");
    return;
  }
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_BACKUP_KEY);
}
