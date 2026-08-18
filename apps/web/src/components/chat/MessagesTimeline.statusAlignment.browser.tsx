// FILE: MessagesTimeline.statusAlignment.browser.tsx
// Purpose: Browser geometry and locale regression for live and settled turn-status rows.
// Layer: Vitest browser tests

import "../../index.css";

import { MessageId } from "@omnimind/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const harness = vi.hoisted((): { settings: { localePreference: "en" | "zh-CN" } } => ({
  settings: { localePreference: "en" },
}));

vi.mock("~/appSettings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/appSettings")>()),
  useAppSettings: () => ({ settings: harness.settings }),
}));

import { I18nProvider } from "~/i18n";
import { MessagesTimeline } from "./MessagesTimeline";

const VIEWPORT_WIDTHS = [480, 960, 1440] as const;
const LIVE_STATUS_CASES = VIEWPORT_WIDTHS.flatMap((widthPx) =>
  (["light", "dark"] as const).flatMap((theme) =>
    (["en", "zh-CN"] as const).map((locale) => [widthPx, theme, locale] as const),
  ),
);
const SETTLED_STATUS_CASES = VIEWPORT_WIDTHS.flatMap((widthPx) =>
  (["en", "zh-CN"] as const).map((locale) => [widthPx, locale] as const),
);
const FIXED_NOW_ISO = "2026-03-17T19:12:30.000Z";

const sharedProps = {
  turnDiffSummaryByAssistantMessageId: new Map(),
  expandedWorkGroups: {},
  onToggleWorkGroup: () => {},
  onOpenTurnDiff: () => {},
  revertTurnCountByUserMessageId: new Map(),
  onRevertUserMessage: () => {},
  isRevertingCheckpoint: false,
  onImageExpand: () => {},
  markdownCwd: undefined,
  timestampFormat: "locale" as const,
  workspaceRoot: undefined,
};

function LiveStatusTimeline({
  theme,
  useLiveClock = false,
}: {
  theme: "light" | "dark";
  useLiveClock?: boolean;
}) {
  return (
    <I18nProvider>
      <MessagesTimeline
        {...sharedProps}
        {...(useLiveClock ? {} : { nowIso: FIXED_NOW_ISO })}
        hasMessages
        isWorking
        activeTurnInProgress
        activeTurnStartedAt="2026-03-17T19:12:28.000Z"
        timelineEntries={[]}
        resolvedTheme={theme}
      />
    </I18nProvider>
  );
}

function SettledStatusTimeline() {
  return (
    <I18nProvider>
      <MessagesTimeline
        {...sharedProps}
        hasMessages
        isWorking={false}
        activeTurnInProgress={false}
        activeTurnStartedAt={null}
        timelineEntries={[
          {
            id: "entry-work-inline",
            kind: "work",
            createdAt: "2026-03-17T19:12:28.000Z",
            entry: {
              id: "work-inline-1",
              createdAt: "2026-03-17T19:12:28.000Z",
              label: "turn",
              tone: "info",
            },
          },
          {
            id: "entry-assistant-inline",
            kind: "message",
            createdAt: "2026-03-17T19:12:29.000Z",
            message: {
              id: MessageId.makeUnsafe("message-assistant-inline"),
              role: "assistant",
              text: "Alignment reference text.",
              createdAt: "2026-03-17T19:12:29.000Z",
              completedAt: "2026-03-17T19:12:30.000Z",
              streaming: false,
            },
          },
        ]}
        resolvedTheme="dark"
      />
    </I18nProvider>
  );
}

function createTimelineHost(widthPx: number): HTMLDivElement {
  const host = document.createElement("div");
  host.dataset.threadSidebarPresentation = "docked";
  host.style.cssText = `display:flex;flex-direction:column;width:${widthPx}px;height:360px;overflow:hidden;container-type:inline-size;--sidebar-width:368px;`;
  document.body.append(host);
  return host;
}

