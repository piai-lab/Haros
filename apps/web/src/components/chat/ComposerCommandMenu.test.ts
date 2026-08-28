import { describe, expect, it } from "vitest";
import { groupCommandItems, type ComposerCommandItem } from "./ComposerCommandMenu";

describe("groupCommandItems", () => {
  it("groups mention suggestions as plugins, chats, local, then subagents", () => {
    const items: ComposerCommandItem[] = [
      {
        id: "agent:codex:mini",
        type: "agent",
        engine: "codex",
        alias: "mini",
        color: "violet",
        label: "@mini",
        description: "GPT-5.4 Mini",
      },
      {
        id: "path:file:/workspace/AGENTS.md",
        type: "path",
        path: "/workspace/AGENTS.md",
        pathKind: "file",
        label: "AGENTS.md",
        description: "/workspace",
      },
      {
        id: "plugin:github",
        type: "plugin",
        plugin: {
          id: "plugin/github",
          name: "GitHub",
          source: {
            type: "local",
            path: "/test/plugins/github",
          },
          interface: {
            displayName: "GitHub",
            shortDescription: "Triage PRs and CI",
          },
          installed: true,
          enabled: true,
          installPolicy: "AVAILABLE",
          authPolicy: "ON_USE",
        },
        mention: {
          name: "GitHub",
          path: "plugin://GitHub@codex",
        },
        label: "GitHub",
        description: "Triage PRs and CI",
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
        engine: "codex",
        mention: { name: "Release prep", path: "thread://thread-1" },
        label: "Release prep",
        description: "OmniMind",
      },
    ];

    expect(groupCommandItems(items, "mention", true)).toEqual([
      {
        id: "plugins",
        label: "Plugins",
        items: [items[2]],
      },
      {
        id: "chats",
        label: "Tasks",
        items: [items[4]],
      },
      {
        id: "local",
        label: "Local",
        items: [items[1], items[3]],
      },
      {
        id: "subagents",
        label: "Subagents",
        items: [items[0]],
      },
    ]);
  });

  it("groups slash-menu skills separately from app and engine commands", () => {
    const items: ComposerCommandItem[] = [
      {
        id: "slash:review",
        type: "slash-command",
        command: "review",
        label: "/review",
        description: "Review changes",
      },
      {
        id: "engine-command:codex:help",
        type: "engine-native-command",
        engine: "codex",
        command: "help",
        label: "/help",
        description: "Show help",
      },
      {
        id: "skill:/workspace/.codex/skills/check-code/SKILL.md",
        type: "skill",
        skill: {
          name: "check-code",
          description: "Review recent code changes",
          path: "/workspace/.codex/skills/check-code/SKILL.md",
          enabled: true,
          scope: "project",
        },
        label: "check-code",
        description: "Review recent code changes",
      },
    ];

    expect(groupCommandItems(items, "slash-command", true)).toEqual([
      {
        id: "built-in",
        label: "Built-in",
        items: [items[0]],
      },
      {
        id: "engine",
        label: "Engine",
        items: [items[1]],
      },
      {
        id: "skills",
        label: "Skills",
        items: [items[2]],
      },
    ]);
  });

  it("accepts localized group labels without changing item grouping", () => {
    const item: ComposerCommandItem = {
      id: "local-root",
      type: "local-root",
      label: "@local",
      description: "浏览本地文件",
    };
    expect(
      groupCommandItems([item], "mention", true, {
        plugins: "插件",
        tasks: "任务",
        local: "本地",
        subagents: "子 Agent",
        builtIn: "内置",
        engine: "引擎",
        skills: "技能",
      }),
    ).toEqual([{ id: "local", label: "本地", items: [item] }]);
  });
});
