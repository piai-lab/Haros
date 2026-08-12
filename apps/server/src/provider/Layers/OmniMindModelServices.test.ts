import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServerConfig } from "../../config.ts";
import type { OmniMindCodingAgentModule } from "../omnimindAgentRuntime.ts";
import { OmniMindModelServices } from "../Services/OmniMindModelServices.ts";
import { makeOmniMindModelServicesLive } from "./OmniMindModelServices.ts";

const roots: string[] = [];
let environmentRestore: ReadonlyMap<string, string | undefined> | null = null;

const PROVIDER_ENV_PATTERN =
  /(?:^AWS_|^AZURE_|^GOOGLE_|^GITHUB_TOKEN$|^COPILOT_|(?:API|AUTH|ACCESS|OAUTH)_?(?:KEY|TOKEN)$|_API_KEY$|_AUTH_TOKEN$|_OAUTH_TOKEN$|^HF_TOKEN$)/u;

async function isolateProviderEnvironment(root: string): Promise<string> {
  const providerHome = path.join(root, "provider-home");
  await mkdir(providerHome, { recursive: true });
  const keys = new Set([
    "HOME",
    "USERPROFILE",
    "XDG_CONFIG_HOME",
    "AWS_CONFIG_FILE",
    "AWS_SHARED_CREDENTIALS_FILE",
    "GOOGLE_APPLICATION_CREDENTIALS",
    ...Object.keys(process.env).filter((key) => PROVIDER_ENV_PATTERN.test(key)),
  ]);
  environmentRestore = new Map([...keys].map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  process.env.HOME = providerHome;
  process.env.USERPROFILE = providerHome;
  process.env.XDG_CONFIG_HOME = path.join(providerHome, ".config");
  return providerHome;
}

function restoreProviderEnvironment(): void {
  if (!environmentRestore) return;
  for (const [key, value] of environmentRestore) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  environmentRestore = null;
}

afterEach(async () => {
  restoreProviderEnvironment();
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "omnimind-model-services-"));
  roots.push(root);
  return root;
}

async function snapshotDirectory(directory: string) {
  const names = (await readdir(directory)).sort();
  return Promise.all(
    names.map(async (name) => {
      const filePath = path.join(directory, name);
      const metadata = await stat(filePath);
      return {
        name,
        mode: metadata.mode,
        mtimeMs: metadata.mtimeMs,
        content: metadata.isFile()
          ? createHash("sha256")
              .update(await readFile(filePath))
              .digest("hex")
          : null,
      };
    }),
  );
}

async function loadService(input: {
  readonly root: string;
  readonly loadModule?: () => Promise<OmniMindCodingAgentModule>;
  readonly readTextFile?: (filePath: string, signal?: AbortSignal) => Promise<string>;
}) {
  const layer = makeTestLayer(input);
  return Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* OmniMindModelServices;
      const list = yield* service.list();
      const deepseek = yield* service.get({ serviceId: "deepseek" });
      return { list, deepseek };
    }).pipe(Effect.provide(layer)),
  );
}

function makeTestLayer(input: {
  readonly root: string;
  readonly loadModule?: () => Promise<OmniMindCodingAgentModule>;
  readonly readTextFile?: (filePath: string, signal?: AbortSignal) => Promise<string>;
}) {
  return makeOmniMindModelServicesLive({
    ...(input.loadModule ? { loadModule: input.loadModule } : {}),
    ...(input.readTextFile ? { readTextFile: input.readTextFile } : {}),
  }).pipe(
    Layer.provideMerge(ServerConfig.layerTest(process.cwd(), input.root)),
    Layer.provideMerge(NodeServices.layer),
  );
}

