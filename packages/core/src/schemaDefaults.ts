import type { Settings, VaultSettings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

export const DEFAULT_VAULT_SETTINGS: VaultSettings = {
  enabled: false,
  rootPath: null,
  vaultName: null,
  notesFolder: "Task Orbit/Notes",
  autoReload: true,
  openWithObsidian: true,
};
