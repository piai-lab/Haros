import { execFile } from "node:child_process";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createConnection, type Socket } from "node:net";

import {
  NATIVE_HOST_MAX_FRAME_BYTES,
  NATIVE_HOST_PROTOCOL_VERSION,
  decodeNativeHostFrame,
  encodeNativeHostFrame,
  nativeHostBrokerClientProofPayload,
  nativeHostBrokerServerProofPayload,
  type NativeHostBrokerAvailabilityRequest,
  type NativeHostBrokerCredentialRequest,
} from "@omnimind/contracts";

export const PI_KEYCHAIN_SERVICE = "OmniMind Pi Provider";
const PROVIDER_PATTERN = /^[A-Za-z0-9._-]{1,128}$/u;

export interface PiKeychainLookup {
  readonly available: (provider: string) => Promise<boolean>;
  readonly credential: (provider: string) => Promise<string | null>;
}

export type SecurityCommandExecutor = (
  arguments_: ReadonlyArray<string>,
) => Promise<{ readonly ok: boolean; readonly stdout: string }>;

const runSecurityCommand: SecurityCommandExecutor = (arguments_) =>
  new Promise((resolve) => {
    execFile(
      "/usr/bin/security",
      [...arguments_],
      { encoding: "utf8", maxBuffer: 20 * 1024, timeout: 2_000, windowsHide: true },
      (error, stdout) => resolve({ ok: error === null, stdout: error ? "" : stdout }),
    );
  });

export function createPiKeychainLookup(options?: {
  readonly platform?: NodeJS.Platform;
  readonly execute?: SecurityCommandExecutor;
}): PiKeychainLookup {
  const platform = options?.platform ?? process.platform;
  const execute = options?.execute ?? runSecurityCommand;
  const valid = (provider: string) => platform === "darwin" && PROVIDER_PATTERN.test(provider);
  return {
    available: async (provider) => {
      if (!valid(provider)) return false;
      const result = await execute([
        "find-generic-password",
        "-s",
        PI_KEYCHAIN_SERVICE,
        "-a",
        provider,
      ]);
      return result.ok;
    },
    credential: async (provider) => {
      if (!valid(provider)) return null;
      const result = await execute([
        "find-generic-password",
        "-s",
        PI_KEYCHAIN_SERVICE,
        "-a",
        provider,
        "-w",
      ]);
      if (!result.ok) return null;
      const credential = result.stdout.trim();
      return credential.length > 0 && credential.length <= 16_384 ? credential : null;
    },
  };
}

function proof(authentication: string, payload: string): string {
  return createHmac("sha256", authentication).update(payload, "utf8").digest("base64url");
}

function equalProof(expected: string, presented: string): boolean {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(presented, "utf8");
  return left.byteLength === right.byteLength && timingSafeEqual(left, right);
}

export interface NativeHostCredentialBrokerOptions {
  readonly endpoint: string;
  readonly hostInstanceId: string;
  readonly authentication: string;
  readonly desktopInstanceId: string;
  readonly keychain: PiKeychainLookup;
  readonly reconnectDelayMs?: number;
  readonly connect?: (endpoint: string) => Socket;
}

/** Main-process-only broker. Product Service and renderer never receive its authentication. */
export class NativeHostCredentialBroker {
  readonly #options: NativeHostCredentialBrokerOptions;
  #socket: Socket | null = null;
  #running = false;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: NativeHostCredentialBrokerOptions) {
    this.#options = options;
  }

  start(): void {
    this.#running = true;
    if (this.#socket) return;
    const socket = (this.#options.connect ?? createConnection)(this.#options.endpoint);
    this.#socket = socket;
    let buffered = Buffer.alloc(0);
    let authenticated = false;
    const challenge = randomBytes(32).toString("base64url");

    const respond = async (
      request: NativeHostBrokerAvailabilityRequest | NativeHostBrokerCredentialRequest,
    ) => {
      const available =
        request.kind === "broker.availability.request"
          ? await this.#options.keychain.available(request.provider)
          : false;
      const credential =
        request.kind === "broker.credential.request"
          ? await this.#options.keychain.credential(request.provider)
          : null;
      if (socket.destroyed || !authenticated || socket !== this.#socket) return;
      socket.write(
        encodeNativeHostFrame(
          request.kind === "broker.availability.request"
            ? {
                protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
                kind: "broker.availability.response",
                brokerRequestId: request.brokerRequestId,
                desktopInstanceId: request.desktopInstanceId,
                hostInstanceId: request.hostInstanceId,
                provider: request.provider,
                available,
              }
            : {
                protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
                kind: "broker.credential.response",
                brokerRequestId: request.brokerRequestId,
                desktopInstanceId: request.desktopInstanceId,
                hostInstanceId: request.hostInstanceId,
                provider: request.provider,
                runId: request.runId,
                credential,
              },
        ),
      );
    };

    socket.once("connect", () => {
      socket.write(
        encodeNativeHostFrame({
          protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
          kind: "broker.hello",
          desktopInstanceId: this.#options.desktopInstanceId,
          challenge,
          proof: proof(
            this.#options.authentication,
            nativeHostBrokerClientProofPayload({
              desktopInstanceId: this.#options.desktopInstanceId,
              challenge,
            }),
          ),
        }),
      );
    });
    socket.on("data", (chunk: Buffer) => {
      buffered = Buffer.concat([buffered, chunk]);
      for (;;) {
        const newline = buffered.indexOf(0x0a);
        if (newline < 0) break;
        if (newline > NATIVE_HOST_MAX_FRAME_BYTES) {
          socket.destroy();
          return;
        }
        const frameBytes = buffered.subarray(0, newline);
        buffered = buffered.subarray(newline + 1);
        try {
          const frame = decodeNativeHostFrame(frameBytes, "host-to-service");
          if (!authenticated) {
            if (
              frame.kind !== "host.broker-hello" ||
              frame.desktopInstanceId !== this.#options.desktopInstanceId ||
              frame.hostInstanceId !== this.#options.hostInstanceId ||
              frame.challenge !== challenge ||
              !equalProof(
                proof(
                  this.#options.authentication,
                  nativeHostBrokerServerProofPayload({
                    desktopInstanceId: frame.desktopInstanceId,
                    hostInstanceId: frame.hostInstanceId,
                    challenge: frame.challenge,
                    hostChallenge: frame.hostChallenge,
                  }),
                ),
                frame.proof,
              )
            ) {
              socket.destroy();
              return;
            }
            authenticated = true;
            continue;
          }
          if (
            frame.kind !== "broker.availability.request" &&
            frame.kind !== "broker.credential.request"
          ) {
            socket.destroy();
            return;
          }
          void respond(frame);
        } catch {
          socket.destroy();
          return;
        }
      }
      if (buffered.byteLength > NATIVE_HOST_MAX_FRAME_BYTES) socket.destroy();
    });
    socket.once("error", () => socket.destroy());
    socket.once("close", () => {
      if (this.#socket === socket) this.#socket = null;
      if (!this.#running || this.#reconnectTimer) return;
      this.#reconnectTimer = setTimeout(() => {
        this.#reconnectTimer = null;
        if (this.#running) this.start();
      }, this.#options.reconnectDelayMs ?? 500);
      this.#reconnectTimer.unref();
    });
  }

  stop(): void {
    this.#running = false;
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
    const socket = this.#socket;
    this.#socket = null;
    if (socket && !socket.destroyed) socket.destroy();
  }
}
