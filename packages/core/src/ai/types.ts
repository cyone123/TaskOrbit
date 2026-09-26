export interface AiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AiChatMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: AiToolCall[];
  createdAt?: number;
}

export interface AiToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: {
    type: string;
    properties?: Record<string, unknown>;
  };
}

export interface AiToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, AiToolParameterProperty>;
      required?: string[];
    };
  };
}

export interface StreamDelta {
  content?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: "function";
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

export interface StreamChunk {
  id: string;
  model: string;
  delta: StreamDelta;
  finish_reason: string | null;
}
