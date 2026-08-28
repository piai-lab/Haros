import type {
  ProjectEntry,
  EngineAgentDescriptor,
  EngineNativeCommandDescriptor,
  EngineKind,
  EngineMentionReference,
  EnginePluginDescriptor,
  EngineSkillDescriptor,
} from "@harnessos/contracts";
import { getAgentMentionAutocompleteAliases } from "@harnessos/contracts";
import {
  buildCommandSearchFields,
  buildPluginSearchFields,
  buildSkillSearchFields,
  isInstalledEnginePlugin,
  normalizeEngineDiscoveryText,
  rankEngineDiscoveryItems,
} from "~/lib/engineDiscovery";
import {
  LOCAL_FOLDER_MENTION_NAME,
  matchesLocalFolderMentionShortcut,
} from "~/lib/localFolderMentions";
import { basenameOfPath } from "../file-icons";
import type { ComposerTrigger } from "../composer-logic";
import {
  getAvailableComposerSlashCommands,
  getEngineNativeSlashCommandSearchTerms,
  shouldHideEngineNativeCommandFromComposerMenu,
} from "../composerSlashCommands";
import {
  filterBuiltInComposerSlashCommands,
  resolveBuiltInComposerSlashCommandPresentation,
} from "../composerSlashCommandPresentation";
import { threadMentionPathForThreadId } from "@harnessos/shared/threadMentions";

import type { ComposerCommandItem } from "../components/chat/ComposerCommandMenu";
import type { EngineModelOption } from "../engineModelOptions";
import { compareEnginesByOrder } from "../engineOrdering";
import type { ComposerThreadMentionSource, Project } from "../types";
import { useI18n } from "~/i18n";

type ComposerPluginSuggestion = {
  plugin: EnginePluginDescriptor;
  mention: EngineMentionReference;
};

export type SearchableModelOption = {
  engine: EngineKind;
  engineLabel: string;
  slug: string;
  name: string;
  searchSlug: string;
  searchName: string;
  searchEngine: string;
  searchUpstreamProvider: string;
};

const THREAD_MENTION_SUGGESTION_LIMIT = 20;

type ThreadSuggestionCopy = {
  untitledTask: string;
  unknownProject: string;
  chat: string;
  untitledProject: string;
};

const DEFAULT_THREAD_SUGGESTION_COPY: ThreadSuggestionCopy = {
  untitledTask: "Untitled task",
  unknownProject: "Unknown project",
  chat: "Chat",
  untitledProject: "Untitled project",
};

function threadSuggestionTitle(title: string, copy: ThreadSuggestionCopy): string {
  return title.trim() || copy.untitledTask;
}

function threadSuggestionContainerName(
  project: Project | undefined,
  copy: ThreadSuggestionCopy,
): string {
  if (!project) return copy.unknownProject;
  if (project.kind === "chat" || project.kind === "studio") return copy.chat;
  return project.name.trim() || project.folderName.trim() || copy.untitledProject;
}

function threadSuggestionRecency(thread: ComposerThreadMentionSource): string {
  return thread.latestUserMessageAt ?? thread.lastVisitedAt ?? thread.createdAt;
}

interface ThreadMentionCandidate {
  readonly thread: ComposerThreadMentionSource;
  readonly title: string;
  readonly projectName: string;
  readonly mentionName: string;
}

function mentionNameKey(value: string): string {
  return value.trim().toLowerCase();
}

function makeUniqueMentionName(input: {
  readonly preferredName: string;
  readonly threadId: string;
  readonly reservedNames: ReadonlySet<string>;
  readonly usedNames: ReadonlySet<string>;
}): string {
  let attempt = 0;
  while (true) {
    const suffix =
      attempt === 0
        ? input.threadId.slice(-6) || input.threadId
        : attempt === 1
          ? input.threadId
          : `${input.threadId}:${attempt}`;
    const candidate = `${input.preferredName} (${suffix})`;
    const key = mentionNameKey(candidate);
    if (!input.reservedNames.has(key) && !input.usedNames.has(key)) {
      return candidate;
    }
    attempt += 1;
  }
}

