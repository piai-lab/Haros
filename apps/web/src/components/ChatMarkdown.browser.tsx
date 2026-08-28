// FILE: ChatMarkdown.browser.tsx
// Purpose: Verify Markdown tables own narrow-container overflow and footnote navigation stays
//          scoped to the originating chat message.
// Layer: Browser UI regression

import "../index.css";

import { page, userEvent } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { MessageId } from "@harnessos/contracts";
import type { CSSProperties } from "react";

import { DEFAULT_THEME_STATE, serializeThemeState } from "../theme/theme.logic";
import ChatMarkdown from "./ChatMarkdown";

const TABLE_MARKDOWN = [
  "| Engine | Model | Input tokens | Output tokens | Cost |",
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
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("harnessos:theme");
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
    const header = page.getByRole("columnheader", { name: "Engine" }).element();
    const bodyCell = page.getByText("Xiaomi MiMo").element();
    const lightHeader = getComputedStyle(header).backgroundColor;
    const lightBody = getComputedStyle(bodyCell).backgroundColor;
    expect(lightHeader).not.toBe(lightBody);

    const darkState = { ...DEFAULT_THEME_STATE, mode: "dark" as const };
    const serializedDarkState = serializeThemeState(darkState);
    localStorage.setItem("harnessos:theme", serializedDarkState);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "harnessos:theme",
        newValue: serializedDarkState,
      }),
    );
    await vi.waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    const darkHeader = page.getByRole("columnheader", { name: "Engine" }).element();
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

