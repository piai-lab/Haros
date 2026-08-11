// FILE: ChatMarkdown.browser.tsx
// Purpose: Verify Markdown tables own narrow-container overflow without widening the chat surface.
// Layer: Browser UI regression

import "../index.css";

import { page, userEvent } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { DEFAULT_THEME_STATE, serializeThemeState } from "../theme/theme.logic";
import ChatMarkdown from "./ChatMarkdown";

const TABLE_MARKDOWN = [
  "| Provider | Model | Input tokens | Output tokens | Cost |",
  "| --- | --- | ---: | ---: | ---: |",
  "| Xiaomi MiMo | mimo-v2-omni-preview | 12,847,392 | 8,201,004 | $31.4297 |",
  "| DeepSeek | deepseek-reasoner | 9,442,781 | 5,740,218 | $18.0721 |",
].join("\n");
const EMBEDDED_TABLE_MARKDOWN = ["Before", "", TABLE_MARKDOWN, "", "After"].join("\n");
const COMPARISON_MARKDOWN = [
  "| Option | Operational tradeoff |",
  "| --- | --- |",
  "| Current owner | This comparison explains a deliberately long operational tradeoff with recovery semantics, ownership boundaries, maintenance costs, and future compatibility obligations that must remain readable on a narrow desktop pane. |",
].join("\n");
const COMPACT_TABLE_MARKDOWN = ["| A | B |", "| --- | --- |", "| 1 | 2 |"].join("\n");

