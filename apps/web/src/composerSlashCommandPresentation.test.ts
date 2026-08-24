import { BUILT_IN_COMPOSER_SLASH_COMMANDS } from "@omnimind/shared/composerSlashCommands";
import { describe, expect, it } from "vitest";

import {
  BUILT_IN_COMPOSER_SLASH_COMMAND_PRESENTATION,
  builtInComposerSlashCommandIcon,
  filterBuiltInComposerSlashCommands,
  resolveBuiltInComposerSlashCommandPresentation,
} from "./composerSlashCommandPresentation";
import { translate } from "./i18n";
import { BugIcon, DownloadIcon } from "./lib/icons";

describe("built-in composer slash command presentation", () => {
  it("covers every canonical built-in with readable English and Chinese presentation", () => {
    expect(Object.keys(BUILT_IN_COMPOSER_SLASH_COMMAND_PRESENTATION)).toEqual([
      ...BUILT_IN_COMPOSER_SLASH_COMMANDS,
    ]);

    for (const command of BUILT_IN_COMPOSER_SLASH_COMMANDS) {
      for (const locale of ["en", "zh-CN"] as const) {
        const presentation = resolveBuiltInComposerSlashCommandPresentation(command, (key) =>
          translate(locale, key),
        );
        expect(presentation.title.trim(), `${locale} /${command} title`).not.toBe("");
        expect(presentation.description.trim(), `${locale} /${command} description`).not.toBe("");
        expect(presentation.icon, `/${command} icon`).toBeTypeOf("function");
      }
    }
  });

  it("owns the formerly missing debug and export glyphs", () => {
    expect(builtInComposerSlashCommandIcon("debug")).toBe(BugIcon);
    expect(builtInComposerSlashCommandIcon("export")).toBe(DownloadIcon);
  });

  it("keeps canonical command matches ahead of localized presentation matches", () => {
    const t = (key: Parameters<typeof translate>[1]) => translate("en", key);
    expect(filterBuiltInComposerSlashCommands("rev", BUILT_IN_COMPOSER_SLASH_COMMANDS, t)).toEqual([
      "review",
    ]);
    expect(filterBuiltInComposerSlashCommands("fast", BUILT_IN_COMPOSER_SLASH_COMMANDS, t)).toEqual(
      ["fast"],
    );
    expect(filterBuiltInComposerSlashCommands("auto", BUILT_IN_COMPOSER_SLASH_COMMANDS, t)).toEqual(
      ["automation"],
    );
    expect(filterBuiltInComposerSlashCommands("feed", BUILT_IN_COMPOSER_SLASH_COMMANDS, t)).toEqual(
      ["feedback"],
    );
    expect(
      filterBuiltInComposerSlashCommands("debug", BUILT_IN_COMPOSER_SLASH_COMMANDS, t),
    ).toEqual(["debug"]);
    expect(
      filterBuiltInComposerSlashCommands("/debug", BUILT_IN_COMPOSER_SLASH_COMMANDS, t),
    ).toEqual(["debug"]);
    expect(filterBuiltInComposerSlashCommands("mode", ["fast", "default", "model"], t)).toEqual([
      "model",
      "fast",
      "default",
    ]);
    expect(filterBuiltInComposerSlashCommands("", ["goal", "debug"], t)).toEqual([
      "goal",
      "debug",
    ]);
  });

  it("searches the currently resolved Chinese title and description", () => {
    const t = (key: Parameters<typeof translate>[1]) => translate("zh-CN", key);
    for (const query of ["调试", "证据优先"]) {
      expect(
        filterBuiltInComposerSlashCommands(query, BUILT_IN_COMPOSER_SLASH_COMMANDS, t),
      ).toEqual(["debug"]);
    }
    for (const query of ["目标", "持久目标"]) {
      expect(
        filterBuiltInComposerSlashCommands(query, BUILT_IN_COMPOSER_SLASH_COMMANDS, t),
      ).toEqual(["goal"]);
    }
  });
});
