import { describe, expect, it } from "vitest";
import { groupCommandItems, type ComposerCommandItem } from "./ComposerCommandMenu";

describe("groupCommandItems", () => {
  it("groups source-neutral mention suggestions as chats then local paths", () => {
    const items: ComposerCommandItem[] = [
      {
        id: "path:file:/workspace/AGENTS.md",
        type: "path",
        path: "/workspace/AGENTS.md",
        pathKind: "file",
        label: "AGENTS.md",
        description: "/workspace",
      },
      {
        id: "local-root",
        type: "local-root",
        label: "@local",
        description: "Browse folders on this computer",
      },
      {
        id: "thread:thread-1",
        type: "thread",
        threadId: "thread-1",
        provider: "historical-source",
        mention: { name: "Release prep", path: "thread://thread-1" },
        label: "Release prep",
        description: "OmniMind",
      },
    ];

    expect(groupCommandItems(items, "mention", true)).toEqual([
      { id: "chats", label: "Chats", items: [items[2]] },
      { id: "local", label: "Local", items: [items[0], items[1]] },
    ]);
  });

  it("groups app-owned slash commands without a provider section", () => {
    const items: ComposerCommandItem[] = [
      {
        id: "slash:export",
        type: "slash-command",
        command: "export",
        label: "/export",
        description: "Export conversation",
        source: "app",
      },
    ];

    expect(groupCommandItems(items, "slash-command", true)).toEqual([
      { id: "built-in", label: "Built-in", items },
    ]);
  });
});
