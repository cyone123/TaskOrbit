import type { UnifiedStreamEvent } from "../types";
import type {
  AdapterChatOptions,
  AiProtocolAdapter,
  FetchAiModelsOptions,
  FetchAiModelsResult,
  TestAiConnectionOptions,
  TestAiConnectionResult,
} from "./base";

export function parseGeminiSseLines(buffer: string): {
  events: Array<Record<string, any>>;
  isDone: boolean;
  remaining: string;
} {
  const lines = buffer.split("\n");
  const remaining = lines.pop() ?? "";
  const events: Array<Record<string, any>> = [];
  let isDone = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.startsWith("data:")) continue;

    const dataStr = line.slice(5).trim();
    if (dataStr === "[DONE]") {
      isDone = true;
      break;
    }

    try {
      const parsed = JSON.parse(dataStr);
      events.push(parsed);
    } catch {
      // ignore partial lines
    }
  }

  return { events, isDone, remaining };
}

export class GeminiAdapter implements AiProtocolAdapter {
  readonly protocol = "gemini" as const;

  async testConnection(options: TestAiConnectionOptions): Promise<TestAiConnectionResult> {
    const { baseUrl, apiKey, model, timeoutMs = 15000 } = options;
    if (!baseUrl.trim()) {
      return { ok: false, message: "接口地址 (Base URL) 不能为空" };
    }
    if (!model.trim()) {
      return { ok: false, message: "模型名称不能为空" };
    }

    const cleanBase = baseUrl.replace(/\/+$/, "");
    const cleanModel = model.trim().replace(/^models\//, "");
    const endpoint = `${cleanBase}/v1beta/models/${cleanModel}:generateContent`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey.trim()) {
        headers["x-goog-api-key"] = apiKey.trim();
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Hi" }] }],
          generationConfig: { maxOutputTokens: 5 },
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

        if (response.status === 400 && errorDetail.includes("API_KEY_INVALID")) {
          return {
            ok: false,
            message: `认证失败 (400)：Google Gemini API Key 无效。${errorDetail ? ` (${errorDetail})` : ""}`,
            latencyMs,
          };
        }
        if (response.status === 404) {
          return {
            ok: false,
            message: `路径或模型未找到 (404)：请检查 Base URL 或模型名称。${errorDetail ? ` (${errorDetail})` : ""}`,
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
        message: `连接成功！响应耗时 ${latencyMs}ms，Gemini 模型可用。`,
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
    const endpoint = `${cleanBase}/v1beta/models`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const fallbackCandidates = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-thinking-exp-01-21",
      "gemini-2.0-pro-exp-02-05",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ];

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey.trim()) {
        headers["x-goog-api-key"] = apiKey.trim();
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
          message: `在线拉取模型未开放 (${response.status})，已提供常用 Gemini 候选模型`,
        };
      }

      const json = (await response.json()) as {
        models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
      };

      const extracted: string[] = [];
      if (Array.isArray(json.models)) {
        for (const item of json.models) {
          const rawName = item?.name;
          if (typeof rawName === "string" && rawName.trim()) {
            const clean = rawName.replace(/^models\//, "").trim();
            // Filter to text generation models
            const methods = item.supportedGenerationMethods;
            if (!methods || methods.includes("generateContent")) {
              extracted.push(clean);
            }
          }
        }
      }

      const models = Array.from(new Set(extracted.length > 0 ? extracted : fallbackCandidates)).sort();
      return {
        ok: true,
        models,
        message: `成功获取到 ${models.length} 个可用 Gemini 模型`,
      };
    } catch {
      return {
        ok: true,
        models: fallbackCandidates,
        message: "无法访问在线模型端点，已提供常用 Gemini 候选模型",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async *streamChat(options: AdapterChatOptions): AsyncGenerator<UnifiedStreamEvent, void, unknown> {
    const { baseUrl, apiKey, model, temperature = 0.7, messages, tools, signal } = options;

    const cleanBase = baseUrl.replace(/\/+$/, "");
    const cleanModel = model.trim().replace(/^models\//, "");
    const endpoint = `${cleanBase}/v1beta/models/${cleanModel}:streamGenerateContent?alt=sse`;

    // 1. Separate system instruction
    const systemMessages = messages.filter((m) => m.role === "system");
    const systemInstruction =
      systemMessages.length > 0
        ? { parts: [{ text: systemMessages.map((m) => m.content).join("\n\n") }] }
        : undefined;

    // 2. Format conversation to Gemini contents
    const nonSystem = messages.filter((m) => m.role !== "system");
    const contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [];

    for (const m of nonSystem) {
      if (m.role === "user") {
        const newParts = [{ text: m.content }];
        const last = contents[contents.length - 1];
        if (last && last.role === "user") {
          last.parts.push(...newParts);
        } else {
          contents.push({ role: "user", parts: newParts });
        }
      } else if (m.role === "tool") {
        let responseContent: Record<string, unknown> = {};
        try {
          responseContent = JSON.parse(m.content);
        } catch {
          responseContent = { content: m.content };
        }
        const toolResponsePart = {
          functionResponse: {
            name: m.name || "tool",
            response: responseContent,
          },
        };
        const last = contents[contents.length - 1];
        if (last && last.role === "user") {
          last.parts.push(toolResponsePart);
        } else {
          contents.push({ role: "user", parts: [toolResponsePart] });
        }
      } else if (m.role === "assistant") {
        const parts: Array<Record<string, unknown>> = [];
        if (m.content && m.content.trim()) {
          parts.push({ text: m.content });
        }
        if (m.tool_calls && m.tool_calls.length > 0) {
          for (const tc of m.tool_calls) {
            let argsObj: Record<string, unknown> = {};
            try {
              argsObj = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
            } catch {
              argsObj = {};
            }
            parts.push({
              functionCall: {
                name: tc.function.name,
                args: argsObj,
              },
            });
          }
        }
        if (parts.length === 0) {
          parts.push({ text: "" });
        }
        const last = contents[contents.length - 1];
        if (last && last.role === "model") {
          last.parts.push(...parts);
        } else {
          contents.push({ role: "model", parts });
        }
      }
    }

    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Hi" }] });
    }

    // 3. Format tools with functionDeclarations
    const functionDeclarations = tools?.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));

    const geminiTools =
      functionDeclarations && functionDeclarations.length > 0
        ? [{ functionDeclarations }]
        : undefined;

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }
    if (geminiTools) {
      payload.tools = geminiTools;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey.trim()) {
      headers["x-goog-api-key"] = apiKey.trim();
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
      throw new Error(`Gemini 请求失败 (${response.status})：${errorDetail || response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Gemini 服务端未返回响应数据流 (body is null)");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let hasToolCalls = false;

    const processEvents = function* (events: Array<Record<string, any>>) {
      for (const ev of events) {
        const candidate = ev?.candidates?.[0];
        if (!candidate) continue;

        const parts = candidate.content?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            // Check thought / reasoning (Gemini 2.0 Flash Thinking)
            if (part.thought === true && typeof part.text === "string") {
              yield {
                type: "reasoning_delta" as const,
                text: part.text,
              };
            } else if (typeof part.text === "string" && !part.thought) {
              yield {
                type: "text_delta" as const,
                text: part.text,
              };
            }

            // Check functionCall
            if (part.functionCall && typeof part.functionCall.name === "string") {
              hasToolCalls = true;
              const callId = `call_${part.functionCall.name}_${Math.random().toString(36).slice(2, 8)}`;
              yield {
                type: "tool_call_start" as const,
                id: callId,
                name: part.functionCall.name,
              };
              yield {
                type: "tool_call_args_delta" as const,
                id: callId,
                delta: JSON.stringify(part.functionCall.args || {}),
              };
              yield {
                type: "tool_call_end" as const,
                id: callId,
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
        const { events, isDone, remaining } = parseGeminiSseLines(buffer);
        buffer = remaining;

        yield* processEvents(events);
        if (isDone) break;
      }

      if (buffer.trim()) {
        const { events } = parseGeminiSseLines(buffer + "\n");
        yield* processEvents(events);
      }
    } finally {
      reader.releaseLock();
    }

    yield {
      type: "finish",
      reason: hasToolCalls ? "tool_calls" : "stop",
    };
  }
}
