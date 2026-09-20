import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { installVaultCapture } from "betterwright/capture";
import type { BrowserAutomationVisibleRuntime } from "../browserManager";
import { BrowserVaultError } from "@harnessos/contracts";
import { BROWSER_VAULT_PROMPT_TTL_MS, BrowserVault } from "./browserVault";

/**
 * Structural stand-ins for the Playwright surface the capture sensor calls:
 * context.pages/on("page")/off("page")/newCDPSession and page.isClosed/once("close").
 * Haros's Electron tabs are not Playwright objects, but the sensor only calls
 * those members, so the shim satisfies it at runtime.
 */
export interface CapturePageShim {
  readonly id: string;
  isClosed(): boolean;
  once(event: "close", listener: () => void): unknown;
}

export interface CaptureContextShim {
  pages(): CapturePageShim[];
  on(event: "page", callback: (page: CapturePageShim) => void): void;
  off(event: "page", callback: (page: CapturePageShim) => void): void;
  newCDPSession(page: CapturePageShim): Promise<{
    send(method: string, parameters?: unknown): Promise<unknown>;
    on(event: string, callback: (parameters: unknown) => void): void;
    detach(): Promise<void>;
  }>;
}

type CaptureInstallationContext = Parameters<typeof installVaultCapture>[0];

class NativeCapturePage extends EventEmitter implements CapturePageShim {
  readonly id = randomUUID();
  closed = false;
  lastAgentActivity = 0;
  generation = 0;
  approved: { generation: number; origin: string; username: string } | undefined;
  constructor(readonly runtime: BrowserAutomationVisibleRuntime) {
    super();
  }
  isClosed(): boolean {
    return this.closed || this.runtime.webContents.isDestroyed();
  }
  close(): void {
    this.closed = true;
    this.emit("close");
  }
}

/** Sensors run only in managed browser pages, never the application renderer. */
export class BrowserVaultCapture {
  private readonly pages = new Set<NativeCapturePage>();
  private readonly pageListeners = new Set<(page: CapturePageShim) => void>();
  private capture: ReturnType<typeof installVaultCapture> | undefined;
  private updating = Promise.resolve();
  private disposed = false;
  private installationGeneration = 0;
  private readonly unsubscribe: () => void;

  constructor(private readonly vault: BrowserVault) {
    this.unsubscribe = vault.onChanged(() => this.refresh());
    this.refresh();
  }

  register(runtime: BrowserAutomationVisibleRuntime): () => void {
    const page = new NativeCapturePage(runtime);
    this.pages.add(page);
    for (const listener of this.pageListeners) listener(page);
    const invalidate = () => {
      page.generation++;
      page.approved = undefined;
      this.vault.dismissPagePrompts(runtime.threadId, runtime.tabId);
    };
    const navigation = (_event: unknown, _url: string, _inPlace: boolean, isMainFrame: boolean) => {
      if (isMainFrame) invalidate();
    };
    runtime.webContents.on("did-start-navigation", navigation);
    return () => {
      runtime.webContents.removeListener("did-start-navigation", navigation);
      invalidate();
      page.close();
      this.pages.delete(page);
    };
  }

  noteAgentActivity(runtime: BrowserAutomationVisibleRuntime): void {
    for (const page of this.pages) {
      if (page.runtime.webContents === runtime.webContents) page.lastAgentActivity = Date.now();
    }
  }

  noteHumanActivity(threadId: string): void {
    for (const page of this.pages) {
      if (page.runtime.threadId === threadId) page.lastAgentActivity = 0;
    }
  }

  private invalidateInstallation(): void {
    this.installationGeneration++;
    for (const page of this.pages) {
      page.generation++;
      page.approved = undefined;
      this.vault.dismissPagePrompts(page.runtime.threadId, page.runtime.tabId);
    }
  }

