// FILE: HarosModelServices.ts
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
  HarosModelServiceAnswerLoginInput,
  HarosModelServiceAuthResult,
  HarosModelServiceBeginLoginInput,
  HarosModelServiceCancelLoginInput,
  HarosModelServicePollLoginInput,
  HarosModelServiceLogoutInput,
  HarosModelServiceLogoutResult,
  HarosModelServiceRevealApiKeyInput,
  HarosModelServiceRevealApiKeyResult,
  HarosModelServiceRefreshInput,
  HarosModelServiceRefreshResult,
  HarosModelServiceTestInput,
  HarosModelServiceTestResult,
  HarosModelServicesGetInput,
  HarosModelServicesGetResult,
  HarosModelServicesListInput,
  HarosModelServicesListResult,
} from "@harnessos/contracts";
import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface HarosModelServicesShape {
  readonly list: (
    input?: HarosModelServicesListInput,
  ) => Effect.Effect<HarosModelServicesListResult>;
  readonly get: (input: HarosModelServicesGetInput) => Effect.Effect<HarosModelServicesGetResult>;
  readonly beginLogin: (
    clientId: number,
    input: HarosModelServiceBeginLoginInput,
  ) => Effect.Effect<HarosModelServiceAuthResult>;
  readonly pollLogin: (
    clientId: number,
    input: HarosModelServicePollLoginInput,
  ) => Effect.Effect<HarosModelServiceAuthResult>;
  readonly answerLogin: (
    clientId: number,
    input: HarosModelServiceAnswerLoginInput,
  ) => Effect.Effect<HarosModelServiceAuthResult>;
  readonly cancelLogin: (
    clientId: number,
    input: HarosModelServiceCancelLoginInput,
  ) => Effect.Effect<HarosModelServiceAuthResult>;
  readonly logout: (
    input: HarosModelServiceLogoutInput,
  ) => Effect.Effect<HarosModelServiceLogoutResult>;
  readonly revealApiKey: (
    input: HarosModelServiceRevealApiKeyInput,
  ) => Effect.Effect<HarosModelServiceRevealApiKeyResult>;
  readonly refresh: (
    input: HarosModelServiceRefreshInput,
  ) => Effect.Effect<HarosModelServiceRefreshResult>;
  readonly testModel: (
    input: HarosModelServiceTestInput,
  ) => Effect.Effect<HarosModelServiceTestResult>;
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

export class HarosModelServices extends ServiceMap.Service<
  HarosModelServices,
  HarosModelServicesShape
>()("harnessos/engine/Services/HarosModelServices") {}
