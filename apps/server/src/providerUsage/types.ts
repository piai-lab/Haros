// FILE: providerUsage/types.ts
// Purpose: Shared contract for the server-side live engine-usage fetchers. Each engine
// implements EngineUsageFetcher; the registry maps EngineKind -> fetcher. Fetchers must
// never throw — they resolve to a snapshot whose `status` describes the outcome. Token
// freshness is the owning CLI's job where possible (Claude delegates to `claude auth status`);
// a fetcher that redeems a refresh token itself must persist the rotated pair back to the
// CLI's credential store, because engines rotate single-use refresh tokens.

import type { EngineKind, ServerProviderUsageSnapshot } from "@harnessos/contracts";

export interface EngineUsageContext {
  /** Resolved user home directory (ServerConfig.homeDir). */
  readonly homeDir: string;
  /** Process environment (lets fetchers honor CODEX_HOME, CLAUDE_CONFIG_DIR, etc.). */
  readonly env: NodeJS.ProcessEnv;
  /** Host platform; keychain reads only run on darwin. */
  readonly platform: NodeJS.Platform;
  /** Reference "now" in epoch ms, used for token-expiry checks (kept injectable for tests). */
  readonly nowMs: number;
  /** Claude CLI binary (settings.engines.claude.binaryPath); defaults to "claude". */
  readonly claudeBinaryPath?: string;
  /** Engine-native Codex app-server reader; avoids owning Codex auth or private state. */
  readonly codexRateLimits?: () => Promise<unknown>;
}

export interface EngineUsageFetcher {
  readonly engine: EngineKind;
  /**
   * Resolve a non-secret identity for the currently selected credentials. A changed identity
   * invalidates the orchestration cache before its TTL expires. Null disables caching for the
   * request when credential identity cannot be read safely.
   */
  readonly cacheKey?: (ctx: EngineUsageContext) => Promise<string | null>;
  /** Resolve credentials and fetch live usage. Never throws. */
  fetch(ctx: EngineUsageContext): Promise<ServerProviderUsageSnapshot>;
}
