import {
  BetterWright,
  listCookieSourceBrowsers,
  listCookieSourceProfiles,
  NetworkPolicy,
} from "betterwright";
import type {
  BrowserCookieImportInput,
  BrowserCookieImportResult,
  BrowserCookieImportStatus,
} from "@harnessos/contracts";
import type { DesktopBrowserManager } from "../browserManager";
import { harosHostTarget } from "./betterwrightHostTarget";

const SOURCES = new Set(["chrome", "safari", "edge"]);
type Failure = Extract<BrowserCookieImportResult, { ok: false }>;

/** A single import owns the shared browser session until its transport has been revoked. */
export class BrowserCookieImport {
  private active:
    | {
        id: string;
        phase: BrowserCookieImportStatus["phase"];
        interrupt: AbortController;
        done: Promise<BrowserCookieImportResult>;
      }
    | undefined;
  private readonly listeners = new Set<() => void>();
  private disposed = false;
  private unsafe = false;

  constructor(
    private readonly home: string,
    private readonly manager: DesktopBrowserManager,
    private readonly waitForAgents: () => Promise<void>,
    private readonly rememberSessionImport: (
      domains: readonly string[],
      signal: AbortSignal,
    ) => Promise<void> = async () => {},
  ) {}

  async sources() {
    return (await listCookieSourceBrowsers())
      .filter(({ id }) => SOURCES.has(id))
      .map(({ id, name }) => ({ id, name }));
  }

  async profiles(browser: string, timeoutMs = 10_000) {
    if (!SOURCES.has(browser)) throw new Error("Unsupported cookie source.");
    return (await listCookieSourceProfiles(browser, { timeoutMs })).map(({ id, name }) => ({
      id,
      name,
    }));
  }

  import(input: BrowserCookieImportInput): Promise<BrowserCookieImportResult> {
    if (this.disposed || this.unsafe) return Promise.resolve(this.failure("transfer_failed"));
    if (this.active) return Promise.resolve(this.failure("busy"));
    const interrupt = new AbortController();
    const operation = {
      id: input.operationId,
      phase: "checking" as BrowserCookieImportStatus["phase"],
      interrupt,
      done: Promise.resolve(this.failure("cancelled")) as Promise<BrowserCookieImportResult>,
    };
    this.active = operation;
    this.changePhase("checking");
    operation.done = this.run(input, interrupt)
      .then((result) => {
        if (this.unsafe) throw new Error("Browser import cleanup failed.");
        return result;
      })
      .finally(() => {
        if (this.active === operation) this.active = undefined;
        for (const listener of this.listeners) {
          try {
            listener();
          } catch {
            /* A closing renderer cannot keep an import alive. */
          }
        }
      });
    return operation.done;
  }

