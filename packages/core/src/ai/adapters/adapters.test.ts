import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAiAdapter, registerAiAdapter } from "./registry";
import { resolveAiProtocol, type AiProtocolAdapter } from "./base";
import { OpenAiChatAdapter } from "./openai-chat";
import { AnthropicAdapter } from "./anthropic";
import { GeminiAdapter } from "./gemini";
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

  it("returns AnthropicAdapter for anthropic by default", () => {
    const adapter = getAiAdapter("anthropic");
    expect(adapter).toBeInstanceOf(AnthropicAdapter);
    expect(adapter.protocol).toBe("anthropic");
  });

  it("returns GeminiAdapter for gemini by default", () => {
    const adapter = getAiAdapter("gemini");
    expect(adapter).toBeInstanceOf(GeminiAdapter);
    expect(adapter.protocol).toBe("gemini");
  });

  it("throws descriptive error for unregistered protocol", () => {
    expect(() => getAiAdapter("unregistered_protocol" as any)).toThrow(
      /未找到协议适配器 \[unregistered_protocol\]/,
    );
  });

  it("allows registering and retrieving custom adapter", () => {
    const mockAdapter: AiProtocolAdapter = {
      protocol: "openai_responses",
      testConnection: vi.fn(),
      fetchModels: vi.fn(),
      streamChat: vi.fn(),
    };
    registerAiAdapter(mockAdapter);
    expect(getAiAdapter("openai_responses")).toBe(mockAdapter);
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

describe("AnthropicAdapter", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("testConnection sends anthropic headers and verifies connection", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg_123" }),
    } as any);

    const adapter = new AnthropicAdapter();
    const res = await adapter.testConnection({
      baseUrl: "https://api.anthropic.com",
      apiKey: "sk-ant-test",
      model: "claude-3-7-sonnet-20250219",
    });

    expect(res.ok).toBe(true);
    expect(res.message).toContain("Claude 模型可用");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "sk-ant-test",
          "anthropic-version": "2023-06-01",
        }),
      }),
    );
  });

  it("streams thinking_delta, text_delta, and tool_use blocks", async () => {
    const sseLines = [
      "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_123\"}}",
      "event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"thinking\",\"thinking\":\"\"}}",
      "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"thinking_delta\",\"thinking\":\"深度思考中...\"}}",
      "event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":0}",
      "event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":1,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}",
      "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":1,\"delta\":{\"type\":\"text_delta\",\"text\":\"正在为您规划日程\"}}",
      "event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":1}",
      "event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":2,\"content_block\":{\"type\":\"tool_use\",\"id\":\"toolu_abc\",\"name\":\"plan_daily_schedule\"}}",
      "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":2,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":\"{\\\"date\\\": \\\"2026-09-27\\\"}\"}}",
      "event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":2}",
      "event: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"tool_use\"}}",
      "event: message_stop\ndata: {\"type\":\"message_stop\"}",
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

    const adapter = new AnthropicAdapter();
    const events: UnifiedStreamEvent[] = [];

    for await (const ev of adapter.streamChat({
      baseUrl: "https://api.anthropic.com",
      apiKey: "sk-ant-test",
      model: "claude-3-7-sonnet-20250219",
      messages: [
        { id: "s1", role: "system", content: "You are Claude assistant." },
        { id: "u1", role: "user", content: "Plan my schedule" },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "plan_daily_schedule",
            description: "Plan tasks",
            parameters: { type: "object", properties: {} },
          },
        },
      ],
    })) {
      events.push(ev);
    }

    expect(events).toEqual([
      { type: "reasoning_delta", text: "深度思考中..." },
      { type: "text_delta", text: "正在为您规划日程" },
      { type: "tool_call_start", id: "toolu_abc", name: "plan_daily_schedule" },
      { type: "tool_call_args_delta", id: "toolu_abc", delta: '{"date": "2026-09-27"}' },
      { type: "tool_call_end", id: "toolu_abc" },
      { type: "finish", reason: "tool_calls" },
    ]);

    // Check request payload separated system message
    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    const sentBody = JSON.parse(fetchCall[1].body);
    expect(sentBody.system).toBe("You are Claude assistant.");
    expect(sentBody.messages[0].role).toBe("user");
    expect(sentBody.tools[0].input_schema).toEqual({ type: "object", properties: {} });
    expect(sentBody.thinking).toEqual({ type: "enabled", budget_tokens: 2048 });
  });
});

describe("GeminiAdapter", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("testConnection calls generateContent and verifies connection", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "Hello" }] } }] }),
    } as any);

    const adapter = new GeminiAdapter();
    const res = await adapter.testConnection({
      baseUrl: "https://generativelanguage.googleapis.com",
      apiKey: "AIzaSyTestKey",
      model: "gemini-2.0-flash",
    });

    expect(res.ok).toBe(true);
    expect(res.message).toContain("Gemini 模型可用");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-goog-api-key": "AIzaSyTestKey",
        }),
      }),
    );
  });

  it("streams thought reasoning, text, and functionCall", async () => {
    const sseLines = [
      'data: {"candidates":[{"content":{"role":"model","parts":[{"text":"Gemini thinking...","thought":true}]}}]}',
      'data: {"candidates":[{"content":{"role":"model","parts":[{"text":"已为您整理好任务。"}]}}]}',
      'data: {"candidates":[{"content":{"role":"model","parts":[{"functionCall":{"name":"get_workspace_summary","args":{"includeDone":false}}}]},"finishReason":"STOP"}]}',
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

    const adapter = new GeminiAdapter();
    const events: UnifiedStreamEvent[] = [];

    for await (const ev of adapter.streamChat({
      baseUrl: "https://generativelanguage.googleapis.com",
      apiKey: "AIzaSyTestKey",
      model: "gemini-2.0-flash",
      messages: [
        { id: "s1", role: "system", content: "You are a helpful planner." },
        { id: "u1", role: "user", content: "Show summary" },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "get_workspace_summary",
            description: "Get summary",
            parameters: { type: "object", properties: {} },
          },
        },
      ],
    })) {
      events.push(ev);
    }

    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events[0]).toEqual({ type: "reasoning_delta", text: "Gemini thinking..." });
    expect(events[1]).toEqual({ type: "text_delta", text: "已为您整理好任务。" });
    expect(events[2].type).toBe("tool_call_start");
    expect((events[2] as any).name).toBe("get_workspace_summary");
    expect(events[3].type).toBe("tool_call_args_delta");
    expect((events[3] as any).delta).toBe(JSON.stringify({ includeDone: false }));
    expect(events[4].type).toBe("tool_call_end");
    expect(events[5]).toEqual({ type: "finish", reason: "tool_calls" });

    // Verify request payload: systemInstruction and functionDeclarations
    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    const sentBody = JSON.parse(fetchCall[1].body);
    expect(sentBody.systemInstruction).toEqual({
      parts: [{ text: "You are a helpful planner." }],
    });
    expect(sentBody.contents[0].role).toBe("user");
    expect(sentBody.tools[0].functionDeclarations[0].name).toBe("get_workspace_summary");
  });
});
