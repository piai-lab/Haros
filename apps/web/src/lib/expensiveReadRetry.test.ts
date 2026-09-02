import { describe, expect, it } from "vitest";

import {
  expensiveReadErrorRefetchInterval,
  expensiveReadRetryDelay,
  getUnaryRpcCapacityRetryDelayMs,
  isRpcCapacityExceededError,
  MAX_EXPENSIVE_READ_ERROR_REFETCH_INTERVAL_MS,
  MAX_UNARY_RPC_CAPACITY_RETRY_ATTEMPTS,
  shouldRetryExpensiveRead,
} from "./expensiveReadRetry";

const capacityError = {
  code: "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED",
  retryable: true,
  retryAfterMs: 375,
};

describe("unary RPC capacity retry", () => {
  it("recognizes both capacity classes and keeps one transport-owned budget", () => {
    expect(isRpcCapacityExceededError(capacityError)).toBe(true);
    expect(isRpcCapacityExceededError({ code: "RPC_REQUEST_CAPACITY_EXCEEDED" })).toBe(true);
    expect(isRpcCapacityExceededError(new Error("network"))).toBe(false);
    expect(shouldRetryExpensiveRead(0, capacityError)).toBe(false);
    expect(shouldRetryExpensiveRead(2, new Error("network"))).toBe(true);
    expect(shouldRetryExpensiveRead(3, new Error("network"))).toBe(false);
    expect(expensiveReadRetryDelay(0, capacityError)).toBe(375);
  });

  it("honors retryAfterMs and stops at the bounded attempt limit", () => {
    expect(getUnaryRpcCapacityRetryDelayMs(capacityError, 0)).toBe(375);
    expect(getUnaryRpcCapacityRetryDelayMs(capacityError, 11)).toBe(375);
    expect(
      getUnaryRpcCapacityRetryDelayMs(capacityError, MAX_UNARY_RPC_CAPACITY_RETRY_ATTEMPTS),
    ).toBeNull();
    expect(getUnaryRpcCapacityRetryDelayMs({ ...capacityError, retryable: false }, 0)).toBeNull();
  });

  it("self-heals only while retryable capacity remains the current error", () => {
    expect(
      expensiveReadErrorRefetchInterval({ state: { error: capacityError, errorUpdateCount: 1 } }),
    ).toBe(375);
    expect(
      expensiveReadErrorRefetchInterval({ state: { error: capacityError, errorUpdateCount: 2 } }),
    ).toBe(750);
    expect(
      expensiveReadErrorRefetchInterval({ state: { error: capacityError, errorUpdateCount: 8 } }),
    ).toBe(MAX_EXPENSIVE_READ_ERROR_REFETCH_INTERVAL_MS);
    expect(expensiveReadErrorRefetchInterval({ state: { error: new Error("ENOENT") } })).toBe(
      false,
    );
  });
});
