import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import { createServer, type Server, type Socket } from "node:net";

import {
  NATIVE_HOST_MAX_FRAME_BYTES,
  NATIVE_HOST_PROTOCOL_VERSION,
  decodeNativeHostFrame,
  encodeNativeHostFrame,
  nativeHostClientProofPayload,
  nativeHostServerProofPayload,
  type NativeHostClientHello,
  type NativeHostRequest,
  type NativeHostResponse,
} from "@omnimind/contracts/native-host";

const ENDPOINT_ENV = "OMNIMIND_NATIVE_HOST_ENDPOINT";
const AUTH_ENV = "OMNIMIND_NATIVE_HOST_AUTH";
const INSTANCE_ENV = "OMNIMIND_NATIVE_HOST_INSTANCE";
const READY_LINE = `OMNIMIND_NATIVE_HOST_READY protocol=${NATIVE_HOST_PROTOCOL_VERSION}`;
const startedAt = Date.now();

interface NativeHostConfig {
  readonly endpoint: string;
  readonly authentication: string;
  readonly hostInstanceId: string;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Native Host requires ${name}.`);
  return value;
}

function readConfig(): NativeHostConfig {
  const authentication = requiredEnvironment(AUTH_ENV);
  if (authentication.length < 32) {
    throw new Error("Native Host authentication material was invalid.");
  }
  return {
    endpoint: requiredEnvironment(ENDPOINT_ENV),
    authentication,
    hostInstanceId: requiredEnvironment(INSTANCE_ENV),
  };
}

function proof(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

function equalProof(expected: string, presented: string): boolean {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(presented, "utf8");
  return left.byteLength === right.byteLength && timingSafeEqual(left, right);
}

function removeSocketFile(endpoint: string): void {
  if (process.platform !== "win32" && existsSync(endpoint)) {
    unlinkSync(endpoint);
  }
}

function writeFrame(
  socket: Socket,
  frame: NativeHostResponse | ReturnType<typeof makeServerHello>,
): void {
  socket.write(encodeNativeHostFrame(frame));
}

function makeServerHello(config: NativeHostConfig, hello: NativeHostClientHello) {
  const hostChallenge = randomBytes(32).toString("base64url");
  return {
    protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
    kind: "host.hello" as const,
    serviceInstanceId: hello.serviceInstanceId,
    hostInstanceId: config.hostInstanceId,
    challenge: hello.challenge,
    hostChallenge,
    proof: proof(
      config.authentication,
      nativeHostServerProofPayload({
        serviceInstanceId: hello.serviceInstanceId,
        hostInstanceId: config.hostInstanceId,
        challenge: hello.challenge,
        hostChallenge,
      }),
    ),
    ready: true as const,
  };
}

function responseEnvelope(request: NativeHostRequest) {
  return {
    protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
    requestId: request.requestId,
    serviceInstanceId: request.serviceInstanceId,
    hostInstanceId: request.hostInstanceId,
  } as const;
}

function responseFor(request: NativeHostRequest): NativeHostResponse {
  const envelope = responseEnvelope(request);
  switch (request.kind) {
    case "liveness.request":
      return { ...envelope, kind: "liveness.response", alive: true };
    case "health.request":
      return {
        ...envelope,
        kind: "health.response",
        status: "ready",
        execution: "unsupported",
        uptimeMs: Math.max(0, Date.now() - startedAt),
      };
    case "execution.request":
      return {
        ...envelope,
        kind: "execution.unsupported",
        code: "NATIVE_HOST_EXECUTION_UNSUPPORTED",
        message:
          "Execution is unavailable until the isolated Native Host is extended with the native runtime.",
        retryable: false,
      };
    case "shutdown.request":
      return { ...envelope, kind: "shutdown.ack" };
  }
}

function attachConnection(
  socket: Socket,
  config: NativeHostConfig,
  requestShutdown: () => void,
): void {
  let buffered = Buffer.alloc(0);
  let hello: NativeHostClientHello | null = null;
  let complete = false;

  const reject = () => {
    complete = true;
    socket.destroy();
  };

  socket.on("data", (chunk: Buffer) => {
    if (complete) return;
    buffered = Buffer.concat([buffered, chunk]);
    if (buffered.byteLength > NATIVE_HOST_MAX_FRAME_BYTES) {
      reject();
      return;
    }
    const newline = buffered.indexOf(0x0a);
    if (newline < 0) return;
    if (newline !== buffered.byteLength - 1) {
      reject();
      return;
    }

    try {
      const frame = decodeNativeHostFrame(buffered.subarray(0, newline), "service-to-host");
      buffered = Buffer.alloc(0);
      if (hello === null) {
        if (frame.kind !== "client.hello") {
          reject();
          return;
        }
        const expected = proof(
          config.authentication,
          nativeHostClientProofPayload({
            serviceInstanceId: frame.serviceInstanceId,
            challenge: frame.challenge,
          }),
        );
        if (!equalProof(expected, frame.proof)) {
          reject();
          return;
        }
        hello = frame;
        writeFrame(socket, makeServerHello(config, frame));
        return;
      }

      if (
        !["liveness.request", "health.request", "execution.request", "shutdown.request"].includes(
          frame.kind,
        )
      ) {
        reject();
        return;
      }
      const request = frame as NativeHostRequest;
      if (
        request.serviceInstanceId !== hello.serviceInstanceId ||
        request.hostInstanceId !== config.hostInstanceId
      ) {
        reject();
        return;
      }
      const shouldShutdown = request.kind === "shutdown.request";
      writeFrame(socket, responseFor(request));
      complete = true;
      socket.end(() => {
        if (shouldShutdown) requestShutdown();
      });
    } catch {
      reject();
    }
  });

  socket.on("error", () => {
    complete = true;
  });
}

async function main(): Promise<void> {
  let config: NativeHostConfig;
  try {
    config = readConfig();
    removeSocketFile(config.endpoint);
  } catch {
    process.stderr.write("Native Host configuration failed.\n");
    process.exitCode = 1;
    return;
  }

  const sockets = new Set<Socket>();
  let closing = false;
  let server: Server;
  const finish = () => {
    try {
      removeSocketFile(config.endpoint);
    } finally {
      process.exitCode = 0;
    }
  };
  const shutdown = () => {
    if (closing) return;
    closing = true;
    for (const socket of sockets) socket.end();
    server.close(finish);
  };

  server = createServer((socket) => {
    if (closing) {
      socket.destroy();
      return;
    }
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    attachConnection(socket, config, shutdown);
  });
  server.on("error", () => {
    process.stderr.write("Native Host endpoint failed.\n");
    process.exitCode = 1;
  });

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  server.listen(config.endpoint, () => {
    process.stdout.write(`${READY_LINE}\n`);
  });
}

await main();
