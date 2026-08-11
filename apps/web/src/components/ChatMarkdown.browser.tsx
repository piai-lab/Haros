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
    expect(getComputedStyle(firstBodyCell!).whiteSpace).toBe("nowrap");

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
