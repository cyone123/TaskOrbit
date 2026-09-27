import type { UnifiedStreamEvent } from "../types";
import type {
  AdapterChatOptions,
  AiProtocolAdapter,
  FetchAiModelsOptions,
  FetchAiModelsResult,
  TestAiConnectionOptions,
  TestAiConnectionResult,
} from "./base";

export function parseResponsesSseLines(buffer: string): {
  events: Array<{ event: string; data: Record<string, any> }>;
  isDone: boolean;
  remaining: string;
} {
  const lines = buffer.split("\n");
  const remaining = lines.pop() ?? "";
  const events: Array<{ event: string; data: Record<string, any> }> = [];
  let currentEvent = "message";
  let isDone = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      currentEvent = "message";
      continue;
    }

    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim();
      if (currentEvent === "response.completed") {
        isDone = true;
      }
      continue;
    }

    if (line.startsWith("data:")) {
      const dataStr = line.slice(5).trim();
      if (dataStr === "[DONE]") {
        isDone = true;
        break;
      }
      try {
        const parsed = JSON.parse(dataStr);
        events.push({ event: currentEvent, data: parsed });
        if (parsed.type === "response.completed") {
          isDone = true;
        }
      } catch {
        // ignore partial line
      }
    }
  }

  return { events, isDone, remaining };
}

export class OpenAiResponsesAdapter implements AiProtocolAdapter {
  readonly protocol = "openai_responses" as const;

  private resolveEndpoint(baseUrl: string, path: string): string {
    const clean = baseUrl.replace(/\/+$/, "");
    if (clean.endsWith("/v1")) {
      return `${clean}/${path}`;
    }
    if (clean.endsWith(`/v1/${path}`) || clean.endsWith(`/${path}`)) {
      return clean;
    }
    return `${clean}/v1/${path}`;
  }