describe("ChatMarkdown Mermaid presentation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("harnessos:theme");
  });

  const diagramSource = [
    "flowchart TD",
    "    A([开始]) --> B[确定目标]",
    "    B --> C[制定计划]",
    "    C --> D[执行任务]",
    "    D --> E{结果符合预期？}",
    "    E -- 否 --> F[分析问题并调整]",
    "    F --> D",
    "    E -- 是 --> G[整理成果]",
    "    G --> H([完成])",
  ].join("\n");
  const source = `\`\`\`mermaid\n${diagramSource}\n\`\`\``;
  const presentation = { messageId: MessageId.makeUnsafe("browser-mermaid") } as const;
  const mermaidResourceCount = () =>
    performance
      .getEntriesByType("resource")
      .filter((entry) => /(?:\/|_)mermaid(?:\.min)?(?:\.js|\?)/i.test(entry.name)).length;

  it("does not import or render Mermaid while the message is streaming", async () => {
    const before = mermaidResourceCount();
    const importMarksBefore = performance.getEntriesByName("harnessos:mermaid-import").length;
    const renderMeasuresBefore = performance.getEntriesByName(
      "harnessos:mermaid-render-duration",
    ).length;
    const digest = vi.spyOn(crypto.subtle, "digest");
    const mounted = await render(
      <ChatMarkdown
        text={`\`\`\`mermaid\n${diagramSource}`}
        cwd={undefined}
        isStreaming
        mermaidPresentation={presentation}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 650));
    const host = mounted.container;
    expect(host.querySelector("iframe")).toBeNull();
    expect(host.querySelector(".chat-markdown-shiki")).toBeNull();
    expect(host.querySelector('[data-mermaid-state="pending"]')).not.toBeNull();
    expect(host.textContent).toContain("Generating diagram…");
    expect(host.textContent).not.toContain("flowchart TD");
    expect(host.textContent).not.toContain("mermaid");
    expect(mermaidResourceCount()).toBe(before);
    expect(performance.getEntriesByName("harnessos:mermaid-import")).toHaveLength(
      importMarksBefore,
    );
    expect(performance.getEntriesByName("harnessos:mermaid-render-duration")).toHaveLength(
      renderMeasuresBefore,
    );
    expect(digest).not.toHaveBeenCalled();
    const pending = host.querySelector<HTMLElement>(".chat-markdown-mermaid__pending")!;
    expect(pending.getBoundingClientRect().height).toBeGreaterThanOrEqual(120);
    expect(pending.getBoundingClientRect().height).toBeLessThanOrEqual(160);
    digest.mockRestore();
  });

  it("atomically presents the 755px example with only expand and source-copy actions", async () => {
    const mounted = await render(
      <ChatMarkdown text={source} cwd={undefined} mermaidPresentation={presentation} />,
    );
    const host = mounted.container;
    await vi.waitFor(
      () =>
        expect(
          host.querySelector<HTMLIFrameElement>(".chat-markdown-mermaid__frame"),
        ).not.toBeNull(),
      { timeout: 5000 },
    );
    const frame = host.querySelector<HTMLIFrameElement>(".chat-markdown-mermaid__frame")!;
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(frame.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(frame.hasAttribute("allow")).toBe(false);
    expect(frame.style.pointerEvents).toBe("none");
    expect(frame.srcdoc).toContain("default-src 'none'");
    expect(Number.parseFloat(frame.style.aspectRatio.split("/")[1] ?? "0")).toBeGreaterThan(720);
    expect(host.textContent).not.toContain("flowchart TD");
    expect(host.textContent).not.toContain("mermaid");
    expect(host.querySelectorAll("button")).toHaveLength(2);
    expect(page.getByRole("button", { name: "Expand diagram" })).toBeDefined();
    const copy = page.getByRole("button", { name: "Copy diagram source" });
    expect(copy).toBeDefined();
    expect(host.querySelector('[aria-label="View source"]')).toBeNull();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await userEvent.click(copy);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(`${diagramSource}\n`));
    writeText.mockRestore();
  });

  it("reuses the safe srcDoc in the Base UI dialog and returns focus on Escape", async () => {
    const mounted = await render(
      <ChatMarkdown text={source} cwd={undefined} mermaidPresentation={presentation} />,
    );
    await vi.waitFor(
      () =>
        expect(
          mounted.container.querySelector<HTMLIFrameElement>(".chat-markdown-mermaid__frame"),
        ).not.toBeNull(),
      { timeout: 5000 },
    );
    const inlineFrame = mounted.container.querySelector<HTMLIFrameElement>(
      ".chat-markdown-mermaid__frame",
    )!;
    const expand = page.getByRole("button", { name: "Expand diagram" });
    await userEvent.click(expand);
    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeVisible();
    const dialogFrame = dialog.element().querySelector<HTMLIFrameElement>("iframe");
    expect(dialogFrame).not.toBeNull();
    expect(dialogFrame!.srcdoc).toBe(inlineFrame.srcdoc);
    expect(dialogFrame!.getAttribute("sandbox")).toBe("");
    const dialogViewport = dialog
      .element()
      .querySelector<HTMLElement>("[data-mermaid-dialog-viewport]");
    expect(dialogViewport).not.toBeNull();
    expect(dialogViewport!.getBoundingClientRect().height).toBeGreaterThan(300);
    expect(page.getByRole("button", { name: "Fit diagram" })).toBeDefined();
    expect(page.getByRole("button", { name: "Zoom out" })).toBeDefined();
    expect(page.getByRole("button", { name: "Zoom in" })).toBeDefined();
    expect(page.getByRole("button", { name: "Reset zoom" })).toBeDefined();

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(document.activeElement).toBe(expand.element());
  });

  it("fits a 9864px diagram below 2% when necessary and preserves manual zoom on resize", async () => {
    await page.viewport(480, 240);
    const tallDiagram = [
      "flowchart TD",
      ...Array.from({ length: 100 }, (_, index) => `N${index}-->N${index + 1}`),
    ].join("\n");
    const mounted = await render(
      <ChatMarkdown
        text={`\`\`\`mermaid\n${tallDiagram}\n\`\`\``}
        cwd={undefined}
        mermaidPresentation={{ messageId: MessageId.makeUnsafe("browser-mermaid-tall") }}
      />,
    );
    await vi.waitFor(
      () =>
        expect(
          mounted.container.querySelector<HTMLIFrameElement>(".chat-markdown-mermaid__frame"),
        ).not.toBeNull(),
      { timeout: 5000 },
    );
    const inlineFrame = mounted.container.querySelector<HTMLIFrameElement>(
      ".chat-markdown-mermaid__frame",
    )!;
    expect(Number.parseFloat(inlineFrame.style.aspectRatio.split("/")[1] ?? "0")).toBe(9864);

    await userEvent.click(page.getByRole("button", { name: "Expand diagram" }));
    const dialog = page.getByRole("dialog");
    const dialogViewport = dialog
      .element()
      .querySelector<HTMLElement>("[data-mermaid-dialog-viewport]")!;
    const dialogFrame = dialog.element().querySelector<HTMLIFrameElement>("iframe")!;
    await vi.waitFor(() => expect(dialogFrame.style.visibility).toBe("visible"));
    expect(Number.parseFloat(dialogFrame.style.height) / 9864).toBeLessThan(0.02);
    expect(dialogFrame.getBoundingClientRect().height).toBeLessThanOrEqual(
      dialogViewport.clientHeight - 30,
    );

    await userEvent.click(page.getByRole("button", { name: "Zoom in" }));
    const manualHeight = dialogFrame.style.height;
    await page.viewport(480, 620);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    expect(dialogFrame.style.height).toBe(manualHeight);

    await userEvent.click(page.getByRole("button", { name: "Fit diagram" }));
    await vi.waitFor(() => expect(dialogFrame.style.height).not.toBe(manualHeight));
    expect(dialogFrame.getBoundingClientRect().height).toBeLessThanOrEqual(
      dialogViewport.clientHeight - 30,
    );
    await userEvent.click(page.getByRole("button", { name: "Reset zoom" }));
    expect(Number.parseFloat(dialogFrame.style.height)).toBe(9864);
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });

  it("keeps the previous diagram visible until a changed theme result is ready", async () => {
    const mounted = await render(
      <ChatMarkdown text={source} cwd={undefined} mermaidPresentation={presentation} />,
    );
    await vi.waitFor(
      () =>
        expect(
          mounted.container.querySelector<HTMLIFrameElement>(".chat-markdown-mermaid__frame"),
        ).not.toBeNull(),
      { timeout: 5000 },
    );
    const frame = mounted.container.querySelector<HTMLIFrameElement>(
      ".chat-markdown-mermaid__frame",
    )!;
    const lightSrcDoc = frame.srcdoc;
    const darkState = { ...DEFAULT_THEME_STATE, mode: "dark" as const };
    const serializedDarkState = serializeThemeState(darkState);
    localStorage.setItem("harnessos:theme", serializedDarkState);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "harnessos:theme",
        newValue: serializedDarkState,
      }),
    );

    expect(
      mounted.container.querySelector<HTMLIFrameElement>(".chat-markdown-mermaid__frame")?.srcdoc,
    ).toBe(lightSrcDoc);
    await vi.waitFor(
      () =>
        expect(
          mounted.container.querySelector<HTMLIFrameElement>(".chat-markdown-mermaid__frame")
            ?.srcdoc,
        ).not.toBe(lightSrcDoc),
      { timeout: 5000 },
    );
    expect(mounted.container.querySelectorAll(".chat-markdown-mermaid__frame")).toHaveLength(1);
  });

  it("breaks wide diagrams out to the real transcript pane without horizontal overflow", async () => {
    await page.viewport(2032, 900);
    const wideChain = Array.from(
      { length: 12 },
      (_, index) => `N${index}[A deliberately wide step ${index}]`,
    ).join("-->");
    const wideSource = `\`\`\`mermaid\nflowchart LR\n${wideChain}\n\`\`\``;
    const mounted = await render(
      <div
        data-testid="diagram-pane"
        style={
          {
            containerType: "inline-size",
            width: 1800,
            maxWidth: "100%",
            overflowX: "hidden",
            "--app-chat-content-inset-right": "260px",
          } as CSSProperties & { "--app-chat-content-inset-right": string }
        }
      >
        <div data-testid="reading-column" style={{ width: "min(736px, 100%)", margin: "0 auto" }}>
          <ChatMarkdown
            text={wideSource}
            cwd={undefined}
            mermaidPresentation={{ messageId: MessageId.makeUnsafe("browser-mermaid-wide") }}
          />
        </div>
      </div>,
    );
    const pane = mounted.getByTestId("diagram-pane").element();
    const readingColumn = mounted.getByTestId("reading-column").element();
    await vi.waitFor(
      () =>
        expect(
          pane.querySelector<HTMLIFrameElement>(".chat-markdown-mermaid__frame"),
        ).not.toBeNull(),
      { timeout: 5000 },
    );
    const breakout = pane.querySelector<HTMLElement>(".chat-markdown-mermaid-breakout")!;
    expect(breakout.getBoundingClientRect().width).toBeGreaterThan(
      readingColumn.getBoundingClientRect().width,
    );
    expect(breakout.getBoundingClientRect().width).toBeLessThanOrEqual(1500);
    expect(pane.scrollWidth).toBe(pane.clientWidth);

    pane.style.width = "480px";
    pane.style.removeProperty("--app-chat-content-inset-right");
    await vi.waitFor(() => expect(breakout.getBoundingClientRect().width).toBeLessThanOrEqual(456));
    expect(pane.scrollWidth).toBe(pane.clientWidth);
  });

  it("quietly contains unsafe input in a source-free local failure state", async () => {
    const before = mermaidResourceCount();
    const mounted = await render(
      <ChatMarkdown
        text={"```mermaid\ngraph TD\nclick A https://example.com\n```"}
        cwd={undefined}
        mermaidPresentation={presentation}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(mounted.container.textContent).toContain("This diagram could not be shown.");
    expect(mounted.container.textContent).not.toContain("click A");
    expect(mounted.container.querySelector('[data-mermaid-state="failed"]')).not.toBeNull();
    expect(page.getByRole("button", { name: "Copy diagram source" })).toBeDefined();
    expect(mounted.container.querySelector('[aria-label="Retry"]')).toBeNull();
    expect(mounted.container.querySelector("iframe")).toBeNull();
    expect(mermaidResourceCount()).toBe(before);
  });

  it("offers retry only for render failures and bypasses their cached result", async () => {
    const invalidSource = "flowchart TD\nA -->";
    const mounted = await render(
      <ChatMarkdown
        text={`\`\`\`mermaid\n${invalidSource}\n\`\`\``}
        cwd={undefined}
        mermaidPresentation={{ messageId: MessageId.makeUnsafe("browser-mermaid-invalid") }}
      />,
    );
    await vi.waitFor(
      () => expect(mounted.container.querySelector('[data-mermaid-state="failed"]')).not.toBeNull(),
      { timeout: 5000 },
    );
    expect(mounted.container.textContent).not.toContain(invalidSource);
    const retry = page.getByRole("button", { name: "Retry" });
    const rendersBefore = performance.getEntriesByName("harnessos:mermaid-render-attempt").length;
    await userEvent.click(retry);
    await vi.waitFor(
      () =>
        expect(
          performance.getEntriesByName("harnessos:mermaid-render-attempt").length,
        ).toBeGreaterThan(rendersBefore),
      { timeout: 5000 },
    );
    expect(mounted.container.querySelector('[data-mermaid-state="failed"]')).not.toBeNull();
  });
});

