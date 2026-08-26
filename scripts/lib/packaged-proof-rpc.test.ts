import {
  WS_CLIENT_REQUIRED_CAPABILITIES,
  WS_COMPATIBILITY_QUERY,
  WS_NEGOTIATE_QUERY,
} from "@omnimind/contracts";
import * as runtimeContracts from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  makePackagedProofFeatureUrl,
  makePackagedProofNegotiateUrl,
  redactPackagedProofSecrets,
} from "./packaged-proof-rpc.ts";

describe("packaged proof RPC", () => {
  it("negotiates with the canonical protocol contract and preserves only in-memory auth", () => {
    const url = new URL(
      makePackagedProofNegotiateUrl(
        "ws://127.0.0.1:47124/?token=private",
        "1.2.3",
        runtimeContracts,
      ),
    );
    expect(url.pathname).toBe("/ws/negotiate");
    expect(url.searchParams.get("token")).toBe("private");
    expect(url.searchParams.get(WS_NEGOTIATE_QUERY.clientBuild)).toBe("1.2.3");
    expect(url.searchParams.getAll(WS_NEGOTIATE_QUERY.requiredCapability)).toEqual([
      ...WS_CLIENT_REQUIRED_CAPABILITIES,
    ]);
  });

  it("builds the feature URL from the typed negotiation result", () => {
    const url = new URL(
      makePackagedProofFeatureUrl(
        "ws://localhost:47124/?token=private",
        "1.2.3",
        {
          protocolEpoch: 1,
          negotiatedRevision: 1,
          serverBuild: "1.2.3",
          serverInstanceId: "server-instance",
          capabilities: [...WS_CLIENT_REQUIRED_CAPABILITIES],
        },
        runtimeContracts,
      ),
    );
    expect(url.pathname).toBe("/ws");
    expect(url.searchParams.get("token")).toBe("private");
    expect(url.searchParams.get(WS_COMPATIBILITY_QUERY.serverInstanceId)).toBe("server-instance");
  });

  it("redacts secret query values from errors", () => {
    expect(
      redactPackagedProofSecrets("failed ws://127.0.0.1:47124/ws?token=private&key=another-secret"),
    ).toBe("failed ws://127.0.0.1:47124/ws?token=<redacted>&key=<redacted>");
  });

  it("rejects non-loopback bundled Server URLs", () => {
    expect(() =>
      makePackagedProofNegotiateUrl("wss://example.com/?token=x", "1.2.3", runtimeContracts),
    ).toThrow("non-loopback");
  });
});
