// FILE: OAEcosystem.ts
// Purpose: Declares the Haros Agent native package/resource lifecycle owner.
// Layer: Server engine service contract

import type {
  OAEcosystemInstallInput,
  OAEcosystemListInput,
  OAEcosystemListResourcesResult,
  OAEcosystemMutationResult,
  OAEcosystemPackageInput,
  OAEcosystemReloadInput,
  OAEcosystemReloadResult,
  OAEcosystemResourceToggleInput,
  OAEcosystemSnapshot,
} from "@harnessos/contracts";
import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface OAEcosystemShape {
  readonly list: (input?: OAEcosystemListInput) => Effect.Effect<OAEcosystemSnapshot, Error>;
  readonly listResources: (
    input: OAEcosystemPackageInput,
  ) => Effect.Effect<OAEcosystemListResourcesResult, Error>;
  readonly install: (
    input: OAEcosystemInstallInput,
  ) => Effect.Effect<OAEcosystemMutationResult, Error>;
  readonly update: (
    input: OAEcosystemPackageInput,
  ) => Effect.Effect<OAEcosystemMutationResult, Error>;
  readonly remove: (
    input: OAEcosystemPackageInput,
  ) => Effect.Effect<OAEcosystemMutationResult, Error>;
  readonly setResourceEnabled: (
    input: OAEcosystemResourceToggleInput,
  ) => Effect.Effect<OAEcosystemMutationResult, Error>;
  readonly reload: (input: OAEcosystemReloadInput) => Effect.Effect<OAEcosystemReloadResult, Error>;
}

export class OAEcosystem extends ServiceMap.Service<OAEcosystem, OAEcosystemShape>()(
  "harnessos/engine/Services/OAEcosystem",
) {}
