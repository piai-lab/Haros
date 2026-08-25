import { describe, expect, it, vi } from "vitest";

import { userInputPresenterRegistry } from "./userInputPresenterRegistry.ts";

describe("canonical user-input presenter registry", () => {
  it("notifies only when the last compatible presenter lease disappears", () => {
    expect(userInputPresenterRegistry.size).toBe(0);
    const unavailable = vi.fn();
    const remove = userInputPresenterRegistry.onUnavailable(unavailable);
    const first = userInputPresenterRegistry.acquire("window-a", 1);
    const second = userInputPresenterRegistry.acquire("window-b", 1);

    expect(userInputPresenterRegistry.available).toBe(true);
    first.release();
    expect(unavailable).not.toHaveBeenCalled();
    second.release();
    expect(unavailable).toHaveBeenCalledTimes(1);
    second.release();
    expect(unavailable).toHaveBeenCalledTimes(1);
    remove();
  });
});
