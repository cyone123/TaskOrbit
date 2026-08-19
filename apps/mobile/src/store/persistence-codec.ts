import { createEmptyState, parsePersistedState, type AppState } from "@task-orbit/core";

export function decodeStoredState(raw: string | null): AppState {
  if (!raw) return createEmptyState();
  return parsePersistedState(JSON.parse(raw) as unknown);
}
