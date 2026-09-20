import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { verifyDesktopSmoke, waitForWorkbench } from "./smoke-test.mjs";

function fixture() {
  const child = Object.assign(new EventEmitter(), { exitCode: null, signalCode: null });
  let ready;
  const pending = new Promise((resolve) => {
    ready = resolve;
  });
  const click = vi.fn(async () => {});
  const window = Object.assign(new EventEmitter(), {
    url: () => "harnessos://app/index.html",
    locator: vi.fn(() => ({ waitFor: () => pending, first: () => ({ waitFor: () => pending }) })),
    getByRole: vi.fn(() => ({ first: () => ({ click }) })),
    evaluate: vi.fn(async () => {}),
  });
  return {
    child,
    click,
    window,
    ready,
    app: Object.assign(new EventEmitter(), { process: () => child, windows: () => [window] }),
  };
}

describe("production desktop smoke gate", () => {
  it.each([0, 1])("rejects early process exit %s even without a fatal log", async (code) => {
    const f = fixture();
    const proof = verifyDesktopSmoke(f.app, 1000);
    f.child.exitCode = code;
    f.child.emit("exit", code);
    await expect(proof).rejects.toThrow("exited before");
    expect(f.child.listenerCount("exit")).toBe(0);
  });
  it.each(["crash", "pageerror"])(
    "rejects renderer %s while waiting for readiness",
    async (event) => {
      const f = fixture();
      const proof = verifyDesktopSmoke(f.app, 1000);
      await Promise.resolve();
      f.window.emit(event, new Error("synthetic"));
      await expect(proof).rejects.toThrow("renderer");
    },
  );
  it("fails a startup that never reaches readiness", async () => {
    const f = fixture();
    await expect(verifyDesktopSmoke(f.app, 10)).rejects.toThrow("timed out");
  });
  it("rejects a painted workbench whose control cannot receive input", async () => {
    const f = fixture();
    f.click.mockRejectedValue(new Error("Control is covered."));
    f.ready();
    await expect(verifyDesktopSmoke(f.app, 1000)).rejects.toThrow("covered");
  });
  it("succeeds only after the ready workbench has been painted", async () => {
    const f = fixture();
    const proof = verifyDesktopSmoke(f.app, 1000);
    f.ready();
    await proof;
    expect(f.window.locator).toHaveBeenCalledWith('html[data-shell-state="ready"]');
    expect(f.click).toHaveBeenCalledWith({ trial: true, timeout: 1000 });
    expect(f.window.evaluate).toHaveBeenCalledOnce();
    expect(f.window.listenerCount("crash")).toBe(0);
  });
});

it("ignores a hidden cookie backend when it is the first Electron page", async () => {
  const f = fixture();
  const hidden = Object.assign(new EventEmitter(), { url: () => "about:blank" });
  f.app.windows = () => [hidden, f.window];
  const controller = new AbortController();
  expect(await waitForWorkbench(f.app, controller.signal)).toBe(f.window);
  expect(hidden.listenerCount("framenavigated")).toBe(0);
  expect(f.app.listenerCount("window")).toBe(0);
});
