import { ProductConversationId } from "@omnimind/contracts";
import { Effect } from "effect";

import { ProductControlPlaneError, type ProductControlPlaneShape } from "./ProductControlPlane";

export interface LegacyConversationReferenceCarrier {
  readonly threadId?: string | null;
  readonly sourceThreadId?: string | null;
  readonly parentThreadId?: string | null;
  readonly sidechatSourceThreadId?: string | null;
}

const LEGACY_CONVERSATION_REFERENCE_FIELDS = [
  "threadId",
  "sourceThreadId",
  "parentThreadId",
  "sidechatSourceThreadId",
] as const;

export function legacyConversationReferences(input: object): ReadonlyArray<ProductConversationId> {
  const referencesByField = input as LegacyConversationReferenceCarrier;
  const references: ProductConversationId[] = [];
  for (const field of LEGACY_CONVERSATION_REFERENCE_FIELDS) {
    const value = referencesByField[field];
    if (typeof value !== "string") continue;
    const conversationId = ProductConversationId.makeUnsafe(value);
    if (!references.includes(conversationId)) references.push(conversationId);
  }
  return references;
}

/** Service-side authority guard shared by every legacy Conversation write route. */
export function assertLegacyConversationRouteAvailable(
  input: object,
  productControlPlane: Pick<ProductControlPlaneShape, "hasConversation">,
): Effect.Effect<void, ProductControlPlaneError> {
  return Effect.gen(function* () {
    for (const conversationId of legacyConversationReferences(input)) {
      if (yield* productControlPlane.hasConversation(conversationId)) {
        return yield* Effect.fail(
          new ProductControlPlaneError({
            code: "PRODUCT_CONVERSATION_LEGACY_ROUTE_FORBIDDEN",
            message: `Legacy Conversation writers are disabled for Product Conversation ${conversationId}.`,
            retryable: false,
          }),
        );
      }
    }
  });
}
