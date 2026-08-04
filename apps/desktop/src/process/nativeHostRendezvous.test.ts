import { describe, expect, it } from "vitest";

import { createNativeHostRendezvous, nativeHostChildEnvironment } from "./nativeHostRendezvous";

const identity = "12345678-1234-4234-8234-123456789abc";

describe("Native Host rendezvous", () => {
  it("uses one bounded Unix-domain socket endpoint even under a long temporary path", () => {
    const rendezvous = createNativeHostRendezvous({
      identity,
      platform: "darwin",
      temporaryDirectory: `/private/${"long-segment/".repeat(20)}`,
    });

    expect(Buffer.byteLength(rendezvous.endpoint, "utf8")).toBeLessThanOrEqual(100);
    expect(rendezvous.endpoint).toBe("/tmp/omnimind-nh-12345678123442348234.sock");
    expect(rendezvous.endpoint).not.toContain(rendezvous.authentication);
  });

  it("provides the same child-private endpoint, authentication and instance to both children", () => {
    const rendezvous = createNativeHostRendezvous({
      identity,
      platform: "linux",
      temporaryDirectory: "/tmp",
    });
    const environment = nativeHostChildEnvironment({ PUBLIC_VALUE: "preserved" }, rendezvous);

    expect(environment).toMatchObject({
      PUBLIC_VALUE: "preserved",
      OMNIMIND_NATIVE_HOST_ENDPOINT: rendezvous.endpoint,
      OMNIMIND_NATIVE_HOST_AUTH: rendezvous.authentication,
      OMNIMIND_NATIVE_HOST_INSTANCE: rendezvous.hostInstanceId,
    });
    expect(rendezvous.authentication).toHaveLength(43);
  });

  it("uses a named pipe rather than a filesystem socket on Windows", () => {
    const rendezvous = createNativeHostRendezvous({ identity, platform: "win32" });

    expect(rendezvous.endpoint).toBe(`\\\\.\\pipe\\omnimind-native-host-${identity}`);
  });
});
