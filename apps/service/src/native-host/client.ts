import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createConnection, type Socket } from "node:net";

import {
  NATIVE_HOST_MAX_FRAME_BYTES,
  NATIVE_HOST_PROTOCOL_VERSION,
  decodeNativeHostFrame,
  encodeNativeHostFrame,
  nativeHostClientProofPayload,
  nativeHostServerProofPayload,
  type NativeHostFrame,
  type NativeHostRequest,
  type NativeHostResponse,
} from "@omnimind/contracts/native-host";

const CONNECT_TIMEOUT_MS = 2_000;
const RESPONSE_TIMEOUT_MS = 3_000;

export class NativeHostClientError extends Error {
  readonly code:
    | "NATIVE_HOST_UNCONFIGURED"
    | "NATIVE_HOST_UNAVAILABLE"
    | "NATIVE_HOST_AUTHENTICATION_FAILED"
    | "NATIVE_HOST_PROTOCOL_FAILURE";
  readonly retryable: boolean;

  constructor(code: NativeHostClientError["code"], message: string, retryable: boolean) {
    super(message);
    this.name = "NativeHostClientError";
    this.code = code;
    this.retryable = retryable;
  }
}

export interface NativeHostClientConfig {
  readonly endpoint: string;
  readonly authentication: string;
  readonly hostInstanceId: string;
  readonly serviceInstanceId?: string;
}

interface NativeHostConnection {
  readonly socket: Socket;
  readonly readFrame: () => Promise<NativeHostFrame>;
}

function proof(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

function equalProof(expected: string, presented: string): boolean {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(presented, "utf8");
  return left.byteLength === right.byteLength && timingSafeEqual(left, right);
}

function connectSocket(endpoint: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(endpoint);
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(
        new NativeHostClientError(
          "NATIVE_HOST_UNAVAILABLE",
          "Native Host did not accept the local connection in time.",
          true,
        ),
      );
    }, CONNECT_TIMEOUT_MS);
    timeout.unref();
    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.removeAllListeners("error");
      resolve(socket);
    });
    socket.once("error", () => {
      clearTimeout(timeout);
      reject(
        new NativeHostClientError(
          "NATIVE_HOST_UNAVAILABLE",
          "Native Host local connection was unavailable.",
          true,
        ),
      );
    });
  });
}

