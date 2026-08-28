import { describe, expect, it } from "vitest";

import {
  makeHostGatewayEndpoint,
  makeHostGatewayStdioBootstrapRegistry,
  resolveHostGatewayEndpointHost,
} from "./HostGatewayCredentials.ts";

describe("resolveHostGatewayEndpointHost", () => {
  it("falls back to IPv4 loopback for default and wildcard binds", () => {
    expect(resolveHostGatewayEndpointHost(undefined)).toBe("127.0.0.1");
    expect(resolveHostGatewayEndpointHost("0.0.0.0")).toBe("127.0.0.1");
    expect(resolveHostGatewayEndpointHost("::")).toBe("127.0.0.1");
    expect(resolveHostGatewayEndpointHost("[::]")).toBe("127.0.0.1");
  });

  it("reuses an explicit bind host so child processes can reach the listener", () => {
    expect(resolveHostGatewayEndpointHost("localhost")).toBe("localhost");
    expect(resolveHostGatewayEndpointHost("192.168.1.20")).toBe("192.168.1.20");
  });

  it("brackets IPv6 hosts for URL use", () => {
    expect(resolveHostGatewayEndpointHost("::1")).toBe("[::1]");
    expect(resolveHostGatewayEndpointHost("[::1]")).toBe("[::1]");
  });

  it("updates connections after a dynamic listen port is resolved", () => {
    const endpoint = makeHostGatewayEndpoint(undefined, 0);
    expect(endpoint.url).toBe("http://127.0.0.1:0/mcp");
    endpoint.setListeningPort(48123);
    expect(endpoint.url).toBe("http://127.0.0.1:48123/mcp");
  });
});

describe("makeHostGatewayStdioBootstrapRegistry", () => {
  it("consumes bootstrap credentials once and invalidates them with their session", () => {
    const liveSessions = new Set(["session-a", "session-b"]);
    let sequence = 0;
    const registry = makeHostGatewayStdioBootstrapRegistry({
      sessionIsActive: (token) => liveSessions.has(token),
      randomId: () => String(++sequence),
    });

    const first = registry.issue("session-a");
    expect(first).toBe("sagw_bootstrap_1");
    expect(registry.exchange(first!)).toBe("session-a");
    expect(registry.exchange(first!)).toBeNull();

    const revoked = registry.issue("session-b");
    expect(revoked).toBe("sagw_bootstrap_2");
    registry.revokeSession("session-b");
    expect(registry.exchange(revoked!)).toBeNull();

    liveSessions.delete("session-a");
    expect(registry.issue("session-a")).toBeNull();
  });

  it("rejects an unconsumed bootstrap after its short startup lifetime", () => {
    let now = 1_000;
    const registry = makeHostGatewayStdioBootstrapRegistry({
      sessionIsActive: () => true,
      randomId: () => "expiring",
      now: () => now,
      ttlMs: 50,
    });

    const bootstrap = registry.issue("session-a");
    now += 50;

    expect(registry.exchange(bootstrap!)).toBeNull();
  });
});
