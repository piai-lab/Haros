// FILE: OmniMindModelServices.ts
// Purpose: Declares the credential-blind OmniMind Agent model-services query owner.
// Layer: Server provider service contract

import type {
  OmniMindCustomModelServiceRemoveInput,
  OmniMindCustomModelServiceRemoveResult,
  OmniMindCustomModelServiceDiscoverInput,
  OmniMindCustomModelServiceDiscoverResult,
  OmniMindCustomModelServiceSaveInput,
  OmniMindCustomModelServiceSaveResult,
  OmniMindCustomModelServiceTestInput,
  OmniMindCustomModelServiceTestResult,
  OmniMindModelServiceAnswerLoginInput,
  OmniMindModelServiceAuthResult,
  OmniMindModelServiceBeginLoginInput,
  OmniMindModelServiceCancelLoginInput,
  OmniMindModelServicePollLoginInput,
  OmniMindModelServiceLogoutInput,
  OmniMindModelServiceLogoutResult,
  OmniMindModelServiceRefreshInput,
  OmniMindModelServiceRefreshResult,
  OmniMindModelServicesGetInput,
  OmniMindModelServicesGetResult,
  OmniMindModelServicesListInput,
  OmniMindModelServicesListResult,
} from "@omnimind/contracts";
import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface OmniMindModelServicesShape {
  readonly list: (
    input?: OmniMindModelServicesListInput,
  ) => Effect.Effect<OmniMindModelServicesListResult>;
  readonly get: (
    input: OmniMindModelServicesGetInput,
  ) => Effect.Effect<OmniMindModelServicesGetResult>;
  readonly beginLogin: (
    clientId: number,
    input: OmniMindModelServiceBeginLoginInput,
  ) => Effect.Effect<OmniMindModelServiceAuthResult>;
  readonly pollLogin: (
    clientId: number,
    input: OmniMindModelServicePollLoginInput,
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
  readonly testCustom: (
    input: OmniMindCustomModelServiceTestInput,
  ) => Effect.Effect<OmniMindCustomModelServiceTestResult>;
  readonly discoverCustom: (
    input: OmniMindCustomModelServiceDiscoverInput,
  ) => Effect.Effect<OmniMindCustomModelServiceDiscoverResult>;
  readonly saveCustom: (
    input: OmniMindCustomModelServiceSaveInput,
  ) => Effect.Effect<OmniMindCustomModelServiceSaveResult>;
  readonly removeCustom: (
    input: OmniMindCustomModelServiceRemoveInput,
  ) => Effect.Effect<OmniMindCustomModelServiceRemoveResult>;
}

export class OmniMindModelServices extends ServiceMap.Service<
  OmniMindModelServices,
  OmniMindModelServicesShape
>()("omnimind/provider/Services/OmniMindModelServices") {}
