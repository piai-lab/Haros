// FILE: OmniMindEcosystem.ts
// Purpose: Declares the OmniMind Agent native package/resource lifecycle owner.
// Layer: Server engine service contract

import type {
  OmniMindEcosystemInstallInput,
  OmniMindEcosystemListInput,
  OmniMindEcosystemListResourcesResult,
  OmniMindEcosystemMutationResult,
  OmniMindEcosystemPackageInput,
  OmniMindEcosystemReloadInput,
  OmniMindEcosystemReloadResult,
  OmniMindEcosystemResourceToggleInput,
  OmniMindEcosystemSnapshot,
} from "@harnessos/contracts";
import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface OmniMindEcosystemShape {
  readonly list: (
    input?: OmniMindEcosystemListInput,
  ) => Effect.Effect<OmniMindEcosystemSnapshot, Error>;
  readonly listResources: (
    input: OmniMindEcosystemPackageInput,
  ) => Effect.Effect<OmniMindEcosystemListResourcesResult, Error>;
  readonly install: (
    input: OmniMindEcosystemInstallInput,
  ) => Effect.Effect<OmniMindEcosystemMutationResult, Error>;
  readonly update: (
    input: OmniMindEcosystemPackageInput,
  ) => Effect.Effect<OmniMindEcosystemMutationResult, Error>;
  readonly remove: (
    input: OmniMindEcosystemPackageInput,
  ) => Effect.Effect<OmniMindEcosystemMutationResult, Error>;
  readonly setResourceEnabled: (
    input: OmniMindEcosystemResourceToggleInput,
  ) => Effect.Effect<OmniMindEcosystemMutationResult, Error>;
  readonly reload: (
    input: OmniMindEcosystemReloadInput,
  ) => Effect.Effect<OmniMindEcosystemReloadResult, Error>;
}

export class OmniMindEcosystem extends ServiceMap.Service<
  OmniMindEcosystem,
  OmniMindEcosystemShape
>()("harnessos/provider/Services/OmniMindEcosystem") {}
