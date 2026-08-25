import { describe, expect, it, vi } from "vitest";

import { UserInputPresenterRegistry } from "./userInputPresenterRegistry.ts";

describe("canonical user-input presenter registry", () => {
  it("notifies only when the last compatible presenter lease disappears", () => {
    const userInputPresenterRegistry = new UserInputPresenterRegistry();
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

  it("seals registration and awaits asynchronous settlement handoffs", async () => {
    const userInputPresenterRegistry = new UserInputPresenterRegistry();
    let releaseHandoff: (() => void) | undefined;
    const unavailable = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseHandoff = resolve;
        }),
    );
    const remove = userInputPresenterRegistry.onUnavailable(unavailable);
    const first = userInputPresenterRegistry.acquire("window-a", 1);
    const second = userInputPresenterRegistry.acquire("window-b", 1);

    const shutdown = userInputPresenterRegistry.sealAndRevoke();
    expect(userInputPresenterRegistry.size).toBe(0);
    expect(unavailable).toHaveBeenCalledTimes(1);
    await expect(
      Promise.race([shutdown.then(() => "settled"), Promise.resolve("pending")]),
    ).resolves.toBe("pending");
    expect(() => userInputPresenterRegistry.acquire("late-window", 1)).toThrow(
      "presenter registration is closed",
    );

    releaseHandoff?.();
    await expect(shutdown).resolves.toBe(0);
    await expect(userInputPresenterRegistry.sealAndRevoke()).resolves.toBe(0);
    first.release();
    second.release();
    expect(unavailable).toHaveBeenCalledTimes(1);
    remove();
  });

  it("tracks an immediate settlement registered after shutdown sealing", async () => {
    const userInputPresenterRegistry = new UserInputPresenterRegistry();
    await userInputPresenterRegistry.sealAndRevoke();
    const unavailable = vi.fn(async () => undefined);

    userInputPresenterRegistry.onUnavailable(unavailable);
    expect(unavailable).not.toHaveBeenCalled();
    userInputPresenterRegistry.handoffUnavailable(unavailable);
    await expect(userInputPresenterRegistry.drainUnavailableHandoffs()).resolves.toBe(0);

    expect(unavailable).toHaveBeenCalledTimes(1);
  });
});
