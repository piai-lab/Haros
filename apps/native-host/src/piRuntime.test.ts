import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxThinking,
  fauxToolCall,
  InMemoryCredentialStore,
} from "@earendil-works/pi-ai";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import {
  NATIVE_HOST_PROTOCOL_VERSION,
  type NativeHostExecutionRequest,
  type NativeHostPackageArtifact,
} from "@omnimind/contracts/native-host";
import { afterEach, describe, expect, it } from "vitest";

import { PI_PACKAGE_GENERATION, PiNativeRuntime, StreamingContentRedactor } from "./piRuntime";

const temporaryDirectories = new Set<string>();
const validatedGenerationByRuntime = new WeakMap<PiNativeRuntime, string>();

function stageExtension(
  productHome: string,
  source: string | Buffer,
  generation = `fixture-${createHash("sha256").update(source).digest("hex")}`,
): NativeHostPackageArtifact {
  const stagePath = path.join(productHome, "userdata", "packages", "stage", generation);
  mkdirSync(stagePath, { recursive: true });
  const manifest = Buffer.from(`${JSON.stringify({ generation, executable: "todo.ts" })}\n`);
  const executable = Buffer.isBuffer(source) ? source : Buffer.from(source);
  writeFileSync(path.join(stagePath, "manifest.json"), manifest);
  writeFileSync(path.join(stagePath, "todo.ts"), executable);
  return {
    generation,
    stagePath,
    manifestSha256: createHash("sha256").update(manifest).digest("hex"),
    executablePath: "todo.ts",
    executableSha256: createHash("sha256").update(executable).digest("hex"),
    executableBytes: executable.byteLength,
  };
}

function exactTodoArtifact(productHome: string): NativeHostPackageArtifact {
  const sourceRoot = path.resolve(import.meta.dirname, "../../../assets/packages/pi-todo-0.81.1");
  const manifest = readFileSync(path.join(sourceRoot, "manifest.json"));
  const parsed = JSON.parse(manifest.toString("utf8")) as {
    generation: string;
    executable: { path: string; sha256: string; bytes: number };
  };
  const executable = readFileSync(path.join(sourceRoot, parsed.executable.path));
  const stagePath = path.join(productHome, "userdata", "packages", "stage", parsed.generation);
  mkdirSync(stagePath, { recursive: true });
  writeFileSync(path.join(stagePath, "manifest.json"), manifest);
  writeFileSync(path.join(stagePath, parsed.executable.path), executable);
  return {
    generation: parsed.generation,
    stagePath,
    manifestSha256: createHash("sha256").update(manifest).digest("hex"),
    executablePath: parsed.executable.path,
    executableSha256: parsed.executable.sha256,
    executableBytes: parsed.executable.bytes,
  };
}

async function validatePackage(runtime: PiNativeRuntime, artifact: NativeHostPackageArtifact) {
  return runtime.validatePackage({
    protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
    kind: "package.validate.request",
    requestId: `validate-${artifact.executableSha256.slice(0, 12)}`,
    serviceInstanceId: "service-test",
    hostInstanceId: "host-test",
    artifact,
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories) rmSync(directory, { recursive: true, force: true });
  temporaryDirectories.clear();
});

