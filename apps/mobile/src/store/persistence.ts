import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppState } from "@task-orbit/core";

import { decodeStoredState } from "./persistence-codec";

const STATE_KEY = "task-orbit.mobile.state";
const BACKUP_KEY = "task-orbit.mobile.state.backup";

export interface LoadResult {
  state: AppState;
  recoveredFromBackup: boolean;
}

export async function loadState(): Promise<LoadResult> {
  const [raw, backup] = await AsyncStorage.multiGet([STATE_KEY, BACKUP_KEY]);
  try {
    return { state: decodeStoredState(raw[1]), recoveredFromBackup: false };
  } catch (primaryError) {
    try {
      return { state: decodeStoredState(backup[1]), recoveredFromBackup: true };
    } catch {
      throw new Error(`本地数据和备份均无法读取：${String(primaryError)}`);
    }
  }
}

export async function saveState(state: AppState): Promise<void> {
  const previous = await AsyncStorage.getItem(STATE_KEY);
  if (previous) await AsyncStorage.setItem(BACKUP_KEY, previous);
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export async function replaceState(state: AppState): Promise<void> {
  const current = await AsyncStorage.getItem(STATE_KEY);
  if (current) await AsyncStorage.setItem(BACKUP_KEY, current);
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}
