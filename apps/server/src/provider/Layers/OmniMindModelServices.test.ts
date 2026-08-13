import { createHash } from "node:crypto";
import { get as httpGet } from "node:http";
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
import { LOCAL_LOOPBACK_ATTACHMENT_PRINCIPAL } from "../../managedAttachmentPrincipal.ts";
import { provideWsConnectionSession } from "../../wsConnectionSessions.ts";
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
  readonly intent?: "add_service";
}) {
  const layer = makeTestLayer(input);
  return Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* OmniMindModelServices;
      const list = yield* service.list(input.intent ? { intent: input.intent } : {});
      const deepseek = yield* service.get({
        serviceId: "deepseek",
        ...(input.intent ? { intent: input.intent } : {}),
      });
      return { list, deepseek };
    }).pipe(Effect.provide(layer)),
  );
}

function makeTestLayer(input: {
  readonly root: string;
  readonly loadModule?: () => Promise<OmniMindCodingAgentModule>;
  readonly readTextFile?: (filePath: string, signal?: AbortSignal) => Promise<string>;
  readonly authRequestTimeoutMs?: number;
}) {
  return makeOmniMindModelServicesLive({
    ...(input.loadModule ? { loadModule: input.loadModule } : {}),
    ...(input.readTextFile ? { readTextFile: input.readTextFile } : {}),
    ...(input.authRequestTimeoutMs === undefined
      ? {}
      : { authRequestTimeoutMs: input.authRequestTimeoutMs }),
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
      result.list.connectableServices.every(
        (service) =>
          service.origin === "builtin" && service.authMethods.some((method) => method.canLogin),
      ),
    ).toBe(true);
    expect(result.list.connectableServices).toContainEqual(
      expect.objectContaining({
        serviceId: "openai-codex",
        authMethods: [expect.objectContaining({ type: "oauth", canLogin: true })],
      }),
    );
    expect(result.deepseek).toMatchObject({
      state: "ready",
      service: expect.objectContaining({
        serviceId: "deepseek",
        origin: "builtin",
        authState: "setup_required",
        availableModelCount: 0,
      }),
      models: expect.arrayContaining([
        expect.objectContaining({
          modelId: "deepseek-v4-flash",
          displayName: "DeepSeek V4 Flash",
          available: false,
          reasoning: true,
        }),
        expect.objectContaining({
          modelId: "deepseek-v4-pro",
          displayName: "DeepSeek V4 Pro",
          available: false,
          reasoning: true,
        }),
      ]),
    });
    expect(await readdir(agentDir)).toEqual([]);
  });

  it("does not execute Extension resources for passive model-service projection", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    await mkdir(path.join(root, "agent"), { recursive: true });
    const sdk = await import("@omnimind/pi-coding-agent");
    const createAgentSessionServices = vi.fn(sdk.createAgentSessionServices);

    const result = await loadService({
      root,
      loadModule: async () => ({ ...sdk, createAgentSessionServices }) as OmniMindCodingAgentModule,
    });

    expect(result.list.state).toBe("empty");
    expect(result.list).not.toHaveProperty("extensionProjectionState");
    expect(createAgentSessionServices).not.toHaveBeenCalled();
  });

  it("projects Extension providers only for add-service intent and retires the task runtime", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    const sdk = await import("@omnimind/pi-coding-agent");
    const invalidate = vi.fn();
    const createAgentSessionServices = vi.fn(
      async (options: Parameters<typeof sdk.createAgentSessionServices>[0]) => {
        options.modelRuntime!.registerProvider("extension-service", {
          name: "Extension Service",
          baseUrl: "https://extension.invalid/v1",
          api: "openai-responses",
          apiKey: "$OMNIMIND_EXTENSION_TEST_KEY",
          models: [
            {
              id: "extension-model",
              name: "Extension Model",
              reasoning: false,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 32_000,
              maxTokens: 4_096,
            },
          ],
        });
        const nativeProvider = options.modelRuntime!.getProvider("deepseek");
        if (!nativeProvider) {
          throw new Error("Expected the built-in DeepSeek provider in the test runtime");
        }
        options.modelRuntime!.registerNativeProvider({
          ...nativeProvider,
          id: "extension-without-login",
          name: "Extension Without Login",
          auth: {},
        });
        return {
          cwd: options.cwd,
          agentDir: options.agentDir!,
          modelRuntime: options.modelRuntime!,
          settingsManager: options.settingsManager!,
          resourceLoader: {
            getExtensions: () => ({ extensions: [], errors: [], runtime: { invalidate } }),
          },
          diagnostics: [],
        } as unknown as Awaited<ReturnType<typeof sdk.createAgentSessionServices>>;
      },
    );
    const layer = makeTestLayer({
      root,
      loadModule: async () => ({ ...sdk, createAgentSessionServices }) as OmniMindCodingAgentModule,
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const list = yield* service.list({ intent: "add_service" });
        const detail = yield* service.get({
          serviceId: "extension-service",
          intent: "add_service",
        });
        return { list, detail };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.list).toMatchObject({
      state: "empty",
      extensionProjectionState: "ready",
      connectableServices: expect.arrayContaining([
        expect.objectContaining({
          serviceId: "extension-service",
          origin: "extension",
          authState: "setup_required",
          authMethods: [expect.objectContaining({ type: "api_key", canLogin: true })],
        }),
      ]),
    });
    expect(result.detail).toMatchObject({
      state: "ready",
      extensionProjectionState: "ready",
      service: { serviceId: "extension-service", origin: "extension" },
      models: [expect.objectContaining({ modelId: "extension-model" })],
    });
    expect(result.list.connectableServices).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ serviceId: "extension-without-login" })]),
    );
    expect(result.list.services).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ serviceId: "extension-without-login" })]),
    );
    expect(createAgentSessionServices).toHaveBeenCalledTimes(2);
    const canonicalAgentDir = await realpath(agentDir);
    for (const [options] of createAgentSessionServices.mock.calls) {
      expect(options.cwd).toBe(canonicalAgentDir);
      expect(options.agentDir).toBe(canonicalAgentDir);
      expect(options.settingsManager?.isProjectTrusted()).toBe(false);
      expect(options.resourceLoaderOptions).toMatchObject({
        noSkills: true,
        noPromptTemplates: true,
        noThemes: true,
        noContextFiles: true,
      });
      await expect(
        options.resourceLoaderReloadOptions?.resolveProjectTrust?.({} as never),
      ).resolves.toBe(false);
      await expect(
        options.resourceLoaderReloadOptions?.onMissingPackage?.("missing-package"),
      ).resolves.toBe("error");
    }
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it("retires an Extension runtime when add-service projection is cancelled after loading", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    await mkdir(path.join(root, "agent"), { recursive: true });
    const sdk = await import("@omnimind/pi-coding-agent");
    const controller = new AbortController();
    const invalidate = vi.fn();
    const createAgentSessionServices = vi.fn(
      async (options: Parameters<typeof sdk.createAgentSessionServices>[0]) => {
        controller.abort(new Error("cancel intent-scoped Extension projection"));
        return {
          cwd: options.cwd,
          agentDir: options.agentDir!,
          modelRuntime: options.modelRuntime!,
          settingsManager: options.settingsManager!,
          resourceLoader: {
            getExtensions: () => ({ extensions: [], errors: [], runtime: { invalidate } }),
          },
          diagnostics: [],
        } as unknown as Awaited<ReturnType<typeof sdk.createAgentSessionServices>>;
      },
    );
    const layer = makeTestLayer({
      root,
      loadModule: async () => ({ ...sdk, createAgentSessionServices }) as OmniMindCodingAgentModule,
    });

    const running = Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        return yield* service.list({ intent: "add_service" });
      }).pipe(Effect.provide(layer)),
      { signal: controller.signal },
    );

    await expect(running).rejects.toThrow();
    expect(createAgentSessionServices).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("keeps the passive catalog when intent-scoped Extension loading fails", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    await mkdir(path.join(root, "agent"), { recursive: true });
    const sdk = await import("@omnimind/pi-coding-agent");
    const createAgentSessionServices = vi.fn(
      async (options: Parameters<typeof sdk.createAgentSessionServices>[0]) => {
        expect(
          await options.resourceLoaderReloadOptions?.onMissingPackage?.("missing-package"),
        ).toBe("error");
        throw new Error("Extension package is unavailable");
      },
    );

    const result = await loadService({
      root,
      intent: "add_service",
      loadModule: async () => ({ ...sdk, createAgentSessionServices }) as OmniMindCodingAgentModule,
    });
    const auth = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        return yield* service.beginLogin(40, {
          serviceId: "missing-extension-service",
          authType: "api_key",
          origin: "extension",
        });
      }).pipe(
        Effect.provide(
          makeTestLayer({
            root,
            loadModule: async () =>
              ({ ...sdk, createAgentSessionServices }) as OmniMindCodingAgentModule,
          }),
        ),
      ),
    );

    expect(result.list).toMatchObject({
      state: "empty",
      services: [],
      extensionProjectionState: "unavailable",
      connectableServices: expect.arrayContaining([
        expect.objectContaining({ serviceId: "deepseek", origin: "builtin" }),
      ]),
    });
    expect(result.deepseek).toMatchObject({
      state: "ready",
      extensionProjectionState: "unavailable",
      service: { serviceId: "deepseek", origin: "builtin" },
    });
    expect(auth).toMatchObject({ state: "failed", errorCode: "auth_failed" });
    expect(createAgentSessionServices).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(result)).not.toContain("missing-package");
  });

  it("keeps Extension services alive through login, refresh, and logout, then retires them", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    await mkdir(path.join(root, "agent"), { recursive: true });
    const sdk = await import("@omnimind/pi-coding-agent");
    const invalidate = vi.fn();
    const extensionModels = [
      {
        id: "extension-model",
        name: "Extension Model",
        reasoning: false,
        input: ["text"] as const,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 32_000,
        maxTokens: 4_096,
      },
    ];
    const createAgentSessionServices = vi.fn(
      async (options: Parameters<typeof sdk.createAgentSessionServices>[0]) => {
        options.modelRuntime!.registerProvider("extension-auth", {
          name: "Extension Auth",
          baseUrl: "https://extension.invalid/v1",
          api: "openai-responses",
          apiKey: "$OMNIMIND_EXTENSION_TEST_KEY",
          oauth: {
            name: "Extension OAuth",
            login: async () => ({
              access: "extension-access",
              refresh: "extension-refresh",
              expires: Date.now() + 60_000,
            }),
            refreshToken: async (credentials) => credentials,
            getApiKey: (credentials) => credentials.access,
          },
          models: extensionModels.map((model) => ({ ...model, input: [...model.input] })),
          refreshModels: async () =>
            extensionModels.map((model) => ({ ...model, input: [...model.input] })),
        });
        return {
          cwd: options.cwd,
          agentDir: options.agentDir!,
          modelRuntime: options.modelRuntime!,
          settingsManager: options.settingsManager!,
          resourceLoader: {
            getExtensions: () => ({ extensions: [], errors: [], runtime: { invalidate } }),
          },
          diagnostics: [],
        } as unknown as Awaited<ReturnType<typeof sdk.createAgentSessionServices>>;
      },
    );
    const layer = makeTestLayer({
      root,
      loadModule: async () => ({ ...sdk, createAgentSessionServices }) as OmniMindCodingAgentModule,
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const apiKeyBegin = yield* service.beginLogin(41, {
          serviceId: "extension-auth",
          authType: "api_key",
          origin: "extension",
        });
        if (apiKeyBegin.state !== "prompt") throw new Error("Expected Extension API-key prompt");
        const apiKeyLogin = yield* service.answerLogin(41, {
          requestId: apiKeyBegin.requestId,
          promptId: apiKeyBegin.prompt.promptId,
          value: "extension-test-key",
        });
        const apiKeyRefresh = yield* service.refresh({
          serviceId: "extension-auth",
          origin: "extension",
        });
        const apiKeyLogout = yield* service.logout({
          serviceId: "extension-auth",
          origin: "extension",
        });
        const oauthLogin = yield* service.beginLogin(42, {
          serviceId: "extension-auth",
          authType: "oauth",
          origin: "extension",
        });
        const oauthRefresh = yield* service.refresh({
          serviceId: "extension-auth",
          origin: "extension",
        });
        const oauthLogout = yield* service.logout({
          serviceId: "extension-auth",
          origin: "extension",
        });
        return {
          apiKeyLogin,
          apiKeyRefresh,
          apiKeyLogout,
          oauthLogin,
          oauthRefresh,
          oauthLogout,
        };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.apiKeyLogin).toMatchObject({
      state: "complete",
      service: { serviceId: "extension-auth", origin: "extension", authState: "configured" },
    });
    expect(result.apiKeyRefresh).toMatchObject({
      state: "success",
      service: { serviceId: "extension-auth", origin: "extension" },
    });
    expect(result.apiKeyLogout).toMatchObject({
      state: "complete",
      service: { serviceId: "extension-auth", origin: "extension" },
    });
    expect(result.oauthLogin).toMatchObject({
      state: "complete",
      service: {
        serviceId: "extension-auth",
        origin: "extension",
        storedCredentialType: "oauth",
      },
    });
    expect(result.oauthRefresh.state).toBe("success");
    expect(result.oauthLogout.state).toBe("complete");
    expect(createAgentSessionServices).toHaveBeenCalledTimes(6);
    expect(invalidate).toHaveBeenCalledTimes(6);
    expect(JSON.stringify(result)).not.toContain("extension-test-key");
    expect(JSON.stringify(result)).not.toContain("extension-access");
  });

  it("keeps a configured Extension discoverable in later add-service projections", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    await mkdir(path.join(root, "agent"), { recursive: true });
    const sdk = await import("@omnimind/pi-coding-agent");
    const invalidate = vi.fn();
    const createAgentSessionServices = vi.fn(
      async (options: Parameters<typeof sdk.createAgentSessionServices>[0]) => {
        options.modelRuntime!.registerProvider("configured-extension", {
          name: "Configured Extension",
          baseUrl: "https://extension.invalid/v1",
          api: "openai-responses",
          apiKey: "$OMNIMIND_CONFIGURED_EXTENSION_KEY",
          models: [],
        });
        await options.modelRuntime!.setRuntimeApiKey(
          "configured-extension",
          "configured-extension-key",
        );
        return {
          cwd: options.cwd,
          agentDir: options.agentDir!,
          modelRuntime: options.modelRuntime!,
          settingsManager: options.settingsManager!,
          resourceLoader: {
            getExtensions: () => ({ extensions: [], errors: [], runtime: { invalidate } }),
          },
          diagnostics: [],
        } as unknown as Awaited<ReturnType<typeof sdk.createAgentSessionServices>>;
      },
    );
    const layer = makeTestLayer({
      root,
      loadModule: async () => ({ ...sdk, createAgentSessionServices }) as OmniMindCodingAgentModule,
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        return yield* service.list({ intent: "add_service" });
      }).pipe(Effect.provide(layer)),
    );

    expect(result.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          serviceId: "configured-extension",
          origin: "extension",
          authState: "configured",
        }),
      ]),
    );
    expect(result.connectableServices).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ serviceId: "configured-extension" })]),
    );
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("uses the selected Extension overlay instead of the colliding built-in provider", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    await mkdir(path.join(root, "agent"), { recursive: true });
    const sdk = await import("@omnimind/pi-coding-agent");
    const invalidate = vi.fn();
    const extensionRefresh = vi.fn(async () => []);
    const createAgentSessionServices = vi.fn(
      async (options: Parameters<typeof sdk.createAgentSessionServices>[0]) => {
        options.modelRuntime!.registerProvider("deepseek", {
          name: "DeepSeek Extension Overlay",
          baseUrl: "https://extension.invalid/v1",
          api: "openai-responses",
          oauth: {
            name: "Extension Overlay OAuth",
            login: async () => ({
              access: "extension-overlay-access",
              refresh: "extension-overlay-refresh",
              expires: Date.now() + 60_000,
            }),
            refreshToken: async (credentials) => credentials,
            getApiKey: (credentials) => credentials.access,
          },
          refreshModels: extensionRefresh,
        });
        if (!options.modelRuntime!.getRegisteredProviderIds().includes("deepseek")) {
          throw new Error("Extension overlay registration was not retained");
        }
        return {
          cwd: options.cwd,
          agentDir: options.agentDir!,
          modelRuntime: options.modelRuntime!,
          settingsManager: options.settingsManager!,
          resourceLoader: {
            getExtensions: () => ({ extensions: [], errors: [], runtime: { invalidate } }),
          },
          diagnostics: [],
        } as unknown as Awaited<ReturnType<typeof sdk.createAgentSessionServices>>;
      },
    );
    const loadModule = async () =>
      ({ ...sdk, createAgentSessionServices }) as OmniMindCodingAgentModule;
    const layer = makeTestLayer({ root, loadModule });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const addList = yield* service.list({ intent: "add_service" });
        const login = yield* service.beginLogin(43, {
          serviceId: "deepseek",
          authType: "oauth",
          origin: "extension",
        });
        const refresh = yield* service.refresh({
          serviceId: "deepseek",
          origin: "extension",
        });
        const logout = yield* service.logout({
          serviceId: "deepseek",
          origin: "extension",
        });
        return { addList, login, refresh, logout };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.login).toMatchObject({
      state: "complete",
      service: { serviceId: "deepseek", origin: "extension" },
    });
    expect(result.refresh).toMatchObject({
      state: "success",
      service: { serviceId: "deepseek", origin: "extension" },
    });
    expect(result.logout).toMatchObject({
      state: "complete",
      service: { serviceId: "deepseek", origin: "extension" },
    });
    expect(extensionRefresh).toHaveBeenCalled();
    expect(createAgentSessionServices).toHaveBeenCalledTimes(4);
    expect(invalidate).toHaveBeenCalledTimes(4);
  });

  it("uses Pi login and logout as the only API-key credential mutation owner", async () => {
    const root = await makeRoot();
    const providerHome = await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    const sdk = await import("@omnimind/pi-coding-agent");
    const createAgentSessionServices = vi.fn(sdk.createAgentSessionServices);
    const layer = makeTestLayer({
      root,
      loadModule: async () => ({ ...sdk, createAgentSessionServices }) as OmniMindCodingAgentModule,
    });
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
    expect(createAgentSessionServices).not.toHaveBeenCalled();
    await expect(stat(path.join(providerHome, ".pi"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("exposes builtin OAuth without inventing API-key capability", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    const layer = makeTestLayer({ root });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const begin = yield* service.beginLogin(8, {
          serviceId: "openai-codex",
          authType: "oauth",
        });
        if (begin.state !== "prompt") return { begin, cancelled: null };
        const cancelled = yield* service.cancelLogin(8, { requestId: begin.requestId });
        return { begin, cancelled };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.begin).toMatchObject({
      state: "prompt",
      prompt: { type: "select" },
      events: [],
    });
    expect(result.cancelled).toMatchObject({ state: "cancelled" });
    expect(JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"))).toEqual({});
  });

  it("uses the provider default OAuth choice and keeps polling past the manual fallback", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    const tokenPayload = Buffer.from(
      JSON.stringify({
        "https://api.openai.com/auth": { chatgpt_account_id: "test-account" },
      }),
    ).toString("base64url");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        access_token: `header.${tokenPayload}.signature`,
        refresh_token: "refresh-secret",
        expires_in: 3600,
      }),
    );
    const layer = makeTestLayer({ root });
    let callbackHtml = "";

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const begin = yield* service.beginLogin(17, {
          serviceId: "openai-codex",
          authType: "oauth",
          promptMode: "provider_default",
        });
        if (begin.state !== "prompt" || begin.prompt.type !== "manual_code") {
          throw new Error("Expected the browser flow's manual fallback prompt");
        }
        const authUrl = begin.events.find((event) => event.type === "auth_url")?.url;
        if (!authUrl) throw new Error("Expected the provider-owned browser URL");
        const state = new URL(authUrl).searchParams.get("state");
        if (!state) throw new Error("Expected OAuth state");
        const pollPromise = Effect.runPromise(
          service.pollLogin(17, {
            requestId: begin.requestId,
            afterEventCount: begin.events.length,
            afterPromptId: begin.prompt.promptId,
          }),
        );
        yield* Effect.promise(
          () =>
            new Promise<void>((resolve, reject) => {
              httpGet(
                `http://127.0.0.1:1455/auth/callback?code=test-code&state=${encodeURIComponent(state)}`,
                (response) => {
                  response.setEncoding("utf8");
                  response.on("data", (chunk) => {
                    callbackHtml += chunk;
                  });
                  response.on("end", resolve);
                },
              ).on("error", reject);
            }),
        );
        return yield* Effect.promise(() => pollPromise);
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toMatchObject({
      state: "complete",
      service: {
        serviceId: "openai-codex",
        authState: "configured",
        storedCredentialType: "oauth",
      },
    });
    expect(JSON.stringify(result)).not.toContain("test-code");
    expect(JSON.stringify(result)).not.toContain("refresh-secret");
    expect(callbackHtml).toContain("OmniMind");
    expect(callbackHtml).toContain("Authorization from OpenAI Codex was received");
    expect(callbackHtml).toContain("已收到来自 OpenAI Codex 的授权");
    expect(callbackHtml).not.toContain("Signed in");
    expect(callbackHtml).not.toContain("is connected");
    expect(callbackHtml).toContain('meta name="color-scheme" content="light"');
    expect(callbackHtml).not.toContain("Authentication successful");
    expect(callbackHtml).not.toContain("#09090b");
  });

  it("does not claim connection success before the browser authorization is exchanged", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("exchange unavailable", { status: 502 }),
    );
    const layer = makeTestLayer({ root });
    let callbackHtml = "";

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const begin = yield* service.beginLogin(18, {
          serviceId: "openai-codex",
          authType: "oauth",
          promptMode: "provider_default",
        });
        if (begin.state !== "prompt" || begin.prompt.type !== "manual_code") {
          throw new Error("Expected the browser flow's manual fallback prompt");
        }
        const authUrl = begin.events.find((event) => event.type === "auth_url")?.url;
        if (!authUrl) throw new Error("Expected the provider-owned browser URL");
        const state = new URL(authUrl).searchParams.get("state");
        if (!state) throw new Error("Expected OAuth state");
        const pollPromise = Effect.runPromise(
          service.pollLogin(18, {
            requestId: begin.requestId,
            afterEventCount: begin.events.length,
            afterPromptId: begin.prompt.promptId,
          }),
        );
        yield* Effect.promise(
          () =>
            new Promise<void>((resolve, reject) => {
              httpGet(
                `http://127.0.0.1:1455/auth/callback?code=test-code&state=${encodeURIComponent(state)}`,
                (response) => {
                  response.setEncoding("utf8");
                  response.on("data", (chunk) => {
                    callbackHtml += chunk;
                  });
                  response.on("end", resolve);
                },
              ).on("error", reject);
            }),
        );
        return yield* Effect.promise(() => pollPromise);
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toMatchObject({ state: "failed", errorCode: "auth_failed" });
    expect(callbackHtml).toContain("Authorization received");
    expect(callbackHtml).toContain("已收到授权");
    expect(callbackHtml).not.toContain("Signed in");
    expect(callbackHtml).not.toContain("登录成功");
    expect(callbackHtml).not.toContain("is connected");
    expect(callbackHtml).not.toContain("exchange unavailable");
    expect(JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"))).toEqual({});
  });

  it("long-polls provider-owned OAuth events and binds them to the originating client", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          device_auth_id: "test-device-auth",
          user_code: "ABCD-EFGH",
          interval: 60,
        }),
      )
      .mockImplementation(
        (_request, init) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
            if (signal?.aborted) onAbort();
            else signal?.addEventListener("abort", onAbort, { once: true });
          }),
      );
    const layer = makeTestLayer({ root });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const begin = yield* service.beginLogin(9, {
          serviceId: "openai-codex",
          authType: "oauth",
        });
        if (begin.state !== "prompt" || begin.prompt.type !== "select") {
          throw new Error("Expected the provider-owned OAuth method prompt");
        }
        const pending = yield* service.answerLogin(9, {
          requestId: begin.requestId,
          promptId: begin.prompt.promptId,
          value: "device_code",
        });
        if (pending.state !== "pending") {
          throw new Error("Expected the provider-owned OAuth URL event");
        }
        const foreign = yield* service.pollLogin(10, {
          requestId: pending.requestId,
          afterEventCount: pending.events.length,
        });
        const pollPromise = Effect.runPromise(
          service.pollLogin(9, {
            requestId: pending.requestId,
            afterEventCount: pending.events.length,
          }),
        );
        const cancelled = yield* service.cancelLogin(9, { requestId: pending.requestId });
        const polled = yield* Effect.promise(() => pollPromise);
        return { pending, foreign, polled, cancelled };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.pending.events).toEqual([
      expect.objectContaining({
        type: "device_code",
        userCode: "ABCD-EFGH",
        verificationUri: expect.stringMatching(/^https:\/\//u),
      }),
    ]);
    expect(JSON.stringify(result.pending)).not.toContain("access_token");
    expect(result.foreign).toMatchObject({ state: "failed", errorCode: "request_expired" });
    expect(result.cancelled).toMatchObject({ state: "cancelled" });
    expect(result.polled).toMatchObject({ state: "cancelled" });
    expect(JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"))).toEqual({});
  });

  it("persists completed provider-owned OAuth without returning tokens", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    const tokenPayload = Buffer.from(
      JSON.stringify({
        "https://api.openai.com/auth": { chatgpt_account_id: "test-account" },
      }),
    ).toString("base64url");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          device_auth_id: "test-device-auth",
          user_code: "ABCD-EFGH",
          interval: 0,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ authorization_code: "authorization-secret", code_verifier: "verifier" }),
      )
      .mockResolvedValueOnce(
        Response.json({
          access_token: `header.${tokenPayload}.signature`,
          refresh_token: "refresh-secret",
          expires_in: 3600,
        }),
      );
    const layer = makeTestLayer({ root });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const begin = yield* service.beginLogin(14, {
          serviceId: "openai-codex",
          authType: "oauth",
        });
        if (begin.state !== "prompt" || begin.prompt.type !== "select") {
          throw new Error("Expected the provider-owned OAuth method prompt");
        }
        const pending = yield* service.answerLogin(14, {
          requestId: begin.requestId,
          promptId: begin.prompt.promptId,
          value: "device_code",
        });
        if (pending.state !== "pending") {
          throw new Error("Expected the provider-owned device-code event");
        }
        return yield* service.pollLogin(14, {
          requestId: pending.requestId,
          afterEventCount: pending.events.length,
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toMatchObject({
      state: "complete",
      service: {
        serviceId: "openai-codex",
        authState: "configured",
        storedCredentialType: "oauth",
      },
    });
    expect(JSON.stringify(result)).not.toContain("authorization-secret");
    expect(JSON.stringify(result)).not.toContain("refresh-secret");
    const stored = JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"));
    expect(stored["openai-codex"]).toMatchObject({ type: "oauth", accountId: "test-account" });
  });

  it("rejects OAuth mutation for models.json service identities", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          "custom-radius": {
            name: "Custom Radius",
            api: "openai-completions",
            baseUrl: "https://example.invalid/v1",
            oauth: "radius",
            models: [{ id: "custom-model" }],
          },
        },
      }),
      { mode: 0o600 },
    );
    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        return yield* service.beginLogin(13, {
          serviceId: "custom-radius",
          authType: "oauth",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toMatchObject({ state: "failed", errorCode: "auth_failed" });
    expect(JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"))).toEqual({});
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

  it("releases the serialized mutation queue when a pending prompt is cancelled", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    await mkdir(path.join(root, "agent"), { recursive: true });
    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const first = yield* service.beginLogin(14, {
          serviceId: "deepseek",
          authType: "api_key",
        });
        if (first.state !== "prompt") throw new Error("Expected the first Pi API-key prompt");

        let secondSettled = false;
        const secondPromise = Effect.runPromise(
          service.beginLogin(14, { serviceId: "deepseek", authType: "api_key" }),
        ).then((value) => {
          secondSettled = true;
          return value;
        });
        yield* Effect.sleep("20 millis");
        const settledBeforeCancellation = secondSettled;
        const firstCancelled = yield* service.cancelLogin(14, {
          requestId: first.requestId,
        });
        const second = yield* Effect.promise(() => secondPromise);
        const secondCancelled =
          second.state === "prompt"
            ? yield* service.cancelLogin(14, { requestId: second.requestId })
            : null;
        return { settledBeforeCancellation, firstCancelled, second, secondCancelled };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.settledBeforeCancellation).toBe(false);
    expect(result.firstCancelled).toMatchObject({ state: "cancelled" });
    expect(result.second).toMatchObject({ state: "prompt" });
    expect(result.secondCancelled).toMatchObject({ state: "cancelled" });
  });

  it("expires a pending auth request honestly and releases the serialized mutation queue", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    await mkdir(path.join(root, "agent"), { recursive: true });
    const layer = makeTestLayer({ root, authRequestTimeoutMs: 100 });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const first = yield* service.beginLogin(24, {
          serviceId: "deepseek",
          authType: "api_key",
        });
        if (first.state !== "prompt") throw new Error("Expected the first Pi API-key prompt");

        yield* Effect.sleep("120 millis");
        const firstOutcome = yield* service.pollLogin(24, {
          requestId: first.requestId,
          afterEventCount: 0,
        });
        const second = yield* service.beginLogin(24, {
          serviceId: "deepseek",
          authType: "api_key",
        });
        const secondCancelled =
          second.state === "prompt"
            ? yield* service.cancelLogin(24, { requestId: second.requestId })
            : null;
        return { firstOutcome, second, secondCancelled };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.firstOutcome).toMatchObject({ state: "failed", errorCode: "request_expired" });
    expect(result.second).toMatchObject({ state: "prompt" });
    expect(result.secondCancelled).toMatchObject({ state: "cancelled" });
  });

  it("cancels a pending prompt when its WebSocket connection closes", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    await mkdir(path.join(root, "agent"), { recursive: true });
    const connection = new AbortController();
    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const first = yield* provideWsConnectionSession(
          service.beginLogin(15, { serviceId: "deepseek", authType: "api_key" }),
          {
            role: "owner",
            attachmentPrincipal: LOCAL_LOOPBACK_ATTACHMENT_PRINCIPAL,
            signal: connection.signal,
          },
        );
        if (first.state !== "prompt") throw new Error("Expected the first Pi API-key prompt");

        const secondPromise = Effect.runPromise(
          service.beginLogin(16, { serviceId: "deepseek", authType: "api_key" }),
        );
        yield* Effect.sleep("20 millis");
        connection.abort();
        const second = yield* Effect.promise(() => secondPromise);
        const firstOutcome = yield* service.pollLogin(15, {
          requestId: first.requestId,
          afterEventCount: 0,
        });
        const secondCancelled =
          second.state === "prompt"
            ? yield* service.cancelLogin(16, { requestId: second.requestId })
            : null;
        return { firstOutcome, second, secondCancelled };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.firstOutcome).toMatchObject({ state: "cancelled" });
    expect(result.second).toMatchObject({ state: "prompt" });
    expect(result.secondCancelled).toMatchObject({ state: "cancelled" });
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

  it("logs out only the exact OAuth service without exposing or deleting other credentials", async () => {
    const root = await makeRoot();
    const providerHome = await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "auth.json"),
      JSON.stringify({
        "openai-codex": {
          type: "oauth",
          access: "oauth-access-secret",
          refresh: "oauth-refresh-secret",
          expires: Date.now() + 60 * 60 * 1000,
          accountId: "account-redacted",
        },
        deepseek: { type: "api_key", key: "other-service-secret" },
      }),
      { mode: 0o600 },
    );
    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        return yield* service.logout({ serviceId: "openai-codex" });
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toMatchObject({
      state: "complete",
      service: {
        serviceId: "openai-codex",
        authState: "setup_required",
        storedCredentialType: null,
      },
    });
    const stored = JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"));
    expect(stored).toEqual({ deepseek: { type: "api_key", key: "other-service-secret" } });
    expect(JSON.stringify(result)).not.toContain("oauth-access-secret");
    expect(JSON.stringify(result)).not.toContain("oauth-refresh-secret");
    await expect(stat(path.join(providerHome, ".pi"))).rejects.toMatchObject({ code: "ENOENT" });
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

    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        return {
          list: yield* service.list(),
          detail: yield* service.get({ serviceId: "小米代理" }),
        };
      }).pipe(Effect.provide(layer)),
    );
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
    expect(result.detail).toMatchObject({
      state: "ready",
      customConfig: {
        serviceId: "小米代理",
        displayName: "小米代理",
        api: "openai-completions",
        baseUrl: "https://redacted.example.test/v1",
        models: [
          {
            modelId: "mimo",
            displayName: "mimo",
            reasoning: false,
            input: ["text"],
            contextWindow: 128_000,
            maxTokens: 16_384,
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain(agentDir);
    expect(result.detail).toMatchObject({
      state: "ready",
      customConfig: { baseUrl: "https://redacted.example.test/v1" },
    });
    expect(JSON.stringify(result)).not.toContain("not-projected");
  });

  it("tests a custom connection without persisting its process-local API key", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    const authPath = path.join(agentDir, "auth.json");
    const originalAuth = JSON.stringify({ deepseek: { type: "api_key", key: "keep-existing" } });
    await writeFile(authPath, originalAuth, { mode: 0o600 });
    let authorization: string | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (request, init) => {
      authorization = new Headers(request instanceof Request ? request.headers : init?.headers).get(
        "authorization",
      );
      return new Response(
        [
          'data: {"id":"test","object":"chat.completion.chunk","created":1,"model":"model-one","choices":[{"index":0,"delta":{"role":"assistant","content":"OK"},"finish_reason":null}]}',
          'data: {"id":"test","object":"chat.completion.chunk","created":1,"model":"model-one","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
          "data: [DONE]",
          "",
        ].join("\n\n"),
        { headers: { "content-type": "text/event-stream" } },
      );
    });
    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        return yield* service.testCustom({
          config: {
            serviceId: null,
            displayName: "Test gateway",
            api: "openai-completions",
            baseUrl: "https://gateway.example.test/v1",
            models: [
              {
                modelId: "model-one",
                displayName: "Model One",
                reasoning: false,
                input: ["text"],
                contextWindow: 32_000,
                maxTokens: 4_096,
              },
            ],
          },
          apiKey: "test-only-custom-key",
          testModelId: "model-one",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toMatchObject({ state: "success", errorCode: null });
    expect(authorization).toBe("Bearer test-only-custom-key");
    expect(await readFile(authPath, "utf8")).toBe(originalAuth);
    expect(JSON.stringify(result)).not.toContain("test-only-custom-key");
  });

  it("retests an existing custom connection with its retained Pi-owned credential", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          retained: {
            name: "Retained gateway",
            api: "openai-completions",
            baseUrl: "https://gateway.example.test/v1",
            apiKey: "retained-config-reference",
            models: [
              {
                id: "model-one",
                name: "Original Model",
                cost: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
                samplingParams: { temperature: 0.25 },
                headers: { "X-Model-Secret": "retained-model-header" },
              },
            ],
          },
        },
      }),
      { mode: 0o600 },
    );
    let authorization: string | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (request, init) => {
      authorization = new Headers(request instanceof Request ? request.headers : init?.headers).get(
        "authorization",
      );
      return new Response(
        [
          'data: {"id":"test","object":"chat.completion.chunk","created":1,"model":"model-one","choices":[{"index":0,"delta":{"role":"assistant","content":"OK"},"finish_reason":null}]}',
          'data: {"id":"test","object":"chat.completion.chunk","created":1,"model":"model-one","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
          "data: [DONE]",
          "",
        ].join("\n\n"),
        { headers: { "content-type": "text/event-stream" } },
      );
    });
    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        return yield* service.testCustom({
          config: {
            serviceId: "retained",
            displayName: "Retained gateway",
            api: "openai-completions",
            baseUrl: "https://gateway.example.test/v1",
            models: [
              {
                modelId: "model-one",
                displayName: "Edited Model",
                reasoning: false,
                input: ["text"],
                contextWindow: 128_000,
                maxTokens: 16_384,
              },
            ],
          },
          apiKey: null,
          testModelId: "model-one",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toMatchObject({ state: "success", errorCode: null });
    expect(authorization).toBe("Bearer retained-config-reference");
    expect(JSON.stringify(result)).not.toContain("retained-config-reference");
    expect(JSON.stringify(result)).not.toContain("retained-model-header");
  });

  it("saves, reopens, edits, and removes one custom service through Pi-owned state", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const layer = makeTestLayer({ root });
    const firstModel = {
      modelId: "model-one",
      displayName: "Model One",
      reasoning: true,
      input: ["text" as const],
      contextWindow: 64_000,
      maxTokens: 8_192,
    };
    const firstConfig = {
      serviceId: null,
      displayName: "Custom gateway",
      api: "openai-responses" as const,
      baseUrl: "https://gateway.example.test/v1",
      models: [firstModel],
    };
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const saved = yield* service.saveCustom({
          config: firstConfig,
          apiKey: "persisted-custom-key",
        });
        if (!saved.service) throw new Error("Expected saved custom service projection");
        const serviceId = saved.service.serviceId;
        const reopened = yield* service.get({ serviceId });
        const edited = yield* service.saveCustom({
          config: {
            ...firstConfig,
            serviceId,
            displayName: "Edited gateway",
            models: [
              {
                ...firstModel,
                displayName: "Edited Model",
              },
            ],
          },
          apiKey: null,
        });
        const reopenedAfterEdit = yield* service.get({ serviceId });
        const removed = yield* service.removeCustom({ serviceId });
        const absent = yield* service.get({ serviceId });
        return { saved, reopened, edited, reopenedAfterEdit, removed, absent, serviceId };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.saved).toMatchObject({
      state: "complete",
      service: { origin: "models_json", storedCredentialType: "api_key" },
    });
    expect(result.reopened).toMatchObject({
      state: "ready",
      customConfig: { displayName: "Custom gateway", api: "openai-responses" },
    });
    expect(result.edited).toMatchObject({ state: "complete" });
    expect(result.reopenedAfterEdit).toMatchObject({
      state: "ready",
      service: { storedCredentialType: "api_key" },
      customConfig: {
        displayName: "Edited gateway",
        models: [{ displayName: "Edited Model" }],
      },
    });
    expect(result.removed).toEqual({ state: "complete", serviceId: result.serviceId });
    expect(result.absent).toEqual({ state: "empty", service: null, errorCode: null });
    const agentDir = path.join(root, "agent");
    const storedAuth = JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"));
    expect(storedAuth[result.serviceId]).toBeUndefined();
    expect(await readFile(path.join(agentDir, "models.json"), "utf8")).not.toContain(
      result.serviceId,
    );
    expect(JSON.stringify(result)).not.toContain("persisted-custom-key");
  });

  it("preserves Pi-owned rich model fields when editing only visible service fields", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          rich: {
            name: "Before",
            api: "openai-completions",
            baseUrl: "https://gateway.example.test/v1",
            apiKey: "retained-reference",
            models: [
              {
                id: "model-one",
                name: "Before Model",
                cost: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
                samplingParams: { temperature: 0.25 },
                headers: { "X-Retained": "hidden-value" },
                compat: { supportsStore: false },
              },
              { id: "remove-model", samplingParams: { temperature: 0.75 } },
            ],
          },
        },
      }),
      { mode: 0o600 },
    );
    const layer = makeTestLayer({ root });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        return yield* service.saveCustom({
          config: {
            serviceId: "rich",
            displayName: "After",
            api: "openai-completions",
            baseUrl: "https://gateway.example.test/v1",
            models: [
              {
                modelId: "model-one",
                displayName: "After Model",
                reasoning: false,
                input: ["text"],
                contextWindow: 128_000,
                maxTokens: 16_384,
              },
            ],
          },
          apiKey: null,
        });
      }).pipe(Effect.provide(layer)),
    );
    const stored = JSON.parse(await readFile(path.join(agentDir, "models.json"), "utf8"));

    expect(result).toMatchObject({ state: "complete" });
    expect(stored.providers.rich.models).toEqual([
      {
        id: "model-one",
        name: "After Model",
        reasoning: false,
        input: ["text"],
        contextWindow: 128_000,
        maxTokens: 16_384,
        cost: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
        samplingParams: { temperature: 0.25 },
        headers: { "X-Retained": "hidden-value" },
        compat: { supportsStore: false },
      },
    ]);
  });

  it("keeps a custom service visible when Pi cannot delete its credential", async () => {
    const root = await makeRoot();
    await isolateProviderEnvironment(root);
    const sdk = await import("@omnimind/pi-coding-agent");
    let rejectLogout = false;
    const loadModule = async () =>
      ({
        ...sdk,
        ModelRuntime: new Proxy(sdk.ModelRuntime, {
          get(target, property, receiver) {
            if (property !== "create") return Reflect.get(target, property, receiver);
            return async (...args: Parameters<typeof sdk.ModelRuntime.create>) => {
              const runtime = await sdk.ModelRuntime.create(...args);
              return new Proxy(runtime, {
                get(runtimeTarget, runtimeProperty, runtimeReceiver) {
                  if (runtimeProperty === "logout" && rejectLogout) {
                    return async () => {
                      throw new Error("test credential cleanup failure");
                    };
                  }
                  const value = Reflect.get(runtimeTarget, runtimeProperty, runtimeReceiver);
                  return typeof value === "function" ? value.bind(runtimeTarget) : value;
                },
              });
            };
          },
        }),
      }) as OmniMindCodingAgentModule;
    const layer = makeTestLayer({ root, loadModule });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const saved = yield* service.saveCustom({
          config: {
            serviceId: null,
            displayName: "Retryable gateway",
            api: "openai-responses",
            baseUrl: "https://gateway.example.test/v1",
            models: [
              {
                modelId: "model-one",
                displayName: "Model One",
                reasoning: false,
                input: ["text"],
                contextWindow: 32_000,
                maxTokens: 4_096,
              },
            ],
          },
          apiKey: "credential-that-must-remain-reachable",
        });
        if (!saved.service) throw new Error("Expected saved custom service projection");
        rejectLogout = true;
        const removal = yield* Effect.exit(
          service.removeCustom({ serviceId: saved.service.serviceId }),
        );
        const reopened = yield* service.get({ serviceId: saved.service.serviceId });
        return { saved, removal, reopened };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.removal._tag).toBe("Failure");
    expect(result.reopened).toMatchObject({
      state: "ready",
      service: {
        origin: "models_json",
        authState: "configured",
        storedCredentialType: "api_key",
      },
      customConfig: { displayName: "Retryable gateway" },
    });
    const agentDir = path.join(root, "agent");
    expect(await readFile(path.join(agentDir, "models.json"), "utf8")).toContain(
      result.saved.service!.serviceId,
    );
    const auth = JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"));
    expect(auth[result.saved.service!.serviceId]).toMatchObject({ type: "api_key" });
    expect(JSON.stringify(result)).not.toContain("credential-that-must-remain-reachable");
  });

  it("keeps two same-name service instances independent across reopen and removal", async () => {
    const root = await makeRoot();
    const providerHome = await isolateProviderEnvironment(root);
    const stockPiDir = path.join(providerHome, ".pi");
    await mkdir(stockPiDir, { recursive: true });
    await writeFile(path.join(stockPiDir, "sentinel.json"), '{"owner":"stock-pi"}', {
      mode: 0o600,
    });
    const stockBefore = await snapshotDirectory(stockPiDir);
    const makeConfig = (serviceId: string, modelId: string) => ({
      serviceId,
      displayName: "Team Gateway",
      api: "openai-responses" as const,
      baseUrl: "https://gateway.example.test/v1",
      models: [
        {
          modelId,
          displayName: "Shared Model",
          reasoning: false,
          input: ["text" as const],
          contextWindow: 32_000,
          maxTokens: 4_096,
        },
      ],
    });
    const saveLayer = makeTestLayer({ root });
    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        yield* service.saveCustom({
          config: makeConfig("gateway-primary", "shared-model"),
          apiKey: "primary-instance-key",
        });
        yield* service.saveCustom({
          config: makeConfig("gateway-secondary", "shared-model"),
          apiKey: "secondary-instance-key",
        });
      }).pipe(Effect.provide(saveLayer)),
    );

    const reopenLayer = makeTestLayer({ root });
    const reopened = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const list = yield* service.list();
        const primary = yield* service.get({ serviceId: "gateway-primary" });
        const secondary = yield* service.get({ serviceId: "gateway-secondary" });
        return { list, primary, secondary };
      }).pipe(Effect.provide(reopenLayer)),
    );

    expect(reopened.list.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          serviceId: "gateway-primary",
          displayName: "Team Gateway",
          origin: "models_json",
        }),
        expect.objectContaining({
          serviceId: "gateway-secondary",
          displayName: "Team Gateway",
          origin: "models_json",
        }),
      ]),
    );
    expect(reopened.primary).toMatchObject({
      state: "ready",
      models: [{ modelId: "shared-model" }],
      customConfig: { serviceId: "gateway-primary" },
    });
    expect(reopened.secondary).toMatchObject({
      state: "ready",
      models: [{ modelId: "shared-model" }],
      customConfig: { serviceId: "gateway-secondary" },
    });

    const removeLayer = makeTestLayer({ root });
    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        yield* service.removeCustom({ serviceId: "gateway-primary" });
      }).pipe(Effect.provide(removeLayer)),
    );

    const finalLayer = makeTestLayer({ root });
    const afterRemoval = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* OmniMindModelServices;
        const primary = yield* service.get({ serviceId: "gateway-primary" });
        const secondary = yield* service.get({ serviceId: "gateway-secondary" });
        return { primary, secondary };
      }).pipe(Effect.provide(finalLayer)),
    );
    expect(afterRemoval.primary).toEqual({ state: "empty", service: null, errorCode: null });
    expect(afterRemoval.secondary).toMatchObject({
      state: "ready",
      service: { authState: "configured", storedCredentialType: "api_key" },
      models: [{ modelId: "shared-model" }],
      customConfig: { serviceId: "gateway-secondary" },
    });
    const agentDir = path.join(root, "agent");
    const auth = JSON.parse(await readFile(path.join(agentDir, "auth.json"), "utf8"));
    expect(auth["gateway-primary"]).toBeUndefined();
    expect(auth["gateway-secondary"]).toMatchObject({ type: "api_key" });
    const modelsContent = await readFile(path.join(agentDir, "models.json"), "utf8");
    expect(modelsContent).not.toContain("gateway-primary");
    expect(modelsContent).toContain("gateway-secondary");
    expect(await snapshotDirectory(stockPiDir)).toEqual(stockBefore);
    expect(JSON.stringify({ reopened, afterRemoval })).not.toContain("instance-key");
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
