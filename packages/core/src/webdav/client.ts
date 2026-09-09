import type { WebDavSettings } from "../types";
import type {
  HttpRequestOptions,
  HttpResponse,
  HttpTransport,
  WebDavConnectionTestResult,
  WebDavFileMeta,
} from "./types";

export class WebDavError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string,
  ) {
    super(message);
    this.name = "WebDavError";
  }
}

export class WebDavPreconditionFailedError extends WebDavError {
  constructor(message = "远端文件已被修改 (412 Precondition Failed)") {
    super(message, 412);
    this.name = "WebDavPreconditionFailedError";
  }
}

/** Standard Base64 encoder safe for UTF-8 in browser, Node.js, and React Native. */
export function base64Encode(input: string): string {
  if (typeof btoa === "function") {
    try {
      return btoa(unescape(encodeURIComponent(input)));
    } catch {
      // Fall through to JS implementation
    }
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const utf8Bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let charCode = input.charCodeAt(i);
    if (charCode < 0x80) {
      utf8Bytes.push(charCode);
    } else if (charCode < 0x800) {
      utf8Bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      utf8Bytes.push(
        0xe0 | (charCode >> 12),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f),
      );
    } else {
      i++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
      utf8Bytes.push(
        0xf0 | (charCode >> 18),
        0x80 | ((charCode >> 12) & 0x3f),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f),
      );
    }
  }

  let output = "";
  for (let i = 0; i < utf8Bytes.length; i += 3) {
    const b1 = utf8Bytes[i];
    const b2 = i + 1 < utf8Bytes.length ? utf8Bytes[i + 1] : NaN;
    const b3 = i + 2 < utf8Bytes.length ? utf8Bytes[i + 2] : NaN;

    const e1 = b1 >> 2;
    const e2 = ((b1 & 3) << 4) | (b2 >> 4);
    let e3 = ((b2 & 15) << 2) | (b3 >> 6);
    let e4 = b3 & 63;

    if (isNaN(b2)) {
      e3 = 64;
      e4 = 64;
    } else if (isNaN(b3)) {
      e4 = 64;
    }

    output += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }

  return output;
}

/** Normalize headers for case-insensitive lookup. */
function getHeader(headers: Record<string, string>, name: string): string | null {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return null;
}

export class WebDavClient {
  constructor(
    private settings: WebDavSettings,
    private transport: HttpTransport,
  ) {}

  /** Resolve absolute URL by joining base serverUrl and subpaths. */
  public resolveUrl(subPath = ""): string {
    const base = this.settings.serverUrl.trim().replace(/\/+$/, "");
    const cleanSub = subPath.trim().replace(/^\/+/, "").replace(/\/+$/, "");
    return cleanSub ? `${base}/${cleanSub}` : base;
  }

