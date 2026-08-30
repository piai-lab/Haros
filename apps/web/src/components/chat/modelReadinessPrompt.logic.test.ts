import type { EngineSelection, ServerEngineStatus } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  areUsableEngineCatalogsSettled,
  hasUsableExactModelBinding,
  hasUsableOAModelServiceBinding,
  isSettledPassiveModelServicesQueryState,
} from "./modelReadinessPrompt.logic";

function engineStatus(
  engine: ServerEngineStatus["engine"],
  overrides: Partial<ServerEngineStatus> = {},
): ServerEngineStatus {
  return {
    engine,
    available: true,
    status: "ready",
    authStatus: "authenticated",
    checkedAt: "2026-08-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("model readiness facts", () => {
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

  it("accepts a usable exact independent Engine binding", () => {
    const exactEngineSelections = {
      codex: { engine: "codex", model: "gpt-5.5" },
    } satisfies Partial<Record<EngineSelection["engine"], EngineSelection>>;

    expect(
      hasUsableExactModelBinding({
        engineStatuses: [engineStatus("codex")],
        exactEngineSelections,
      }),
    ).toBe(true);
  });

  it("does not mistake bundled Engine health with unknown auth for configured user state", () => {
    expect(
      hasUsableExactModelBinding({
        engineStatuses: [
          engineStatus("oa", { authStatus: "unknown" }),
          engineStatus("pi", { authStatus: "unknown" }),
        ],
        exactEngineSelections: {
          oa: {
            engine: "oa",
            model: "deepseek/deepseek-v4-flash",
          },
          pi: { engine: "pi", model: "anthropic/claude-sonnet-4" },
        },
      }),
    ).toBe(false);
  });

  it("requires the exact Haros service origin to own the configured model", () => {
    const selection = {
      engine: "oa",
      model: "gateway/model",
    } satisfies EngineSelection;
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
      hasUsableOAModelServiceBinding({
        selection,
        selectionIsExplicit: true,
        catalogState: "ready",
        modelOptions,
        services: [configuredBuiltin],
      }),
    ).toBe(false);
    expect(
      hasUsableOAModelServiceBinding({
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
      engine: "oa",
      model: "extension-service/extension-model",
    } satisfies EngineSelection;
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
      hasUsableOAModelServiceBinding({
        selection,
        selectionIsExplicit: true,
        catalogState: "ready",
        modelOptions,
        services: [storedOrphan],
      }),
    ).toBe(true);
    expect(
      hasUsableOAModelServiceBinding({
        selection,
        selectionIsExplicit: false,
        catalogState: "ready",
        modelOptions,
        services: [storedOrphan],
      }),
    ).toBe(false);
    expect(
      hasUsableOAModelServiceBinding({
        selection,
        selectionIsExplicit: true,
        catalogState: "ready",
        modelOptions,
        services: [{ ...storedOrphan, origin: "builtin" }],
      }),
    ).toBe(false);
    expect(
      hasUsableOAModelServiceBinding({
        selection,
        selectionIsExplicit: true,
        catalogState: "stale",
        modelOptions,
        services: [storedOrphan],
      }),
    ).toBe(false);
  });

  it("does not count an unavailable or model-less Engine as sendable", () => {
    expect(
      hasUsableExactModelBinding({
        engineStatuses: [engineStatus("codex", { available: false })],
        exactEngineSelections: { codex: { engine: "codex", model: "gpt-5.5" } },
      }),
    ).toBe(false);
    expect(
      hasUsableExactModelBinding({
        engineStatuses: [engineStatus("oa")],
        exactEngineSelections: {},
      }),
    ).toBe(false);
  });

  it("waits only for a usable Engine catalog that has remembered exact user intent", () => {
    const statuses = [engineStatus("oa"), engineStatus("codex")];
    const codexSelection = { codex: { engine: "codex", model: "gpt-5.5" } } as const;

    expect(
      areUsableEngineCatalogsSettled({
        engineStatuses: statuses,
        catalogStateByEngine: { codex: "checking", oa: "empty" },
        explicitExactEngineSelections: codexSelection,
      }),
    ).toBe(false);
    expect(
      areUsableEngineCatalogsSettled({
        engineStatuses: statuses,
        catalogStateByEngine: { codex: "ready", oa: "empty" },
        explicitExactEngineSelections: codexSelection,
      }),
    ).toBe(true);
    expect(
      areUsableEngineCatalogsSettled({
        engineStatuses: [engineStatus("codex", { available: false })],
        catalogStateByEngine: { codex: "checking" },
        explicitExactEngineSelections: codexSelection,
      }),
    ).toBe(true);
    expect(
      areUsableEngineCatalogsSettled({
        engineStatuses: statuses,
        catalogStateByEngine: { codex: "checking", oa: "checking" },
        explicitExactEngineSelections: {},
      }),
    ).toBe(true);
  });
});
