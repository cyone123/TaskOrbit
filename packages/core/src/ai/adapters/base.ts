import type {
  AiChatMessage,
  AiProtocolType,
  AiToolDefinition,
  UnifiedStreamEvent,
} from "../types";

export type { AiProtocolType } from "../types";

export interface TestAiConnectionOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  protocol?: AiProtocolType;
  provider?: string;
}

export interface TestAiConnectionResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export interface FetchAiModelsOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  protocol?: AiProtocolType;
  provider?: string;
}

export interface FetchAiModelsResult {
  ok: boolean;
  models: string[];
  message: string;
}

export interface AdapterChatOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  messages: AiChatMessage[];
  tools?: AiToolDefinition[];
  signal?: AbortSignal;
}

export interface AiProtocolAdapter {
  readonly protocol: AiProtocolType;

  testConnection(options: TestAiConnectionOptions): Promise<TestAiConnectionResult>;

  fetchModels(options: FetchAiModelsOptions): Promise<FetchAiModelsResult>;

  streamChat(options: AdapterChatOptions): AsyncGenerator<UnifiedStreamEvent, void, unknown>;
}

/**
 * Resolves the AI protocol based on explicit setting, provider key, or base URL.
 */
export function resolveAiProtocol(
  providerId?: string,
  baseUrl?: string,
  explicitProtocol?: AiProtocolType,
): AiProtocolType {
  if (explicitProtocol) return explicitProtocol;
  const normalizedProvider = (providerId || "").toLowerCase();
  const normalizedUrl = (baseUrl || "").toLowerCase();

  if (normalizedProvider === "anthropic" || normalizedUrl.includes("api.anthropic.com")) {
    return "anthropic";
  }
  if (
    normalizedProvider === "gemini" ||
    normalizedUrl.includes("generativelanguage.googleapis.com")
  ) {
    return "gemini";
  }
  if (normalizedUrl.endsWith("/responses") || normalizedUrl.includes("/v1/responses")) {
    return "openai_responses";
  }
  return "openai_chat";
}
