import type { LastThreadRoute } from "../chatRouteRestore";

export type ProductChatLandingDecision =
  | { readonly kind: "hold-product-shell" }
  | { readonly kind: "hold-draft-bootstrap" }
  | {
      readonly kind: "navigate";
      readonly threadId: string;
      readonly splitViewId?: string | undefined;
    }
  | { readonly kind: "create-draft" };

export async function createProductChatDraftOnce<Result>(
  guard: { current: boolean },
  create: () => Promise<Result>,
): Promise<Result | null> {
  if (guard.current) return null;
  guard.current = true;
  try {
    return await create();
  } finally {
    guard.current = false;
  }
}

/**
 * Product Chat routing policy, isolated for refresh/back-forward proof. A private draft root is
 * required only to mint a new unsent draft; it can never block an existing read-only Conversation.
 */
export function resolveProductChatLanding(input: {
  readonly shellHydrated: boolean;
  readonly splitViewsHydrated: boolean;
  readonly productConversationIds: ReadonlyArray<string>;
  readonly localDraftThreadId: string | null;
  readonly lastThreadRoute: LastThreadRoute | null;
  readonly availableSplitViewIds: ReadonlySet<string>;
  readonly canCreateLocalDraft: boolean;
}): ProductChatLandingDecision {
  if (!input.shellHydrated || !input.splitViewsHydrated) {
    return { kind: "hold-product-shell" };
  }

  const availableThreadIds = new Set(input.productConversationIds);
  if (input.localDraftThreadId) availableThreadIds.add(input.localDraftThreadId);
  const remembered = input.lastThreadRoute;
  if (remembered && availableThreadIds.has(remembered.threadId)) {
    return {
      kind: "navigate",
      threadId: remembered.threadId,
      ...(remembered.splitViewId && input.availableSplitViewIds.has(remembered.splitViewId)
        ? { splitViewId: remembered.splitViewId }
        : {}),
    };
  }
  if (input.localDraftThreadId) {
    return { kind: "navigate", threadId: input.localDraftThreadId };
  }
  const latestProductConversationId = input.productConversationIds[0];
  if (latestProductConversationId) {
    return { kind: "navigate", threadId: latestProductConversationId };
  }
  return input.canCreateLocalDraft ? { kind: "create-draft" } : { kind: "hold-draft-bootstrap" };
}
