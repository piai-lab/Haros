// FILE: BrowserI18n.browser.tsx
// Purpose: Proves Browser-owned controls render from the active product locale.
// Layer: Vitest browser test

import "../index.css";

import { ThreadId, type BrowserAnnotationMethods } from "@harnessos/contracts";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "zh-CN" },
}));

vi.mock("../localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

import type { BrowserAnnotationDraft } from "../lib/browserAnnotations";
import { I18nProvider } from "../i18n";
import { BrowserAnnotationButton } from "./BrowserPanel";
import { useBrowserAnnotations } from "./browser/useBrowserAnnotations";
import { BrowserAnnotationStrip } from "./chat/BrowserAnnotationStrip";

const THREAD_ID = ThreadId.makeUnsafe("browser-i18n-thread");

function BrowserLocaleHarness() {
  const methods: BrowserAnnotationMethods = {
    start: vi.fn(async () => {
      throw new Error("not used");
    }),
    cancel: vi.fn(async () => {}),
    syncMarkers: vi.fn(async () => {}),
    onEvent: () => () => {},
  };
  const controller = useBrowserAnnotations({
    methods,
    threadId: THREAD_ID,
    activeTabId: "tab-1",
    browserStateVersion: 1,
    enabled: true,
    annotations: [],
    addAnnotation: () => true,
    onError: () => {},
  });
  const annotations: BrowserAnnotationDraft[] = Array.from({ length: 3 }, (_, index) => ({
    id: `annotation-${index + 1}`,
    ordinal: index + 1,
    tabId: "tab-1",
    source: { url: `https://example.test/${index + 1}`, pageTitle: `Page ${index + 1}` },
    selector: `#target-${index + 1}`,
    tagName: "button",
    role: "button",
    name: `Target ${index + 1}`,
    text: null,
    fingerprint: `button|target-${index + 1}`,
    comment: `Comment ${index + 1}`,
    capturedAt: "2026-08-10T00:00:00.000Z",
  }));

  return (
    <>
      <BrowserAnnotationButton controller={controller} disabled={false} />
      <BrowserAnnotationStrip annotations={annotations} onRemove={() => {}} />
    </>
  );
}

describe("Browser locale", () => {
  it("localizes Browser-owned actions while preserving page content", async () => {
    harness.settings.localePreference = "zh-CN";
    const screen = await render(
      <I18nProvider>
        <BrowserLocaleHarness />
      </I18nProvider>,
    );

    await expect.element(screen.getByRole("button", { name: "标注页面" })).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "显示另外 1 个浏览器标注" }))
      .toBeVisible();
    await expect.element(screen.getByText("Comment 1")).toBeVisible();
  });
});
