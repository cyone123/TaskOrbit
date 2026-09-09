import { describe, expect, it, vi } from "vitest";
import { createEmptyState } from "../schema";
import type { AppState, Project, Tombstone } from "../types";
import type { HttpTransport } from "../webdav/types";
import { SyncCoordinator } from "./coordinator";
import { SYNC_ENVELOPE_FORMAT, type WebDavSyncEnvelope } from "./types";

describe("sync/coordinator", () => {
  const baseState: AppState = {
    ...createEmptyState(),
    webDavSettings: {
      enabled: true,
      serverUrl: "https://dav.example.com",
      username: "user",
      password: "pwd",
      remoteDir: "/taskorbit",
      autoSync: true,
      syncIntervalMinutes: 15,
    },
  };

  it("skips sync if disabled", async () => {
    const transport = vi.fn<HttpTransport>();
    const coordinator = new SyncCoordinator({
      deviceId: "dev1",
      transport,
      getState: () => ({
        ...baseState,
        webDavSettings: { ...baseState.webDavSettings, enabled: false },
      }),
      getTombstones: () => [],
      getLastRemoteEtag: () => null,
      isLocalDirty: () => false,
      onStateMerged: async () => {},
      onSyncSuccess: async () => {},
    });

    const res = await coordinator.sync();
    expect(res.success).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });

  it("performs initial sync when remote file does not exist", async () => {
    const transport = vi
      .fn<HttpTransport>()
      .mockResolvedValueOnce({ status: 200, headers: {}, body: "" }) // PROPFIND dir 200
      .mockResolvedValueOnce({ status: 404, headers: {}, body: "" }) // PROPFIND file 404
      .mockResolvedValueOnce({
        status: 201,
        headers: { etag: '"initial-etag"' },
        body: "",
      }); // PUT file 201

    let savedEtag: string | null = null;
    const coordinator = new SyncCoordinator({
      deviceId: "dev1",
      transport,
      getState: () => baseState,
      getTombstones: () => [],
      getLastRemoteEtag: () => null,
      isLocalDirty: () => true,
      onStateMerged: async () => {},
      onSyncSuccess: async (etag) => {
        savedEtag = etag;
      },
    });

    const res = await coordinator.sync();
    expect(res.success).toBe(true);
    expect(savedEtag).toBe("initial-etag");
    expect(transport).toHaveBeenCalledTimes(3);
    expect(transport.mock.calls[2][0].method).toBe("PUT");
  });

  it("handles remote updates and triggers onStateMerged", async () => {
    const remoteProject: Project = {
      id: "rp1",
      name: "远端新项目",
      description: "",
      color: "red",
      startDate: "2026-09-01",
      endDate: "2026-09-10",
      archived: false,
      archivedAt: null,
      createdAt: 2000,
      updatedAt: 2000,
    };

    const remoteEnvelope: WebDavSyncEnvelope = {
      format: SYNC_ENVELOPE_FORMAT,
      formatVersion: 1,
      deviceId: "remote-device",
      updatedAt: 2000,
      state: {
        version: 7,
        projects: [remoteProject],
        tasks: [],
        dailyPlans: [],
        inboxItems: [],
        pomodoroSessions: [],
        settings: baseState.settings,
        vaultSettings: baseState.vaultSettings,
      },
      tombstones: [],
    };

    const transport = vi
      .fn<HttpTransport>()
      .mockResolvedValueOnce({ status: 200, headers: {}, body: "" }) // PROPFIND dir 200
      .mockResolvedValueOnce({
        status: 200,
        headers: { etag: '"etag-2"' },
        body: "",
      }) // PROPFIND file 200
      .mockResolvedValueOnce({
        status: 200,
        headers: { etag: '"etag-2"' },
        body: JSON.stringify(remoteEnvelope),
      }) // GET file 200
      .mockResolvedValueOnce({
        status: 200,
        headers: { etag: '"etag-3"' },
        body: "",
      }); // PUT file 200

    let mergedResultState: AppState | null = null;
    const coordinator = new SyncCoordinator({
      deviceId: "dev1",
      transport,
      getState: () => baseState,
      getTombstones: () => [],
      getLastRemoteEtag: () => "etag-1", // different from remote etag-2
      isLocalDirty: () => false,
      onStateMerged: async (state) => {
        mergedResultState = state;
      },
      onSyncSuccess: async () => {},
    });

    const res = await coordinator.sync();
    expect(res.success).toBe(true);
    expect(mergedResultState).not.toBeNull();
    expect(mergedResultState!.projects).toHaveLength(1);
    expect(mergedResultState!.projects[0].name).toBe("远端新项目");
  });
});
