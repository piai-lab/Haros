import { describe, expect, it } from "vitest";

import { createNativeHostBaseEnvironment } from "./nativeHostEnvironment";
import { nativeHostChildEnvironment } from "./nativeHostRendezvous";

describe("Native Host child environment", () => {
  it("inherits only startup necessities before adding the scoped rendezvous capability", () => {
    const base = createNativeHostBaseEnvironment(
      {
        PATH: "/usr/bin:/bin",
        LANG: "en_US.UTF-8",
        TMPDIR: "/private/tmp",
        HOME: "/Users/example",
        SYSTEMROOT: "C:\\Windows",
        OPENAI_API_KEY: "must-not-enter-host",
        ANTHROPIC_API_KEY: "must-not-enter-host",
        OMNIMIND_AUTH_TOKEN: "must-not-enter-host",
        PI_CODING_AGENT_DIR: "/private/provider-state",
        HTTP_PROXY: "http://credential-bearing-proxy.invalid",
        NODE_OPTIONS: "--require=/private/injected.js",
      },
      "/private/product-home",
    );
    const child = nativeHostChildEnvironment(base, {
      endpoint: "/tmp/omnimind-nh-test.sock",
      authentication: "a".repeat(43),
      hostInstanceId: "native-host-test",
    });

    expect(child).toMatchObject({
      PATH: "/usr/bin:/bin",
      LANG: "en_US.UTF-8",
      TMPDIR: "/private/tmp",
      HOME: "/Users/example",
      SYSTEMROOT: "C:\\Windows",
      ELECTRON_RUN_AS_NODE: "1",
      OMNIMIND_HOME: "/private/product-home",
      OMNIMIND_NATIVE_HOST_ENDPOINT: "/tmp/omnimind-nh-test.sock",
      OMNIMIND_NATIVE_HOST_AUTH: "a".repeat(43),
      OMNIMIND_NATIVE_HOST_INSTANCE: "native-host-test",
    });
    for (const rejected of [
      "OPENAI_API_KEY",
      "ANTHROPIC_API_KEY",
      "OMNIMIND_AUTH_TOKEN",
      "PI_CODING_AGENT_DIR",
      "HTTP_PROXY",
      "NODE_OPTIONS",
    ]) {
      expect(child[rejected]).toBeUndefined();
    }
  });
});
