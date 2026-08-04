import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  NATIVE_HOST_PROTOCOL_VERSION,
  decodeNativeHostFrame,
  encodeNativeHostFrame,
  nativeHostBrokerServerProofPayload,
  type NativeHostFrame,
} from "@omnimind/contracts";
import { afterEach, describe, expect, it } from "vitest";

import {
  createPiKeychainLookup,
  NativeHostCredentialBroker,
  PI_KEYCHAIN_SERVICE,
} from "./nativeHostCredentialBroker";

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function waitFor<T>(read: () => T | null, timeoutMs = 2_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      const value = read();
      if (value !== null) return resolve(value);
      if (Date.now() - started >= timeoutMs) return reject(new Error("timed out"));
      setTimeout(poll, 5);
    };
    poll();
  });
}

describe("Pi keychain lookup", () => {
  it("probes availability without reading secret material and reads -w only for the selected Run", async () => {
    const calls: string[][] = [];
    const lookup = createPiKeychainLookup({
      platform: "darwin",
      execute: async (arguments_) => {
        calls.push([...arguments_]);
        return { ok: true, stdout: arguments_.includes("-w") ? "selected-secret\n" : "metadata" };
      },
    });

    await expect(lookup.available("openai")).resolves.toBe(true);
    await expect(lookup.credential("openai")).resolves.toBe("selected-secret");
    expect(calls).toEqual([
      ["find-generic-password", "-s", PI_KEYCHAIN_SERVICE, "-a", "openai"],
      ["find-generic-password", "-s", PI_KEYCHAIN_SERVICE, "-a", "openai", "-w"],
    ]);
  });

  it("rejects unsafe provider ids before invoking the keychain executor", async () => {
    let calls = 0;
    const lookup = createPiKeychainLookup({
      platform: "darwin",
      execute: async () => {
        calls += 1;
        return { ok: true, stdout: "must-not-run" };
      },
    });
    await expect(lookup.available("../../bad")).resolves.toBe(false);
    await expect(lookup.credential("../../bad")).resolves.toBeNull();
    expect(calls).toBe(0);
  });
});

describe("NativeHostCredentialBroker", () => {
  it("authenticates fragmented hello and answers coalesced availability/credential frames", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "omnimind-broker-"));
    temporaryDirectories.push(directory);
    const endpoint = path.join(directory, "broker.sock");
    const authentication = "b".repeat(43);
    const desktopInstanceId = "desktop-test";
    const hostInstanceId = "host-test";
    const responses: NativeHostFrame[] = [];
    const server = createServer((socket) => {
      let buffered = Buffer.alloc(0);
      socket.on("data", (chunk: Buffer) => {
        buffered = Buffer.concat([buffered, chunk]);
        for (;;) {
          const newline = buffered.indexOf(0x0a);
          if (newline < 0) break;
          const frame = decodeNativeHostFrame(buffered.subarray(0, newline), "service-to-host");
          buffered = buffered.subarray(newline + 1);
          if (frame.kind === "broker.hello") {
            const hostChallenge = "h".repeat(43);
            const hello = encodeNativeHostFrame({
              protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
              kind: "host.broker-hello",
              desktopInstanceId,
              hostInstanceId,
              challenge: frame.challenge,
              hostChallenge,
              ready: true,
              proof: createHmac("sha256", authentication)
                .update(
                  nativeHostBrokerServerProofPayload({
                    desktopInstanceId,
                    hostInstanceId,
                    challenge: frame.challenge,
                    hostChallenge,
                  }),
                  "utf8",
                )
                .digest("base64url"),
            });
            socket.write(hello.subarray(0, 7));
            socket.write(hello.subarray(7));
            socket.write(
              Buffer.concat([
                encodeNativeHostFrame({
                  protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
                  kind: "broker.availability.request",
                  brokerRequestId: "availability-1",
                  desktopInstanceId,
                  hostInstanceId,
                  provider: "openai",
                }),
                encodeNativeHostFrame({
                  protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
                  kind: "broker.credential.request",
                  brokerRequestId: "credential-1",
                  desktopInstanceId,
                  hostInstanceId,
                  provider: "openai",
                  runId: "run-1",
                }),
              ]),
            );
          } else {
            responses.push(frame);
          }
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(endpoint, resolve));
    let availabilityCalls = 0;
    let credentialCalls = 0;
    const broker = new NativeHostCredentialBroker({
      endpoint,
      hostInstanceId,
      authentication,
      desktopInstanceId,
      reconnectDelayMs: 60_000,
      keychain: {
        available: async () => {
          availabilityCalls += 1;
          return true;
        },
        credential: async () => {
          credentialCalls += 1;
          return "selected-secret";
        },
      },
    });
    broker.start();
    await waitFor(() => (responses.length === 2 ? responses : null));

    expect(availabilityCalls).toBe(1);
    expect(credentialCalls).toBe(1);
    expect(responses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "broker.availability.response",
          brokerRequestId: "availability-1",
          available: true,
        }),
        expect.objectContaining({
          kind: "broker.credential.response",
          brokerRequestId: "credential-1",
          runId: "run-1",
          credential: "selected-secret",
        }),
      ]),
    );

    broker.stop();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
