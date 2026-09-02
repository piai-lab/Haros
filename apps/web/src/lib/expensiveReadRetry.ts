// FILE: expensiveReadRetry.ts
// Purpose: One bounded retry policy for unary RPC capacity backpressure.
// Layer: Web transport and data-fetching helpers

const RPC_CAPACITY_EXCEEDED_CODES = new Set([
  "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED",
  "RPC_REQUEST_CAPACITY_EXCEEDED",
]);

export const MAX_UNARY_RPC_CAPACITY_RETRY_ATTEMPTS = 12;
export const DEFAULT_RPC_CAPACITY_RETRY_MS = 250;
const DEFAULT_GENERIC_RETRY_LIMIT = 3;

export function isRpcCapacityExceededError(error: unknown): error is {
  readonly code: string;
  readonly retryAfterMs?: unknown;
  readonly retryable?: unknown;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    RPC_CAPACITY_EXCEEDED_CODES.has(error.code)
  );
}

function isRetryableRpcCapacityExceededError(error: unknown): boolean {
  return isRpcCapacityExceededError(error) && error.retryable !== false;
}

export function getRpcCapacityRetryAfterMs(error: unknown): number {
  if (!isRpcCapacityExceededError(error)) return DEFAULT_RPC_CAPACITY_RETRY_MS;
  return typeof error.retryAfterMs === "number" && error.retryAfterMs > 0
    ? error.retryAfterMs
    : DEFAULT_RPC_CAPACITY_RETRY_MS;
}

export function getUnaryRpcCapacityRetryDelayMs(
  error: unknown,
  previousAttempts: number,
): number | null {
  if (previousAttempts >= MAX_UNARY_RPC_CAPACITY_RETRY_ATTEMPTS) return null;
  if (!isRetryableRpcCapacityExceededError(error)) return null;
  return getRpcCapacityRetryAfterMs(error);
}

export function shouldRetryExpensiveRead(failureCount: number, error: unknown): boolean {
  // Capacity is retried once at the transport boundary. Retrying it here would
  // multiply two independent 13-attempt budgets.
  if (isRetryableRpcCapacityExceededError(error)) return false;
  return failureCount < DEFAULT_GENERIC_RETRY_LIMIT;
}

export function expensiveReadRetryDelay(attemptIndex: number, error: unknown): number {
  if (isRetryableRpcCapacityExceededError(error)) return getRpcCapacityRetryAfterMs(error);
  return Math.min(1_000 * 2 ** attemptIndex, 30_000);
}

type ExpensiveReadRetryFns = {
  readonly retry: (failureCount: number, error: Error) => boolean;
  readonly retryDelay: (attemptIndex: number, error: Error) => number;
};

export const EXPENSIVE_READ_RETRY_OPTIONS: ExpensiveReadRetryFns = {
  retry: shouldRetryExpensiveRead as ExpensiveReadRetryFns["retry"],
  retryDelay: expensiveReadRetryDelay as ExpensiveReadRetryFns["retryDelay"],
};

export const MAX_EXPENSIVE_READ_ERROR_REFETCH_INTERVAL_MS = 10_000;

export function expensiveReadErrorRefetchInterval(query: {
  readonly state: { readonly error: unknown; readonly errorUpdateCount?: number };
}): number | false {
  if (!isRetryableRpcCapacityExceededError(query.state.error)) return false;
  const failures = Math.max(1, query.state.errorUpdateCount ?? 1);
  return Math.min(
    getRpcCapacityRetryAfterMs(query.state.error) * 2 ** Math.min(failures - 1, 16),
    MAX_EXPENSIVE_READ_ERROR_REFETCH_INTERVAL_MS,
  );
}
