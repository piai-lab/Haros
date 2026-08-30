// FILE: SettingsSidebarNav.test.tsx
// Purpose: Guards the settings sidebar search surface and its ranking index.
// Layer: Component rendering tests
// Depends on: SettingsSidebarNav, the settings search index, and React server rendering.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SettingsSidebarNav } from "./SettingsSidebarNav";
import { SettingsRow } from "./settings/SettingsPanelPrimitives";
import { EN_MESSAGES, ZH_CN_MESSAGES } from "../i18n";
import {
  APPEARANCE_SETTINGS_SEARCH,
  GENERAL_SETTINGS_SEARCH,
} from "../settingsMetadata/coreSettings";
import { PROMPTS_SETTINGS_SEARCH } from "../settingsMetadata/promptSettings";
import { ENGINES_SETTINGS_SEARCH } from "../settingsMetadata/engineSettings";
import { SETTINGS_NAV_ITEMS, SETTINGS_TARGETS } from "../settingsNavigation";
import { defineSettingsSearchRow } from "../settingsSearchMetadata";
import {
  SETTINGS_SEARCH_RECORDS,
  rankSettingsSearchEntries,
  settingsSearchEntryTarget,
} from "../settingsSearchIndex";

const translateEn = (key: keyof typeof EN_MESSAGES) => EN_MESSAGES[key];
const translateZh = (key: keyof typeof ZH_CN_MESSAGES) => ZH_CN_MESSAGES[key];

