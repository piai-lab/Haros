// FILE: Sidebar.import.test.ts
// Purpose: Smoke-test that the large Sidebar module still imports after project-run wiring.
// Layer: Web component module test
// Depends on: Vitest module mocking and Sidebar's transitive imports.

import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

vi.mock("./terminal/terminalRuntimeRegistry", () => ({
  terminalRuntimeRegistry: {
    disposeTerminal: vi.fn(),
  },
}));

describe("Sidebar module", () => {
  it("loads after project-run wiring", async () => {
    vi.stubGlobal("self", globalThis);
    const module = await import("./Sidebar");

    expect(module.default).toBeTypeOf("function");
    // Full-suite runs transform many web files concurrently; this import can cross Vitest's 5s default.
  }, 15_000);

  it("uses the same section-label tone for Projects and Groups", () => {
    const source = readFileSync(new URL("./Sidebar.tsx", import.meta.url), "utf8");
    const groupsHeader = source.match(
      /aria-expanded=\{groupsSectionExpanded\}[\s\S]*?onClick=\{\(\) => setGroupsSectionExpanded/,
    )?.[0];

    expect(groupsHeader).toContain("SIDEBAR_SECTION_LABEL_CLASS_NAME");
    expect(groupsHeader).not.toContain("SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME");
  });
});
