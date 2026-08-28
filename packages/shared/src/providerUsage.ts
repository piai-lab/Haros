// FILE: providerUsage.ts
// Purpose: Single source of truth for engine-usage presentation metadata shared by
// the server (live usage fetchers) and the web app (Settings → Usage, toolbar popover):
// which engines expose a usage source, their display labels, learn-more URLs, and the
// read-only "sign in via CLI" hint used when a credential is missing or expired.
// Layer: cross-cutting (no runtime deps beyond the EngineKind type).

import type { EngineKind, ServerProviderUsageSnapshot } from "@harnessos/contracts";
import { ENGINE_DESCRIPTORS, ENGINE_DESCRIPTOR_BY_KIND } from "./engineMetadata";

/** Engines, in display order, that expose a live usage source. */
export const ENGINE_USAGE_PROVIDERS: ReadonlyArray<EngineKind> = ENGINE_DESCRIPTORS.flatMap(
  (descriptor) => (descriptor.usage ? [descriptor.kind] : []),
);

// Engine ids cross the WebSocket as plain strings (rate-limit event payloads), so the
// lookup helpers accept any string and resolve against the typed metadata table at runtime.
function lookupMeta(engine: string | null | undefined) {
  if (!engine) {
    return undefined;
  }
  const descriptor = ENGINE_DESCRIPTOR_BY_KIND[engine as EngineKind];
  return descriptor?.usage ? descriptor : undefined;
}

/** Panel title like "Codex usage"; falls back to a generic label for unknown engines. */
export function providerUsageLabel(engine: string | null | undefined): string {
  const meta = lookupMeta(engine);
  return meta ? `${meta.displayName} usage` : "Usage";
}

export function providerUsageDisplayName(engine: string | null | undefined): string {
  return lookupMeta(engine)?.displayName ?? "Engine";
}

export function providerUsageLearnMoreHref(engine: string | null | undefined): string | null {
  return lookupMeta(engine)?.usage?.learnMoreHref ?? null;
}

/** Detail sentence shown when usage can't be read because the credential is missing/expired. */
export function providerUsageNeedsAuthDetail(engine: string | null | undefined): string {
  const meta = lookupMeta(engine);
  if (!meta) {
    return "Sign in with the engine CLI to see usage.";
  }
  return `Sign in with \`${meta.usage!.signInCommand}\` to see usage.`;
}

/**
 * Settings shows every usage-capable engine when none are signed in, so the
 * panel can still explain how to connect. Once any engine has credentials,
 * only those connected snapshots stay visible.
 */
export function selectVisibleProviderUsageSnapshots(
  snapshots: ReadonlyArray<ServerProviderUsageSnapshot>,
): ReadonlyArray<ServerProviderUsageSnapshot> {
  const byProvider = new Map(snapshots.map((snapshot) => [snapshot.engine, snapshot]));
  const ordered = ENGINE_USAGE_PROVIDERS.flatMap((engine) => {
    const snapshot = byProvider.get(engine);
    return snapshot ? [snapshot] : [];
  });
  const connected = ordered.filter((snapshot) => (snapshot.status ?? "ok") !== "needs-auth");
  return connected.length > 0 ? connected : ordered;
}
