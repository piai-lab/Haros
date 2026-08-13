// FILE: OmniMindModelServices.ts
// Purpose: Declares the credential-blind OmniMind Agent model-services query owner.
// Layer: Server provider service contract

import type {
  OmniMindModelServiceAnswerLoginInput,
  OmniMindModelServiceAuthResult,
  OmniMindModelServiceBeginLoginInput,
  OmniMindModelServiceCancelLoginInput,
  OmniMindModelServiceLogoutInput,
  OmniMindModelServiceLogoutResult,
  OmniMindModelServiceRefreshInput,
  OmniMindModelServiceRefreshResult,
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
  readonly beginLogin: (
    clientId: number,
    input: OmniMindModelServiceBeginLoginInput,
  ) => Effect.Effect<OmniMindModelServiceAuthResult>;
  readonly answerLogin: (
    clientId: number,
    input: OmniMindModelServiceAnswerLoginInput,
  ) => Effect.Effect<OmniMindModelServiceAuthResult>;
  readonly cancelLogin: (
    clientId: number,
    input: OmniMindModelServiceCancelLoginInput,
  ) => Effect.Effect<OmniMindModelServiceAuthResult>;
  readonly logout: (
    input: OmniMindModelServiceLogoutInput,
  ) => Effect.Effect<OmniMindModelServiceLogoutResult>;
  readonly refresh: (
    input: OmniMindModelServiceRefreshInput,
  ) => Effect.Effect<OmniMindModelServiceRefreshResult>;
}

export class OmniMindModelServices extends ServiceMap.Service<
  OmniMindModelServices,
  OmniMindModelServicesShape
>()("omnimind/provider/Services/OmniMindModelServices") {}
