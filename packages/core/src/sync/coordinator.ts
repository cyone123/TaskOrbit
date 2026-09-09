import type { AppState, Tombstone } from "../types";
import { WebDavClient, WebDavPreconditionFailedError } from "../webdav/client";
import type { HttpTransport } from "../webdav/types";
import { mergeAppState } from "./merge";
import {
  SYNC_ENVELOPE_FORMAT,
  SYNC_ENVELOPE_VERSION,
  type SyncPayloadState,
  type WebDavSyncEnvelope,
} from "./types";

export interface SyncCoordinatorOptions {
  deviceId: string;
  transport: HttpTransport;
  getState: () => AppState;
  getTombstones: () => Tombstone[];
  getLastRemoteEtag: () => string | null;
  isLocalDirty: () => boolean;
  onStateMerged: (mergedState: AppState, mergedTombstones: Tombstone[]) => Promise<void>;
  onSyncSuccess: (etag: string | null, timestamp: number) => Promise<void>;
}

export interface SyncResult {
  success: boolean;
  message?: string;
  hasChanges: boolean;
}

export class SyncCoordinator {
  private inFlight = false;

  constructor(private options: SyncCoordinatorOptions) {}

  public isBusy(): boolean {
    return this.inFlight;
  }

  /**
   * Run one cycle of bidirectional synchronization with the WebDAV server.
   */
  public async sync(): Promise<SyncResult> {
    if (this.inFlight) {
      return { success: false, message: "同步正在进行中", hasChanges: false };
    }

    const state = this.options.getState();
    const { webDavSettings } = state;

    if (!webDavSettings.enabled) {
      return { success: false, message: "WebDAV 同步未开启", hasChanges: false };
    }
    if (!webDavSettings.serverUrl.trim()) {
      return { success: false, message: "未配置 WebDAV 服务器地址", hasChanges: false };
    }

    this.inFlight = true;
    try {
      return await this.performSyncWithRetries(3);
    } finally {
      this.inFlight = false;
    }
  }

  private async performSyncWithRetries(maxRetries: number): Promise<SyncResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.performSync();
      } catch (error) {
        if (error instanceof WebDavPreconditionFailedError && attempt < maxRetries) {
          // Concurrently updated by another device; retry cycle immediately
          continue;
        }
        throw error;
      }
    }
    return { success: false, message: "并发同步冲突过多，已取消", hasChanges: false };
  }

  private async performSync(): Promise<SyncResult> {
    const state = this.options.getState();
    const { webDavSettings } = state;
    const client = new WebDavClient(webDavSettings, this.options.transport);

    const remoteDir = webDavSettings.remoteDir.trim() || "/taskorbit";
    const remoteFilePath = `${remoteDir.replace(/\/+$/, "")}/task-orbit-data.json`;

    // 1. Ensure directory exists
    await client.ensureDir(remoteDir);

    // 2. Check remote file metadata
    const meta = await client.getFileMeta(remoteFilePath);
    const lastEtag = this.options.getLastRemoteEtag();
    const localDirty = this.options.isLocalDirty();

    // Case A: Remote file does not exist yet (First sync)
    if (!meta.exists) {
      const envelope = this.buildEnvelope(state, this.options.getTombstones());
      const res = await client.putFile(remoteFilePath, JSON.stringify(envelope, null, 2));
      const now = Date.now();
      await this.options.onSyncSuccess(res.etag, now);
      return { success: true, hasChanges: true };
    }

    // Case B: Remote file unchanged (ETag matches last known)
    if (meta.etag && lastEtag && meta.etag === lastEtag) {
      if (!localDirty) {
        // Nothing changed anywhere
        const now = Date.now();
        await this.options.onSyncSuccess(meta.etag, now);
        return { success: true, hasChanges: false };
      }

      // Local has changes; upload with optimistic locking
      const envelope = this.buildEnvelope(state, this.options.getTombstones());
      const res = await client.putFile(
        remoteFilePath,
        JSON.stringify(envelope, null, 2),
        meta.etag,
      );
      const now = Date.now();
      await this.options.onSyncSuccess(res.etag, now);
      return { success: true, hasChanges: true };
    }

    // Case C: Remote file changed (or first time pulling)
    const remoteFile = await client.getFile(remoteFilePath);
    let remoteEnvelope: WebDavSyncEnvelope;
    try {
      remoteEnvelope = JSON.parse(remoteFile.content) as WebDavSyncEnvelope;
      if (remoteEnvelope.format !== SYNC_ENVELOPE_FORMAT) {
        throw new Error("远端文件格式不正确");
      }
    } catch (e) {
      throw new Error(`远端同步文件无法解析：${e instanceof Error ? e.message : String(e)}`);
    }

    const localTombstones = this.options.getTombstones();
    const mergeResult = mergeAppState(
      state,
      localTombstones,
      remoteEnvelope.state,
      remoteEnvelope.tombstones ?? [],
    );

    // Apply merged state locally
    await this.options.onStateMerged(mergeResult.mergedState, mergeResult.mergedTombstones);

    // Upload merged result to remote
    const updatedEnvelope = this.buildEnvelope(
      mergeResult.mergedState,
      mergeResult.mergedTombstones,
    );
    const putRes = await client.putFile(
      remoteFilePath,
      JSON.stringify(updatedEnvelope, null, 2),
      remoteFile.etag,
    );

    const now = Date.now();
    await this.options.onSyncSuccess(putRes.etag, now);

    return { success: true, hasChanges: mergeResult.hasChanges };
  }

  private buildEnvelope(state: AppState, tombstones: Tombstone[]): WebDavSyncEnvelope {
    const { activeTimer: _a, webDavSettings: _w, ...payload } = state;
    return {
      format: SYNC_ENVELOPE_FORMAT,
      formatVersion: SYNC_ENVELOPE_VERSION,
      deviceId: this.options.deviceId,
      updatedAt: Date.now(),
      state: payload as SyncPayloadState,
      tombstones,
    };
  }
}
