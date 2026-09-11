import { describe, expect, it } from "vitest";
import { Text } from "@codemirror/state";
import { scanTables } from "./markdown-live-preview";

describe("markdown live preview table scanning", () => {
  it("detects valid GFM tables and their boundaries", () => {
    const doc = Text.of([
      "# Document",
      "",
      "| Col 1 | Col 2 |",
      "| :--- | ---: |",
      "| Val A | Val B |",
      "| Val C | Val D |",
      "",
      "Normal text paragraph",
    ]);

    const { tables, tableLines } = scanTables(doc, new Set());

    expect(tables).toHaveLength(1);
    expect(tables[0].start).toBe(3);
    expect(tables[0].end).toBe(6);
    expect(tables[0].rows).toHaveLength(4);

    expect(tableLines.has(3)).toBe(true);
    expect(tableLines.has(4)).toBe(true);
    expect(tableLines.has(5)).toBe(true);
    expect(tableLines.has(6)).toBe(true);
    expect(tableLines.has(1)).toBe(false);
    expect(tableLines.has(7)).toBe(false);
  });

  it("ignores tables inside fenced code blocks", () => {
    const doc = Text.of([
      "```markdown",
      "| Col 1 | Col 2 |",
      "| --- | --- |",
      "| Val 1 | Val 2 |",
      "```",
    ]);

    const codeBlockLines = new Set([1, 2, 3, 4, 5]);
    const { tables } = scanTables(doc, codeBlockLines);

    expect(tables).toHaveLength(0);
  });

  it("does not treat solitary pipe lines without delimiter as tables", () => {
    const doc = Text.of([
      "| Just a single pipe row |",
      "Followed by normal text",
    ]);

    const { tables } = scanTables(doc, new Set());
    expect(tables).toHaveLength(0);
  });
});
