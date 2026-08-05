import type {
  ProductConversationId,
  ProductGroupColor,
  ProductGroupId,
  ProductGroupSummary,
  ThreadId,
} from "@omnimind/contracts";
import { useCallback, useState } from "react";

import {
  addProductConversationGroups,
  createProductGroup,
  deleteProductGroup,
  reorderProductGroups,
  refreshProductGroups,
  setProductConversationGroups,
  updateProductGroup,
} from "../productGroups";
import { useProductStore } from "../store/productStore";

export function useProductGroupsController() {
  const groups = useProductStore((state) => state.groups);
  const conversations = useProductStore((state) => state.conversations);
  const [pending, setPending] = useState(false);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setPending(true);
    try {
      return await operation();
    } finally {
      setPending(false);
    }
  }, []);

  const createGroup = useCallback(
    (name: string, color: ProductGroupColor) => run(() => createProductGroup({ name, color })),
    [run],
  );

  const updateGroup = useCallback(
    (group: ProductGroupSummary, name: string, color: ProductGroupColor) =>
      run(() => updateProductGroup(group.id, { name, color })),
    [run],
  );

  const deleteGroup = useCallback(
    (groupId: ProductGroupId) => run(() => deleteProductGroup(groupId)),
    [run],
  );

  const reorderGroups = useCallback(
    (orderedGroupIds: ReadonlyArray<ProductGroupId>) =>
      run(() => reorderProductGroups(orderedGroupIds)),
    [run],
  );

  const moveConversations = useCallback(
    (threadIds: ReadonlyArray<ThreadId>, groupId: ProductGroupId | null) =>
      run(() => setProductConversationGroups(threadIds, groupId === null ? [] : [groupId])),
    [run],
  );

  const addConversations = useCallback(
    (threadIds: ReadonlyArray<ThreadId>, groupId: ProductGroupId) =>
      run(() => addProductConversationGroups(threadIds, [groupId])),
    [run],
  );

  const removeConversation = useCallback(
    (threadId: ThreadId, groupId: ProductGroupId) => {
      const conversationId = threadId as unknown as ProductConversationId;
      const targetGroups = groups
        .filter(
          (group) => group.id !== groupId && group.conversationIds.includes(conversationId),
        )
        .map((group) => group.id);
      return run(() => setProductConversationGroups([threadId], targetGroups));
    },
    [groups, run],
  );

  const refresh = useCallback(() => run(() => refreshProductGroups()), [run]);

  return {
    groups,
    conversations,
    pending,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    moveConversations,
    addConversations,
    removeConversation,
    refresh,
  };
}
