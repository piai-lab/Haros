// FILE: FileDiffSharedHeader.browser.tsx
// Purpose: Shared DiffPanel disclosure/action and GitPanel static-header browser regressions.
// Layer: Vitest browser tests

import "../index.css";

import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const localeHarness = vi.hoisted(() => ({ localePreference: "en" }));

vi.mock("../localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../localPreferences")>()),
  useLocalPreferences: () => ({
    preferences: { localePreference: localeHarness.localePreference },
  }),
}));

import { I18nProvider } from "../i18n";
import { buildFileDiffRenderKey, getRenderablePatch } from "../lib/diffRendering";
import { DiffPanelFileList } from "./DiffPanelFileList";
import { FileDiffCard, FileDiffSurface } from "./chat/FileDiffView";

const LONG_PATH =
  "src/features/timeline/evidence/a-very-long-directory-name/another-long-directory/result.ts";
const PATCH = [
  `diff --git a/${LONG_PATH} b/${LONG_PATH}`,
  "index 1111111..2222222 100644",
  `--- a/${LONG_PATH}`,
  `+++ b/${LONG_PATH}`,
  "@@ -1,80 +1,80 @@",
  ...Array.from({ length: 80 }, (_, index) => `-old selectable line ${index + 1}`),
  ...Array.from({ length: 80 }, (_, index) => `+new selectable line ${index + 1}`),
  "",
].join("\n");
const RENDERABLE = getRenderablePatch(PATCH, "shared-header:browser");

if (RENDERABLE?.kind !== "files" || !RENDERABLE.files[0]) {
  throw new Error("Shared header browser fixture must parse as one file.");
}
const FILE = RENDERABLE.files[0];
const FILE_KEY = buildFileDiffRenderKey(FILE);

function deepTextNodes(root: ParentNode): Text[] {
  const textNodes: Text[] = [];
  for (const node of root.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node as Text);
      continue;
    }
    if (node instanceof Element) {
      textNodes.push(...deepTextNodes(node));
      if (node.shadowRoot) textNodes.push(...deepTextNodes(node.shadowRoot));
    }
  }
  return textNodes;
}

function SharedHeaderHarness(props: {
  onReferenceInChat: (path: string) => void;
  onAskWhyChanged: (path: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <I18nProvider>
      <main className="h-[620px] w-[480px] overflow-hidden" data-shared-header-host="">
        <section className="h-[300px] min-h-0" data-diff-panel-shape="">
          <DiffPanelFileList
            renderableFiles={[FILE]}
            resolvedTheme="light"
            diffRenderMode="stacked"
            diffWordWrap={false}
            workspaceRoot={null}
            collapsedFiles={collapsed ? new Set([FILE_KEY]) : new Set()}
            onToggleFileCollapsed={() => setCollapsed((value) => !value)}
            chatActions={props}
          />
        </section>
        <section className="h-[300px] min-h-0" data-git-panel-shape="">
          <FileDiffSurface className="h-full min-h-0 overflow-auto px-2 py-2">
            <FileDiffCard fileDiff={FILE} theme="light" />
          </FileDiffSurface>
        </section>
      </main>
    </I18nProvider>
  );
}

describe("shared diff file header", () => {
  afterEach(() => {
    localeHarness.localePreference = "en";
    document.getSelection()?.removeAllRanges();
    document.body.innerHTML = "";
  });

  it("keeps DiffPanel actions independent from disclosure, scroll, and code selection", async () => {
    const onReferenceInChat = vi.fn();
    const onAskWhyChanged = vi.fn();
    const screen = await render(
      <SharedHeaderHarness
        onReferenceInChat={onReferenceInChat}
        onAskWhyChanged={onAskWhyChanged}
      />,
    );

    try {
      const panel = document.querySelector<HTMLElement>('[data-diff-panel-shape=""]')!;
      await expect.poll(() => panel.querySelector("[data-diff-file-header]") !== null).toBe(true);
      const currentDisclosure = () =>
        panel.querySelector<HTMLButtonElement>("[data-diff-file-header] button[aria-expanded]")!;
      let disclosure = currentDisclosure();
      const currentActions = () =>
        panel.querySelector<HTMLButtonElement>('button[aria-label="File actions"]')!;
      const scrollRoot = panel.querySelector<HTMLElement>(".diff-render-surface")!;

      disclosure.click();
      await expect.poll(() => currentDisclosure().getAttribute("aria-expanded")).toBe("false");
      disclosure = currentDisclosure();
      disclosure.click();
      await expect.poll(() => currentDisclosure().getAttribute("aria-expanded")).toBe("true");
      disclosure = currentDisclosure();
      disclosure.focus();

      scrollRoot.scrollTop = 120;
      scrollRoot.dispatchEvent(new Event("scroll"));
      const scrollTopBeforeAction = scrollRoot.scrollTop;

      await expect
        .poll(() =>
          deepTextNodes(panel).some((node) => node.nodeValue?.includes("old selectable line")),
        )
        .toBe(true);
      const textNode = deepTextNodes(panel).find((node) =>
        node.nodeValue?.includes("old selectable line"),
      );
      expect(textNode).toBeDefined();
      const range = document.createRange();
      range.selectNodeContents(textNode!);
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      expect(selection?.toString()).toContain("old selectable line");
      textNode!.parentElement?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true }),
      );
      expect(currentDisclosure().getAttribute("aria-expanded")).toBe("true");

      await userEvent.click(currentActions());
      await expect
        .poll(() =>
          Array.from(document.querySelectorAll<HTMLElement>("[role=menuitem]")).some((item) =>
            item.textContent?.includes("Reference in Chat"),
          ),
        )
        .toBe(true);
      expect(currentDisclosure().getAttribute("aria-expanded")).toBe("true");
      expect(scrollRoot.scrollTop).toBe(scrollTopBeforeAction);

      const referenceAction = Array.from(
        document.querySelectorAll<HTMLElement>("[role=menuitem]"),
      ).find((item) => item.textContent?.includes("Reference in Chat"));
      referenceAction?.click();
      expect(onReferenceInChat).toHaveBeenCalledWith(LONG_PATH);
      expect(onAskWhyChanged).not.toHaveBeenCalled();
      expect(currentDisclosure().getAttribute("aria-expanded")).toBe("true");
    } finally {
      await screen.unmount();
    }
  });

  it.each(["en", "zh-CN"])(
    "keeps the GitPanel-shaped header static and the 480x620 %s surface bounded",
    async (localePreference) => {
      localeHarness.localePreference = localePreference;
      const screen = await render(
        <SharedHeaderHarness onReferenceInChat={() => {}} onAskWhyChanged={() => {}} />,
      );

      try {
        const host = document.querySelector<HTMLElement>('[data-shared-header-host=""]')!;
        const gitShape = host.querySelector<HTMLElement>('[data-git-panel-shape=""]')!;
        await expect
          .poll(() => gitShape.querySelector("[data-diff-file-header]") !== null)
          .toBe(true);
        const header = gitShape.querySelector<HTMLElement>("[data-diff-file-header]")!;
        expect(header.dataset.diffFileHeaderInteractive).toBe("false");
        expect(header.querySelector("button[aria-expanded]")).toBeNull();
        expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
          document.documentElement.clientWidth,
        );
      } finally {
        await screen.unmount();
      }
    },
  );
});
