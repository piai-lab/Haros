// FILE: mermaidPresentation.ts
// Purpose: Owns the bounded, isolated lifecycle for settled Mermaid Markdown projections.
// Layer: Web chat presentation internals

import type { EngineWebSurfaceThemeSnapshot } from "@harnessos/contracts";
import type { MermaidConfig } from "mermaid";

export const MERMAID_PRESENTATION_VERSION = "mermaid-presentation-v4";
export const MERMAID_PACKAGE_VERSION = "11.17.2";
export const MERMAID_MAX_SOURCE_CHARACTERS = 20_000;
export const MERMAID_MAX_NONEMPTY_LINES = 120;
export const MERMAID_MAX_CONNECTORS = 100;
export const MERMAID_MAX_DIAGRAMS_PER_MESSAGE = 8;
export const MERMAID_MAX_OUTPUT_BYTES = 1024 * 1024;

const MERMAID_CACHE_MAX_ENTRIES = 24;
const MERMAID_CACHE_MAX_BYTES = 6 * 1024 * 1024;
const MERMAID_DATA_URL_PREFIX = "data:text/html;charset=UTF-8;base64,";
const MERMAID_OFFICIAL_SANDBOX = "allow-top-navigation-by-user-activation allow-popups";
const MERMAID_BODY_PREFIX = '<body style="margin:0">';
const MERMAID_BODY_SUFFIX = "</body>";
const MERMAID_ALLOWED_TAG = /^<br\s*\/?\s*>$/i;
const MERMAID_TAG_PATTERN = /<[^>]*>/g;
const MERMAID_RESOURCE_TAG_PATTERN =
  /<\s*\/?\s*(?:script|style|img|image|iframe|object|embed|video|audio|source|track|link|meta|base|form|input|button|svg|foreignobject)\b/i;
const MERMAID_URI_PATTERN = /(?:https?|ftp|file|data|javascript|vbscript):/i;
const MERMAID_PROTOCOL_RELATIVE_URI_PATTERN = /(?:^|[\s('"=])\/\/[\w.-]/m;
const MERMAID_BEHAVIOR_PATTERN = /^\s*(?:click|link|href)\b/im;
const MERMAID_INIT_DIRECTIVE_PATTERN = /%%\s*\{\s*(?:init|initialize|config)\s*:/i;
const MERMAID_FRONTMATTER_PATTERN = /^\s*---(?:\r?\n|$)/;
// Count every relationship spelling accepted by the diagram kinds above before
// Mermaid is imported. Keep longer spellings first so one edge is counted once.
// The final `--` / `..` alternatives deliberately over-count unusual label text:
// the resource guard must fail closed rather than let compressed open/class edges
// move unbounded parsing work onto the main thread.
const MERMAID_CONNECTOR_PATTERN =
  /(?:<<-->>|<<->>|<-->|<->|<\|--|--\|>|\.\.\|>|-\.->|-\.-|-->>|->>|-->|==>|---|===|~~~|~~>|--[ox*)]|-[x)]|[ox*]--|\.\.>|\.\.|--|->)/g;

export type MermaidDiagramKind = "flowchart" | "sequence" | "class" | "state" | "er" | "mindmap";

export type MermaidPreflightResult =
  | { readonly ok: true; readonly diagramKind: MermaidDiagramKind }
  | {
      readonly ok: false;
      readonly reason: "unsupported" | "budget" | "unsafe";
    };

export type MermaidPresentationResult =
  | {
      readonly kind: "ready";
      readonly srcDoc: string;
      readonly width: number;
      readonly height: number;
      readonly byteLength: number;
    }
  | {
      readonly kind: "fallback";
      readonly reason: "unsupported" | "budget" | "unsafe" | "invalid" | "output";
      readonly retryable: boolean;
    };

interface MermaidCacheEntry {
  readonly result: MermaidPresentationResult;
  readonly bytes: number;
}

interface MermaidLatestReadyEntry {
  readonly cacheKey: string;
  readonly source: string;
  readonly themeKey: string;
}

export interface MermaidLatestReadyPresentation {
  readonly result: Extract<MermaidPresentationResult, { kind: "ready" }>;
  readonly themeKey: string;
}

export class MermaidPresentationCache {
  readonly #entries = new Map<string, MermaidCacheEntry>();
  #bytes = 0;

  constructor(
    private readonly maxEntries = MERMAID_CACHE_MAX_ENTRIES,
    private readonly maxBytes = MERMAID_CACHE_MAX_BYTES,
  ) {}

  get size() {
    return this.#entries.size;
  }

  get byteLength() {
    return this.#bytes;
  }

  get(key: string): MermaidPresentationResult | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    return entry.result;
  }

  set(key: string, result: MermaidPresentationResult): void {
    const bytes = result.kind === "ready" ? result.byteLength : 1;
    if (bytes > this.maxBytes) return;

    const previous = this.#entries.get(key);
    if (previous) {
      this.#bytes -= previous.bytes;
      this.#entries.delete(key);
    }
    this.#entries.set(key, { result, bytes });
    this.#bytes += bytes;

    while (this.#entries.size > this.maxEntries || this.#bytes > this.maxBytes) {
      const oldestKey = this.#entries.keys().next().value;
      if (typeof oldestKey !== "string") break;
      const oldest = this.#entries.get(oldestKey);
      this.#entries.delete(oldestKey);
      this.#bytes -= oldest?.bytes ?? 0;
    }
  }

  clear(): void {
    this.#entries.clear();
    this.#bytes = 0;
  }
}

const presentationCache = new MermaidPresentationCache();
const latestReadyByOwner = new Map<string, MermaidLatestReadyEntry>();
let mermaidModulePromise: Promise<typeof import("mermaid")> | null = null;
let renderTransactionTail: Promise<void> = Promise.resolve();

function firstMeaningfulLine(source: string): string {
  return (
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("%%")) ?? ""
  );
}