async function fixture(options?: {
  readonly acceptanceTimeoutMs?: number;
  readonly acceptanceObservationDelayMs?: number;
  readonly extensionSource?: string;
  readonly settledOperationGraceMs?: number;
  readonly maxSettledOperations?: number;
  readonly credential?: string | null;
  readonly credentialBrokerFailure?: "disconnect" | "timeout";
  readonly sessionFactoryFailure?: boolean;
  readonly settingsManagerFailure?: boolean;
  readonly packageBindFailure?: boolean;
}) {
  const productHome = mkdtempSync(path.join(tmpdir(), "omnimind-pi-runtime-"));
  temporaryDirectories.add(productHome);
  const faux = fauxProvider({
    provider: "faux-native",
    models: [{ id: "faux-thinker", reasoning: true }],
    tokenSize: { min: 1, max: 1 },
  });
  const modelRuntime = await ModelRuntime.create({
    credentials: new InMemoryCredentialStore(),
    modelsPath: null,
    allowModelNetwork: false,
  });
  modelRuntime.registerNativeProvider(faux.provider);
  await modelRuntime.setRuntimeApiKey("faux-native", "fixture-key", { allowNetwork: false });
  const runtime = await PiNativeRuntime.create({
    productHome,
    modelRuntime,
    credentialBroker: {
      available: async () => "configured",
      credential: async () => {
        if (options?.credentialBrokerFailure === "disconnect") {
          return { status: "unavailable" as const };
        }
        if (options?.credentialBrokerFailure === "timeout") {
          throw new Error("broker timeout");
        }
        const credential =
          options && "credential" in options ? options.credential : "fixture-recovery-credential";
        return credential === null
          ? { status: "missing" as const }
          : { status: "configured" as const, credential };
      },
    },
    ...(options?.acceptanceTimeoutMs === undefined
      ? {}
      : { acceptanceTimeoutMs: options.acceptanceTimeoutMs }),
    ...(options?.acceptanceObservationDelayMs === undefined
      ? {}
      : { acceptanceObservationDelayMs: options.acceptanceObservationDelayMs }),
    ...(options?.settledOperationGraceMs === undefined
      ? {}
      : { settledOperationGraceMs: options.settledOperationGraceMs }),
    ...(options?.maxSettledOperations === undefined
      ? {}
      : { maxSettledOperations: options.maxSettledOperations }),
    ...(options?.sessionFactoryFailure
      ? {
          sessionFactory: async () => {
            throw new Error("fixture Session construction failure");
          },
        }
      : {}),
    ...(options?.settingsManagerFailure
      ? {
          settingsManagerFactory: () => {
            throw new Error("fixture SettingsManager construction failure");
          },
        }
      : {}),
    ...(options?.packageBindFailure
      ? {
          bindSessionExtensions: async () => {
            throw new Error("fixture Package bind failure");
          },
        }
      : {}),
  });
  if (options?.extensionSource) {
    const artifact = stageExtension(productHome, options.extensionSource);
    const validation = await validatePackage(runtime, artifact);
    if (validation.status !== "validated") throw new Error("Fixture Package validation failed.");
    validatedGenerationByRuntime.set(runtime, artifact.generation);
  }
  return { productHome, faux, modelRuntime, runtime };
}

function request(input?: {
  readonly conversationId?: string;
  readonly runId?: string;
  readonly text?: string;
  readonly priorLineageRef?: string | null;
  readonly workspace?: NativeHostExecutionRequest["workspace"];
  readonly thinking?: string | null;
  readonly packageGeneration?: string;
}): NativeHostExecutionRequest {
  return {
    protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
    kind: "execution.request",
    requestId: `request-${input?.runId ?? "1"}`,
    serviceInstanceId: "service-test",
    hostInstanceId: "host-test",
    dispatchId: `dispatch-${input?.runId ?? "1"}`,
    conversationId: input?.conversationId ?? "conversation-1",
    runId: input?.runId ?? "run-1",
    text: input?.text ?? "Respond with the fixture answer.",
    selection: {
      engineId: "pi",
      runtimeModelId: "faux-native/faux-thinker",
      thinking: input?.thinking ?? "medium",
      permissionPolicy: "approval-required",
      enforcement: "unverified",
      packageGeneration: input?.packageGeneration ?? PI_PACKAGE_GENERATION,
    },
    workspace: input?.workspace ?? { kind: "chat", cwd: null },
    priorLineageRef: input?.priorLineageRef ?? null,
  };
}

