import type { AiChatMessage, AiToolDefinition, UnifiedStreamEvent } from "../types";
import type {
  AdapterChatOptions,
  AiProtocolAdapter,
  FetchAiModelsOptions,
  FetchAiModelsResult,
  TestAiConnectionOptions,
  TestAiConnectionResult,
} from "./base";

export function parseAnthropicSseLines(buffer: string): {
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
      if (currentEvent === "message_stop") {
        isDone = true;
      }
      continue;
    }

    if (line.startsWith("data:")) {
      const dataStr = line.slice(5).trim();
      try {
        const parsed = JSON.parse(dataStr);
        events.push({ event: currentEvent, data: parsed });
      } catch {
        // ignore incomplete JSON lines
      }
    }
  }

  return { events, isDone, remaining };
}

export class AnthropicAdapter implements AiProtocolAdapter {
  readonly protocol = "anthropic" as const;

  async testConnection(options: TestAiConnectionOptions): Promise<TestAiConnectionResult> {
    const { baseUrl, apiKey, model, timeoutMs = 15000 } = options;
    if (!baseUrl.trim()) {
      return { ok: false, message: "接口地址 (Base URL) 不能为空" };
    }
    if (!model.trim()) {
      return { ok: false, message: "模型名称不能为空" };
    }

    const cleanBase = baseUrl.replace(/\/+$/, "");
    const endpoint = cleanBase.endsWith("/v1") ? `${cleanBase}/messages` : `${cleanBase}/v1/messages`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      };
      if (apiKey.trim()) {
        headers["x-api-key"] = apiKey.trim();
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: model.trim(),
          max_tokens: 5,
          messages: [{ role: "user", content: "Hi" }],
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
            message: `认证失败 (401)：Anthropic API Key 无效或未提供。${errorDetail ? ` (${errorDetail})` : ""}`,
            latencyMs,
          };
        }
        if (response.status === 404) {
          return {
            ok: false,
            message: `路径未找到 (404)：请检查 Anthropic Base URL 是否正确。${errorDetail ? ` (${errorDetail})` : ""}`,
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
        message: `连接成功！响应耗时 ${latencyMs}ms，Claude 模型可用。`,
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
    const endpoint = cleanBase.endsWith("/v1") ? `${cleanBase}/models` : `${cleanBase}/v1/models`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const fallbackCandidates = [
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ];

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      };
      if (apiKey.trim()) {
        headers["x-api-key"] = apiKey.trim();
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        // In case proxy/gateway does not implement GET /v1/models, fall back gracefully
        return {
          ok: true,
          models: fallbackCandidates,
          message: `在线拉取模型未开放 (${response.status})，已提供常用 Claude 候选模型`,
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
        message: "无法访问在线模型端点，已提供常用 Claude 候选模型",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async *streamChat(options: AdapterChatOptions): AsyncGenerator<UnifiedStreamEvent, void, unknown> {
    const { baseUrl, apiKey, model, temperature = 0.7, messages, tools, signal } = options;

    const cleanBase = baseUrl.replace(/\/+$/, "");
    const endpoint = cleanBase.endsWith("/v1") ? `${cleanBase}/messages` : `${cleanBase}/v1/messages`;

    // 1. Separate system message
    const systemMessages = messages.filter((m) => m.role === "system");
    const systemPrompt = systemMessages.map((m) => m.content).join("\n\n");

    // 2. Format conversation to alternating user/assistant messages with blocks
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    const formattedMessages: Array<{
      role: "user" | "assistant";
      content: string | Array<Record<string, unknown>>;
    }> = [];

    for (const m of nonSystemMessages) {
      if (m.role === "user") {
        const last = formattedMessages[formattedMessages.length - 1];
        if (last && last.role === "user") {
          const newBlock = { type: "text", text: m.content };
          if (Array.isArray(last.content)) {
            last.content.push(newBlock);
          } else {
            last.content = [{ type: "text", text: last.content }, newBlock];
          }
        } else {
          formattedMessages.push({ role: "user", content: m.content });
        }
      } else if (m.role === "tool") {
        const toolResultBlock = {
          type: "tool_result",
          tool_use_id: m.tool_call_id || "call_unknown",
          content: m.content,
        };
        const last = formattedMessages[formattedMessages.length - 1];
        if (last && last.role === "user") {
          if (Array.isArray(last.content)) {
            last.content.push(toolResultBlock);
          } else {
            last.content = [{ type: "text", text: last.content }, toolResultBlock];
          }
        } else {
          formattedMessages.push({ role: "user", content: [toolResultBlock] });
        }
      } else if (m.role === "assistant") {
        const blocks: Array<Record<string, unknown>> = [];
        if (m.content && m.content.trim()) {
          blocks.push({ type: "text", text: m.content });
        }
        if (m.tool_calls && m.tool_calls.length > 0) {
          for (const tc of m.tool_calls) {
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
            } catch {
              parsedArgs = {};
            }
            blocks.push({
              type: "tool_use",
              id: tc.id,
              name: tc.function.name,
              input: parsedArgs,
            });
          }
        }
        const contentVal = blocks.length > 0 ? blocks : (m.content || "");
        formattedMessages.push({ role: "assistant", content: contentVal });
      }
    }

    if (formattedMessages.length === 0) {
      formattedMessages.push({ role: "user", content: "Hi" });
    }

    // 3. Format tools with input_schema
    const anthropicTools = tools?.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));

    // 4. Construct payload
    const isThinkingModel = model.includes("3-7") || model.includes("thinking");
    const payload: Record<string, unknown> = {
      model: model.trim(),
      messages: formattedMessages,
      max_tokens: 4096,
      stream: true,
    };

    if (systemPrompt.trim()) {
      payload.system = systemPrompt.trim();
    }
    if (anthropicTools && anthropicTools.length > 0) {
      payload.tools = anthropicTools;
    }

    if (isThinkingModel) {
      payload.thinking = {
        type: "enabled",
        budget_tokens: 2048,
      };
    } else if (typeof temperature === "number") {
      payload.temperature = temperature;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    };
    if (apiKey.trim()) {
      headers["x-api-key"] = apiKey.trim();
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
      throw new Error(`Claude 请求失败 (${response.status})：${errorDetail || response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Anthropic 服务端未返回响应数据流 (body is null)");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    const activeBlocks = new Map<number, { type: "text" | "thinking" | "tool_use"; id?: string; name?: string }>();
    const openToolCallIds = new Set<string>();
    let stopReason: string | null = null;

    const processEvents = function* (events: ReturnType<typeof parseAnthropicSseLines>["events"]) {
      for (const ev of events) {
        const { event, data } = ev;

        if (event === "content_block_start") {
          const index = data.index ?? 0;
          const block = data.content_block ?? {};
          const blockType = block.type as "text" | "thinking" | "tool_use";
          activeBlocks.set(index, {
            type: blockType,
            id: block.id,
            name: block.name,
          });

          if (blockType === "tool_use" && block.id) {
            openToolCallIds.add(block.id);
            yield {
              type: "tool_call_start" as const,
              id: block.id,
              name: block.name || "",
            };
          }
        } else if (event === "content_block_delta") {
          const index = data.index ?? 0;
          const delta = data.delta ?? {};
          const deltaType = delta.type;

          if (deltaType === "thinking_delta" && typeof delta.thinking === "string") {
            yield {
              type: "reasoning_delta" as const,
              text: delta.thinking,
            };
          } else if (deltaType === "text_delta" && typeof delta.text === "string") {
            yield {
              type: "text_delta" as const,
              text: delta.text,
            };
          } else if (deltaType === "input_json_delta" && typeof delta.partial_json === "string") {
            const currentBlock = activeBlocks.get(index);
            const callId = currentBlock?.id;
            if (callId) {
              yield {
                type: "tool_call_args_delta" as const,
                id: callId,
                delta: delta.partial_json,
              };
            }
          }
        } else if (event === "content_block_stop") {
          const index = data.index ?? 0;
          const currentBlock = activeBlocks.get(index);
          if (currentBlock?.type === "tool_use" && currentBlock.id) {
            yield {
              type: "tool_call_end" as const,
              id: currentBlock.id,
            };
          }
        } else if (event === "message_delta") {
          if (data.delta?.stop_reason) {
            stopReason = data.delta.stop_reason;
          }
        }
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, isDone, remaining } = parseAnthropicSseLines(buffer);
        buffer = remaining;

        yield* processEvents(events);
        if (isDone) break;
      }

      if (buffer.trim()) {
        const { events } = parseAnthropicSseLines(buffer + "\n");
        yield* processEvents(events);
      }
    } finally {
      reader.releaseLock();
    }

    yield {
      type: "finish",
      reason: stopReason === "tool_use" || openToolCallIds.size > 0 ? "tool_calls" : "stop",
    };
  }
}
