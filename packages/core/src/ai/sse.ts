import type { StreamChunk } from "./types";

/**
 * Parses accumulated SSE buffer lines and extracts StreamChunks for OpenAI format.
 */
export function parseSseBuffer(buffer: string): {
  events: StreamChunk[];
  isDone: boolean;
  remaining: string;
} {
  const lines = buffer.split("\n");
  const remaining = lines.pop() ?? "";
  const events: StreamChunk[] = [];
  let isDone = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.startsWith("data:")) continue;

    const data = line.slice(5).trim();
    if (data === "[DONE]") {
      isDone = true;
      break;
    }

    try {
      const parsed = JSON.parse(data) as {
        id?: string;
        model?: string;
        choices?: Array<{
          delta?: {
            content?: string;
            reasoning_content?: string;
            tool_calls?: Array<{
              index: number;
              id?: string;
              type?: "function";
              function?: {
                name?: string;
                arguments?: string;
              };
            }>;
          };
          finish_reason?: string | null;
        }>;
      };

      const choice = parsed.choices?.[0];
      events.push({
        id: parsed.id ?? "",
        model: parsed.model ?? "",
        delta: choice?.delta ?? {},
        finish_reason: choice?.finish_reason ?? null,
      });
    } catch {
      // Ignore partial or unparseable SSE data lines
    }
  }

  return { events, isDone, remaining };
}
