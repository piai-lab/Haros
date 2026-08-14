import {
  type ModelSelection,
  type OmniMindModelServiceDescriptor,
  type ProviderKind,
  type ServerProviderStatus,
} from "@omnimind/contracts";

import { COMPOSER_PROVIDER_KINDS } from "~/composerDraftModels";
import type { ProviderModelCatalogState } from "~/hooks/useProviderModelCatalog";
import { findProviderStatus, isProviderUsable } from "~/lib/providerAvailability";
import type { ProviderModelOption } from "~/providerModelOptions";

export type PassiveModelServicesState = "unknown" | "empty" | "configured" | "error";
export type ModelReadinessPromptMode = "setup" | "recover" | null;

export function hasUsableExactModelBinding(input: {
  readonly providerStatuses: readonly ServerProviderStatus[];
  readonly exactModelSelections: Partial<Record<ProviderKind, ModelSelection>>;
}): boolean {
  return COMPOSER_PROVIDER_KINDS.some((provider) => {
    const selection = input.exactModelSelections[provider];
    const status = findProviderStatus(input.providerStatuses, provider);
    // Bundled OmniMind/stock Pi runtimes can enumerate models before any
    // credential exists, and their Engine health intentionally reports auth as
    // unknown. Their exact catalog rows are therefore not send authority.
    // OmniMind is upgraded separately by the passive Model-services projection;
    // stock Pi stays recoverable until its own health can prove authentication.
    if ((provider === "omnimind" || provider === "pi") && status?.authStatus !== "authenticated") {
      return false;
    }
    return (
      selection?.provider === provider &&
      selection.model.trim().length > 0 &&
      isProviderUsable(status)
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

export function hasUsableOmniMindModelServiceBinding(input: {
  readonly selection: ModelSelection | undefined;
  readonly modelOptions: ReadonlyArray<ProviderModelOption>;
  readonly services: ReadonlyArray<OmniMindModelServiceDescriptor>;
}): boolean {
  if (input.selection?.provider !== "omnimind") return false;
  const model = input.modelOptions.find((option) => option.slug === input.selection?.model);
  if (!model?.upstreamProviderId || !model.upstreamProviderOrigin) return false;
  return input.services.some(
    (service) =>
      service.serviceId === model.upstreamProviderId &&
      service.origin === model.upstreamProviderOrigin &&
      service.authState === "configured" &&
      service.availableModelCount > 0,
  );
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
