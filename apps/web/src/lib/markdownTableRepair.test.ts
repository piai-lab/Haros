import { describe, expect, it } from "vitest";
import {
  prepareMarkdownTableDelimiters,
  repairMarkdownTableDelimiters,
} from "./markdownTableRepair";

describe("repairMarkdownTableDelimiters", () => {
  it("pads a delimiter row that has fewer cells than the header", () => {
    const source = [
      "Studio vs. normal mode:",
      "",
      "| | Normal mode (regular tasks/chats) | Studio |",
      "|---|---|",
      "| Purpose | Focused, interactive work | Long-running, agent-led work |",
    ].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(
      [
        "Studio vs. normal mode:",
        "",
        "| | Normal mode (regular tasks/chats) | Studio |",
        "| --- | --- | --- |",
        "| Purpose | Focused, interactive work | Long-running, agent-led work |",
      ].join("\n"),
    );
  });

  it("drops delimiter cells beyond the header cell count", () => {
    const source = ["| a | b |", "|:--|---|--:|", "| 1 | 2 |"].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(
      ["| a | b |", "| :-- | --- |", "| 1 | 2 |"].join("\n"),
    );
  });

  it("keeps the kept cells' alignment markers when padding", () => {
    const source = ["| a | b | c |", "|:--|--:|"].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(
      ["| a | b | c |", "| :-- | --: | --- |"].join("\n"),
    );
  });

  it("returns the input string unchanged when every table is well-formed", () => {
    const source = ["| a | b |", "| --- | --- |", "| 1 | 2 |"].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(source);
  });

  it("ignores pipe-and-dash lines inside fenced code blocks", () => {
    const source = ["```", "| a | b |", "|---|", "```"].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(source);
  });

  it("repairs a table that follows a closed fence", () => {
    const source = ["```ts", "const x = 1;", "```", "", "| a | b |", "|---|"].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(
      ["```ts", "const x = 1;", "```", "", "| a | b |", "| --- | --- |"].join("\n"),
    );
  });

  it("ignores indented code blocks", () => {
    const source = ["Example:", "", "    | a | b |", "    |---|"].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(source);
  });

  it("ignores blockquoted headers", () => {
    const source = ["> | a | b |", "|---|"].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(source);
  });

  it("does not treat a dashed body row of an ongoing table as a delimiter", () => {
    const source = ["| a | b |", "| --- | --- |", "| 1 | 2 |", "| --- |"].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(source);
  });

  it("does not pair two delimiter-shaped rows as header and delimiter", () => {
    const source = ["|---|---|", "|---|"].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(source);
  });

  it("does not count escaped pipes as cell boundaries", () => {
    const source = ["| a \\| b | c |", "|---|"].join("\n");

    expect(repairMarkdownTableDelimiters(source)).toBe(
      ["| a \\| b | c |", "| --- | --- |"].join("\n"),
    );
  });

  it("leaves text without any table candidates untouched", () => {
    const source = "plain prose - with a dash | and a pipe";

    expect(repairMarkdownTableDelimiters(source)).toBe(source);
  });

  it("projects unchanged boundaries in both directions", () => {
    const source = "plain **text**";
    const prepared = prepareMarkdownTableDelimiters(source);

    expect(prepared.rawText).toBe(source);
    expect(prepared.renderedText).toBe(source);
    for (let offset = 0; offset <= source.length; offset += 1) {
      expect(prepared.projection.toRenderedBoundary(offset)).toBe(offset);
      expect(prepared.projection.toRawBoundary(offset)).toBe(offset);
    }
    expect(prepared.projection.toRawBoundary(-1)).toBeNull();
    expect(prepared.projection.toRenderedBoundary(source.length + 1)).toBeNull();
  });

  it("projects boundaries around a repaired delimiter and rejects its synthetic interior", () => {
    const source = ["before", "| a | b | c |", "|---|---|", "| 1 | 2 | 3 |", "after"].join("\n");
    const prepared = prepareMarkdownTableDelimiters(source);
    const rawDelimiterStart = source.indexOf("|---|---|");
    const rawDelimiterEnd = rawDelimiterStart + "|---|---|".length;
    const renderedDelimiter = "| --- | --- | --- |";
    const renderedDelimiterStart = prepared.renderedText.indexOf(renderedDelimiter);
    const renderedDelimiterEnd = renderedDelimiterStart + renderedDelimiter.length;
    const rawBodyOffset = source.indexOf("| 1 | 2 | 3 |");
    const renderedBodyOffset = prepared.renderedText.indexOf("| 1 | 2 | 3 |");

    expect(prepared.projection.toRenderedBoundary(rawDelimiterStart)).toBe(renderedDelimiterStart);
    expect(prepared.projection.toRenderedBoundary(rawDelimiterEnd)).toBe(renderedDelimiterEnd);
    expect(prepared.projection.toRawBoundary(renderedDelimiterStart)).toBe(rawDelimiterStart);
    expect(prepared.projection.toRawBoundary(renderedDelimiterEnd)).toBe(rawDelimiterEnd);
    expect(prepared.projection.toRenderedBoundary(rawDelimiterStart + 1)).toBeNull();
    expect(prepared.projection.toRawBoundary(renderedDelimiterStart + 1)).toBeNull();
    expect(prepared.projection.toRenderedBoundary(rawBodyOffset)).toBe(renderedBodyOffset);
    expect(prepared.projection.toRawBoundary(renderedBodyOffset)).toBe(rawBodyOffset);
  });

  it("keeps later tables projected after multiple repairs", () => {
    const source = [
      "| a | b |",
      "|---|",
      "| 1 | 2 |",
      "",
      "| c | d | e |",
      "|---|---|",
      "| 3 | 4 | 5 |",
    ].join("\n");
    const prepared = prepareMarkdownTableDelimiters(source);
    const rawTail = source.indexOf("| 3 | 4 | 5 |");
    const renderedTail = prepared.renderedText.indexOf("| 3 | 4 | 5 |");

    expect(prepared.projection.toRenderedBoundary(rawTail)).toBe(renderedTail);
    expect(prepared.projection.toRawBoundary(renderedTail)).toBe(rawTail);
  });
});
