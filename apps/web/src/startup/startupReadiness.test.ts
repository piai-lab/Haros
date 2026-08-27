import { describe, expect, it } from "vitest";

import {
  isTerminalStartupCatalogState,
  shouldInitializeDesktopStartupSplash,
  startupRouteExpectsComposer,
} from "./startupReadiness";

describe("startup readiness projection", () => {
  it.each(["/settings", "/kanban", "/pull-requests/123", "/automations", "/plugins"])(
    "does not wait for an unrelated Composer on %s",
    (pathname) => expect(startupRouteExpectsComposer(pathname)).toBe(false),
  );

  it.each(["/", "/chat", "/studio", "/thread_123"])(
    "waits for the focused Composer on %s",
    (pathname) => expect(startupRouteExpectsComposer(pathname)).toBe(true),
  );

  it("holds until the focused catalog has an authoritative terminal state", () => {
    expect(isTerminalStartupCatalogState("idle")).toBe(false);
    expect(isTerminalStartupCatalogState("checking")).toBe(false);
    for (const state of ["ready", "empty", "stale", "error"] as const) {
      expect(isTerminalStartupCatalogState(state)).toBe(true);
    }
  });

  it("keeps cinematic residency out of browser, pairing, and signed-out surfaces", () => {
    expect(shouldInitializeDesktopStartupSplash("/", false)).toBe(false);
    expect(shouldInitializeDesktopStartupSplash("/pair", true)).toBe(false);
    expect(shouldInitializeDesktopStartupSplash("/signed-out", true)).toBe(false);
    expect(shouldInitializeDesktopStartupSplash("/", true)).toBe(true);
  });
});