// Mention tokens/chips resolve back to their reference by name, so two chats
// sharing a title would be indistinguishable once inserted (wrong engine
// icon, ambiguous context). Build friendly project-qualified names first, then
// guarantee uniqueness across the final serialized names with a stable id suffix.
function withDisambiguatedMentionNames(
  candidates: ReadonlyArray<Omit<ThreadMentionCandidate, "mentionName">>,
): ThreadMentionCandidate[] {
  const titleCounts = new Map<string, number>();
  const qualifiedCounts = new Map<string, number>();
  for (const candidate of candidates) {
    titleCounts.set(candidate.title, (titleCounts.get(candidate.title) ?? 0) + 1);
  }
  for (const candidate of candidates) {
    if ((titleCounts.get(candidate.title) ?? 0) > 1) {
      const qualified = `${candidate.title} (${candidate.projectName})`;
      qualifiedCounts.set(qualified, (qualifiedCounts.get(qualified) ?? 0) + 1);
    }
  }
  const preferredCandidates = candidates.map((candidate) => {
    const qualified = `${candidate.title} (${candidate.projectName})`;
    const preferredName =
      (titleCounts.get(candidate.title) ?? 0) <= 1
        ? candidate.title
        : (qualifiedCounts.get(qualified) ?? 0) > 1
          ? `${candidate.title} (${candidate.projectName}, ${candidate.thread.id.slice(-6)})`
          : qualified;
    return {
      thread: candidate.thread,
      title: candidate.title,
      projectName: candidate.projectName,
      preferredName,
    };
  });
  const preferredNameCounts = new Map<string, number>();
  for (const candidate of preferredCandidates) {
    const key = mentionNameKey(candidate.preferredName);
    preferredNameCounts.set(key, (preferredNameCounts.get(key) ?? 0) + 1);
  }
  const reservedNames = new Set(preferredNameCounts.keys());
  const usedNames = new Set<string>();

  return preferredCandidates.map((candidate) => {
    const preferredKey = mentionNameKey(candidate.preferredName);
    const mentionName =
      (preferredNameCounts.get(preferredKey) ?? 0) === 1 && !usedNames.has(preferredKey)
        ? candidate.preferredName
        : makeUniqueMentionName({
            preferredName: candidate.preferredName,
            threadId: candidate.thread.id,
            reservedNames,
            usedNames,
          });
    usedNames.add(mentionNameKey(mentionName));
    return {
      thread: candidate.thread,
      title: candidate.title,
      projectName: candidate.projectName,
      mentionName,
    };
  });
}

export function buildThreadMentionComposerItems(input: {
  readonly threads: readonly ComposerThreadMentionSource[];
  readonly projects: readonly Project[];
  readonly currentThreadId: string | null;
  readonly query: string;
  readonly copy?: ThreadSuggestionCopy;
}): ComposerCommandItem[] {
  const copy = input.copy ?? DEFAULT_THREAD_SUGGESTION_COPY;
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const candidates = withDisambiguatedMentionNames(
    input.threads
      .filter(
        (thread) => thread.id !== input.currentThreadId && (thread.archivedAt ?? null) === null,
      )
      .map((thread) => ({
        thread,
        title: threadSuggestionTitle(thread.title, copy),
        projectName: threadSuggestionContainerName(projectById.get(thread.projectId), copy),
      })),
  );
  const query = normalizeEngineDiscoveryText(input.query);
  const ranked = (
    query
      ? rankEngineDiscoveryItems(candidates, query, ({ title }) => [{ value: title }])
      : candidates.toSorted((left, right) =>
          threadSuggestionRecency(right.thread).localeCompare(threadSuggestionRecency(left.thread)),
        )
  ).slice(0, THREAD_MENTION_SUGGESTION_LIMIT);

  return ranked.map(({ thread, title, projectName, mentionName }) => ({
    id: `thread:${thread.id}`,
    type: "thread" as const,
    threadId: thread.id,
    engine: thread.engine,
    mention: { name: mentionName, path: threadMentionPathForThreadId(thread.id) },
    label: title,
    description: projectName,
  }));
}

export function buildSearchableModelOptions(input: {
  engineOptions: ReadonlyArray<{ value: EngineKind; label: string }>;
  modelOptionsByEngine: Record<EngineKind, ReadonlyArray<EngineModelOption>>;
  engineOrder: readonly EngineKind[];
  hiddenEngines: readonly EngineKind[];
  protectedEngines: readonly EngineKind[];
  lockedEngine?: EngineKind | null;
}): SearchableModelOption[] {
  const hiddenEngineSet = new Set(input.hiddenEngines);
  const protectedEngineSet = new Set(input.protectedEngines);
  return input.engineOptions
    .toSorted((left, right) => compareEnginesByOrder(input.engineOrder, left.value, right.value))
    .filter((option) =>
      input.lockedEngine
        ? option.value === input.lockedEngine
        : protectedEngineSet.has(option.value) || !hiddenEngineSet.has(option.value),
    )
    .flatMap((option) =>
      input.modelOptionsByEngine[option.value].map(
        ({ slug, name, upstreamProviderId, upstreamProviderName }) => ({
          engine: option.value,
          engineLabel: option.label,
          slug,
          name,
          searchSlug: slug.toLowerCase(),
          searchName: name.toLowerCase(),
          searchEngine: option.label.toLowerCase(),
          searchUpstreamProvider: (upstreamProviderName ?? upstreamProviderId ?? "").toLowerCase(),
        }),
      ),
    );
}

