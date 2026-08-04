import { randomBytes, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductQueueItemId,
  ProductWorkspaceId,
} from "@omnimind/contracts";
import { Effect, ManagedRuntime } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  PRODUCT_DATABASE_FILENAME,
  ProductControlPlane,
  makeProductControlPlaneLayer,
} from "../product/ProductControlPlane";
import { NativeHostClient } from "./client";

const hostEntry = fileURLToPath(new URL("../../../native-host/dist/index.mjs", import.meta.url));
const serviceEntry = fileURLToPath(new URL("../../dist/index.mjs", import.meta.url));
const children = new Set<ChildProcess>();
const roots: string[] = [];

async function reservePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

async function waitForOutput(child: ChildProcess, fragment: string): Promise<string> {
  let output = "";
  return await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for ${fragment}: ${output}`)),
      20_000,
    );
    const receive = (chunk: Buffer) => {
      output += chunk.toString("utf8");
      if (output.includes(fragment)) {
        clearTimeout(timeout);
        resolve(output);
      }
    };
    child.stdout?.on("data", receive);
    child.stderr?.on("data", receive);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`Process exited code=${code} signal=${signal}: ${output}`));
    });
  });
}

async function waitForExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => child.once("exit", () => resolve()));
}

afterEach(async () => {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await waitForExit(child);
  }
  children.clear();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("production Service and Native Host fault boundary", () => {
  it("keeps Product facts and Queue readable while Service restarts independently", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-service-host-fault-"));
    roots.push(root);
    await fs.mkdir(path.join(root, "userdata"), { recursive: true });
    const productFilename = path.join(root, "userdata", PRODUCT_DATABASE_FILENAME);
    const runtime = ManagedRuntime.make(makeProductControlPlaneLayer(productFilename));
    const controlPlane = await runtime.runPromise(Effect.service(ProductControlPlane));
    const conversationId = ProductConversationId.makeUnsafe("conversation-service-fault");
    await runtime.runPromise(
      controlPlane.createConversation({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        workspaceId: ProductWorkspaceId.makeUnsafe("workspace-service-fault"),
        title: "Service fault snapshot",
        workspace: {
          kind: "chat",
          managedDirectory: null,
          primaryFolder: null,
          executionTarget: null,
          writeAuthority: "read-only-references",
        },
      }),
    );
    await runtime.runPromise(
      controlPlane.putQueueItem({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        itemId: ProductQueueItemId.makeUnsafe("queue-service-fault"),
        text: "preserve this queued intent",
        requestedSelection: {
          engineId: "native-engine",
          modelId: null,
          thinking: null,
          permissionPolicy: "approval-required",
          enforcement: "unverified",
          executionTarget: null,
          packageGeneration: "unresolved-not-activated",
        },
        resources: [],
        expectedRevision: null,
      }),
    );
    await runtime.dispose();

    const identity = randomUUID();
    const endpoint =
      process.platform === "win32"
        ? `\\\\.\\pipe\\omnimind-service-host-${identity}`
        : path.join(root, "native-host.sock");
    const authentication = randomBytes(32).toString("base64url");
    const sharedEnv = {
      ...process.env,
      OMNIMIND_NATIVE_HOST_ENDPOINT: endpoint,
      OMNIMIND_NATIVE_HOST_AUTH: authentication,
      OMNIMIND_NATIVE_HOST_INSTANCE: `host-${identity}`,
      OMNIMIND_HOME: root,
    };
    const host = spawn(process.execPath, [hostEntry], {
      env: sharedEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.add(host);
    await waitForOutput(host, "OMNIMIND_NATIVE_HOST_READY protocol=1");

    const startService = async () => {
      const port = await reservePort();
      const service = spawn(process.execPath, [serviceEntry], {
        env: {
          ...sharedEnv,
          OMNIMIND_HOME: root,
          OMNIMIND_HOST: "127.0.0.1",
          OMNIMIND_PORT: String(port),
          OMNIMIND_NO_BROWSER: "1",
          OMNIMIND_AUTH_TOKEN: randomBytes(24).toString("hex"),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      children.add(service);
      await waitForOutput(service, "OMNIMIND_NATIVE_HOST_AUTHENTICATED protocol=1");
      return service;
    };

    const firstService = await startService();
    firstService.kill("SIGKILL");
    await waitForExit(firstService);
    children.delete(firstService);
    const hostClient = new NativeHostClient({
      endpoint,
      authentication,
      hostInstanceId: sharedEnv.OMNIMIND_NATIVE_HOST_INSTANCE,
    });
    await expect(hostClient.liveness()).resolves.toBe(true);

    const reopened = ManagedRuntime.make(makeProductControlPlaneLayer(productFilename));
    const reopenedControlPlane = await reopened.runPromise(Effect.service(ProductControlPlane));
    const snapshot = await reopened.runPromise(
      reopenedControlPlane.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
      }),
    );
    expect(snapshot.readModel.conversation.title).toBe("Service fault snapshot");
    expect(snapshot.readModel.queue).toMatchObject([
      { id: "queue-service-fault", text: "preserve this queued intent" },
    ]);
    await reopened.dispose();

    const secondService = await startService();
    expect(secondService.pid).not.toBe(firstService.pid);
    secondService.kill("SIGTERM");
    await waitForExit(secondService);
    children.delete(secondService);
    await expect(hostClient.liveness()).resolves.toBe(true);

    const productDatabaseBytes = Buffer.concat(
      await Promise.all(
        [productFilename, `${productFilename}-wal`, `${productFilename}-shm`].map(
          async (filename) =>
            fs.readFile(filename).catch((error: unknown) => {
              if (
                error &&
                typeof error === "object" &&
                "code" in error &&
                error.code === "ENOENT"
              ) {
                return Buffer.alloc(0);
              }
              throw error;
            }),
        ),
      ),
    );
    expect(productDatabaseBytes.includes(Buffer.from(authentication, "utf8"))).toBe(false);
    expect(productDatabaseBytes.includes(Buffer.from(endpoint, "utf8"))).toBe(false);
  }, 45_000);
});