function detectAllowedDiagramKind(source: string): MermaidDiagramKind | null {
  const firstLine = firstMeaningfulLine(source);
  if (/^(?:flowchart|graph)\b/i.test(firstLine)) return "flowchart";
  if (/^sequenceDiagram\b/i.test(firstLine)) return "sequence";
  if (/^classDiagram(?:-v2)?\b/i.test(firstLine)) return "class";
  if (/^stateDiagram(?:-v2)?\b/i.test(firstLine)) return "state";
  if (/^erDiagram\b/i.test(firstLine)) return "er";
  if (/^mindmap\b/i.test(firstLine)) return "mindmap";
  return null;
}

function containsDisallowedHtml(source: string): boolean {
  if (MERMAID_RESOURCE_TAG_PATTERN.test(source)) return true;
  const tags = source.match(MERMAID_TAG_PATTERN) ?? [];
  return tags.some((tag) => !MERMAID_ALLOWED_TAG.test(tag));
}

export function preflightMermaidSource(source: string): MermaidPreflightResult {
  if (source.length > MERMAID_MAX_SOURCE_CHARACTERS) {
    return { ok: false, reason: "budget" };
  }

  const lines = source.split(/\r?\n/);
  if (lines.filter((line) => line.trim().length > 0).length > MERMAID_MAX_NONEMPTY_LINES) {
    return { ok: false, reason: "budget" };
  }
  if ((source.match(MERMAID_CONNECTOR_PATTERN) ?? []).length > MERMAID_MAX_CONNECTORS) {
    return { ok: false, reason: "budget" };
  }

  if (
    MERMAID_FRONTMATTER_PATTERN.test(source) ||
    MERMAID_INIT_DIRECTIVE_PATTERN.test(source) ||
    MERMAID_BEHAVIOR_PATTERN.test(source) ||
    MERMAID_URI_PATTERN.test(source) ||
    MERMAID_PROTOCOL_RELATIVE_URI_PATTERN.test(source) ||
    containsDisallowedHtml(source)
  ) {
    return { ok: false, reason: "unsafe" };
  }

  const diagramKind = detectAllowedDiagramKind(source);
  return diagramKind ? { ok: true, diagramKind } : { ok: false, reason: "unsupported" };
}

