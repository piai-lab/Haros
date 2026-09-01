import { describe, expect, it } from "vitest";

import { TOOL_ACTIVITY_JSON_MAX_BYTES } from "@harnessos/contracts";

import { buildToolResultSnapshot, clipToolText } from "./toolResultSnapshot.ts";

describe("toolResultSnapshot", () => {
  it("clips UTF-8 on code point boundaries with a head and tail", () => {
    const preview = clipToolText("海".repeat(10_000));
    expect(preview.clipped).toBe(true);
    expect(preview.head).not.toContain("�");
    expect(preview.tail).not.toContain("�");
    expect(preview.originalBytes).toBe(30_000);
  });

  it("redacts input and result credentials while keeping the durable snapshot bounded", () => {
    const snapshot = buildToolResultSnapshot({
      toolCallId: "tool-1",
      toolName: "bash",
      actionKind: "execute",
      args: { command: "API_TOKEN=secret-value run" },
      result: {
        stdout: "x".repeat(80_000),
        stderr: "authorization: Bearer should-not-survive",
      },
    });
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("secret-value");
    expect(serialized).not.toContain("should-not-survive");
    expect(serialized).toContain("[REDACTED]");
    expect(Buffer.byteLength(serialized, "utf8")).toBeLessThanOrEqual(TOOL_ACTIVITY_JSON_MAX_BYTES);
  });
});
