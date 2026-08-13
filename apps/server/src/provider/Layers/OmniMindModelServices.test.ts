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
        connectableServices: [],
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
        path.join(canonicalAgentDir, "models.json"),
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

  it("keeps the connected list empty while exposing Pi login-capable services", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });

    const result = await loadService({ root });

    expect(result.list).toMatchObject({ state: "empty", services: [], errorCode: null });
    expect(result.list.connectableServices).toContainEqual(
      expect.objectContaining({
        serviceId: "deepseek",
        origin: "builtin",
        authState: "setup_required",
        authMethods: expect.arrayContaining([
          expect.objectContaining({ type: "api_key", canLogin: true }),
        ]),
      }),
    );
    expect(
      result.list.connectableServices.every((service) =>
        service.authMethods.some((method) => method.type === "api_key" && method.canLogin),
      ),
    ).toBe(true);
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

  it("uses Pi login and logout as the only API-key credential mutation owner", async () => {
    const root = await makeRoot();
    const providerHome = await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    const layer = makeTestLayer({ root });
    const request = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const before = yield* service.get({ serviceId: "deepseek" });
        const begin = yield* service.beginLogin(7, {
          serviceId: "deepseek",
          authType: "api_key",
        });
        if (begin.state !== "prompt") throw new Error("Expected the Pi API-key prompt");
        const answer = yield* service.answerLogin(7, {
          requestId: begin.requestId,
          promptId: begin.prompt.promptId,
          value: "test-only-api-key",
        });
        const after = yield* service.get({ serviceId: "deepseek" });
        const logout = yield* service.logout({ serviceId: "deepseek" });
        const removed = yield* service.get({ serviceId: "deepseek" });
        return { before, begin, answer, after, logout, removed };
      }).pipe(Effect.provide(layer)),
    );

    expect(request.before.service).toMatchObject({
      authState: "setup_required",
      storedCredentialType: null,
    });
    expect(request.begin.prompt.type).toBe("secret");
    expect(request.answer).toMatchObject({
      state: "complete",
      service: { authState: "configured", storedCredentialType: "api_key" },
    });
    expect(request.after.service).toMatchObject({
      authState: "configured",
      storedCredentialType: "api_key",
    });
    expect(request.logout.state).toBe("complete");
    expect(request.removed.service).toMatchObject({
      authState: "setup_required",
      storedCredentialType: null,
    });
    const stored = JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"));
    expect(Object.keys(stored)).not.toContain("deepseek");
    expect(JSON.stringify(request)).not.toContain("test-only-api-key");
    await expect(stat(path.join(providerHome, ".pi"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("binds pending auth prompts to the originating client and supports cancellation", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    await mkdir(path.join(root, "agent"), { recursive: true });
    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const begin = yield* service.beginLogin(11, {
          serviceId: "deepseek",
          authType: "api_key",
        });
        if (begin.state !== "prompt") throw new Error("Expected the Pi API-key prompt");
        const foreign = yield* service.answerLogin(12, {
          requestId: begin.requestId,
          promptId: begin.prompt.promptId,
          value: "must-not-be-consumed",
        });
        const cancelled = yield* service.cancelLogin(11, { requestId: begin.requestId });
        return { foreign, cancelled };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.foreign).toMatchObject({ state: "failed", errorCode: "request_expired" });
    expect(result.cancelled).toMatchObject({ state: "cancelled", errorCode: "cancelled" });
    expect(JSON.parse(await readFile(path.join(root, "agent", "auth.json"), "utf8"))).toEqual({});
  });

  it("refreshes only the requested Pi provider and persists its last-good catalog", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    const requests: Array<{ readonly path: string; readonly authenticated: boolean }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (request, init) => {
      requests.push({
        path: new URL(request instanceof Request ? request.url : String(request)).pathname,
        authenticated: new Headers(init?.headers).has("authorization"),
      });
      return Response.json({
        baseUrl: "https://gateway.example.test",
        models: [
          {
            id: "radius-test-model",
            name: "Radius Test Model",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128_000,
            maxTokens: 16_384,
          },
        ],
      });
    });
    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const begin = yield* service.beginLogin(21, {
          serviceId: "radius",
          authType: "api_key",
        });
        if (begin.state !== "prompt") throw new Error("Expected the Pi API-key prompt");
        const login = yield* service.answerLogin(21, {
          requestId: begin.requestId,
          promptId: begin.prompt.promptId,
          value: "test-only-radius-key",
        });
        const refreshed = yield* service.refresh({ serviceId: "radius" });
        return { login, refreshed };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.login).toMatchObject({
      state: "complete",
      service: { serviceId: "radius", knownModelCount: 1, catalogState: "ready" },
    });
    expect(result.refreshed).toMatchObject({
      state: "success",
      service: { serviceId: "radius", knownModelCount: 1, catalogState: "ready" },
    });
    expect(requests).toEqual([
      { path: "/v1/config", authenticated: true },
      { path: "/v1/config", authenticated: true },
    ]);
    const storedCatalog = JSON.parse(
      await readFile(path.join(agentDir, "models-store.json"), "utf8"),
    );
    expect(Object.keys(storedCatalog)).toEqual(["radius"]);
    expect(JSON.stringify(storedCatalog)).not.toContain("test-only-radius-key");
  });

  it("reports authentication as saved when cancellation arrives during the post-login refresh", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    let refreshStarted = false;
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      refreshStarted = true;
      await refreshGate;
      return Response.json({
        baseUrl: "https://gateway.example.test",
        models: [
          {
            id: "radius-test-model",
            name: "Radius Test Model",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128_000,
            maxTokens: 16_384,
          },
        ],
      });
    });
    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const service = yield* OmniMindModelServices;
          const begin = yield* service.beginLogin(31, {
            serviceId: "radius",
            authType: "api_key",
          });
          if (begin.state !== "prompt") throw new Error("Expected the Pi API-key prompt");
          const answerPromise = Effect.runPromise(
            service.answerLogin(31, {
              requestId: begin.requestId,
              promptId: begin.prompt.promptId,
              value: "test-only-radius-key",
            }),
          );
          while (!refreshStarted) yield* Effect.sleep("5 millis");
          const cancelPromise = Effect.runPromise(
            service.cancelLogin(31, { requestId: begin.requestId }),
          );
          yield* Effect.sleep("5 millis");
          yield* Effect.sync(releaseRefresh);
          const [cancelled, answered] = yield* Effect.promise(() =>
            Promise.all([cancelPromise, answerPromise]),
          );
          return { cancelled, answered };
        }).pipe(Effect.provide(layer)),
      ),
    );

    expect(result.cancelled).toMatchObject({
      state: "auth_updated_catalog_failed",
      service: { serviceId: "radius", authState: "configured" },
    });
    expect(result.answered).toEqual(result.cancelled);
    const stored = JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"));
    expect(stored.radius).toMatchObject({ type: "api_key" });
    expect(JSON.stringify(result)).not.toContain("test-only-radius-key");
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
      connectableServices: [],
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
      connectableServices: [],
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
      connectableServices: [],
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
      connectableServices: [],
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
      connectableServices: [],
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

  it("projects an accepted custom service through Pi without exposing private fields", async () => {
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
    expect(result.list.state).toBe("ready");
    expect(result.list.services).toContainEqual(
      expect.objectContaining({
        serviceId: "小米代理",
        providerId: "小米代理",
        displayName: "小米代理",
        origin: "models_json",
        authState: "configured",
        authSource: "models_json_key",
        knownModelCount: 1,
        availableModelCount: 1,
        catalogState: "ready",
      }),
    );
    expect(JSON.stringify(result)).not.toContain(agentDir);
    expect(JSON.stringify(result)).not.toContain("redacted.example.test");
    expect(JSON.stringify(result)).not.toContain("not-projected");
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
