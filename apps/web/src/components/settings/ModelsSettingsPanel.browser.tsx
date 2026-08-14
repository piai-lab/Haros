// FILE: ModelsSettingsPanel.browser.tsx
// Purpose: Proves Model services remains side-effect gated and renders honest projection states.
// Layer: Browser UI test

import "../../index.css";

import {
  ThreadId,
  type NativeApi,
  type ModelSelection,
  type OmniMindCustomModelServiceModelInput,
  type OmniMindModelServiceAuthResult,
  type OmniMindModelServiceDescriptor,
  type OmniMindModelServicesGetResult,
  type OmniMindModelServicesListResult,
} from "@omnimind/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { AppSettingsSchema } from "~/appSettings";
import { useComposerDraftStore } from "~/composerDraftStore";
import { makeQueuedChatTurn, resetComposerDraftStore } from "~/composerDraftStoreTestFixtures";
import { serverQueryKeys } from "~/lib/serverReactQuery";
import { createBrowserTestServerConfig } from "~/test/browserHarness";

const catalogHarness = vi.hoisted(() => ({
  useProviderModelCatalog: vi.fn(() => ({
    modelOptionsByProvider: { codex: [], kilo: [], opencode: [] },
  })),
}));

vi.mock("~/hooks/useProviderModelCatalog", () => catalogHarness);

vi.mock("~/i18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));

import { ModelsSettingsPanel } from "./ModelsSettingsPanel";

const checkedAt = "2026-08-12T00:00:00.000Z";
const settings = AppSettingsSchema.makeUnsafe({});

type ServiceOverrides = Omit<
  Partial<OmniMindModelServiceDescriptor>,
  "catalogState" | "catalogErrorCode"
> &
  (
    | { readonly catalogState?: "ready" | "empty"; readonly catalogErrorCode?: null }
    | {
        readonly catalogState: "stale" | "error";
        readonly catalogErrorCode?: "catalog_unavailable";
      }
  );

function service(overrides: ServiceOverrides = {}): OmniMindModelServiceDescriptor {
  const { catalogState = "ready", catalogErrorCode: _catalogErrorCode, ...rest } = overrides;
  const base: Omit<OmniMindModelServiceDescriptor, "catalogState" | "catalogErrorCode"> = {
    serviceId: "deepseek",
    providerId: "deepseek",
    displayName: "DeepSeek",
    origin: "builtin",
    authMethods: [
      { type: "api_key", label: "DeepSeek API key", canLogin: true, subscription: false },
    ],
    authState: "configured",
    authSource: "stored",
    storedCredentialType: "api_key",
    knownModelCount: 3,
    availableModelCount: 2,
    supportsNetworkRefresh: true,
    ...rest,
  };
  return catalogState === "stale" || catalogState === "error"
    ? { ...base, catalogState, catalogErrorCode: "catalog_unavailable" }
    : { ...base, catalogState, catalogErrorCode: null };
}

function setNativeApi(input: {
  readonly list: (
    input?: { readonly intent?: "add_service" },
    options?: { readonly signal?: AbortSignal },
  ) => Promise<OmniMindModelServicesListResult>;
  readonly get?: (
    input: { readonly serviceId: string; readonly intent?: "add_service" },
    options?: { readonly signal?: AbortSignal },
  ) => Promise<OmniMindModelServicesGetResult>;
  readonly supported?: boolean;
  readonly beginLogin?: NativeApi["omnimindModelServices"]["beginLogin"];
  readonly pollLogin?: NativeApi["omnimindModelServices"]["pollLogin"];
  readonly answerLogin?: NativeApi["omnimindModelServices"]["answerLogin"];
  readonly cancelLogin?: NativeApi["omnimindModelServices"]["cancelLogin"];
  readonly logout?: NativeApi["omnimindModelServices"]["logout"];
  readonly refresh?: NativeApi["omnimindModelServices"]["refresh"];
  readonly discoverCustom?: NativeApi["omnimindModelServices"]["discoverCustom"];
  readonly testCustom?: NativeApi["omnimindModelServices"]["testCustom"];
  readonly saveCustom?: NativeApi["omnimindModelServices"]["saveCustom"];
  readonly removeCustom?: NativeApi["omnimindModelServices"]["removeCustom"];
  readonly openExternal?: NativeApi["shell"]["openExternal"];
}) {
  const getConfig = vi.fn().mockResolvedValue(createBrowserTestServerConfig(checkedAt));
  const list = vi.fn(input.list);
  const get = vi.fn(
    input.get ?? (async () => ({ state: "empty", service: null, errorCode: null }) as const),
  );
  const beginLogin = vi.fn(
    input.beginLogin ??
      (async () => ({
        state: "failed",
        requestId: "00000000-0000-4000-8000-000000000001",
        errorCode: "auth_failed",
        events: [],
      })),
  );
  const answerLogin = vi.fn(input.answerLogin ?? beginLogin);
  const pollLogin = vi.fn(
    input.pollLogin ??
      ((_input, options) =>
        new Promise<never>((_resolve, reject) => {
          const signal = options?.signal;
          const rejectAbort = () => reject(new DOMException("Aborted", "AbortError"));
          if (signal?.aborted) rejectAbort();
          else signal?.addEventListener("abort", rejectAbort, { once: true });
        })),
  );
  const cancelLogin = vi.fn(input.cancelLogin ?? beginLogin);
  const logout = vi.fn(
    input.logout ?? (async () => ({ state: "complete", service: service() }) as const),
  );
  const refresh = vi.fn(
    input.refresh ?? (async () => ({ state: "success", service: service() }) as const),
  );
  const discoverCustom = vi.fn(
    input.discoverCustom ??
      (async () =>
        ({
          state: "success",
          models: [
            { modelId: "provider-model-a", displayName: "Provider Model A" },
            { modelId: "provider-model-b", displayName: "Provider Model B" },
          ],
          errorCode: null,
        }) as const),
  );
  const testCustom = vi.fn(
    input.testCustom ??
      (async ({ config }) => ({
        state: "success",
        models: config.models.map((model: OmniMindCustomModelServiceModelInput) => ({
          modelId: model.modelId,
          displayName: model.displayName ?? model.modelId,
          available: true,
          reasoning: model.reasoning ?? false,
          input: [...(model.input ?? ["text"])],
          contextWindow: model.contextWindow ?? 128_000,
          maxTokens: model.maxTokens ?? 16_384,
        })),
        errorCode: null,
      })),
  );
  const saveCustom = vi.fn(
    input.saveCustom ??
      (async () => ({ state: "complete", service: service({ origin: "models_json" }) }) as const),
  );
  const removeCustom = vi.fn(
    input.removeCustom ?? (async ({ serviceId }) => ({ state: "complete", serviceId }) as const),
  );
  const openExternal = vi.fn(input.openExternal ?? (async () => {}));
  window.nativeApi = {
    server: { getConfig },
    shell: { openExternal },
    ...(input.supported === false
      ? {}
      : {
          omnimindModelServices: {
            list,
            get,
            beginLogin,
            pollLogin,
            answerLogin,
            cancelLogin,
            logout,
            refresh,
            discoverCustom,
            testCustom,
            saveCustom,
            removeCustom,
          },
        }),
  } as unknown as NativeApi;
  return {
    getConfig,
    list,
    get,
    beginLogin,
    pollLogin,
    answerLogin,
    cancelLogin,
    logout,
    refresh,
    discoverCustom,
    testCustom,
    saveCustom,
    removeCustom,
    openExternal,
  };
}

async function renderPanel(input: {
  readonly active?: boolean;
  readonly startInAddFlow?: boolean;
  readonly onSetupReady?: (selection: ModelSelection) => void;
  readonly list: (
    input?: { readonly intent?: "add_service" },
    options?: { readonly signal?: AbortSignal },
  ) => Promise<OmniMindModelServicesListResult>;
  readonly get?: (
    input: { readonly serviceId: string; readonly intent?: "add_service" },
    options?: { readonly signal?: AbortSignal },
  ) => Promise<OmniMindModelServicesGetResult>;
  readonly primeServerConfig?: boolean;
  readonly supported?: boolean;
  readonly beginLogin?: NativeApi["omnimindModelServices"]["beginLogin"];
  readonly pollLogin?: NativeApi["omnimindModelServices"]["pollLogin"];
  readonly answerLogin?: NativeApi["omnimindModelServices"]["answerLogin"];
  readonly cancelLogin?: NativeApi["omnimindModelServices"]["cancelLogin"];
  readonly logout?: NativeApi["omnimindModelServices"]["logout"];
  readonly refresh?: NativeApi["omnimindModelServices"]["refresh"];
  readonly discoverCustom?: NativeApi["omnimindModelServices"]["discoverCustom"];
  readonly testCustom?: NativeApi["omnimindModelServices"]["testCustom"];
  readonly saveCustom?: NativeApi["omnimindModelServices"]["saveCustom"];
  readonly removeCustom?: NativeApi["omnimindModelServices"]["removeCustom"];
  readonly openExternal?: NativeApi["shell"]["openExternal"];
}) {
  const calls = setNativeApi(input);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: createRootRoute(),
  });
  if (input.primeServerConfig !== false) {
    queryClient.setQueryData(serverQueryKeys.config(), createBrowserTestServerConfig(checkedAt));
  }
  const view = (active: boolean) => (
    <RouterContextProvider router={router}>
      <QueryClientProvider client={queryClient}>
        <ModelsSettingsPanel
          active={active}
          resetEpoch={0}
          settings={settings}
          defaults={settings}
          updateSettings={() => {}}
          startInAddFlow={input.startInAddFlow ?? false}
          {...(input.onSetupReady ? { onSetupReady: input.onSetupReady } : {})}
        />
      </QueryClientProvider>
    </RouterContextProvider>
  );
  const screen = await render(view(input.active ?? true));
  return {
    calls,
    queryClient,
    router,
    screen,
    rerenderActive: (active: boolean) => screen.rerender(view(active)),
  };
}

