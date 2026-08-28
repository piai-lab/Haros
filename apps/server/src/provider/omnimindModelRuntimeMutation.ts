// FILE: omnimindModelRuntimeMutation.ts
// Purpose: Invalidates isolated OmniMind Agent runtime snapshots after model-service mutation.
// Layer: Server engine runtime

import { realpathSync } from "node:fs";
import path from "node:path";

const revisions = new Map<string, number>();

function key(agentDir: string): string {
  const resolved = path.resolve(agentDir);
  try {
    return realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

export function getOmniMindModelRuntimeMutationRevision(agentDir: string): number {
  return revisions.get(key(agentDir)) ?? 0;
}

export function publishOmniMindModelRuntimeMutation(agentDir: string): number {
  const agentKey = key(agentDir);
  const revision = (revisions.get(agentKey) ?? 0) + 1;
  revisions.set(agentKey, revision);
  return revision;
}
