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
      /aria-expanded=\{groupsSectionExpanded\}[\s\S]*?onClick=\{\(\)\s*=>\s*setGroupsSectionExpanded/,
    )?.[0];

    expect(groupsHeader).toContain("SIDEBAR_SECTION_LABEL_CLASS_NAME");
    expect(groupsHeader).not.toContain("SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME");
  });

  it("separates Projects and Groups with rhythm instead of a redundant divider", () => {
    const source = readFileSync(new URL("./Sidebar.tsx", import.meta.url), "utf8");
    const groupsSection = source.match(
      /<div className="mt-3" data-slot="sidebar-groups-section">[\s\S]*?aria-expanded=\{groupsSectionExpanded\}/,
    )?.[0];

    expect(groupsSection).toBeDefined();
    expect(groupsSection).not.toContain("border-t");
    expect(groupsSection).not.toContain("pt-2");
  });

  it("renders Pinned through the shared list-section header geometry", () => {
    const source = readFileSync(new URL("./Sidebar.tsx", import.meta.url), "utf8");
    const pinnedSection = source.match(
      /function renderPinnedThreadsSection\(\)[\s\S]*?function renderThreadHoverCardPopup/,
    )?.[0];

    expect(pinnedSection).toContain('renderListSectionHeader(t("nav.pinned"))');
  });

  it("keeps thread timestamps on the global timestamp typography role", () => {
    const source = readFileSync(new URL("./Sidebar.tsx", import.meta.url), "utf8");
    const statusSlot = source.match(
      /function threadRowStatusSlotClassName[\s\S]*?function resolveWorktreeBadgeLabel/,
    )?.[0];

    expect(statusSlot).toContain("--app-font-size-ui-timestamp");
    expect(statusSlot).not.toContain("calc(var(--app-font-size-ui-meta");
  });

  it("does not repeat Chat as a list heading inside the Chat surface", () => {
    const source = readFileSync(new URL("./Sidebar.tsx", import.meta.url), "utf8");
    const chatListStart = source.indexOf('data-slot="sidebar-chat-list"');
    const chatListEnd = source.indexOf(") : activityViewEnabled ? (", chatListStart);
    const chatList = source.slice(chatListStart, chatListEnd);

    expect(chatListStart).toBeGreaterThan(-1);
    expect(chatListEnd).toBeGreaterThan(chatListStart);
    expect(source).not.toMatch(/renderListSectionHeader\(\s*t\("nav\.chat"\)/);
    expect(chatList).not.toContain('label={t("nav.newChat")}');
    expect(chatList).toMatch(/<SidebarMenu\s+ref=\{attachProjectListAutoAnimateRef\}/);
  });
});
