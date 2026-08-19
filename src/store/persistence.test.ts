import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyState } from "@task-orbit/core";
import { loadPersistedState, persistState } from "./persistence";

const values = new Map<string, string>();
let failPrimaryWrite = false;

const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (key === "task-orbit-state" && failPrimaryWrite) {
      failPrimaryWrite = false;
      throw new Error("storage full");
    }
    values.set(key, value);
  },
  removeItem: (key: string) => {
    values.delete(key);
  },
  clear: () => {
    values.clear();
  },
  key: (index: number) => Array.from(values.keys())[index] ?? null,
  get length() {
    return values.size;
  },
};

describe("browser persistence", () => {
  beforeEach(() => {
    values.clear();
    failPrimaryWrite = false;
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the previous primary state as a backup", async () => {
    const firstState = createEmptyState();
    const secondState = {
      ...firstState,
      settings: {
        ...firstState.settings,
        focusMinutes: 30,
      },
    };

    await persistState(firstState);
    await persistState(secondState);

    expect(JSON.parse(values.get("task-orbit-state-backup") ?? "null")).toEqual(firstState);
  });

  it("restores the backup when the primary state is corrupted", async () => {
    const backupState = createEmptyState();
    await persistState(backupState);
    await persistState({
      ...backupState,
      settings: {
        ...backupState.settings,
        focusMinutes: 20,
      },
    });

    values.set("task-orbit-state", "{broken json");

    const result = await loadPersistedState();

    expect(result.source).toBe("backup");
    expect(result.state).toEqual(backupState);
    expect(result.warning).toContain("备份");
  });

  it("does not replace a valid backup with corrupted primary data", async () => {
    const backupState = createEmptyState();
    await persistState(backupState);
    await persistState({
      ...backupState,
      settings: {
        ...backupState.settings,
        focusMinutes: 28,
      },
    });
    values.set("task-orbit-state", "{broken json");

    const nextState = {
      ...backupState,
      settings: {
        ...backupState.settings,
        focusMinutes: 30,
      },
    };
    await persistState(nextState);

    expect(JSON.parse(values.get("task-orbit-state-backup") ?? "null")).toEqual(backupState);
    expect(JSON.parse(values.get("task-orbit-state") ?? "null")).toEqual(nextState);
  });

  it("rolls back both browser keys when a write fails", async () => {
    const firstState = createEmptyState();
    const secondState = {
      ...firstState,
      settings: {
        ...firstState.settings,
        focusMinutes: 30,
      },
    };
    await persistState(firstState);
    await persistState(secondState);

    failPrimaryWrite = true;
    await expect(
      persistState({
        ...secondState,
        settings: {
          ...secondState.settings,
          focusMinutes: 35,
        },
      }),
    ).rejects.toThrow("storage full");

    expect(JSON.parse(values.get("task-orbit-state") ?? "null")).toEqual(secondState);
    expect(JSON.parse(values.get("task-orbit-state-backup") ?? "null")).toEqual(firstState);
  });
});
