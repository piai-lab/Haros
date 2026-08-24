// FILE: MessagesTimeline.reasoning.browser.tsx
// Purpose: Browser-level contract for inline public reasoning disclosures.
// Layer: Vitest browser tests

import "../../index.css";

import { MessageId, TurnId } from "@omnimind/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" },
}));

vi.mock("../../appSettings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../appSettings")>()),
  useAppSettings: () => ({ settings: harness.settings }),
}));

import { I18nProvider } from "../../i18n";
import { MessagesTimeline } from "./MessagesTimeline";
import { TimelineWorkEntryRow } from "./TimelineWorkEntryRow";

const LONG_REASONING =
  "I am checking the canonical sequence before opening https://example.test/a/very/long/source/path?query=reasoning-timeline-layout and then validating SupercalifragilisticexpialidociousRepeatedWithoutABreakSupercalifragilisticexpialidociousRepeatedWithoutABreak at the narrowest supported width.";

function ReasoningRow(props: { onOpenAgentActivity?: (id: string) => void }) {
  return (
    <TimelineWorkEntryRow
      workEntry={{
        id: "agent-reasoning:reasoning-1",
        createdAt: "2026-08-24T13:30:40.000Z",
        label: "Reasoning",
        toolTitle: "Reasoning",
        activityKind: "reasoning.completed",
        tone: "thinking",
        reasoningEntries: [
          {
            id: "reasoning-1",
            text: "First public paragraph from the provider.",
          },
          { id: "reasoning-2", text: LONG_REASONING },
        ],
      }}
      chatMetaFontSizePx={12}
      textFontSizePx={13}
      density="compact"
      onImageExpand={() => {}}
      markdownCwd={undefined}
      {...(props.onOpenAgentActivity
        ? { onOpenAgentActivity: props.onOpenAgentActivity }
        : {})}
      timestampFormat="locale"
    />
  );
}

function CausalReasoningTimeline() {
  const turnId = TurnId.makeUnsafe("turn-causal-browser");
  return (
    <MessagesTimeline
      hasMessages
      isWorking={false}
      activeTurnInProgress={false}
      activeTurnStartedAt={null}
      timelineEntries={[
        {
          id: MessageId.makeUnsafe("assistant-causal-before"),
          kind: "message",
          createdAt: "2026-08-24T13:30:40.000Z",
          sequence: 10,
          message: {
            id: MessageId.makeUnsafe("assistant-causal-before"),
            role: "assistant",
            text: "Narration before work.",
            turnId,
            createdAt: "2026-08-24T13:30:40.000Z",
            completedAt: "2026-08-24T13:30:40.100Z",
            streaming: false,
          },
        },
        {
          id: "reasoning-causal-1",
          kind: "work",
          createdAt: "2026-08-24T13:30:41.000Z",
          sequence: 11,
          entry: {
            id: "reasoning-causal-1",
            createdAt: "2026-08-24T13:30:41.000Z",
            sequence: 11,
            turnId,
            label: "Reasoning",
            tone: "thinking",
            activityKind: "reasoning.completed",
            reasoningEntries: [{ id: "reasoning-part-1", text: "First public reasoning." }],
          },
        },
        {
          id: "tool-causal-1",
          kind: "work",
          createdAt: "2026-08-24T13:30:42.000Z",
          sequence: 12,
          entry: {
            id: "tool-causal-1",
            createdAt: "2026-08-24T13:30:42.000Z",
            sequence: 12,
            turnId,
            label: "First tool",
            toolTitle: "First tool",
            tone: "tool",
            itemType: "dynamic_tool_call",
          },
        },
        {
          id: "reasoning-causal-2",
          kind: "work",
          createdAt: "2026-08-24T13:30:43.000Z",
          sequence: 13,
          entry: {
            id: "reasoning-causal-2",
            createdAt: "2026-08-24T13:30:43.000Z",
            sequence: 13,
            turnId,
            label: "Reasoning",
            tone: "thinking",
            activityKind: "reasoning.completed",
            reasoningEntries: [{ id: "reasoning-part-2", text: "Second public reasoning." }],
          },
        },
        {
          id: "tool-causal-2",
          kind: "work",
          createdAt: "2026-08-24T13:30:44.000Z",
          sequence: 14,
          entry: {
            id: "tool-causal-2",
            createdAt: "2026-08-24T13:30:44.000Z",
            sequence: 14,
            turnId,
            label: "Second tool",
            toolTitle: "Second tool",
            tone: "tool",
            itemType: "dynamic_tool_call",
          },
        },
        {
          id: MessageId.makeUnsafe("assistant-causal-after"),
          kind: "message",
          createdAt: "2026-08-24T13:30:45.000Z",
          sequence: 15,
          message: {
            id: MessageId.makeUnsafe("assistant-causal-after"),
            role: "assistant",
            text: "Answer after work.",
            turnId,
            createdAt: "2026-08-24T13:30:45.000Z",
            completedAt: "2026-08-24T13:30:45.100Z",
            streaming: false,
          },
        },
      ]}
      turnDiffSummaryByAssistantMessageId={new Map()}
      nowIso="2026-08-24T13:30:46.000Z"
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
      onOpenTurnDiff={() => {}}
      revertTurnCountByUserMessageId={new Map()}
      onRevertUserMessage={() => {}}
      isRevertingCheckpoint={false}
      onImageExpand={() => {}}
      markdownCwd={undefined}
      resolvedTheme="light"
      timestampFormat="locale"
      workspaceRoot={undefined}
    />
  );
}

function createNarrowHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.style.cssText = "width:480px;max-width:480px;height:620px;overflow:hidden;";
  host.className = "dark bg-background text-foreground";
  document.body.append(host);
  return host;
}

async function settleLayout(): Promise<void> {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

describe("Timeline public reasoning disclosure", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.settings.localePreference = "en";
  });

  it("uses brain-2, expands original paragraphs by default, and never opens activity detail", async () => {
    const onOpenAgentActivity = vi.fn();
    const consoleError = vi.spyOn(console, "error");
    const host = createNarrowHost();
    const screen = await render(
      <I18nProvider>
        <ReasoningRow onOpenAgentActivity={onOpenAgentActivity} />
      </I18nProvider>,
      { container: host },
    );

    try {
      const trigger = screen.getByRole("button", { name: "Reasoning" }).element();
      const controlledId = trigger.getAttribute("aria-controls");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(controlledId).toBeTruthy();
      expect(document.getElementById(controlledId!)).not.toBeNull();
      expect(document.querySelector('[data-central-icon-name="brain-2"]')).not.toBeNull();
      expect(document.body.textContent ?? "").toContain(
        "First public paragraph from the provider.",
      );
      expect(document.body.textContent ?? "").toContain(LONG_REASONING);
      expect(document.body.textContent ?? "").not.toContain("updates");
      expect(document.body.textContent ?? "").not.toContain("hidden reasoning");
      expect(document.querySelector("[data-agent-activity-detail='true']")).toBeNull();
      expect(onOpenAgentActivity).not.toHaveBeenCalled();

      trigger.focus();
      await userEvent.keyboard("{Enter}");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(
        document.getElementById(controlledId!)?.querySelector("[aria-hidden='true']"),
      ).not.toBeNull();
      expect(onOpenAgentActivity).not.toHaveBeenCalled();

      await userEvent.keyboard(" ");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(onOpenAgentActivity).not.toHaveBeenCalled();

      const disclosure = document.querySelector<HTMLElement>("[data-reasoning-disclosure='true']");
      const motionNodes = disclosure?.querySelectorAll<HTMLElement>(
        "[class*='motion-reduce:transition-none']",
      );
      expect((motionNodes?.length ?? 0) >= 2).toBe(true);
      await settleLayout();
      expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
      expect(disclosure?.scrollWidth ?? 0).toBeLessThanOrEqual(disclosure?.clientWidth ?? 0);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      await screen.unmount();
      host.remove();
    }
  });

  it("renders the same disclosure contract in Simplified Chinese", async () => {
    harness.settings.localePreference = "zh-CN";
    const host = createNarrowHost();
    const screen = await render(
      <I18nProvider>
        <ReasoningRow />
      </I18nProvider>,
      { container: host },
    );

    try {
      const trigger = screen.getByRole("button", { name: "思考" }).element();
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(document.body.textContent ?? "").not.toContain("条更新");
      expect(document.body.textContent ?? "").toContain(LONG_REASONING);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("renders assistant, reasoning, and tools in their canonical causal order", async () => {
    const host = createNarrowHost();
    const screen = await render(<CausalReasoningTimeline />, { container: host });

    try {
      const text = document.body.textContent ?? "";
      const orderedText = [
        "Narration before work.",
        "First public reasoning.",
        "First tool",
        "Second public reasoning.",
        "Second tool",
        "Answer after work.",
      ];
      const positions = orderedText.map((value) => text.indexOf(value));
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].toSorted((left, right) => left - right));
    } finally {
      await screen.unmount();
      host.remove();
    }
  });
});
