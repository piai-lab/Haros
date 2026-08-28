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
import { resolveEngineDiscoveryCwd } from "~/lib/engineDiscovery";
import {
  engineCommandsQueryOptions,
  engineComposerCapabilitiesQueryOptions,
  enginePluginsQueryOptions,
  engineSkillsQueryOptions,
  supportsNativeSlashCommandDiscovery,
  supportsPluginDiscovery,
  supportsSkillDiscovery,
} from "~/lib/engineDiscoveryReactQuery";
import { projectSearchEntriesQueryOptions } from "~/lib/projectReactQuery";
import { isMacPlatform } from "~/lib/utils";
import { ENGINE_MODEL_OPTIONS } from "../chat/EngineModelPicker";
import type { EngineModelOption } from "../../engineModelOptions";

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
  readonly selectedEngine: EngineKind;
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
    selectedEngine,
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
  const composerSkillCwd = resolveEngineDiscoveryCwd({
    activeThreadWorktreePath: null,
    activeProjectCwd: selectedProjectCwd,
    serverCwd,
  });

  const engineComposerCapabilitiesQuery = useQuery(
    engineComposerCapabilitiesQueryOptions(selectedEngine),
  );
  const engineCommandsQuery = useQuery(
    engineCommandsQueryOptions({
      engine: selectedEngine,
      cwd: composerSkillCwd,
      threadId: scratchThreadId,
      binaryPath:
        (selectedEngine === "opencode"
          ? engineOptionsForDispatch?.opencode?.binaryPath
          : selectedEngine === "kilo"
            ? engineOptionsForDispatch?.kilo?.binaryPath
            : null) ?? null,
      serverUrl:
        (selectedEngine === "opencode"
          ? engineOptionsForDispatch?.opencode?.serverUrl
          : selectedEngine === "kilo"
            ? engineOptionsForDispatch?.kilo?.serverUrl
            : null) ?? null,
      experimentalWebSockets:
        selectedEngine === "opencode"
          ? engineOptionsForDispatch?.opencode?.experimentalWebSockets
          : undefined,
      agentDir: selectedEngine === "pi" ? piAgentDir : null,
      enabled:
        (composerTriggerKind === "slash-command" || composerTriggerKind === "slash-model") &&
        supportsNativeSlashCommandDiscovery(engineComposerCapabilitiesQuery.data) &&
        composerSkillCwd !== null,
    }),
  );
  const canDiscoverEngineSkills =
    selectedEngine === "pi" || supportsSkillDiscovery(engineComposerCapabilitiesQuery.data);
  const engineSkillsQuery = useQuery(
    engineSkillsQueryOptions({
      engine: selectedEngine,
      cwd: composerSkillCwd,
      threadId: scratchThreadId,
      agentDir: selectedEngine === "pi" ? piAgentDir : null,
      enabled:
        (isSkillTrigger || composerTriggerKind === "slash-command" || selectedEngine === "pi") &&
        canDiscoverEngineSkills &&
        composerSkillCwd !== null,
    }),
  );
  const enginePluginsQuery = useQuery(
    enginePluginsQueryOptions({
      engine: selectedEngine,
      cwd: composerSkillCwd,
      threadId: scratchThreadId,
      enabled:
        supportsPluginDiscovery(engineComposerCapabilitiesQuery.data) && composerSkillCwd !== null,
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
  const enginePlugins =
    enginePluginsQuery.data?.marketplaces.flatMap((marketplace) =>
      marketplace.plugins.map((plugin) => ({
        plugin,
        mention: {
          name: plugin.name,
          path: `plugin://${plugin.name}@${marketplace.name}`,
        } satisfies EngineMentionReference,
      })),
    ) ?? EMPTY_COMPOSER_PLUGIN_SUGGESTIONS;
  const engineNativeCommands = engineCommandsQuery.data?.commands ?? EMPTY_PROVIDER_NATIVE_COMMANDS;
  const engineSkills = engineSkillsQuery.data?.skills ?? EMPTY_PROVIDER_SKILLS;
  const searchableModelOptions = buildSearchableModelOptions({
    engineOptions: ENGINE_MODEL_OPTIONS,
    modelOptionsByEngine,
    engineOrder,
    hiddenEngines,
    protectedEngines: [selectedEngine],
  });
  const dynamicAgents = selectedRuntimeAgents.map((agent) =>
    agent.description
      ? { name: agent.name, displayName: agent.displayName, description: agent.description }
      : { name: agent.name, displayName: agent.displayName },
  );
  const rawComposerMenuItems = useComposerCommandMenuItems({
    composerTrigger,
    engine: selectedEngine,
    enginePlugins,
    engineNativeCommands,
    engineSkills,
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
        enginePluginsQuery.isLoading ||
        enginePluginsQuery.isFetching)) ||
    (composerTriggerKind === "slash-command" &&
      (engineCommandsQuery.isLoading ||
        engineCommandsQuery.isFetching ||
        engineSkillsQuery.isLoading ||
        engineSkillsQuery.isFetching)) ||
    (composerTriggerKind === "skill" &&
      (engineComposerCapabilitiesQuery.isLoading ||
        engineComposerCapabilitiesQuery.isFetching ||
        engineSkillsQuery.isLoading ||
        engineSkillsQuery.isFetching));

  return {
    mentionTriggerQuery,
    isLocalFolderBrowserOpen,
    localFolderBrowseRootPath,
    composerMenuItems,
    isComposerMenuLoading,
  };
}
