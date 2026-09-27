import type { AiProtocolType, AiProviderKey } from "../types";

export interface AiProviderPreset {
  id: AiProviderKey;
  name: string;
  baseUrl: string;
  defaultModel: string;
  protocol?: AiProtocolType;
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    protocol: "openai_chat",
  },
  {
    id: "siliconflow",
    name: "SiliconFlow (硅基流动)",
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "deepseek-ai/DeepSeek-V3",
    protocol: "openai_chat",
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    protocol: "openai_chat",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-3-7-sonnet-20250219",
    protocol: "anthropic",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    defaultModel: "gemini-2.0-flash",
    protocol: "gemini",
  },
  {
    id: "ollama",
    name: "Ollama (本地私有)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen2.5:7b",
    protocol: "openai_chat",
  },
  {
    id: "custom",
    name: "自定义提供商",
    baseUrl: "",
    defaultModel: "",
    protocol: "openai_chat",
  },
];

export function getAiProviderPreset(id: string): AiProviderPreset | undefined {
  return AI_PROVIDER_PRESETS.find((preset) => preset.id === id);
}

export const BUILTIN_PROVIDER_CANDIDATE_MODELS: Record<string, string[]> = {
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  siliconflow: [
    "deepseek-ai/DeepSeek-V3",
    "deepseek-ai/DeepSeek-R1",
    "Qwen/Qwen2.5-72B-Instruct",
    "Qwen/Qwen2.5-32B-Instruct",
    "Qwen/Qwen2.5-7B-Instruct",
    "THUDM/glm-4-9b-chat",
  ],
  openai: [
    "gpt-4o-mini",
    "gpt-4o",
    "o1-mini",
    "o1-preview",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
  ],
  anthropic: [
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
  ],
  gemini: [
    "gemini-2.0-flash",
    "gemini-2.0-flash-thinking-exp-01-21",
    "gemini-2.0-pro-exp-02-05",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ],
  ollama: [
    "qwen2.5:7b",
    "qwen2.5:14b",
    "deepseek-r1:7b",
    "deepseek-r1:8b",
    "llama3.3:70b",
    "llama3.1:8b",
  ],
  custom: [],
};
