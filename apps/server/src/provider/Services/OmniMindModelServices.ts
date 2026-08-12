// FILE: OmniMindModelServices.ts
// Purpose: Declares the credential-blind OmniMind Agent model-services query owner.
// Layer: Server provider service contract

import type {
  OmniMindModelServicesGetInput,
  OmniMindModelServicesGetResult,
  OmniMindModelServicesListResult,
} from "@omnimind/contracts";
import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface OmniMindModelServicesShape {
  readonly list: () => Effect.Effect<OmniMindModelServicesListResult>;
  readonly get: (
    input: OmniMindModelServicesGetInput,
  ) => Effect.Effect<OmniMindModelServicesGetResult>;
}

export class OmniMindModelServices extends ServiceMap.Service<
  OmniMindModelServices,
  OmniMindModelServicesShape
>()("omnimind/provider/Services/OmniMindModelServices") {}
