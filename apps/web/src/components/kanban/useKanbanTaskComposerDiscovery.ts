// FILE: useKanbanTaskComposerDiscovery.ts
// Purpose: Builds kanban task composer autocomplete items from engine/workspace discovery.
// Layer: Kanban UI hook
// Exports: useKanbanTaskComposerDiscovery

import type {
  ProjectEntry,
  EngineAgentDescriptor,
  EngineKind,
  EngineMentionReference,
  EngineNativeCommandDescriptor,
  EnginePluginDescriptor,
  EngineSkillDescriptor,
  EngineStartOptions,
  ThreadId,
} from "@harnessos/contracts";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@tanstack/react-pacer";

import type { ComposerCommandItem } from "~/components/chat/ComposerCommandMenu";
import type { ComposerTrigger } from "~/composer-logic";
import {
  buildSearchableModelOptions,
  useComposerCommandMenuItems,
} from "~/hooks/useComposerCommandMenuItems";
import { getLocalFolderBrowseRootPath, isLocalFolderMentionQuery } from "~/lib/localFolderMentions";
import { resolveProviderDiscoveryCwd } from "~/lib/engineDiscovery";
import {
  providerCommandsQueryOptions,
  providerComposerCapabilitiesQueryOptions,
  providerPluginsQueryOptions,
  providerSkillsQueryOptions,
  supportsNativeSlashCommandDiscovery,
  supportsPluginDiscovery,
  supportsSkillDiscovery,
} from "~/lib/engineDiscoveryReactQuery";
import { projectSearchEntriesQueryOptions } from "~/lib/projectReactQuery";
import { isMacPlatform } from "~/lib/utils";
import { ENGINE_MODEL_OPTIONS } from "../chat/EngineModelPicker";
import type { EngineModelOption } from "../../providerModelOptions";

type ComposerPluginSuggestion = {
  plugin: EnginePluginDescriptor;
  mention: EngineMentionReference;
};

const COMPOSER_PATH_QUERY_DEBOUNCE_MS = 120;
const EMPTY_PROJECT_ENTRIES: ProjectEntry[] = [];
const EMPTY_PROVIDER_NATIVE_COMMANDS: EngineNativeCommandDescriptor[] = [];
const EMPTY_PROVIDER_SKILLS: EngineSkillDescriptor[] = [];
const EMPTY_COMPOSER_PLUGIN_SUGGESTIONS: ComposerPluginSuggestion[] = [];
const KANBAN_SUPPORTED_APP_SLASH_COMMANDS = new Set(["clear", "default", "plan"]);

interface UseKanbanTaskComposerDiscoveryInput {
  readonly composerTrigger: ComposerTrigger | null;
  readonly selectedProvider: EngineKind;
  readonly modelOptionsByEngine: Record<
    EngineKind,
    ReadonlyArray<EngineModelOption & { isCustom?: boolean }>
  >;
  readonly selectedRuntimeAgents: readonly EngineAgentDescriptor[];
  readonly selectedProjectCwd: string | null;
  readonly serverCwd: string | null;
  readonly serverHomeDir: string | null;
  readonly scratchThreadId: ThreadId;
  readonly engineOptionsForDispatch: EngineStartOptions | undefined;
  readonly hiddenEngines: readonly EngineKind[];
  readonly engineOrder: readonly EngineKind[];
  readonly piAgentDir: string | null;
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
    modelOptionsByEngine,
    selectedRuntimeAgents,
    selectedProjectCwd,
    serverCwd,
    serverHomeDir,
    scratchThreadId,
    engineOptionsForDispatch,
    hiddenEngines,
    engineOrder,
    piAgentDir,
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
  const isSkillTrigger = composerTriggerKind === "skill";
  const [debouncedPathQuery, composerPathQueryDebouncer] = useDebouncedValue(
    mentionTriggerQuery,
    { wait: COMPOSER_PATH_QUERY_DEBOUNCE_MS },
    (debouncerState) => ({ isPending: debouncerState.isPending }),
  );
  const effectiveMentionQuery = mentionTriggerQuery.length > 0 ? debouncedPathQuery : "";
  const composerSkillCwd = resolveProviderDiscoveryCwd({
    activeThreadWorktreePath: null,
    activeProjectCwd: selectedProjectCwd,
    serverCwd,
  });

