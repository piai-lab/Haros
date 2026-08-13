import { describe, expect, it } from "vitest";

import {
  applyBackendProxyNodeArgs,
  proxyDirectiveToUrl,
  resolveBackendProxyEnvironment,
} from "./backendProxyEnv";

describe("backend proxy environment", () => {
  it("uses the operating-system HTTPS proxy and keeps local backend traffic direct", async () => {
    const resolved = await resolveBackendProxyEnvironment(
      { NO_PROXY: "example.test" },
      async () => "PROXY 127.0.0.1:7890; DIRECT",
    );

    expect(resolved).toMatchObject({
      HTTPS_PROXY: "http://127.0.0.1:7890",
      NODE_USE_ENV_PROXY: "1",
    });
    expect(resolved.NO_PROXY?.split(",")).toEqual(
      expect.arrayContaining(["example.test", "localhost", "127.0.0.1", "::1"]),
    );
    expect(resolved.no_proxy).toBe(resolved.NO_PROXY);
  });

  it("preserves an explicit proxy instead of replacing it with desktop state", async () => {
    let calls = 0;
    const resolved = await resolveBackendProxyEnvironment(
      { HTTPS_PROXY: "http://explicit.test:8080", NODE_USE_ENV_PROXY: "0" },
      async () => {
        calls += 1;
        return "PROXY system.test:9000";
      },
    );

    expect(calls).toBe(0);
    expect(resolved).not.toHaveProperty("HTTPS_PROXY");
    expect(resolved).not.toHaveProperty("NODE_USE_ENV_PROXY");
  });

  it("does not invent a proxy for DIRECT, credentials, or unsupported rules", async () => {
    await expect(resolveBackendProxyEnvironment({}, async () => "DIRECT")).resolves.toEqual({});
    expect(proxyDirectiveToUrl("SOCKS5 127.0.0.1:1080")).toBeNull();
    expect(proxyDirectiveToUrl("PROXY user:secret@proxy.test:8080")).toBeNull();
  });

  it("activates Node env-proxy fetch only for the bundled backend proxy projection", () => {
    expect(applyBackendProxyNodeArgs(["--max-old-space-size=1024"], {})).toEqual([
      "--max-old-space-size=1024",
    ]);
    expect(
      applyBackendProxyNodeArgs(["--max-old-space-size=1024"], { NODE_USE_ENV_PROXY: "1" }),
    ).toEqual(["--max-old-space-size=1024", "--use-env-proxy"]);
    expect(applyBackendProxyNodeArgs(["--use-env-proxy"], { NODE_USE_ENV_PROXY: "1" })).toEqual([
      "--use-env-proxy",
    ]);
  });
});