async function waitForSettlement(runtime: PiNativeRuntime, operationRef: string) {
  const started = Date.now();
  for (;;) {
    const batch = runtime.facts(operationRef, 0);
    if (batch.facts.some((fact) => fact.kind === "settlement")) return batch.facts;
    if (Date.now() - started > 2_000) throw new Error("settlement timed out");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function requestForRuntime(
  runtime: PiNativeRuntime,
  input?: Parameters<typeof request>[0],
): Promise<NativeHostExecutionRequest> {
  return request({
    ...input,
    packageGeneration: validatedGenerationByRuntime.get(runtime) ?? PI_PACKAGE_GENERATION,
  });
}

async function waitForNativeSettlement(runtime: PiNativeRuntime, operationRef: string) {
  const started = Date.now();
  for (;;) {
    const reconciled = await runtime.reconcile(operationRef, 0);
    if (reconciled.status === "settled") return reconciled;
    if (Date.now() - started > 2_000) throw new Error("native settlement timed out");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("PiNativeRuntime", () => {
  it("redacts an exact provider credential across arbitrary stream chunk boundaries", () => {
    const credential = "plainCanaryCredential987654321";
    const redactor = new StreamingContentRedactor([credential]);
    const output = [
      redactor.push("visible plainCanary"),
      redactor.push("Credential987"),
      redactor.push("654321 tail"),
      redactor.flush(),
    ].join("");
    expect(output).toBe("visible [redacted] tail");
    expect(output).not.toContain(credential);
    expect(redactor.sensitiveValues()).toEqual([credential]);
    redactor.clearSensitiveValues();
    expect(redactor.sensitiveValues()).toEqual([]);

    const partial = new StreamingContentRedactor([credential]);
    expect(`${partial.push("visible plainCanaryCred")}${partial.flush()}`).toBe(
      "visible [redacted]",
    );
  });

  it("prioritizes authenticated models before the bounded catalog cutoff", async () => {
    const productHome = mkdtempSync(path.join(tmpdir(), "omnimind-pi-catalog-"));
    temporaryDirectories.add(productHome);
    const runtime = await PiNativeRuntime.create({
      productHome,
      credentialBroker: {
        available: async (provider) => (provider === "xai" ? "configured" : "missing"),
        credential: async () => ({ status: "missing" }),
      },
    });

    const catalog = await runtime.catalog();

    expect(catalog.truncated).toBe(true);
    expect(catalog.models).toHaveLength(128);
    expect(catalog.models.filter((model) => model.available)).not.toHaveLength(0);
    expect(catalog.models.find((model) => model.provider === "xai")).toMatchObject({
      available: true,
      auth: "configured",
    });
    expect(catalog.capabilities).toEqual({
      ingress: "typed-native-host",
      lineage: { continue: "available", rebuild: "available" },
      controls: {
        steer: "available",
        followUp: "available",
        abort: "available",
        cancel: "unavailable",
      },
      structuredQuestions: "unknown",
      packages: "available",
      filesRead: "unknown",
      filesWrite: "unknown",
      terminal: "unknown",
      enforcement: "unverified",
    });
    await runtime.shutdown();
  });

  it("caches broker availability polling and refreshes only on an explicit catalog request", async () => {
    const productHome = mkdtempSync(path.join(tmpdir(), "omnimind-pi-availability-"));
    temporaryDirectories.add(productHome);
    const observations = new Map<string, number>();
    const runtime = await PiNativeRuntime.create({
      productHome,
      availabilityCacheTtlMs: 60_000,
      credentialBroker: {
        available: async (provider) => {
          observations.set(provider, (observations.get(provider) ?? 0) + 1);
          return "missing";
        },
        credential: async () => ({ status: "missing" }),
      },
    });

    await runtime.catalog();
    const providers = observations.size;
    expect(providers).toBeGreaterThan(0);
    expect([...observations.values()].every((count) => count === 1)).toBe(true);
    await runtime.catalog();
    expect([...observations.values()].every((count) => count === 1)).toBe(true);
    await runtime.catalog(true);
    expect([...observations.values()].every((count) => count === 2)).toBe(true);
    await runtime.shutdown();
  });

  it("distinguishes configured, missing, and unavailable broker catalog observations", async () => {
    const productHome = mkdtempSync(path.join(tmpdir(), "omnimind-pi-auth-state-"));
    temporaryDirectories.add(productHome);
    let availability: "configured" | "missing" | "unavailable" = "configured";
    const runtime = await PiNativeRuntime.create({
      productHome,
      availabilityCacheTtlMs: 60_000,
      credentialBroker: {
        available: async () => availability,
        credential: async () => ({ status: "missing" }),
      },
    });

    const configuredCatalog = await runtime.catalog(true);
    const provider = configuredCatalog.models[0]!.provider;
    const authFor = async () =>
      (await runtime.catalog(true)).models.find((model) => model.provider === provider)?.auth;
    expect(configuredCatalog.models.find((model) => model.provider === provider)?.auth).toBe(
      "configured",
    );
    availability = "missing";
    expect(await authFor()).toBe("missing");
    availability = "unavailable";
    expect(await authFor()).toBe("unavailable");
    await runtime.shutdown();
  });

  it("keeps genuine missing credentials non-retryable", async () => {
    const { runtime } = await fixture({ credential: null });
    expect(await runtime.execute(request({ runId: "credential-missing" }))).toMatchObject({
      kind: "execution.rejected",
      code: "PI_CREDENTIAL_UNAVAILABLE",
      retryable: false,
    });
    await runtime.shutdown();
  });

  it.each(["disconnect", "timeout"] as const)(
    "makes credential broker %s failures distinctly retryable",
    async (credentialBrokerFailure) => {
      const { runtime } = await fixture({ credentialBrokerFailure });
      expect(
        await runtime.execute(request({ runId: `credential-${credentialBrokerFailure}` })),
      ).toMatchObject({
        kind: "execution.rejected",
        code: "PI_CREDENTIAL_BROKER_UNAVAILABLE",
        retryable: true,
      });
      await runtime.shutdown();
    },
  );

  it("classifies generic Session construction failure outside Package authority", async () => {
    const { runtime } = await fixture({ sessionFactoryFailure: true });

    expect(await runtime.execute(request({ runId: "session-construction" }))).toMatchObject({
      kind: "execution.rejected",
      code: "PI_SESSION_UNAVAILABLE",
      retryable: false,
    });

    await runtime.shutdown();
  });

  it("keeps Settings construction failure non-Package-fatal for a selected Package", async () => {
    const { runtime } = await fixture({
      extensionSource: "export default function () {}\n",
      settingsManagerFailure: true,
    });

    expect(
      await runtime.execute(await requestForRuntime(runtime, { runId: "settings-construction" })),
    ).toMatchObject({
      kind: "execution.rejected",
      code: "PI_SESSION_UNAVAILABLE",
      retryable: false,
    });

    await runtime.shutdown();
  });

  it("classifies a selected Package session hook failure as Package-fatal", async () => {
    const { runtime } = await fixture({
      extensionSource: "export default function () {}\n",
      packageBindFailure: true,
    });

    expect(
      await runtime.execute(await requestForRuntime(runtime, { runId: "package-session-hook" })),
    ).toMatchObject({
      kind: "execution.rejected",
      code: "PI_PACKAGE_LIFECYCLE_UNAVAILABLE",
      retryable: false,
    });

    await runtime.shutdown();
  });

  it("accepts only after SessionManager reopen and emits exact redacted sequenced facts", async () => {
    const { productHome, faux, runtime } = await fixture();
    faux.setResponses([
      fauxAssistantMessage([
        fauxThinking("Need token-secretfixturevalue before answering."),
        fauxText("First line\n  second line"),
      ]),
    ]);

    const result = await runtime.execute(request());
    expect(result.kind).toBe("execution.accepted");
    if (result.kind !== "execution.accepted") return;
    expect(result.acceptance.query).toBe("session-manager-reopen");
    expect(result.operationRef).toBe(
      `pi-op:${result.acceptance.sessionId}:${result.acceptance.entryId}`,
    );
    const facts = await waitForSettlement(runtime, result.operationRef);
    expect(facts.map((fact) => fact.sequence)).toEqual(
      Array.from({ length: facts.length }, (_, index) => index + 1),
    );
    expect(facts.some((fact) => fact.kind === "thinking.delta")).toBe(true);
    expect(facts.some((fact) => fact.kind === "assistant.delta")).toBe(true);
    expect(facts.some((fact) => fact.kind === "usage")).toBe(true);
    expect(facts.some((fact) => fact.kind === "settlement")).toBe(true);
    const serialized = JSON.stringify(facts);
    expect(serialized).not.toContain("secretfixturevalue");
    expect(
      facts
        .filter((fact) => fact.kind === "assistant.delta")
        .map((fact) => fact.text)
        .join(""),
    ).toBe("First line\n  second line");
    expect(existsSync(path.join(productHome, "pi-native", "agent", "auth.json"))).toBe(false);

    const index = JSON.parse(
      readFileSync(path.join(productHome, "pi-native", "session-index.json"), "utf8"),
    ) as { sessions: Array<{ conversationId: string; sessionFile: string }> };
    expect(
      index.sessions.find((entry) => entry.conversationId === "conversation-1")?.sessionFile,
    ).toBeTruthy();
  });

  it("accepts a first native Session while the provider assistant is still blocked", async () => {
    const { productHome, faux, modelRuntime, runtime } = await fixture();
    let releaseAssistant!: () => void;
    const assistantBlocked = new Promise<void>((resolve) => {
      releaseAssistant = resolve;
    });
    faux.setResponses([
      async () => {
        await assistantBlocked;
        return fauxAssistantMessage([fauxText("released after durable acceptance")]);
      },
    ]);

    const result = await runtime.execute(request({ runId: "first-session-before-assistant" }));

    expect(result.kind).toBe("execution.accepted");
    expect(faux.state.callCount).toBe(1);
    if (result.kind !== "execution.accepted") return;
    expect(result.acceptance.query).toBe("session-manager-reopen");
    expect((await runtime.reconcile(result.operationRef, 0)).status).toBe("running");
    releaseAssistant();
    await waitForSettlement(runtime, result.operationRef);
    await runtime.shutdown();
    const restarted = await PiNativeRuntime.create({
      productHome,
      modelRuntime,
      credentialBroker: {
        available: async () => "configured",
        credential: async () => ({
          status: "configured",
          credential: "fixture-recovery-credential",
        }),
      },
    });
    expect(
      await restarted.reconcile("pi-pending:dispatch-first-session-before-assistant", 0),
    ).toMatchObject({
      resolution: {
        kind: "accepted",
        operationRef: result.operationRef,
        acceptance: result.acceptance,
      },
    });
    await restarted.shutdown();
  });

  it("never rejects after a durable user entry when prompt processing rejects first", async () => {
    const { faux, runtime } = await fixture({
      extensionSource:
        'export default function (pi) { pi.on("before_agent_start", () => { throw new Error("fixture prompt rejection"); }); }\n',
    });
    faux.setResponses([fauxAssistantMessage([fauxText("unused")])]);
    const result = await runtime.execute(
      await requestForRuntime(runtime, { runId: "reject-race" }),
    );
    expect(result.kind).toBe("execution.accepted");
    if (result.kind === "execution.accepted") {
      expect(result.acceptance.query).toBe("session-manager-reopen");
      const facts = await waitForSettlement(runtime, result.operationRef);
      expect(facts).toContainEqual(expect.objectContaining({ kind: "package.failed", count: 1 }));
      expect((await runtime.reconcile(result.operationRef, 0)).status).not.toBe("unknown");
    }
    await runtime.shutdown();
  });

  it("accepts a durable user entry even when the scheduled callback loses to timeout", async () => {
    const { faux, runtime } = await fixture({
      acceptanceTimeoutMs: 1,
      acceptanceObservationDelayMs: 50,
    });
    faux.setResponses([fauxAssistantMessage([fauxText("timeout race answer")])]);
    const result = await runtime.execute(request({ runId: "timeout-race" }));
    expect(result.kind).toBe("execution.accepted");
    if (result.kind === "execution.accepted") {
      expect(result.acceptance.query).toBe("session-manager-reopen");
      await waitForNativeSettlement(runtime, result.operationRef);
    }
    await runtime.shutdown();
  });

  it("removes the pending fact file only after a final no-entry rejection", async () => {
    const { productHome, modelRuntime, runtime } = await fixture({
      acceptanceTimeoutMs: 1,
      extensionSource:
        'export default function (pi) { pi.on("input", () => ({ action: "handled" })); }\n',
    });
    const result = await runtime.execute(await requestForRuntime(runtime, { runId: "no-entry" }));
    expect(result.kind).toBe("execution.rejected");
    const factsDirectory = path.join(productHome, "pi-native", "facts");
    expect(existsSync(factsDirectory) ? readdirSync(factsDirectory) : []).toEqual([]);
    await runtime.shutdown();
    const restarted = await PiNativeRuntime.create({
      productHome,
      modelRuntime,
      credentialBroker: {
        available: async () => "configured",
        credential: async () => ({
          status: "configured",
          credential: "fixture-recovery-credential",
        }),
      },
    });
    expect(await restarted.reconcile("pi-pending:dispatch-no-entry", 0)).toMatchObject({
      resolution: {
        kind: "rejected",
        code: "PI_ACCEPTANCE_TIMEOUT_NO_ENTRY",
      },
    });
    await restarted.shutdown();
  });

  it("reopens once more after abort before concluding a timed-out dispatch has no entry", async () => {
    const { faux, runtime } = await fixture({
      acceptanceTimeoutMs: 1,
      acceptanceObservationDelayMs: 50,
      extensionSource:
        'export default function (pi) { pi.on("input", async () => { await new Promise((resolve) => setTimeout(resolve, 10)); return { action: "continue" }; }); }\n',
    });
    faux.setResponses([fauxAssistantMessage([fauxText("abort race answer")])]);

    const result = await runtime.execute(
      await requestForRuntime(runtime, { runId: "abort-entry-race" }),
    );

    expect(result.kind).not.toBe("execution.rejected");
    if (result.kind === "execution.accepted") {
      expect(result.acceptance.query).toBe("session-manager-reopen");
    } else if (result.kind === "execution.indeterminate") {
      expect(result.reconciliationHint).toBe("pi-pending:dispatch-abort-entry-race");
    }
    await runtime.shutdown();
  });

  it("continues compatible lineage and reports divergent/missing lineage without copying transcript", async () => {
    const { faux, runtime } = await fixture();
    faux.setResponses([fauxAssistantMessage([fauxText("one")])]);
    const first = await runtime.execute(request({ runId: "one" }));
    expect(first.kind).toBe("execution.accepted");
    if (first.kind !== "execution.accepted") return;
    await waitForSettlement(runtime, first.operationRef);

    faux.setResponses([fauxAssistantMessage([fauxText("two")])]);
    const continued = await runtime.execute(
      request({ runId: "two", priorLineageRef: first.lineageRef }),
    );
    expect(continued).toMatchObject({ kind: "execution.accepted", rebuilt: "continued" });
    if (continued.kind === "execution.accepted") {
      expect(continued.acceptance.sessionId).toBe(first.acceptance.sessionId);
      await waitForSettlement(runtime, continued.operationRef);
    }

    faux.setResponses([fauxAssistantMessage([fauxText("three")])]);
    const divergent = await runtime.execute(
      request({ runId: "three", priorLineageRef: "pi-session:another-session" }),
    );
    expect(divergent).toMatchObject({ kind: "execution.accepted", rebuilt: "divergent" });

    faux.setResponses([fauxAssistantMessage([fauxText("four")])]);
    const missing = await runtime.execute(
      request({
        conversationId: "new-conversation",
        runId: "four",
        priorLineageRef: "pi-session:missing-session",
      }),
    );
    expect(missing).toMatchObject({ kind: "execution.accepted", rebuilt: "missing" });
  });

  it("validates and runs the exact todo Package through Pi, then requires revalidation after restart", async () => {
    const productHome = mkdtempSync(path.join(tmpdir(), "omnimind-pi-package-"));
    temporaryDirectories.add(productHome);
    const faux = fauxProvider({
      provider: "faux-native",
      models: [{ id: "faux-thinker", reasoning: true }],
    });
    const modelRuntime = await ModelRuntime.create({
      credentials: new InMemoryCredentialStore(),
      modelsPath: null,
      allowModelNetwork: false,
    });
    modelRuntime.registerNativeProvider(faux.provider);
    await modelRuntime.setRuntimeApiKey("faux-native", "fixture-key", { allowNetwork: false });
    const runtime = await PiNativeRuntime.create({
      productHome,
      modelRuntime,
      credentialBroker: {
        available: async () => "configured",
        credential: async () => ({
          status: "configured",
          credential: "fixture-recovery-credential",
        }),
      },
    });
    const artifact = exactTodoArtifact(productHome);
    const validation = await validatePackage(runtime, artifact);
    expect(validation).toMatchObject({
      status: "validated",
      generation: artifact.generation,
      report: {
        extensionCount: 1,
        toolNames: ["todo"],
        commandNames: ["todos"],
      },
    });
    expect(validation.report?.lifecycleEvents).toEqual(
      expect.arrayContaining(["session_start", "session_tree"]),
    );
    faux.setResponses([
      fauxAssistantMessage(fauxToolCall("todo", { action: "add", text: "private-item" })),
      fauxAssistantMessage(fauxText("Todo updated.")),
    ]);
    const first = await runtime.execute(
      request({ runId: "todo-add", packageGeneration: artifact.generation }),
    );
    expect(first.kind).toBe("execution.accepted");
    if (first.kind !== "execution.accepted") return;
    const firstFacts = await waitForSettlement(runtime, first.operationRef);
    expect(firstFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "package.loaded", count: 1 }),
        expect.objectContaining({ kind: "tool.started", toolName: "todo" }),
        expect.objectContaining({ kind: "tool.settled", toolName: "todo", outcome: "succeeded" }),
      ]),
    );
    expect(JSON.stringify(firstFacts)).not.toContain("private-item");
    await runtime.shutdown();

    const restarted = await PiNativeRuntime.create({
      productHome,
      modelRuntime,
      credentialBroker: {
        available: async () => "configured",
        credential: async () => ({
          status: "configured",
          credential: "fixture-recovery-credential",
        }),
      },
    });
    expect(
      await restarted.execute(
        request({ runId: "todo-before-revalidate", packageGeneration: artifact.generation }),
      ),
    ).toMatchObject({
      kind: "execution.rejected",
      code: "PI_PACKAGE_REVALIDATION_REQUIRED",
    });
    expect((await validatePackage(restarted, artifact)).status).toBe("validated");
    faux.setResponses([
      fauxAssistantMessage(fauxToolCall("todo", { action: "list" })),
      fauxAssistantMessage(fauxText("Todo listed.")),
    ]);
    const continued = await restarted.execute(
      request({
        runId: "todo-list",
        packageGeneration: artifact.generation,
        priorLineageRef: first.lineageRef,
      }),
    );
    expect(continued).toMatchObject({ kind: "execution.accepted", rebuilt: "continued" });
    if (continued.kind !== "execution.accepted") return;
    await waitForSettlement(restarted, continued.operationRef);
    const index = JSON.parse(
      readFileSync(path.join(productHome, "pi-native", "session-index.json"), "utf8"),
    ) as { sessions: Array<{ sessionFile: string }> };
    const entries = readFileSync(index.sessions[0]!.sessionFile, "utf8")
      .split(/\r?\n/u)
      .filter(Boolean)
      .map(
        (line) =>
          JSON.parse(line) as {
            type?: string;
            message?: { role?: string; toolName?: string; details?: unknown };
          },
      );
    const listResult = entries.findLast(
      (entry) =>
        entry.type === "message" &&
        entry.message?.role === "toolResult" &&
        entry.message.toolName === "todo" &&
        (entry.message.details as { action?: string } | undefined)?.action === "list",
    );
    expect(listResult?.message?.details).toMatchObject({
      action: "list",
      todos: [{ id: 1, text: "private-item", done: false }],
      nextId: 2,
    });
    await restarted.shutdown();
  });

  it("rejects a symbolic-link exact artifact without loading its target", async () => {
    const productHome = mkdtempSync(path.join(tmpdir(), "omnimind-pi-package-link-"));
    temporaryDirectories.add(productHome);
    const marker = path.join(productHome, "symlink-target-loaded");
    const target = path.join(productHome, "outside-extension.ts");
    writeFileSync(
      target,
      `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(marker)}, "loaded");\nexport default function () {}\n`,
    );
    const artifact = stageExtension(productHome, "export default function () {}\n");
    rmSync(path.join(artifact.stagePath, "todo.ts"));
    symlinkSync(target, path.join(artifact.stagePath, "todo.ts"));
    const runtime = await PiNativeRuntime.create({ productHome });
    expect(await validatePackage(runtime, artifact)).toMatchObject({
      status: "rejected",
      code: "package-validation-failed",
    });
    expect(existsSync(marker)).toBe(false);
    expect(
      await runtime.execute(request({ packageGeneration: artifact.generation })),
    ).toMatchObject({
      kind: "execution.rejected",
      code: "PI_PACKAGE_REVALIDATION_REQUIRED",
    });
    expect(existsSync(marker)).toBe(false);
    await runtime.shutdown();
  });

  it("reopens a bounded full Run snapshot after retention overflow and a missing settlement fact", async () => {
    const { productHome, faux, modelRuntime, runtime } = await fixture();
    const completeAnswer = Array.from(
      { length: 800 },
      (_, index) => `visible-${index.toString().padStart(4, "0")}\n`,
    ).join("");
    faux.setResponses([fauxAssistantMessage([fauxText(completeAnswer)])]);
    const first = await runtime.execute(request({ runId: "snapshot-one" }));
    expect(first.kind).toBe("execution.accepted");
    if (first.kind !== "execution.accepted") return;
    await waitForNativeSettlement(runtime, first.operationRef);
    const retainedFactFile = path.join(
      productHome,
      "pi-native",
      "facts",
      `${createHash("sha256").update(first.operationRef, "utf8").digest("hex")}.jsonl`,
    );
    const retainedLines = readFileSync(retainedFactFile, "utf8").split(/\r?\n/u).filter(Boolean);
    expect(retainedLines.length).toBeGreaterThanOrEqual(2_048);
    expect(retainedLines.length).toBeLessThanOrEqual(2_303);
    const compacted = runtime.facts(first.operationRef, 0);
    expect(compacted).toMatchObject({
      resnapshotRequired: true,
      resnapshotReason: "history-compacted",
      facts: [],
      snapshot: { version: 1, assistant: completeAnswer },
    });

    faux.setResponses([fauxAssistantMessage([fauxText("NEXT-RUN-MUST-NOT-LEAK")])]);
    const second = await runtime.execute(
      request({
        runId: "snapshot-two",
        priorLineageRef: first.lineageRef,
      }),
    );
    expect(second.kind).toBe("execution.accepted");
    if (second.kind === "execution.accepted") {
      await waitForNativeSettlement(runtime, second.operationRef);
    }

    const withoutSettlement = readFileSync(retainedFactFile, "utf8")
      .split(/\r?\n/u)
      .filter(Boolean)
      .filter((line) => (JSON.parse(line) as { kind?: string }).kind !== "settlement")
      .join("\n");
    writeFileSync(retainedFactFile, `${withoutSettlement}\n`, { mode: 0o600 });
    rmSync(`${retainedFactFile}.snapshot`, { force: true });
    await runtime.shutdown();

    const restarted = await PiNativeRuntime.create({
      productHome,
      modelRuntime,
      credentialBroker: {
        available: async () => "configured",
        credential: async () => ({
          status: "configured",
          credential: "fixture-recovery-credential",
        }),
      },
    });
    const recovered = await restarted.reconcile(first.operationRef, 0);
    expect(recovered).toMatchObject({
      status: "settled",
      resnapshotRequired: true,
      resnapshotReason: "host-restarted",
      facts: [],
      snapshot: { version: 1, assistant: completeAnswer },
    });
    expect(recovered.snapshot?.assistant).not.toContain("NEXT-RUN-MUST-NOT-LEAK");
    await restarted.shutdown();
  });

  it("fails closed after a snapshot-loss crash unless the reacquired credential digest matches", async () => {
    const opaqueCanary = "OpaqueCanaryValue987654321";
    const rotatedCredential = "RotatedOpaqueValue123456789";
    const { productHome, faux, modelRuntime, runtime } = await fixture({
      credential: opaqueCanary,
    });
    faux.setResponses([
      fauxAssistantMessage([fauxText(`visible before ${opaqueCanary} visible after`)]),
    ]);
    const accepted = await runtime.execute(request({ runId: "credential-recovery" }));
    expect(accepted.kind).toBe("execution.accepted");
    if (accepted.kind !== "execution.accepted") return;
    const settled = await waitForNativeSettlement(runtime, accepted.operationRef);
    expect(JSON.stringify(settled)).not.toContain(opaqueCanary);

    const factFile = path.join(
      productHome,
      "pi-native",
      "facts",
      `${createHash("sha256").update(accepted.operationRef, "utf8").digest("hex")}.jsonl`,
    );
    expect(existsSync(`${factFile}.snapshot`)).toBe(true);
    rmSync(`${factFile}.snapshot`, { force: true });
    const pendingDirectory = path.join(productHome, "pi-native", "pending-dispatches");
    const persistedPending = readdirSync(pendingDirectory)
      .map((entry) => readFileSync(path.join(pendingDirectory, entry), "utf8"))
      .join("\n");
    expect(persistedPending).not.toContain(opaqueCanary);
    expect(persistedPending).toContain('"credentialDigest":');
    await runtime.shutdown();

    const rotated = await PiNativeRuntime.create({
      productHome,
      modelRuntime,
      credentialBroker: {
        available: async () => "configured",
        credential: async () => ({ status: "configured", credential: rotatedCredential }),
      },
    });
    const failClosed = await rotated.reconcile(accepted.operationRef, 0);
    expect(failClosed).toMatchObject({
      status: "settled",
      resnapshotRequired: true,
      resnapshotReason: "native-outcome-unknown",
      snapshot: null,
    });
    expect(JSON.stringify(failClosed)).not.toContain(opaqueCanary);
    expect(JSON.stringify(failClosed)).not.toContain(rotatedCredential);
    await rotated.shutdown();

    const matched = await PiNativeRuntime.create({
      productHome,
      modelRuntime,
      credentialBroker: {
        available: async () => "configured",
        credential: async () => ({ status: "configured", credential: opaqueCanary }),
      },
    });
    const recovered = await matched.reconcile(accepted.operationRef, 0);
    expect(recovered).toMatchObject({
      status: "settled",
      snapshot: { assistant: "visible before [redacted] visible after" },
    });
    expect(JSON.stringify(recovered)).not.toContain(opaqueCanary);
    await matched.shutdown();
  });

  it("keeps an accepted operation unknown when the native Session has no final assistant", async () => {
    const { productHome, faux, modelRuntime, runtime } = await fixture();
    faux.setResponses([fauxAssistantMessage([fauxText("completed before crash fixture")])]);
    const accepted = await runtime.execute(request({ runId: "mid-effect" }));
    expect(accepted.kind).toBe("execution.accepted");
    if (accepted.kind !== "execution.accepted") return;
    await waitForNativeSettlement(runtime, accepted.operationRef);
    await runtime.shutdown();

    const index = JSON.parse(
      readFileSync(path.join(productHome, "pi-native", "session-index.json"), "utf8"),
    ) as { sessions: Array<{ sessionFile: string }> };
    const sessionFile = index.sessions[0]?.sessionFile;
    expect(sessionFile).toBeTruthy();
    if (!sessionFile) return;
    const withoutFinalAssistant = readFileSync(sessionFile, "utf8")
      .split(/\r?\n/u)
      .filter(Boolean)
      .filter((line) => {
        const entry = JSON.parse(line) as { type?: string; message?: { role?: string } };
        return entry.type !== "message" || entry.message?.role === "user";
      })
      .join("\n");
    writeFileSync(sessionFile, `${withoutFinalAssistant}\n`, { mode: 0o600 });
    const factFile = path.join(
      productHome,
      "pi-native",
      "facts",
      `${createHash("sha256").update(accepted.operationRef, "utf8").digest("hex")}.jsonl`,
    );
    rmSync(`${factFile}.snapshot`, { force: true });

    const restarted = await PiNativeRuntime.create({ productHome, modelRuntime });
    expect(await restarted.reconcile(accepted.operationRef, 0)).toMatchObject({
      status: "unknown",
      resnapshotRequired: true,
      resnapshotReason: "native-outcome-unknown",
      snapshot: null,
    });
    await restarted.shutdown();
  });

  it("evicts settled operations to bounded memory and reconciles them from native disk truth", async () => {
    const { faux, runtime } = await fixture({
      settledOperationGraceMs: 0,
      maxSettledOperations: 1,
    });
    faux.setResponses([fauxAssistantMessage([fauxText("evicted answer")])]);
    const result = await runtime.execute(request({ runId: "evicted" }));
    expect(result.kind).toBe("execution.accepted");
    if (result.kind !== "execution.accepted") return;
    await waitForNativeSettlement(runtime, result.operationRef);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await runtime.reconcile(result.operationRef, 0)).toMatchObject({
      status: "settled",
      resnapshotRequired: true,
      resnapshotReason: "host-restarted",
      snapshot: { assistant: "evicted answer" },
    });
    await runtime.shutdown();
  });
});
