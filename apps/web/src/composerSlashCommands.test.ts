import { THREAD_GOAL_MAX_CHARS } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  buildReviewPrompt,
  buildSubagentsPrompt,
  canOfferForkSlashCommand,
  canOfferReviewSlashCommand,
  canOfferSideSlashCommand,
  getAvailableComposerSlashCommands,
  hasProviderNativeSlashCommand,
  isBuiltInComposerSlashCommand,
  parseComposerSlashInvocation,
  parseComposerSlashInvocationForCommands,
  parseFastSlashCommandAction,
  parseForkSlashCommandArgs,
  parseGoalSlashCommandArgs,
  parseSideSlashCommandArgs,
  providerSupportsTextNativeReviewCommand,
  shouldHideProviderNativeCommandFromComposerMenu,
} from "./composerSlashCommands";

describe("composerSlashCommands", () => {
  it("recognizes built-in slash commands", () => {
    expect(isBuiltInComposerSlashCommand("review")).toBe(true);
    expect(isBuiltInComposerSlashCommand("fast")).toBe(true);
    expect(isBuiltInComposerSlashCommand("automation")).toBe(true);
    expect(isBuiltInComposerSlashCommand("export")).toBe(true);
    expect(isBuiltInComposerSlashCommand("feedback")).toBe(true);
    expect(isBuiltInComposerSlashCommand("debug")).toBe(true);
    expect(isBuiltInComposerSlashCommand("goal")).toBe(true);
    expect(isBuiltInComposerSlashCommand("unknown")).toBe(false);
  });

  it("parses slash invocations with optional arguments", () => {
    expect(parseComposerSlashInvocation("/review current diff")).toEqual({
      command: "review",
      args: "current diff",
    });
    expect(parseComposerSlashInvocation("/fast")).toEqual({
      command: "fast",
      args: "",
    });
    expect(parseComposerSlashInvocation("/side is this safe?")).toEqual({
      command: "side",
      args: "is this safe?",
    });
    expect(parseComposerSlashInvocation("/automation every 6h check the page")).toEqual({
      command: "automation",
      args: "every 6h check the page",
    });
    expect(parseComposerSlashInvocation("/feedback")).toEqual({
      command: "feedback",
      args: "",
    });
    expect(parseComposerSlashInvocation("/debug")).toEqual({
      command: "debug",
      args: "",
    });
    expect(parseComposerSlashInvocation("/goal first line\nsecond line")).toEqual({
      command: "goal",
      args: "first line\nsecond line",
    });
    expect(parseComposerSlashInvocation("review")).toBeNull();
  });

  it("does not parse app slash commands that are shadowed by engine-native commands", () => {
    expect(parseComposerSlashInvocationForCommands("/fast", ["clear", "model"])).toBeNull();
    expect(parseComposerSlashInvocationForCommands("/clear", ["clear", "model"])).toEqual({
      command: "clear",
      args: "",
    });
  });

  it("parses /fast actions", () => {
    expect(parseFastSlashCommandAction("/fast")).toBe("toggle");
    expect(parseFastSlashCommandAction("/fast on")).toBe("on");
    expect(parseFastSlashCommandAction("/fast off")).toBe("off");
    expect(parseFastSlashCommandAction("/fast status")).toBe("status");
    expect(parseFastSlashCommandAction("/fast maybe")).toBe("invalid");
    expect(parseFastSlashCommandAction("/review")).toBeNull();
  });

  it("parses /fork target shorthand only", () => {
    expect(parseForkSlashCommandArgs("")).toEqual({
      target: null,
      invalid: false,
    });
    expect(parseForkSlashCommandArgs("local")).toEqual({
      target: "local",
      invalid: false,
    });
    expect(parseForkSlashCommandArgs("  worktree  ")).toEqual({
      target: "worktree",
      invalid: false,
    });
    expect(parseForkSlashCommandArgs("follow up on the bug")).toEqual({
      target: null,
      invalid: true,
    });
    expect(parseForkSlashCommandArgs("local continue here")).toEqual({
      target: null,
      invalid: true,
    });
  });

  it("parses /goal controls, set, and length-limit actions", () => {
    expect(parseGoalSlashCommandArgs("")).toEqual({ action: "show" });
    expect(parseGoalSlashCommandArgs("  CLEAR  ")).toEqual({ action: "clear" });
    expect(parseGoalSlashCommandArgs("pause")).toEqual({ action: "pause" });
    expect(parseGoalSlashCommandArgs("RESUME")).toEqual({ action: "resume" });
    expect(parseGoalSlashCommandArgs(" edit ")).toEqual({ action: "edit" });
    expect(parseGoalSlashCommandArgs("Ship the release safely")).toEqual({
      action: "set",
      goal: "Ship the release safely",
    });
    expect(parseGoalSlashCommandArgs("x".repeat(THREAD_GOAL_MAX_CHARS + 1))).toEqual({
      action: "too-long",
    });
  });

  it("only offers /fork for an otherwise empty default composer", () => {
    expect(
      canOfferForkSlashCommand({
        prompt: "",
        imageCount: 0,
        terminalContextCount: 0,
        selectedSkillCount: 0,
        selectedMentionCount: 0,
        interactionMode: "default",
      }),
    ).toBe(true);

    expect(
      canOfferForkSlashCommand({
        prompt: "hello",
        imageCount: 0,
        terminalContextCount: 0,
        selectedSkillCount: 0,
        selectedMentionCount: 0,
        interactionMode: "default",
      }),
    ).toBe(false);

    expect(
      canOfferForkSlashCommand({
        prompt: "",
        imageCount: 0,
        terminalContextCount: 0,
        selectedSkillCount: 0,
        selectedMentionCount: 0,
        interactionMode: "plan",
      }),
    ).toBe(false);
  });

  it("parses an optional leading engine token in /side args", () => {
    const context = {
      currentProvider: "claude",
      availableTargetProviders: ["codex", "cursor"],
    } as const;
    expect(parseSideSlashCommandArgs("codex is this safe?", context)).toEqual({
      targetProvider: "codex",
      prompt: "is this safe?",
      unavailableProvider: null,
    });
    expect(parseSideSlashCommandArgs("Codex", context)).toEqual({
      targetProvider: "codex",
      prompt: "",
      unavailableProvider: null,
    });
    expect(parseSideSlashCommandArgs("claude compare this", context)).toEqual({
      targetProvider: null,
      prompt: "compare this",
      unavailableProvider: null,
    });
    expect(parseSideSlashCommandArgs("is this safe?", context)).toEqual({
      targetProvider: null,
      prompt: "is this safe?",
      unavailableProvider: null,
    });
    expect(parseSideSlashCommandArgs("", context)).toEqual({
      targetProvider: null,
      prompt: "",
      unavailableProvider: null,
    });
    expect(parseSideSlashCommandArgs("grok compare this", context)).toEqual({
      targetProvider: null,
      prompt: "compare this",
      unavailableProvider: "grok",
    });
  });

  it("only offers /side for a main-thread empty default composer", () => {
    expect(
      canOfferSideSlashCommand({
        prompt: "",
        imageCount: 0,
        terminalContextCount: 0,
        selectedSkillCount: 0,
        selectedMentionCount: 0,
        interactionMode: "default",
        isSidechat: false,
      }),
    ).toBe(true);

    expect(
      canOfferSideSlashCommand({
        prompt: "",
        imageCount: 0,
        terminalContextCount: 0,
        selectedSkillCount: 0,
        selectedMentionCount: 0,
        interactionMode: "default",
        isSidechat: true,
      }),
    ).toBe(false);
  });

  it("only offers /review for an otherwise empty composer", () => {
    expect(
      canOfferReviewSlashCommand({
        prompt: "",
        imageCount: 0,
        terminalContextCount: 0,
        selectedSkillCount: 0,
        selectedMentionCount: 0,
      }),
    ).toBe(true);

    expect(
      canOfferReviewSlashCommand({
        prompt: "",
        imageCount: 1,
        terminalContextCount: 0,
        selectedSkillCount: 0,
        selectedMentionCount: 0,
      }),
    ).toBe(false);
  });

  it("builds slash-command canned prompts", () => {
    expect(buildSubagentsPrompt("")).toContain("Run subagents");
    expect(buildSubagentsPrompt("Already there")).toContain("Already there\n\nRun subagents");
    expect(buildReviewPrompt({ target: "changes" })).toContain("uncommitted changes");
    expect(buildReviewPrompt({ target: "base-branch" })).toContain("base branch");
  });

  it("filters app slash commands when a engine exposes the same command natively", () => {
    const availableCommands = getAvailableComposerSlashCommands({
      engine: "codex",
      supportsFastSlashCommand: true,
      canOfferCompactCommand: true,
      canOfferReviewCommand: true,
      canOfferForkCommand: true,
      canOfferSideCommand: true,
      canOfferExportCommand: true,
      providerNativeCommandNames: ["fast", "/model", "status"],
    });

    expect(availableCommands).not.toContain("fast");
    expect(availableCommands).not.toContain("model");
    expect(availableCommands).not.toContain("status");
    expect(hasProviderNativeSlashCommand("codex", ["/fast", "model"], "fast")).toBe(true);
    expect(hasProviderNativeSlashCommand("codex", ["/fast", "model"], "/model")).toBe(true);
  });

  it("keeps app-level /review available for codex even when native review exists", () => {
    const availableCommands = getAvailableComposerSlashCommands({
      engine: "codex",
      supportsFastSlashCommand: true,
      canOfferCompactCommand: true,
      canOfferReviewCommand: true,
      canOfferForkCommand: true,
      canOfferSideCommand: true,
      canOfferExportCommand: true,
      providerNativeCommandNames: ["review"],
    });

    expect(availableCommands).toContain("review");
    expect(shouldHideProviderNativeCommandFromComposerMenu("codex", "review")).toBe(true);
    expect(shouldHideProviderNativeCommandFromComposerMenu("codex", "status")).toBe(false);
  });

  it("does not surface engine-native remote entry points in V1", () => {
    expect(shouldHideProviderNativeCommandFromComposerMenu("claude", "remote-control")).toBe(true);
    expect(shouldHideProviderNativeCommandFromComposerMenu("claude", "mobile")).toBe(true);
  });

  // #218: OpenCode lists native /review but does not honor bare `/review` text turns.
  it("keeps app-level /review for opencode and does not treat review as text-native", () => {
    const availableCommands = getAvailableComposerSlashCommands({
      engine: "opencode",
      supportsFastSlashCommand: false,
      canOfferCompactCommand: true,
      canOfferReviewCommand: true,
      canOfferForkCommand: true,
      canOfferSideCommand: true,
      canOfferExportCommand: true,
      providerNativeCommandNames: ["review", "status"],
    });

    expect(availableCommands).toContain("review");
    expect(shouldHideProviderNativeCommandFromComposerMenu("opencode", "review")).toBe(true);
    expect(providerSupportsTextNativeReviewCommand("opencode", ["review", "status"])).toBe(false);
    expect(providerSupportsTextNativeReviewCommand("opencode", [{ name: "review" }])).toBe(false);
    // Other engines with a native review still use text pass-through.
    expect(providerSupportsTextNativeReviewCommand("claude", ["review"])).toBe(true);
  });

  it("keeps app-level /automation available even if a engine exposes a native collision", () => {
    const availableCommands = getAvailableComposerSlashCommands({
      engine: "antigravity",
      supportsFastSlashCommand: false,
      canOfferCompactCommand: false,
      canOfferReviewCommand: true,
      canOfferForkCommand: true,
      canOfferSideCommand: true,
      canOfferExportCommand: true,
      providerNativeCommandNames: ["automation"],
    });

    expect(availableCommands).toContain("automation");
    expect(shouldHideProviderNativeCommandFromComposerMenu("antigravity", "automation")).toBe(true);
  });

  it("keeps Feedback OmniMind ahead of engine-native /feedback", () => {
    const availableCommands = getAvailableComposerSlashCommands({
      engine: "claude",
      supportsFastSlashCommand: true,
      canOfferCompactCommand: true,
      canOfferReviewCommand: true,
      canOfferForkCommand: true,
      canOfferSideCommand: true,
      canOfferExportCommand: true,
      providerNativeCommandNames: ["feedback"],
    });

    expect(availableCommands).toContain("feedback");
    expect(shouldHideProviderNativeCommandFromComposerMenu("claude", "feedback")).toBe(true);
  });

  it("only exposes OmniMind-owned app commands for claude", () => {
    expect(
      getAvailableComposerSlashCommands({
        engine: "claude",
        supportsFastSlashCommand: true,
        canOfferCompactCommand: true,
        canOfferReviewCommand: true,
        canOfferForkCommand: true,
        canOfferSideCommand: true,
        canOfferExportCommand: true,
      }),
    ).toEqual([
      "fork",
      "side",
      "export",
      "goal",
      "debug",
      "default",
      "converge",
      "learn",
      "feedback",
      "automation",
    ]);
  });

  it("omits app-level /fork for claude when the composer cannot offer it", () => {
    expect(
      getAvailableComposerSlashCommands({
        engine: "claude",
        supportsFastSlashCommand: true,
        canOfferCompactCommand: true,
        canOfferReviewCommand: true,
        canOfferForkCommand: false,
        canOfferSideCommand: true,
        canOfferExportCommand: true,
      }),
    ).not.toContain("fork");
  });

  it("offers the app-level /export command on every engine", () => {
    expect(
      getAvailableComposerSlashCommands({
        engine: "codex",
        supportsFastSlashCommand: true,
        canOfferCompactCommand: true,
        canOfferReviewCommand: true,
        canOfferForkCommand: true,
        canOfferSideCommand: true,
        canOfferExportCommand: true,
      }),
    ).toContain("export");
  });

  it("omits the app-level /export command when no server thread exists", () => {
    expect(
      getAvailableComposerSlashCommands({
        engine: "codex",
        supportsFastSlashCommand: true,
        canOfferCompactCommand: true,
        canOfferReviewCommand: true,
        canOfferForkCommand: true,
        canOfferSideCommand: true,
        canOfferExportCommand: false,
      }),
    ).not.toContain("export");
  });

  it("keeps app-level /export available even if a engine exposes a native collision", () => {
    const availableCommands = getAvailableComposerSlashCommands({
      engine: "claude",
      supportsFastSlashCommand: true,
      canOfferCompactCommand: true,
      canOfferReviewCommand: true,
      canOfferForkCommand: true,
      canOfferSideCommand: true,
      canOfferExportCommand: true,
      providerNativeCommandNames: ["export"],
    });

    expect(availableCommands).toContain("export");
    expect(shouldHideProviderNativeCommandFromComposerMenu("claude", "export")).toBe(true);
  });

  it("keeps native /export visible on surfaces without app-level /export", () => {
    const kanbanAppCommands = new Set(["clear", "default", "plan"]);
    const mainComposerAppCommands = new Set(["clear", "export", "model"]);

    expect(
      shouldHideProviderNativeCommandFromComposerMenu("claude", "export", {
        availableAppCommands: kanbanAppCommands,
      }),
    ).toBe(false);
    expect(
      shouldHideProviderNativeCommandFromComposerMenu("claude", "export", {
        availableAppCommands: mainComposerAppCommands,
      }),
    ).toBe(true);
  });

  it("only offers /compact when Codex compaction is available", () => {
    expect(
      getAvailableComposerSlashCommands({
        engine: "codex",
        supportsFastSlashCommand: true,
        canOfferCompactCommand: true,
        canOfferReviewCommand: true,
        canOfferForkCommand: true,
        canOfferSideCommand: true,
        canOfferExportCommand: true,
      }),
    ).toContain("compact");

    expect(
      getAvailableComposerSlashCommands({
        engine: "codex",
        supportsFastSlashCommand: true,
        canOfferCompactCommand: false,
        canOfferReviewCommand: true,
        canOfferForkCommand: true,
        canOfferSideCommand: true,
        canOfferExportCommand: true,
      }),
    ).not.toContain("compact");
  });

  it("exposes shared app slash commands for Antigravity", () => {
    expect(
      getAvailableComposerSlashCommands({
        engine: "antigravity",
        supportsFastSlashCommand: false,
        canOfferCompactCommand: false,
        canOfferReviewCommand: true,
        canOfferForkCommand: true,
        canOfferSideCommand: true,
        canOfferExportCommand: true,
      }),
    ).toEqual([
      "clear",
      "model",
      "plan",
      "debug",
      "default",
      "converge",
      "learn",
      "review",
      "fork",
      "side",
      "status",
      "subagents",
      "export",
      "goal",
      "feedback",
      "automation",
    ]);
  });

  it("treats real claude aliases like /reset as engine-native collisions", () => {
    expect(hasProviderNativeSlashCommand("claude", ["clear"], "reset")).toBe(true);
  });

  it.each(["claude", "codex", "opencode"] as const)(
    "keeps app /fork unique for %s despite engine-native fork and branch commands",
    (engine) => {
      const availableCommands = getAvailableComposerSlashCommands({
        engine,
        supportsFastSlashCommand: true,
        canOfferCompactCommand: true,
        canOfferReviewCommand: true,
        canOfferForkCommand: true,
        canOfferSideCommand: true,
        canOfferExportCommand: true,
        providerNativeCommandNames: ["fork", "branch"],
      });
      const visibleAppCommands = new Set(availableCommands);

      expect(availableCommands.filter((command) => command === "fork")).toEqual(["fork"]);
      expect(
        shouldHideProviderNativeCommandFromComposerMenu(engine, "fork", {
          availableAppCommands: visibleAppCommands,
        }),
      ).toBe(true);
      expect(
        shouldHideProviderNativeCommandFromComposerMenu(engine, "branch", {
          availableAppCommands: visibleAppCommands,
        }),
      ).toBe(false);
      expect(hasProviderNativeSlashCommand(engine, ["branch"], "fork")).toBe(false);
    },
  );

  it.each(["claude", "codex", "opencode"] as const)(
    "keeps engine-native /fork visible for %s when app /fork is unavailable",
    (engine) => {
      const availableCommands = getAvailableComposerSlashCommands({
        engine,
        supportsFastSlashCommand: true,
        canOfferCompactCommand: true,
        canOfferReviewCommand: true,
        canOfferForkCommand: false,
        canOfferSideCommand: true,
        canOfferExportCommand: true,
        providerNativeCommandNames: ["fork"],
      });

      expect(availableCommands).not.toContain("fork");
      expect(
        shouldHideProviderNativeCommandFromComposerMenu(engine, "fork", {
          availableAppCommands: new Set(availableCommands),
        }),
      ).toBe(false);
    },
  );
});
