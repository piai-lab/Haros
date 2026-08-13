// FILE: ModelsSettingsPanel.browser.tsx
// Purpose: Proves Model services remains side-effect gated and renders honest projection states.
// Layer: Browser UI test

import "../../index.css";

import type {
  NativeApi,
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
  readonly answerLogin?: NativeApi["omnimindModelServices"]["answerLogin"];
  readonly cancelLogin?: NativeApi["omnimindModelServices"]["cancelLogin"];
  readonly logout?: NativeApi["omnimindModelServices"]["logout"];
  readonly refresh?: NativeApi["omnimindModelServices"]["refresh"];
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
  const cancelLogin = vi.fn(input.cancelLogin ?? beginLogin);
  const logout = vi.fn(
    input.logout ?? (async () => ({ state: "complete", service: service() }) as const),
  );
  const refresh = vi.fn(
    input.refresh ?? (async () => ({ state: "success", service: service() }) as const),
  );
  window.nativeApi = {
    server: { getConfig },
    ...(input.supported === false
      ? {}
      : {
          omnimindModelServices: {
            list,
            get,
            beginLogin,
            answerLogin,
            cancelLogin,
            logout,
            refresh,
          },
        }),
  } as unknown as NativeApi;
  return { getConfig, list, get, beginLogin, answerLogin, cancelLogin, logout, refresh };
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
  readonly answerLogin?: NativeApi["omnimindModelServices"]["answerLogin"];
  readonly cancelLogin?: NativeApi["omnimindModelServices"]["cancelLogin"];
  readonly logout?: NativeApi["omnimindModelServices"]["logout"];
  readonly refresh?: NativeApi["omnimindModelServices"]["refresh"];
}) {
  const calls = setNativeApi(input);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (input.primeServerConfig !== false) {
    queryClient.setQueryData(serverQueryKeys.config(), createBrowserTestServerConfig(checkedAt));
  }
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <ModelsSettingsPanel
        active={input.active ?? true}
        resetEpoch={0}
        settings={settings}
        defaults={settings}
        updateSettings={() => {}}
      />
    </QueryClientProvider>,
  );
  return { calls, queryClient, screen };
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
      list: async () => ({ state: "empty", services: [], errorCode: null }),
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

    resolveList({ state: "empty", services: [], errorCode: null });
    await expect.poll(() => document.body.textContent).toContain("settings.noModelServices");
    expect(document.body.textContent).not.toContain("settings.modelServicesUnavailable");

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
      list: async () => ({ state: "empty", services: [], errorCode: null }),
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
      list: async () => ({ state: "ready", services: [staleService], errorCode: null }),
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
      list: async () => ({ state: "ready", services: [setupService], errorCode: null }),
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
      list: async () => ({ state: "ready", services: [configuredService], errorCode: null }),
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
      list: async () => ({ state: "ready", services: [staticService], errorCode: null }),
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
      list: async () => ({ state: "ready", services: [primary, secondary], errorCode: null }),
    });

    await expect.poll(() => document.body.textContent).toContain("deepseek-primary");
    expect(document.body.textContent).toContain("deepseek-backup");
    expect(document.body.textContent).toContain("settings.modelServiceRefreshRequired");

    await mounted.screen.unmount();
    mounted.queryClient.clear();
  });

  it("keeps independent engine model editing folded and excludes new OmniMind hints", async () => {
    const mounted = await renderPanel({
      list: async () => ({ state: "empty", services: [], errorCode: null }),
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