  /** Build default headers with Basic Auth. */
  private buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    if (this.settings.username || this.settings.password) {
      const credentials = `${this.settings.username}:${this.settings.password}`;
      headers["Authorization"] = `Basic ${base64Encode(credentials)}`;
    }
    return headers;
  }

  /** Test WebDAV connectivity and credentials. */
  public async testConnection(): Promise<WebDavConnectionTestResult> {
    const url = this.resolveUrl();
    if (!url) {
      return { success: false, message: "服务器地址不能为空", statusCode: 0 };
    }

    try {
      const res = await this.transport({
        url,
        method: "PROPFIND",
        headers: this.buildHeaders({
          Depth: "0",
          "Content-Type": "application/xml; charset=utf-8",
        }),
        timeoutMs: 10000,
      });

      if (res.status === 207 || res.status === 200) {
        return { success: true, message: "连接成功", statusCode: res.status };
      }
      if (res.status === 401) {
        return { success: false, message: "用户名或密码错误 (401)", statusCode: res.status };
      }
      if (res.status === 403) {
        return { success: false, message: "访问被禁止 (403)", statusCode: res.status };
      }
      if (res.status === 404) {
        return { success: false, message: "WebDAV 路径不存在 (404)", statusCode: res.status };
      }
      return {
        success: false,
        message: `服务器返回状态码 ${res.status}${res.statusText ? `: ${res.statusText}` : ""}`,
        statusCode: res.status,
      };
    } catch (error) {
      return {
        success: false,
        message: `网络连接失败：${error instanceof Error ? error.message : String(error)}`,
        statusCode: 0,
      };
    }
  }

  /** Ensure a remote directory exists; create it if missing. */
  public async ensureDir(dirPath: string): Promise<void> {
    const segments = dirPath
      .trim()
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);

    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const url = this.resolveUrl(current);

      const checkRes = await this.transport({
        url,
        method: "PROPFIND",
        headers: this.buildHeaders({ Depth: "0" }),
      });

      if (checkRes.status === 404) {
        const mkRes = await this.transport({
          url,
          method: "MKCOL",
          headers: this.buildHeaders(),
        });
        if (mkRes.status !== 201 && mkRes.status !== 200 && mkRes.status !== 405) {
          throw new WebDavError(`创建目录失败 [${current}]`, mkRes.status, mkRes.body);
        }
      } else if (checkRes.status !== 200 && checkRes.status !== 207) {
        throw new WebDavError(`检查目录状态失败 [${current}]`, checkRes.status, checkRes.body);
      }
    }
  }

  /** Get metadata of a remote file. */
  public async getFileMeta(filePath: string): Promise<WebDavFileMeta> {
    const url = this.resolveUrl(filePath);
    const res = await this.transport({
      url,
      method: "PROPFIND",
      headers: this.buildHeaders({ Depth: "0" }),
    });

    if (res.status === 404) {
      return {
        exists: false,
        etag: null,
        lastModified: null,
        contentLength: null,
        isDirectory: false,
      };
    }

    if (res.status !== 207 && res.status !== 200) {
      throw new WebDavError(`获取文件元信息失败 [${filePath}]`, res.status, res.body);
    }

    // Extract etag from headers or XML body
    let etag = getHeader(res.headers, "etag");
    if (!etag && res.body) {
      const match = res.body.match(/<(?:\w+:)?getetag[^>]*>(.*?)<\/(?:\w+:)?getetag>/i);
      if (match) etag = match[1].trim();
    }
    // Clean quotes in ETag if present
    if (etag) etag = etag.replace(/^["']|["']$/g, "");

    let lastModified = getHeader(res.headers, "last-modified");
    if (!lastModified && res.body) {
      const match = res.body.match(
        /<(?:\w+:)?getlastmodified[^>]*>(.*?)<\/(?:\w+:)?getlastmodified>/i,
      );
      if (match) lastModified = match[1].trim();
    }

    const isDirectory = /<(?:\w+:)?collection\s*\/>/i.test(res.body);

    return {
      exists: true,
      etag,
      lastModified,
      contentLength: null,
      isDirectory,
    };
  }

  /** Download file text content and its ETag. */
  public async getFile(filePath: string): Promise<{ content: string; etag: string | null }> {
    const url = this.resolveUrl(filePath);
    const res = await this.transport({
      url,
      method: "GET",
      headers: this.buildHeaders({
        Accept: "application/json, text/plain, */*",
      }),
    });

    if (res.status === 404) {
      throw new WebDavError(`远端文件不存在 [${filePath}]`, 404);
    }
    if (res.status !== 200) {
      throw new WebDavError(`下载文件失败 [${filePath}]`, res.status, res.body);
    }

    let etag = getHeader(res.headers, "etag");
    if (etag) etag = etag.replace(/^["']|["']$/g, "");

    return {
      content: res.body,
      etag,
    };
  }

  /** Upload file content with optimistic locking (If-Match). */
  public async putFile(
    filePath: string,
    content: string,
    ifMatch?: string | null,
  ): Promise<{ etag: string | null }> {
    const url = this.resolveUrl(filePath);
    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
    };

    if (ifMatch) {
      headers["If-Match"] = `"${ifMatch.replace(/^["']|["']$/g, "")}"`;
    }

    const res = await this.transport({
      url,
      method: "PUT",
      headers: this.buildHeaders(headers),
      body: content,
    });

    if (res.status === 412) {
      throw new WebDavPreconditionFailedError();
    }

    if (res.status !== 200 && res.status !== 201 && res.status !== 204) {
      throw new WebDavError(`上传文件失败 [${filePath}]`, res.status, res.body);
    }

    let etag = getHeader(res.headers, "etag");
    if (etag) etag = etag.replace(/^["']|["']$/g, "");

    return { etag };
  }
}
