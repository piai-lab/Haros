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
export type { PassiveModelServicesState } from "../onboarding/firstRunReadiness.logic";

export function isSettledPassiveModelServicesQueryState(input: {
  readonly status: "pending" | "error" | "success";
  readonly fetchStatus: "fetching" | "paused" | "idle";
  readonly isInvalidated: boolean;
}): boolean {
  return input.status === "success" && input.fetchStatus === "idle" && !input.isInvalidated;
}

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

export function hasUsableOmniMindModelServiceBinding(input: {
  readonly selection: ModelSelection | undefined;
  readonly selectionIsExplicit: boolean;
  readonly catalogState: ProviderModelCatalogState | undefined;
  readonly modelOptions: ReadonlyArray<ProviderModelOption>;
  readonly services: ReadonlyArray<OmniMindModelServiceDescriptor>;
}): boolean {
  if (input.selection?.provider !== "omnimind") return false;
  const model = input.modelOptions.find((option) => option.slug === input.selection?.model);
  if (!model?.upstreamProviderId || !model.upstreamProviderOrigin) return false;
  const exactService = input.services.find(
    (service) => service.serviceId === model.upstreamProviderId,
  );
  if (
    exactService?.origin === model.upstreamProviderOrigin &&
    exactService.authState === "configured" &&
    exactService.availableModelCount > 0
  ) {
    return true;
  }
  // Passive Model-services projection deliberately does not execute Extension
  // code. After an Extension API-key login it can therefore see only the
  // credential-backed orphan, while the selected-provider Pi catalog has
  // already loaded that Extension and proved the exact model available. Accept
  // that combination only for a remembered user selection. A builtin/models
  // collision retains its real passive origin and cannot take this path.
  return (
    input.selectionIsExplicit &&
    input.catalogState === "ready" &&
    model.upstreamProviderOrigin === "extension" &&
    exactService?.origin === "unknown" &&
    exactService.authSource === "stored" &&
    exactService.storedCredentialType !== null
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
