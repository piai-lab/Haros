// FILE: OAModelServices.ts
// Purpose: Declares the credential-blind HarnessOS Agent model-services query owner.
// Layer: Server provider service contract

import type {
  HarnessOSCustomModelServiceRemoveInput,
  HarnessOSCustomModelServiceRemoveResult,
  HarnessOSCustomModelServiceDiscoverInput,
  HarnessOSCustomModelServiceDiscoverResult,
  HarnessOSCustomModelServiceSaveInput,
  HarnessOSCustomModelServiceSaveResult,
  HarnessOSCustomModelServiceTestInput,
  HarnessOSCustomModelServiceTestResult,
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
    input: HarnessOSCustomModelServiceTestInput,
  ) => Effect.Effect<HarnessOSCustomModelServiceTestResult>;
  readonly discoverCustom: (
    input: HarnessOSCustomModelServiceDiscoverInput,
  ) => Effect.Effect<HarnessOSCustomModelServiceDiscoverResult>;
  readonly saveCustom: (
    input: HarnessOSCustomModelServiceSaveInput,
  ) => Effect.Effect<HarnessOSCustomModelServiceSaveResult>;
  readonly removeCustom: (
    input: HarnessOSCustomModelServiceRemoveInput,
  ) => Effect.Effect<HarnessOSCustomModelServiceRemoveResult>;
}

export class OAModelServices extends ServiceMap.Service<OAModelServices, OAModelServicesShape>()(
  "harnessos/engine/Services/OAModelServices",
) {}
