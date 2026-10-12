import { describe, expect, it } from "vitest";
import { migratePersistedState } from "./migrations";
import { STATE_VERSION } from "./version";
import { validateAppState } from "./schema";
import type { AppState } from "./types";

describe("migrations v10 -> v11", () => {
  it("migrates raw task with done:false to status:'todo' and done:true to status:'done'", () => {
    const v10Data = {
      version: 10,
      projects: [
        {
          id: "p1",
          name: "测试项目",
          description: "",
          color: "blue",
          startDate: "2026-09-01",
          endDate: "2026-09-30",
          archived: false,
          archivedAt: null,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      tasks: [
        {
          id: "t1",
          projectId: "p1",
          name: "未完成任务",
          description: "",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          done: false,
          priority: "medium",
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: "t2",
          projectId: "p1",
          name: "已完成任务",
          description: "",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          done: true,
          priority: "high",
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: "t3",
          projectId: "p1",
          name: "未排期待处理任务",
          description: "",
          startDate: null,
          endDate: null,
          done: false,
          priority: "low",
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      dailyPlans: [],
      inboxItems: [],
      activeTimer: null,
      pomodoroSessions: [],
      settings: {
        theme: "system",
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        weekDetailStartHour: 8,
        weekDetailEndHour: 22,
        dayStartHour: 8,
        dayEndHour: 22,
        monthMaxTaskTracks: 3,
        monthMaxDailyPlans: 5,
      },
      vaultSettings: {
        enabled: false,
        rootPath: null,
        vaultName: null,
        notesFolder: "TaskOrbit",
        autoReload: true,
        openWithObsidian: false,
      },
      webDavSettings: {
        enabled: false,
        serverUrl: "",
        username: "",
        password: "",
        remoteDir: "taskorbit",
        autoSync: false,
        syncIntervalMinutes: 30,
      },
      aiSettings: {
        enabled: false,
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com/v1",
        apiKey: "",
        model: "deepseek-chat",
        temperature: 0.7,
        customProviders: [],
        providersConfig: {},
      },
    };

    const migrated = migratePersistedState(v10Data) as AppState;
    expect(migrated.version).toBe(STATE_VERSION);
    expect(migrated.tasks).toHaveLength(3);
    expect(migrated.tasks[0]?.status).toBe("in_progress");
    expect(migrated.tasks[0]?.done).toBe(false);
    expect(migrated.tasks[1]?.status).toBe("done");
    expect(migrated.tasks[1]?.done).toBe(true);
    expect(migrated.tasks[2]?.status).toBe("todo");
    expect(migrated.tasks[2]?.done).toBe(false);

    // Ensure it strictly passes schema validation
    expect(() => validateAppState(migrated)).not.toThrow();
  });
});

describe("migrations v11 -> v12", () => {
  it("converts notes to todos with done:false and populates projectId:null", () => {
    const v11Data = {
      version: 11,
      projects: [
        {
          id: "p1",
          name: "现有项目",
          description: "",
          color: "blue",
          startDate: "2026-09-01",
          endDate: "2026-09-30",
          archived: false,
          archivedAt: null,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      tasks: [],
      dailyPlans: [],
      inboxItems: [
        {
          id: "i1",
          kind: "note",
          content: "灵感备忘\n多行文字内容",
          done: false,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: "i2",
          kind: "todo",
          content: "已勾选待办",
          done: true,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: "i3",
          kind: "todo",
          content: "关联了项目的待办",
          done: false,
          projectId: "p1",
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      activeTimer: null,
      pomodoroSessions: [],
      settings: {
        theme: "system",
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        weekDetailStartHour: 8,
        weekDetailEndHour: 22,
        dayStartHour: 8,
        dayEndHour: 22,
        monthMaxTaskTracks: 3,
        monthMaxDailyPlans: 5,
      },
      vaultSettings: {
        enabled: false,
        rootPath: null,
        vaultName: null,
        notesFolder: "TaskOrbit",
        autoReload: true,
        openWithObsidian: false,
      },
      webDavSettings: {
        enabled: false,
        serverUrl: "",
        username: "",
        password: "",
        remoteDir: "taskorbit",
        autoSync: false,
        syncIntervalMinutes: 30,
      },
      aiSettings: {
        enabled: false,
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com/v1",
        apiKey: "",
        model: "deepseek-chat",
        temperature: 0.7,
        customProviders: [],
        providersConfig: {},
      },
    };

    const migrated = migratePersistedState(v11Data) as AppState;
    expect(migrated.version).toBe(STATE_VERSION);
    expect(migrated.inboxItems).toHaveLength(3);

    // Note converted to todo and split into title & description
    expect(migrated.inboxItems[0]?.kind).toBe("todo");
    expect(migrated.inboxItems[0]?.done).toBe(false);
    expect(migrated.inboxItems[0]?.title).toBe("灵感备忘");
    expect(migrated.inboxItems[0]?.description).toBe("多行文字内容");
    expect(migrated.inboxItems[0]?.content).toBe("灵感备忘\n多行文字内容");
    expect(migrated.inboxItems[0]?.projectId).toBeNull();

    // Existing completed todo
    expect(migrated.inboxItems[1]?.kind).toBe("todo");
    expect(migrated.inboxItems[1]?.done).toBe(true);
    expect(migrated.inboxItems[1]?.projectId).toBeNull();

    // Existing todo with project
    expect(migrated.inboxItems[2]?.projectId).toBe("p1");

    expect(() => validateAppState(migrated)).not.toThrow();
  });
});
