import type { ModelSelection, ServerProviderStatus } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  deriveModelReadinessPromptMode,
  hasRecoverableExactModelBinding,
  hasUsableExactModelBinding,
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
  });

  it("shows setup only after passive facts prove a truly empty product", () => {
    const base = {
      surfaceEligible: true,
      serverFactsReady: true,
      hasUsableExactBinding: false,
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

  it("routes configured but unavailable services to recovery instead of first-run setup", () => {
    expect(
      deriveModelReadinessPromptMode({
        surfaceEligible: true,
        serverFactsReady: true,
        hasUsableExactBinding: false,
        modelServicesCapability: true,
        modelServicesTransport: "open",
        passiveModelServicesState: "configured",
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
});
