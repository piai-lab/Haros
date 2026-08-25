import "../../index.css";

import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { I18nProvider } from "../../i18n";
import { TimelineWorkEntryRow } from "./TimelineWorkEntryRow";

function CanonicalAskRow() {
  return (
    <I18nProvider>
      <TimelineWorkEntryRow
        workEntry={{
          id: "canonical-user-input",
          createdAt: "2026-08-25T00:00:00.000Z",
          label: "User input requested",
          tone: "info",
          activityKind: "user-input.requested",
          // Conflicting Tool hints must not displace the canonical identity.
          toolName: "ask_user",
          itemType: "mcp_tool_call",
        }}
        chatMetaFontSizePx={12}
        textFontSizePx={13}
        density="compact"
        onImageExpand={() => {}}
        markdownCwd={undefined}
        timestampFormat="24-hour"
      />
    </I18nProvider>
  );
}

function CanonicalAnsweredRow() {
  return (
    <I18nProvider>
      <TimelineWorkEntryRow
        workEntry={{
          id: "canonical-user-input-answered",
          createdAt: "2026-08-25T00:00:01.000Z",
          label: "User input answered",
          tone: "info",
          activityKind: "user-input.requested",
          userInputSettlementStatus: "answered",
          userInputInteraction: {
            requestId: "request-1",
            questions: [
              {
                id: "direction",
                prompt: "选择实现方向",
                kind: "choice",
                optionLabels: ["A", "B"],
                answer: { selectedOptionLabels: ["A", "B"], customText: "自定义内容  " },
              },
              {
                id: "context",
                prompt: "还有什么背景？",
                kind: "text",
                optionLabels: [],
                answer: { selectedOptionLabels: [], customText: "第一行\n第二行" },
              },
            ],
          },
        }}
        chatMetaFontSizePx={12}
        textFontSizePx={13}
        density="compact"
        onImageExpand={() => {}}
        markdownCwd={undefined}
        timestampFormat="24-hour"
      />
    </I18nProvider>
  );
}

function CompactPeerRows() {
  const shared = {
    chatMetaFontSizePx: 12,
    textFontSizePx: 13,
    density: "compact" as const,
    onImageExpand: () => {},
    markdownCwd: undefined,
    timestampFormat: "24-hour" as const,
  };
  return (
    <I18nProvider>
      <TimelineWorkEntryRow
        {...shared}
        workEntry={{
          id: "reasoning",
          createdAt: "2026-08-25T00:00:00.000Z",
          label: "Reasoning",
          tone: "thinking",
          activityKind: "reasoning.updated",
          reasoningEntries: [{ id: "reasoning-1", text: "Thinking" }],
        }}
      />
      <TimelineWorkEntryRow
        {...shared}
        workEntry={{
          id: "tool",
          createdAt: "2026-08-25T00:00:01.000Z",
          label: "Tool",
          tone: "tool",
          itemType: "dynamic_tool_call",
          toolName: "ordinary_tool",
        }}
      />
      <TimelineWorkEntryRow
        {...shared}
        workEntry={{
          id: "ask",
          createdAt: "2026-08-25T00:00:02.000Z",
          label: "User input requested",
          tone: "info",
          activityKind: "user-input.requested",
        }}
      />
    </I18nProvider>
  );
}

function createHost(width: number): HTMLDivElement {
  const host = document.createElement("div");
  host.style.cssText = `width:${width}px;max-width:100%;overflow:auto;padding:8px;`;
  document.body.append(host);
  return host;
}

describe("canonical User Input Timeline projection", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
    document.body.innerHTML = "";
  });

  it.each([
    { theme: "light", width: 480 },
    { theme: "dark", width: 430 },
  ])("keeps bubbles quiet, 14px, and overflow-free in $theme at $width px", async (input) => {
    document.documentElement.classList.toggle("dark", input.theme === "dark");
    const host = createHost(input.width);
    const screen = await render(<CanonicalAskRow />, { container: host });

    const icon = host.querySelector<SVGElement>('[data-central-icon-name="bubbles"]');
    expect(icon).not.toBeNull();
    expect(icon?.getBoundingClientRect().width).toBe(14);
    expect(icon?.getBoundingClientRect().height).toBe(14);
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
    expect(host.querySelector('[data-central-icon-name="hammer"]')).toBeNull();

    await screen.unmount();
  });

  it("keeps answered collapsed and reveals only persisted question details on demand", async () => {
    const host = createHost(430);
    const screen = await render(<CanonicalAnsweredRow />, { container: host });

    expect(host.querySelector('[data-central-icon-name="bubbles"]')).not.toBeNull();
    const trigger = host.querySelector<HTMLButtonElement>("[aria-expanded]");
    const details = host.querySelector<HTMLElement>("[data-user-input-details='true']");
    expect(trigger?.textContent?.trim()).toBe("Answered");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(details?.closest("[aria-hidden='true']")).not.toBeNull();

    await screen.getByRole("button", { name: "Answered" }).click();

    await expect.poll(() => trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(details?.closest("[aria-hidden='true']")).toBeNull();
    expect(host.textContent).toContain("选择实现方向");
    expect(host.textContent).not.toContain("Selected");
    expect(host.textContent).not.toContain("已选择");
    expect(host.textContent).toContain("A");
    expect(host.textContent).toContain("B");
    expect(host.textContent).toContain("自定义内容  ");
    expect(host.textContent).toContain("第一行\n第二行");
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);

    await screen.unmount();
  });

  it("aligns reasoning, tool, and User Input on one compact leading geometry", async () => {
    const host = createHost(480);
    const screen = await render(<CompactPeerRows />, { container: host });
    const icons = Array.from(host.querySelectorAll<HTMLElement>("[data-work-entry-icon='true']"));
    const labels = Array.from(
      host.querySelectorAll<HTMLElement>("[data-work-entry-display-text='true']"),
    );

    expect(icons).toHaveLength(3);
    expect(labels).toHaveLength(3);
    expect(icons.map((icon) => icon.getBoundingClientRect().left)).toEqual([
      icons[0]!.getBoundingClientRect().left,
      icons[0]!.getBoundingClientRect().left,
      icons[0]!.getBoundingClientRect().left,
    ]);
    expect(labels.map((label) => label.getBoundingClientRect().left)).toEqual([
      labels[0]!.getBoundingClientRect().left,
      labels[0]!.getBoundingClientRect().left,
      labels[0]!.getBoundingClientRect().left,
    ]);

    await screen.unmount();
  });
});
