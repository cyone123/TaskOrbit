import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAiAdapter, registerAiAdapter } from "./registry";
import { resolveAiProtocol, type AiProtocolAdapter } from "./base";
import { OpenAiChatAdapter } from "./openai-chat";
import { streamAiChat } from "../client";
import type { UnifiedStreamEvent } from "../types";

describe("resolveAiProtocol", () => {
  it("prioritizes explicit protocol if provided", () => {
    expect(resolveAiProtocol("deepseek", "https://api.deepseek.com/v1", "anthropic")).toBe(
      "anthropic",
    );
    expect(resolveAiProtocol(undefined, "https://example.com/v1", "gemini")).toBe("gemini");
  });

  it("infers anthropic protocol from provider name or URL", () => {
    expect(resolveAiProtocol("anthropic", "https://api.anthropic.com/v1")).toBe("anthropic");
    expect(resolveAiProtocol("custom", "https://api.anthropic.com")).toBe("anthropic");
  });

  it("infers gemini protocol from provider name or URL", () => {
    expect(resolveAiProtocol("gemini", "https://generativelanguage.googleapis.com")).toBe("gemini");
    expect(resolveAiProtocol("custom", "https://generativelanguage.googleapis.com/v1beta")).toBe(
      "gemini",
    );
  });

  it("infers openai_responses protocol from responses URL", () => {
    expect(resolveAiProtocol("openai", "https://api.openai.com/v1/responses")).toBe(
      "openai_responses",
    );
    expect(resolveAiProtocol("custom", "https://proxy.example.com/responses")).toBe(
      "openai_responses",
    );
  });

  it("defaults to openai_chat", () => {
    expect(resolveAiProtocol("deepseek", "https://api.deepseek.com/v1")).toBe("openai_chat");
    expect(resolveAiProtocol("ollama", "http://localhost:11434/v1")).toBe("openai_chat");
    expect(resolveAiProtocol("custom", "https://my-proxy.com/v1")).toBe("openai_chat");
    expect(resolveAiProtocol()).toBe("openai_chat");
  });
});

describe("adapter registry", () => {
  it("returns OpenAiChatAdapter for openai_chat by default", () => {
    const adapter = getAiAdapter("openai_chat");
    expect(adapter).toBeInstanceOf(OpenAiChatAdapter);
    expect(adapter.protocol).toBe("openai_chat");
  });

  it("throws descriptive error for unregistered protocol", () => {
    expect(() => getAiAdapter("anthropic" as any)).toThrow(/未找到协议适配器 \[anthropic\]/);
  });

  it("allows registering and retrieving custom adapter", () => {
    const mockAdapter: AiProtocolAdapter = {
      protocol: "anthropic",
      testConnection: vi.fn(),
      fetchModels: vi.fn(),
      streamChat: vi.fn(),
    };
    registerAiAdapter(mockAdapter);
    expect(getAiAdapter("anthropic")).toBe(mockAdapter);
  });
});

describe("OpenAiChatAdapter streamChat", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("streams text and reasoning deltas as UnifiedStreamEvents", async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{"reasoning_content":"思考中..."}}]}',
      'data: {"choices":[{"delta":{"content":"你好"}}]}',
      'data: {"choices":[{"delta":{"content":"，世界！"},"finish_reason":"stop"}]}',
      "data: [DONE]",
    ].join("\n\n");

    const encoder = new TextEncoder();
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseLines));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    } as any);

    const adapter = new OpenAiChatAdapter();
    const events: UnifiedStreamEvent[] = [];

    for await (const ev of adapter.streamChat({
      baseUrl: "https://api.test.com/v1",
      apiKey: "sk-test",
      model: "deepseek-chat",
      messages: [{ id: "1", role: "user", content: "Hello" }],
    })) {
      events.push(ev);
    }

    expect(events).toEqual([
      { type: "reasoning_delta", text: "思考中..." },
      { type: "text_delta", text: "你好" },
      { type: "text_delta", text: "，世界！" },
      { type: "finish", reason: "stop" },
    ]);
  });

  it("streams tool call events with start, args_delta, end, and finish", async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"get_workspace_summary","arguments":""}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"key\\": "}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"val\\"}"}}]}}]}',
      'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
      "data: [DONE]",
    ].join("\n\n");

    const encoder = new TextEncoder();
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseLines));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    } as any);

    const adapter = new OpenAiChatAdapter();
    const events: UnifiedStreamEvent[] = [];

    for await (const ev of adapter.streamChat({
      baseUrl: "https://api.test.com/v1",
      apiKey: "sk-test",
      model: "deepseek-chat",
      messages: [{ id: "1", role: "user", content: "Hello" }],
    })) {
      events.push(ev);
    }

    expect(events).toEqual([
      { type: "tool_call_start", id: "call_123", name: "get_workspace_summary" },
      { type: "tool_call_args_delta", id: "call_123", delta: '{"key": ' },
      { type: "tool_call_args_delta", id: "call_123", delta: '"val"}' },
      { type: "tool_call_end", id: "call_123" },
      { type: "finish", reason: "tool_calls" },
    ]);
  });

  it("streamAiChat delegates through registry and emits unified events", async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{"content":"测试回复"},"finish_reason":"stop"}]}',
      "data: [DONE]",
    ].join("\n\n");

    const encoder = new TextEncoder();
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseLines));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    } as any);

    const events: UnifiedStreamEvent[] = [];
    for await (const ev of streamAiChat({
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "sk-test",
      model: "deepseek-chat",
      messages: [{ id: "1", role: "user", content: "hi" }],
    })) {
      events.push(ev);
    }

    expect(events).toEqual([
      { type: "text_delta", text: "测试回复" },
      { type: "finish", reason: "stop" },
    ]);
  });
});