describe("ChatMarkdown footnote navigation", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  });

  it("keeps references inside their own message without replacing the app route hash", async () => {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#/thread-under-test`,
    );
    const footnoteMarkdown = "Claim.[^1]\n\n[^1]: Note";
    const mounted = await render(
      <main data-testid="footnote-host">
        <ChatMarkdown text={footnoteMarkdown} cwd={undefined} />
        <ChatMarkdown text={footnoteMarkdown} cwd={undefined} />
      </main>,
    );
    const host = mounted.getByTestId("footnote-host").element();
    const references = Array.from(host.querySelectorAll<HTMLAnchorElement>("a[data-footnote-ref]"));
    const backreferences = Array.from(
      host.querySelectorAll<HTMLAnchorElement>("a[data-footnote-backref]"),
    );
    const definitions = Array.from(
      host.querySelectorAll<HTMLElement>("section[data-footnotes] li"),
    );
    const labels = Array.from(
      host.querySelectorAll<HTMLElement>("section[data-footnotes] > h2.sr-only"),
    );

    expect(references).toHaveLength(2);
    expect(backreferences).toHaveLength(2);
    expect(definitions).toHaveLength(2);
    expect(labels).toHaveLength(2);
    expect(new Set(references.map((reference) => reference.id)).size).toBe(2);
    expect(new Set(definitions.map((definition) => definition.id)).size).toBe(2);
    expect(new Set(labels.map((label) => label.id)).size).toBe(2);

    const secondReference = references[1]!;
    const secondBackreference = backreferences[1]!;
    const secondDefinition = definitions[1]!;
    const secondLabel = labels[1]!;
    expect(secondReference.target).toBe("");
    expect(secondReference.rel).toBe("");
    expect(secondReference.getAttribute("href")).toBe(`#${secondDefinition.id}`);
    expect(secondReference.getAttribute("aria-describedby")).toBe(secondLabel.id);
    expect(secondBackreference.target).toBe("");
    expect(secondBackreference.rel).toBe("");
    expect(secondBackreference.getAttribute("href")).toBe(`#${secondReference.id}`);
    expect(secondDefinition.tabIndex).toBe(-1);

    await userEvent.click(secondReference);
    expect(window.location.hash).toBe("#/thread-under-test");
    expect(document.activeElement).toBe(secondDefinition);
    await userEvent.click(secondBackreference);
    expect(window.location.hash).toBe("#/thread-under-test");
    expect(document.activeElement).toBe(secondReference);
  });

  it("returns repeated references to their exact callsite", async () => {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#/repeated-reference-test`,
    );
    const mounted = await render(
      <main data-testid="repeated-footnote-host">
        <ChatMarkdown text={"First.[^1] Second.[^1]\n\n[^1]: Note"} cwd={undefined} />
      </main>,
    );
    const host = mounted.getByTestId("repeated-footnote-host").element();
    const references = Array.from(host.querySelectorAll<HTMLAnchorElement>("a[data-footnote-ref]"));
    const backreferences = Array.from(
      host.querySelectorAll<HTMLAnchorElement>("a[data-footnote-backref]"),
    );
    const definition = host.querySelector<HTMLElement>("section[data-footnotes] li");

    expect(references).toHaveLength(2);
    expect(backreferences).toHaveLength(2);
    expect(definition).not.toBeNull();
    expect(backreferences[1]!.getAttribute("href")).toBe(`#${references[1]!.id}`);
    expect(backreferences[1]!.getAttribute("aria-label")).toBe("Back to reference 1-2");

    await userEvent.click(references[1]!);
    expect(window.location.hash).toBe("#/repeated-reference-test");
    expect(document.activeElement).toBe(definition);
    await userEvent.click(backreferences[1]!);
    expect(window.location.hash).toBe("#/repeated-reference-test");
    expect(document.activeElement).toBe(references[1]);
  });

  it("leaves unrelated fragments on the generic markdown link path", async () => {
    const mounted = await render(
      <main data-testid="generic-fragment-host">
        <ChatMarkdown text={"[Jump](#unrelated-target)"} cwd={undefined} />
      </main>,
    );
    const link = mounted
      .getByTestId("generic-fragment-host")
      .element()
      .querySelector<HTMLAnchorElement>('a[href="#unrelated-target"]');

    expect(link).not.toBeNull();
    expect(link!.target).toBe("_blank");
    expect(link!.rel).toBe("noopener noreferrer");
  });
});
