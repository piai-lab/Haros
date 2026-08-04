import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import { createServer, type Server, type Socket } from "node:net";

import {
  NATIVE_HOST_MAX_FRAME_BYTES,
  NATIVE_HOST_PROTOCOL_VERSION,
  decodeNativeHostFrame,
  encodeNativeHostFrame,
  nativeHostBrokerClientProofPayload,
  nativeHostBrokerServerProofPayload,
  nativeHostClientProofPayload,
  nativeHostServerProofPayload,
  type NativeHostClientHello,
  type NativeHostBrokerHello,
  type NativeHostBrokerServerHello,
  type NativeHostFrame,
  type NativeHostRequest,
  type NativeHostResponse,
} from "@omnimind/contracts/native-host";
import { NativeCredentialBroker } from "./credentialBroker";
import { PI_RUNTIME_VERSION, PiNativeRuntime } from "./piRuntime";
import { fitNativeHostResponseFrame } from "./responseFrame";

const ENDPOINT_ENV = "OMNIMIND_NATIVE_HOST_ENDPOINT";
const AUTH_ENV = "OMNIMIND_NATIVE_HOST_AUTH";
const INSTANCE_ENV = "OMNIMIND_NATIVE_HOST_INSTANCE";
const BROKER_AUTH_ENV = "OMNIMIND_NATIVE_HOST_BROKER_AUTH";
const READY_LINE = `OMNIMIND_NATIVE_HOST_READY protocol=${NATIVE_HOST_PROTOCOL_VERSION}`;
const startedAt = Date.now();

