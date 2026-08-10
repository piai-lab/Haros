// FILE: ChatHeader.test.ts
// Purpose: Covers chat header presentation helpers that choose thread identity chrome.
// Layer: Component unit tests
// Depends on: ChatHeader pure helpers and Vitest assertions.

import { describe, expect, it } from "vitest";

import { resolveChatHeaderThreadIconKind } from "./ChatHeader";

describe("resolveChatHeaderThreadIconKind", () => {
  it("uses the terminal icon for terminal-first threads", () => {
    expect(resolveChatHeaderThreadIconKind("terminal")).toBe("terminal");
  });

  it("never uses provider branding for ordinary Agent or Chat threads", () => {
    expect(resolveChatHeaderThreadIconKind("chat")).toBe("none");
  });
});
