import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { NativeHostCredentialBroker } from "./nativeHostCredentialBroker";
import { createNativeHostRendezvous } from "./nativeHostRendezvous";
import { createNativeHostBaseEnvironment } from "./nativeHostEnvironment";
import {
  NATIVE_HOST_MAX_CRASHES,
  NativeHostProcessSupervisor,
  type NativeHostSupervisorState,
} from "./nativeHostSupervisor";

const productionEntry = fileURLToPath(
  new URL("../../../native-host/dist/index.mjs", import.meta.url),
);
const packageCrashProbeEntry = fileURLToPath(
  new URL("../../../service/src/native-host/packageCrashProbe.ts", import.meta.url),
);
const supervisors = new Set<NativeHostProcessSupervisor>();
const brokers = new Set<NativeHostCredentialBroker>();
const probes = new Set<ChildProcess>();
const temporaryRoots = new Set<string>();

async function waitForState(
  states: ReadonlyArray<NativeHostSupervisorState>,
  status: NativeHostSupervisorState["status"],
  timeoutMs = 5_000,
): Promise<NativeHostSupervisorState> {
  const started = Date.now();
  for (;;) {
    const match = [...states].reverse().find((state) => state.status === status);
    if (match) return match;
    if (Date.now() - started >= timeoutMs) {
      throw new Error(`Timed out waiting for Native Host state ${status}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

afterEach(async () => {
  for (const probe of probes) {
    if (probe.exitCode === null && probe.signalCode === null) probe.kill("SIGKILL");
  }
  await Promise.all(
    [...probes].map(
      (probe) =>
        probe.exitCode !== null || probe.signalCode !== null
          ? Promise.resolve()
          : new Promise<void>((resolve) => probe.once("exit", () => resolve())),
    ),
  );
  probes.clear();
  for (const broker of brokers) broker.stop();
  brokers.clear();
  await Promise.all([...supervisors].map((supervisor) => supervisor.stop(1_000)));
  supervisors.clear();
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
  temporaryRoots.clear();
});

describe("real Native Host child supervision", () => {
  it("restarts independently, opens its circuit and re-enters through explicit retry", async () => {
    const states: NativeHostSupervisorState[] = [];
    const preservedProductSnapshot = {
      conversationId: "conversation-preserved",
      queue: ["draft-preserved"],
      workbench: { activePane: "timeline" },
    } as const;
    const supervisor = new NativeHostProcessSupervisor({
      executable: process.execPath,
      entry: productionEntry,
      cwd: process.cwd(),
      environment: createNativeHostBaseEnvironment(process.env, process.cwd()),
      rendezvous: createNativeHostRendezvous(),
      onState: (state) => states.push(state),
    });
    supervisors.add(supervisor);
    supervisor.start();
    await waitForState(states, "starting");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(states.some((state) => state.status === "ready")).toBe(false);
    supervisor.recordAuthenticatedReadiness();

    for (let crash = 1; crash <= NATIVE_HOST_MAX_CRASHES; crash += 1) {
      const ready = await waitForState(states, "ready");
      expect(ready.pid).toBeTypeOf("number");
      const previousReadyCount = states.filter((state) => state.status === "ready").length;
      process.kill(ready.pid as number, "SIGKILL");
      if (crash < NATIVE_HOST_MAX_CRASHES) {
        const started = Date.now();
        while (supervisor.childPid() === null || supervisor.childPid() === ready.pid) {
          if (Date.now() - started > 5_000) throw new Error("Native Host did not restart.");
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(states.filter((state) => state.status === "ready")).toHaveLength(previousReadyCount);
        supervisor.recordAuthenticatedReadiness();
      }
    }

    const circuit = await waitForState(states, "circuitOpen");
    expect(circuit.restartAttempt).toBe(NATIVE_HOST_MAX_CRASHES);
    expect(preservedProductSnapshot).toEqual({
      conversationId: "conversation-preserved",
      queue: ["draft-preserved"],
      workbench: { activePane: "timeline" },
    });

    supervisor.retry();
    const readyCountBeforeRetry = states.filter((state) => state.status === "ready").length;
    const started = Date.now();
    while (supervisor.childPid() === null) {
      if (Date.now() - started > 5_000) throw new Error("Native Host did not re-enter.");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(states.filter((state) => state.status === "ready")).toHaveLength(readyCountBeforeRetry);
    supervisor.recordAuthenticatedReadiness();
    expect(supervisor.snapshot()).toMatchObject({ status: "ready", restartAttempt: 0 });
  });

  it("contains a Package-killed Host while real Product SQLite and Queue remain unreplayed", async () => {
    const productHome = mkdtempSync(path.join(tmpdir(), "omnimind-package-crash-proof-"));
    temporaryRoots.add(productHome);
    const extensionDirectory = path.join(productHome, "pi-native", "agent", "extensions");
    mkdirSync(extensionDirectory, { recursive: true, mode: 0o700 });
    writeFileSync(
      path.join(extensionDirectory, "terminate-host.ts"),
      'export default function () { process.kill(process.pid, "SIGKILL"); }\n',
      { encoding: "utf8", mode: 0o600 },
    );
    const resultFile = path.join(productHome, "package-crash-result.json");
    const productDatabase = path.join(productHome, "product-crash-proof.sqlite");
    const rendezvous = createNativeHostRendezvous({ temporaryDirectory: productHome });
    const brokerAuthentication = randomBytes(32).toString("base64url");
    const dummyCredential = "OpaqueProcessCanary987654321";
    let stdout = "";
    const supervisor = new NativeHostProcessSupervisor({
      executable: process.execPath,
      entry: productionEntry,
      cwd: process.cwd(),
      environment: {
        ...createNativeHostBaseEnvironment(process.env, productHome),
        OMNIMIND_NATIVE_HOST_BROKER_AUTH: brokerAuthentication,
      },
      rendezvous,
      onState: () => undefined,
      onStdout: (chunk) => {
        stdout = `${stdout}${chunk.toString("utf8")}`.slice(-2_048);
      },
    });
    supervisors.add(supervisor);
    supervisor.start();
    const readyStarted = Date.now();
    while (!stdout.includes("OMNIMIND_NATIVE_HOST_READY protocol=1")) {
      if (Date.now() - readyStarted > 5_000) throw new Error("Native Host readiness timed out.");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const firstHostPid = supervisor.childPid();
    expect(firstHostPid).toBeTypeOf("number");

    const broker = new NativeHostCredentialBroker({
      endpoint: rendezvous.endpoint,
      hostInstanceId: rendezvous.hostInstanceId,
      authentication: brokerAuthentication,
      desktopInstanceId: "desktop-package-crash-proof",
      keychain: {
        available: async () => true,
        credential: async () => dummyCredential,
      },
      reconnectDelayMs: 25,
    });
    brokers.add(broker);
    broker.start();

    const bunExecutable = process.env.BUN_INSTALL
      ? path.join(process.env.BUN_INSTALL, "bin", "bun")
      : "bun";
    const probe = spawn(bunExecutable, [packageCrashProbeEntry], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        OMNIMIND_NATIVE_HOST_ENDPOINT: rendezvous.endpoint,
        OMNIMIND_NATIVE_HOST_AUTH: rendezvous.authentication,
        OMNIMIND_NATIVE_HOST_INSTANCE: rendezvous.hostInstanceId,
        OMNIMIND_PACKAGE_CRASH_PROBE_DATABASE: productDatabase,
        OMNIMIND_PACKAGE_CRASH_PROBE_RESULT: resultFile,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    probes.add(probe);
    const probeOutput: Buffer[] = [];
    probe.stdout?.on("data", (chunk: Buffer) => probeOutput.push(chunk));
    probe.stderr?.on("data", (chunk: Buffer) => probeOutput.push(chunk));
    const probeExit = await new Promise<{ readonly code: number | null; readonly signal: string | null }>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          probe.kill("SIGKILL");
          reject(new Error("Package crash probe timed out."));
        }, 20_000);
        probe.once("exit", (code, signal) => {
          clearTimeout(timeout);
          resolve({ code, signal });
        });
      },
    );
    probes.delete(probe);
    const sanitizedProbeOutput = Buffer.concat(probeOutput)
      .toString("utf8")
      .replaceAll(dummyCredential, "[redacted-credential]")
      .replaceAll(rendezvous.authentication, "[redacted-authentication]")
      .replaceAll(brokerAuthentication, "[redacted-broker-authentication]")
      .replaceAll(rendezvous.hostInstanceId, "[redacted-host-instance]")
      .replaceAll(rendezvous.endpoint, "[redacted-endpoint]");
    expect(probeExit, sanitizedProbeOutput).toEqual({ code: 0, signal: null });
    expect(sanitizedProbeOutput).not.toContain(dummyCredential);
    expect(existsSync(resultFile)).toBe(true);
    expect(statSync(resultFile).mode & 0o777).toBe(0o600);
    expect(statSync(productDatabase).mode & 0o777).toBe(0o600);

    const result = JSON.parse(readFileSync(resultFile, "utf8")) as {
      readonly hostReauthenticated: boolean;
      readonly submitReceiptState: string;
      readonly receiptState: string;
      readonly reconciliationHint: string | null;
      readonly pendingReconcileStatus: string;
      readonly pendingResolution: string | null;
      readonly queueIds: ReadonlyArray<string>;
      readonly outbox: ReadonlyArray<{
        readonly state: string;
        readonly sendBoundary: string;
        readonly attemptCount: number;
        readonly automaticReplayCount: number;
      }>;
    };
    expect(result).toEqual({
      hostReauthenticated: true,
      submitReceiptState: "delivery_unknown",
      receiptState: "delivery_unknown",
      reconciliationHint: "pi-pending:dispatch-package-crash-proof",
      pendingReconcileStatus: "unknown",
      pendingResolution: null,
      queueIds: ["queue-package-crash-second"],
      outbox: [
        {
          state: "terminal",
          sendBoundary: "sent",
          attemptCount: 1,
          automaticReplayCount: 0,
        },
      ],
    });
    expect(supervisor.childPid()).not.toBe(firstHostPid);
    supervisor.recordAuthenticatedReadiness();
    expect(supervisor.snapshot()).toMatchObject({ status: "ready", pid: supervisor.childPid() });

    const persistedBytes = Buffer.concat(
      [productDatabase, `${productDatabase}-wal`, `${productDatabase}-shm`, resultFile]
        .filter((filename) => existsSync(filename))
        .map((filename) => readFileSync(filename)),
    );
    expect(persistedBytes.includes(Buffer.from(dummyCredential, "utf8"))).toBe(false);
    expect(persistedBytes.includes(Buffer.from(rendezvous.authentication, "utf8"))).toBe(false);
    expect(persistedBytes.includes(Buffer.from(brokerAuthentication, "utf8"))).toBe(false);
  }, 30_000);
});