  async testConnection(options: TestAiConnectionOptions): Promise<TestAiConnectionResult> {
    const { baseUrl, apiKey, model, timeoutMs = 15000 } = options;
    if (!baseUrl.trim()) {
      return { ok: false, message: "接口地址 (Base URL) 不能为空" };
    }
    if (!model.trim()) {
      return { ok: false, message: "模型名称不能为空" };
    }

    const endpoint = this.resolveEndpoint(baseUrl, "responses");
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
          input: [{ type: "message", role: "user", content: "Hi" }],
          max_output_tokens: 5,
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
            message: `端点未找到 (404)：请检查 Responses API 路径是否正确。${errorDetail ? ` (${errorDetail})` : ""}`,
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
        message: `连接成功！响应耗时 ${latencyMs}ms，OpenAI Responses 端点可用。`,
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

    const endpoint = this.resolveEndpoint(baseUrl, "models");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const fallbackCandidates = [
      "gpt-4o",
      "gpt-4o-mini",
      "o1",
      "o3-mini",
      "gpt-4.5-preview",
      "gpt-4-turbo",
    ];

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey.trim()) {
        headers["Authorization"] = `Bearer ${apiKey.trim()}`;
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          ok: true,
          models: fallbackCandidates,
          message: `在线拉取模型未开放 (${response.status})，已提供常用 OpenAI 候选模型`,
        };
      }

      const json = (await response.json()) as { data?: Array<{ id?: string }> };
      const extracted: string[] = [];
      if (Array.isArray(json.data)) {
        for (const item of json.data) {
          if (item && typeof item.id === "string" && item.id.trim()) {
            extracted.push(item.id.trim());
          }
        }
      }

      const models = Array.from(new Set(extracted.length > 0 ? extracted : fallbackCandidates)).sort();
      return {
        ok: true,
        models,
        message: `成功获取到 ${models.length} 个可用模型`,
      };
    } catch {
      return {
        ok: true,
        models: fallbackCandidates,
        message: "无法访问在线模型端点，已提供常用 OpenAI 候选模型",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async *streamChat(options: AdapterChatOptions): AsyncGenerator<UnifiedStreamEvent, void, unknown> {
    const { baseUrl, apiKey, model, temperature = 0.7, messages, tools, signal } = options;

    const endpoint = this.resolveEndpoint(baseUrl, "responses");

    // 1. Separate system message into instructions
    const systemMessages = messages.filter((m) => m.role === "system");
    const instructions = systemMessages.map((m) => m.content).join("\n\n");

    // 2. Format non-system messages into Responses API input items
    const nonSystem = messages.filter((m) => m.role !== "system");
    const formattedInput: Array<Record<string, unknown>> = [];

    for (const m of nonSystem) {
      if (m.role === "user") {
        formattedInput.push({
          type: "message",
          role: "user",
          content: m.content,
        });
      } else if (m.role === "tool") {
        formattedInput.push({
          type: "function_call_output",
          call_id: m.tool_call_id || "call_unknown",
          output: m.content,
        });
      } else if (m.role === "assistant") {
        if (m.content) {
          formattedInput.push({
            type: "message",
            role: "assistant",
            content: m.content,
          });
        }
        if (m.tool_calls && m.tool_calls.length > 0) {
          for (const tc of m.tool_calls) {
            formattedInput.push({
              type: "function_call",
              call_id: tc.id,
              name: tc.function.name,
              arguments: tc.function.arguments,
            });
          }
        }
      }
    }

    if (formattedInput.length === 0) {
      formattedInput.push({ type: "message", role: "user", content: "Hi" });
    }

    // 3. Format tools for Responses API (name, description, parameters at top-level)
    const responseTools = tools?.map((t) => ({
      type: "function" as const,
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));

    const payload: Record<string, unknown> = {
      model: model.trim(),
      input: formattedInput,
      stream: true,
      temperature,
    };

    if (instructions.trim()) {
      payload.instructions = instructions.trim();
    }
    if (responseTools && responseTools.length > 0) {
      payload.tools = responseTools;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey.trim()) {
      headers["Authorization"] = `Bearer ${apiKey.trim()}`;
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
      throw new Error(`OpenAI Responses 请求失败 (${response.status})：${errorDetail || response.statusText}`);
    }

    if (!response.body) {
      throw new Error("OpenAI Responses 服务端未返回响应数据流 (body is null)");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    const openToolCalls = new Map<number | string, string>();
    const finishedToolCallIds = new Set<string>();
    let hasEmittedTools = false;

    const processEvents = function* (events: ReturnType<typeof parseResponsesSseLines>["events"]) {
      for (const ev of events) {
        const { data } = ev;
        const type = data.type || ev.event;

        // Reasoning / Thinking delta (e.g. o-series models)
        if (type === "response.reasoning.delta" || type === "response.reasoning_text.delta") {
          const delta = data.delta || data.text || "";
          if (delta) {
            yield {
              type: "reasoning_delta" as const,
              text: delta,
            };
          }
        }

        // Text delta
        if (type === "response.text.delta" || type === "response.output_text.delta") {
          const delta = data.delta || data.text || "";
          if (delta) {
            yield {
              type: "text_delta" as const,
              text: delta,
            };
          }
        }

        // Function call start
        if (type === "response.output_item.added") {
          const item = data.item;
          if (item?.type === "function_call") {
            hasEmittedTools = true;
            const callId = item.call_id || item.id || `call_${Date.now()}`;
            const outIndex = data.output_index ?? 0;
            openToolCalls.set(outIndex, callId);
            yield {
              type: "tool_call_start" as const,
              id: callId,
              name: item.name || "",
            };
          }
        }

        // Function call arguments delta
        if (type === "response.function_call_arguments.delta") {
          const outIndex = data.output_index ?? 0;
          const callId = data.call_id || openToolCalls.get(outIndex);
          if (callId && data.delta) {
            yield {
              type: "tool_call_args_delta" as const,
              id: callId,
              delta: data.delta,
            };
          }
        }

        // Function call done
        if (
          type === "response.function_call_arguments.done" ||
          (type === "response.output_item.done" && data.item?.type === "function_call")
        ) {
          const outIndex = data.output_index ?? 0;
          const callId = data.call_id || data.item?.call_id || openToolCalls.get(outIndex);
          if (callId && !finishedToolCallIds.has(callId)) {
            finishedToolCallIds.add(callId);
            yield {
              type: "tool_call_end" as const,
              id: callId,
            };
          }
        }
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, isDone, remaining } = parseResponsesSseLines(buffer);
        buffer = remaining;

        yield* processEvents(events);
        if (isDone) break;
      }

      if (buffer.trim()) {
        const { events } = parseResponsesSseLines(buffer + "\n");
        yield* processEvents(events);
      }
    } finally {
      reader.releaseLock();
    }

    // Close any still-open tool calls
    for (const callId of openToolCalls.values()) {
      if (!finishedToolCallIds.has(callId)) {
        yield { type: "tool_call_end", id: callId };
      }
    }

    yield {
      type: "finish",
      reason: hasEmittedTools ? "tool_calls" : "stop",
    };
  }
}