describe("rankSettingsSearchEntries", () => {
  it("returns nothing for an empty query", () => {
    expect(rankSettingsSearchEntries("", 12, translateEn)).toHaveLength(0);
    expect(rankSettingsSearchEntries("   ", 12, translateEn)).toHaveLength(0);
  });

  it("ranks an exact title match first", () => {
    const [top] = rankSettingsSearchEntries("theme", 12, translateEn);
    expect(top?.id).toBe("appearance:theme");
  });

  it("matches on description keywords, not just titles", () => {
    const results = rankSettingsSearchEntries("wrap", 12, translateEn);
    expect(results.some((entry) => entry.id === "behavior:diff-line-wrapping")).toBe(true);
  });

  it("indexes the follow-up Queue and Steer preference", () => {
    const results = rankSettingsSearchEntries("steer", 12, translateEn);
    expect(results.some((entry) => entry.id === "behavior:follow-up-behavior")).toBe(true);
  });

  it("includes the activity toasts notification row", () => {
    const results = rankSettingsSearchEntries("toasts", 12, translateEn);
    expect(results.some((entry) => entry.id === "notifications:activity-toasts")).toBe(true);
  });

  it("indexes the Studio visibility setting as Studio rather than Chat", () => {
    const entry = SETTINGS_SEARCH_RECORDS.find(
      (candidate) => candidate.id === "general:studio-section",
    );
    expect(entry).toMatchObject({ titleKey: "nav.studio", section: "general" });
    expect(rankSettingsSearchEntries("Studio", 1, translateEn)[0]?.id).toBe(
      "general:studio-section",
    );
  });

  it("localizes Model services search without losing its stable entry", () => {
    const results = rankSettingsSearchEntries("模型", SETTINGS_SEARCH_RECORDS.length, translateZh);

    expect(results).toContainEqual(
      expect.objectContaining({ id: "models:model-services", title: "模型服务" }),
    );
  });

  it("indexes the system UI font row", () => {
    expect(SETTINGS_SEARCH_RECORDS.map((entry) => entry.id)).toContain("appearance:system-ui-font");
  });

  it("surfaces every row in a section when searching the section label", () => {
    const results = rankSettingsSearchEntries(
      "appearance",
      SETTINGS_SEARCH_RECORDS.length,
      translateEn,
    );
    expect(results.some((entry) => entry.section === "appearance")).toBe(true);
  });

  it("respects the result limit", () => {
    expect(rankSettingsSearchEntries("e", 3, translateEn)).toHaveLength(3);
  });

  it("derives row targets from stable record identity rather than visible copy", () => {
    expect(APPEARANCE_SETTINGS_SEARCH.theme.target).toBe("setting-theme");
    expect(GENERAL_SETTINGS_SEARCH.defaultEngine.target).toBe("setting-general-default-engine");
    expect(
      SETTINGS_SEARCH_RECORDS.find((record) => record.id === "integrations:external-mcp")?.target,
    ).toBeNull();

    const english = rankSettingsSearchEntries("Default engine", 1, translateEn)[0]!;
    const chinese = rankSettingsSearchEntries("默认引擎", 1, translateZh)[0]!;
    expect(english.title).not.toBe(chinese.title);
    expect(settingsSearchEntryTarget(english)).toBe("setting-general-default-engine");
    expect(settingsSearchEntryTarget(chinese)).toBe(settingsSearchEntryTarget(english));

    const ids = SETTINGS_SEARCH_RECORDS.map((record) => record.id);
    expect(new Set(ids).size).toBe(ids.length);
    const exactTargets = SETTINGS_SEARCH_RECORDS.flatMap((record) =>
      record.target === null ? [] : [record.target],
    );
    expect(new Set(exactTargets).size).toBe(exactTargets.length);
    for (const record of SETTINGS_SEARCH_RECORDS) {
      expect(record.id.startsWith(`${record.section}:`)).toBe(true);
      if (record.target !== null) {
        expect(record.target.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps target identity stable when visible copy is renamed", () => {
    const before = defineSettingsSearchRow({
      id: "general:copy-rename-fixture",
      titleKey: "settings.defaultEngine",
      keywords: "fixture",
    });
    const after = defineSettingsSearchRow({
      id: "general:copy-rename-fixture",
      titleKey: "settings.newThreads",
      keywords: "renamed fixture",
    });

    expect(before.titleKey).not.toBe(after.titleKey);
    expect(before.target).toBe(after.target);
  });

  it("keeps section identity unique and every search record inside its owning section", () => {
    const sectionIds = SETTINGS_NAV_ITEMS.map((section) => section.id);
    expect(new Set(sectionIds).size).toBe(sectionIds.length);
    for (const section of SETTINGS_NAV_ITEMS) {
      for (const record of section.searchRecords) {
        expect(record.id.startsWith(`${section.id}:`)).toBe(true);
      }
    }
  });

  it("never derives a DOM anchor from visible SettingsRow copy", () => {
    const withoutOwnerIdentity = renderToStaticMarkup(
      <SettingsRow title="Renamed visible copy" description="Fixture" />,
    );
    const withOwnerIdentity = renderToStaticMarkup(
      <SettingsRow
        anchorId={GENERAL_SETTINGS_SEARCH.defaultEngine.target}
        title="Renamed visible copy"
        description="Fixture"
      />,
    );

    expect(withoutOwnerIdentity).not.toContain("setting-renamed-visible-copy");
    expect(withOwnerIdentity).toContain(`id="${GENERAL_SETTINGS_SEARCH.defaultEngine.target}"`);
  });

  it("keeps the former Installed CLIs deep link stable after the row broadens", () => {
    expect(SETTINGS_TARGETS.engineDetails).toBe("setting-installed-clis");
    expect(ENGINES_SETTINGS_SEARCH.installedClis.target).toBe("setting-installed-clis");
    expect(rankSettingsSearchEntries("independent engine models", 1, translateEn)[0]?.id).toBe(
      "engines:installed-clis",
    );
  });

  it("routes Git writing to its calling-feature setting instead of Model services", () => {
    const [entry] = rankSettingsSearchEntries("Git writing model", 1, translateEn);
    expect(entry).toMatchObject({
      id: "general:git-writing-model",
      section: "general",
      target: SETTINGS_TARGETS.gitWritingModel,
    });
    expect(SETTINGS_TARGETS.gitWritingModel).toBe("setting-git-writing-model");
  });

  it("routes prompt search results to the two product-owned editors", () => {
    expect(PROMPTS_SETTINGS_SEARCH.defaultPrompt.target).toBe(SETTINGS_TARGETS.defaultPrompt);
    expect(PROMPTS_SETTINGS_SEARCH.customRules.target).toBe(SETTINGS_TARGETS.customRules);
  });
});

describe("SettingsSidebarNav", () => {
  it("renders the soft search input alongside the section list", () => {
    const markup = renderToStaticMarkup(
      <SettingsSidebarNav activeSection="general" onBack={vi.fn()} onSelectSection={vi.fn()} />,
    );

    expect(markup).toContain('aria-label="Search settings"');
    expect(markup).toContain('aria-label="Settings sections"');
    expect(markup).toContain("Back to app");
  });

  it("groups settings by user intent instead of implementation ownership", () => {
    const markup = renderToStaticMarkup(
      <SettingsSidebarNav activeSection="general" onBack={vi.fn()} onSelectSection={vi.fn()} />,
    );

    expect(markup).toContain("Personal");
    expect(markup).toContain("Integrations");
    expect(markup).toContain("Development");
    expect(markup).toContain("System");
    expect(markup).toContain("Archived");
    expect(markup).toContain("Chat behavior");
    expect(markup).toContain("Built-in tools");
    expect(markup).toContain("External connections");
    expect(markup).toContain("Agent engines");
    expect(markup).toContain("Prompts");
    expect(markup).toContain("Managed worktrees");
    expect(markup).toContain("System tools");
    expect(markup).toContain("Archived tasks and chats");
    expect(markup).not.toContain(">App<");
    expect(markup).not.toContain(">Haros<");
  });
});