  private refresh(): void {
    this.updating = this.updating
      .then(async () => {
        const { settings, protection } = await this.vault.snapshot();
        const captureEnabled = settings.offerSave && !protection.locked;
        if (this.disposed || Boolean(this.capture) === captureEnabled) return;
        if (!captureEnabled) {
          this.invalidateInstallation();
          await this.capture?.dispose();
          this.capture = undefined;
          return;
        }
        // The public API requires a full Playwright context. Our narrower
        // Electron adapter is exercised against the actual upstream sensor in
        // browserVaultCapture.runtime.test.ts and the Electron smoke test.
        const context = this.context();
        const installation = ++this.installationGeneration;
        this.capture = installVaultCapture(context as unknown as CaptureInstallationContext, {
          sessionForPage: (page) => page as unknown as NativeCapturePage,
          vaultCallAtOrigin: async (session, origin, action, payload) => {
            if (this.disposed || installation !== this.installationGeneration) return {};
            if (
              !(session instanceof NativeCapturePage) ||
              session.isClosed() ||
              new URL(session.runtime.webContents.getURL()).origin !== origin
            )
              throw new Error("Browser page is unavailable.");
            if (action === "list") {
              const logins = await this.vault.listLogins();
              return { credentials: logins.filter((login) => login.origin === origin) };
            }
            if (action !== "save") throw new Error("Unsupported capture operation.");
            const { username, password, label } = payload;
            if (
              typeof username !== "string" ||
              typeof password !== "string" ||
              typeof label !== "string"
            )
              throw new Error("Invalid captured login.");
            if (
              !session.approved ||
              session.approved.generation !== session.generation ||
              session.approved.origin !== origin ||
              session.approved.username !== username
            )
              return {};
            const generation = session.generation;
            session.approved = undefined;
            await this.vault.saveCaptured(
              origin,
              { username, password, label, deferToPending: true },
              Date.now() - session.lastAgentActivity < 5000 ? "agent" : "user",
              () =>
                !this.disposed &&
                installation === this.installationGeneration &&
                !session.isClosed() &&
                session.generation === generation &&
                new URL(session.runtime.webContents.getURL()).origin === origin,
            );
            return {};
          },
          trackSecret: (secret) => this.vault.trackSecret(secret),
          isHeaded: () => true,
          lastModelActivity: () => Number.NaN,
          promptTtlMs: BROWSER_VAULT_PROMPT_TTL_MS,
          shouldCapture: (input) => this.vault.shouldOfferSave(input),
          requestSave: async ({ page, origin, username, mode }) => {
            const target = page as unknown as NativeCapturePage;
            if (
              this.disposed ||
              installation !== this.installationGeneration ||
              !(target instanceof NativeCapturePage) ||
              target.isClosed() ||
              new URL(target.runtime.webContents.getURL()).origin !== origin
            )
              return "dismiss";
            const generation = target.generation;
            const choice = await this.vault.askSave({
              threadId: target.runtime.threadId,
              tabId: target.runtime.tabId,
              origin,
              username,
              mode,
            });
            if (
              this.disposed ||
              installation !== this.installationGeneration ||
              target.isClosed() ||
              target.generation !== generation ||
              new URL(target.runtime.webContents.getURL()).origin !== origin
            )
              return "dismiss";
            if (choice === "save") target.approved = { generation, origin, username };
            return choice;
          },
          matchMode: "exact-origin",
          onError: () => {
            if (!this.disposed && installation === this.installationGeneration)
              this.vault.reportCaptureFailure();
          },
          onReady: () => {
            if (!this.disposed && installation === this.installationGeneration)
              this.vault.reportCaptureReady();
          },
        });
      })
      .catch(() => this.vault.reportCaptureFailure());
  }

  async retry(): Promise<void> {
    this.invalidateInstallation();
    this.updating = this.updating
      .catch(() => {})
      .then(async () => {
        if (this.disposed) throw new BrowserVaultError("unavailable");
        await this.capture?.dispose();
        this.capture = undefined;
      });
    await this.updating;
    this.refresh();
    await this.updating;
    const status = await this.vault.snapshot();
    if (!this.capture && status.settings.offerSave && !status.protection.locked)
      throw new BrowserVaultError("capture_failed");
  }

  private context(): CaptureContextShim {
    return {
      pages: () => [...this.pages],
      on: (_event: "page", callback: (page: CapturePageShim) => void) => {
        this.pageListeners.add(callback);
      },
      off: (_event: "page", callback: (page: CapturePageShim) => void) => {
        this.pageListeners.delete(callback);
      },
      newCDPSession: async (page) => {
        if (!(page instanceof NativeCapturePage) || page.isClosed())
          throw new Error("Browser page is unavailable.");
        const { webContents } = page.runtime;
        if (!webContents.debugger.isAttached()) webContents.debugger.attach("1.3");
        const info = (await webContents.debugger.sendCommand("Target.getTargetInfo")) as {
          targetInfo: { targetId: string };
        };
        const { sessionId } = (await webContents.debugger.sendCommand("Target.attachToTarget", {
          targetId: info.targetInfo.targetId,
          flatten: true,
        })) as { sessionId: string };
        const events = new EventEmitter();
        const onMessage = (
          _event: unknown,
          method: string,
          parameters: unknown,
          sourceSession?: string,
        ) => {
          if (sourceSession === sessionId) {
            try {
              events.emit(method, parameters);
            } catch {
              this.vault.reportCaptureFailure();
            }
          }
        };
        webContents.debugger.on("message", onMessage);
        return {
          send: (method: string, parameters?: Record<string, unknown>) =>
            webContents.debugger.sendCommand(method, parameters, sessionId),
          on: (event: string, callback: (parameters: unknown) => void) =>
            void events.on(event, callback),
          detach: async () => {
            events.removeAllListeners();
            webContents.debugger.removeListener("message", onMessage);
            if (!webContents.isDestroyed())
              await webContents.debugger
                .sendCommand("Target.detachFromTarget", { sessionId })
                .catch(() => {});
          },
        };
      },
    };
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.invalidateInstallation();
    this.unsubscribe();
    await this.updating;
    await this.capture?.dispose();
    for (const page of this.pages) page.close();
    this.pages.clear();
    this.pageListeners.clear();
  }
}
