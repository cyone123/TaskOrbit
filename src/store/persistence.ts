import { invoke } from "@tauri-apps/api/core";
import type { AppState } from "../types";

const LS_KEY = "task-orbit-state";

/** True when running inside the Tauri webview. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadPersistedState(): Promise<AppState | null> {
  if (isTauri()) {
    const result = await invoke<AppState | null>("load_state");
    return result ?? null;
  }
  const raw = localStorage.getItem(LS_KEY);
  return raw ? (JSON.parse(raw) as AppState) : null;
}

export async function persistState(state: AppState): Promise<void> {
  if (isTauri()) {
    await invoke("save_state", { state });
  } else {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }
}

export async function clearPersistedState(): Promise<void> {
  if (isTauri()) {
    await invoke("reset_state");
  } else {
    localStorage.removeItem(LS_KEY);
  }
}