interface NativeHostConfig {
  readonly endpoint: string;
  readonly authentication: string;
  readonly hostInstanceId: string;
  readonly brokerAuthentication: string | null;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Native Host requires ${name}.`);
  return value;
}

function readConfig(): NativeHostConfig {
  const authentication = requiredEnvironment(AUTH_ENV);
  const brokerAuthentication = process.env[BROKER_AUTH_ENV]?.trim() || null;
  if (authentication.length < 32) {
    throw new Error("Native Host authentication material was invalid.");
  }
  if (brokerAuthentication !== null && brokerAuthentication.length < 32) {
    throw new Error("Native Host broker authentication material was invalid.");
  }
  return {
    endpoint: requiredEnvironment(ENDPOINT_ENV),
    authentication,
    hostInstanceId: requiredEnvironment(INSTANCE_ENV),
    brokerAuthentication,
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

function writeFrame(socket: Socket, frame: NativeHostFrame): void {
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

function makeBrokerServerHello(
  config: NativeHostConfig,
  hello: NativeHostBrokerHello,
): NativeHostBrokerServerHello {
  const hostChallenge = randomBytes(32).toString("base64url");
  return {
    protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
    kind: "host.broker-hello",
    desktopInstanceId: hello.desktopInstanceId,
    hostInstanceId: config.hostInstanceId,
    challenge: hello.challenge,
    hostChallenge,
    proof: proof(
      config.brokerAuthentication!,
      nativeHostBrokerServerProofPayload({
        desktopInstanceId: hello.desktopInstanceId,
        hostInstanceId: config.hostInstanceId,
        challenge: hello.challenge,
        hostChallenge,
      }),
    ),
    ready: true,
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

async function responseFor(
  request: NativeHostRequest,
  runtime: PiNativeRuntime,
): Promise<NativeHostResponse> {
  const envelope = responseEnvelope(request);
  switch (request.kind) {
    case "liveness.request":
      return { ...envelope, kind: "liveness.response", alive: true };
    case "health.request":
      return {
        ...envelope,
        kind: "health.response",
        status: "ready",
        execution: "available",
        uptimeMs: Math.max(0, Date.now() - startedAt),
        runtime: "pi",
        runtimeVersion: PI_RUNTIME_VERSION,
      };
    case "runtime.catalog.request":
      return { ...envelope, ...(await runtime.catalog()) };
    case "execution.request":
      return { ...envelope, ...(await runtime.execute(request)) };
    case "runtime.facts.request":
      return { ...envelope, ...runtime.facts(request.operationRef, request.afterSequence) };
    case "runtime.control.request":
      return { ...envelope, ...(await runtime.control(request)) };
    case "runtime.reconcile.request":
      return {
        ...envelope,
        ...(await runtime.reconcile(request.operationRef, request.afterSequence)),
      };
    case "shutdown.request":
      return { ...envelope, kind: "shutdown.ack" };
  }
}

function attachConnection(
  socket: Socket,
  config: NativeHostConfig,
  runtime: PiNativeRuntime,
  credentialBroker: NativeCredentialBroker,
  requestShutdown: () => void,
): void {
  let buffered = Buffer.alloc(0);
  let hello: NativeHostClientHello | null = null;
  let brokerHello: NativeHostBrokerHello | null = null;
  let complete = false;

  const reject = () => {
    complete = true;
    socket.destroy();
  };

  const receiveFrame = (frameBytes: Buffer) => {
    try {
      const frame = decodeNativeHostFrame(frameBytes, "service-to-host");
      if (hello === null && brokerHello === null) {
        if (frame.kind === "broker.hello") {
          if (!config.brokerAuthentication) {
            reject();
            return;
          }
          const expected = proof(
            config.brokerAuthentication,
            nativeHostBrokerClientProofPayload({
              desktopInstanceId: frame.desktopInstanceId,
              challenge: frame.challenge,
            }),
          );
          if (!equalProof(expected, frame.proof)) {
            reject();
            return;
          }
          brokerHello = frame;
          credentialBroker.attach(socket, frame.desktopInstanceId);
          writeFrame(socket, makeBrokerServerHello(config, frame));
          return;
        }
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

      if (brokerHello) {
        if (
          frame.kind !== "broker.availability.response" &&
          frame.kind !== "broker.credential.response"
        ) {
          reject();
          return;
        }
        if (!credentialBroker.receive(frame)) reject();
        return;
      }

      if (!frame.kind.endsWith(".request")) {
        reject();
        return;
      }
      const request = frame as NativeHostRequest;
      if (
        request.serviceInstanceId !== hello!.serviceInstanceId ||
        request.hostInstanceId !== config.hostInstanceId
      ) {
        reject();
        return;
      }
      const shouldShutdown = request.kind === "shutdown.request";
      complete = true;
      void responseFor(request, runtime).then(
        (response) => {
          writeFrame(socket, fitNativeHostResponseFrame(response));
          socket.end(() => {
            if (shouldShutdown) requestShutdown();
          });
        },
        () => socket.destroy(),
      );
    } catch {
      reject();
    }
  };

  socket.on("data", (chunk: Buffer) => {
    if (complete) return;
    buffered = Buffer.concat([buffered, chunk]);
    for (;;) {
      const newline = buffered.indexOf(0x0a);
      if (newline < 0) break;
      if (newline > NATIVE_HOST_MAX_FRAME_BYTES) {
        reject();
        return;
      }
      const frameBytes = buffered.subarray(0, newline);
      buffered = buffered.subarray(newline + 1);
      receiveFrame(frameBytes);
      if (complete) return;
    }
    if (buffered.byteLength > NATIVE_HOST_MAX_FRAME_BYTES) reject();
  });

  socket.on("error", () => {
    complete = true;
  });
}

async function main(): Promise<void> {
  let config: NativeHostConfig;
  let runtime: PiNativeRuntime;
  let credentialBroker: NativeCredentialBroker;
  try {
    config = readConfig();
    removeSocketFile(config.endpoint);
    credentialBroker = new NativeCredentialBroker(config.hostInstanceId);
    runtime = await PiNativeRuntime.create({
      productHome: requiredEnvironment("OMNIMIND_HOME"),
      credentialBroker,
    });
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
    void runtime.shutdown().finally(() => {
      credentialBroker.disconnect();
      server.close(finish);
    });
  };

  server = createServer((socket) => {
    if (closing) {
      socket.destroy();
      return;
    }
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    attachConnection(socket, config, runtime, credentialBroker, shutdown);
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
