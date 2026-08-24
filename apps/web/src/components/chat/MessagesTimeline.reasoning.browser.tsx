// FILE: MessagesTimeline.reasoning.browser.tsx
// Purpose: Browser-level contract for inline public reasoning disclosures.
// Layer: Vitest browser tests

import "../../index.css";

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
});
