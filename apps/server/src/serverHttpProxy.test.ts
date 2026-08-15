import { describe, expect, it, vi } from "vitest";

import { installServerEnvProxyDispatcher } from "./serverHttpProxy.ts";

describe("Server HTTP proxy", () => {
  it("reasserts the env-proxy dispatcher only when an HTTP proxy is configured", () => {
    const install = vi.fn();

    expect(installServerEnvProxyDispatcher({}, install)).toBe(false);
    expect(install).not.toHaveBeenCalled();

    expect(installServerEnvProxyDispatcher({ HTTPS_PROXY: "http://127.0.0.1:7890" }, install)).toBe(
      true,
    );
    expect(install).toHaveBeenCalledOnce();
  });

  it("accepts lowercase proxy variables and ignores blank values", () => {
    const install = vi.fn();

    expect(installServerEnvProxyDispatcher({ HTTPS_PROXY: "  " }, install)).toBe(false);
    expect(installServerEnvProxyDispatcher({ https_proxy: "http://127.0.0.1:7890" }, install)).toBe(
      true,
    );
    expect(install).toHaveBeenCalledOnce();
  });
});
