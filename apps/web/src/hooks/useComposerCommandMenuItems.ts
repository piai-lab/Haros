import type {
  ProjectEntry,
  ProviderMentionReference,
} from "@omnimind/contracts";
import {
  normalizeSearchText,
  rankSearchItems,
} from "~/lib/searchRanking";
import {
  LOCAL_FOLDER_MENTION_NAME,
  matchesLocalFolderMentionShortcut,
} from "~/lib/localFolderMentions";
import { basenameOfPath } from "../file-icons";
import type { ComposerTrigger } from "../composer-logic";
import {
  filterComposerSlashCommands,
  getAvailableComposerSlashCommands,
} from "../composerSlashCommands";
import { threadMentionPathForThreadId } from "@omnimind/shared/threadMentions";

import type { ComposerCommandItem } from "../components/chat/ComposerCommandMenu";
import type { ComposerThreadMentionSource, Project } from "../types";

const THREAD_MENTION_SUGGESTION_LIMIT = 20;

function threadSuggestionTitle(title: string): string {
  return title.trim() || "Untitled thread";
}

function threadSuggestionContainerName(project: Project | undefined): string {
  if (!project) return "Unknown project";
  if (project.kind === "chat") return "Chats";
  if (project.kind === "studio") return "Studio";
  return project.name.trim() || project.folderName.trim() || "Untitled project";
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
// sharing a title would be indistinguishable once inserted (wrong provider
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
}): ComposerCommandItem[] {
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const candidates = withDisambiguatedMentionNames(
    input.threads
      .filter(
        (thread) => thread.id !== input.currentThreadId && (thread.archivedAt ?? null) === null,
      )
      .map((thread) => ({
        thread,
        title: threadSuggestionTitle(thread.title),
        projectName: threadSuggestionContainerName(projectById.get(thread.projectId)),
      })),
  );
  const query = normalizeSearchText(input.query);
  const ranked = (
    query
      ? rankSearchItems(candidates, query, ({ title }) => [{ value: title }])
      : candidates.toSorted((left, right) =>
          threadSuggestionRecency(right.thread).localeCompare(threadSuggestionRecency(left.thread)),
        )
  ).slice(0, THREAD_MENTION_SUGGESTION_LIMIT);

  return ranked.map(({ thread, title, projectName, mentionName }) => ({
    id: `thread:${thread.id}`,
    type: "thread" as const,
    threadId: thread.id,
    provider: thread.provider,
    mention: { name: mentionName, path: threadMentionPathForThreadId(thread.id) },
    label: title,
    description: projectName,
  }));
}

export function useComposerCommandMenuItems(input: {
  composerTrigger: ComposerTrigger | null;
  workspaceEntries: readonly ProjectEntry[];
  canOfferExportCommand: boolean;
  surfaceAppSlashCommands?: ReadonlySet<string>;
  threadMentionSources?: {
    readonly threads: readonly ComposerThreadMentionSource[];
    readonly projects: readonly Project[];
    readonly currentThreadId: string | null;
  };
}): ComposerCommandItem[] {
  const {
    composerTrigger,
    workspaceEntries,
    canOfferExportCommand,
    surfaceAppSlashCommands,
    threadMentionSources,
  } = input;

  if (!composerTrigger) return [];

  // Keep trigger-specific discovery outside ChatView so the view mostly orchestrates state.
  if (composerTrigger.kind === "mention") {
    const localRootItems =
      matchesLocalFolderMentionShortcut(composerTrigger.query) && composerTrigger.query !== "/"
        ? [
            {
              id: "local-root",
              type: "local-root" as const,
              label: `@${LOCAL_FOLDER_MENTION_NAME}`,
              description: "Browse folders on this computer",
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
        })
      : [];
    return [...threadItems, ...localRootItems, ...pathItems];
  }

  if (composerTrigger.kind === "slash-command") {
    const availableCommands = getAvailableComposerSlashCommands({
      canOfferExportCommand,
    });
    const visibleAppCommands = surfaceAppSlashCommands
      ? availableCommands.filter((command) => surfaceAppSlashCommands.has(command))
      : availableCommands;
    return filterComposerSlashCommands(composerTrigger.query, visibleAppCommands).map(
      (definition) => ({
        id: `slash:${definition.command}`,
        type: "slash-command" as const,
        command: definition.command,
        label: definition.label,
        description: definition.description,
        source: definition.source,
      }),
    );
  }

  return [];
}
