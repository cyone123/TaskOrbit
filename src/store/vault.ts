import { open as openDirectory } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import type { VaultSettings } from "../types";
import { isTauri } from "./persistence";

export interface ProjectNoteSummary {
  id: string;
  projectId: string | null;
  title: string;
  relativePath: string;
  updatedAt: number;
  createdAt: number;
  pinned: boolean;
  taskIds: string[];
  dailyPlanIds: string[];
  contentHash: string;
}

export interface ProjectNote extends ProjectNoteSummary {
  markdown: string;
}

export interface NoteWriteInput {
  id: string;
  projectId: string;
  title: string;
  markdown: string;
  relativePath?: string | null;
  pinned: boolean;
  taskIds: string[];
  dailyPlanIds: string[];
  expectedContentHash?: string | null;
  projectFolder?: string | null;
}

export interface CreatedVault {
  rootPath: string;
  vaultName: string;
  notesFolder: string;
}

function requireDesktop(): void {
  if (!isTauri()) {
    throw new Error("Vault 文件功能需要在 Task Orbit 桌面应用中使用。浏览器预览模式无法访问本机文件夹。");
  }
}

function location(settings: VaultSettings) {
  requireDesktop();
  if (!settings.enabled || !settings.rootPath) {
    throw new Error("请先连接一个 Obsidian Vault。");
  }
  return {
    rootPath: settings.rootPath,
    notesFolder: settings.notesFolder,
  };
}

export async function chooseVaultDirectory(): Promise<string | null> {
  requireDesktop();
  const selected = await openDirectory({
    directory: true,
    multiple: false,
    title: "选择 Obsidian Vault 文件夹",
  });
  if (Array.isArray(selected)) return selected[0] ?? null;
  return selected ?? null;
}

export async function scanNotes(settings: VaultSettings): Promise<ProjectNoteSummary[]> {
  return invoke<ProjectNoteSummary[]>("scan_notes", { request: location(settings) });
}

export async function readNote(
  settings: VaultSettings,
  relativePath: string,
): Promise<ProjectNote> {
  return invoke<ProjectNote>("read_note", {
    request: { ...location(settings), relativePath },
  });
}

export async function writeNote(
  settings: VaultSettings,
  input: NoteWriteInput,
): Promise<ProjectNote> {
  return invoke<ProjectNote>("write_note", {
    request: { ...location(settings), ...input },
  });
}

export async function deleteNote(
  settings: VaultSettings,
  relativePath: string,
): Promise<void> {
  await invoke("delete_note", {
    request: { ...location(settings), relativePath },
  });
}

export async function createVault(
  parentPath: string,
  vaultName: string,
  notesFolder: string,
): Promise<CreatedVault> {
  requireDesktop();
  return invoke<CreatedVault>("create_vault", {
    request: { parentPath, vaultName, notesFolder },
  });
}

export async function openNoteInObsidian(
  settings: VaultSettings,
  relativePath: string,
): Promise<void> {
  if (!settings.openWithObsidian) {
    throw new Error("已在笔记设置中关闭 Obsidian 打开功能。");
  }
  await invoke("open_note_in_obsidian", {
    request: {
      ...location(settings),
      relativePath,
      vaultName: settings.vaultName,
    },
  });
}
