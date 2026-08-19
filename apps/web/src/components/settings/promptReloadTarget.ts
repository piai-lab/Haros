import { ThreadId, type ProviderKind } from "@omnimind/contracts";

import { readSidebarUiState } from "~/components/Sidebar.uiState";
import {
  resolveSplitViewFocusedThreadId,
  type SplitView,
  useSplitViewStore,
} from "~/splitViewStore";
import { useStore } from "~/store";
import { createThreadSelector } from "~/storeSelectors";

export function resolvePromptReloadThreadIdFromState(input: {
  readonly remembered: {
    readonly threadId: string;
    readonly splitViewId?: string | undefined;
  } | null;
  readonly splitView: SplitView | null;
  readonly providerForThreadId: (threadId: ThreadId) => ProviderKind | null;
}): ThreadId | null {
  if (!input.remembered) return null;
  if (input.remembered.splitViewId && !input.splitView) return null;
  const threadId = input.splitView
    ? resolveSplitViewFocusedThreadId(input.splitView)
    : ThreadId.makeUnsafe(input.remembered.threadId);
  return threadId && input.providerForThreadId(threadId) === "omnimind" ? threadId : null;
}

export function resolvePromptReloadThreadId(): ThreadId | null {
  const remembered = readSidebarUiState().lastThreadRoute;
  const splitView = remembered?.splitViewId
    ? (useSplitViewStore.getState().splitViewsById[remembered.splitViewId] ?? null)
    : null;
  return resolvePromptReloadThreadIdFromState({
    remembered,
    splitView,
    providerForThreadId: (threadId) =>
      createThreadSelector(threadId)(useStore.getState())?.modelSelection.provider ?? null,
  });
}
