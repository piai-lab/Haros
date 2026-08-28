// FILE: engineWebSurfaceHost.ts
// Purpose: Presents short-lived, provenance-backed Engine web surfaces in HarnessOS.
// Layer: Server host integration
// Exports: narrow intent registration plus Pi curator extraction/sanitization helpers

import type {
  EngineWebSurfacePresentationContext,
  EngineKind,
  ThreadId,
} from "@harnessos/contracts";
import { parseEngineWebSurfaceThemeSnapshot } from "@harnessos/contracts";

const ENGINE_WEB_SURFACE_PRESENTER_SYMBOL = Symbol.for("harnessos.engineWebSurface.presenter.v1");
const ENGINE_WEB_SURFACE_INTENT_TTL_MS = 10 * 60 * 1_000;
const MAX_ENGINE_WEB_SURFACE_URL_LENGTH = 2_048;
const MIN_SESSION_TOKEN_LENGTH = 8;
const MAX_SESSION_TOKEN_LENGTH = 512;
const REDACTED_ENGINE_WEB_SURFACE = "[HarnessOS Browser temporary page]";

export type EngineWebSurfaceStatus = "waiting-for-user" | "unavailable" | "completed";

export interface EngineWebSurfaceIntentIdentity {
  readonly engine: EngineKind;
  readonly threadId: ThreadId;
  readonly toolCallId: string;
}

interface RegisteredEngineWebSurfaceIntent extends EngineWebSurfaceIntentIdentity {
  readonly expiresAt: number;
  readonly present: () => Promise<void>;
  readonly expiryTimer: ReturnType<typeof setTimeout>;
}

interface EngineWebSurfacePresenterGlobal {
  readonly claim: (url: string) => boolean;
}

type EngineWebSurfaceGlobal = typeof globalThis & {
  [ENGINE_WEB_SURFACE_PRESENTER_SYMBOL]?: EngineWebSurfacePresenterGlobal;
};

const intentsByUrl = new Map<string, RegisteredEngineWebSurfaceIntent>();

export type ReadyEngineWebSurfacePresentationContext = EngineWebSurfacePresentationContext & {
  readonly themeSnapshot: NonNullable<EngineWebSurfacePresentationContext["themeSnapshot"]>;
};

/**
 * Bundled Engine surfaces may only start after the renderer appearance owner
 * has published a resolved snapshot. Missing readiness must fail closed rather
 * than silently selecting the package's black/white upstream fallback.
 */
export function requireReadyEngineWebSurfaceContext(
  context: EngineWebSurfacePresentationContext,
): ReadyEngineWebSurfacePresentationContext {
  const themeSnapshot = parseEngineWebSurfaceThemeSnapshot(context.themeSnapshot);
  if (
    (context.locale !== "en" && context.locale !== "zh-CN") ||
    (context.theme !== "light" && context.theme !== "dark") ||
    themeSnapshot === null
  ) {
    throw new Error("The HarnessOS appearance snapshot is not ready for this internal page.");
  }
  return {
    locale: context.locale,
    theme: context.theme,
    themeSnapshot,
  };
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]";
}

export function isEngineWebSurfaceUrl(value: string): boolean {
  if (value.length === 0 || value.length > MAX_ENGINE_WEB_SURFACE_URL_LENGTH) return false;
  try {
    const parsed = new URL(value);
    const sessionTokens = parsed.searchParams.getAll("session");
    const queryKeys = Array.from(parsed.searchParams.keys());
    return (
      parsed.protocol === "http:" &&
      isLoopbackHostname(parsed.hostname) &&
      parsed.username.length === 0 &&
      parsed.password.length === 0 &&
      parsed.port.length > 0 &&
      Number.isInteger(Number(parsed.port)) &&
      Number(parsed.port) >= 1 &&
      Number(parsed.port) <= 65_535 &&
      parsed.pathname === "/" &&
      parsed.hash.length === 0 &&
      queryKeys.length === 1 &&
      queryKeys[0] === "session" &&
      sessionTokens.length === 1 &&
      sessionTokens[0]!.length >= MIN_SESSION_TOKEN_LENGTH &&
      sessionTokens[0]!.length <= MAX_SESSION_TOKEN_LENGTH
    );
  } catch {
    return false;
  }
}

function pruneExpiredIntents(now: number): void {
  for (const [url, intent] of intentsByUrl) {
    if (intent.expiresAt <= now) {
      clearTimeout(intent.expiryTimer);
      intentsByUrl.delete(url);
    }
  }
}

function installPresenterGlobal(): void {
  const host = globalThis as EngineWebSurfaceGlobal;
  if (host[ENGINE_WEB_SURFACE_PRESENTER_SYMBOL]) return;
  host[ENGINE_WEB_SURFACE_PRESENTER_SYMBOL] = {
    claim(url) {
      pruneExpiredIntents(Date.now());
      const intent = intentsByUrl.get(url);
      if (!intent || intent.expiresAt <= Date.now()) return false;
      intentsByUrl.delete(url);
      clearTimeout(intent.expiryTimer);
      void intent.present().catch(() => undefined);
      return true;
    },
  };
}

