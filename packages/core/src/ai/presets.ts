import type { AiProviderKey } from "../types";

export interface AiProviderPreset {
  id: AiProviderKey;
  name: string;
  baseUrl: string;
  defaultModel: string;
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  {
    id: "siliconflow",
    name: "SiliconFlow (硅基流动)",
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "deepseek-ai/DeepSeek-V3",
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "ollama",
    name: "Ollama (本地私有)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen2.5:7b",
  },
  {
    id: "custom",
    name: "自定义 (OpenAI 兼容)",
    baseUrl: "",
    defaultModel: "",
  },
];

export function getAiProviderPreset(id: AiProviderKey): AiProviderPreset | undefined {
  return AI_PROVIDER_PRESETS.find((preset) => preset.id === id);
}
