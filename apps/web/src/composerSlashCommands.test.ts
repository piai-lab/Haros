import { describe, expect, it } from "vitest";

import {
  BUILT_IN_COMPOSER_SLASH_COMMANDS,
  filterComposerSlashCommands,
  getAvailableComposerSlashCommands,
  parseComposerSlashInvocation,
} from "./composerSlashCommands";

describe("current composer slash commands", () => {
  it("physically excludes retired execution shortcuts", () => {
    expect(BUILT_IN_COMPOSER_SLASH_COMMANDS).not.toEqual(
      expect.arrayContaining(["compact", "fast", "fork", "review", "side"]),
    );
    for (const command of ["compact", "fast", "fork", "review", "side"]) {
      expect(parseComposerSlashInvocation(`/${command}`)).toBeNull();
    }
  });

  it("keeps the bounded current app commands searchable", () => {
    expect(filterComposerSlashCommands("feed").map((definition) => definition.command)).toEqual([
      "feedback",
    ]);
    expect(
      getAvailableComposerSlashCommands({
        canOfferExportCommand: true,
      }),
    ).toEqual([
      "clear",
      "model",
      "plan",
      "default",
      "status",
      "subagents",
      "export",
      "feedback",
      "automation",
    ]);
  });
});