  status(): BrowserCookieImportStatus | null {
    return this.active ? { operationId: this.active.id, phase: this.active.phase } : null;
  }
  onChanged(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private changePhase(phase: BrowserCookieImportStatus["phase"]): void {
    if (this.active) this.active.phase = phase;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* A closing renderer cannot keep an import alive. */
      }
    }
  }

  async cancel(operationId: string): Promise<void> {
    const operation = this.active;
    if (!operation || operation.id !== operationId) return;
    this.changePhase("stopping");
    operation.interrupt.abort("cancelled");
    await operation.done;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    if (this.active) await this.cancel(this.active.id);
    if (this.unsafe) throw new Error("Browser import cleanup failed.");
  }

  private failure(code: Failure["code"], mayHaveImported = false): Failure {
    return {
      ok: false,
      code,
      mayHaveImported,
      platform:
        process.platform === "darwin"
          ? "macos"
          : process.platform === "win32"
            ? "windows"
            : "linux",
    };
  }

  private async run(
    input: BrowserCookieImportInput,
    interrupt: AbortController,
  ): Promise<BrowserCookieImportResult> {
    const deadline = Date.now() + 60_000;
    const timeout = setTimeout(() => interrupt.abort("timed_out"), 60_000);
    const signal = interrupt.signal;
    let release: (() => void) | undefined;
    let target: ReturnType<typeof harosHostTarget> | undefined;
    let browser: BetterWright | undefined;
    let stopping: Promise<void> | undefined;
    let mayHaveImported = false;
    let persistence: Promise<void> | undefined;
    let removeTargetListeners: (() => void) | undefined;
    const stop = () => {
      stopping ??= Promise.allSettled([
        target?.revokeAll(true),
        browser?.close(),
        persistence?.catch(() => {}),
      ]).then((results) => {
        if (results.some((result) => result.status === "rejected"))
          throw new Error("Import cleanup failed.");
      });
      void stopping.catch(() => {});
    };
    const bounded = async <T>(work: Promise<T>): Promise<T> => {
      let abort!: () => void;
      const cancelled = new Promise<never>((_, reject) => {
        abort = () => reject(new Error("Import interrupted."));
      });
      signal.addEventListener("abort", abort, { once: true });
      try {
        if (signal.aborted) abort();
        return await Promise.race([work, cancelled]);
      } finally {
        signal.removeEventListener("abort", abort);
      }
    };
    signal.addEventListener("abort", stop, { once: true });
    try {
      const runtime = await bounded(this.manager.getCookieImportRuntime(input));
      const origin = input.scope === "site" ? new URL(input.origin) : null;
      if (input.scope === "profile" && input.confirmed !== true)
        return this.failure("transfer_failed");
      const assertTarget = async () => {
        signal.throwIfAborted();
        if (
          (await bounded(this.manager.getCookieImportRuntime(input))).webContents !==
            runtime.webContents ||
          runtime.webContents.isDestroyed() ||
          (origin &&
            (!["https:", "http:"].includes(origin.protocol) ||
              origin.origin !== (input.scope === "site" ? input.origin : null) ||
              new URL(runtime.webContents.getURL()).origin !== origin.origin))
        ) {
          interrupt.abort("target_changed");
          signal.throwIfAborted();
        }
      };
      const navigation = (
        _event: unknown,
        _url: string,
        _inPlace: boolean,
        isMainFrame: boolean,
      ) => {
        if (isMainFrame) interrupt.abort("target_changed");
      };
      const destroyed = () => interrupt.abort("target_changed");
      runtime.webContents.on("did-start-navigation", navigation);
      runtime.webContents.once("destroyed", destroyed);
      removeTargetListeners = () => {
        runtime.webContents.removeListener("did-start-navigation", navigation);
        runtime.webContents.removeListener("destroyed", destroyed);
      };
      await assertTarget();
      const profiles = await bounded(
        this.profiles(input.browser, Math.min(10_000, Math.max(1, deadline - Date.now()))),
      );
      if (!profiles.some(({ id }) => id === input.profile)) return this.failure("source_missing");
      await assertTarget();
      // Only a valid import may interrupt automation on the shared session.
      this.changePhase("waiting");
      release = this.manager.beginHumanBrowserOperation();
      await bounded(this.waitForAgents());
      await assertTarget();
      target = harosHostTarget(runtime.webContents, { cookieImport: true, signal });
      browser = new BetterWright({
        home: this.home,
        hostTarget: target,
        downloadPolicy: "deny",
        credentialCapture: false,
        vault: false,
        headless: false,
        adBlock: false,
        parkBackgroundPages: false,
        policy: new NetworkPolicy({ allowLoopback: true }),
      });
      this.changePhase("importing");
      mayHaveImported = true;
      const result = await bounded(
        browser.syncCookies({
          source: { browser: input.browser, profile: input.profile },
          ...(origin ? { domains: [origin.hostname] } : {}),
          windowsAppBound: "disabled",
          timeoutMs: Math.min(30_000, Math.max(1, deadline - Date.now())),
        }),
      );
      signal.throwIfAborted();
      if (!result.ok) {
        const code = result.cookiePermissionDenied
          ? "permission_denied"
          : result.cookieReaderCode === "timed_out"
            ? "timed_out"
            : ["no_selected_source", "no_discovered_source"].includes(result.cookieReaderCode ?? "")
              ? "source_missing"
              : result.cookieReaderCode === "reader_unavailable"
                ? "reader_unavailable"
                : result.cookieReaderCode
                  ? "reader_failed"
                  : "transfer_failed";
        const stages = ["acquisition", "parse", "decrypt", "decode", "query", "discovery"] as const;
        const stage = stages.find((value) => value === result.cookieReaderStage);
        return {
          ...this.failure(code, !result.cookieReaderCode && !result.cookiePermissionDenied),
          ...(stage ? { stage } : {}),
        };
      }
      await assertTarget();
      this.changePhase("persisting");
      try {
        await bounded(runtime.webContents.session.cookies.flushStore());
        signal.throwIfAborted();
        if (!Array.isArray(result.cookieImportDomains))
          return this.failure("persistence_failed", true);
        // Persistence already begun is drained before releasing ownership, even on cancellation.
        persistence = this.rememberSessionImport(result.cookieImportDomains, signal);
        await bounded(persistence);
      } catch {
        signal.throwIfAborted();
        return this.failure("persistence_failed", true);
      }
      signal.throwIfAborted();
      return {
        ok: true,
        imported: result.synced,
        skipped: result.skipped,
        warnings: (result.warnings ?? []).map(({ code, count }) => ({ code, count })),
      };
    } catch {
      return this.failure(
        signal.reason === "timed_out"
          ? "timed_out"
          : signal.reason === "target_changed"
            ? "target_changed"
            : signal.aborted
              ? "cancelled"
              : "transfer_failed",
        mayHaveImported,
      );
    } finally {
      clearTimeout(timeout);
      removeTargetListeners?.();
      signal.removeEventListener("abort", stop);
      stop();
      let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          stopping,
          new Promise<never>((_, reject) => {
            cleanupTimer = setTimeout(() => reject(new Error("Import cleanup timed out.")), 5_000);
          }),
        ]);
        release?.();
      } catch {
        // Keep the session blocked; a failed cleanup is not permission to resume writes.
        this.unsafe = true;
      } finally {
        clearTimeout(cleanupTimer);
      }
    }
  }
}