  const providerComposerCapabilitiesQuery = useQuery(
    providerComposerCapabilitiesQueryOptions(selectedProvider),
  );
  const providerCommandsQuery = useQuery(
    providerCommandsQueryOptions({
      engine: selectedProvider,
      cwd: composerSkillCwd,
      threadId: scratchThreadId,
      binaryPath:
        (selectedProvider === "opencode"
          ? engineOptionsForDispatch?.opencode?.binaryPath
          : selectedProvider === "kilo"
            ? engineOptionsForDispatch?.kilo?.binaryPath
            : null) ?? null,
      serverUrl:
        (selectedProvider === "opencode"
          ? engineOptionsForDispatch?.opencode?.serverUrl
          : selectedProvider === "kilo"
            ? engineOptionsForDispatch?.kilo?.serverUrl
            : null) ?? null,
      experimentalWebSockets:
        selectedProvider === "opencode"
          ? engineOptionsForDispatch?.opencode?.experimentalWebSockets
          : undefined,
      agentDir: selectedProvider === "pi" ? piAgentDir : null,
      enabled:
        (composerTriggerKind === "slash-command" || composerTriggerKind === "slash-model") &&
        supportsNativeSlashCommandDiscovery(providerComposerCapabilitiesQuery.data) &&
        composerSkillCwd !== null,
    }),
  );
  const canDiscoverProviderSkills =
    selectedProvider === "pi" || supportsSkillDiscovery(providerComposerCapabilitiesQuery.data);
  const providerSkillsQuery = useQuery(
    providerSkillsQueryOptions({
      engine: selectedProvider,
      cwd: composerSkillCwd,
      threadId: scratchThreadId,
      agentDir: selectedProvider === "pi" ? piAgentDir : null,
      enabled:
        (isSkillTrigger || composerTriggerKind === "slash-command" || selectedProvider === "pi") &&
        canDiscoverProviderSkills &&
        composerSkillCwd !== null,
    }),
  );
  const providerPluginsQuery = useQuery(
    providerPluginsQueryOptions({
      engine: selectedProvider,
      cwd: composerSkillCwd,
      threadId: scratchThreadId,
      enabled:
        supportsPluginDiscovery(providerComposerCapabilitiesQuery.data) &&
        composerSkillCwd !== null,
    }),
  );
  const workspaceEntriesQuery = useQuery(
    projectSearchEntriesQueryOptions({
      cwd: selectedProjectCwd,
      query: effectiveMentionQuery,
      enabled: isMentionTrigger && !isLocalFolderBrowserOpen,
      limit: 80,
    }),
  );

  const workspaceEntries = workspaceEntriesQuery.data?.entries ?? EMPTY_PROJECT_ENTRIES;
  const providerPlugins =
    providerPluginsQuery.data?.marketplaces.flatMap((marketplace) =>
      marketplace.plugins.map((plugin) => ({
        plugin,
        mention: {
          name: plugin.name,
          path: `plugin://${plugin.name}@${marketplace.name}`,
        } satisfies EngineMentionReference,
      })),
    ) ?? EMPTY_COMPOSER_PLUGIN_SUGGESTIONS;
  const providerNativeCommands =
    providerCommandsQuery.data?.commands ?? EMPTY_PROVIDER_NATIVE_COMMANDS;
  const providerSkills = providerSkillsQuery.data?.skills ?? EMPTY_PROVIDER_SKILLS;
  const searchableModelOptions = buildSearchableModelOptions({
    engineOptions: ENGINE_MODEL_OPTIONS,
    modelOptionsByEngine,
    engineOrder,
    hiddenEngines,
    protectedProviders: [selectedProvider],
  });
  const dynamicAgents = selectedRuntimeAgents.map((agent) =>
    agent.description
      ? { name: agent.name, displayName: agent.displayName, description: agent.description }
      : { name: agent.name, displayName: agent.displayName },
  );
  const rawComposerMenuItems = useComposerCommandMenuItems({
    composerTrigger,
    engine: selectedProvider,
    providerPlugins,
    providerNativeCommands,
    providerSkills,
    workspaceEntries,
    searchableModelOptions,
    supportsFastSlashCommand: false,
    canOfferCompactCommand: false,
    canOfferReviewCommand: false,
    canOfferForkCommand: false,
    canOfferSideCommand: false,
    canOfferExportCommand: false,
    surfaceAppSlashCommands: KANBAN_SUPPORTED_APP_SLASH_COMMANDS,
    dynamicAgents,
  });
  const composerMenuItems = rawComposerMenuItems.filter(
    (item) =>
      item.type !== "slash-command" || KANBAN_SUPPORTED_APP_SLASH_COMMANDS.has(item.command),
  );
  const isComposerMenuLoading =
    (composerTriggerKind === "mention" &&
      ((mentionTriggerQuery.length > 0 && composerPathQueryDebouncer.state.isPending) ||
        workspaceEntriesQuery.isLoading ||
        workspaceEntriesQuery.isFetching ||
        providerPluginsQuery.isLoading ||
        providerPluginsQuery.isFetching)) ||
    (composerTriggerKind === "slash-command" &&
      (providerCommandsQuery.isLoading ||
        providerCommandsQuery.isFetching ||
        providerSkillsQuery.isLoading ||
        providerSkillsQuery.isFetching)) ||
    (composerTriggerKind === "skill" &&
      (providerComposerCapabilitiesQuery.isLoading ||
        providerComposerCapabilitiesQuery.isFetching ||
        providerSkillsQuery.isLoading ||
        providerSkillsQuery.isFetching));

  return {
    mentionTriggerQuery,
    isLocalFolderBrowserOpen,
    localFolderBrowseRootPath,
    composerMenuItems,
    isComposerMenuLoading,
  };
}
