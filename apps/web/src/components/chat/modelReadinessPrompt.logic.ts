import {
  type ModelSelection,
  type ProviderKind,
  type ServerProviderStatus,
} from "@omnimind/contracts";

import { COMPOSER_PROVIDER_KINDS } from "~/composerDraftModels";
import type { ProviderModelCatalogState } from "~/hooks/useProviderModelCatalog";
import { findProviderStatus, isProviderUsable } from "~/lib/providerAvailability";

export type PassiveModelServicesState = "unknown" | "empty" | "configured" | "error";
export type ModelReadinessPromptMode = "setup" | "recover" | null;

export function hasUsableExactModelBinding(input: {
  readonly providerStatuses: readonly ServerProviderStatus[];
  readonly exactModelSelections: Partial<Record<ProviderKind, ModelSelection>>;
}): boolean {
  return COMPOSER_PROVIDER_KINDS.some((provider) => {
    const selection = input.exactModelSelections[provider];
    return (
      selection?.provider === provider &&
      selection.model.trim().length > 0 &&
      isProviderUsable(findProviderStatus(input.providerStatuses, provider))
    );
  });
}

export function hasRecoverableExactModelBinding(input: {
  readonly recoverableProviders: readonly ProviderKind[];
  readonly exactModelSelections: Partial<Record<ProviderKind, ModelSelection>>;
}): boolean {
  return input.recoverableProviders.some((provider) => {
    const selection = input.exactModelSelections[provider];
    return selection?.provider === provider && selection.model.trim().length > 0;
  });
}

export function areUsableProviderCatalogsSettled(input: {
  readonly providerStatuses: readonly ServerProviderStatus[];
  readonly catalogStateByProvider: Partial<Record<ProviderKind, ProviderModelCatalogState>>;
}): boolean {
  return COMPOSER_PROVIDER_KINDS.every(
    (provider) =>
      !isProviderUsable(findProviderStatus(input.providerStatuses, provider)) ||
      input.catalogStateByProvider[provider] !== "checking",
  );
}

export function deriveModelReadinessPromptMode(input: {
  readonly surfaceEligible: boolean;
  readonly serverFactsReady: boolean;
  readonly hasUsableExactBinding: boolean;
  readonly hasRecoverableExactBinding: boolean;
  readonly modelServicesCapability: boolean | null;
  readonly modelServicesTransport:
    | "open"
    | "closed"
    | "connecting"
    | "incompatible"
    | "disposed"
    | null;
  readonly passiveModelServicesState: PassiveModelServicesState;
}): ModelReadinessPromptMode {
  if (
    !input.surfaceEligible ||
    !input.serverFactsReady ||
    input.hasUsableExactBinding ||
    input.modelServicesCapability !== true ||
    input.modelServicesTransport !== "open"
  ) {
    return null;
  }

  if (input.passiveModelServicesState === "empty") {
    return input.hasRecoverableExactBinding ? "recover" : "setup";
  }
  if (input.passiveModelServicesState === "configured") return "recover";
  return null;
}
