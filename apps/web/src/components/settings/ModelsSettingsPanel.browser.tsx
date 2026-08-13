// FILE: ModelsSettingsPanel.browser.tsx
// Purpose: Proves Model services remains side-effect gated and renders honest projection states.
// Layer: Browser UI test

import "../../index.css";

import type {
  NativeApi,
  OmniMindCustomModelServiceModelInput,
  OmniMindModelServiceAuthResult,
  OmniMindModelServiceDescriptor,
  OmniMindModelServicesGetResult,
  OmniMindModelServicesListResult,
} from "@omnimind/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { AppSettingsSchema } from "~/appSettings";
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
  const testCustom = vi.fn(
    input.testCustom ??
      (async ({ config }) => ({
        state: "success",
        models: config.models.map((model: OmniMindCustomModelServiceModelInput) => ({
          modelId: model.modelId,
          displayName: model.displayName,
          available: true,
          reasoning: model.reasoning,
          input: [...model.input],
          contextWindow: model.contextWindow,
          maxTokens: model.maxTokens,
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
    testCustom,
    saveCustom,
    removeCustom,
    openExternal,
  };
}

async function renderPanel(input: {
  readonly active?: boolean;
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
  readonly testCustom?: NativeApi["omnimindModelServices"]["testCustom"];
  readonly saveCustom?: NativeApi["omnimindModelServices"]["saveCustom"];
  readonly removeCustom?: NativeApi["omnimindModelServices"]["removeCustom"];
  readonly openExternal?: NativeApi["shell"]["openExternal"];
}) {
  const calls = setNativeApi(input);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (input.primeServerConfig !== false) {
    queryClient.setQueryData(serverQueryKeys.config(), createBrowserTestServerConfig(checkedAt));
  }
  const view = (active: boolean) => (
    <QueryClientProvider client={queryClient}>
      <ModelsSettingsPanel
        active={active}
        resetEpoch={0}
        settings={settings}
        defaults={settings}
        updateSettings={() => {}}
      />
    </QueryClientProvider>
  );
  const screen = await render(view(input.active ?? true));
  return {
    calls,
    queryClient,
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

afterEach(() => {
  delete window.nativeApi;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("ModelsSettingsPanel model services", () => {
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
    const search = mounted.screen.getByRole("textbox", { name: "settings.searchModelServices" });
    await search.fill("deepseek");
    expect(document.body.textContent).toContain("DeepSeek");
    expect(document.body.textContent).not.toContain("Service 39");
    expect(
      mounted.screen.getByRole("button", { name: "settings.connectByApiAddress" }).query(),
    ).toBeNull();

    const connectButton = mounted.screen.getByRole("button", {
      name: 'settings.connectModelServiceNamed:{"name":"DeepSeek"}',
    });
    connectButton.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceAuthentication");
    expect(document.body.textContent).toContain("DeepSeek V4 Flash");
    expect(document.body.textContent).toContain("DeepSeek V4 Pro");
    expect(document.body.textContent).toContain("settings.modelServiceModelThinking");
    expect(document.body.textContent).toContain("settings.modelServiceModelImages");
    expect(document.body.textContent).not.toContain("settings.searchModelServices");

    await mounted.screen.getByRole("button", { name: "common.back" }).click();
    expect(
      mounted.screen.getByRole("textbox", { name: "settings.searchModelServices" }),
    ).toHaveValue("deepseek");
    expect(document.body.textContent).toContain("DeepSeek");

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
        displayName: model.displayName,
        available: true,
        reasoning: model.reasoning,
        input: [...model.input],
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
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
    await apiEntry.click();

    await mounted.screen.getByLabelText("settings.customApiConnectionName").fill("Custom Service");
    await mounted.screen
      .getByLabelText("settings.customApiEndpoint")
      .fill("https://api.example.test/v1");
    await mounted.screen.getByLabelText("settings.customApiKey").fill("browser-secret");
    await mounted.screen.getByLabelText("settings.customApiModelId").fill("custom-model");
    await mounted.screen.getByLabelText("settings.customApiModelName").fill("Custom Model");
    await mounted.screen.getByLabelText("settings.customApiContextWindow").fill("128000");
    await mounted.screen.getByLabelText("settings.customApiMaxTokens").fill("8192");

    const saveButton = mounted.screen.getByRole("button", { name: "settings.customApiSave" });
    expect(saveButton).toBeDisabled();
    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    await expect
      .poll(() => testCustom)
      .toHaveBeenCalledWith(
        {
          config: {
            serviceId: null,
            displayName: "Custom Service",
            api: "openai-completions",
            baseUrl: "https://api.example.test/v1",
            models: [
              {
                modelId: "custom-model",
                displayName: "Custom Model",
                reasoning: false,
                input: ["text"],
                contextWindow: 128_000,
                maxTokens: 8_192,
              },
            ],
          },
          apiKey: "browser-secret",
          testModelId: "custom-model",
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    await expect.poll(() => document.body.textContent).toContain("settings.customApiTestSucceeded");
    expect(saveButton).toBeEnabled();

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
          apiKey: "browser-secret",
        }),
      );
    expect(document.body.textContent).not.toContain("browser-secret");

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
        },
      ],
    };
    const saveCustom = vi.fn(async () => ({ state: "complete" as const, service: customService }));
    const removeCustom = vi.fn(async ({ serviceId }) => ({
      state: "complete" as const,
      serviceId,
    }));
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
    expect(mounted.screen.getByLabelText("settings.customApiKey")).toHaveValue("");
    expect(document.body.textContent).not.toContain("browser-secret");
    await mounted.screen.getByRole("button", { name: "settings.customApiTestConnection" }).click();
    await mounted.screen.getByRole("button", { name: "settings.customApiSave" }).click();
    await expect
      .poll(() => saveCustom)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ serviceId: "saved-custom" }),
          apiKey: null,
        }),
      );

    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceDetailsNamed");
    await mounted.screen.getByRole("button", { name: "common.delete" }).click();
    await mounted.screen
      .getByLabelText("settings.customApiDeleteTitle")
      .getByRole("button", { name: "common.delete" })
      .click();
    await expect.poll(() => removeCustom).toHaveBeenCalledWith({ serviceId: "saved-custom" });

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
    expect(document.body.textContent).toContain("DeepSeek API key");
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

    await expect.poll(() => document.body.textContent).toContain("deepseek-primary");
    expect(document.body.textContent).toContain("deepseek-backup");
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
