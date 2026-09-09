import { invoke } from "@tauri-apps/api/core";
import type { HttpRequestOptions, HttpResponse, HttpTransport } from "@task-orbit/core";
import { isTauri } from "./persistence";

export const desktopHttpTransport: HttpTransport = async (
  options: HttpRequestOptions,
): Promise<HttpResponse> => {
  if (isTauri()) {
    return invoke<HttpResponse>("webdav_request", { options });
  }

  // Browser mode fallback
  const fetchHeaders: Record<string, string> = { ...options.headers };
  const controller = new AbortController();
  const timeout = options.timeoutMs ?? 15000;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(options.url, {
      method: options.method,
      headers: fetchHeaders,
      body: options.body,
      signal: controller.signal,
    });

    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const body = await res.text();
    return {
      status: res.status,
      statusText: res.statusText,
      headers,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
};
