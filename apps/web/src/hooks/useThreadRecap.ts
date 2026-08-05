// FILE: useThreadRecap.ts
// Purpose: Present historical local recap text without invoking retired Provider generation.
// Layer: React hook

import type { ThreadId } from "@omnimind/contracts";
import { useState } from "react";

import { readPersistedThreadRecapCache, type PersistedThreadRecap } from "~/lib/threadRecap";
import type { Thread } from "~/types";

export interface UseThreadRecapInput {
  readonly thread: Thread | null | undefined;
  readonly cwd: string | null;
  readonly enabled: boolean;
  readonly latestTurnSettled: boolean;
  readonly initialIdleMs?: number;
  readonly refreshIdleMs?: number;
  readonly idleMs?: number;
}

export interface UseThreadRecapResult {
  readonly text: string | null;
  readonly status: "idle" | "unavailable";
  readonly updatedAt: string | null;
}

export function useThreadRecap(input: UseThreadRecapInput): UseThreadRecapResult {
  const [historicalByThreadId] = useState<Partial<Record<ThreadId, PersistedThreadRecap>>>(() =>
    readPersistedThreadRecapCache(),
  );
  const historical = input.thread ? historicalByThreadId[input.thread.id] : undefined;
  if (historical?.text) {
    return { text: historical.text, status: "idle", updatedAt: historical.updatedAt };
  }
  return { text: null, status: "unavailable", updatedAt: null };
}