describe("ChatMarkdown table overflow", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("omnimind:theme");
  });

  it("keeps the page width stable and makes only an overflowing table keyboard reachable", async () => {
    const mounted = await render(
      <div data-testid="host" style={{ width: 320 }}>
        <ChatMarkdown text={TABLE_MARKDOWN} cwd={undefined} />
      </div>,
    );
    const host = mounted.getByTestId("host").element();
    const frame = host.querySelector<HTMLElement>(".chat-markdown-table-frame");
    const viewport = host.querySelector<HTMLElement>(".chat-markdown-table-viewport");
    expect(frame).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!frame || !viewport) return;

    await vi.waitFor(() => expect(frame.dataset.overflow).toBe("true"));
    expect(host.scrollWidth).toBe(host.clientWidth);
    expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth);
    expect(viewport.tabIndex).toBe(0);
    expect(viewport.getAttribute("role")).toBe("region");
    expect(viewport.getAttribute("aria-label")).toBe("Scrollable table");
    const firstBodyCell = viewport.querySelector<HTMLElement>("tbody td");
    expect(firstBodyCell).not.toBeNull();
    expect(getComputedStyle(firstBodyCell!).whiteSpace).toBe("normal");

    viewport.focus();
    await userEvent.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(viewport.scrollLeft).toBeGreaterThan(0));
    await vi.waitFor(() => expect(frame.dataset.scrollStart).toBe("false"));

    host.style.width = "900px";
    await vi.waitFor(() => expect(frame.dataset.overflow).toBe("false"));
    expect(viewport.tabIndex).toBe(-1);
    expect(viewport.hasAttribute("role")).toBe(false);
    expect(viewport.hasAttribute("aria-label")).toBe(false);
    expect(getComputedStyle(firstBodyCell!).whiteSpace).toBe("normal");
  });

  it("keeps a pure table usable inside the real shrink-wrapped user-bubble geometry", async () => {
    const mounted = await render(
      <div data-testid="host" style={{ width: 320 }}>
        <div
          data-testid="user-bubble"
          className="w-max max-w-full min-w-0 self-end border px-3 py-1.5"
        >
          <div className="min-w-0 overflow-hidden">
            <ChatMarkdown text={TABLE_MARKDOWN} cwd={undefined} variant="user" />
          </div>
        </div>
      </div>,
    );
    const host = mounted.getByTestId("host").element();
    const bubble = mounted.getByTestId("user-bubble").element();
    const frame = bubble.querySelector<HTMLElement>(".chat-markdown-table-frame");
    const viewport = bubble.querySelector<HTMLElement>(".chat-markdown-table-viewport");
    expect(frame).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!frame || !viewport) return;

    await vi.waitFor(() => expect(frame.dataset.overflow).toBe("true"));
    expect(host.scrollWidth).toBe(host.clientWidth);
    expect(bubble.getBoundingClientRect().width).toBeGreaterThan(250);
    expect(bubble.getBoundingClientRect().width).toBeLessThanOrEqual(host.clientWidth);
    expect(viewport.clientWidth).toBeGreaterThan(0);
  });

  it("wraps prose-heavy comparison cells instead of creating an extreme scroll surface", async () => {
    const mounted = await render(
      <div data-testid="host" style={{ width: 320 }}>
        <ChatMarkdown text={COMPARISON_MARKDOWN} cwd={undefined} />
      </div>,
    );
    const host = mounted.getByTestId("host").element();
    const proseCell = host.querySelector<HTMLElement>("tbody td:last-child");
    expect(proseCell).not.toBeNull();
    if (!proseCell) return;

    expect(host.scrollWidth).toBe(host.clientWidth);
    expect(getComputedStyle(proseCell).whiteSpace).toBe("normal");
    expect(proseCell.getBoundingClientRect().width).toBeLessThan(300);
    expect(proseCell.getBoundingClientRect().height).toBeGreaterThan(
      Number.parseFloat(getComputedStyle(proseCell).lineHeight) * 2,
    );
  });

  it("remeasures when a committed table grows wider without a container resize", async () => {
    const mounted = await render(
      <div data-testid="host" style={{ width: 320 }}>
        <ChatMarkdown text={COMPACT_TABLE_MARKDOWN} cwd={undefined} />
      </div>,
    );
    const host = mounted.getByTestId("host").element();
    const frame = host.querySelector<HTMLElement>(".chat-markdown-table-frame");
    expect(frame).not.toBeNull();
    if (!frame) return;
    await vi.waitFor(() => expect(frame.dataset.overflow).toBe("false"));

    await mounted.rerender(
      <div data-testid="host" style={{ width: 320 }}>
        <ChatMarkdown text={TABLE_MARKDOWN} cwd={undefined} />
      </div>,
    );
    await vi.waitFor(() => expect(frame.dataset.overflow).toBe("true"));
  });

  it("keeps header and row surfaces distinct in both supported themes", async () => {
    await render(<ChatMarkdown text={TABLE_MARKDOWN} cwd={undefined} />);
    const header = page.getByRole("columnheader", { name: "Provider" }).element();
    const bodyCell = page.getByText("Xiaomi MiMo").element();
    const lightHeader = getComputedStyle(header).backgroundColor;
    const lightBody = getComputedStyle(bodyCell).backgroundColor;
    expect(lightHeader).not.toBe(lightBody);

    const darkState = { ...DEFAULT_THEME_STATE, mode: "dark" as const };
    const serializedDarkState = serializeThemeState(darkState);
    localStorage.setItem("omnimind:theme", serializedDarkState);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "omnimind:theme",
        newValue: serializedDarkState,
      }),
    );
    await vi.waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    const darkHeader = page.getByRole("columnheader", { name: "Provider" }).element();
    const darkBodyCell = page.getByText("Xiaomi MiMo").element();
    await vi.waitFor(() =>
      expect(getComputedStyle(darkHeader).backgroundColor).not.toBe(lightHeader),
    );
    expect(getComputedStyle(darkHeader).backgroundColor).not.toBe(
      getComputedStyle(darkBodyCell).backgroundColor,
    );
  });

  it("preserves the existing compact and document surface rhythms", async () => {
    const mounted = await render(
      <div>
        <div data-testid="assistant-surface">
          <ChatMarkdown text={EMBEDDED_TABLE_MARKDOWN} cwd={undefined} />
        </div>
        <div data-testid="user-surface">
          <ChatMarkdown text={EMBEDDED_TABLE_MARKDOWN} cwd={undefined} variant="user" />
        </div>
        <div data-testid="document-surface" className="editor-markdown-preview">
          <ChatMarkdown text={EMBEDDED_TABLE_MARKDOWN} cwd={undefined} />
        </div>
      </div>,
    );

    const tableMargin = (testId: string) => {
      const frame = mounted
        .getByTestId(testId)
        .element()
        .querySelector<HTMLElement>(".chat-markdown-table-frame");
      expect(frame).not.toBeNull();
      return Number.parseFloat(getComputedStyle(frame!).marginTop);
    };

    const assistantMargin = tableMargin("assistant-surface");
    expect(tableMargin("user-surface")).toBeLessThan(assistantMargin);
    expect(tableMargin("document-surface")).toBeGreaterThan(assistantMargin);
  });
});
