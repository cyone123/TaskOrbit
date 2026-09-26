import { describe, expect, it } from "vitest";
import { extractReasoningAndContent } from "./reasoning";

describe("extractReasoningAndContent", () => {
  it("passes through standard content when no reasoning is present", () => {
    const res = extractReasoningAndContent("Hello world, here is the answer.");
    expect(res.reasoning).toBe("");
    expect(res.content).toBe("Hello world, here is the answer.");
    expect(res.isThinking).toBe(false);
  });

  it("handles explicit reasoning_content from API", () => {
    const res = extractReasoningAndContent(
      "Final answer",
      "I need to consider the inbox items...",
    );
    expect(res.reasoning).toBe("I need to consider the inbox items...");
    expect(res.content).toBe("Final answer");
    expect(res.isThinking).toBe(false);
  });

  it("handles explicit reasoning_content when content is still empty (streaming thinking phase)", () => {
    const res = extractReasoningAndContent("", "Still thinking...");
    expect(res.reasoning).toBe("Still thinking...");
    expect(res.content).toBe("");
    expect(res.isThinking).toBe(true);
  });

  it("extracts completed inline <think> tags from local models", () => {
    const raw = "<think>Let me evaluate the user's tasks first.</think>Here is your schedule for today.";
    const res = extractReasoningAndContent(raw);
    expect(res.reasoning).toBe("Let me evaluate the user's tasks first.");
    expect(res.content).toBe("Here is your schedule for today.");
    expect(res.isThinking).toBe(false);
  });

  it("extracts in-progress unclosed <think> tag during streaming", () => {
    const raw = "<think>Currently analyzing projects and daily plans...";
    const res = extractReasoningAndContent(raw);
    expect(res.reasoning).toBe("Currently analyzing projects and daily plans...");
    expect(res.content).toBe("");
    expect(res.isThinking).toBe(true);
  });
});
