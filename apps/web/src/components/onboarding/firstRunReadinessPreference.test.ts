import { describe, expect, it } from "vitest";

import {
  clearFirstRunReadinessPreference,
  deferFirstRunReadiness,
  FIRST_RUN_READINESS_PREFERENCE_KEY,
  readFirstRunReadinessPreference,
} from "./firstRunReadinessPreference";

function createMemoryStorage(initial?: string): Storage {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(FIRST_RUN_READINESS_PREFERENCE_KEY, initial);
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("first-run readiness preference", () => {
  it("persists only the deferred presentation disposition", () => {
    const storage = createMemoryStorage();
    deferFirstRunReadiness(storage);
    expect(readFirstRunReadinessPreference(storage)).toEqual({ disposition: "deferred" });
    expect(JSON.parse(storage.getItem(FIRST_RUN_READINESS_PREFERENCE_KEY) ?? "null")).toEqual({
      disposition: "deferred",
    });
  });

  it.each([
    "not-json",
    JSON.stringify({ disposition: "complete" }),
    JSON.stringify({ disposition: "deferred", model: "do-not-store" }),
    JSON.stringify(null),
  ])("fails closed for malformed or expanded storage: %s", (raw) => {
    expect(readFirstRunReadinessPreference(createMemoryStorage(raw))).toBeNull();
  });

  it("clears the local presentation preference without touching product state", () => {
    const storage = createMemoryStorage();
    deferFirstRunReadiness(storage);
    clearFirstRunReadinessPreference(storage);
    expect(storage.getItem(FIRST_RUN_READINESS_PREFERENCE_KEY)).toBeNull();
  });
});
