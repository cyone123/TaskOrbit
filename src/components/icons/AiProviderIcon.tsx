import type { CSSProperties, FC, ReactElement } from "react";
import type { AiProtocolType } from "@task-orbit/core";
import type { IconType } from "@lobehub/icons";

// Directly import lightweight official SVG vector components from @lobehub/icons
// to guarantee tree-shaking and avoid unnecessary UI/avatar heavy dependencies.
import DeepSeekColor from "@lobehub/icons/es/DeepSeek/components/Color";
import DeepSeekMono from "@lobehub/icons/es/DeepSeek/components/Mono";
import SiliconCloudColor from "@lobehub/icons/es/SiliconCloud/components/Color";
import SiliconCloudMono from "@lobehub/icons/es/SiliconCloud/components/Mono";
import OpenAIComponent from "@lobehub/icons/es/OpenAI/components/Mono";
import ClaudeColor from "@lobehub/icons/es/Claude/components/Color";
import ClaudeMono from "@lobehub/icons/es/Claude/components/Mono";
import GeminiColor from "@lobehub/icons/es/Gemini/components/Color";
import GeminiMono from "@lobehub/icons/es/Gemini/components/Mono";
import ZhipuColor from "@lobehub/icons/es/Zhipu/components/Color";
import ZhipuMono from "@lobehub/icons/es/Zhipu/components/Mono";
import KimiColor from "@lobehub/icons/es/Kimi/components/Color";
import KimiMono from "@lobehub/icons/es/Kimi/components/Mono";
import OllamaComponent from "@lobehub/icons/es/Ollama/components/Mono";

// Additional recognized AI provider icons
import QwenColor from "@lobehub/icons/es/Qwen/components/Color";
import QwenMono from "@lobehub/icons/es/Qwen/components/Mono";
import MinimaxColor from "@lobehub/icons/es/Minimax/components/Color";
import MinimaxMono from "@lobehub/icons/es/Minimax/components/Mono";
import BaichuanColor from "@lobehub/icons/es/Baichuan/components/Color";
import BaichuanMono from "@lobehub/icons/es/Baichuan/components/Mono";
import StepfunComponent from "@lobehub/icons/es/Stepfun/components/Mono";
import GroqComponent from "@lobehub/icons/es/Groq/components/Mono";
import MistralColor from "@lobehub/icons/es/Mistral/components/Color";
import MistralMono from "@lobehub/icons/es/Mistral/components/Mono";
import OpenRouterColor from "@lobehub/icons/es/OpenRouter/components/Color";
import OpenRouterMono from "@lobehub/icons/es/OpenRouter/components/Mono";
import PerplexityColor from "@lobehub/icons/es/Perplexity/components/Color";
import PerplexityMono from "@lobehub/icons/es/Perplexity/components/Mono";

export interface AiProviderIconProps {
  provider: string;
  name?: string;
  protocol?: AiProtocolType;
  size?: number;
  type?: "color" | "mono";
  className?: string;
  style?: CSSProperties;
  slot?: string;
}

export type ProviderBrandKey =
  | "deepseek"
  | "siliconcloud"
  | "openai"
  | "anthropic"
  | "gemini"
  | "zhipu"
  | "kimi"
  | "ollama"
  | "qwen"
  | "minimax"
  | "baichuan"
  | "stepfun"
  | "groq"
  | "mistral"
  | "openrouter"
  | "perplexity"
  | "custom";