function makeFrameReader(socket: Socket): () => Promise<NativeHostFrame> {
  let buffered = Buffer.alloc(0);
  const queued: Buffer[] = [];
  const waiters: Array<{
    resolve: (frame: NativeHostFrame) => void;
    reject: (error: Error) => void;
  }> = [];
  let failure: Error | null = null;

  const fail = (error: Error) => {
    if (failure) return;
    failure = error;
    for (const waiter of waiters.splice(0)) waiter.reject(error);
  };
  const drain = () => {
    while (queued.length > 0 && waiters.length > 0) {
      const frameBytes = queued.shift();
      const waiter = waiters.shift();
      if (!frameBytes || !waiter) break;
      try {
        waiter.resolve(decodeNativeHostFrame(frameBytes, "host-to-service"));
      } catch {
        waiter.reject(
          new NativeHostClientError(
            "NATIVE_HOST_PROTOCOL_FAILURE",
            "Native Host returned an invalid protocol frame.",
            false,
          ),
        );
        socket.destroy();
      }
    }
  };
  socket.on("data", (chunk: Buffer) => {
    buffered = Buffer.concat([buffered, chunk]);
    if (buffered.byteLength > NATIVE_HOST_MAX_FRAME_BYTES) {
      fail(
        new NativeHostClientError(
          "NATIVE_HOST_PROTOCOL_FAILURE",
          "Native Host response exceeded the protocol size bound.",
          false,
        ),
      );
      socket.destroy();
      return;
    }
    for (;;) {
      const newline = buffered.indexOf(0x0a);
      if (newline < 0) break;
      queued.push(buffered.subarray(0, newline));
      buffered = buffered.subarray(newline + 1);
    }
    drain();
  });
  socket.once("error", () =>
    fail(
      new NativeHostClientError(
        "NATIVE_HOST_UNAVAILABLE",
        "Native Host local connection failed.",
        true,
      ),
    ),
  );
  socket.once("close", () =>
    fail(
      new NativeHostClientError(
        "NATIVE_HOST_UNAVAILABLE",
        "Native Host closed the local connection before replying.",
        true,
      ),
    ),
  );

  return () =>
    new Promise((resolve, reject) => {
      if (failure) {
        reject(failure);
        return;
      }
      const timeout = setTimeout(() => {
        reject(
          new NativeHostClientError(
            "NATIVE_HOST_UNAVAILABLE",
            "Native Host did not reply in time.",
            true,
          ),
        );
        socket.destroy();
      }, RESPONSE_TIMEOUT_MS);
      timeout.unref();
      waiters.push({
        resolve: (frame) => {
          clearTimeout(timeout);
          resolve(frame);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      drain();
    });
}

export class NativeHostClient {
  readonly #config: Required<NativeHostClientConfig>;

  constructor(config: NativeHostClientConfig) {
    if (
      !config.endpoint.trim() ||
      config.authentication.length < 32 ||
      !config.hostInstanceId.trim()
    ) {
      throw new NativeHostClientError(
        "NATIVE_HOST_UNCONFIGURED",
        "Native Host rendezvous is not configured.",
        false,
      );
    }
    this.#config = {
      ...config,
      hostInstanceId: config.hostInstanceId.trim(),
      serviceInstanceId: config.serviceInstanceId ?? `service-${randomUUID()}`,
    };
  }

  async #connect(): Promise<NativeHostConnection> {
    const socket = await connectSocket(this.#config.endpoint);
    const readFrame = makeFrameReader(socket);
    const challenge = randomBytes(32).toString("base64url");
    socket.write(
      encodeNativeHostFrame({
        protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
        kind: "client.hello",
        serviceInstanceId: this.#config.serviceInstanceId,
        challenge,
        proof: proof(
          this.#config.authentication,
          nativeHostClientProofPayload({
            serviceInstanceId: this.#config.serviceInstanceId,
            challenge,
          }),
        ),
      }),
    );
    const frame = await readFrame();
    if (
      frame.kind !== "host.hello" ||
      frame.serviceInstanceId !== this.#config.serviceInstanceId ||
      frame.hostInstanceId !== this.#config.hostInstanceId ||
      frame.challenge !== challenge
    ) {
      socket.destroy();
      throw new NativeHostClientError(
        "NATIVE_HOST_AUTHENTICATION_FAILED",
        "Native Host handshake identity was invalid.",
        false,
      );
    }
    const expectedProof = proof(
      this.#config.authentication,
      nativeHostServerProofPayload({
        serviceInstanceId: frame.serviceInstanceId,
        hostInstanceId: this.#config.hostInstanceId,
        challenge: frame.challenge,
        hostChallenge: frame.hostChallenge,
      }),
    );
    if (!equalProof(expectedProof, frame.proof)) {
      socket.destroy();
      throw new NativeHostClientError(
        "NATIVE_HOST_AUTHENTICATION_FAILED",
        "Native Host mutual authentication failed.",
        false,
      );
    }
    return { socket, readFrame };
  }

  async #request(
    kind: NativeHostRequest["kind"],
    options: { readonly dispatchId?: string; readonly beforeSend?: () => Promise<void> } = {},
  ): Promise<NativeHostResponse> {
    const connection = await this.#connect();
    const requestId = `request-${randomUUID()}`;
    const base = {
      protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
      requestId,
      serviceInstanceId: this.#config.serviceInstanceId,
      hostInstanceId: this.#config.hostInstanceId,
    } as const;
    let request: NativeHostRequest;
    switch (kind) {
      case "liveness.request":
        request = { ...base, kind };
        break;
      case "health.request":
        request = { ...base, kind };
        break;
      case "execution.request":
        request = { ...base, kind, dispatchId: options.dispatchId ?? "missing-dispatch" };
        break;
      case "shutdown.request":
        request = { ...base, kind };
        break;
    }
    try {
      await options.beforeSend?.();
      connection.socket.write(encodeNativeHostFrame(request));
      const response = await connection.readFrame();
      if (
        !response.kind.endsWith(".response") &&
        response.kind !== "execution.unsupported" &&
        response.kind !== "shutdown.ack"
      ) {
        throw new NativeHostClientError(
          "NATIVE_HOST_PROTOCOL_FAILURE",
          "Native Host returned an unexpected response type.",
          false,
        );
      }
      if (
        !("requestId" in response) ||
        response.requestId !== requestId ||
        response.serviceInstanceId !== this.#config.serviceInstanceId ||
        response.hostInstanceId !== this.#config.hostInstanceId
      ) {
        throw new NativeHostClientError(
          "NATIVE_HOST_PROTOCOL_FAILURE",
          "Native Host response identity did not match the request.",
          false,
        );
      }
      connection.socket.end();
      return response as NativeHostResponse;
    } catch (error) {
      connection.socket.destroy();
      throw error;
    }
  }

  async liveness(): Promise<boolean> {
    const response = await this.#request("liveness.request");
    return response.kind === "liveness.response" && response.alive;
  }

  async health(): Promise<Extract<NativeHostResponse, { kind: "health.response" }>> {
    const response = await this.#request("health.request");
    if (response.kind !== "health.response") {
      throw new NativeHostClientError(
        "NATIVE_HOST_PROTOCOL_FAILURE",
        "Native Host returned the wrong health response.",
        false,
      );
    }
    return response;
  }

  async executeUnsupported(
    dispatchId: string,
    beforeSend: () => Promise<void>,
  ): Promise<Extract<NativeHostResponse, { kind: "execution.unsupported" }>> {
    const response = await this.#request("execution.request", { dispatchId, beforeSend });
    if (response.kind !== "execution.unsupported") {
      throw new NativeHostClientError(
        "NATIVE_HOST_PROTOCOL_FAILURE",
        "Pi-free Native Host returned execution evidence other than unsupported.",
        false,
      );
    }
    return response;
  }

  async shutdown(): Promise<void> {
    const response = await this.#request("shutdown.request");
    if (response.kind !== "shutdown.ack") {
      throw new NativeHostClientError(
        "NATIVE_HOST_PROTOCOL_FAILURE",
        "Native Host did not acknowledge controlled shutdown.",
        false,
      );
    }
  }
}

export function makeNativeHostClientFromEnvironment(
  environment: NodeJS.ProcessEnv,
): NativeHostClient | null {
  const endpoint = environment.OMNIMIND_NATIVE_HOST_ENDPOINT?.trim();
  const authentication = environment.OMNIMIND_NATIVE_HOST_AUTH?.trim();
  const hostInstanceId = environment.OMNIMIND_NATIVE_HOST_INSTANCE?.trim();
  if (!endpoint || !authentication || !hostInstanceId) return null;
  return new NativeHostClient({ endpoint, authentication, hostInstanceId });
}
