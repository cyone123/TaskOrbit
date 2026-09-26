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
