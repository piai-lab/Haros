// FILE: ModelsSettingsPanel.browser.tsx
// Purpose: Proves Model services remains side-effect gated and renders honest projection states.
// Layer: Browser UI test

import "../../index.css";

import type {
  NativeApi,
  OmniMindModelServiceAuthResult,
  OmniMindModelServiceDescriptor,
  OmniMindModelServicesGetResult,
  OmniMindModelServicesListResult,
} from "@omnimind/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    input?: Record<string, never>,
    options?: { readonly signal?: AbortSignal },
  ) => Promise<OmniMindModelServicesListResult>;
  readonly get?: (
    input: { readonly serviceId: string },
    options?: { readonly signal?: AbortSignal },
  ) => Promise<OmniMindModelServicesGetResult>;
  readonly supported?: boolean;
  readonly beginLogin?: NativeApi["omnimindModelServices"]["beginLogin"];
  readonly pollLogin?: NativeApi["omnimindModelServices"]["pollLogin"];
  readonly answerLogin?: NativeApi["omnimindModelServices"]["answerLogin"];
  readonly cancelLogin?: NativeApi["omnimindModelServices"]["cancelLogin"];
  readonly logout?: NativeApi["omnimindModelServices"]["logout"];
  readonly refresh?: NativeApi["omnimindModelServices"]["refresh"];
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
    openExternal,
  };
}

async function renderPanel(input: {
  readonly active?: boolean;
  readonly list: (
    input?: Record<string, never>,
    options?: { readonly signal?: AbortSignal },
  ) => Promise<OmniMindModelServicesListResult>;
  readonly get?: (
    input: { readonly serviceId: string },
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
    expect(document.body.textContent).toContain("settings.connectableModelServices");
    await mounted.screen
      .getByRole("button", { name: 'settings.connectModelServiceNamed:{"name":"DeepSeek"}' })
      .click();
    await expect
      .poll(() => mounted.calls.get)
      .toHaveBeenCalledWith(
        { serviceId: "deepseek" },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    await expect
      .poll(() => document.body.textContent)
      .toContain("settings.modelServiceAuthentication");
    expect(mounted.screen.getByRole("button", { name: "settings.addApiKey" })).toBeTruthy();

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
    const secretInput = mounted.screen.getByLabelText("Enter DeepSeek API key");
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
    await expect.poll(() => document.body.textContent).toContain("Enter DeepSeek API key");

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

    await mounted.screen
      .getByRole("button", { name: 'settings.connectModelServiceNamed:{"name":"OpenAI Codex"}' })
      .click();
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

    await mounted.screen
      .getByRole("button", { name: 'settings.connectModelServiceNamed:{"name":"OpenAI Codex"}' })
      .click();
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
    const codeInput = mounted.screen.getByLabelText("Paste the authorization code");
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

    await mounted.screen
      .getByRole("button", { name: 'settings.connectModelServiceNamed:{"name":"OpenAI Codex"}' })
      .click();
    await mounted.screen.getByRole("button", { name: "settings.signInWithBrowser" }).click();
    await expect.poll(() => openExternal).toHaveBeenCalledWith(authUrl);
    await expect
      .poll(() => pollLogin)
      .toHaveBeenCalledWith(
        { requestId, afterEventCount: 1, afterPromptId: promptId },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    expect(mounted.screen.getByLabelText("Paste the authorization code")).toBeTruthy();

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

    await mounted.screen
      .getByRole("button", { name: 'settings.connectModelServiceNamed:{"name":"OpenAI Codex"}' })
      .click();
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
    await mounted.screen.getByLabelText("Choose a login method").click();
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

  it("keeps independent engine model editing folded and excludes new OmniMind hints", async () => {
    const mounted = await renderPanel({
      list: async () => ({
        state: "empty",
        services: [],
        connectableServices: [],
        errorCode: null,
      }),
    });

    const disclosure = mounted.screen.getByRole("button", { name: "settings.reviewAction" });
    await expect.element(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(
      mounted.screen.getByLabelText("settings.engineModelSlug").element().closest("[inert]"),
    ).not.toBeNull();

    await disclosure.click();
    await expect.element(disclosure).toHaveAttribute("aria-expanded", "true");
    await mounted.screen.getByLabelText("settings.engineModelProvider").click();
    expect(
      [...document.querySelectorAll('[role="option"]')].map((option) => option.textContent),
    ).not.toContain("OmniMind");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });
});
