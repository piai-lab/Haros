import {
  type EngineSelection,
  type OAModelServiceDescriptor,
  ENGINE_KINDS,
  type EngineKind,
  type ServerEngineStatus,
} from "@harnessos/contracts";

import type { EngineModelCatalogState } from "~/hooks/useEngineModelCatalog";
import { findEngineStatus, isProviderUsable } from "~/lib/engineAvailability";
import type { EngineModelOption } from "~/providerModelOptions";
export type { PassiveModelServicesState } from "../onboarding/firstRunReadiness.logic";

export function isSettledPassiveModelServicesQueryState(input: {
  readonly status: "pending" | "error" | "success";
  readonly fetchStatus: "fetching" | "paused" | "idle";
  readonly isInvalidated: boolean;
}): boolean {
  return input.status === "success" && input.fetchStatus === "idle" && !input.isInvalidated;
}

export function hasUsableExactModelBinding(input: {
  readonly engineStatuses: readonly ServerEngineStatus[];
  readonly exactEngineSelections: Partial<Record<EngineKind, EngineSelection>>;
}): boolean {
  return ENGINE_KINDS.some((engine) => {
    const selection = input.exactEngineSelections[engine];
    const status = findEngineStatus(input.engineStatuses, engine);
    // Bundled HarnessOS/stock Pi runtimes can enumerate models before any
    // credential exists, and their Engine health intentionally reports auth as
    // unknown. Their exact catalog rows are therefore not send authority.
    // HarnessOS is upgraded separately by the passive Model-services projection;
    // stock Pi stays recoverable until its own health can prove authentication.
    if ((engine === "oa" || engine === "pi") && status?.authStatus !== "authenticated") {
      return false;
    }
    return (
      selection?.engine === engine && selection.model.trim().length > 0 && isProviderUsable(status)
    );
  });
}

export function hasUsableOAModelServiceBinding(input: {
  readonly selection: EngineSelection | undefined;
  readonly selectionIsExplicit: boolean;
  readonly catalogState: EngineModelCatalogState | undefined;
  readonly modelOptions: ReadonlyArray<EngineModelOption>;
  readonly services: ReadonlyArray<OAModelServiceDescriptor>;
}): boolean {
  if (input.selection?.engine !== "oa") return false;
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
  // credential-backed orphan, while the selected-engine Pi catalog has
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
  readonly engineStatuses: readonly ServerEngineStatus[];
  readonly catalogStateByEngine: Partial<Record<EngineKind, EngineModelCatalogState>>;
  readonly explicitExactEngineSelections: Partial<Record<EngineKind, EngineSelection>>;
}): boolean {
  return ENGINE_KINDS.every(
    (engine) =>
      input.explicitExactEngineSelections[engine] === undefined ||
      !isProviderUsable(findEngineStatus(input.engineStatuses, engine)) ||
      input.catalogStateByEngine[engine] !== "checking",
  );
}
