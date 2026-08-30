// FILE: oaModelRuntimeMutation.ts
// Purpose: Invalidates isolated Haros Agent runtime snapshots after model-service mutation.
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

export function getOAModelRuntimeMutationRevision(agentDir: string): number {
  return revisions.get(key(agentDir)) ?? 0;
}

export function publishOAModelRuntimeMutation(agentDir: string): number {
  const agentKey = key(agentDir);
  const revision = (revisions.get(agentKey) ?? 0) + 1;
  revisions.set(agentKey, revision);
  return revision;
}
