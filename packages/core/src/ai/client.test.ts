import { afterEach, describe, expect, it, vi } from "vitest";
import { testAiConnection } from "./client";
import { AI_PROVIDER_PRESETS, getAiProviderPreset } from "./presets";

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