installPresenterGlobal();

export function registerEngineWebSurfaceIntent(input: {
  readonly url: string;
  readonly identity: EngineWebSurfaceIntentIdentity;
  readonly present: () => Promise<void>;
  readonly now?: number;
}): () => void {
  if (!isEngineWebSurfaceUrl(input.url)) {
    throw new Error("Engine web surface intent did not contain a supported loopback URL.");
  }
  const now = input.now ?? Date.now();
  pruneExpiredIntents(now);
  const previous = intentsByUrl.get(input.url);
  if (previous) clearTimeout(previous.expiryTimer);
  let intent: RegisteredEngineWebSurfaceIntent;
  const expiryTimer = setTimeout(() => {
    if (intentsByUrl.get(input.url) === intent) intentsByUrl.delete(input.url);
  }, ENGINE_WEB_SURFACE_INTENT_TTL_MS);
  expiryTimer.unref?.();
  intent = {
    ...input.identity,
    expiresAt: now + ENGINE_WEB_SURFACE_INTENT_TTL_MS,
    present: input.present,
    expiryTimer,
  };
  intentsByUrl.set(input.url, intent);
  return () => {
    clearTimeout(expiryTimer);
    if (intentsByUrl.get(input.url) === intent) intentsByUrl.delete(input.url);
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function findEngineWebSurfaceUrl(value: unknown, depth = 0): string | undefined {
  if (depth > 8) return undefined;
  if (typeof value === "string") {
    const candidates = value.match(
      /http:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d+\/\?session=[^\s"'<>]+/gu,
    );
    return candidates?.find(isEngineWebSurfaceUrl);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = findEngineWebSurfaceUrl(item, depth + 1);
      if (candidate) return candidate;
    }
    return undefined;
  }
  const record = asRecord(value);
  if (!record) return undefined;
  if (typeof record.curatorUrl === "string" && isEngineWebSurfaceUrl(record.curatorUrl)) {
    return record.curatorUrl;
  }
  for (const item of Object.values(record)) {
    const candidate = findEngineWebSurfaceUrl(item, depth + 1);
    if (candidate) return candidate;
  }
  return undefined;
}

export function extractPiCuratorWebSurfaceUrl(
  toolName: string,
  result: unknown,
): string | undefined {
  if (toolName !== "web_search") return undefined;
  const resultRecord = asRecord(result);
  const details = asRecord(resultRecord?.details);
  const phase = typeof details?.phase === "string" ? details.phase : undefined;
  const directUrl = typeof details?.curatorUrl === "string" ? details.curatorUrl : undefined;
  if (
    directUrl &&
    phase &&
    ["curating", "generating-summary", "waiting-for-approval"].includes(phase) &&
    isEngineWebSurfaceUrl(directUrl)
  ) {
    return directUrl;
  }
  return findEngineWebSurfaceUrl(result);
}

export function extractTypedEngineWebSurface(
  toolName: string,
  result: unknown,
): { readonly surfaceId: string; readonly status: "pending" | "observing" } | undefined {
  if (toolName !== "web_search") return undefined;
  const resultRecord = asRecord(result);
  const details = asRecord(resultRecord?.details);
  const surface = asRecord(details?.engineWebSurface);
  const surfaceId = surface?.surfaceId;
  if (
    typeof surfaceId !== "string" ||
    surfaceId.length < 8 ||
    surfaceId.length > 128 ||
    (surface?.status !== "pending" && surface?.status !== "observing")
  ) {
    return undefined;
  }
  return { surfaceId, status: surface.status };
}

export function sanitizeEngineWebSurfacePayload(
  value: unknown,
  exactUrl?: string,
  depth = 0,
): unknown {
  if (!exactUrl) return value;
  if (depth > 16) return undefined;
  if (typeof value === "string") {
    return exactUrl ? value.replaceAll(exactUrl, REDACTED_ENGINE_WEB_SURFACE) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeEngineWebSurfacePayload(item, exactUrl, depth + 1));
  }
  const record = asRecord(value);
  if (!record) return value;
  return Object.fromEntries(
    Object.entries(record).flatMap(([key, item]) =>
      key === "curatorUrl"
        ? []
        : [[key, sanitizeEngineWebSurfacePayload(item, exactUrl, depth + 1)]],
    ),
  );
}

export const engineWebSurfacePresentationMetadata = (
  status: EngineWebSurfaceStatus,
  surfaceId?: string,
) => ({
  status,
  provenance: "engine-native",
  presentation: "harnessos-browser",
  ...(surfaceId === undefined ? {} : { surfaceId }),
});