export function getProviderIconKey(
  provider: string,
  name?: string,
  protocol?: AiProtocolType,
): ProviderBrandKey {
  const p = (provider || "").toLowerCase();
  const n = (name || "").toLowerCase();
  const combined = `${p} ${n}`;

  if (p === "deepseek" || combined.includes("deepseek")) return "deepseek";
  if (
    p === "siliconflow" ||
    p === "siliconcloud" ||
    combined.includes("siliconflow") ||
    combined.includes("siliconcloud") ||
    combined.includes("硅基")
  ) {
    return "siliconcloud";
  }
  if (p === "openai" || combined.includes("openai") || combined.includes("chatgpt")) {
    return "openai";
  }
  if (
    p === "anthropic" ||
    p === "claude" ||
    combined.includes("anthropic") ||
    combined.includes("claude") ||
    protocol === "anthropic"
  ) {
    return "anthropic";
  }
  if (
    p === "gemini" ||
    p === "google" ||
    combined.includes("gemini") ||
    combined.includes("google") ||
    protocol === "gemini"
  ) {
    return "gemini";
  }
  if (
    p === "glm" ||
    p === "zhipu" ||
    combined.includes("glm") ||
    combined.includes("智谱") ||
    combined.includes("zhipu")
  ) {
    return "zhipu";
  }
  if (
    p === "kimi" ||
    p === "moonshot" ||
    combined.includes("kimi") ||
    combined.includes("moonshot") ||
    combined.includes("月之暗面")
  ) {
    return "kimi";
  }
  if (p === "ollama" || combined.includes("ollama")) return "ollama";
  if (p === "qwen" || combined.includes("qwen") || combined.includes("通义") || combined.includes("千问")) {
    return "qwen";
  }
  if (p === "minimax" || combined.includes("minimax")) return "minimax";
  if (p === "baichuan" || combined.includes("baichuan") || combined.includes("百川")) return "baichuan";
  if (p === "stepfun" || combined.includes("stepfun") || combined.includes("阶跃")) return "stepfun";
  if (p === "groq" || combined.includes("groq")) return "groq";
  if (p === "mistral" || combined.includes("mistral")) return "mistral";
  if (p === "openrouter" || combined.includes("openrouter")) return "openrouter";
  if (p === "perplexity" || combined.includes("perplexity")) return "perplexity";

  return "custom";
}

interface ProviderIconPair {
  color?: IconType | FC<any>;
  mono: IconType | FC<any>;
}

const PROVIDER_ICONS: Record<Exclude<ProviderBrandKey, "custom">, ProviderIconPair> = {
  deepseek: { color: DeepSeekColor, mono: DeepSeekMono },
  siliconcloud: { color: SiliconCloudColor, mono: SiliconCloudMono },
  openai: { mono: OpenAIComponent },
  anthropic: { color: ClaudeColor, mono: ClaudeMono },
  gemini: { color: GeminiColor, mono: GeminiMono },
  zhipu: { color: ZhipuColor, mono: ZhipuMono },
  kimi: { color: KimiColor, mono: KimiMono },
  ollama: { mono: OllamaComponent },
  qwen: { color: QwenColor, mono: QwenMono },
  minimax: { color: MinimaxColor, mono: MinimaxMono },
  baichuan: { color: BaichuanColor, mono: BaichuanMono },
  stepfun: { mono: StepfunComponent },
  groq: { mono: GroqComponent },
  mistral: { color: MistralColor, mono: MistralMono },
  openrouter: { color: OpenRouterColor, mono: OpenRouterMono },
  perplexity: { color: PerplexityColor, mono: PerplexityMono },
};

/**
 * Standard AI provider and model vector icon component powered by official @lobehub/icons.
 * Supports official brand color palette and monochrome mode with automatic currentColor adaptation.
 */
export function AiProviderIcon({
  provider,
  name,
  protocol,
  size = 20,
  type = "color",
  className = "",
  style,
  slot,
}: AiProviderIconProps) {
  const iconKey = getProviderIconKey(provider, name, protocol);

  const containerStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    flexShrink: 0,
    lineHeight: 1,
    verticalAlign: "middle",
    ...style,
  };

  let iconElement: ReactElement;

  if (iconKey === "custom") {
    iconElement = (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2a2 2 0 012 2c0 .74-.4 1.38-1 1.72V7h4a3 3 0 013 3v2.1A3 3 0 0122 15a3 3 0 01-2 2.82V19a3 3 0 01-3 3H7a3 3 0 01-3-3v-1.18A3 3 0 012 15a3 3 0 012-2.9V10a3 3 0 013-3h4V5.72c-.6-.34-1-.98-1-1.72a2 2 0 012-2zm-5 7a1 1 0 00-1 1v9a1 1 0 001 1h10a1 1 0 001-1v-9a1 1 0 00-1-1H7zm1.5 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm7 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-5 4h3a.75.75 0 010 1.5h-3a.75.75 0 010-1.5z" />
      </svg>
    );
  } else {
    const pair = PROVIDER_ICONS[iconKey];
    const Component = type === "color" && pair.color ? pair.color : pair.mono;
    iconElement = <Component size={size} />;
  }

  return (
    <span className={className} style={containerStyle} slot={slot} aria-hidden="true">
      {iconElement}
    </span>
  );
}
