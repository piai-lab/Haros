import { afterEach, describe, expect, it, vi } from "vitest";

import { PackagedProofCdpSession, parseDevToolsActivePort } from "./packaged-proof-cdp.ts";

class FakeCdpSocket extends EventTarget {
  readonly sent: string[] = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.dispatchEvent(new Event("close"));
  }

  open(): void {
    this.dispatchEvent(new Event("open"));
  }

  message(data: unknown): void {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(data) }));
  }
}

describe("packaged proof CDP", () => {
  afterEach(() => vi.useRealTimers());

  it("accepts only bounded DevTools ports", () => {
    expect(parseDevToolsActivePort("47123\n/devtools/browser/example\n")).toBe(47_123);
    expect(() => parseDevToolsActivePort("0\n")).toThrow("invalid DevTools port");
    expect(() => parseDevToolsActivePort("not-a-port\n")).toThrow("invalid DevTools port");
  });

  it("correlates out-of-order CDP responses and returns evaluation values", async () => {
    const socket = new FakeCdpSocket();
    const connection = PackagedProofCdpSession.connect(
      "ws://127.0.0.1:47123/devtools/page/example",
      () => socket as unknown as WebSocket,
    );
    socket.open();
    const session = await connection;

    const first = session.evaluate<string>("'first'");
    const second = session.evaluate<string>("'second'");
    const [firstRequest, secondRequest] = socket.sent.map(
      (message) => JSON.parse(message) as { readonly id: number },
    );
    socket.message({
      id: secondRequest!.id,
      result: { result: { value: "second" } },
    });
    socket.message({
      id: firstRequest!.id,
      result: { result: { value: "first" } },
    });

    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
    session.close();
  });

  it("fails pending commands immediately when Chromium disconnects", async () => {
    const socket = new FakeCdpSocket();
    const connection = PackagedProofCdpSession.connect(
      "ws://localhost:47123/devtools/page/example",
      () => socket as unknown as WebSocket,
    );
    socket.open();
    const session = await connection;
    const pending = session.evaluate("document.title");
    socket.dispatchEvent(new Event("close"));
    await expect(pending).rejects.toThrow("disconnected");
  });

  it("bounds each CDP command independently", async () => {
    vi.useFakeTimers();
    const socket = new FakeCdpSocket();
    const connection = PackagedProofCdpSession.connect(
      "ws://localhost:47123/devtools/page/example",
      () => socket as unknown as WebSocket,
    );
    socket.open();
    const session = await connection;
    const pending = session.evaluate("document.title");
    const rejection = expect(pending).rejects.toThrow("Runtime.evaluate timed out");
    await vi.advanceTimersByTimeAsync(5_000);
    await rejection;
    session.close();
  });

  it("rejects non-loopback CDP endpoints", async () => {
    await expect(
      PackagedProofCdpSession.connect("ws://example.com/devtools/page/example"),
    ).rejects.toThrow("non-loopback");
  });
});