describe("OmniMindModelServicesLive", () => {
  it.each(["product root", "product agent directory"] as const)(
    "fails before reading when isolated stock Pi physically aliases the %s",
    async (aliasTarget) => {
      const root = await makeRoot();
      const providerHome = await isolateProviderEnvironment(root);
      const agentDir = path.join(root, "agent");
      await mkdir(agentDir, { recursive: true });
      await writeFile(
        path.join(agentDir, "auth.json"),
        JSON.stringify({ deepseek: { type: "api_key", key: "stock-pi-alias-secret" } }),
        { mode: 0o600 },
      );
      await symlink(
        aliasTarget === "product root" ? root : agentDir,
        path.join(providerHome, ".pi"),
        process.platform === "win32" ? "junction" : "dir",
      );
      const before = await snapshotDirectory(agentDir);
      const readTextFile = vi.fn(async () => {
        throw new Error("Aliased private state must not be opened");
      });

      const result = await loadService({ root, readTextFile });

      expect(result.list).toEqual({
        state: "error",
        services: [],
        errorCode: "projection_unavailable",
      });
      expect(result.deepseek).toEqual({
        state: "error",
        service: null,
        errorCode: "projection_unavailable",
      });
      expect(readTextFile).not.toHaveBeenCalled();
      expect(await snapshotDirectory(agentDir)).toEqual(before);
      expect(JSON.stringify(result)).not.toContain("stock-pi-alias-secret");
    },
  );

  it("projects exact .omnimind built-in service facts without commands, network, or mutation", async () => {
    const root = await makeRoot();
    const providerHome = await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    const stockPiDir = path.join(providerHome, ".pi");
    const authCommandMarker = path.join(root, "auth-command-ran");
    await mkdir(agentDir, { recursive: true });
    await mkdir(stockPiDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "auth.json"),
      JSON.stringify({
        deepseek: { type: "api_key", key: `!touch ${authCommandMarker}` },
      }),
      { mode: 0o600 },
    );
    await writeFile(path.join(agentDir, "models-store.json"), "{}", { mode: 0o600 });
    await writeFile(
      path.join(stockPiDir, "auth.json"),
      JSON.stringify({ deepseek: { type: "api_key", key: "stock-pi-secret" } }),
      { mode: 0o600 },
    );
    const before = await snapshotDirectory(agentDir);
    const hostReadPaths: string[] = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("Model-services mount attempted network access");
    });

    const result = await loadService({
      root,
      readTextFile: async (filePath, signal) => {
        hostReadPaths.push(filePath);
        return readFile(filePath, { encoding: "utf8", ...(signal ? { signal } : {}) });
      },
    });
    const after = await snapshotDirectory(agentDir);

    expect(result.list.state).toBe("ready");
    expect(result.list.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          serviceId: "deepseek",
          authState: "configured",
          authSource: "stored",
          storedCredentialType: "api_key",
        }),
      ]),
    );
    expect(result.deepseek.service?.providerId).toBe("deepseek");
    const canonicalAgentDir = path.join(await realpath(root), "agent");
    expect(new Set(hostReadPaths)).toEqual(
      new Set([
        path.join(canonicalAgentDir, "auth.json"),
        path.join(canonicalAgentDir, "models-store.json"),
      ]),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(after).toEqual(before);
    await expect(stat(authCommandMarker)).rejects.toMatchObject({ code: "ENOENT" });
    expect(JSON.stringify(result)).not.toContain("stock-pi-secret");
    expect(JSON.stringify(result)).not.toContain("touch");
    expect(JSON.stringify(result)).not.toContain(agentDir);
  });

  it("returns an honest empty list and does not create files when local state is absent", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });

    const result = await loadService({ root });

    expect(result.list).toEqual({ state: "empty", services: [], errorCode: null });
    expect(result.deepseek).toMatchObject({
      state: "ready",
      service: expect.objectContaining({
        serviceId: "deepseek",
        origin: "builtin",
        authState: "setup_required",
        availableModelCount: 0,
      }),
    });
    expect(await readdir(agentDir)).toEqual([]);
  });

  it("maps malformed local configuration to a fixed credential-blind error", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    const secret = "sk-do-not-project";
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "models.json"),
      `{ "providers": { "broken": { "apiKey": "${secret}", "path": "${agentDir}" } }`,
      { mode: 0o600 },
    );

    const result = await loadService({ root });
    const serialized = JSON.stringify(result);

    expect(result.list).toEqual({
      state: "error",
      services: [],
      errorCode: "projection_unavailable",
    });
    expect(result.deepseek).toEqual({
      state: "error",
      service: null,
      errorCode: "projection_unavailable",
    });
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain(agentDir);
  });

  it("fails honestly when credential storage is malformed", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    const secret = "credential-that-must-not-escape";
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "auth.json"),
      `{ "deepseek": { "type": "api_key", "key": "${secret}" }`,
      { mode: 0o600 },
    );

    const result = await loadService({ root });
    const serialized = JSON.stringify(result);

    expect(result.list).toEqual({
      state: "error",
      services: [],
      errorCode: "projection_unavailable",
    });
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain(agentDir);
  });

  it("fails honestly when credential storage cannot be read", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    const authPath = path.join(agentDir, "auth.json");
    await mkdir(agentDir, { recursive: true });
    await writeFile(authPath, "{}", { mode: 0o600 });

    const result = await loadService({
      root,
      readTextFile: (filePath, signal) => {
        signal?.throwIfAborted();
        if (path.basename(filePath) === path.basename(authPath)) {
          return Promise.reject(Object.assign(new Error("denied"), { code: "EACCES" }));
        }
        return readFile(filePath, { encoding: "utf8", ...(signal ? { signal } : {}) });
      },
    });

    expect(result.list).toEqual({
      state: "error",
      services: [],
      errorCode: "projection_unavailable",
    });
  });

  it("rejects oversized credential projections before RPC encoding", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "auth.json"),
      JSON.stringify(
        Object.fromEntries(
          Array.from({ length: 513 }, (_, index) => [
            `service-${index}`,
            { type: "api_key", key: "credential-must-not-escape" },
          ]),
        ),
      ),
      { mode: 0o600 },
    );

    const result = await loadService({ root });

    expect(result.list).toEqual({
      state: "error",
      services: [],
      errorCode: "projection_unavailable",
    });
    expect(JSON.stringify(result)).not.toContain("credential-must-not-escape");
  });

  it("rejects credential storage beyond the hard byte boundary", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "auth.json"),
      JSON.stringify({
        deepseek: { type: "api_key", key: "x".repeat(4 * 1024 * 1024) },
      }),
      { mode: 0o600 },
    );

    const result = await loadService({ root });

    expect(result.list).toEqual({
      state: "error",
      services: [],
      errorCode: "projection_unavailable",
    });
  });

  it("keeps orphaned stored credentials visible as unavailable services", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "auth.json"),
      JSON.stringify({
        "removed-service": { type: "api_key", key: "stored-but-not-projectable" },
      }),
      { mode: 0o600 },
    );

    const result = await loadService({ root });

    expect(result.list.services).toContainEqual(
      expect.objectContaining({
        serviceId: "removed-service",
        origin: "unknown",
        authState: "unavailable",
        authSource: "stored",
        storedCredentialType: "api_key",
        catalogState: "error",
      }),
    );
    expect(JSON.stringify(result)).not.toContain("stored-but-not-projectable");
  });

  it("preserves provider-owned OAuth metadata for exact available-model filtering", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "auth.json"),
      JSON.stringify({
        "github-copilot": {
          type: "oauth",
          access: "access-secret",
          refresh: "refresh-secret",
          expires: Date.now() + 60 * 60 * 1000,
          availableModelIds: ["gpt-4.1"],
          enterpriseUrl: "https://private-enterprise.example.test",
        },
      }),
      { mode: 0o600 },
    );

    const result = await loadService({ root });
    const copilot = result.list.services.find((service) => service.serviceId === "github-copilot");

    expect(copilot).toMatchObject({
      authState: "configured",
      authSource: "stored",
      storedCredentialType: "oauth",
      availableModelCount: 1,
    });
    expect(copilot?.knownModelCount).toBeGreaterThan(1);
    expect(JSON.stringify(result)).not.toContain("access-secret");
    expect(JSON.stringify(result)).not.toContain("refresh-secret");
    expect(JSON.stringify(result)).not.toContain("private-enterprise.example.test");
  });

  it("marks an expired OAuth access token as refresh-required without claiming availability", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "auth.json"),
      JSON.stringify({
        "github-copilot": {
          type: "oauth",
          access: "expired-access-secret",
          refresh: "possibly-valid-refresh-secret",
          expires: 1,
          availableModelIds: ["gpt-4.1"],
        },
      }),
      { mode: 0o600 },
    );

    const result = await loadService({ root });
    const copilot = result.list.services.find((service) => service.serviceId === "github-copilot");

    expect(copilot).toMatchObject({
      authState: "refresh_required",
      authSource: "stored",
      storedCredentialType: "oauth",
      availableModelCount: 0,
    });
    expect(JSON.stringify(result)).not.toContain("expired-access-secret");
    expect(JSON.stringify(result)).not.toContain("possibly-valid-refresh-secret");
  });

  it("fails closed on a valid custom service until Pi exposes a safe models loader", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          小米代理: {
            name: agentDir,
            api: "openai-completions",
            baseUrl: "https://redacted.example.test/v1",
            apiKey: "not-projected",
            models: [{ id: "mimo" }],
          },
        },
      }),
      { mode: 0o600 },
    );

    const result = await loadService({ root });
    expect(result.list).toEqual({
      state: "error",
      services: [],
      errorCode: "projection_unavailable",
    });
    expect(JSON.stringify(result)).not.toContain(agentDir);
    expect(JSON.stringify(result)).not.toContain("redacted.example.test");
  });

  it("propagates cancellation into an in-flight static credential read", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const controller = new AbortController();
    let observedSignal: AbortSignal | undefined;
    const layer = makeTestLayer({
      root,
      readTextFile: (_filePath, signal) =>
        new Promise((_resolve, reject) => {
          observedSignal = signal;
          signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    });
    const running = Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        return yield* service.list();
      }).pipe(Effect.provide(layer)),
      { signal: controller.signal },
    );

    await vi.waitFor(() => expect(observedSignal).toBeDefined());
    controller.abort(new Error("cancel model-services projection"));

    await expect(running).rejects.toThrow();
    expect(observedSignal?.aborted).toBe(true);
  });
});
