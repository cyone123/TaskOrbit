import type { UnifiedStreamEvent } from "../types";
import { parseSseBuffer } from "../sse";
import type {
  AdapterChatOptions,
  AiProtocolAdapter,
  FetchAiModelsOptions,
  FetchAiModelsResult,
  TestAiConnectionOptions,
  TestAiConnectionResult,
} from "./base";

export class OpenAiChatAdapter implements AiProtocolAdapter {
  readonly protocol = "openai_chat" as const;

  async testConnection(options: TestAiConnectionOptions): Promise<TestAiConnectionResult> {
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

  async fetchModels(options: FetchAiModelsOptions): Promise<FetchAiModelsResult> {
    const { baseUrl, apiKey, timeoutMs = 15000 } = options;
    if (!baseUrl.trim()) {
      return { ok: false, models: [], message: "接口地址 (Base URL) 不能为空" };
    }

    const cleanBase = baseUrl.replace(/\/+$/, "");
    const endpoint = `${cleanBase}/models`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey.trim()) {
        headers["Authorization"] = `Bearer ${apiKey.trim()}`;
      }

      let response = await fetch(endpoint, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      // Fallback for Ollama native tags endpoint if /models returns 404
      if (response.status === 404 && cleanBase.includes("11434")) {
        const ollamaEndpoint = `${cleanBase.replace(/\/v1$/, "")}/api/tags`;
        response = await fetch(ollamaEndpoint, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
      }

      if (!response.ok) {
        let errorDetail = "";
        try {
          const json = (await response.json()) as { error?: { message?: string } };
          errorDetail = json?.error?.message || JSON.stringify(json);
        } catch {
          errorDetail = await response.text().catch(() => "");
        }
        return {
          ok: false,
          models: [],
          message: `获取模型列表失败 (${response.status})：${errorDetail || response.statusText}`,
        };
      }

      const json = (await response.json()) as {
        data?: Array<{ id?: string }>;
        models?: Array<{ name?: string; model?: string }>;
      };

      const extracted: string[] = [];

      // OpenAI standard: { data: [{ id: "model-name" }] }
      if (Array.isArray(json.data)) {
        for (const item of json.data) {
          if (item && typeof item.id === "string" && item.id.trim()) {
            extracted.push(item.id.trim());
          }
        }
      }

      // Ollama format: { models: [{ name: "llama3:latest" }] }
      if (extracted.length === 0 && Array.isArray(json.models)) {
        for (const item of json.models) {
          const name = item.name || item.model;
          if (typeof name === "string" && name.trim()) {
            extracted.push(name.trim());
          }
        }
      }

      const unique = Array.from(new Set(extracted)).sort();

      if (unique.length === 0) {
        return {
          ok: true,
          models: [],
          message: "接口返回成功，但未解析到模型列表数据",
        };
      }

      return {
        ok: true,
        models: unique,
        message: `成功获取到 ${unique.length} 个可用模型`,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return {
          ok: false,
          models: [],
          message: `请求超时（超过 ${timeoutMs / 1000} 秒），请检查网络`,
        };
      }
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, models: [], message: `无法连接服务器：${msg}` };
    } finally {
      clearTimeout(timer);
    }
  }

  async *streamChat(options: AdapterChatOptions): AsyncGenerator<UnifiedStreamEvent, void, unknown> {
    const { baseUrl, apiKey, model, temperature = 0.7, messages, tools, signal } = options;

    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey.trim()) {
      headers["Authorization"] = `Bearer ${apiKey.trim()}`;
    }

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
    const activeToolCallIds = new Map<number, string>();
    let lastFinishReason: "stop" | "tool_calls" | "length" | "error" = "stop";

    const processEvents = function* (events: ReturnType<typeof parseSseBuffer>["events"]) {
      for (const event of events) {
        if (event.finish_reason) {
          if (event.finish_reason === "tool_calls") lastFinishReason = "tool_calls";
          else if (event.finish_reason === "length") lastFinishReason = "length";
          else lastFinishReason = "stop";
        }

        if (event.delta.reasoning_content) {
          yield {
            type: "reasoning_delta" as const,
            text: event.delta.reasoning_content,
          };
        }

        if (event.delta.content) {
          yield {
            type: "text_delta" as const,
            text: event.delta.content,
          };
        }

        if (event.delta.tool_calls) {
          for (const tc of event.delta.tool_calls) {
            let callId = activeToolCallIds.get(tc.index);
            if (!callId) {
              callId = tc.id || `call_${tc.index}_${Date.now()}`;
              activeToolCallIds.set(tc.index, callId);
              yield {
                type: "tool_call_start" as const,
                id: callId,
                name: tc.function?.name || "",
              };
            } else if (tc.function?.name) {
              yield {
                type: "tool_call_start" as const,
                id: callId,
                name: tc.function.name,
              };
            }

            if (tc.function?.arguments) {
              yield {
                type: "tool_call_args_delta" as const,
                id: callId,
                delta: tc.function.arguments,
              };
            }
          }
        }
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, isDone, remaining } = parseSseBuffer(buffer);
        buffer = remaining;

        yield* processEvents(events);
        if (isDone) break;
      }

      if (buffer.trim()) {
        const { events } = parseSseBuffer(buffer + "\n");
        yield* processEvents(events);
      }
    } finally {
      reader.releaseLock();
    }

    // End all active tool calls that were opened
    for (const callId of activeToolCallIds.values()) {
      yield { type: "tool_call_end", id: callId };
    }

    yield {
      type: "finish",
      reason: activeToolCallIds.size > 0 ? "tool_calls" : lastFinishReason,
    };
  }
}
