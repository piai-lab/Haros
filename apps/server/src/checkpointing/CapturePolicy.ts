/**
 * CapturePolicy - Pure rules for whether a checkpoint may run `git add -A`.
 *
 * Checkpoint capture must not import an entire untracked tree (a stray
 * `git init` of a parent folder) and must not block a turn on a Git add that
 * already failed for this workspace.
 *
 * @module CapturePolicy
 */

export const CHECKPOINT_UNTRACKED_ADD_TIMEOUT_MS = 8_000;
export const CHECKPOINT_UNTRACKED_ADD_MAX_OUTPUT_BYTES = 65_536;
export const CHECKPOINT_TRACKED_LISTING_TIMEOUT_MS = 2_000;
export const CHECKPOINT_TRACKED_LISTING_MAX_OUTPUT_BYTES = 4_096;

export const CHECKPOINT_UNTRACKED_ADD_ARGS = [
  "-c",
  "core.autocrlf=false",
  "add",
  "-A",
  "-q",
  "--",
  ".",
] as const;

export function shouldStageUntrackedForCheckpoint(input: {
  readonly hasHeadCommit: boolean;
  readonly hasTrackedFiles: boolean;
  readonly untrackedAddPreviouslyFailed: boolean;
}): boolean {
  if (input.untrackedAddPreviouslyFailed) {
    return false;
  }
  // Unborn + empty index: `git add -A` would hash every untracked path.
  if (!input.hasHeadCommit && !input.hasTrackedFiles) {
    return false;
  }
  return true;
}
