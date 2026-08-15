import type { ModelSelection, ServerProviderStatus } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  areUsableProviderCatalogsSettled,
  deriveModelReadinessPromptMode,
  hasRecoverableExactModelBinding,
  hasUsableExactModelBinding,
  hasUsableOmniMindModelServiceBinding,
  isSettledPassiveModelServicesQueryState,
  resolveUsableOmniMindModelServiceSelection,
} from "./modelReadinessPrompt.logic";

function providerStatus(
  provider: ServerProviderStatus["provider"],
  overrides: Partial<ServerProviderStatus> = {},
): ServerProviderStatus {
  return {
    provider,
    available: true,
    status: "ready",
    authStatus: "authenticated",
    checkedAt: "2026-08-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("model readiness prompt", () => {
  it("does not reuse stale model-service data while authority is invalidated or refetching", () => {
    expect(
      isSettledPassiveModelServicesQueryState({
        status: "success",
        fetchStatus: "idle",
        isInvalidated: false,
      }),
    ).toBe(true);
    expect(
      isSettledPassiveModelServicesQueryState({
        status: "success",
        fetchStatus: "idle",
        isInvalidated: true,
      }),
    ).toBe(false);
    expect(
      isSettledPassiveModelServicesQueryState({
        status: "success",
        fetchStatus: "fetching",
        isInvalidated: false,
      }),
    ).toBe(false);
    expect(
      isSettledPassiveModelServicesQueryState({
        status: "error",
        fetchStatus: "idle",
        isInvalidated: false,
      }),
    ).toBe(false);
  });

  it("suppresses setup when any Engine has a usable exact model binding", () => {
    const exactModelSelections = {
      codex: { provider: "codex", model: "gpt-5.5" },
    } satisfies Partial<Record<ModelSelection["provider"], ModelSelection>>;

    expect(
      hasUsableExactModelBinding({
        providerStatuses: [providerStatus("codex")],
        exactModelSelections,
      }),
    ).toBe(true);
    expect(
      deriveModelReadinessPromptMode({
        surfaceEligible: true,
        serverFactsReady: true,
        hasUsableExactBinding: true,
        hasRecoverableExactBinding: false,
        modelServicesCapability: true,
        modelServicesTransport: "open",
        passiveModelServicesState: "empty",
      }),
    ).toBeNull();
  });

  it("treats a locally present Engine with an exact model as recoverable without calling it", () => {
    expect(
      hasRecoverableExactModelBinding({
        recoverableProviders: ["codex"],
        exactModelSelections: { codex: { provider: "codex", model: "gpt-5.5" } },
      }),
    ).toBe(true);
    expect(
      hasRecoverableExactModelBinding({
        recoverableProviders: ["omnimind", "pi"],
        exactModelSelections: {},
      }),
    ).toBe(false);
    expect(
      hasRecoverableExactModelBinding({
        recoverableProviders: ["pi"],
        exactModelSelections: {
          pi: { provider: "pi", model: "anthropic/claude-sonnet-4" },
        },
      }),
    ).toBe(true);
  });

  it("shows setup only after passive facts prove a truly empty product", () => {
    const base = {
      surfaceEligible: true,
      serverFactsReady: true,
      hasUsableExactBinding: false,
      hasRecoverableExactBinding: false,
      modelServicesCapability: true,
      modelServicesTransport: "open" as const,
    };

    expect(deriveModelReadinessPromptMode({ ...base, passiveModelServicesState: "empty" })).toBe(
      "setup",
    );
    expect(
      deriveModelReadinessPromptMode({ ...base, passiveModelServicesState: "unknown" }),
    ).toBeNull();
    expect(
      deriveModelReadinessPromptMode({ ...base, passiveModelServicesState: "error" }),
    ).toBeNull();
    expect(
      deriveModelReadinessPromptMode({
        ...base,
        modelServicesTransport: "closed",
        passiveModelServicesState: "empty",
      }),
    ).toBeNull();
  });

  it("does not mistake bundled Engine health with unknown auth for configured user state", () => {
    expect(
      hasUsableExactModelBinding({
        providerStatuses: [
          providerStatus("omnimind", { authStatus: "unknown" }),
          providerStatus("pi", { authStatus: "unknown" }),
        ],
        exactModelSelections: {
          omnimind: {
            provider: "omnimind",
            model: "deepseek/deepseek-v4-flash",
          },
          pi: { provider: "pi", model: "anthropic/claude-sonnet-4" },
        },
      }),
    ).toBe(false);
    expect(
      deriveModelReadinessPromptMode({
        surfaceEligible: true,
        serverFactsReady: true,
        hasUsableExactBinding: false,
        hasRecoverableExactBinding: false,
        modelServicesCapability: true,
        modelServicesTransport: "open",
        passiveModelServicesState: "empty",
      }),
    ).toBe("setup");
  });

  it("requires the exact OmniMind service origin to own the configured model", () => {
    const selection = {
      provider: "omnimind",
      model: "gateway/model",
    } satisfies ModelSelection;
    const modelOptions = [
      {
        slug: "gateway/model",
        name: "Model",
        upstreamProviderId: "gateway",
        upstreamProviderOrigin: "extension" as const,
      },
    ];
    const configuredBuiltin = {
      serviceId: "gateway",
      providerId: "gateway",
      displayName: "Gateway",
      origin: "builtin" as const,
      authMethods: [],
      authState: "configured" as const,
      authSource: "stored" as const,
      storedCredentialType: "api_key" as const,
      knownModelCount: 1,
      availableModelCount: 1,
      supportsNetworkRefresh: false,
      catalogState: "ready" as const,
      catalogErrorCode: null,
    };

    expect(
      hasUsableOmniMindModelServiceBinding({
        selection,
        selectionIsExplicit: true,
        catalogState: "ready",
        modelOptions,
        services: [configuredBuiltin],
      }),
    ).toBe(false);
    expect(
      hasUsableOmniMindModelServiceBinding({
        selection,
        selectionIsExplicit: true,
        catalogState: "ready",
        modelOptions,
        services: [{ ...configuredBuiltin, origin: "extension" }],
      }),
    ).toBe(true);
  });

  it("accepts only an explicitly selected available Extension backed by a stored orphan", () => {
    const selection = {
      provider: "omnimind",
      model: "extension-service/extension-model",
    } satisfies ModelSelection;
    const modelOptions = [
      {
        slug: selection.model,
        name: "Extension Model",
        upstreamProviderId: "extension-service",
        upstreamProviderOrigin: "extension" as const,
      },
    ];
    const storedOrphan = {
      serviceId: "extension-service",
      providerId: "extension-service",
      displayName: "extension-service",
      origin: "unknown" as const,
      authMethods: [],
      authState: "unavailable" as const,
      authSource: "stored" as const,
      storedCredentialType: "api_key" as const,
      knownModelCount: 0,
      availableModelCount: 0,
      supportsNetworkRefresh: false,
      catalogState: "error" as const,
      catalogErrorCode: "catalog_unavailable" as const,
    };

    expect(
      hasUsableOmniMindModelServiceBinding({
        selection,
        selectionIsExplicit: true,
        catalogState: "ready",
        modelOptions,
        services: [storedOrphan],
      }),
    ).toBe(true);
    expect(
      hasUsableOmniMindModelServiceBinding({
        selection,
        selectionIsExplicit: false,
        catalogState: "ready",
        modelOptions,
        services: [storedOrphan],
      }),
    ).toBe(false);
    expect(
      hasUsableOmniMindModelServiceBinding({
        selection,
        selectionIsExplicit: true,
        catalogState: "ready",
        modelOptions,
        services: [{ ...storedOrphan, origin: "builtin" }],
      }),
    ).toBe(false);
    expect(
      hasUsableOmniMindModelServiceBinding({
        selection,
        selectionIsExplicit: true,
        catalogState: "stale",
        modelOptions,
        services: [storedOrphan],
      }),
    ).toBe(false);
  });

  it("selects the first catalog model owned by a configured exact service", () => {
    const selection = resolveUsableOmniMindModelServiceSelection({
      modelOptions: [
        {
          slug: "unconfigured/local-model",
          name: "Local Model",
          upstreamProviderId: "unconfigured",
          upstreamProviderName: "Unconfigured",
          upstreamProviderOrigin: "builtin",
        },
        {
          slug: "configured/model-y",
          name: "Model Y",
          upstreamProviderId: "configured",
          upstreamProviderName: "Configured",
          upstreamProviderOrigin: "builtin",
        },
      ],
      services: [
        {
          serviceId: "configured",
          providerId: "configured",
          displayName: "Configured",
          origin: "builtin",
          authMethods: [],
          authState: "configured",
          authSource: "stored",
          storedCredentialType: "api_key",
          knownModelCount: 1,
          availableModelCount: 1,
          supportsNetworkRefresh: false,
          catalogState: "ready",
          catalogErrorCode: null,
        },
      ],
    });

    expect(selection).toEqual({ provider: "omnimind", model: "configured/model-y" });
  });

  it("routes configured but unavailable services to recovery instead of first-run setup", () => {
    expect(
      deriveModelReadinessPromptMode({
        surfaceEligible: true,
        serverFactsReady: true,
        hasUsableExactBinding: false,
        hasRecoverableExactBinding: false,
        modelServicesCapability: true,
        modelServicesTransport: "open",
        passiveModelServicesState: "configured",
      }),
    ).toBe("recover");
  });

  it("routes a settled local Engine presence without usable auth to recovery", () => {
    expect(
      deriveModelReadinessPromptMode({
        surfaceEligible: true,
        serverFactsReady: true,
        hasUsableExactBinding: false,
        hasRecoverableExactBinding: true,
        modelServicesCapability: true,
        modelServicesTransport: "open",
        passiveModelServicesState: "empty",
      }),
    ).toBe("recover");
  });

  it("does not count an unavailable or model-less Engine as sendable", () => {
    expect(
      hasUsableExactModelBinding({
        providerStatuses: [providerStatus("codex", { available: false })],
        exactModelSelections: { codex: { provider: "codex", model: "gpt-5.5" } },
      }),
    ).toBe(false);
    expect(
      hasUsableExactModelBinding({
        providerStatuses: [providerStatus("omnimind")],
        exactModelSelections: {},
      }),
    ).toBe(false);
  });

  it("waits for every usable Engine catalog that could still produce an exact binding", () => {
    const statuses = [providerStatus("omnimind"), providerStatus("codex")];

    expect(
      areUsableProviderCatalogsSettled({
        providerStatuses: statuses,
        catalogStateByProvider: { codex: "checking", omnimind: "empty" },
      }),
    ).toBe(false);
    expect(
      areUsableProviderCatalogsSettled({
        providerStatuses: statuses,
        catalogStateByProvider: { codex: "ready", omnimind: "empty" },
      }),
    ).toBe(true);
    expect(
      areUsableProviderCatalogsSettled({
        providerStatuses: [providerStatus("codex", { available: false })],
        catalogStateByProvider: { codex: "checking" },
      }),
    ).toBe(true);
  });
});
