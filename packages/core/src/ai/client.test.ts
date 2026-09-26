import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchAiModels,
  parseSseBuffer,
  streamChatCompletions,
  testAiConnection,
} from "./client";
import { AI_PROVIDER_PRESETS, getAiProviderPreset } from "./presets";
import type { AiChatMessage, StreamChunk } from "./types";

describe("AI presets", () => {
  it("includes presets for deepseek, siliconflow, openai, and ollama", () => {
    expect(AI_PROVIDER_PRESETS.map((p) => p.id)).toEqual([
      "deepseek",
      "siliconflow",
      "openai",
      "ollama",
      "custom",
    ]);

    const deepseek = getAiProviderPreset("deepseek");
    expect(deepseek?.baseUrl).toBe("https://api.deepseek.com/v1");
    expect(deepseek?.defaultModel).toBe("deepseek-chat");
  });
});

describe("testAiConnection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails if baseUrl is empty", async () => {
    const res = await testAiConnection({
      baseUrl: "",
      apiKey: "sk-123",
      model: "gpt-4o",
    });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("Base URL");
  });

  it("fails if model is empty", async () => {
    const res = await testAiConnection({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-123",
      model: "",
    });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("模型名称");
  });

  it("handles successful connection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "Hello" } }] }),
      }),
    );

    const res = await testAiConnection({
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "sk-test",
      model: "deepseek-chat",
    });

    expect(res.ok).toBe(true);
    expect(res.message).toContain("连接成功");
  });

  it("handles 401 Unauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Invalid API key" } }),
      }),
    );

    const res = await testAiConnection({
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "sk-bad",
      model: "deepseek-chat",
    });

    expect(res.ok).toBe(false);
    expect(res.message).toContain("401");
  });

  it("handles 404 Not Found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      }),
    );

    const res = await testAiConnection({
      baseUrl: "https://invalid.com/wrong",
      apiKey: "sk-test",
      model: "deepseek-chat",
    });

    expect(res.ok).toBe(false);
    expect(res.message).toContain("404");
  });
});

describe("parseSseBuffer", () => {
  it("parses single data line with content delta", () => {
    const buffer = 'data: {"id":"1","model":"test","choices":[{"delta":{"content":"Hello"}}]}\n';
    const result = parseSseBuffer(buffer);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].delta.content).toBe("Hello");
    expect(result.isDone).toBe(false);
    expect(result.remaining).toBe("");
  });

  it("retains partial line in remaining", () => {
    const buffer = 'data: {"id":"1","choices":[{"delta":{"content":"A"}}]}\ndata: {"id":"2"';
    const result = parseSseBuffer(buffer);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].delta.content).toBe("A");
    expect(result.remaining).toBe('data: {"id":"2"');
    expect(result.isDone).toBe(false);
  });

  it("detects [DONE] message", () => {
    const buffer = "data: [DONE]\n";
    const result = parseSseBuffer(buffer);

    expect(result.isDone).toBe(true);
    expect(result.events).toHaveLength(0);
  });

  it("parses tool calls delta", () => {
    const raw = JSON.stringify({
      id: "call_chunk",
      model: "deepseek",
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call_abc",
                type: "function",
                function: { name: "get_workspace_summary", arguments: "{}" },
              },
            ],
          },
        },
      ],
    });
    const buffer = `data: ${raw}\n`;
    const result = parseSseBuffer(buffer);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].delta.tool_calls?.[0].function?.name).toBe("get_workspace_summary");
  });
});

describe("streamChatCompletions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("streams chunks from response body", async () => {
    const encoder = new TextEncoder();
    const chunk1 = 'data: {"id":"1","model":"m","choices":[{"delta":{"content":"Hi"}}]}\n\n';
    const chunk2 = 'data: {"id":"2","model":"m","choices":[{"delta":{"content":" there"}}]}\n\ndata: [DONE]\n\n';

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(chunk1));
        controller.enqueue(encoder.encode(chunk2));
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
      }),
    );

    const messages: AiChatMessage[] = [{ id: "m1", role: "user", content: "Hello" }];
    const chunks: StreamChunk[] = [];

    for await (const chunk of streamChatCompletions({
      baseUrl: "https://api.test/v1",
      apiKey: "sk-test",
      model: "test-model",
      messages,
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0].delta.content).toBe("Hi");
    expect(chunks[1].delta.content).toBe(" there");
  });

  it("throws error when API returns error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: { message: "Server overloaded" } }),
      }),
    );

    const messages: AiChatMessage[] = [{ id: "m1", role: "user", content: "Hello" }];

    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of streamChatCompletions({
        baseUrl: "https://api.test/v1",
        apiKey: "sk-test",
        model: "test-model",
        messages,
      })) {
        // do nothing
      }
    }).rejects.toThrow("Server overloaded");
  });
});

describe("fetchAiModels", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails if baseUrl is empty", async () => {
    const res = await fetchAiModels({ baseUrl: "", apiKey: "sk-test" });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("Base URL");
  });

  it("fetches and parses models from standard OpenAI format", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          object: "list",
          data: [
            { id: "deepseek-chat", object: "model" },
            { id: "deepseek-reasoner", object: "model" },
          ],
        }),
      }),
    );

    const res = await fetchAiModels({
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "sk-test",
    });

    expect(res.ok).toBe(true);
    expect(res.models).toEqual(["deepseek-chat", "deepseek-reasoner"]);
    expect(res.message).toContain("2 个可用模型");
  });

  it("handles alternative array or object format and sorts results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: "llama3:8b" }, { name: "qwen2.5:7b" }],
        }),
      }),
    );

    const res = await fetchAiModels({
      baseUrl: "http://localhost:11434/v1",
      apiKey: "",
    });

    expect(res.ok).toBe(true);
    expect(res.models).toEqual(["llama3:8b", "qwen2.5:7b"]);
  });

  it("handles error response from endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: { message: "Invalid API Key" } }),
      }),
    );

    const res = await fetchAiModels({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "invalid-key",
    });

    expect(res.ok).toBe(false);
    expect(res.message).toContain("Invalid API Key");
  });
});