function stableThemeProjection(theme: Readonly<EngineWebSurfaceThemeSnapshot>) {
  return {
    accent: theme.accent,
    border: theme.border,
    danger: theme.danger,
    surface: theme.surface,
    text: theme.text,
    textDim: theme.textDim,
  };
}

export async function createMermaidPresentationCacheKey(
  source: string,
  theme: Readonly<EngineWebSurfaceThemeSnapshot>,
): Promise<string> {
  const payload = JSON.stringify({
    version: MERMAID_PRESENTATION_VERSION,
    mermaid: MERMAID_PACKAGE_VERSION,
    source,
    theme: stableThemeProjection(theme),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buildMermaidConfig(
  theme: Readonly<EngineWebSurfaceThemeSnapshot>,
  cacheKey: string,
): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: "sandbox",
    suppressErrorRendering: true,
    deterministicIds: true,
    deterministicIDSeed: cacheKey,
    htmlLabels: false,
    maxTextSize: MERMAID_MAX_SOURCE_CHARACTERS,
    maxEdges: MERMAID_MAX_CONNECTORS,
    flowchart: {
      htmlLabels: false,
      curve: "linear",
    },
    theme: "base",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    themeVariables: {
      background: theme.surface,
      primaryColor: theme.surface,
      primaryBorderColor: theme.border,
      primaryTextColor: theme.text,
      lineColor: theme.textDim,
      secondaryColor: theme.secondaryBackground,
      tertiaryColor: theme.elevatedSurface,
      mainBkg: theme.surface,
      nodeBorder: theme.border,
      clusterBkg: theme.elevatedSurface,
      clusterBorder: theme.borderStrong,
      edgeLabelBackground: theme.surface,
      noteBkgColor: theme.secondaryBackground,
      noteBorderColor: theme.border,
      noteTextColor: theme.text,
      actorBkg: theme.surface,
      actorBorder: theme.border,
      actorTextColor: theme.text,
      signalColor: theme.textDim,
      signalTextColor: theme.text,
      labelBoxBkgColor: theme.surface,
      labelBoxBorderColor: theme.border,
      labelTextColor: theme.text,
      activationBkgColor: theme.secondaryBackground,
      activationBorderColor: theme.borderStrong,
      errorBkgColor: theme.danger,
      errorTextColor: theme.primaryText,
    },
  };
}

function decodeBase64Utf8(value: string): string | null {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function contentByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function buildHostSrcDoc(bodyContent: string, backgroundColor: string): string {
  return [
    "<!doctype html>",
    '<html><head><meta charset="utf-8">',
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; object-src 'none'; frame-src 'none'; connect-src 'none'; font-src 'none'; media-src 'none'\">",
    `<style>html,body{margin:0;overflow:hidden;background:${backgroundColor}}svg{display:block;max-width:100%;height:auto;margin:0 auto;background:${backgroundColor}!important}</style>`,
    "</head><body>",
    bodyContent,
    "</body></html>",
  ].join("");
}

export function parseOfficialMermaidSandboxOutput(
  svg: string,
  themeSurface: string,
): MermaidPresentationResult {
  if (contentByteLength(svg) > MERMAID_MAX_OUTPUT_BYTES || typeof DOMParser === "undefined") {
    return { kind: "fallback", reason: "output", retryable: false };
  }

  const document = new DOMParser().parseFromString(svg, "text/html");
  if (document.body.children.length !== 1) {
    return { kind: "fallback", reason: "output", retryable: false };
  }
  const iframe = document.body.firstElementChild;
  if (!(iframe instanceof HTMLIFrameElement)) {
    return { kind: "fallback", reason: "output", retryable: false };
  }
  const attributes = Array.from(iframe.attributes, ({ name }) => name).toSorted();
  if (
    attributes.join(",") !== "sandbox,src,style" ||
    iframe.getAttribute("sandbox") !== MERMAID_OFFICIAL_SANDBOX ||
    iframe.style.width !== "100%" ||
    iframe.style.border !== "0px" ||
    iframe.style.margin !== "0px"
  ) {
    return { kind: "fallback", reason: "output", retryable: false };
  }

  const heightMatch = /^(\d+(?:\.\d+)?)px$/.exec(iframe.style.height);
  const height = heightMatch ? Number(heightMatch[1]) : Number.NaN;
  if (!Number.isFinite(height) || height <= 0) {
    return { kind: "fallback", reason: "output", retryable: false };
  }

  const src = iframe.getAttribute("src") ?? "";
  if (!src.startsWith(MERMAID_DATA_URL_PREFIX)) {
    return { kind: "fallback", reason: "output", retryable: false };
  }
  const decoded = decodeBase64Utf8(src.slice(MERMAID_DATA_URL_PREFIX.length));
  if (
    !decoded ||
    !decoded.startsWith(MERMAID_BODY_PREFIX) ||
    !decoded.endsWith(MERMAID_BODY_SUFFIX)
  ) {
    return { kind: "fallback", reason: "output", retryable: false };
  }

  const bodyContent = decoded.slice(MERMAID_BODY_PREFIX.length, -MERMAID_BODY_SUFFIX.length);
  const bodyDocument = new DOMParser().parseFromString(decoded, "text/html");
  const svgElement = bodyDocument.body.firstElementChild;
  const hasUnexpectedTopLevelNode = Array.from(bodyDocument.body.childNodes).some(
    (node) => node !== svgElement && (node.nodeType !== Node.TEXT_NODE || node.textContent?.trim()),
  );
  if (
    bodyDocument.body.children.length !== 1 ||
    svgElement?.localName.toLowerCase() !== "svg" ||
    hasUnexpectedTopLevelNode
  ) {
    return { kind: "fallback", reason: "output", retryable: false };
  }
  const viewBox = (svgElement.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const width = viewBox.length === 4 ? (viewBox[2] ?? Number.NaN) : Number.NaN;
  const viewBoxHeight = viewBox.length === 4 ? (viewBox[3] ?? Number.NaN) : Number.NaN;
  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(viewBoxHeight) ||
    viewBoxHeight <= 0 ||
    Math.abs(viewBoxHeight - height) > 0.1
  ) {
    return { kind: "fallback", reason: "output", retryable: false };
  }
  const colorProbe = bodyDocument.createElement("span");
  colorProbe.style.backgroundColor = themeSurface;
  const backgroundColor = colorProbe.style.backgroundColor;
  if (!backgroundColor) {
    return { kind: "fallback", reason: "output", retryable: false };
  }
  const srcDoc = buildHostSrcDoc(bodyContent, backgroundColor);
  const byteLength = contentByteLength(srcDoc);
  if (byteLength > MERMAID_MAX_OUTPUT_BYTES) {
    return { kind: "fallback", reason: "output", retryable: false };
  }
  return {
    kind: "ready",
    srcDoc,
    width,
    height,
    byteLength,
  };
}

function abortError(): DOMException {
  return new DOMException("Mermaid presentation was superseded", "AbortError");
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

function loadMermaid() {
  if (!mermaidModulePromise) {
    performance.mark("harnessos:mermaid-import");
    const startedAt = performance.now();
    mermaidModulePromise = import("mermaid").then((module) => {
      performance.measure("harnessos:mermaid-import-duration", {
        start: startedAt,
        end: performance.now(),
      });
      return module;
    });
  }
  return mermaidModulePromise;
}

function enqueueRenderTransaction<T>(transaction: () => Promise<T>): Promise<T> {
  const result = renderTransactionTail.catch(() => undefined).then(transaction);
  renderTransactionTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function rememberLatestReady(
  ownerId: string,
  cacheKey: string,
  source: string,
  themeKey: string,
): void {
  latestReadyByOwner.delete(ownerId);
  latestReadyByOwner.set(ownerId, { cacheKey, source, themeKey });
  while (latestReadyByOwner.size > MERMAID_CACHE_MAX_ENTRIES) {
    const oldestOwner = latestReadyByOwner.keys().next().value;
    if (typeof oldestOwner !== "string") break;
    latestReadyByOwner.delete(oldestOwner);
  }
}

export async function renderMermaidPresentation(input: {
  readonly source: string;
  readonly theme: Readonly<EngineWebSurfaceThemeSnapshot>;
  readonly signal: AbortSignal;
  readonly bypassFailureCache?: boolean;
  readonly ownerId?: string;
  readonly ownerThemeKey?: string;
}): Promise<MermaidPresentationResult> {
  const preflight = preflightMermaidSource(input.source);
  if (!preflight.ok) {
    return { kind: "fallback", reason: preflight.reason, retryable: false };
  }
  assertNotAborted(input.signal);

  const cacheKey = await createMermaidPresentationCacheKey(input.source, input.theme);
  assertNotAborted(input.signal);
  const cached = presentationCache.get(cacheKey);
  if (cached && !(input.bypassFailureCache && cached.kind === "fallback")) {
    if (cached.kind === "ready" && input.ownerId) {
      rememberLatestReady(input.ownerId, cacheKey, input.source, input.ownerThemeKey ?? cacheKey);
    }
    return cached;
  }

  return enqueueRenderTransaction(async () => {
    assertNotAborted(input.signal);
    const mermaid = (await loadMermaid()).default;
    assertNotAborted(input.signal);
    mermaid.initialize(buildMermaidConfig(input.theme, cacheKey));

    try {
      performance.mark("harnessos:mermaid-render-attempt");
      const renderStartedAt = performance.now();
      const rendered = await mermaid.render(
        `omnimind-mermaid-${cacheKey.slice(0, 16)}`,
        input.source,
      );
      performance.measure("harnessos:mermaid-render-duration", {
        start: renderStartedAt,
        end: performance.now(),
      });
      assertNotAborted(input.signal);
      const result = parseOfficialMermaidSandboxOutput(rendered.svg, input.theme.surface);
      presentationCache.set(cacheKey, result);
      if (result.kind === "ready" && input.ownerId) {
        rememberLatestReady(input.ownerId, cacheKey, input.source, input.ownerThemeKey ?? cacheKey);
      }
      return result;
    } catch {
      if (input.signal.aborted) throw abortError();
      const result = {
        kind: "fallback",
        reason: "invalid",
        retryable: true,
      } as const satisfies MermaidPresentationResult;
      presentationCache.set(cacheKey, result);
      return result;
    }
  });
}

export function getLatestReadyMermaidPresentation(
  ownerId: string,
  source: string,
): MermaidLatestReadyPresentation | null {
  const latest = latestReadyByOwner.get(ownerId);
  if (!latest || latest.source !== source) return null;
  const result = presentationCache.get(latest.cacheKey);
  if (result?.kind !== "ready") {
    latestReadyByOwner.delete(ownerId);
    return null;
  }
  latestReadyByOwner.delete(ownerId);
  latestReadyByOwner.set(ownerId, latest);
  return { result, themeKey: latest.themeKey };
}

export function resetMermaidPresentationForTests(): void {
  presentationCache.clear();
  latestReadyByOwner.clear();
  mermaidModulePromise = null;
  renderTransactionTail = Promise.resolve();
}