export function useComposerCommandMenuItems(input: {
  composerTrigger: ComposerTrigger | null;
  engine: EngineKind;
  enginePlugins: readonly ComposerPluginSuggestion[];
  engineNativeCommands: readonly EngineNativeCommandDescriptor[];
  engineSkills: readonly EngineSkillDescriptor[];
  workspaceEntries: readonly ProjectEntry[];
  searchableModelOptions: readonly SearchableModelOption[];
  supportsFastSlashCommand: boolean;
  canOfferCompactCommand: boolean;
  canOfferReviewCommand: boolean;
  canOfferForkCommand: boolean;
  canOfferSideCommand: boolean;
  canOfferExportCommand: boolean;
  surfaceAppSlashCommands?: ReadonlySet<string>;
  dynamicAgents: readonly EngineAgentDescriptor[];
  threadMentionSources?: {
    readonly threads: readonly ComposerThreadMentionSource[];
    readonly projects: readonly Project[];
    readonly currentThreadId: string | null;
  };
}): ComposerCommandItem[] {
  const { t } = useI18n();
  const {
    composerTrigger,
    engine,
    enginePlugins,
    engineNativeCommands,
    engineSkills,
    workspaceEntries,
    searchableModelOptions,
    supportsFastSlashCommand,
    canOfferCompactCommand,
    canOfferReviewCommand,
    canOfferForkCommand,
    canOfferSideCommand,
    canOfferExportCommand,
    surfaceAppSlashCommands,
    dynamicAgents,
    threadMentionSources,
  } = input;

  if (!composerTrigger) return [];

  // Keep trigger-specific discovery outside ChatView so the view mostly orchestrates state.
  if (composerTrigger.kind === "mention") {
    const query = normalizeEngineDiscoveryText(composerTrigger.query);

    const agentItems: ComposerCommandItem[] = (() => {
      // Use dynamic agents when available, fallback to static
      if (dynamicAgents.length > 0) {
        return rankEngineDiscoveryItems(dynamicAgents, query, ({ name, displayName }) => [
          { value: name },
          { value: displayName },
        ]).map(({ name, displayName }) => ({
          id: `agent:${engine}:${name}`,
          type: "agent" as const,
          engine,
          alias: name,
          color: "violet" as const,
          label: `@${name}`,
          description: displayName,
        }));
      }
      // Static fallback
      return rankEngineDiscoveryItems(
        getAgentMentionAutocompleteAliases(engine),
        query,
        ({ alias, displayName }) => [{ value: alias }, { value: displayName }],
      ).map(({ alias, displayName, color }) => ({
        id: `agent:${engine}:${alias}`,
        type: "agent" as const,
        engine,
        alias,
        color,
        label: `@${alias}`,
        description: displayName,
      }));
    })();

    const pluginItems = rankEngineDiscoveryItems(
      enginePlugins.filter(({ plugin }) => isInstalledEnginePlugin(plugin)),
      query,
      ({ plugin }) => buildPluginSearchFields(plugin),
    ).map(({ plugin, mention }) => ({
      id: `plugin:${plugin.id}`,
      type: "plugin" as const,
      plugin,
      mention,
      label: plugin.interface?.displayName ?? plugin.name,
      description: plugin.interface?.shortDescription ?? plugin.source.path,
    }));
    const localRootItems =
      matchesLocalFolderMentionShortcut(composerTrigger.query) && composerTrigger.query !== "/"
        ? [
            {
              id: "local-root",
              type: "local-root" as const,
              label: `@${LOCAL_FOLDER_MENTION_NAME}`,
              description: t("composer.command.browseLocalFolders"),
            },
          ]
        : [];
    const pathItems = workspaceEntries.map((entry) => ({
      id: `path:${entry.kind}:${entry.path}`,
      type: "path" as const,
      path: entry.path,
      pathKind: entry.kind,
      label: basenameOfPath(entry.path),
      description: entry.parentPath ?? "",
    }));
    const threadItems = threadMentionSources
      ? buildThreadMentionComposerItems({
          ...threadMentionSources,
          query: composerTrigger.query,
          copy: {
            untitledTask: t("composer.command.untitledTask"),
            unknownProject: t("composer.command.unknownProject"),
            chat: "Chat",
            untitledProject: t("composer.command.untitledProject"),
          },
        })
      : [];
    // Keep mention suggestions ordered by primary intent: plugins and chats
    // first, then local context, then subagent delegation targets.
    return [...pluginItems, ...threadItems, ...localRootItems, ...pathItems, ...agentItems];
  }

  if (composerTrigger.kind === "slash-command") {
    const query = normalizeEngineDiscoveryText(composerTrigger.query);
    const availableCommands = getAvailableComposerSlashCommands({
      engine,
      supportsFastSlashCommand,
      canOfferCompactCommand,
      canOfferReviewCommand,
      canOfferForkCommand,
      canOfferSideCommand,
      canOfferExportCommand,
      engineNativeCommandNames: engineNativeCommands.map((command) => command.name),
    });
    const visibleAppCommands = surfaceAppSlashCommands
      ? availableCommands.filter((command) => surfaceAppSlashCommands.has(command))
      : availableCommands;
    const visibleAppCommandSet = new Set(visibleAppCommands);
    const builtInItems = filterBuiltInComposerSlashCommands(
      composerTrigger.query,
      visibleAppCommands,
      t,
    ).map((command) => {
      const presentation = resolveBuiltInComposerSlashCommandPresentation(command, t);
      return {
        id: `slash:${command}`,
        type: "slash-command" as const,
        command,
        label: `/${command}`,
        description: presentation.description,
      };
    });
    const engineCommandItems = engineNativeCommands
      .filter(
        (command) =>
          !shouldHideEngineNativeCommandFromComposerMenu(engine, command.name, {
            availableAppCommands: visibleAppCommandSet,
          }),
      )
      .map((command) => ({
        command,
        aliasFields: getEngineNativeSlashCommandSearchTerms(engine, command.name).map((term) => ({
          value: term,
        })),
      }));
    const rankedEngineCommandItems = rankEngineDiscoveryItems(
      engineCommandItems,
      query,
      ({ command, aliasFields }) => [...aliasFields, ...buildCommandSearchFields(command)],
    ).map(({ command }) => ({
      id: `engine-command:${engine}:${command.name}`,
      type: "engine-native-command" as const,
      engine,
      command: command.name,
      label: `/${command.name}`,
      description: command.description ?? t("composer.command.nativeDescription", { engine }),
    }));
    // `/` is the universal picker surface; engine dispatch can adapt the
    // visible slash token to backend-specific skill syntax when needed.
    const skillItems: ComposerCommandItem[] = rankEngineDiscoveryItems(
      engineSkills,
      query,
      buildSkillSearchFields,
    ).map((skill) => ({
      id: `skill:${skill.path}`,
      type: "skill" as const,
      skill,
      label: skill.interface?.displayName ?? skill.name,
      description: skill.interface?.shortDescription ?? skill.description ?? skill.path,
    }));
    return [...builtInItems, ...rankedEngineCommandItems, ...skillItems];
  }

  if (composerTrigger.kind === "skill") {
    const query = normalizeEngineDiscoveryText(composerTrigger.query);
    return rankEngineDiscoveryItems(engineSkills, query, buildSkillSearchFields).map((skill) => ({
      id: `skill:${skill.path}`,
      type: "skill" as const,
      skill,
      label: skill.interface?.displayName ?? skill.name,
      description: skill.interface?.shortDescription ?? skill.description ?? skill.path,
    }));
  }

  return rankEngineDiscoveryItems(searchableModelOptions, composerTrigger.query, (option) => [
    { value: option.name },
    { value: option.slug },
    { value: option.searchName },
    { value: option.searchSlug },
    { value: option.engineLabel, weight: 200 },
    { value: option.searchEngine, weight: 200 },
    { value: option.searchUpstreamProvider, weight: 200 },
  ]).map(({ engine, engineLabel, slug, name }) => ({
    id: `model:${engine}:${slug}`,
    type: "model" as const,
    engine,
    model: slug,
    label: name,
    description: `${engineLabel} · ${slug}`,
  }));
}