async function openConnectableService(
  screen: Awaited<ReturnType<typeof renderPanel>>["screen"],
  name: string,
) {
  await screen.getByRole("button", { name: "settings.addModelService" }).click();
  const connectButton = screen.getByRole("button", {
    name: `settings.connectModelServiceNamed:{"name":"${name}"}`,
  });
  connectButton.element().focus();
  await userEvent.keyboard("{Enter}");
}

async function confirmCustomApiRisk(
  screen: Awaited<ReturnType<typeof renderPanel>>["screen"],
  action: "discover" | "test" | "save" = "test",
) {
  await screen
    .getByLabelText(
      action === "discover"
        ? "settings.customApiDiscoveryRiskTitle"
        : "settings.customApiRiskTitle",
    )
    .getByRole("button", {
      name:
        action === "save"
          ? "settings.customApiRiskContinueSave"
          : action === "discover"
            ? "settings.customApiRiskContinueDiscover"
            : "settings.customApiRiskContinueTest",
    })
    .click();
}

afterEach(() => {
  resetComposerDraftStore();
  delete window.nativeApi;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("ModelsSettingsPanel model services", () => {
  it("enters Add directly for Chat setup and returns only after an exact usable service exists", async () => {
    const setupService = service({
      authState: "setup_required",
      authSource: null,
      storedCredentialType: null,
      availableModelCount: 0,
    });
    const configuredService = service({ availableModelCount: 2 });
    const ambientExtension = service({
      serviceId: "ambient-extension",
      providerId: "ambient-extension",
      displayName: "Ambient Extension",
      origin: "extension",
      availableModelCount: 1,
    });
    let catalogProjected = false;
    const requestId = "00000000-0000-4000-8000-000000000071";
    const promptId = "00000000-0000-4000-8000-000000000072";
    const onSetupReady = vi.fn();
    const mounted = await renderPanel({
      startInAddFlow: true,
      onSetupReady,
      list: async (input) => {
        if (input?.intent) {
          return {
            state: "ready",
            services: [ambientExtension],
            connectableServices: [setupService],
            errorCode: null,
          } as const;
        }
        return catalogProjected
          ? ({
              state: "ready",
              services: [configuredService],
              connectableServices: [],
              errorCode: null,
            } as const)
          : ({
              state: "empty",
              services: [],
              connectableServices: [setupService],
              errorCode: null,
            } as const);
      },
      get: async ({ serviceId }) =>
        serviceId === ambientExtension.serviceId
          ? {
              state: "ready",
              service: ambientExtension,
              models: [
                {
                  modelId: "ambient-model",
                  displayName: "Ambient Model",
                  available: true,
                  reasoning: false,
                  input: ["text"],
                  contextWindow: 32_000,
                  maxTokens: 4_096,
                },
              ],
              errorCode: null,
            }
          : catalogProjected
            ? {
                state: "ready",
                service: configuredService,
                models: [
                  {
                    modelId: "deepseek-v4-flash",
                    displayName: "DeepSeek V4 Flash",
                    available: true,
                    reasoning: true,
                    input: ["text"],
                    contextWindow: 128_000,
                    maxTokens: 16_384,
                  },
                ],
                errorCode: null,
              }
            : { state: "ready", service: setupService, errorCode: null },
      beginLogin: async () => ({
        state: "prompt",
        requestId,
        prompt: {
          promptId,
          type: "secret",
          message: "Provider-owned instruction",
        },
        events: [],
      }),
      answerLogin: async () => {
        catalogProjected = true;
        return {
          state: "complete",
          requestId,
          service: setupService,
          events: [],
        };
      },
    });

    expect(
      mounted.screen.getByRole("textbox", { name: "settings.searchModelServices" }),
    ).toBeVisible();
    expect(onSetupReady).not.toHaveBeenCalled();
    await mounted.screen
      .getByRole("button", { name: 'settings.connectModelServiceNamed:{"name":"DeepSeek"}' })
      .click();
    await mounted.screen.getByRole("button", { name: "settings.addApiKey" }).click();
    await mounted.screen.getByLabelText("settings.modelServicePromptSecret").fill("test-secret");
    await mounted.screen.getByRole("button", { name: "settings.modelServiceContinue" }).click();

    await expect.poll(() => onSetupReady).toHaveBeenCalledTimes(1);
    expect(onSetupReady).toHaveBeenCalledWith({
      provider: "omnimind",
      model: "deepseek/deepseek-v4-flash",
    });
    expect(mounted.calls.list).toHaveBeenCalledWith(
      { intent: "add_service" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("does not query model services or server config while the route is inactive", async () => {
    const mounted = await renderPanel({
      active: false,
      primeServerConfig: false,
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [],
        errorCode: null,
      }),
    });

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(mounted.calls.list).not.toHaveBeenCalled();
    expect(mounted.calls.get).not.toHaveBeenCalled();
    expect(mounted.calls.getConfig).not.toHaveBeenCalled();
    expect(catalogHarness.useProviderModelCatalog).not.toHaveBeenCalled();
    expect(document.body.textContent?.trim()).toBe("");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("keeps the first load distinct from an empty service list", async () => {
    let resolveList!: (value: OmniMindModelServicesListResult) => void;
    const pendingList = new Promise<OmniMindModelServicesListResult>((resolve) => {
      resolveList = resolve;
    });
    const mounted = await renderPanel({ list: () => pendingList });

    await expect.poll(() => document.body.textContent).toContain("settings.modelServicesLoading");
    expect(mounted.calls.list).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(document.body.textContent).not.toContain("settings.noModelServices");

    resolveList({ state: "empty", services: [], connectableServices: [], errorCode: null });
    await expect.poll(() => document.body.textContent).toContain("settings.noModelServices");
    expect(document.body.textContent).not.toContain("settings.modelServicesUnavailable");
    expect(document.body.textContent).not.toContain("settings.gitWritingModel");
    expect(document.body.textContent).not.toContain("settings.independentEngineModels");
    expect(catalogHarness.useProviderModelCatalog).not.toHaveBeenCalled();

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("offers Pi login-capable built-ins without treating them as connected services", async () => {
    const connectable = service({
      authState: "setup_required",
      authSource: null,
      storedCredentialType: null,
      knownModelCount: 0,
      availableModelCount: 0,
      catalogState: "empty",
      catalogErrorCode: null,
    });
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [connectable],
        errorCode: null,
      }),
      get: async ({ serviceId }) =>
        serviceId === connectable.serviceId
          ? { state: "ready", service: connectable, errorCode: null }
          : { state: "empty", service: null, errorCode: null },
    });

    await expect.poll(() => document.body.textContent).toContain("settings.noModelServices");
    expect(document.body.textContent).not.toContain("DeepSeek");
    await openConnectableService(mounted.screen, "DeepSeek");
    await expect
      .poll(() => mounted.calls.get)
      .toHaveBeenCalledWith(
        { serviceId: "deepseek", intent: "add_service" },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceAuthentication");
    expect(mounted.screen.getByRole("button", { name: "settings.addApiKey" })).toBeTruthy();
    expect(document.body.textContent).toContain("settings.modelServiceModelDetailsUnavailable");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("loads installed Extension services only after Add is opened and keeps built-ins on failure", async () => {
    const builtin = service({
      serviceId: "deepseek",
      providerId: "deepseek",
      displayName: "DeepSeek",
      authState: "setup_required",
      authSource: null,
      storedCredentialType: null,
      knownModelCount: 0,
      availableModelCount: 0,
      catalogState: "empty",
      catalogErrorCode: null,
    });
    const extension = service({
      serviceId: "team-extension",
      providerId: "team-extension",
      displayName: "Team Extension",
      origin: "extension",
      authState: "setup_required",
      authSource: null,
      storedCredentialType: null,
      knownModelCount: 1,
      availableModelCount: 0,
      catalogState: "ready",
      catalogErrorCode: null,
    });
    const list = vi.fn(
      async (input: { intent?: "add_service" } = {}): Promise<OmniMindModelServicesListResult> =>
        input.intent === "add_service"
          ? {
              state: "empty" as const,
              services: [] as const,
              connectableServices: [builtin, extension],
              extensionProjectionState: "ready" as const,
              errorCode: null,
            }
          : {
              state: "empty" as const,
              services: [] as const,
              connectableServices: [builtin],
              errorCode: null,
            },
    );
    const mounted = await renderPanel({ list });

    await expect.poll(() => document.body.textContent).toContain("settings.addModelService");
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenLastCalledWith(
      {},
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(document.body.textContent).not.toContain("Team Extension");

    await mounted.screen.getByRole("button", { name: "settings.addModelService" }).click();
    await expect.poll(() => document.body.textContent).toContain("Team Extension");
    expect(list).toHaveBeenLastCalledWith(
      { intent: "add_service" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("keeps a configured Extension searchable in the explicit Add flow", async () => {
    const extension = service({
      serviceId: "team-extension",
      providerId: "team-extension",
      displayName: "Team Extension",
      origin: "extension",
      authState: "configured",
      authSource: "stored",
      storedCredentialType: "api_key",
    });
    const mounted = await renderPanel({
      list: async (input = {}) =>
        input.intent === "add_service"
          ? {
              state: "ready" as const,
              services: [extension],
              connectableServices: [] as const,
              extensionProjectionState: "ready" as const,
              errorCode: null,
            }
          : {
              state: "empty" as const,
              services: [] as const,
              connectableServices: [] as const,
              errorCode: null,
            },
      get: async (input) =>
        input.intent === "add_service"
          ? {
              state: "ready" as const,
              service: extension,
              models: [],
              extensionProjectionState: "ready" as const,
              errorCode: null,
            }
          : { state: "empty" as const, service: null, errorCode: null },
    });

    await mounted.screen.getByRole("button", { name: "settings.addModelService" }).click();
    await expect.poll(() => document.body.textContent).toContain("Team Extension");
    await mounted.screen
      .getByRole("button", {
        name: 'settings.connectModelServiceNamed:{"name":"Team Extension"}',
      })
      .click();
    await expect
      .poll(() => mounted.calls.get)
      .toHaveBeenCalledWith(
        { serviceId: "team-extension", intent: "add_service" },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("disambiguates same-name service instances without exposing their full IDs", async () => {
    const firstId = "11111111-1111-4111-8111-111111111111";
    const secondId = "22222222-2222-4222-8222-222222222222";
    const services = [firstId, secondId].map((serviceId) =>
      service({
        serviceId,
        providerId: serviceId,
        displayName: "Team Gateway",
        origin: "models_json",
        authState: "configured",
        authSource: "stored",
        storedCredentialType: "api_key",
      }),
    );
    const mounted = await renderPanel({
      list: async () => ({
        state: "ready",
        services,
        connectableServices: [],
        customApiConfiguration: {
          protocols: [
            "openai-completions",
            "openai-responses",
            "anthropic-messages",
            "google-generative-ai",
          ],
        },
        errorCode: null,
      }),
    });

    await expect.poll(() => document.body.textContent).toContain("Team Gateway");
    expect(document.body.textContent).not.toContain(firstId);
    expect(document.body.textContent).not.toContain(secondId);
    const suffixes = document.body.textContent?.match(/#[0-9A-F]{6}/gu) ?? [];
    expect(new Set(suffixes).size).toBe(2);

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("keeps the runtime service catalog behind a searchable add flow and returns from details", async () => {
    const connectableServices = Array.from({ length: 40 }, (_, index) =>
      service({
        serviceId: index === 7 ? "deepseek" : `service-${index}`,
        providerId: index === 7 ? "deepseek" : `service-${index}`,
        displayName: index === 7 ? "DeepSeek" : `Service ${index}`,
        authMethods: [
          {
            type: "api_key",
            label: index === 7 ? "DeepSeek API key" : `Service ${index} API key`,
            canLogin: true,
            subscription: false,
          },
        ],
        authState: "setup_required",
        authSource: null,
        storedCredentialType: null,
        knownModelCount: 0,
        availableModelCount: 0,
        catalogState: "empty",
        catalogErrorCode: null,
      }),
    );
    const deepSeek = connectableServices[7]!;
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices,
        errorCode: null,
      }),
      get: async ({ serviceId }) =>
        serviceId === deepSeek.serviceId
          ? {
              state: "ready",
              service: deepSeek,
              models: [
                {
                  modelId: "deepseek-v4-flash",
                  displayName: "DeepSeek V4 Flash",
                  available: true,
                  reasoning: true,
                  input: ["text"],
                  contextWindow: 131_072,
                  maxTokens: 16_384,
                },
                {
                  modelId: "deepseek-v4-pro",
                  displayName: "DeepSeek V4 Pro",
                  available: true,
                  reasoning: true,
                  input: ["text", "image"],
                  contextWindow: 131_072,
                  maxTokens: 16_384,
                },
              ],
              errorCode: null,
            }
          : { state: "empty", service: null, errorCode: null },
    });

    await expect.poll(() => document.body.textContent).toContain("settings.addModelService");
    expect(document.body.textContent).not.toContain("Service 39");

    await mounted.screen.getByRole("button", { name: "settings.addModelService" }).click();
    const results = document.querySelector<HTMLDivElement>(
      '[data-model-service-results="compact-list"]',
    );
    expect(results).not.toBeNull();
    expect(results?.querySelectorAll("li")).toHaveLength(40);
    expect(results?.className).not.toContain("grid-cols");
    expect(document.body.textContent).toContain("settings.recommendedModelServices");
    expect(document.body.textContent).toContain("settings.otherModelServices");
    expect(document.body.textContent?.indexOf("DeepSeek")).toBeLessThan(
      document.body.textContent?.indexOf("Service 0") ?? Number.MAX_SAFE_INTEGER,
    );
    expect(document.body.textContent).toContain("settings.modelServiceAuthMethodApiKey");
    expect(document.body.textContent).not.toContain("DeepSeek API key");
    const search = mounted.screen.getByRole("textbox", { name: "settings.searchModelServices" });
    await search.fill("deepseek");
    expect(document.body.textContent).toContain("DeepSeek");
    expect(document.body.textContent).not.toContain("Service 39");
    expect(document.querySelector('[data-model-service-icon="brand"]')).not.toBeNull();
    expect(
      mounted.screen.getByRole("button", { name: "settings.connectByApiAddress" }).query(),
    ).toBeNull();

    const connectButton = mounted.screen.getByRole("button", {
      name: 'settings.connectModelServiceNamed:{"name":"DeepSeek"}',
    });
    connectButton.element().focus();
    await userEvent.keyboard("{Enter}");
    const detailBackButton = mounted.screen.getByRole("button", { name: "common.back" });
    await expect.poll(() => document.activeElement).toBe(detailBackButton.element());
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceAuthentication");
    expect(document.body.textContent).toContain("DeepSeek V4 Flash");
    expect(document.body.textContent).toContain("DeepSeek V4 Pro");
    expect(document.querySelector('[data-model-service-icon="brand"]')).not.toBeNull();
    expect(document.body.textContent).toContain("settings.modelServiceModelThinking");
    expect(document.body.textContent).toContain("settings.modelServiceModelImages");
    expect(document.body.textContent).not.toContain("settings.searchModelServices");
    const modelList = document.querySelector<HTMLUListElement>(
      '[data-model-service-model-list="compact-list"]',
    );
    expect(modelList).not.toBeNull();
    expect(modelList?.querySelectorAll("li")).toHaveLength(2);
    expect(modelList?.querySelectorAll('[data-model-service-icon="brand"]')).toHaveLength(2);

    await mounted.screen.getByRole("button", { name: "common.back" }).click();
    expect(
      mounted.screen.getByRole("textbox", { name: "settings.searchModelServices" }),
    ).toHaveValue("deepseek");
    expect(document.body.textContent).toContain("DeepSeek");
    await expect.poll(() => document.activeElement).toBe(connectButton.element());

    await userEvent.keyboard("{Escape}");
    expect(search).toHaveValue("");
    await userEvent.keyboard("{Escape}");
    const addButton = mounted.screen.getByRole("button", { name: "settings.addModelService" });
    await expect.poll(() => document.activeElement).toBe(addButton.element());
    expect(document.body.textContent).not.toContain("Service 39");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("creates a Pi-owned API connection only after an exact successful test", async () => {
    const customService = service({
      serviceId: "custom-service",
      providerId: "custom-service",
      displayName: "Custom Service",
      origin: "models_json",
      supportsNetworkRefresh: false,
    });
    const testCustom = vi.fn(async ({ config }) => ({
      state: "success" as const,
      models: config.models.map((model: OmniMindCustomModelServiceModelInput) => ({
        modelId: model.modelId,
        displayName: model.displayName ?? model.modelId,
        available: true,
        reasoning: model.reasoning ?? false,
        input: [...(model.input ?? ["text"])],
        contextWindow: model.contextWindow ?? 128_000,
        maxTokens: model.maxTokens ?? 16_384,
      })),
      errorCode: null,
    }));
    const saveCustom = vi.fn(async () => ({ state: "complete" as const, service: customService }));
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [],
        customApiConfiguration: {
          protocols: [
            "openai-completions",
            "openai-responses",
            "anthropic-messages",
            "google-generative-ai",
          ],
        },
        errorCode: null,
      }),
      get: async ({ serviceId }) =>
        serviceId === customService.serviceId
          ? { state: "ready", service: customService, errorCode: null }
          : { state: "empty", service: null, errorCode: null },
      testCustom,
      saveCustom,
    });

    await mounted.screen.getByRole("button", { name: "settings.addModelService" }).click();
    const apiEntry = mounted.screen.getByRole("button", {
      name: /settings\.connectByApiAddress/,
    });
    expect(document.body.textContent).toContain("settings.customApiNotFoundPrompt");
    expect(apiEntry.element().querySelector('[data-model-service-icon="custom"]')).not.toBeNull();
    await apiEntry.click();

    await mounted.screen.getByLabelText("settings.customApiConnectionName").fill("Custom Service");
    await mounted.screen
      .getByLabelText("settings.customApiEndpoint")
      .fill("https://api.example.test/v1");
    await mounted.screen.getByLabelText("settings.customApiKey").fill("browser-secret");
    const apiKeyInput = mounted.screen.getByLabelText("settings.customApiKey");
    expect(apiKeyInput).toHaveAttribute("type", "password");
    await mounted.screen.getByRole("button", { name: "settings.customApiShowKey" }).click();
    expect(apiKeyInput).toHaveAttribute("type", "text");
    expect(apiKeyInput).toHaveValue("browser-secret");
    await mounted.screen.getByRole("button", { name: "settings.customApiHideKey" }).click();
    expect(apiKeyInput).toHaveAttribute("type", "password");
    await mounted.screen.getByLabelText("settings.customApiModelId").fill("custom-model");
    await mounted.screen.getByLabelText("settings.customApiModelName").fill("Custom Model");
    await mounted.screen.getByText("settings.customApiModelAdvanced", { exact: true }).click();
    await mounted.screen.getByLabelText("settings.customApiContextWindow").fill("128000");
    await mounted.screen.getByLabelText("settings.customApiMaxTokens").fill("8192");
    await mounted.screen.getByText("settings.customApiCredentialAdvanced", { exact: true }).click();
    await mounted.screen.getByLabelText("settings.customApiAuthHeader").click();
    await mounted.screen
      .getByRole("option", { name: "settings.customApiAuthHeader.bearer" })
      .click();
    await mounted.screen.getByLabelText("settings.customApiModelProtocol").click();
    await mounted.screen
      .getByRole("option", { name: "settings.customApiProtocol.openai-responses" })
      .click();
    await mounted.screen
      .getByLabelText("settings.customApiModelEndpoint")
      .fill("https://model.example.test/v1");
    await mounted.screen.getByLabelText("settings.customApiModelPricingMode").click();
    await mounted.screen
      .getByRole("option", { name: "settings.customApiModelPricingCustom" })
      .click();
    await mounted.screen.getByLabelText("settings.customApiModelCost.input").fill("1");
    await mounted.screen.getByLabelText("settings.customApiModelCost.output").fill("2");
    await mounted.screen.getByLabelText("settings.customApiModelCost.cacheRead").fill("0.25");
    await mounted.screen.getByLabelText("settings.customApiModelCost.cacheWrite").fill("0.5");
    await mounted.screen
      .getByRole("button", { name: "settings.customApiModelAddCostTier" })
      .click();
    await mounted.screen
      .getByLabelText("settings.customApiModelCostTier.inputTokensAbove", { exact: true })
      .fill("64000");
    await mounted.screen
      .getByLabelText("settings.customApiModelCostTier.input", { exact: true })
      .fill("3");
    await mounted.screen
      .getByLabelText("settings.customApiModelCostTier.output", { exact: true })
      .fill("4");
    await mounted.screen
      .getByLabelText("settings.customApiModelCostTier.cacheRead", { exact: true })
      .fill("0.75");
    await mounted.screen
      .getByLabelText("settings.customApiModelCostTier.cacheWrite", { exact: true })
      .fill("1");
    await mounted.screen
      .getByRole("combobox", {
        name: 'settings.customApiThinkingMapControl:{"level":"settings.customApiThinkingLevel.high"}',
        exact: true,
      })
      .click();
    await mounted.screen
      .getByRole("option", { name: "settings.customApiThinkingMap.mapped" })
      .click();
    await mounted.screen
      .getByLabelText(
        'settings.customApiThinkingMapValue:{"level":"settings.customApiThinkingLevel.high"}',
      )
      .fill("high-budget");
    await mounted.screen.getByLabelText("settings.customApiModelThinking").click();
    await mounted.screen.getByRole("option", { name: "common.off" }).click();
    await mounted.screen.getByLabelText("settings.customApiModelInput").click();
    await mounted.screen
      .getByRole("option", { name: "settings.customApiModelInput.text", exact: true })
      .click();

    const saveButton = mounted.screen.getByRole("button", { name: "settings.customApiSave" });
    expect(saveButton).toBeDisabled();
    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    expect(testCustom).not.toHaveBeenCalled();
    await mounted.screen
      .getByLabelText("settings.customApiRiskTitle")
      .getByRole("button", { name: "common.cancel" })
      .click();
    expect(testCustom).not.toHaveBeenCalled();
    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    await confirmCustomApiRisk(mounted.screen);
    await expect
      .poll(() => testCustom)
      .toHaveBeenCalledWith(
        {
          config: {
            serviceId: null,
            displayName: "Custom Service",
            api: "openai-completions",
            baseUrl: "https://api.example.test/v1",
            authHeader: true,
            models: [
              {
                modelId: "custom-model",
                displayName: "Custom Model",
                api: "openai-responses",
                baseUrl: "https://model.example.test/v1",
                reasoning: false,
                thinkingLevelMap: { high: "high-budget" },
                input: ["text"],
                cost: {
                  input: 1,
                  output: 2,
                  cacheRead: 0.25,
                  cacheWrite: 0.5,
                  tiers: [
                    {
                      inputTokensAbove: 64_000,
                      input: 3,
                      output: 4,
                      cacheRead: 0.75,
                      cacheWrite: 1,
                    },
                  ],
                },
                contextWindow: 128_000,
                maxTokens: 8_192,
              },
            ],
          },
          credential: { type: "stored_key", apiKey: "browser-secret" },
          testModelId: "custom-model",
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    await expect.poll(() => document.body.textContent).toContain("settings.customApiTestSucceeded");
    expect(saveButton).toBeEnabled();

    await mounted.screen
      .getByLabelText("settings.customApiModelEndpoint")
      .fill("https://other-model.example.test/v1");
    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    expect(testCustom).toHaveBeenCalledTimes(1);
    await mounted.screen
      .getByLabelText("settings.customApiRiskTitle")
      .getByRole("button", { name: "common.cancel" })
      .click();
    expect(testCustom).toHaveBeenCalledTimes(1);
    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    await confirmCustomApiRisk(mounted.screen);
    await expect.poll(() => testCustom).toHaveBeenCalledTimes(2);
    expect(testCustom).toHaveBeenLastCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          models: [expect.objectContaining({ baseUrl: "https://other-model.example.test/v1" })],
        }),
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    await mounted.screen.getByLabelText("settings.customApiModelName").fill("Changed Model");
    expect(saveButton).toBeDisabled();
    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    await expect.poll(() => saveButton).toBeEnabled();
    await saveButton.click();
    await expect
      .poll(() => saveCustom)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ serviceId: null, displayName: "Custom Service" }),
          credential: { type: "stored_key", apiKey: "browser-secret" },
        }),
      );
    expect(document.body.textContent).not.toContain("browser-secret");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("gets model identities from the provider without guessing their capabilities", async () => {
    const discoverCustom = vi.fn(async () => ({
      state: "success" as const,
      models: [
        { modelId: "provider-model-a", displayName: "Provider Model A" },
        { modelId: "provider-model-b", displayName: "Provider Model B" },
      ],
      errorCode: null,
    }));
    const testCustom = vi.fn(async ({ config }) => ({
      state: "success" as const,
      models: config.models.map((model: OmniMindCustomModelServiceModelInput) => ({
        modelId: model.modelId,
        displayName: model.displayName ?? model.modelId,
        available: true,
        reasoning: false,
        input: ["text" as const],
        contextWindow: 128_000,
        maxTokens: 16_384,
      })),
      errorCode: null,
    }));
    const saveCustom = vi.fn(async () => ({
      state: "complete" as const,
      service: service({
        serviceId: "saved-basic",
        providerId: "saved-basic",
        displayName: "Custom Service",
        origin: "models_json",
      }),
    }));
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [],
        customApiConfiguration: {
          protocols: [
            "openai-completions",
            "openai-responses",
            "anthropic-messages",
            "google-generative-ai",
          ],
        },
        errorCode: null,
      }),
      discoverCustom,
      testCustom,
      saveCustom,
    });

    await mounted.screen.getByRole("button", { name: "settings.addModelService" }).click();
    await mounted.screen.getByRole("button", { name: /settings\.connectByApiAddress/ }).click();
    await mounted.screen.getByLabelText("settings.customApiConnectionName").fill("Custom Service");
    await mounted.screen
      .getByLabelText("settings.customApiEndpoint")
      .fill("https://api.example.test/v1");
    await mounted.screen.getByLabelText("settings.customApiKey").fill("browser-secret");

    await mounted.screen.getByRole("button", { name: "settings.customApiDiscoverModels" }).click();
    expect(discoverCustom).not.toHaveBeenCalled();
    await mounted.screen
      .getByLabelText("settings.customApiDiscoveryRiskTitle")
      .getByRole("button", { name: "common.cancel" })
      .click();
    expect(discoverCustom).not.toHaveBeenCalled();

    await mounted.screen.getByRole("button", { name: "settings.customApiDiscoverModels" }).click();
    await confirmCustomApiRisk(mounted.screen, "discover");
    await expect
      .poll(() => discoverCustom)
      .toHaveBeenCalledWith(
        {
          config: {
            serviceId: null,
            displayName: "Custom Service",
            api: "openai-completions",
            baseUrl: "https://api.example.test/v1",
          },
          credential: { type: "stored_key", apiKey: "browser-secret" },
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    expect(document.body.textContent).toContain("Provider Model A");
    expect(document.body.textContent).toContain("Provider Model B");
    expect(document.body.textContent).not.toContain("browser-secret");

    await mounted.screen.getByRole("checkbox", { name: /Provider Model B/ }).click();
    await mounted.screen
      .getByRole("button", { name: "settings.customApiAddSelectedModels" })
      .click();
    expect(mounted.screen.getByLabelText("settings.customApiModelId")).toHaveValue(
      "provider-model-a",
    );
    expect(mounted.screen.getByLabelText("settings.customApiModelName")).toHaveValue(
      "Provider Model A",
    );
    expect(mounted.screen.getByLabelText("settings.customApiContextWindow")).toHaveValue(null);
    expect(mounted.screen.getByLabelText("settings.customApiMaxTokens")).toHaveValue(null);
    expect(
      mounted.screen.getByRole("button", { name: "settings.customApiAddModel" }),
    ).toBeVisible();

    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    await confirmCustomApiRisk(mounted.screen);
    await expect
      .poll(() => testCustom)
      .toHaveBeenCalledWith(
        {
          config: {
            serviceId: null,
            displayName: "Custom Service",
            api: "openai-completions",
            baseUrl: "https://api.example.test/v1",
            models: [{ modelId: "provider-model-a", displayName: "Provider Model A" }],
          },
          credential: { type: "stored_key", apiKey: "browser-secret" },
          testModelId: "provider-model-a",
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    const saveButton = mounted.screen.getByRole("button", { name: "settings.customApiSave" });
    await expect.poll(() => saveButton).toBeEnabled();
    await saveButton.click();
    await expect
      .poll(() => saveCustom)
      .toHaveBeenCalledWith({
        config: {
          serviceId: null,
          displayName: "Custom Service",
          api: "openai-completions",
          baseUrl: "https://api.example.test/v1",
          models: [{ modelId: "provider-model-a", displayName: "Provider Model A" }],
        },
        credential: { type: "stored_key", apiKey: "browser-secret" },
      });

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("keeps command credentials in the advanced path and does not repeat endpoint trust on save", async () => {
    const testCustom = vi.fn(async ({ config }) => ({
      state: "success" as const,
      models: config.models.map((model: OmniMindCustomModelServiceModelInput) => ({
        modelId: model.modelId,
        displayName: model.modelId,
        available: true,
        reasoning: false,
        input: ["text" as const],
        contextWindow: 128_000,
        maxTokens: 16_384,
      })),
      errorCode: null,
    }));
    const saveCustom = vi.fn(async () => ({
      state: "complete" as const,
      service: service({ serviceId: "command-service", origin: "models_json" }),
    }));
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [],
        customApiConfiguration: {
          protocols: [
            "openai-completions",
            "openai-responses",
            "anthropic-messages",
            "google-generative-ai",
          ],
        },
        errorCode: null,
      }),
      testCustom,
      saveCustom,
    });

    await mounted.screen.getByRole("button", { name: "settings.addModelService" }).click();
    await mounted.screen.getByRole("button", { name: /settings\.connectByApiAddress/ }).click();
    await mounted.screen.getByLabelText("settings.customApiConnectionName").fill("Command Service");
    await mounted.screen
      .getByLabelText("settings.customApiEndpoint")
      .fill("https://api.example.test/v1");
    await mounted.screen.getByLabelText("settings.customApiModelId").fill("command-model");
    await mounted.screen.getByText("settings.customApiCredentialAdvanced", { exact: true }).click();
    await mounted.screen
      .getByRole("button", { name: "settings.customApiCredentialMethod.command" })
      .click();
    await mounted.screen
      .getByLabelText("settings.customApiCredentialCommand")
      .fill("printf command-key");

    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    expect(document.body.textContent).toContain(
      "settings.customApiCredentialCommandExecutionWarning",
    );
    await confirmCustomApiRisk(mounted.screen);
    await expect
      .poll(() => testCustom)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          credential: { type: "command", command: "printf command-key" },
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    const saveButton = mounted.screen.getByRole("button", { name: "settings.customApiSave" });
    await expect.poll(() => saveButton).toBeEnabled();
    await saveButton.click();
    await expect
      .poll(() => saveCustom)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          credential: { type: "command", command: "printf command-key" },
        }),
      );
    expect(document.body.textContent).not.toContain("settings.customApiSaveRiskTitle");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("cancels an in-flight custom connection test", async () => {
    let observedSignal: AbortSignal | undefined;
    const testCustom = vi.fn(
      (_input, options) =>
        new Promise<{
          state: "cancelled";
          models: [];
          errorCode: "cancelled";
        }>((resolve) => {
          observedSignal = options?.signal;
          options?.signal?.addEventListener(
            "abort",
            () => resolve({ state: "cancelled", models: [], errorCode: "cancelled" }),
            { once: true },
          );
        }),
    );
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [],
        customApiConfiguration: {
          protocols: [
            "openai-completions",
            "openai-responses",
            "anthropic-messages",
            "google-generative-ai",
          ],
        },
        errorCode: null,
      }),
      testCustom,
    });
    await mounted.screen.getByRole("button", { name: "settings.addModelService" }).click();
    await mounted.screen.getByRole("button", { name: /settings\.connectByApiAddress/ }).click();
    await mounted.screen.getByLabelText("settings.customApiConnectionName").fill("Slow Service");
    await mounted.screen
      .getByLabelText("settings.customApiEndpoint")
      .fill("https://api.example.test/v1");
    await mounted.screen.getByLabelText("settings.customApiKey").fill("browser-secret");
    await mounted.screen.getByLabelText("settings.customApiModelId").fill("slow-model");
    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    await confirmCustomApiRisk(mounted.screen);
    await expect.poll(() => testCustom).toHaveBeenCalledTimes(1);
    expect(observedSignal?.aborted).toBe(false);
    await mounted.screen.getByRole("button", { name: "settings.customApiCancelTest" }).click();
    expect(observedSignal?.aborted).toBe(true);
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.customApiTestConnection");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("cancels an in-flight model discovery without reporting an empty catalog", async () => {
    let observedSignal: AbortSignal | undefined;
    const discoverCustom = vi.fn(
      (_input, options) =>
        new Promise<{
          state: "cancelled";
          models: [];
          errorCode: "cancelled";
        }>((resolve) => {
          observedSignal = options?.signal;
          options?.signal?.addEventListener(
            "abort",
            () => resolve({ state: "cancelled", models: [], errorCode: "cancelled" }),
            { once: true },
          );
        }),
    );
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [],
        customApiConfiguration: {
          protocols: [
            "openai-completions",
            "openai-responses",
            "anthropic-messages",
            "google-generative-ai",
          ],
        },
        errorCode: null,
      }),
      discoverCustom,
    });

    await mounted.screen.getByRole("button", { name: "settings.addModelService" }).click();
    await mounted.screen.getByRole("button", { name: /settings\.connectByApiAddress/ }).click();
    await mounted.screen.getByLabelText("settings.customApiConnectionName").fill("Custom Service");
    await mounted.screen
      .getByLabelText("settings.customApiEndpoint")
      .fill("https://api.example.test/v1");
    await mounted.screen.getByLabelText("settings.customApiKey").fill("browser-secret");
    await mounted.screen.getByRole("button", { name: "settings.customApiDiscoverModels" }).click();
    await confirmCustomApiRisk(mounted.screen, "discover");
    await expect.poll(() => discoverCustom).toHaveBeenCalledTimes(1);
    expect(observedSignal?.aborted).toBe(false);
    expect(document.body.textContent).toContain("settings.customApiDiscovering");

    await mounted.screen.getByRole("button", { name: "settings.customApiCancelDiscovery" }).click();
    expect(observedSignal?.aborted).toBe(true);
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.customApiDiscoverModels");
    expect(document.body.textContent).not.toContain(
      "settings.customApiDiscoveryFailed.catalog_unavailable",
    );

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("keeps an unsaved API connection draft across Back and route navigation until confirmed", async () => {
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [],
        customApiConfiguration: {
          protocols: [
            "openai-completions",
            "openai-responses",
            "anthropic-messages",
            "google-generative-ai",
          ],
        },
        errorCode: null,
      }),
    });

    await mounted.screen.getByRole("button", { name: "settings.addModelService" }).click();
    await mounted.screen.getByRole("button", { name: /settings\.connectByApiAddress/ }).click();
    const nameInput = mounted.screen.getByLabelText("settings.customApiConnectionName");
    await nameInput.fill("Unsaved connection");

    await mounted.screen.getByRole("button", { name: "common.back" }).click();
    expect(document.body.textContent).toContain("settings.customApiDiscardTitle");
    await mounted.screen
      .getByLabelText("settings.customApiDiscardTitle")
      .getByRole("button", { name: "settings.customApiKeepEditing" })
      .click();
    expect(nameInput).toHaveValue("Unsaved connection");

    mounted.router.history.push("/next");
    await expect.poll(() => document.body.textContent).toContain("settings.customApiDiscardTitle");
    expect(mounted.router.history.location.pathname).toBe("/");
    await mounted.screen
      .getByLabelText("settings.customApiDiscardTitle")
      .getByRole("button", { name: "settings.customApiDiscardConfirm" })
      .click();
    await expect.poll(() => mounted.router.history.location.pathname).toBe("/next");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("reopens, edits, retests, and deletes a saved API connection without returning its key", async () => {
    const customService = service({
      serviceId: "saved-custom",
      providerId: "saved-custom",
      displayName: "Saved Custom",
      origin: "models_json",
      supportsNetworkRefresh: false,
    });
    const customConfig = {
      serviceId: "saved-custom",
      displayName: "Saved Custom",
      api: "anthropic-messages" as const,
      baseUrl: "https://anthropic.example.test",
      models: [
        {
          modelId: "saved-model",
          displayName: "Saved Model",
          reasoning: true,
          input: ["text", "image"] as const,
          contextWindow: 200_000,
          maxTokens: 16_384,
          cost: {
            input: 0,
            output: 2.5,
            cacheRead: 0.25,
            cacheWrite: 0.5,
            tiers: [
              {
                inputTokensAbove: 0,
                input: 1.25,
                output: 3.5,
                cacheRead: 0.125,
                cacheWrite: 0.75,
              },
            ],
          },
        },
      ],
    };
    const saveCustom = vi.fn(async () => ({ state: "complete" as const, service: customService }));
    let removeAttempts = 0;
    const removeCustom = vi.fn(async ({ serviceId }) => {
      removeAttempts += 1;
      return removeAttempts === 1
        ? ({ state: "blocked_active_operation" as const, serviceId } as const)
        : ({ state: "complete" as const, serviceId } as const);
    });
    const mounted = await renderPanel({
      list: async () => ({
        state: "ready",
        services: [customService],
        connectableServices: [],
        customApiConfiguration: {
          protocols: [
            "openai-completions",
            "openai-responses",
            "anthropic-messages",
            "google-generative-ai",
          ],
        },
        errorCode: null,
      }),
      get: async ({ serviceId }) =>
        serviceId === customService.serviceId
          ? {
              state: "ready",
              service: customService,
              models: [],
              customConfig,
              errorCode: null,
            }
          : { state: "empty", service: null, errorCode: null },
      saveCustom,
      removeCustom,
    });

    await mounted.screen
      .getByRole("button", { name: 'settings.viewDetailsNamed:{"name":"Saved Custom"}' })
      .click();
    await mounted.screen.getByRole("button", { name: "common.edit" }).click();
    expect(mounted.screen.getByLabelText("settings.customApiConnectionName")).toHaveValue(
      "Saved Custom",
    );
    expect(document.body.textContent).toContain("settings.customApiCredentialPreserveDescription");
    expect(document.body.textContent).not.toContain("browser-secret");
    await mounted.screen.getByText("settings.customApiModelAdvanced", { exact: true }).click();
    expect(mounted.screen.getByLabelText("settings.customApiModelCost.input")).toHaveValue(0);
    expect(mounted.screen.getByLabelText("settings.customApiModelCost.output")).toHaveValue(2.5);
    expect(
      mounted.screen.getByLabelText("settings.customApiModelCostTier.inputTokensAbove", {
        exact: true,
      }),
    ).toHaveValue(0);
    expect(
      mounted.screen.getByLabelText("settings.customApiModelCostTier.output", { exact: true }),
    ).toHaveValue(3.5);
    await mounted.screen.getByLabelText("settings.customApiModelPricingMode").click();
    await mounted.screen
      .getByRole("option", { name: "settings.customApiModelPricingNone" })
      .click();
    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    await confirmCustomApiRisk(mounted.screen);
    await expect
      .poll(() => mounted.screen.getByRole("button", { name: "settings.customApiSave" }))
      .toBeEnabled();
    await mounted.screen.getByRole("button", { name: "settings.customApiSave" }).click();
    await expect
      .poll(() => saveCustom)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            serviceId: "saved-custom",
            models: [expect.not.objectContaining({ cost: expect.anything() })],
          }),
          credential: { type: "preserve" },
        }),
      );

    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceDetailsNamed");
    const referencedSelection = {
      provider: "omnimind" as const,
      model: "saved-custom/saved-model",
    };
    useComposerDraftStore.setState((state) => ({
      stickyModelSelectionByProvider: {
        ...state.stickyModelSelectionByProvider,
        omnimind: referencedSelection,
      },
    }));
    useComposerDraftStore.getState().enqueueQueuedTurn(ThreadId.makeUnsafe("queued-reference"), {
      ...makeQueuedChatTurn("queued-custom-service"),
      selectedProvider: "omnimind",
      selectedModel: referencedSelection.model,
      modelSelection: referencedSelection,
    });
    await mounted.screen.getByRole("button", { name: "common.delete" }).click();
    const deleteDialog = mounted.screen.getByLabelText("settings.customApiDeleteTitle");
    expect(deleteDialog.element().textContent).toContain(
      'settings.customApiDeleteReferences:{"count":2}',
    );
    expect(deleteDialog.element().textContent).toContain(
      'settings.customApiDeleteDescriptionStored:{"name":"Saved Custom"}',
    );
    await deleteDialog.getByRole("button", { name: "common.delete" }).click();
    await expect.poll(() => removeCustom).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("settings.customApiRemoveBlockedActive");
    expect(mounted.screen.getByLabelText("settings.customApiDeleteTitle")).toBeVisible();
    await mounted.screen
      .getByLabelText("settings.customApiDeleteTitle")
      .getByRole("button", { name: "common.delete" })
      .click();
    await expect.poll(() => removeCustom).toHaveBeenCalledTimes(2);
    expect(removeCustom).toHaveBeenLastCalledWith({ serviceId: "saved-custom" });
    expect(useComposerDraftStore.getState().stickyModelSelectionByProvider.omnimind).toEqual(
      referencedSelection,
    );

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("aborts an in-flight projection when the active panel unmounts", async () => {
    let observedSignal: AbortSignal | undefined;
    const mounted = await renderPanel({
      list: (_input, options) => {
        observedSignal = options?.signal;
        return new Promise<OmniMindModelServicesListResult>(() => undefined);
      },
    });

    await expect.poll(() => observedSignal).toBeInstanceOf(AbortSignal);
    await mounted.screen.unmount();
    await expect.poll(() => observedSignal?.aborted).toBe(true);
    mounted.queryClient.clear();
  });

  it("does not call an older Server that lacks the optional Model services capability", async () => {
    const mounted = await renderPanel({
      supported: false,
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [],
        errorCode: null,
      }),
    });

    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServicesServerUpdateRequired");
    expect(mounted.calls.list).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("settings.modelServicesUnavailable");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("shows a recoverable read failure instead of an empty or connected state", async () => {
    const mounted = await renderPanel({
      list: async () => {
        throw new Error("transport unavailable");
      },
    });

    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServicesConnectionUnavailable");
    expect(document.body.textContent).not.toContain("settings.noModelServices");
    expect(document.body.textContent).not.toContain("settings.modelServiceConfigured");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("keeps a typed local projection failure distinct from a transport failure", async () => {
    const mounted = await renderPanel({
      list: async () => ({
        state: "error",
        services: [],
        connectableServices: [],
        errorCode: "projection_unavailable",
      }),
    });

    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServicesUnavailable");
    expect(document.body.textContent).not.toContain("settings.modelServicesConnectionUnavailable");
    expect(document.body.textContent).not.toContain("settings.noModelServices");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("shows configured and stale facts, then loads the selected service detail", async () => {
    const staleService = service({
      origin: "models_json",
      catalogState: "stale",
      catalogErrorCode: "catalog_unavailable",
    });
    const mounted = await renderPanel({
      list: async () => ({
        state: "ready",
        services: [staleService],
        connectableServices: [],
        errorCode: null,
      }),
      get: async ({ serviceId }) =>
        serviceId === staleService.serviceId
          ? { state: "ready", service: staleService, errorCode: null }
          : { state: "empty", service: null, errorCode: null },
    });

    await expect.poll(() => document.body.textContent).toContain("DeepSeek");
    expect(document.body.textContent).toContain("settings.modelServiceConfigured");
    expect(document.body.textContent).toContain("settings.modelServiceCatalogStale");

    await mounted.screen
      .getByRole("button", {
        name: 'settings.viewDetailsNamed:{"name":"DeepSeek"}',
      })
      .click();

    await expect
      .poll(() => mounted.calls.get)
      .toHaveBeenCalledWith(
        { serviceId: staleService.serviceId },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceAuthentication");
    expect(document.body.textContent).toContain("settings.modelServiceAuthMethodApiKey");
    expect(document.body.textContent).not.toContain("DeepSeek API key");
    expect(document.body.textContent).toContain("settings.modelServiceOriginModelsJson");
    expect(document.body.textContent).toContain("settings.modelServiceSupportsRefresh");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("sends API-key prompts only to Pi and clears the secret after completion", async () => {
    const setupService = service({
      authState: "setup_required",
      authSource: null,
      storedCredentialType: null,
      availableModelCount: 0,
    });
    const configuredService = service();
    const requestId = "00000000-0000-4000-8000-000000000011";
    const promptId = "00000000-0000-4000-8000-000000000012";
    const beginLogin = vi.fn(async () => ({
      state: "prompt" as const,
      requestId,
      prompt: {
        promptId,
        type: "secret" as const,
        message: "Enter DeepSeek API key",
        placeholder: "API key",
      },
      events: [],
    }));
    const answerLogin = vi.fn(async () => ({
      state: "complete" as const,
      requestId,
      service: configuredService,
      events: [],
    }));
    const mounted = await renderPanel({
      list: async () => ({
        state: "ready",
        services: [setupService],
        connectableServices: [],
        errorCode: null,
      }),
      get: async () => ({ state: "ready", service: setupService, errorCode: null }),
      beginLogin,
      answerLogin,
    });

    await mounted.screen
      .getByRole("button", { name: 'settings.viewDetailsNamed:{"name":"DeepSeek"}' })
      .click();
    await mounted.screen.getByRole("button", { name: "settings.addApiKey" }).click();
    const secretInput = mounted.screen.getByLabelText("settings.modelServicePromptSecret");
    await secretInput.fill("browser-test-secret");
    await mounted.screen.getByRole("button", { name: "settings.modelServiceContinue" }).click();

    await expect
      .poll(() => answerLogin)
      .toHaveBeenCalledWith(
        { requestId, promptId, value: "browser-test-secret" },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    expect(beginLogin).toHaveBeenCalledWith(
      { serviceId: "deepseek", authType: "api_key" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await expect.poll(() => document.body.textContent).toContain("settings.modelServiceAuthSaved");
    expect(document.body.textContent).not.toContain("browser-test-secret");
    expect(document.querySelector('input[type="password"]')).toBeNull();

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("cancels a prompt request when Model services is deactivated", async () => {
    const setupService = service({
      authState: "setup_required",
      authSource: null,
      storedCredentialType: null,
      availableModelCount: 0,
    });
    const requestId = "00000000-0000-4000-8000-000000000021";
    const beginLogin = vi.fn(async () => ({
      state: "prompt" as const,
      requestId,
      prompt: {
        promptId: "00000000-0000-4000-8000-000000000022",
        type: "secret" as const,
        message: "Enter DeepSeek API key",
      },
      events: [],
    }));
    const cancelLogin = vi.fn(async () => ({
      state: "cancelled" as const,
      requestId,
      errorCode: "cancelled" as const,
      events: [],
    }));
    const mounted = await renderPanel({
      list: async () => ({
        state: "ready",
        services: [setupService],
        connectableServices: [],
        errorCode: null,
      }),
      get: async () => ({ state: "ready", service: setupService, errorCode: null }),
      beginLogin,
      cancelLogin,
    });

    await mounted.screen
      .getByRole("button", { name: 'settings.viewDetailsNamed:{"name":"DeepSeek"}' })
      .click();
    await mounted.screen.getByRole("button", { name: "settings.addApiKey" }).click();
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServicePromptSecret");

    await mounted.rerenderActive(false);

    await expect.poll(() => cancelLogin).toHaveBeenCalledWith({ requestId });
    expect(document.body.textContent?.trim()).toBe("");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("aborts and cancels a pending OAuth request when Model services is deactivated", async () => {
    const oauthService = service({
      serviceId: "openai-codex",
      providerId: "openai-codex",
      displayName: "OpenAI Codex",
      authMethods: [
        { type: "oauth", label: "Sign in with ChatGPT", canLogin: true, subscription: true },
      ],
      authState: "setup_required",
      authSource: null,
      storedCredentialType: null,
      availableModelCount: 0,
    });
    const requestId = "00000000-0000-4000-8000-000000000025";
    const beginLogin = vi.fn(async () => ({
      state: "pending" as const,
      requestId,
      events: [
        {
          type: "device_code" as const,
          userCode: "ABCD-EFGH",
          verificationUri: "https://auth.example.test/device",
        },
      ],
    }));
    const pollLogin = vi.fn(
      (
        _input: Parameters<NativeApi["omnimindModelServices"]["pollLogin"]>[0],
        options?: Parameters<NativeApi["omnimindModelServices"]["pollLogin"]>[1],
      ) =>
        new Promise<never>((_resolve, reject) => {
          const signal = options?.signal;
          const rejectAbort = () => reject(new DOMException("Aborted", "AbortError"));
          if (signal?.aborted) rejectAbort();
          else signal?.addEventListener("abort", rejectAbort, { once: true });
        }),
    );
    const cancelLogin = vi.fn(async () => ({
      state: "cancelled" as const,
      requestId,
      errorCode: "cancelled" as const,
      events: [],
    }));
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [oauthService],
        errorCode: null,
      }),
      get: async () => ({ state: "ready", service: oauthService, errorCode: null }),
      beginLogin,
      pollLogin,
      cancelLogin,
    });

    await openConnectableService(mounted.screen, "OpenAI Codex");
    await mounted.screen.getByRole("button", { name: "settings.signInWithBrowser" }).click();
    await expect.poll(() => pollLogin).toHaveBeenCalled();
    const pollSignal = pollLogin.mock.calls[0]?.[1]?.signal;

    await mounted.rerenderActive(false);

    await expect.poll(() => cancelLogin).toHaveBeenCalledWith({ requestId });
    expect(pollSignal?.aborted).toBe(true);
    expect(document.body.textContent?.trim()).toBe("");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("renders provider-owned OAuth events, opens only the projected host, and completes manual code", async () => {
    const oauthService = service({
      serviceId: "openai-codex",
      providerId: "openai-codex",
      displayName: "OpenAI Codex",
      authMethods: [
        { type: "oauth", label: "Sign in with ChatGPT", canLogin: true, subscription: true },
      ],
      authState: "setup_required",
      authSource: null,
      storedCredentialType: null,
      availableModelCount: 0,
    });
    const configuredService = {
      ...oauthService,
      authState: "configured" as const,
      authSource: "stored" as const,
      storedCredentialType: "oauth" as const,
      availableModelCount: 2,
    };
    const requestId = "00000000-0000-4000-8000-000000000031";
    const promptId = "00000000-0000-4000-8000-000000000032";
    const authUrl = "https://auth.example.test/oauth/authorize?opaque=redacted";
    const beginLogin = vi.fn(async () => ({
      state: "pending" as const,
      requestId,
      events: [{ type: "auth_url" as const, url: authUrl, instructions: "Continue sign-in" }],
    }));
    let pollCount = 0;
    const pollLogin = vi.fn(
      (
        _input: Parameters<NativeApi["omnimindModelServices"]["pollLogin"]>[0],
        options?: Parameters<NativeApi["omnimindModelServices"]["pollLogin"]>[1],
      ) => {
        pollCount += 1;
        if (pollCount === 1) {
          return Promise.resolve({
            state: "prompt" as const,
            requestId,
            prompt: {
              promptId,
              type: "manual_code" as const,
              message: "Paste the authorization code",
            },
            events: [{ type: "auth_url" as const, url: authUrl, instructions: "Continue sign-in" }],
          });
        }
        return new Promise<never>((_resolve, reject) => {
          const signal = options?.signal;
          const rejectAbort = () => reject(new DOMException("Aborted", "AbortError"));
          if (signal?.aborted) rejectAbort();
          else signal?.addEventListener("abort", rejectAbort, { once: true });
        });
      },
    );
    const answerLogin = vi.fn(async () => ({
      state: "complete" as const,
      requestId,
      service: configuredService,
      events: [],
    }));
    const openExternal = vi.fn(async () => {});
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [oauthService],
        errorCode: null,
      }),
      get: async () => ({ state: "ready", service: oauthService, errorCode: null }),
      beginLogin,
      pollLogin,
      answerLogin,
      openExternal,
    });

    await openConnectableService(mounted.screen, "OpenAI Codex");
    await mounted.screen.getByRole("button", { name: "settings.signInWithBrowser" }).click();
    await expect
      .poll(() => mounted.screen.getByRole("button", { name: /auth\.example\.test/u }))
      .toBeTruthy();
    await expect.poll(() => openExternal).toHaveBeenCalledWith(authUrl);
    expect(beginLogin).toHaveBeenCalledWith(
      { serviceId: "openai-codex", authType: "oauth", promptMode: "provider_default" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(pollLogin).toHaveBeenCalledWith(
      { requestId, afterEventCount: 1 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(pollLogin).toHaveBeenCalledWith(
      { requestId, afterEventCount: 1, afterPromptId: promptId },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(document.body.textContent).toContain("settings.modelServiceOpenOAuth");
    expect(document.body.textContent).toContain("settings.modelServiceProviderDetails");
    const codeInput = mounted.screen.getByLabelText("settings.modelServicePromptManualCode");
    await codeInput.fill("browser-test-code");
    await mounted.screen.getByRole("button", { name: "settings.modelServiceContinue" }).click();
    await expect
      .poll(() => answerLogin)
      .toHaveBeenCalledWith(
        { requestId, promptId, value: "browser-test-code" },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    await expect.poll(() => document.body.textContent).toContain("settings.modelServiceOAuthSaved");
    expect(document.body.textContent).not.toContain("browser-test-code");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("finishes browser login while the manual callback fallback remains visible", async () => {
    const oauthService = service({
      serviceId: "openai-codex",
      providerId: "openai-codex",
      displayName: "OpenAI Codex",
      authMethods: [
        { type: "oauth", label: "Sign in with ChatGPT", canLogin: true, subscription: true },
      ],
      authState: "setup_required",
      authSource: null,
      storedCredentialType: null,
      availableModelCount: 0,
    });
    const configuredService = {
      ...oauthService,
      authState: "configured" as const,
      authSource: "stored" as const,
      storedCredentialType: "oauth" as const,
      availableModelCount: 2,
    };
    const requestId = "00000000-0000-4000-8000-000000000035";
    const promptId = "00000000-0000-4000-8000-000000000036";
    const authUrl = "https://auth.example.test/oauth/authorize?opaque=redacted";
    let finishBrowserLogin!: (result: OmniMindModelServiceAuthResult) => void;
    const pollLogin = vi.fn(
      () =>
        new Promise<OmniMindModelServiceAuthResult>((resolve) => {
          finishBrowserLogin = resolve;
        }),
    );
    const openExternal = vi.fn(async () => {});
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [oauthService],
        errorCode: null,
      }),
      get: async () => ({ state: "ready", service: oauthService, errorCode: null }),
      beginLogin: async () => ({
        state: "prompt",
        requestId,
        prompt: {
          promptId,
          type: "manual_code",
          message: "Paste the authorization code",
        },
        events: [{ type: "auth_url", url: authUrl, instructions: "Continue sign-in" }],
      }),
      pollLogin,
      answerLogin: async () => {
        throw new Error("Browser completion must not submit the manual fallback");
      },
      openExternal,
    });

    await openConnectableService(mounted.screen, "OpenAI Codex");
    await mounted.screen.getByRole("button", { name: "settings.signInWithBrowser" }).click();
    await expect.poll(() => openExternal).toHaveBeenCalledWith(authUrl);
    await expect
      .poll(() => pollLogin)
      .toHaveBeenCalledWith(
        { requestId, afterEventCount: 1, afterPromptId: promptId },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    expect(mounted.screen.getByLabelText("settings.modelServicePromptManualCode")).toBeTruthy();

    finishBrowserLogin({
      state: "complete",
      requestId,
      service: configuredService,
      events: [],
    });

    await expect.poll(() => document.body.textContent).toContain("settings.modelServiceOAuthSaved");
    expect(mounted.calls.answerLogin).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("settings.modelServiceAuthExpired");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("keeps provider-owned device login available behind the one-click browser path", async () => {
    const oauthService = service({
      serviceId: "openai-codex",
      providerId: "openai-codex",
      displayName: "OpenAI Codex",
      authMethods: [
        { type: "oauth", label: "Sign in with ChatGPT", canLogin: true, subscription: true },
      ],
      authState: "setup_required",
      authSource: null,
      storedCredentialType: null,
      availableModelCount: 0,
    });
    const browserRequestId = "00000000-0000-4000-8000-000000000041";
    const choiceRequestId = "00000000-0000-4000-8000-000000000042";
    const browserPromptId = "00000000-0000-4000-8000-000000000043";
    const choicePromptId = "00000000-0000-4000-8000-000000000044";
    const beginLogin = vi
      .fn()
      .mockResolvedValueOnce({
        state: "prompt" as const,
        requestId: browserRequestId,
        prompt: {
          promptId: browserPromptId,
          type: "manual_code" as const,
          message: "Paste the browser callback",
        },
        events: [],
      })
      .mockResolvedValueOnce({
        state: "prompt" as const,
        requestId: choiceRequestId,
        prompt: {
          promptId: choicePromptId,
          type: "select" as const,
          message: "Choose a login method",
          options: [
            { id: "browser", label: "Browser login" },
            { id: "device_code", label: "Device code login" },
          ],
        },
        events: [],
      });
    const pollLogin = vi.fn(
      (
        _input: Parameters<NativeApi["omnimindModelServices"]["pollLogin"]>[0],
        options?: Parameters<NativeApi["omnimindModelServices"]["pollLogin"]>[1],
      ) =>
        new Promise<never>((_resolve, reject) => {
          const signal = options?.signal;
          const rejectAbort = () => reject(new DOMException("Aborted", "AbortError"));
          if (signal?.aborted) rejectAbort();
          else signal?.addEventListener("abort", rejectAbort, { once: true });
        }),
    );
    const answerLogin = vi.fn(async () => ({
      state: "pending" as const,
      requestId: choiceRequestId,
      events: [
        {
          type: "device_code" as const,
          userCode: "ABCD-EFGH",
          verificationUri: "https://auth.example.test/device",
        },
      ],
    }));
    const cancelLogin = vi.fn(async ({ requestId }: { readonly requestId: string }) => ({
      state: "cancelled" as const,
      requestId,
      errorCode: "cancelled" as const,
      events: [],
    }));
    const openExternal = vi.fn(async () => {});
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [oauthService],
        errorCode: null,
      }),
      get: async () => ({ state: "ready", service: oauthService, errorCode: null }),
      beginLogin,
      pollLogin,
      answerLogin,
      cancelLogin,
      openExternal,
    });

    await openConnectableService(mounted.screen, "OpenAI Codex");
    await mounted.screen.getByRole("button", { name: "settings.signInWithBrowser" }).click();
    await mounted.screen
      .getByRole("button", { name: "settings.modelServiceOtherSignInOptions" })
      .click();
    await expect
      .poll(() => beginLogin)
      .toHaveBeenLastCalledWith(
        { serviceId: "openai-codex", authType: "oauth", promptMode: "interactive" },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    await mounted.screen.getByLabelText("settings.modelServicePromptSelect").click();
    await mounted.screen.getByText("Device code login").click();
    await mounted.screen.getByRole("button", { name: "settings.modelServiceContinue" }).click();
    await expect
      .poll(() => answerLogin)
      .toHaveBeenCalledWith(
        { requestId: choiceRequestId, promptId: choicePromptId, value: "device_code" },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    await expect.poll(() => openExternal).toHaveBeenCalledWith("https://auth.example.test/device");
    expect(cancelLogin).toHaveBeenCalledWith({ requestId: browserRequestId });

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("refreshes only the selected service and confirms stored-key removal", async () => {
    const configuredService = service();
    const refresh = vi.fn(async () => ({
      state: "success" as const,
      service: configuredService,
    }));
    const logout = vi.fn(async () => ({
      state: "complete" as const,
      service: service({
        authState: "setup_required",
        authSource: null,
        storedCredentialType: null,
        availableModelCount: 0,
      }),
    }));
    const mounted = await renderPanel({
      list: async () => ({
        state: "ready",
        services: [configuredService],
        connectableServices: [],
        errorCode: null,
      }),
      get: async () => ({ state: "ready", service: configuredService, errorCode: null }),
      refresh,
      logout,
    });

    await mounted.screen
      .getByRole("button", { name: 'settings.viewDetailsNamed:{"name":"DeepSeek"}' })
      .click();
    await mounted.screen.getByRole("button", { name: "settings.refreshModelCatalog" }).click();
    await expect.poll(() => refresh).toHaveBeenCalledWith({ serviceId: "deepseek" });
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceRefreshComplete");

    await mounted.screen.getByRole("button", { name: "settings.removeApiKey" }).click();
    await expect
      .element(mounted.screen.getByText('settings.removeApiKeyDescription:{"name":"DeepSeek"}'))
      .toBeVisible();
    const removeButtons = mounted.screen.getByRole("button", { name: "settings.removeApiKey" });
    await removeButtons.last().click();
    await expect.poll(() => logout).toHaveBeenCalledWith({ serviceId: "deepseek" });
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceCredentialRemoved");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("does not invent credential or refresh actions for a static service", async () => {
    const staticService = service({
      authMethods: [
        { type: "api_key", label: "Environment API key", canLogin: false, subscription: false },
      ],
      authState: "configured",
      authSource: "environment",
      storedCredentialType: null,
      supportsNetworkRefresh: false,
    });
    const mounted = await renderPanel({
      list: async () => ({
        state: "ready",
        services: [staticService],
        connectableServices: [],
        errorCode: null,
      }),
      get: async () => ({ state: "ready", service: staticService, errorCode: null }),
    });

    await mounted.screen
      .getByRole("button", { name: 'settings.viewDetailsNamed:{"name":"DeepSeek"}' })
      .click();
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceStaticCatalog");
    expect(document.body.textContent).not.toContain("settings.addApiKey");
    expect(document.body.textContent).not.toContain("settings.replaceApiKey");
    expect(document.body.textContent).not.toContain("settings.removeApiKey");
    expect(document.body.textContent).not.toContain("settings.refreshModelCatalog");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("distinguishes duplicate service instances and exposes refresh-required auth", async () => {
    const primary = service({
      serviceId: "deepseek-primary",
      providerId: "deepseek-primary",
      displayName: "DeepSeek",
      authState: "refresh_required",
      storedCredentialType: "oauth",
      availableModelCount: 0,
    });
    const secondary = service({
      serviceId: "deepseek-backup",
      providerId: "deepseek-backup",
      displayName: "DeepSeek",
    });
    const mounted = await renderPanel({
      list: async () => ({
        state: "ready",
        services: [primary, secondary],
        connectableServices: [],
        errorCode: null,
      }),
    });

    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceInstanceNamed");
    expect(document.body.textContent).not.toContain("deepseek-primary");
    expect(document.body.textContent).not.toContain("deepseek-backup");
    expect(new Set(document.body.textContent?.match(/#[0-9A-F]{6}/gu) ?? []).size).toBe(2);
    expect(document.body.textContent).toContain("settings.modelServiceRefreshRequired");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("keeps independent Engine model editing out of Model services", async () => {
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [],
        errorCode: null,
      }),
    });

    await expect.poll(() => document.body.textContent).toContain("settings.noModelServices");
    expect(document.body.textContent).not.toContain("settings.reviewAction");
    expect(document.querySelector('[aria-label="settings.engineModelSlug"]')).toBeNull();
    expect(document.querySelector('[aria-label="settings.engineModelProvider"]')).toBeNull();

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });
});
