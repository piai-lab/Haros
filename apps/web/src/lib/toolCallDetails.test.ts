import { describe, expect, it } from "vitest";

import { deriveToolInvocationPreview, deriveWorkLogToolDetails } from "./toolCallDetails";

describe("inspectable tool details", () => {
  const payload = {
    data: {
      rawInput: {
        query: "AI agent memory frameworks",
        engine: "auto",
        hiddenTransportField: "not product input",
      },
      rawOutput: {
        content: "Search completed with three sources.",
      },
    },
  };

  it("keeps bundled Web Access input and output behind the details disclosure", () => {
    expect(
      deriveWorkLogToolDetails({
        payload,
        itemType: "web_search",
        label: "Web_search",
        toolTitle: "Web search",
        toolName: "web_search",
      }),
    ).toEqual({
      kind: "tool",
      title: "Web search",
      toolName: "web_search",
      input: JSON.stringify({ query: "AI agent memory frameworks", engine: "auto" }, null, 2),
      output: { output: "Search completed with three sources." },
    });
  });

  it("uses the safe invocation field as the compact row preview", () => {
    expect(deriveToolInvocationPreview({ payload, toolName: "Web_search" })).toBe(
      "AI agent memory frameworks",
    );
  });

  it("does not expose arbitrary unknown-tool inputs", () => {
    expect(deriveToolInvocationPreview({ payload, toolName: "foreign_tool" })).toBeNull();
  });
});
