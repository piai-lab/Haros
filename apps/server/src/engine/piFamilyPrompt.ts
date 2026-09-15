import type { BuiltInToolGroupId } from "@harnessos/contracts";

import { renderHarosHarnessPolicy } from "../hostGateway/harnessPolicy.ts";

/** Render the Host policy consumed by the independent Pi Engine. */
export function makePiHostSystemPrompt(input: {
  readonly gatewayControlAvailable: boolean;
  readonly enabledBuiltInGroups?: ReadonlyArray<BuiltInToolGroupId>;
}): string {
  return [
    "<harnessos_host_context>",
    renderHarosHarnessPolicy({
      gatewayControlAvailable: input.gatewayControlAvailable,
      projection: {
        mode: "direct",
        enabledGroups: input.enabledBuiltInGroups ?? [],
      },
    }),
    "</harnessos_host_context>",
  ].join("\n");
}
