import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { NATIVE_HOST_MAX_FRAME_BYTES } from "@omnimind/contracts/native-host";
import { makeNativeHostClientFromEnvironment, NativeHostClient } from "./client";

const productionEntry = fileURLToPath(
  new URL("../../../native-host/dist/index.mjs", import.meta.url),
);
const children = new Set<ChildProcess>();
const temporaryDirectories = new Set<string>();

function rendezvous() {
  const directory = mkdtempSync(join(tmpdir(), "omnimind-native-host-test-"));
  temporaryDirectories.add(directory);
  const id = randomUUID();
  return {
    home: directory,
    endpoint:
      process.platform === "win32"
        ? `\\\\.\\pipe\\omnimind-native-host-test-${id}`
        : join(directory, "host.sock"),
    authentication: randomBytes(32).toString("base64url"),
    hostInstanceId: `host-${id}`,
  };
}

async function startHost(config: ReturnType<typeof rendezvous>) {
  const child = spawn(process.execPath, [productionEntry], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      OMNIMIND_NATIVE_HOST_ENDPOINT: config.endpoint,
      OMNIMIND_NATIVE_HOST_AUTH: config.authentication,
      OMNIMIND_NATIVE_HOST_INSTANCE: config.hostInstanceId,
      OMNIMIND_HOME: config.home,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.add(child);
  let output = "";
  let stderr = "";
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  await new Promise<void>((resolveReady, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Host readiness timed out: ${stderr}`)),
      5_000,
    );
    child.stdout?.on("data", (chunk) => {
      output += chunk.toString("utf8");
      if (output.includes("OMNIMIND_NATIVE_HOST_READY protocol=1")) {
        clearTimeout(timeout);
        resolveReady();
      }
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`Host exited before readiness code=${code} signal=${signal}: ${stderr}`));
    });
  });
  return { child, readOutput: () => `${output}${stderr}` };
}

async function waitForExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
}

function writeAndWaitForClose(endpoint: string, bytes: Buffer): Promise<void> {
  return new Promise((resolveClose, reject) => {
    const socket = createConnection(endpoint);
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Invalid protocol connection did not fail closed."));
    }, 2_000);
    socket.once("connect", () => socket.write(bytes));
    socket.once("close", () => {
      clearTimeout(timeout);
      resolveClose();
    });
    socket.once("error", () => undefined);
  });
}

afterEach(async () => {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await waitForExit(child);
  }
  children.clear();
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.clear();
});

describe("production Native Host protocol", () => {
  it("mutually authenticates, reports the Pi runtime, rejects unresolved execution and shuts down", async () => {
    const config = rendezvous();
    const { child, readOutput } = await startHost(config);
    expect(child.spawnargs.join(" ")).not.toContain(config.authentication);
    expect(child.spawnargs.join(" ")).not.toContain(config.endpoint);

    const client = new NativeHostClient(config);
    await expect(client.liveness()).resolves.toBe(true);
    expect(
      makeNativeHostClientFromEnvironment({
        OMNIMIND_NATIVE_HOST_ENDPOINT: config.endpoint,
        OMNIMIND_NATIVE_HOST_AUTH: config.authentication,
      }),
    ).toBeNull();
    await expect(
      makeNativeHostClientFromEnvironment({
        OMNIMIND_NATIVE_HOST_ENDPOINT: config.endpoint,
        OMNIMIND_NATIVE_HOST_AUTH: config.authentication,
        OMNIMIND_NATIVE_HOST_INSTANCE: config.hostInstanceId,
      })?.liveness(),
    ).resolves.toBe(true);
    await expect(client.health()).resolves.toMatchObject({
      kind: "health.response",
      status: "ready",
      execution: "available",
      runtime: "pi",
    });
    const catalog = await client.catalog();
    expect(catalog).toMatchObject({
      kind: "runtime.catalog.response",
      engineId: "pi",
      runtimeVersion: "0.81.1",
    });
    let oversizedPersisted = 0;
    await expect(
      client.execute(
        {
          dispatchId: "dispatch-unicode-oversized",
          conversationId: "conversation-unicode-oversized",
          runId: "run-unicode-oversized",
          text: "😀".repeat(16_384),
          selection: {
            engineId: "pi",
            modelId: null,
            thinking: null,
            permissionPolicy: "approval-required",
            enforcement: "unverified",
            packageGeneration: catalog.packageGeneration,
          },
          workspace: { kind: "chat", cwd: null },
          priorLineageRef: null,
        },
        async () => {
          oversizedPersisted += 1;
        },
      ),
    ).rejects.toMatchObject({
      code: "NATIVE_HOST_REQUEST_OVERSIZED",
      retryable: false,
    });
    expect(oversizedPersisted).toBe(0);
    await expect(client.liveness()).resolves.toBe(true);

    let persisted = 0;
    await expect(
      client.execute(
        {
          dispatchId: "dispatch-1",
          conversationId: "conversation-1",
          runId: "run-1",
          text: "hello",
          selection: {
            engineId: "pi",
            modelId: null,
            thinking: null,
            permissionPolicy: "approval-required",
            enforcement: "unverified",
            packageGeneration: catalog.packageGeneration,
          },
          workspace: { kind: "chat", cwd: null },
          priorLineageRef: null,
        },
        async () => {
          persisted += 1;
        },
      ),
    ).resolves.toMatchObject({
      kind: "execution.rejected",
      code: "PI_MODEL_UNAVAILABLE",
      retryable: false,
    });
    expect(persisted).toBe(1);

    await client.shutdown();
    await waitForExit(child);
    children.delete(child);
    expect(child.exitCode).toBe(0);
    expect(readOutput()).not.toContain(config.authentication);
    expect(readOutput()).not.toContain(config.endpoint);
  });

  it("fails closed for invalid auth, version, type and size without weakening the endpoint", async () => {
    const config = rendezvous();
    const { child } = await startHost(config);
    const invalidClient = new NativeHostClient({
      ...config,
      authentication: randomBytes(32).toString("base64url"),
    });
    await expect(invalidClient.liveness()).rejects.toMatchObject({
      code: "NATIVE_HOST_UNAVAILABLE",
    });
    const wrongInstanceClient = new NativeHostClient({
      ...config,
      hostInstanceId: `wrong-${config.hostInstanceId}`,
    });
    await expect(wrongInstanceClient.liveness()).rejects.toMatchObject({
      code: "NATIVE_HOST_AUTHENTICATION_FAILED",
      retryable: false,
    });

    await writeAndWaitForClose(
      config.endpoint,
      Buffer.from(
        `${JSON.stringify({
          protocolVersion: 2,
          kind: "client.hello",
          serviceInstanceId: "service-invalid-version",
          challenge: "a".repeat(32),
          proof: "b".repeat(43),
        })}\n`,
      ),
    );
    await writeAndWaitForClose(
      config.endpoint,
      Buffer.from(
        `${JSON.stringify({
          protocolVersion: 1,
          kind: "execution.accepted",
          serviceInstanceId: "service-invalid-type",
        })}\n`,
      ),
    );
    await writeAndWaitForClose(
      config.endpoint,
      Buffer.alloc(NATIVE_HOST_MAX_FRAME_BYTES + 1, 0x61),
    );

    const validClient = new NativeHostClient(config);
    await expect(validClient.liveness()).resolves.toBe(true);
    await validClient.shutdown();
    await waitForExit(child);
    children.delete(child);
  });
});
