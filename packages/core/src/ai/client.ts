import type { AiChatMessage, AiToolDefinition, StreamChunk } from "./types";

export interface TestAiConnectionOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

export interface TestAiConnectionResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export async function testAiConnection(
  options: TestAiConnectionOptions,
): Promise<TestAiConnectionResult> {
  const { baseUrl, apiKey, model, timeoutMs = 15000 } = options;
  if (!baseUrl.trim()) {
    return { ok: false, message: "接口地址 (Base URL) 不能为空" };
  }
  if (!model.trim()) {
    return { ok: false, message: "模型名称不能为空" };
  }

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey.trim()) {
      headers["Authorization"] = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model.trim(),
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      let errorDetail = "";
      try {
        const json = (await response.json()) as { error?: { message?: string } };
        errorDetail = json?.error?.message || JSON.stringify(json);
      } catch {
        errorDetail = await response.text().catch(() => "");
      }

      if (response.status === 401) {
        return {
          ok: false,
          message: `认证失败 (401)：API Key 无效或未提供。${errorDetail ? ` (${errorDetail})` : ""}`,
          latencyMs,
        };
      }
      if (response.status === 404) {
        return {
          ok: false,
          message: `路径未找到 (404)：请检查 Base URL 是否正确。${errorDetail ? ` (${errorDetail})` : ""}`,
          latencyMs,
        };
      }
      return {
        ok: false,
        message: `请求失败 (${response.status})：${errorDetail || response.statusText}`,
        latencyMs,
      };
    }

    return {
      ok: true,
      message: `连接成功！响应耗时 ${latencyMs}ms，模型可用。`,
      latencyMs,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        message: `连接超时（超过 ${timeoutMs / 1000} 秒），请检查网络或端点地址`,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `网络连接失败：${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parses accumulated SSE buffer lines and extracts StreamChunks.
 */
export function parseSseBuffer(buffer: string): {
  events: StreamChunk[];
  isDone: boolean;
  remaining: string;
} {
  const lines = buffer.split("\n");
  const remaining = lines.pop() ?? "";
  const events: StreamChunk[] = [];
  let isDone = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.startsWith("data:")) continue;

    const data = line.slice(5).trim();
    if (data === "[DONE]") {
      isDone = true;
      break;
    }

    try {
      const parsed = JSON.parse(data) as {
        id?: string;
        model?: string;
        choices?: Array<{
          delta?: {
            content?: string;
            tool_calls?: Array<{
              index: number;
              id?: string;
              type?: "function";
              function?: {
                name?: string;
                arguments?: string;
              };
            }>;
          };
          finish_reason?: string | null;
        }>;
      };

      const choice = parsed.choices?.[0];
      events.push({
        id: parsed.id ?? "",
        model: parsed.model ?? "",
        delta: choice?.delta ?? {},
        finish_reason: choice?.finish_reason ?? null,
      });
    } catch {
      // Ignore partial or unparseable SSE data lines
    }
  }

  return { events, isDone, remaining };
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