async function settleLayout(): Promise<void> {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

describe("MessagesTimeline turn-status alignment", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each(LIVE_STATUS_CASES)(
    "keeps the live header and orb on the same safe leading edge at %ipx in %s mode for %s",
    async (widthPx, theme, locale) => {
      harness.settings.localePreference = locale;
      const host = createTimelineHost(widthPx);
      const screen = await render(<LiveStatusTimeline theme={theme} />, { container: host });
      try {
        await settleLayout();

        const headerRow = host.querySelector<HTMLElement>(
          '[data-timeline-row-kind="working-header"]',
        );
        const workingRow = host.querySelector<HTMLElement>('[data-timeline-row-kind="working"]');
        const headerLabel = headerRow?.firstElementChild?.firstElementChild as HTMLElement | null;
        const orb = workingRow?.querySelector<HTMLCanvasElement>(
          'canvas[data-composing-orb="official-20px"]',
        );

        expect(headerRow).not.toBeNull();
        expect(workingRow).not.toBeNull();
        expect(headerLabel?.textContent).toContain(
          locale === "zh-CN" ? "正在工作，已用时 2s" : "Working for 2s",
        );
        expect(orb).not.toBeNull();
        if (!headerRow || !workingRow || !headerLabel || !orb) return;

        const headerLeft = headerLabel.getBoundingClientRect().left;
        const orbLeft = orb.getBoundingClientRect().left;
        const hostRect = host.getBoundingClientRect();
        const hostCenter = hostRect.x + hostRect.width / 2;
        expect(Math.abs(headerLeft - orbLeft)).toBeLessThanOrEqual(0.5);
        expect(
          Math.abs(
            headerRow.getBoundingClientRect().x +
              headerRow.getBoundingClientRect().width / 2 -
              hostCenter,
          ),
        ).toBeLessThanOrEqual(0.5);
        expect(
          Math.abs(
            workingRow.getBoundingClientRect().x +
              workingRow.getBoundingClientRect().width / 2 -
              hostCenter,
          ),
        ).toBeLessThanOrEqual(0.5);
        expect(headerLeft).toBeGreaterThanOrEqual(headerRow.getBoundingClientRect().left + 3.5);
        expect(orbLeft).toBeGreaterThanOrEqual(workingRow.getBoundingClientRect().left + 3.5);
      } finally {
        screen.unmount();
        host.remove();
      }
    },
  );

  it.each(SETTLED_STATUS_CASES)(
    "keeps the settled status trigger inside its row safe edge at %ipx for %s",
    async (widthPx, locale) => {
      harness.settings.localePreference = locale;
      const host = createTimelineHost(widthPx);
      const screen = await render(<SettledStatusTimeline />, { container: host });

      try {
        await settleLayout();
        const row = host.querySelector<HTMLElement>('[data-message-id="message-assistant-inline"]');
        const expectedLabel = locale === "zh-CN" ? "工作了" : "Worked for";
        const trigger = [...(row?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find(
          (button) => button.textContent?.includes(expectedLabel),
        );
        expect(row).not.toBeNull();
        expect(trigger).not.toBeNull();
        if (!row || !trigger) return;

        expect(trigger.getBoundingClientRect().left).toBeGreaterThanOrEqual(
          row.getBoundingClientRect().left + 3.5,
        );
      } finally {
        screen.unmount();
        host.remove();
      }
    },
  );

  it("localizes the real ticking live-status path", async () => {
    harness.settings.localePreference = "zh-CN";
    const host = createTimelineHost(960);
    const screen = await render(<LiveStatusTimeline theme="light" useLiveClock />, {
      container: host,
    });

    try {
      await settleLayout();
      const headerRow = host.querySelector<HTMLElement>(
        '[data-timeline-row-kind="working-header"]',
      );
      expect(headerRow?.textContent).toContain("正在工作，已用时");
      expect(headerRow?.textContent).not.toContain("Working for");
    } finally {
      screen.unmount();
      host.remove();
    }
  });
});
