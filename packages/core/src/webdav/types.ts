export type HttpMethod = "GET" | "HEAD" | "PUT" | "DELETE" | "MKCOL" | "PROPFIND";

export interface HttpRequestOptions {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface HttpResponse {
  status: number;
  statusText?: string;
  headers: Record<string, string>;
  body: string;
}

export type HttpTransport = (options: HttpRequestOptions) => Promise<HttpResponse>;

export interface WebDavFileMeta {
  exists: boolean;
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
  isDirectory: boolean;
}

export interface WebDavConnectionTestResult {
  success: boolean;
  message: string;
  statusCode: number;
}
