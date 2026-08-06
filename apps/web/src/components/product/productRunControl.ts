// FILE: productRunControl.ts
// Purpose: Applies Product Run controls while keeping Host diagnostics out of user copy.

import {
  PRODUCT_PROTOCOL_VERSION,
  type ProductControlRunResult,
  type ProductConversationId,
  type ProductDispatchReceipt,
  type ProductRunId,
  type ProductRuntimeChoice,
} from "@omnimind/contracts";

import type { WorkbenchCopy } from "../../i18n/workbenchCopy";
import type { ProductNativeApi } from "../../wsNativeApi";

export function isProductRunAbortable(
  receipt: ProductDispatchReceipt,
  runtimeChoice: ProductRuntimeChoice,
): boolean {
  return (
    receipt.state === "accepted" ||
    receipt.state === "running" ||
    (receipt.state === "sent" && runtimeChoice.kind === "engine-session-current")
  );
}

export function productControlFailureMessage(
  result: ProductControlRunResult,
  copy: WorkbenchCopy,
): string {
  switch (result.code) {
    case "control-unsupported":
      return copy.productControlUnsupported;
    case "control-too-late":
      return copy.productControlTooLate;
    case "operation-unknown":
      return copy.productControlUnknown;
    default:
      return copy.productStopFailedDescription;
  }
}

export async function abortProductRun(input: {
  readonly api: Pick<ProductNativeApi, "controlRun">;
  readonly conversationId: ProductConversationId;
  readonly runId: ProductRunId;
  readonly copy: WorkbenchCopy;
}): Promise<void> {
  const result = await input.api.controlRun({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    conversationId: input.conversationId,
    runId: input.runId,
    control: "abort",
    text: null,
  });
  if (result.result !== "applied" && result.result !== "requested") {
    throw new Error(productControlFailureMessage(result, input.copy));
  }
}
