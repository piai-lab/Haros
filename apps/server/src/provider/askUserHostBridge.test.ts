import { describe, expect, it } from "vitest";

import type { AskUserToolInput } from "@harnessos/om-ask";
import { projectAskUserRequest, resolveAskUserResponse } from "./askUserHostBridge.ts";

const request: AskUserToolInput = {
  questions: [
    {
      type: "choice",
      id: "single",
      prompt: "Single",
      options: [
        { value: "stable-a", label: "A" },
        { value: "stable-b", label: "B" },
      ],
    },
    {
      type: "choice",
      id: "multi",
      prompt: "Multi",
      multi: true,
      options: [
        { value: "stable-x", label: "X", preview: "Preview", recommended: true },
        { value: "stable-y", label: "Y" },
      ],
    },
    { type: "text", id: "text", prompt: "Text", suggestion: { text: "suggested" } },
  ],
};

describe("Ask User Host bridge", () => {
  it("removes Pi values from the UI request and restores them without changing user text", () => {
    const projection = projectAskUserRequest(request);
    expect(JSON.stringify(projection.request)).not.toContain("stable-a");
    expect(projection.request.questions[1]).toMatchObject({
      kind: "choice",
      cardinality: "multiple",
      options: [{ label: "X", preview: "Preview", recommended: true }, { label: "Y" }],
    });

    expect(
      resolveAskUserResponse({
        request,
        projection,
        requestId: "request-1",
        response: {
          status: "answered",
          answers: {
            single: { selectedOptionLabels: ["A"] },
            multi: {
              selectedOptionLabels: ["X", "Y"],
              customText: " custom  \n",
            },
            text: { selectedOptionLabels: [], customText: " line 1\nline 2  " },
          },
        },
      }),
    ).toEqual({
      version: 1,
      requestId: "request-1",
      status: "answered",
      answers: [
        { questionId: "single", selectedValues: ["stable-a"] },
        {
          questionId: "multi",
          selectedValues: ["stable-x", "stable-y"],
          customText: " custom  \n",
        },
        { questionId: "text", selectedValues: [], customText: " line 1\nline 2  " },
      ],
    });
  });

  it("rejects foreign labels and impossible single-choice combinations", () => {
    const projection = projectAskUserRequest(request);
    for (const answers of [
      {
        single: { selectedOptionLabels: ["foreign"] },
        multi: { selectedOptionLabels: ["X"] },
        text: { selectedOptionLabels: [], customText: "text" },
      },
      {
        single: { selectedOptionLabels: ["A"], customText: "also custom" },
        multi: { selectedOptionLabels: ["X"] },
        text: { selectedOptionLabels: [], customText: "text" },
      },
      {
        single: { selectedOptionLabels: ["A"] },
        multi: { selectedOptionLabels: [], customText: "  \n" },
        text: { selectedOptionLabels: [], customText: "text" },
      },
      {
        single: { selectedOptionLabels: ["A"] },
        multi: { selectedOptionLabels: ["X"] },
        text: { selectedOptionLabels: [], customText: "\t" },
      },
    ]) {
      expect(
        resolveAskUserResponse({
          request,
          projection,
          requestId: "request-1",
          response: { status: "answered", answers },
        }),
      ).toBeNull();
    }
  });
});
