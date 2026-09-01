import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { _electron as electron, expect, test, type ElectronApplication } from "playwright/test";

import { startVisibleBrowserFixtureSite } from "./fixtures/siteServer";

const WEB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(WEB_DIR, "../..");
const DESKTOP_DIR = resolve(REPO_ROOT, "apps/desktop");
const requireFromDesktop = createRequire(resolve(DESKTOP_DIR, "package.json"));

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
  const closing = application.close();
  if (!(await waitForSettlement(closing, 5_000))) {
    application.process().kill("SIGKILL");
    await waitForSettlement(closing, 2_000);
  }
}

test("Engine Web Surface lease survives Renderer reload and deletion seals native replay", async () => {
  const mainPath = process.env.HARNESSOS_E2E_ELECTRON_MAIN;
  const annotationPreloadPath = process.env.HARNESSOS_E2E_BROWSER_ANNOTATION_PRELOAD;
  if (!mainPath || !annotationPreloadPath) {
    throw new Error("Electron E2E bundles were not prepared.");
  }
  const site = await startVisibleBrowserFixtureSite();
  const isolatedHome = mkdtempSync(join(tmpdir(), "haros-engine-web-surface-e2e-"));
  const pipePath = join(isolatedHome, "browser-host.sock");
  const capability = "engine-web-surface-" + crypto.randomUUID() + crypto.randomUUID();
  const threadId = "thread-engine-web-surface-" + crypto.randomUUID();
  const shellPath = resolve(WEB_DIR, "e2e/fixtures/visibleBrowserShell.html");
  const executablePath = requireFromDesktop("electron") as string;
  const electronApp = await electron.launch({
    executablePath,
    args: [mainPath],
    cwd: DESKTOP_DIR,
    env: {
      ...process.env,
      HARNESSOS_HOME: isolatedHome,
      HARNESSOS_BROWSER_HOST_PIPE_PATH: pipePath,
      HARNESSOS_BROWSER_HOST_CAPABILITY: capability,
      HARNESSOS_E2E_SHELL_PATH: shellPath,
      HARNESSOS_E2E_THREAD_ID: threadId,
      HARNESSOS_E2E_BROWSER_ANNOTATION_PRELOAD: annotationPreloadPath,
    },
  });

  const callManager = <T>(method: string, input?: unknown): Promise<T> =>
    electronApp.evaluate(
      async (_electron, request) => {
        const fixture = (
          globalThis as typeof globalThis & {
            __harnessosVisibleBrowserE2E: {
              browserManager: Record<string, (...args: unknown[]) => unknown>;
            };
          }
        ).__harnessosVisibleBrowserE2E;
        const operation = fixture.browserManager[request.method];
        if (typeof operation !== "function") {
          throw new Error("Missing Browser manager operation: " + request.method);
        }
        return (await operation.call(
          fixture.browserManager,
          ...(request.input === undefined ? [] : [request.input]),
        )) as T;
      },
      { method, input },
    );

  try {
    const page = await electronApp.firstWindow();
    await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
    await callManager("open", { threadId, initialUrl: site.initialUrl });
    await electronApp.evaluate(() => {
      (
        globalThis as typeof globalThis & {
          __harnessosVisibleBrowserE2E: { setPanelRevealEnabled(enabled: boolean): void };
        }
      ).__harnessosVisibleBrowserE2E.setPanelRevealEnabled(true);
    });

    const expiresAt = Date.now() + 60_000;
    const first = await callManager<{
      presentationId: string;
      tabId: string;
    }>("presentEngineWebSurface", {
      threadId,
      surfaceId: "surface-one",
      url: site.appUrl,
      title: "Haros Web Access 1",
      expiresAt,
    });
    await callManager("getEngineWebSurfaceRuntime", {
      threadId,
      surfaceId: "surface-one",
    });
    await electronApp.evaluate(() => {
      (
        globalThis as typeof globalThis & {
          __harnessosVisibleBrowserE2E: { setPanelRevealEnabled(enabled: boolean): void };
        }
      ).__harnessosVisibleBrowserE2E.setPanelRevealEnabled(true);
    });
    await expect(page.locator("html")).toHaveAttribute("data-native-runtime-tab-id", first.tabId);

    const second = await callManager<{
      presentationId: string;
      tabId: string;
    }>("presentEngineWebSurface", {
      threadId,
      surfaceId: "surface-two",
      url: site.nextUrl,
      title: "Haros Web Access 2",
      expiresAt,
    });
    expect(second.presentationId).toBe(first.presentationId);
    await callManager("getEngineWebSurfaceRuntime", {
      threadId,
      surfaceId: "surface-two",
    });
    await electronApp.evaluate(() => {
      (
        globalThis as typeof globalThis & {
          __harnessosVisibleBrowserE2E: { setPanelRevealEnabled(enabled: boolean): void };
        }
      ).__harnessosVisibleBrowserE2E.setPanelRevealEnabled(true);
    });
    await expect(page.locator("html")).toHaveAttribute("data-native-runtime-tab-id", second.tabId);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
    await expect(page.locator("html")).toHaveAttribute("data-native-runtime-tab-id", second.tabId);
    const replay = await callManager<
      Array<{ presentationId: string; surfaceId: string; tabId: string }>
    >("listEngineWebSurfacePresentations");
    expect(replay).toHaveLength(2);
    expect(replay.map((item) => item.surfaceId).sort()).toEqual(["surface-one", "surface-two"]);

    const suppressed = await callManager<Array<{ presentationId: string }>>(
      "suppressEngineWebSurfacePresentationsForThreads",
      [threadId],
    );
    expect(suppressed).toEqual([{ presentationId: first.presentationId, threadId }]);
    expect(await callManager("listEngineWebSurfacePresentations")).toEqual([]);

    await callManager("settleEngineWebSurface", { threadId, surfaceId: "surface-one" });
    expect(
      await callManager("getEngineWebSurfacePresentationStatus", {
        threadId,
        surfaceId: "surface-two",
        tabId: second.tabId,
      }),
    ).not.toBe("unavailable");
    await callManager("settleEngineWebSurface", { threadId, surfaceId: "surface-two" });
    expect(await callManager("listPendingEngineWebSurfacePresentationReleases")).toEqual([
      {
        presentationId: first.presentationId,
        threadId,
        disposition: "preserve",
        suppressedByUser: true,
      },
    ]);
    await callManager("acknowledgeEngineWebSurfacePresentationRelease", {
      presentationId: "stale-presentation",
      threadId,
    });
    expect(await callManager("listPendingEngineWebSurfacePresentationReleases")).toHaveLength(1);
    await callManager("acknowledgeEngineWebSurfacePresentationRelease", {
      presentationId: first.presentationId,
      threadId,
    });
    expect(await callManager("listPendingEngineWebSurfacePresentationReleases")).toEqual([]);

    const deleted = await callManager<{ tabId: string }>("presentEngineWebSurface", {
      threadId,
      surfaceId: "surface-deleted",
      url: site.appUrl,
      title: "Haros Web Access deleted",
      expiresAt,
    });
    await callManager("getEngineWebSurfaceRuntime", {
      threadId,
      surfaceId: "surface-deleted",
    });
    await callManager("closeDeletedThreadResources", { threadId });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-native-runtime-tab-id",
      deleted.tabId,
    );
    await expect(
      callManager("reopenEngineWebSurface", { threadId, surfaceId: "surface-deleted" }),
    ).rejects.toThrow(/deleted thread|no longer pending/i);
    expect(await callManager("listEngineWebSurfacePresentations")).toEqual([]);
  } finally {
    await closeElectronApplication(electronApp);
    await site.close();
    rmSync(isolatedHome, { recursive: true, force: true });
  }
});
