import type {
  AiChatMessage,
  AiProtocolType,
  AiToolDefinition,
  StreamChunk,
  UnifiedStreamEvent,
} from "./types";
import {
  resolveAiProtocol,
  type AdapterChatOptions,
  type FetchAiModelsOptions,
  type FetchAiModelsResult,
  type TestAiConnectionOptions,
  type TestAiConnectionResult,
} from "./adapters/base";
import { getAiAdapter } from "./adapters/registry";
import { parseSseBuffer } from "./sse";

export { parseSseBuffer };
export type {
  TestAiConnectionOptions,
  TestAiConnectionResult,
  FetchAiModelsOptions,
  FetchAiModelsResult,
};

export async function testAiConnection(
  options: TestAiConnectionOptions,
): Promise<TestAiConnectionResult> {
  const protocol = resolveAiProtocol(options.provider, options.baseUrl, options.protocol);
  const adapter = getAiAdapter(protocol);
  return adapter.testConnection(options);
}

export async function fetchAiModels(
  options: FetchAiModelsOptions,
): Promise<FetchAiModelsResult> {
  const protocol = resolveAiProtocol(options.provider, options.baseUrl, options.protocol);
  const adapter = getAiAdapter(protocol);
  return adapter.fetchModels(options);
}

export interface StreamAiChatOptions extends AdapterChatOptions {
  protocol?: AiProtocolType;
  provider?: string;
}

/**
 * Streams chat completions across multi-protocol adapters emitting UnifiedStreamEvents.
 */
export async function* streamAiChat(
  options: StreamAiChatOptions,
): AsyncGenerator<UnifiedStreamEvent, void, unknown> {
  const protocol = resolveAiProtocol(options.provider, options.baseUrl, options.protocol);
  const adapter = getAiAdapter(protocol);
  yield* adapter.streamChat(options);
}

export interface StreamChatOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  messages: AiChatMessage[];
  tools?: AiToolDefinition[];
  signal?: AbortSignal;
}

/**
 * Streams chat completions from OpenAI-compatible endpoint using native fetch and ReadableStream.
 */
export async function* streamChatCompletions(
  options: StreamChatOptions,
): AsyncGenerator<StreamChunk, void, unknown> {
  const { baseUrl, apiKey, model, temperature = 0.7, messages, tools, signal } = options;

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey.trim()) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  // Format messages payload for OpenAI API
  const formattedMessages = messages.map((m) => {
    const item: Record<string, unknown> = {
      role: m.role,
      content: m.content,
    };
    if (m.name) item.name = m.name;
    if (m.tool_call_id) item.tool_call_id = m.tool_call_id;
    if (m.tool_calls && m.tool_calls.length > 0) item.tool_calls = m.tool_calls;
    return item;
  });

  const payload: Record<string, unknown> = {
    model: model.trim(),
    messages: formattedMessages,
    temperature,
    stream: true,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const json = (await response.json()) as { error?: { message?: string } };
      errorDetail = json?.error?.message || JSON.stringify(json);
    } catch {
      errorDetail = await response.text().catch(() => "");
    }
    throw new Error(
      `模型请求失败 (${response.status})：${errorDetail || response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error("服务端未返回响应数据流 (body is null)");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { events, isDone, remaining } = parseSseBuffer(buffer);
      buffer = remaining;

      for (const event of events) {
        yield event;
      }

      if (isDone) break;
    }

    if (buffer.trim()) {
      const { events } = parseSseBuffer(buffer + "\n");
      for (const event of events) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
