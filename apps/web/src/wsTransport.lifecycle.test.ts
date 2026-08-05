// FILE: wsTransport.lifecycle.test.ts
// Purpose: Locks the current Product/System WebSocket negotiation and lifecycle boundary.

import {
  WS_CHANNELS,
  WS_COMPATIBILITY_QUERY,
  WS_NEGOTIATE_QUERY,
  WS_PROTOCOL_EPOCH,
  WS_PROTOCOL_MAX_REVISION,
  WS_PROTOCOL_MIN_REVISION,
  type WsBootstrapNegotiateResult,
} from "@omnimind/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  makeFeatureSocketUrl,
  makeNegotiateHttpUrl,
  makeRequestAbortScope,
  negotiateOverHttp,
  serverIdentityChanged,
  shouldKeepServerLifecycleStream,
  WsTransport,
} from "./wsTransport";

type WsEventType = "open" | "message" | "close" | "error";
type WsListener = (event?: { data?: unknown }) => void;

const sockets: MockWebSocket[] = [];

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  private readonly listeners = new Map<WsEventType, Set<WsListener>>();

  constructor(readonly url: string) {
    sockets.push(this);
  }

  addEventListener(type: WsEventType, listener: WsListener) {
    const listeners = this.listeners.get(type) ?? new Set<WsListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: WsEventType, listener: WsListener) {
    this.listeners.get(type)?.delete(listener);
  }

  send(_data: unknown) {}

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    this.emit("close", { code: code ?? 1000, reason: reason ?? "" } as never);
  }

  private emit(type: WsEventType, event?: { data?: unknown }) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

