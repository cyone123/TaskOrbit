import type { AppState, Tombstone } from "../types";

export const SYNC_ENVELOPE_FORMAT = "task-orbit-webdav-sync" as const;
export const SYNC_ENVELOPE_VERSION = 1;

/** Data payload persisted on WebDAV. Excludes client-local transient states and credentials. */
export type SyncPayloadState = Omit<AppState, "activeTimer" | "webDavSettings">;

export interface WebDavSyncEnvelope {
  format: typeof SYNC_ENVELOPE_FORMAT;
  formatVersion: number;
  deviceId: string;
  updatedAt: number;
  state: SyncPayloadState;
  tombstones: Tombstone[];
}

export interface MergeResult {
  mergedState: AppState;
  mergedTombstones: Tombstone[];
  hasChanges: boolean;
}

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  lastRemoteEtag: string | null;
  errorMessage: string | null;
}
