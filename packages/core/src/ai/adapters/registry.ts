import type { AiProtocolAdapter, AiProtocolType } from "./base";
import { OpenAiChatAdapter } from "./openai-chat";
import { AnthropicAdapter } from "./anthropic";
import { GeminiAdapter } from "./gemini";

const adapters = new Map<AiProtocolType, AiProtocolAdapter>();

// Register default built-in adapters
adapters.set("openai_chat", new OpenAiChatAdapter());
adapters.set("anthropic", new AnthropicAdapter());
adapters.set("gemini", new GeminiAdapter());

export function registerAiAdapter(adapter: AiProtocolAdapter): void {
  adapters.set(adapter.protocol, adapter);
}

export function getAiAdapter(protocol: AiProtocolType = "openai_chat"): AiProtocolAdapter {
  const adapter = adapters.get(protocol);
  if (!adapter) {
    throw new Error(
      `未找到协议适配器 [${protocol}]。目前已注册的协议为：${Array.from(adapters.keys()).join(", ")}`,
    );
  }
  return adapter;
}
