// FILE: engineUsage/registry.ts
// Purpose: Map each supported EngineKind to its live usage fetcher. Adding a engine is a
// one-file change: implement a EngineUsageFetcher and register it here.

import type { EngineKind } from "@harnessos/contracts";

import { antigravityUsageFetcher } from "./engines/antigravity";
import { claudeUsageFetcher } from "./engines/claude";
import { codexUsageFetcher } from "./engines/codex";
import { cursorUsageFetcher } from "./engines/cursor";
import { grokUsageFetcher } from "./engines/grok";
import { droidUsageFetcher, kiloUsageFetcher } from "./engines/localCredential";
import { opencodeUsageFetcher } from "./engines/opencode";
import type { EngineUsageFetcher } from "./types";

export const ENGINE_USAGE_FETCHERS: Partial<Record<EngineKind, EngineUsageFetcher>> = {
  codex: codexUsageFetcher,
  claude: claudeUsageFetcher,
  cursor: cursorUsageFetcher,
  antigravity: antigravityUsageFetcher,
  grok: grokUsageFetcher,
  droid: droidUsageFetcher,
  kilo: kiloUsageFetcher,
  opencode: opencodeUsageFetcher,
};
