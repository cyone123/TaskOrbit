import type { AiSettings, Settings, VaultSettings, WebDavSettings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  weekDetailStartHour: 6,
  weekDetailEndHour: 24,
  dayStartHour: 6,
  dayEndHour: 24,
  monthMaxTaskTracks: 3,
  monthMaxDailyPlans: 4,
};

export const DEFAULT_VAULT_SETTINGS: VaultSettings = {
  enabled: false,
  rootPath: null,
  vaultName: null,
  notesFolder: "Task Orbit/Notes",
  autoReload: true,
  openWithObsidian: true,
};

export const DEFAULT_WEBDAV_SETTINGS: WebDavSettings = {
  enabled: false,
  serverUrl: "",
  username: "",
  password: "",
  remoteDir: "/taskorbit",
  autoSync: true,
  syncIntervalMinutes: 15,
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: "deepseek",
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "",
  model: "deepseek-chat",
  temperature: 0.7,
};
