import { ServiceMap } from "effect";
import type { Effect } from "effect";

import type { HostGatewayHttpResult } from "../../hostGateway/Services/HostGateway.ts";
import type { ExternalMcpVerifiedClient } from "./ExternalMcpService.ts";

export interface ExternalMcpGatewayShape {
  readonly handlePost: (input: {
    readonly authorizationHeader: string | undefined;
    readonly body: unknown;
  }) => Effect.Effect<HostGatewayHttpResult>;
  readonly handleVerifiedPost: (input: {
    readonly client: ExternalMcpVerifiedClient;
    readonly body: unknown;
  }) => Effect.Effect<HostGatewayHttpResult>;
}

export class ExternalMcpGateway extends ServiceMap.Service<
  ExternalMcpGateway,
  ExternalMcpGatewayShape
>()("harnessos/externalMcp/Services/ExternalMcpGateway") {}
