import {
  DEFAULT_SERVER_SETTINGS_VIEW,
  EventId,
  MessageId,
  type ModelSelection,
  type OrchestrationThreadActivity,
  type ProviderKind,
  type ServerProviderStatus,
} from "@harnessos/contracts";
import { describe, expect, it } from "vitest";
import {
  buildThreadHandoffImportedActivities,
  buildThreadHandoffImportedMessages,
  buildHistoryOnlyForkPayload,
  deriveHistoryOnlyForkableAssistantMessageIds,
  resolveAvailableHandoffTargetProviders,
  resolveThreadHandoffTitle,
  resolveThreadHandoffModelSelection,
} from "./threadHandoff";
import { appendAssistantSelectionsToPrompt } from "./assistantSelections";
import {
  appendBrowserAnnotationsToPrompt,
  extractTrailingBrowserAnnotations,
  type BrowserAnnotationDraft,
} from "./browserAnnotations";

describe("threadHandoff", () => {
  it("preserves exact assistant selection attachment text in handoff messages", () => {
    const text = "\r\n  selected text  \r\n";
    const [imported] = buildThreadHandoffImportedMessages({
      messages: [
        {
          id: MessageId.makeUnsafe("source-user-with-selection"),
          role: "user",
          text: "Continue from this selection",
          attachments: [
            {
              type: "assistant-selection",
              id: "selection-1",
              assistantMessageId: MessageId.makeUnsafe("assistant-1"),
              text,
            },
          ],
          createdAt: "2026-08-17T00:00:01.000Z",
          streaming: false,
          source: "native",
        },
      ],
    });

    expect(imported?.attachments).toEqual([
      {
        type: "assistant-selection",
        id: "selection-1",
        assistantMessageId: "assistant-1",
        text,
      },
    ]);
  });

  it("strips source-thread browser annotations and selections from imported messages", () => {
    const sourceMessageId = MessageId.makeUnsafe("source-user-message");
    const annotation: BrowserAnnotationDraft = {
      id: "annotation-1",
      ordinal: 1,
      tabId: "tab-1",
      source: { url: "https://example.test/docs", pageTitle: "Docs" },
      selector: "main > button",
      tagName: "button",
      role: "button",
      name: "Save",
      text: "Save",
      fingerprint: "button|save|main",
      comment: "Remove this",
      capturedAt: "2026-07-23T10:00:00.000Z",
    };
    const text = appendBrowserAnnotationsToPrompt(
      appendAssistantSelectionsToPrompt("Update the page", [
        { assistantMessageId: "assistant-1", text: "Quoted response" },
      ]),
      [annotation],
      sourceMessageId,
    );

    const [imported] = buildThreadHandoffImportedMessages({
      messages: [
        {
          id: sourceMessageId,
          role: "user",
          text,
          createdAt: "2026-07-23T10:00:00.000Z",
          streaming: false,
          source: "native",
        },
      ],
    });
    expect(imported).toBeTruthy();
    const extracted = extractTrailingBrowserAnnotations(imported!.text, imported!.messageId);
    expect(imported!.messageId).not.toBe(sourceMessageId);
    expect(extracted.promptText).toBe("Update the page");
    expect(extracted.annotations).toEqual([]);
    expect(imported!.text).not.toContain("<browser_annotations>");
    expect(imported!.text).not.toContain("annotation-1");
    expect(imported!.text).not.toContain("<assistant_selection>");
  });

  it("builds an exact source-identified prefix only through a middle assistant", () => {
    const sourceUserId = MessageId.makeUnsafe("source-user");
    const cutoffId = MessageId.makeUnsafe("source-assistant-cutoff");
    const suffixId = MessageId.makeUnsafe("source-user-suffix");
    const messages = [
      {
        id: sourceUserId,
        role: "user" as const,
        text: "Question",
        createdAt: "2026-08-17T00:00:01.000Z",
        streaming: false,
        source: "native" as const,
      },
      {
        id: cutoffId,
        role: "assistant" as const,
        text: "Selected answer",
        createdAt: "2026-08-17T00:00:02.000Z",
        completedAt: "2026-08-17T00:00:03.000Z",
        streaming: false,
        source: "native" as const,
      },
      {
        id: suffixId,
        role: "user" as const,
        text: "SECRET_SUFFIX",
        createdAt: "2026-08-17T00:00:04.000Z",
        streaming: false,
        source: "native" as const,
      },
    ];

    const payload = buildHistoryOnlyForkPayload({ messages }, cutoffId);
    expect(payload?.forkScope).toEqual({
      kind: "history-only",
      sourceMessageId: cutoffId,
      sourceMessageUpdatedAt: "2026-08-17T00:00:03.000Z",
      bootstrapStatus: "pending",
    });
    expect(payload?.importedMessages.map((message) => message.sourceMessageId)).toEqual([
      sourceUserId,
      cutoffId,
    ]);
    expect(payload?.importedMessages.map((message) => message.text)).not.toContain("SECRET_SUFFIX");
    expect(deriveHistoryOnlyForkableAssistantMessageIds({ messages })).toEqual(new Set([cutoffId]));
  });

  it("fails closed for a missing or terminal assistant cutoff", () => {
    const assistantId = MessageId.makeUnsafe("terminal-assistant");
    const messages = [
      {
        id: assistantId,
        role: "assistant" as const,
        text: "Latest answer",
        createdAt: "2026-08-17T00:00:01.000Z",
        completedAt: "2026-08-17T00:00:02.000Z",
        streaming: false,
        source: "native" as const,
      },
    ];

    expect(buildHistoryOnlyForkPayload({ messages }, MessageId.makeUnsafe("missing"))).toBeNull();
    expect(buildHistoryOnlyForkPayload({ messages }, assistantId)).toBeNull();
    expect(deriveHistoryOnlyForkableAssistantMessageIds({ messages })).toEqual(new Set());
  });

  it("hides cutoffs whose exact prefix contains an attachment", () => {
    const assistantId = MessageId.makeUnsafe("assistant-after-attachment");
    const messages = [
      {
        id: MessageId.makeUnsafe("user-with-attachment"),
        role: "user" as const,
        text: "See the attached file",
        attachments: [
          {
            type: "file" as const,
            id: "attachment-1",
            name: "context.txt",
            mimeType: "text/plain",
            sizeBytes: 7,
          },
        ],
        createdAt: "2026-08-17T00:00:01.000Z",
        streaming: false,
        source: "native" as const,
      },
      {
        id: assistantId,
        role: "assistant" as const,
        text: "Read it",
        createdAt: "2026-08-17T00:00:02.000Z",
        completedAt: "2026-08-17T00:00:03.000Z",
        streaming: false,
        source: "native" as const,
      },
      {
        id: MessageId.makeUnsafe("suffix-user"),
        role: "user" as const,
        text: "Continue",
        createdAt: "2026-08-17T00:00:04.000Z",
        streaming: false,
        source: "native" as const,
      },
    ];

    expect(buildHistoryOnlyForkPayload({ messages }, assistantId)).toBeNull();
    expect(deriveHistoryOnlyForkableAssistantMessageIds({ messages })).toEqual(new Set());
  });

  it("does not import a source provider's configured context window", () => {
    const activity = (kind: string): OrchestrationThreadActivity => ({
      id: EventId.makeUnsafe(`activity-${kind}`),
      createdAt: "2026-07-21T00:00:00.000Z",
      tone: "info",
      kind,
      summary: kind,
      payload: {},
      turnId: null,
    });

    const imported = buildThreadHandoffImportedActivities({
      activities: [
        activity("context-window.configured"),
        activity("context-window.updated"),
        activity("tool.started"),
      ],
    });

    expect(imported.map(({ kind }) => kind)).toEqual(["context-window.updated"]);
  });

  it("excludes disabled, missing, unavailable, and unauthenticated handoff targets", () => {
    const readyStatus = (
      provider: ProviderKind,
      overrides: Partial<ServerProviderStatus> = {},
    ): ServerProviderStatus => ({
      provider,
      status: "ready",
      available: true,
      authStatus: "authenticated",
      checkedAt: "2026-08-07T12:00:00.000Z",
      ...overrides,
    });
    const providerSettings = {
      ...DEFAULT_SERVER_SETTINGS_VIEW.providers,
      antigravity: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.providers.antigravity,
        enabled: false,
      },
    };

    expect(
      resolveAvailableHandoffTargetProviders({
        sourceProvider: "codex",
        providerSettings,
        providerStatuses: [
          readyStatus("codex"),
          readyStatus("claudeAgent"),
          readyStatus("cursor", { available: false, status: "error" }),
          readyStatus("antigravity"),
          readyStatus("grok", { authStatus: "unauthenticated" }),
          readyStatus("kilo", { authStatus: "unknown" }),
        ],
      }),
    ).toEqual(["claudeAgent", "kilo"]);
  });

  it("does not expose targets before enabled-provider settings are available", () => {
    expect(
      resolveAvailableHandoffTargetProviders({
        sourceProvider: "codex",
        providerSettings: undefined,
        providerStatuses: [
          {
            provider: "claudeAgent",
            status: "ready",
            available: true,
            authStatus: "authenticated",
            checkedAt: "2026-08-07T12:00:00.000Z",
          },
        ],
      }),
    ).toEqual([]);
  });

  it("preserves the source thread title for the created handoff thread", () => {
    expect(resolveThreadHandoffTitle({ title: "General Greeting" })).toBe("General Greeting");
    expect(resolveThreadHandoffTitle({ title: "  Debug   Grok handoff  " })).toBe(
      "Debug Grok handoff",
    );
  });

  it("prefers sticky model selection for the chosen handoff target", () => {
    const stickySelection = {
      provider: "antigravity",
      model: "Gemini 3.5 Flash",
    } satisfies ModelSelection;

    expect(
      resolveThreadHandoffModelSelection({
        sourceThread: {
          modelSelection: {
            provider: "claudeAgent",
            model: "claude-sonnet-4-6",
          },
        },
        targetProvider: "antigravity",
        projectDefaultModelSelection: {
          provider: "antigravity",
          model: "Claude Sonnet 4.6",
        },
        stickyModelSelectionByProvider: {
          antigravity: stickySelection,
        },
      }),
    ).toEqual(stickySelection);
  });

  it("falls back to the resolved provider default model when no sticky or project default exists", () => {
    expect(
      resolveThreadHandoffModelSelection({
        sourceThread: {
          modelSelection: {
            provider: "antigravity",
            model: "Gemini 3.5 Flash",
          },
        },
        targetProvider: "codex",
        projectDefaultModelSelection: null,
        stickyModelSelectionByProvider: {},
      }),
    ).toEqual({
      provider: "codex",
      model: "gpt-5.5",
    });
  });
});
