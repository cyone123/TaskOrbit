import { z } from "zod";
import type { AppState } from "../types";
import { parsePersistedState } from "./schema";

export const EXPORT_FORMAT = "task-orbit-export" as const;
export const EXPORT_FORMAT_VERSION = 1;

export interface TaskOrbitExportEnvelope {
  format: typeof EXPORT_FORMAT;
  formatVersion: number;
  exportedAt: number;
  state: AppState;
}

const exportEnvelopeSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  formatVersion: z.number().int().min(1),
  exportedAt: z.number().int().nonnegative(),
  state: z.unknown(),
});

function parseJsonString(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(`导入文件不是有效的 JSON：${String(error)}`);
  }
}

/** Serialize stable user data; an in-flight timer is intentionally excluded. */
export function serializeExportSnapshot(state: AppState, exportedAt = Date.now()): string {
  const envelope: TaskOrbitExportEnvelope = {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt,
    state: { ...state, activeTimer: null },
  };
  return JSON.stringify(envelope, null, 2);
}

/** Parse either a Task Orbit export envelope or a legacy raw AppState snapshot. */
export function parseImportSnapshot(raw: unknown): AppState {
  const value = typeof raw === "string" ? parseJsonString(raw) : raw;

  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "format" in value
  ) {
    const envelope = exportEnvelopeSchema.safeParse(value);
    if (!envelope.success) {
      throw new Error("导入文件不是有效的 Task Orbit 快照。");
    }
    if (envelope.data.formatVersion > EXPORT_FORMAT_VERSION) {
      throw new Error(
        `快照格式版本 ${envelope.data.formatVersion} 高于当前版本，请升级应用后再导入。`,
      );
    }
    return { ...parsePersistedState(envelope.data.state), activeTimer: null };
  }

  return { ...parsePersistedState(value), activeTimer: null };
}
