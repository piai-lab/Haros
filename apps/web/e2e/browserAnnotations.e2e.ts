import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { BrowserAnnotationEvent, BrowserAnnotationTheme } from "@omnimind/contracts";
import { _electron as electron, expect, test, type ElectronApplication } from "playwright/test";

import { startVisibleBrowserFixtureSite } from "./fixtures/siteServer";

const WEB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESKTOP_DIR = resolve(WEB_DIR, "../desktop");
const requireFromDesktop = createRequire(resolve(DESKTOP_DIR, "package.json"));
const DARK_ANNOTATION_THEME: BrowserAnnotationTheme = {
  mode: "dark",
  accent: "rgb(96, 115, 204)",
  surface: "rgb(27, 27, 29)",
  text: "rgb(250, 250, 250)",
  mutedText: "rgb(161, 161, 170)",
  border: "rgb(63, 63, 70)",
  focusBorder: "rgb(96, 115, 204)",
  primary: "rgb(250, 250, 250)",
  primaryText: "rgb(24, 24, 27)",
};

function waitForSettlement(promise: Promise<unknown>, timeoutMs: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise(false), timeoutMs);
    timer.unref();
    void promise.finally(() => {
      clearTimeout(timer);
      resolvePromise(true);
    });
  });
}

async function closeElectronApplication(application: ElectronApplication): Promise<void> {
  let closeError: unknown;
  const closing = application.close().catch((error: unknown) => {
    closeError = error;
  });
  if (!(await waitForSettlement(closing, 5_000))) {
    application.process().kill("SIGKILL");
    await waitForSettlement(closing, 2_000);
  }
  if (closeError) throw closeError;
}

