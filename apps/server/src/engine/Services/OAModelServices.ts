// FILE: OAModelServices.ts
// Purpose: Declares the credential-blind Haros Agent model-services query owner.
// Layer: Server provider service contract

import type {
  HarosCustomModelServiceRemoveInput,
  HarosCustomModelServiceRemoveResult,
  HarosCustomModelServiceDiscoverInput,
  HarosCustomModelServiceDiscoverResult,
  HarosCustomModelServiceSaveInput,
  HarosCustomModelServiceSaveResult,
  HarosCustomModelServiceTestInput,
  HarosCustomModelServiceTestResult,
  OAModelServiceAnswerLoginInput,
  OAModelServiceAuthResult,
  OAModelServiceBeginLoginInput,
  OAModelServiceCancelLoginInput,
  OAModelServicePollLoginInput,
  OAModelServiceLogoutInput,
  OAModelServiceLogoutResult,
  OAModelServiceRevealApiKeyInput,
  OAModelServiceRevealApiKeyResult,
  OAModelServiceRefreshInput,
  OAModelServiceRefreshResult,
  OAModelServicesGetInput,
  OAModelServicesGetResult,
  OAModelServicesListInput,
  OAModelServicesListResult,
} from "@harnessos/contracts";
import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface OAModelServicesShape {
  readonly list: (input?: OAModelServicesListInput) => Effect.Effect<OAModelServicesListResult>;
  readonly get: (input: OAModelServicesGetInput) => Effect.Effect<OAModelServicesGetResult>;
  readonly beginLogin: (
    clientId: number,
    input: OAModelServiceBeginLoginInput,
  ) => Effect.Effect<OAModelServiceAuthResult>;
  readonly pollLogin: (
    clientId: number,
    input: OAModelServicePollLoginInput,
  ) => Effect.Effect<OAModelServiceAuthResult>;
  readonly answerLogin: (
    clientId: number,
    input: OAModelServiceAnswerLoginInput,
  ) => Effect.Effect<OAModelServiceAuthResult>;
  readonly cancelLogin: (
    clientId: number,
    input: OAModelServiceCancelLoginInput,
  ) => Effect.Effect<OAModelServiceAuthResult>;
  readonly logout: (input: OAModelServiceLogoutInput) => Effect.Effect<OAModelServiceLogoutResult>;
  readonly revealApiKey: (
    input: OAModelServiceRevealApiKeyInput,
  ) => Effect.Effect<OAModelServiceRevealApiKeyResult>;
  readonly refresh: (
    input: OAModelServiceRefreshInput,
  ) => Effect.Effect<OAModelServiceRefreshResult>;
  readonly testCustom: (
    input: HarosCustomModelServiceTestInput,
  ) => Effect.Effect<HarosCustomModelServiceTestResult>;
  readonly discoverCustom: (
    input: HarosCustomModelServiceDiscoverInput,
  ) => Effect.Effect<HarosCustomModelServiceDiscoverResult>;
  readonly saveCustom: (
    input: HarosCustomModelServiceSaveInput,
  ) => Effect.Effect<HarosCustomModelServiceSaveResult>;
  readonly removeCustom: (
    input: HarosCustomModelServiceRemoveInput,
  ) => Effect.Effect<HarosCustomModelServiceRemoveResult>;
}

export class OAModelServices extends ServiceMap.Service<OAModelServices, OAModelServicesShape>()(
  "harnessos/engine/Services/OAModelServices",
) {}
