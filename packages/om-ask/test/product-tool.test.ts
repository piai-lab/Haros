import { describe, expect, it, vi } from "vitest";

import {
  ASK_USER_MAX_NODES,
  ASK_USER_RESERVED_CUSTOM_VALUE,
  AskUserProductValidationError,
  buildAskUserTool,
  validateAskUserResult,
  validateAskUserToolInput,
  type AskUserToolInput,
} from "../src/api.js";

const request: AskUserToolInput = {
  questions: [
    {
      type: "choice",
      id: "scope",
      prompt: "Choose scope",
      multi: true,
      options: [
        { value: "a", label: "A", recommended: true, recommendationReason: "Best fit" },
        { value: "b", label: "B", preview: "B preview" },
      ],
    },
    { type: "text", id: "detail", prompt: "Details", suggestion: { text: "  suggested  " } },
  ],
};

describe("product Ask User tool", () => {
  it("publishes an unbounded product schema, barrier semantics, and deterministic structured result", async () => {
    const interaction = {
      present: vi.fn(async () => ({
        version: 1 as const,
        requestId: "request-1",
        status: "answered" as const,
        answers: [
          { questionId: "scope", selectedValues: ["a", "b"], customText: " 自定义  \n" },
          { questionId: "detail", selectedValues: [], customText: "  text\n  " },
        ],
      })),
    };
    const tool = buildAskUserTool({ defineTool: (definition) => definition, interaction });

    expect(tool.name).toBe("ask_user");
    expect(tool.executionMode).toBe("barrier");
    expect(tool.description).toContain("before answering, recommending, planning, or acting");
    expect(tool.promptSnippet).toContain("before answering or acting");
    expect(tool.promptGuidelines.join("\n")).toContain(
      "response, recommendation, plan, acceptance criteria, or next action",
    );
    expect(tool.promptGuidelines.join("\n")).toContain(
      "replace this tool with a prose option list",
    );
    expect(tool.promptGuidelines.join("\n")).toContain("instead of sending a prose preamble first");
    expect(JSON.stringify(tool.parameters)).not.toContain("maxItems");
    expect(JSON.stringify(tool.parameters)).not.toContain(ASK_USER_RESERVED_CUSTOM_VALUE);
    const result = await tool.execute("call-1", request);
    expect(result.terminate).toBe(false);
    expect(result.details.answers?.[0]).toEqual({
      questionId: "scope",
      selectedValues: ["a", "b"],
      customText: " 自定义  \n",
    });
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify(result.details) }]);
  });

  it.each(["cancelled", "aborted", "timed_out", "unavailable", "stale"] as const)(
    "terminates on %s without an answer payload",
    async (status) => {
      const tool = buildAskUserTool({
        defineTool: (definition) => definition,
        interaction: {
          present: async () => ({ version: 1, requestId: "request-1", status }),
        },
      });
      await expect(tool.execute("call-1", request)).resolves.toMatchObject({
        details: { status },
        terminate: true,
      });
    },
  );

  it("rejects duplicate identity, reserved sentinel, invalid results, and oversized node graphs", () => {
    expect(() =>
      validateAskUserToolInput({
        questions: [
          {
            type: "choice",
            id: "q",
            prompt: "Q",
            options: [
              { value: "one", label: "Same" },
              { value: "two", label: "Same" },
            ],
          },
        ],
      }),
    ).toThrow(AskUserProductValidationError);
    expect(() =>
      validateAskUserToolInput({
        questions: [
          {
            type: "choice",
            id: "q",
            prompt: "Q",
            options: [{ value: ASK_USER_RESERVED_CUSTOM_VALUE, label: "Custom" }],
          },
        ],
      }),
    ).toThrow(/reserved/u);
    expect(() =>
      validateAskUserResult(request, {
        version: 1,
        requestId: "request-1",
        status: "cancelled",
        answers: [],
      }),
    ).toThrow(/cannot carry answers/u);
    expect(() =>
      validateAskUserToolInput({
        questions: [
          {
            type: "choice",
            id: "huge",
            prompt: "Huge",
            options: Array.from({ length: ASK_USER_MAX_NODES }, (_, index) => ({
              value: `v${index}`,
              label: `L${index}`,
            })),
          },
        ],
      }),
    ).toThrow(/10,000-node/u);
  });
});
