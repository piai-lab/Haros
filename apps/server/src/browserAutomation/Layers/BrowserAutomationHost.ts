import { Effect, Layer } from "effect";

import {
  BrowserAutomationHost,
  type BrowserAutomationHostShape,
} from "../Services/BrowserAutomationHost.ts";
import {
  BrowserHostRpcError,
  callBrowserHostTool,
  getBrowserHostEngineWebSurfaceContext,
  presentBrowserHostEngineWebSurface,
  resolveBrowserHostCapability,
  resolveBrowserHostPipePath,
  settleBrowserHostEngineWebSurface,
} from "../browserHostRpcClient.ts";

export function makeBrowserAutomationHost(
  env: NodeJS.ProcessEnv = process.env,
): BrowserAutomationHostShape {
  const pipePath = resolveBrowserHostPipePath(env);
  const capability = resolveBrowserHostCapability(env);
  const unavailable = () =>
    new BrowserHostRpcError(
      "unavailable",
      "The visible OmniMind browser is only available in the desktop app.",
    );
  const runPrivate = <T>(operation: (signal: AbortSignal) => Promise<T>) => {
    if (!pipePath || !capability) return Effect.fail(unavailable());
    return Effect.tryPromise({
      try: operation,
      catch: (error) =>
        error instanceof BrowserHostRpcError
          ? error
          : new BrowserHostRpcError("transport", String(error)),
    });
  };
  return {
    available: pipePath !== null && capability !== null,
    execute: (input) => {
      if (!pipePath || !capability) {
        return Effect.fail(unavailable());
      }
      return Effect.tryPromise({
        try: (signal) => callBrowserHostTool({ ...input, pipePath, capability, signal }),
        catch: (error) =>
          error instanceof BrowserHostRpcError
            ? error
            : new BrowserHostRpcError("transport", String(error)),
      });
    },
    getEngineWebSurfaceContext: (sessionKey) =>
      runPrivate(async (signal) => {
        const value = await getBrowserHostEngineWebSurfaceContext({
          pipePath: pipePath!,
          capability: capability!,
          sessionKey,
          timeoutMs: 5_000,
          signal,
        });
        const record = value as { locale?: unknown; theme?: unknown };
        if (
          (record?.locale !== "en" && record?.locale !== "zh-CN") ||
          (record?.theme !== "light" && record?.theme !== "dark")
        ) {
          throw new BrowserHostRpcError("malformed", "Browser presentation context is invalid.");
        }
        return { locale: record.locale, theme: record.theme };
      }),
    presentEngineWebSurface: (input) =>
      runPrivate(async (signal) => {
        const value = await presentBrowserHostEngineWebSurface({
          ...input,
          pipePath: pipePath!,
          capability: capability!,
          timeoutMs: 10_000,
          signal,
        });
        const record = value as { surfaceId?: unknown; tabId?: unknown };
        if (record?.surfaceId !== input.surfaceId || typeof record?.tabId !== "string") {
          throw new BrowserHostRpcError("malformed", "Browser presentation result is invalid.");
        }
        return { surfaceId: input.surfaceId, tabId: record.tabId };
      }),
    settleEngineWebSurface: (input) =>
      runPrivate(async (signal) => {
        await settleBrowserHostEngineWebSurface({
          ...input,
          pipePath: pipePath!,
          capability: capability!,
          timeoutMs: 5_000,
          signal,
        });
      }),
  };
}

export const BrowserAutomationHostLive = Layer.sync(BrowserAutomationHost, () =>
  makeBrowserAutomationHost(),
);
