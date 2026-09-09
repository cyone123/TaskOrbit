import { describe, expect, it, vi } from "vitest";
import type { WebDavSettings } from "../types";
import {
  base64Encode,
  WebDavClient,
  WebDavError,
  WebDavPreconditionFailedError,
} from "./client";
import type { HttpRequestOptions, HttpResponse, HttpTransport } from "./types";

const mockSettings: WebDavSettings = {
  enabled: true,
  serverUrl: "https://dav.example.com/remote.php/webdav/",
  username: "user1",
  password: "pwd",
  remoteDir: "/taskorbit",
  autoSync: true,
  syncIntervalMinutes: 15,
};

describe("webdav/client", () => {
  it("encodes base64 with utf-8 support properly", () => {
    expect(base64Encode("hello:world")).toBe("aGVsbG86d29ybGQ=");
    expect(base64Encode("测试:密码123")).toBe("5rWL6K+VOuWvhueggTEyMw==");
  });

  it("resolves paths properly without double slashes", () => {
    const client = new WebDavClient(mockSettings, async () => ({
      status: 200,
      headers: {},
      body: "",
    }));

    expect(client.resolveUrl("")).toBe("https://dav.example.com/remote.php/webdav");
    expect(client.resolveUrl("/taskorbit")).toBe("https://dav.example.com/remote.php/webdav/taskorbit");
    expect(client.resolveUrl("taskorbit/data.json")).toBe(
      "https://dav.example.com/remote.php/webdav/taskorbit/data.json",
    );
  });

  it("tests connection successfully on 207 status", async () => {
    const transport = vi.fn<HttpTransport>().mockResolvedValue({
      status: 207,
      headers: {},
      body: "<xml />",
    });

    const client = new WebDavClient(mockSettings, transport);
    const result = await client.testConnection();

    expect(result.success).toBe(true);
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PROPFIND",
        url: "https://dav.example.com/remote.php/webdav",
      }),
    );
    expect(transport.mock.calls[0][0].headers?.["Authorization"]).toBe(
      `Basic ${base64Encode("user1:pwd")}`,
    );
  });

  it("reports 401 unauthorized on test connection", async () => {
    const transport = vi.fn<HttpTransport>().mockResolvedValue({
      status: 401,
      headers: {},
      body: "Unauthorized",
    });

    const client = new WebDavClient(mockSettings, transport);
    const result = await client.testConnection();

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.message).toContain("401");
  });

  it("ensures directory by calling MKCOL when 404", async () => {
    const transport = vi
      .fn<HttpTransport>()
      .mockResolvedValueOnce({ status: 404, headers: {}, body: "" }) // PROPFIND 404
      .mockResolvedValueOnce({ status: 201, headers: {}, body: "" }); // MKCOL 201

    const client = new WebDavClient(mockSettings, transport);
    await client.ensureDir("taskorbit");

    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[0][0].method).toBe("PROPFIND");
    expect(transport.mock.calls[1][0].method).toBe("MKCOL");
  });

  it("gets file metadata parsing ETag from XML body", async () => {
    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
    <d:multistatus xmlns:d="DAV:">
      <d:response>
        <d:propstat>
          <d:prop>
            <d:getetag>"abcdef123456"</d:getetag>
            <d:getlastmodified>Wed, 09 Sep 2026 12:00:00 GMT</d:getlastmodified>
          </d:prop>
        </d:propstat>
      </d:response>
    </d:multistatus>`;

    const transport = vi.fn<HttpTransport>().mockResolvedValue({
      status: 207,
      headers: {},
      body: xmlBody,
    });

    const client = new WebDavClient(mockSettings, transport);
    const meta = await client.getFileMeta("taskorbit/data.json");

    expect(meta.exists).toBe(true);
    expect(meta.etag).toBe("abcdef123456");
    expect(meta.lastModified).toBe("Wed, 09 Sep 2026 12:00:00 GMT");
  });

  it("downloads file and returns ETag", async () => {
    const transport = vi.fn<HttpTransport>().mockResolvedValue({
      status: 200,
      headers: { ETag: '"etag-999"' },
      body: '{"foo":"bar"}',
    });

    const client = new WebDavClient(mockSettings, transport);
    const file = await client.getFile("taskorbit/data.json");

    expect(file.content).toBe('{"foo":"bar"}');
    expect(file.etag).toBe("etag-999");
  });

  it("uploads file and sends If-Match header", async () => {
    const transport = vi.fn<HttpTransport>().mockResolvedValue({
      status: 200,
      headers: { ETag: '"new-etag-100"' },
      body: "",
    });

    const client = new WebDavClient(mockSettings, transport);
    const result = await client.putFile("taskorbit/data.json", '{"test":1}', "old-etag");

    expect(result.etag).toBe("new-etag-100");
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "If-Match": '"old-etag"',
        }),
      }),
    );
  });

  it("throws WebDavPreconditionFailedError on 412 status", async () => {
    const transport = vi.fn<HttpTransport>().mockResolvedValue({
      status: 412,
      headers: {},
      body: "Precondition Failed",
    });

    const client = new WebDavClient(mockSettings, transport);
    await expect(
      client.putFile("taskorbit/data.json", "{}", "stale-etag"),
    ).rejects.toThrow(WebDavPreconditionFailedError);
  });
});