const originalWebSocket = globalThis.WebSocket;
const NEGOTIATION_RESULT: WsBootstrapNegotiateResult = {
  protocolEpoch: WS_PROTOCOL_EPOCH,
  negotiatedRevision: WS_PROTOCOL_MAX_REVISION,
  serverBuild: "test-server",
  serverInstanceId: "server-instance-1",
  capabilities: ["transport.http-negotiate"],
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

async function waitForSockets(count: number): Promise<void> {
  for (let attempt = 0; attempt < 50 && sockets.length < count; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(sockets.length).toBeGreaterThanOrEqual(count);
}

beforeEach(() => {
  sockets.length = 0;
  vi.stubEnv("VITE_WS_URL", "");
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("HTTP negotiate unavailable"))));
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { protocol: "http:", hostname: "localhost", port: "3020" },
      desktopBridge: undefined,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    },
  });
  globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
});

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Product/System WebSocket lifecycle", () => {
  it("owns request deadlines and external aborts without leaving timers active", async () => {
    vi.useFakeTimers();
    try {
      const deadline = makeRequestAbortScope({ timeoutMs: 25 });
      await vi.advanceTimersByTimeAsync(25);
      expect(deadline.signal?.aborted).toBe(true);
      expect(deadline.didTimeout()).toBe(true);
      deadline.cleanup();
      deadline.cleanup();

      const external = new AbortController();
      const cancelled = makeRequestAbortScope({ timeoutMs: 1_000, signal: external.signal });
      external.abort(new Error("cancelled by caller"));
      expect(cancelled.signal?.aborted).toBe(true);
      expect(cancelled.didTimeout()).toBe(false);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(cancelled.didTimeout()).toBe(false);
      cancelled.cleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the shared System lifecycle stream while either lifecycle channel is active", () => {
    expect(shouldKeepServerLifecycleStream(new Set([WS_CHANNELS.serverWelcome]))).toBe(true);
    expect(shouldKeepServerLifecycleStream(new Set([WS_CHANNELS.serverMaintenanceUpdated]))).toBe(
      true,
    );
    expect(
      shouldKeepServerLifecycleStream(
        new Set([WS_CHANNELS.serverWelcome, WS_CHANNELS.serverMaintenanceUpdated]),
      ),
    ).toBe(true);
    expect(shouldKeepServerLifecycleStream(new Set([WS_CHANNELS.serverConfigUpdated]))).toBe(false);
  });

  it("falls back to bootstrap when HTTP negotiation is unavailable", async () => {
    const transport = new WsTransport("ws://localhost:3020");
    await waitForSockets(1);
    expect(sockets[0]?.url).toBe("ws://localhost:3020/ws/bootstrap");
    await transport.dispose();
  });

  it("negotiates over HTTP before opening the generation-pinned feature socket", async () => {
    const fetchMock = vi.fn((_input: string | URL | Request) =>
      Promise.resolve(jsonResponse(200, NEGOTIATION_RESULT)),
    );
    vi.stubGlobal("fetch", fetchMock);
    const transport = new WsTransport("ws://localhost:3020");
    await waitForSockets(1);

    const negotiateUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(negotiateUrl.pathname).toBe("/ws/negotiate");
    expect(negotiateUrl.searchParams.get(WS_NEGOTIATE_QUERY.protocolEpoch)).toBe(
      String(WS_PROTOCOL_EPOCH),
    );
    const featureUrl = new URL(sockets[0]!.url);
    expect(featureUrl.pathname).toBe("/ws");
    expect(featureUrl.searchParams.get(WS_COMPATIBILITY_QUERY.serverInstanceId)).toBe(
      NEGOTIATION_RESULT.serverInstanceId,
    );
    await transport.dispose();
  });

  it("aborts stalled negotiation with the caller lifetime", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("The operation was aborted.", "AbortError")),
            );
          }),
      ),
    );
    const negotiation = negotiateOverHttp("ws://localhost:3020", controller.signal);
    controller.abort();
    await expect(negotiation).resolves.toBeNull();
  });

  it("does not create a bootstrap socket when disposed during negotiation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("The operation was aborted.", "AbortError")),
            );
          }),
      ),
    );
    const transport = new WsTransport();
    await Promise.resolve();
    const socketsBefore = sockets.length;
    await transport.dispose();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sockets.length).toBe(socketsBefore);
  });

  it("uses the Desktop bridge URL before the browser location", async () => {
    const getWsUrl = vi.fn().mockReturnValue("ws://127.0.0.1:53036/?token=old");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: { protocol: "http:", hostname: "localhost", port: "3020" },
        desktopBridge: { getWsUrl },
      },
    });
    const transport = new WsTransport();
    await waitForSockets(1);
    expect(getWsUrl).toHaveBeenCalled();
    expect(sockets[0]?.url).toBe("ws://127.0.0.1:53036/ws/bootstrap?token=old");
    await transport.dispose();
  });

  it("resets replay generation when server identity changes", () => {
    expect(serverIdentityChanged(null, "instance-a")).toBe(false);
    expect(serverIdentityChanged("instance-a", "instance-a")).toBe(false);
    expect(serverIdentityChanged("instance-a", "instance-b")).toBe(true);
  });

  it("pins socket URLs to negotiated revision and generation", () => {
    const feature = new URL(makeFeatureSocketUrl("ws://127.0.0.1:53036/?token=old", NEGOTIATION_RESULT));
    expect(feature.pathname).toBe("/ws");
    expect(feature.searchParams.get(WS_COMPATIBILITY_QUERY.protocolRevision)).toBe(
      String(WS_PROTOCOL_MAX_REVISION),
    );
    expect(feature.searchParams.get(WS_COMPATIBILITY_QUERY.serverInstanceId)).toBe(
      NEGOTIATION_RESULT.serverInstanceId,
    );
    const negotiate = new URL(makeNegotiateHttpUrl("wss://remote.example:8443/?token=old"));
    expect(negotiate.protocol).toBe("https:");
    expect(negotiate.searchParams.get(WS_NEGOTIATE_QUERY.minRevision)).toBe(
      String(WS_PROTOCOL_MIN_REVISION),
    );
  });

  it("replays transport state to late listeners and stops after unsubscribe", async () => {
    const transport = new WsTransport();
    const listener = vi.fn();
    const unsubscribe = transport.onStateChange(listener, { replayCurrent: true });
    expect(listener).toHaveBeenCalledWith("connecting");
    listener.mockClear();
    await transport.dispose();
    expect(listener).toHaveBeenCalledWith("disposed");
    listener.mockClear();
    unsubscribe();
    await transport.dispose();
    expect(listener).not.toHaveBeenCalled();
  });
});
