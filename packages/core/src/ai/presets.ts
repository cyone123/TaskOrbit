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
    defaultModel: "deepseek-v4-flash",
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
    defaultModel: "gpt-5.5",
    protocol: "openai_chat",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-sonnet-5",
    protocol: "anthropic",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    defaultModel: "gemini-3.7-flash",
    protocol: "gemini",
  },
  {
    id: "qwen",
    name: "Qwen (千问)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen3.7-flash",
    protocol: "openai_chat",
  },
  {
    id: "glm",
    name: "GLM (智谱 AI)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-5.2",
    protocol: "openai_chat",
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "kimi-k2.6",
    protocol: "openai_chat",
  },
  {
    id: "ollama",
    name: "Ollama (本地私有)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen3.7:27b",
    protocol: "openai_chat",
  },
];

export function getAiProviderPreset(id: string): AiProviderPreset | undefined {
  return AI_PROVIDER_PRESETS.find((preset) => preset.id === id);
}

export const BUILTIN_PROVIDER_CANDIDATE_MODELS: Record<string, string[]> = {
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
  siliconflow: [
    "deepseek-ai/DeepSeek-V3.2",
    "Qwen/Qwen3.8-27B",
    "tencent/Hy4-preview",
    "meituan-longcat/LongCat-2.0",
  ],
  openai: [
    "gpt-6-astra",
    "gpt-5.6-sol",
    "gpt-5.6-luna",
    "gpt-5.5",
    "gpt-5.4",
  ],
  anthropic: [
    "claude-fable-5-1",
    "claude-opus-5-5",
    "claude-sonnet-5",
    "claude-haiku-4-5",
  ],
  gemini: [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-pro",
  ],
  qwen: [
    "qwen-3.8-max", 
    "qwen-3.7-flash",
    "qwen-3.7-plus",
  ],
  glm: [
    "glm-5.3",
    "glm-5.3-flash",
    "glm-5.2",
  ],
  kimi: [
    "kimi-k3",
    "kimi-k2.7-code",
    "kimi-k2.6",
  ],
  ollama: [
    "qwen3.8:27b",
    "qwen3.5:4b",
    "gemma4:4b",
  ],
  custom: [],
};
