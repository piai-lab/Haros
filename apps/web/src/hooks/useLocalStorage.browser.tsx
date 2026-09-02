import * as Schema from "effect/Schema";
import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { useLocalStorage } from "~/hooks/useLocalStorage";

const TEST_KEY = "harnessos:test:storage-clear";

describe("useLocalStorage", () => {
  afterEach(() => localStorage.removeItem(TEST_KEY));

  it("resets every subscriber when another tab clears localStorage", async () => {
    localStorage.setItem(TEST_KEY, JSON.stringify("persisted"));
    const hook = await renderHook(() => useLocalStorage(TEST_KEY, "fallback", Schema.String));
    expect(hook.result.current[0]).toBe("persisted");

    localStorage.removeItem(TEST_KEY);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: null,
        storageArea: localStorage,
      }),
    );

    await expect.poll(() => hook.result.current[0]).toBe("fallback");
    await hook.unmount();
  });
});