test("a real Electron guest commits and reprojects a continuous annotation session", async () => {
  const mainPath = process.env.OMNIMIND_E2E_ELECTRON_MAIN;
  const browserPanelPreloadPath = process.env.OMNIMIND_E2E_BROWSER_PANEL_PRELOAD;
  const annotationPreloadPath = process.env.OMNIMIND_E2E_BROWSER_ANNOTATION_PRELOAD;
  if (!mainPath || !browserPanelPreloadPath || !annotationPreloadPath) {
    throw new Error("Electron annotation E2E bundles were not prepared.");
  }

  const site = await startVisibleBrowserFixtureSite();
  const annotatedLiveUrl = `${site.appUrl}?token=private-annotation`;
  const home = mkdtempSync(join(tmpdir(), "omnimind-browser-annotations-e2e-"));
  const threadId = `thread-browser-annotations-${crypto.randomUUID()}`;
  const shellPath = resolve(WEB_DIR, "e2e/fixtures/browserPanelShell.html");
  const executablePath = requireFromDesktop("electron") as string;
  const electronApp = await electron.launch({
    executablePath,
    args: [mainPath],
    cwd: DESKTOP_DIR,
    env: {
      ...process.env,
      HOME: home,
      OMNIMIND_HOME: home,
      OMNIMIND_E2E_SHELL_PATH: shellPath,
      OMNIMIND_E2E_THREAD_ID: threadId,
      OMNIMIND_E2E_INITIAL_URL: annotatedLiveUrl,
      OMNIMIND_E2E_BROWSER_PANEL_PRELOAD: browserPanelPreloadPath,
      OMNIMIND_E2E_BROWSER_ANNOTATION_PRELOAD: annotationPreloadPath,
    },
  });

  try {
    const page = await electronApp.firstWindow();
    await expect
      .poll(() =>
        page.locator("html").evaluate((element) => {
          const html = element as HTMLElement;
          return html.dataset.rendererError ?? html.dataset.shellReady ?? null;
        }),
      )
      .toBe("true");
    await expect(page.locator("webview")).toBeVisible();
    const readActiveTabId = () =>
      electronApp.evaluate((_electron, scopedThreadId) => {
        const fixture = (
          globalThis as typeof globalThis & {
            __omnimindVisibleBrowserE2E: {
              browserHost: {
                getState(value: { threadId: string }): { activeTabId: string | null };
              };
            };
          }
        ).__omnimindVisibleBrowserE2E;
        return fixture.browserHost.getState({ threadId: scopedThreadId }).activeTabId;
      }, threadId);
    await expect.poll(readActiveTabId, { timeout: 5_000 }).not.toBeNull();
    const tabId = await readActiveTabId();
    if (typeof tabId !== "string") throw new Error("BrowserPanel did not publish an active tab.");
    const webviewRect = await page.locator("webview").boundingBox();
    if (!webviewRect) throw new Error("Visible annotation guest lost its bounds.");

    /**
     * Runs a script inside the exact guest currently owned by DesktopBrowserHost.
     */
    const runInGuest = async (script: string): Promise<unknown> =>
      electronApp.evaluate(
        (_electron, input) => {
          const fixture = (
            globalThis as typeof globalThis & {
              __omnimindVisibleBrowserE2E: {
                browserHost: {
                  getVisibleAutomationRuntime(value: { threadId: string; tabId: string }): {
                    webContents: { executeJavaScript(script: string): Promise<unknown> };
                  };
                };
              };
            }
          ).__omnimindVisibleBrowserE2E;
          return fixture.browserHost
            .getVisibleAutomationRuntime({ threadId: input.threadId, tabId: input.tabId })
            .webContents.executeJavaScript(input.script);
        },
        { threadId, tabId, script },
      );
    const clickInGuest = async (x: number, y: number): Promise<void> => {
      await page.mouse.click(webviewRect.x + x, webviewRect.y + y);
    };
    const typeInGuest = async (text: string): Promise<void> =>
      electronApp.evaluate(
        (_electron, input) => {
          const fixture = (
            globalThis as typeof globalThis & {
              __omnimindVisibleBrowserE2E: {
                browserHost: {
                  getVisibleAutomationRuntime(value: { threadId: string; tabId: string }): {
                    webContents: { insertText(value: string): Promise<void> };
                  };
                };
              };
            }
          ).__omnimindVisibleBrowserE2E;
          return fixture.browserHost
            .getVisibleAutomationRuntime({ threadId: input.threadId, tabId: input.tabId })
            .webContents.insertText(input.text);
        },
        { threadId, tabId, text },
      );
    const pressInGuest = async (
      keyCode: "Enter" | "Tab",
      modifiers: Array<"meta" | "control"> = [],
    ): Promise<void> =>
      electronApp.evaluate(
        (_electron, input) => {
          const fixture = (
            globalThis as typeof globalThis & {
              __omnimindVisibleBrowserE2E: {
                browserHost: {
                  getVisibleAutomationRuntime(value: { threadId: string; tabId: string }): {
                    webContents: { sendInputEvent(event: Record<string, unknown>): void };
                  };
                };
              };
            }
          ).__omnimindVisibleBrowserE2E;
          const guest = fixture.browserHost.getVisibleAutomationRuntime({
            threadId: input.threadId,
            tabId: input.tabId,
          }).webContents;
          guest.sendInputEvent({
            type: "keyDown",
            keyCode: input.keyCode,
            modifiers: input.modifiers,
          });
          guest.sendInputEvent({
            type: "keyUp",
            keyCode: input.keyCode,
            modifiers: input.modifiers,
          });
        },
        { threadId, tabId, keyCode, modifiers },
      );
    const waitForAnnotationComposer = async (): Promise<void> => {
      await expect
        .poll(() =>
          runInGuest(
            "document.activeElement === document.querySelector('[data-omnimind-browser-annotations]')",
          ),
        )
        .toBe(true);
    };
    const startAnnotation = async (payload: {
      threadId: string;
      tabId: string;
      theme: BrowserAnnotationTheme;
    }): Promise<unknown> =>
      electronApp.evaluate((_electron, input) => {
        const fixture = (
          globalThis as typeof globalThis & {
            __omnimindVisibleBrowserE2E: {
              browserHost: { startAnnotation(value: typeof input): unknown };
            };
          }
        ).__omnimindVisibleBrowserE2E;
        return fixture.browserHost.startAnnotation(input);
      }, payload);
    const cancelAnnotation = async (payload: { threadId: string; tabId: string }): Promise<void> =>
      electronApp.evaluate((_electron, input) => {
        const fixture = (
          globalThis as typeof globalThis & {
            __omnimindVisibleBrowserE2E: {
              browserHost: { cancelAnnotation(value: typeof input): void };
            };
          }
        ).__omnimindVisibleBrowserE2E;
        fixture.browserHost.cancelAnnotation(input);
      }, payload);
    const syncAnnotationMarkers = async (payload: {
      threadId: string;
      tabId: string;
      version: number;
      markers: Array<Record<string, unknown>>;
    }): Promise<void> =>
      electronApp.evaluate((_electron, input) => {
        const fixture = (
          globalThis as typeof globalThis & {
            __omnimindVisibleBrowserE2E: {
              browserHost: { syncAnnotationMarkers(value: typeof input): void };
            };
          }
        ).__omnimindVisibleBrowserE2E;
        fixture.browserHost.syncAnnotationMarkers(input);
      }, payload);
    /** Every annotation event the host has observed, oldest first. */
    const annotationEvents = async (): Promise<BrowserAnnotationEvent[]> =>
      electronApp.evaluate(() => {
        const fixture = (
          globalThis as typeof globalThis & {
            __omnimindVisibleBrowserE2E: { annotationEvents: BrowserAnnotationEvent[] };
          }
        ).__omnimindVisibleBrowserE2E;
        return fixture.annotationEvents;
      });
    const annotationEventKinds = async (): Promise<string[]> =>
      (await annotationEvents()).map((event) => event.kind);
    const committedAnnotations = async (): Promise<
      Extract<BrowserAnnotationEvent, { kind: "committed" }>[]
    > =>
      (await annotationEvents()).filter(
        (event): event is Extract<BrowserAnnotationEvent, { kind: "committed" }> =>
          event.kind === "committed",
      );

    await expect
      .poll(() => runInGuest("location.href").catch(() => null), {
        timeout: 5_000,
        intervals: [25, 50, 100, 200],
      })
      .toBe(annotatedLiveUrl);

    const viewport = page.locator("[data-omnimind-browser-viewport]");
    const readViewportCssRect = () =>
      viewport.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
    const setRendererZoomFactor = (zoomFactor: number) =>
      electronApp.evaluate((_electron, factor) => {
        const fixture = (
          globalThis as typeof globalThis & {
            __omnimindVisibleBrowserE2E: {
              setRendererZoomFactor(value: number): void;
            };
          }
        ).__omnimindVisibleBrowserE2E;
        fixture.setRendererZoomFactor(factor);
      }, zoomFactor);
    const latestBoundsPublication = () =>
      electronApp.evaluate(() => {
        const fixture = (
          globalThis as typeof globalThis & {
            __omnimindVisibleBrowserE2E: {
              boundsPublications: Array<{
                input: {
                  threadId: string;
                  surface?: "native" | "renderer";
                  bounds: { x: number; y: number; width: number; height: number } | null;
                };
                zoomFactor: number;
              }>;
            };
          }
        ).__omnimindVisibleBrowserE2E;
        return fixture.boundsPublications.at(-1) ?? null;
      });

    const targetRect = (await runInGuest(
      "(() => { const r = document.querySelector('#manual').getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; })()",
    )) as { x: number; y: number; width: number; height: number };
    const sensitiveContainerRect = (await runInGuest(
      "(() => { const r = document.querySelector('#private-editor-wrap').getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; })()",
    )) as { x: number; y: number; width: number; height: number };
    const annotationButton = page.locator(
      'button[aria-label="Annotate page"], button[aria-label="Cancel annotation"]',
    );
    await expect(annotationButton).toBeEnabled();
    await annotationButton.click();
    await expect(annotationButton).toHaveAttribute("aria-label", "Cancel annotation");
    await expect
      .poll(() =>
        runInGuest(
          "document.querySelector('[data-omnimind-browser-annotations][data-interactive]') !== null",
        ).catch(() => false),
      )
      .toBe(true);
    const guestAnnotationSurface = await runInGuest(
      "getComputedStyle(document.querySelector('[data-omnimind-browser-annotations]')).getPropertyValue('--annotation-surface').trim()",
    );
    expect(guestAnnotationSurface).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    expect(guestAnnotationSurface).not.toContain("rgba");

    // The overlay host is discoverable in the page's DOM, so a hostile page can
    // aim synthetic events at it. None of them may steer the picker: the
    // session hides the native cursor, so a page that could drive the bubble
    // would highlight one element while the real pointer sat on another, and a
    // synthetic Enter would publish a half-typed comment.
    const spoofingReachedOverlayHost = await runInGuest(
      "(() => { const host = document.querySelector('[data-omnimind-browser-annotations]'); document.dispatchEvent(new PointerEvent('pointermove', { clientX: 3, clientY: 3, bubbles: true })); document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); host?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return host !== null; })()",
    );
    expect(spoofingReachedOverlayHost).toBe(true);
    const kindsAfterSpoofing = await annotationEventKinds();
    expect(kindsAfterSpoofing).not.toContain("cancelled");
    expect(kindsAfterSpoofing).not.toContain("committed");

    // An element buried too deep to address within the selector bound can never
    // be committed. The picker has to refuse it up front instead of opening a
    // composer whose save would silently turn into a cancel and throw the typed
    // comment away.
    const unanchorableRect = (await runInGuest(
      "(() => { const root = document.createElement('div'); root.setAttribute('data-unanchorable', ''); root.style.cssText = 'position:fixed;left:8px;top:8px;z-index:999;background:rgb(230,230,230)'; let node = root; for (let index = 0; index < 90; index += 1) { const child = document.createElement('div'); node.append(child); node = child; } node.style.cssText = 'padding:14px'; node.textContent = 'deep'; document.body.append(root); const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; })()",
    )) as { x: number; y: number; width: number; height: number };
    await clickInGuest(
      unanchorableRect.x + unanchorableRect.width / 2,
      unanchorableRect.y + unanchorableRect.height / 2,
    );
    expect(
      await runInGuest(
        "document.activeElement !== document.querySelector('[data-omnimind-browser-annotations]')",
      ),
    ).toBe(true);
    await typeInGuest("Never reaches a composer");
    await pressInGuest("Enter");
    const kindsAfterUnanchorable = await annotationEventKinds();
    expect(kindsAfterUnanchorable).not.toContain("cancelled");
    expect(kindsAfterUnanchorable).not.toContain("committed");
    await runInGuest(
      "(() => { document.querySelector('[data-unanchorable]')?.remove(); return true; })()",
    );

    await clickInGuest(targetRect.x + targetRect.width / 2, targetRect.y + targetRect.height / 2);
    await waitForAnnotationComposer();
    await typeInGuest("Make this action clearer");
    await pressInGuest("Tab");
    await pressInGuest("Enter");

    await expect
      .poll(async () => (await committedAnnotations()).length, {
        timeout: 5_000,
        intervals: [25, 50, 100],
      })
      .toBe(1);

    const committedEvent = (await committedAnnotations())[0];
    expect(committedEvent?.annotation).toMatchObject({
      selector: "#manual",
      name: "Manual Playwright action",
      comment: "Make this action clearer",
      source: { url: site.appUrl },
    });
    expect(JSON.stringify(committedEvent)).not.toContain("private-annotation");

    await clickInGuest(
      sensitiveContainerRect.x + 6,
      sensitiveContainerRect.y + sensitiveContainerRect.height / 2,
    );
    await waitForAnnotationComposer();
    await pressInGuest("Tab");
    await pressInGuest("Enter");
    await expect
      .poll(async () => (await committedAnnotations()).length, {
        timeout: 5_000,
        intervals: [25, 50, 100],
      })
      .toBe(2);
    const sensitiveContainerEvent = (await committedAnnotations())[1];
    expect(sensitiveContainerEvent?.annotation).toMatchObject({
      selector: "#private-editor-wrap",
      name: null,
      text: null,
    });
    expect(JSON.stringify(sensitiveContainerEvent)).not.toContain(
      "Private draft must not be captured",
    );

    // A target can stop being addressable between selection and save. That must
    // not end the session as a cancel: the comment the user already typed has to
    // survive so they can re-pick and save it.
    const staleRect = (await runInGuest(
      "(() => { const root = document.createElement('div'); root.setAttribute('data-stale-chain', ''); root.style.cssText = 'position:fixed;left:8px;top:8px;z-index:999;background:rgb(230,230,230)'; let node = root; for (let index = 0; index < 90; index += 1) { const child = document.createElement('div'); node.append(child); node = child; } node.id = 'stale-leaf'; node.style.cssText = 'padding:14px'; node.textContent = 'stale'; document.body.append(root); const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; })()",
    )) as { x: number; y: number; width: number; height: number };
    const clickStaleTarget = async (): Promise<void> => {
      await clickInGuest(staleRect.x + staleRect.width / 2, staleRect.y + staleRect.height / 2);
    };
    await clickStaleTarget();
    await waitForAnnotationComposer();
    await typeInGuest("Kept through a stale target");
    // Dropping the id leaves only the structural selector, which this chain is
    // far too deep to fit inside the contract's bound.
    await runInGuest(
      "(() => { document.getElementById('stale-leaf')?.removeAttribute('id'); return true; })()",
    );
    await pressInGuest("Enter");
    const kindsAfterStaleSave = await annotationEventKinds();
    expect(kindsAfterStaleSave).not.toContain("cancelled");
    expect(kindsAfterStaleSave.filter((kind) => kind === "committed")).toHaveLength(2);

    await runInGuest(
      "(() => { document.querySelector('[data-stale-chain] div:not(:has(div))').id = 'stale-leaf'; return true; })()",
    );
    await clickStaleTarget();
    await waitForAnnotationComposer();
    await pressInGuest("Enter");
    await expect
      .poll(async () => (await committedAnnotations()).length, {
        timeout: 5_000,
        intervals: [25, 50, 100],
      })
      .toBe(3);
    const recoveredEvent = (await committedAnnotations())[2];
    expect(recoveredEvent?.annotation).toMatchObject({
      selector: "#stale-leaf",
      comment: "Kept through a stale target",
    });
    await runInGuest(
      "(() => { document.querySelector('[data-stale-chain]')?.remove(); return true; })()",
    );

    // If a selected element collapses without disconnecting, the hidden
    // composer must release it without allowing Enter to publish an invisible
    // annotation. The typed comment still carries into the next valid pick.
    const collapsingRect = (await runInGuest(
      "(() => { const target = document.createElement('button'); target.id = 'collapsing-target'; target.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:999;padding:14px'; target.textContent = 'collapse'; document.body.append(target); const rect = target.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; })()",
    )) as { x: number; y: number; width: number; height: number };
    const clickCollapsingTarget = async (): Promise<void> => {
      await clickInGuest(
        collapsingRect.x + collapsingRect.width / 2,
        collapsingRect.y + collapsingRect.height / 2,
      );
    };
    await clickCollapsingTarget();
    await waitForAnnotationComposer();
    await typeInGuest("Kept through a collapsed target");
    await runInGuest(
      "(() => { document.getElementById('collapsing-target').style.display = 'none'; return true; })()",
    );
    // Submit immediately, before relying on the next overlay animation frame
    // to notice the collapsed box.
    await pressInGuest("Enter");
    expect(await committedAnnotations()).toHaveLength(3);
    await runInGuest(
      "(() => { document.getElementById('collapsing-target').style.display = 'block'; return true; })()",
    );
    await clickCollapsingTarget();
    await waitForAnnotationComposer();
    await pressInGuest("Enter");
    await expect
      .poll(async () => (await committedAnnotations()).length, {
        timeout: 5_000,
        intervals: [25, 50, 100],
      })
      .toBe(4);
    expect((await committedAnnotations())[3]?.annotation.comment).toBe(
      "Kept through a collapsed target",
    );
    await runInGuest(
      "(() => { document.getElementById('collapsing-target')?.remove(); return true; })()",
    );

    // A long unique ancestor id can make its anchored selector exceed the
    // contract even though the ordinary structural path remains short. Keep
    // walking in that case, and preserve the existing Cmd/Ctrl+Enter shortcut.
    const fallbackSelectorRect = (await runInGuest(
      "(() => { const root = document.createElement('div'); root.id = `anchor-${'x'.repeat(490)}`; root.setAttribute('data-long-anchor', ''); root.style.cssText = 'position:fixed;right:8px;top:8px;z-index:999;background:rgb(230,230,230)'; const target = document.createElement('button'); target.style.cssText = 'padding:14px'; target.textContent = 'fallback'; root.append(target); document.body.append(root); const rect = target.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; })()",
    )) as { x: number; y: number; width: number; height: number };
    await clickInGuest(
      fallbackSelectorRect.x + fallbackSelectorRect.width / 2,
      fallbackSelectorRect.y + fallbackSelectorRect.height / 2,
    );
    await waitForAnnotationComposer();
    await typeInGuest("Fallback selector and shortcut");
    await pressInGuest("Enter", [process.platform === "darwin" ? "meta" : "control"]);
    await expect
      .poll(async () => (await committedAnnotations()).length, {
        timeout: 5_000,
        intervals: [25, 50, 100],
      })
      .toBe(5);
    const fallbackSelectorEvent = (await committedAnnotations())[4];
    expect(fallbackSelectorEvent?.annotation.comment).toBe("Fallback selector and shortcut");
    expect(fallbackSelectorEvent?.annotation.selector).not.toContain("anchor-");
    await runInGuest(
      "(() => { document.querySelector('[data-long-anchor]')?.remove(); return true; })()",
    );

    const manualClicks = await runInGuest("document.body.dataset.manualClicks");
    expect(manualClicks).toBe("0");
    const hostileCapture = await runInGuest(
      "({ capture: globalThis.__annotationHostileCapture, unexpectedKeyups: globalThis.__annotationUnexpectedKeyups })",
    );
    expect(hostileCapture).toEqual({ capture: [], unexpectedKeyups: [] });

    if (!committedEvent) throw new Error("Annotation commit event was not captured.");
    await cancelAnnotation({ threadId, tabId });
    await electronApp.evaluate(
      (_electron, input) => {
        const fixture = (
          globalThis as typeof globalThis & {
            __omnimindVisibleBrowserE2E: {
              browserHost: {
                navigate(value: typeof input): unknown;
              };
            };
          }
        ).__omnimindVisibleBrowserE2E;
        return fixture.browserHost.navigate(input);
      },
      { threadId, tabId, url: site.nextUrl },
    );
    await expect.poll(() => runInGuest("location.href")).toBe(site.nextUrl);
    await electronApp.evaluate(
      (_electron, input) => {
        const fixture = (
          globalThis as typeof globalThis & {
            __omnimindVisibleBrowserE2E: {
              browserHost: {
                resolveAnnotationNavigationTarget(value: {
                  threadId: string;
                  tabId: string;
                  annotationId: string;
                }): { tabId: string; url: string } | null;
                navigate(value: { threadId: string; tabId: string; url: string }): unknown;
              };
            };
          }
        ).__omnimindVisibleBrowserE2E;
        const target = fixture.browserHost.resolveAnnotationNavigationTarget(input);
        if (!target) throw new Error("The committed annotation lost its live navigation target.");
        return fixture.browserHost.navigate({
          threadId: input.threadId,
          tabId: target.tabId,
          url: target.url,
        });
      },
      { threadId, tabId, annotationId: committedEvent.annotation.id },
    );
    await expect.poll(() => runInGuest("location.href")).toBe(annotatedLiveUrl);

    await syncAnnotationMarkers({
      threadId,
      tabId,
      version: 1,
      markers: [
        {
          id: committedEvent.annotation.id,
          ordinal: 1,
          documentKey: committedEvent.document.key,
          source: committedEvent.annotation.source,
          selector: committedEvent.annotation.selector,
          fingerprint: committedEvent.annotation.fingerprint,
        },
      ],
    });
    await expect
      .poll(
        async () =>
          (await annotationEvents()).some(
            (event) =>
              event.kind === "markers-synced" &&
              event.projectedMarkerIds.includes(committedEvent.annotation.id),
          ),
        { timeout: 5_000, intervals: [25, 50, 100] },
      )
      .toBe(true);

    await startAnnotation({
      threadId,
      tabId,
      theme: DARK_ANNOTATION_THEME,
    });
    const markerSyncCountBeforeHash = (await annotationEvents()).filter(
      (event) => event.kind === "markers-synced",
    ).length;
    await runInGuest(
      "history.pushState({}, '', location.pathname + location.search + '#annotation-cancelled')",
    );
    await expect
      .poll(
        async () =>
          (await annotationEvents()).some(
            (event) => event.kind === "cancelled" && event.reason === "navigation",
          ),
        { timeout: 5_000, intervals: [25, 50, 100] },
      )
      .toBe(true);
    await expect
      .poll(
        async () => {
          const markerSyncs = (await annotationEvents()).filter(
            (event): event is Extract<BrowserAnnotationEvent, { kind: "markers-synced" }> =>
              event.kind === "markers-synced",
          );
          const latest = markerSyncs.at(-1);
          return (
            markerSyncs.length > markerSyncCountBeforeHash &&
            latest?.projectedMarkerIds.includes(committedEvent.annotation.id) === true
          );
        },
        { timeout: 5_000, intervals: [25, 50, 100] },
      )
      .toBe(true);
    await clickInGuest(targetRect.x + targetRect.width / 2, targetRect.y + targetRect.height / 2);
    await expect
      .poll(() => runInGuest("document.body.dataset.manualClicks"), {
        timeout: 5_000,
        intervals: [25, 50, 100],
      })
      .toBe("1");

    // This crosses the production BrowserPanel layout effect and desktop IPC:
    // the main process records the exact bounds delivered to DesktopBrowserHost.
    // Run after the pointer journey so Electron's compositor never has to
    // translate an in-flight guest interaction across a host page-zoom change.
    for (const zoomFactor of [0.8, 1.25, 1]) {
      await setRendererZoomFactor(zoomFactor);
      const cssRect = await readViewportCssRect();
      await expect
        .poll(async () => {
          const publication = await latestBoundsPublication();
          const bounds = publication?.input.bounds;
          return Boolean(
            publication &&
            bounds &&
            publication.input.threadId === threadId &&
            publication.input.surface === "renderer" &&
            Math.abs(publication.zoomFactor - zoomFactor) < 0.001 &&
            Math.abs(bounds.x - cssRect.x * zoomFactor) < 0.01 &&
            Math.abs(bounds.y - cssRect.y * zoomFactor) < 0.01 &&
            Math.abs(bounds.width - cssRect.width * zoomFactor) < 0.01 &&
            Math.abs(bounds.height - cssRect.height * zoomFactor) < 0.01,
          );
        })
        .toBe(true);
    }
  } finally {
    await closeElectronApplication(electronApp);
    await site.close();
    rmSync(home, { recursive: true, force: true });
  }
});
