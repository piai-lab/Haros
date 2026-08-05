// FILE: checkpointDiffQuery.ts
// Purpose: Builds presentation-only React Query options for unavailable historical diffs.
// Layer: Web data fetching helpers
// Depends on: Product Conversation identity and React Query.

import { ThreadId } from "@omnimind/contracts";
import { queryOptions } from "@tanstack/react-query";

interface CheckpointDiffQueryInput {
  threadId: ThreadId | null;
  fromTurnCount: number | null;
  toTurnCount: number | null;
  ignoreWhitespace: boolean;
  cacheScope?: string | null;
  enabled?: boolean;
}

export const checkpointDiffQueryKeys = {
  all: ["checkpointDiff"] as const,
  checkpointDiff: (input: CheckpointDiffQueryInput) =>
    [
      "checkpointDiff",
      input.threadId,
      input.fromTurnCount,
      input.toTurnCount,
      input.ignoreWhitespace,
      input.cacheScope ?? null,
    ] as const,
};

function isValidCheckpointDiffInput(input: CheckpointDiffQueryInput): boolean {
  return (
    input.threadId !== null &&
    Number.isInteger(input.fromTurnCount) &&
    Number.isInteger(input.toTurnCount) &&
    input.fromTurnCount !== null &&
    input.toTurnCount !== null &&
    input.fromTurnCount >= 0 &&
    input.toTurnCount >= input.fromTurnCount
  );
}

function asCheckpointErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
}

function normalizeCheckpointErrorMessage(error: unknown): string {
  const message = asCheckpointErrorMessage(error).trim();
  if (message.length === 0) {
    return "Failed to load checkpoint diff.";
  }

  const lower = message.toLowerCase();
  if (lower.includes("not a git repository")) {
    return "Turn diffs are unavailable because this project is not a git repository.";
  }

  if (
    lower.includes("checkpoint unavailable for thread") ||
    lower.includes("checkpoint invariant violation")
  ) {
    const separatorIndex = message.indexOf(":");
    if (separatorIndex >= 0) {
      const detail = message.slice(separatorIndex + 1).trim();
      if (detail.length > 0) {
        return detail;
      }
    }
  }

  return message;
}

export function resolveCheckpointDiffQueryDisplayState(input: {
  isLoading: boolean;
  isFetching: boolean;
  data: unknown;
  error: unknown;
}): { isLoading: boolean; error: string | null } {
  const hasData = input.data != null;
  return {
    isLoading: input.isLoading || (input.isFetching && !hasData),
    error:
      input.isFetching || input.error == null ? null : normalizeCheckpointErrorMessage(input.error),
  };
}

export function checkpointDiffQueryOptions(input: CheckpointDiffQueryInput) {
  const validInput = isValidCheckpointDiffInput(input);

  return queryOptions({
    queryKey: checkpointDiffQueryKeys.checkpointDiff(input),
    queryFn: async (): Promise<{ readonly diff: string }> => {
      if (!validInput) {
        throw new Error("Checkpoint diff is unavailable.");
      }
      throw new Error(
        "Historical turn and full-conversation diffs are unavailable on the Product runtime surface.",
      );
    },
    enabled: (input.enabled ?? true) && validInput,
    staleTime: Infinity,
    retry: false,
    refetchInterval: false,
  });
}
