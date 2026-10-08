/**
 * Utilities for parsing reasoning/chain-of-thought content from LLMs.
 * Supports:
 * 1. Explicit reasoning_content from OpenAI-compatible SSE streams (e.g. DeepSeek-R1, SiliconFlow).
 * 2. Inline <think>...</think> tags embedded in raw content (e.g. Ollama, local models).
 */

export interface ParsedReasoningContent {
  reasoning: string;
  content: string;
  isThinking: boolean;
}

export function extractReasoningAndContent(
  rawContent: string,
  explicitReasoning = "",
): ParsedReasoningContent {
  let reasoning = explicitReasoning;
  let content = rawContent;
  let isThinking = false;

  // Check for inline <think> tags in content
  if (content.includes("<think>")) {
    const thinkStart = content.indexOf("<think>");
    const thinkEnd = content.indexOf("</think>");

    if (thinkEnd !== -1) {
      // Completed <think>...</think>
      const innerThink = content.slice(thinkStart + 7, thinkEnd).trim();
      if (!reasoning) {
        reasoning = innerThink;
      }
      content = (content.slice(0, thinkStart) + content.slice(thinkEnd + 8)).trim();
      isThinking = false;
    } else {
      // In-progress unclosed <think> during streaming
      const innerThink = content.slice(thinkStart + 7);
      if (!reasoning) {
        reasoning = innerThink;
      }
      content = content.slice(0, thinkStart).trim();
      isThinking = true;
    }
  } else if (content.includes("</think>")) {
    // Leftover closing tag
    const thinkEnd = content.indexOf("</think>");
    content = content.slice(thinkEnd + 8).trim();
    isThinking = false;
  }

  // If there's explicit reasoning and no content yet, we are still thinking
  if (explicitReasoning && !content.trim()) {
    isThinking = true;
  }

  return { reasoning, content, isThinking };
}
