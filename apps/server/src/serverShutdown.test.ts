import { describe, expect, it } from "vitest";

import { parseDesktopShutdownRequestBody } from "./serverShutdown";

describe("parseDesktopShutdownRequestBody", () => {
  it("preserves the existing empty shutdown request", () => {
    expect(parseDesktopShutdownRequestBody(undefined)).toEqual({});
    expect(parseDesktopShutdownRequestBody({})).toEqual({});
  });

  it("accepts only a bounded private resume intent", () => {
    expect(
      parseDesktopShutdownRequestBody({
        resumeIntent: { threadIds: ["thread-a", "thread-b"], continuationPrompt: "continue" },
      }),
    ).toEqual({
      resumeIntent: { threadIds: ["thread-a", "thread-b"], continuationPrompt: "continue" },
    });
    expect(
      parseDesktopShutdownRequestBody({
        resumeIntent: { threadIds: ["thread-a"], continuationPrompt: "x".repeat(2_001) },
      }),
    ).toBeNull();
    expect(
      parseDesktopShutdownRequestBody({
        resumeIntent: {
          threadIds: Array.from({ length: 257 }, (_, index) => `thread-${index}`),
          continuationPrompt: "continue",
        },
      }),
    ).toBeNull();
  });

  it("rejects unknown fields and malformed values", () => {
    expect(parseDesktopShutdownRequestBody({ surprise: true })).toBeNull();
    expect(
      parseDesktopShutdownRequestBody({
        resumeIntent: { threadIds: [], continuationPrompt: "continue" },
      }),
    ).toBeNull();
    expect(
      parseDesktopShutdownRequestBody({
        resumeIntent: { threadIds: [""], continuationPrompt: "continue" },
      }),
    ).toBeNull();
  });
});
