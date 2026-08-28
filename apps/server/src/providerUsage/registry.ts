// FILE: providerUsage/registry.ts
// Purpose: Map each supported EngineKind to its live usage fetcher. Adding a provider is a
// one-file change: implement a ProviderUsageFetcher and register it here.

import type { EngineKind } from "@harnessos/contracts";

import { antigravityUsageFetcher } from "./providers/antigravity";
import { claudeUsageFetcher } from "./providers/claude";
import { codexUsageFetcher } from "./providers/codex";
import { cursorUsageFetcher } from "./providers/cursor";
import { grokUsageFetcher } from "./providers/grok";
import { droidUsageFetcher, kiloUsageFetcher } from "./providers/localCredential";
import { opencodeUsageFetcher } from "./providers/opencode";
import type { ProviderUsageFetcher } from "./types";

export const PROVIDER_USAGE_FETCHERS: Partial<Record<EngineKind, ProviderUsageFetcher>> = {
  codex: codexUsageFetcher,
  claude: claudeUsageFetcher,
  cursor: cursorUsageFetcher,
  antigravity: antigravityUsageFetcher,
  grok: grokUsageFetcher,
  droid: droidUsageFetcher,
  kilo: kiloUsageFetcher,
  opencode: opencodeUsageFetcher,
};
