import { STATE_VERSION } from "@task-orbit/core";
import { describe, expect, it } from "vitest";

import { decodeStoredState } from "./persistence-codec";

describe("mobile persistence codec", () => {
  it("starts with a valid empty state", () => {
    const state = decodeStoredState(null);
    expect(state.version).toBe(STATE_VERSION);
    expect(state.projects).toEqual([]);
  });

  it("migrates and validates JSON snapshots", () => {
    const state = decodeStoredState(JSON.stringify({ version: 1, projects: [], tasks: [], dailyPlans: [], pomodoroSessions: [] }));
    expect(state.version).toBe(STATE_VERSION);
    expect(state.inboxItems).toEqual([]);
    expect(state.activeTimer).toBeNull();
  });

  it("rejects malformed JSON", () => {
    expect(() => decodeStoredState("not-json")).toThrow();
  });
});
