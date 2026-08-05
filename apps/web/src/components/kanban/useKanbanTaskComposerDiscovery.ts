// FILE: useKanbanTaskComposerDiscovery.ts
// Purpose: Builds kanban task composer autocomplete items from provider/workspace discovery.
// Layer: Kanban UI hook
// Exports: useKanbanTaskComposerDiscovery

import type { ProjectEntry, ThreadId } from "@omnimind/contracts";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@tanstack/react-pacer";

import type { ComposerCommandItem } from "~/components/chat/ComposerCommandMenu";
import type { ComposerTrigger } from "~/composer-logic";
import { useComposerCommandMenuItems } from "~/hooks/useComposerCommandMenuItems";
import { getLocalFolderBrowseRootPath, isLocalFolderMentionQuery } from "~/lib/localFolderMentions";
import { projectSearchEntriesQueryOptions } from "~/lib/projectReactQuery";
import { isMacPlatform } from "~/lib/utils";

const COMPOSER_PATH_QUERY_DEBOUNCE_MS = 120;
const EMPTY_PROJECT_ENTRIES: ProjectEntry[] = [];
const KANBAN_SUPPORTED_APP_SLASH_COMMANDS = new Set(["clear"]);

interface UseKanbanTaskComposerDiscoveryInput {
  readonly composerTrigger: ComposerTrigger | null;
  readonly selectedProvider: string;
  readonly selectedProjectCwd: string | null;
  readonly serverCwd: string | null;
  readonly serverHomeDir: string | null;
  readonly scratchThreadId: ThreadId;
}

export function useKanbanTaskComposerDiscovery(input: UseKanbanTaskComposerDiscoveryInput): {
  readonly mentionTriggerQuery: string;
  readonly isLocalFolderBrowserOpen: boolean;
  readonly localFolderBrowseRootPath: string | null;
  readonly composerMenuItems: ComposerCommandItem[];
  readonly isComposerMenuLoading: boolean;
} {
  const {
    composerTrigger,
    selectedProvider,
    selectedProjectCwd,
    serverCwd,
    serverHomeDir,
    scratchThreadId,
  } = input;

  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  const localFolderBrowseRootPath = getLocalFolderBrowseRootPath(
    serverHomeDir,
    isMacPlatform(platform),
  );
  const composerTriggerKind = composerTrigger?.kind ?? null;
  const mentionTriggerQuery = composerTrigger?.kind === "mention" ? composerTrigger.query : "";
  const isMentionTrigger = composerTriggerKind === "mention";
  const isLocalFolderBrowserOpen =
    isMentionTrigger && isLocalFolderMentionQuery(mentionTriggerQuery);
  const [debouncedPathQuery, composerPathQueryDebouncer] = useDebouncedValue(
    mentionTriggerQuery,
    { wait: COMPOSER_PATH_QUERY_DEBOUNCE_MS },
    (debouncerState) => ({ isPending: debouncerState.isPending }),
  );
  const effectiveMentionQuery = mentionTriggerQuery.length > 0 ? debouncedPathQuery : "";
  void serverCwd;
  void scratchThreadId;
  const workspaceEntriesQuery = useQuery(
    projectSearchEntriesQueryOptions({
      cwd: selectedProjectCwd,
      query: effectiveMentionQuery,
      enabled: isMentionTrigger && !isLocalFolderBrowserOpen,
      limit: 80,
    }),
  );

  const workspaceEntries = workspaceEntriesQuery.data?.entries ?? EMPTY_PROJECT_ENTRIES;
  const rawComposerMenuItems = useComposerCommandMenuItems({
    composerTrigger,
    workspaceEntries,
    // Product runtime selection is owned by the Host-only picker. Provider
    // discovery may still serve non-execution slash/skill affordances here, but
    // it can neither advertise models nor influence default/send admission.
    canOfferExportCommand: false,
    surfaceAppSlashCommands: KANBAN_SUPPORTED_APP_SLASH_COMMANDS,
  });
  const composerMenuItems = rawComposerMenuItems.filter(
    (item) =>
      item.type !== "slash-command" || KANBAN_SUPPORTED_APP_SLASH_COMMANDS.has(item.command),
  );
  const isComposerMenuLoading =
    composerTriggerKind === "mention" &&
    ((mentionTriggerQuery.length > 0 && composerPathQueryDebouncer.state.isPending) ||
      workspaceEntriesQuery.isLoading ||
      workspaceEntriesQuery.isFetching);

  return {
    mentionTriggerQuery,
    isLocalFolderBrowserOpen,
    localFolderBrowseRootPath,
    composerMenuItems,
    isComposerMenuLoading,
  };
}
