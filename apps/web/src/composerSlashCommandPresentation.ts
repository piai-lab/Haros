// FILE: composerSlashCommandPresentation.ts
// Purpose: Own the bilingual title, description, icon, and localized search projection for
//          OmniMind's canonical built-in composer slash commands.
// Layer: Web presentation

import type { BuiltInComposerSlashCommand } from "@omnimind/shared/composerSlashCommands";

import type { MessageKey } from "./i18n";
import {
  BotIcon,
  BrainIcon,
  BugIcon,
  ClockIcon,
  DownloadIcon,
  EraserIcon,
  FastModeIcon,
  GitForkIcon,
  GoalIcon,
  InfoIcon,
  ListTodoIcon,
  type LucideIcon,
  MessageCircleIcon,
  Minimize2,
  TemporaryThreadIcon,
} from "./lib/icons";
import {
  PROVIDER_DISCOVERY_SECONDARY_FIELD_WEIGHT,
  rankProviderDiscoveryItems,
} from "./lib/providerDiscovery";

interface BuiltInComposerSlashCommandPresentationDescriptor {
  readonly titleKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly icon: LucideIcon;
}

type Translate = (key: MessageKey) => string;

export const BUILT_IN_COMPOSER_SLASH_COMMAND_PRESENTATION = {
  clear: {
    titleKey: "composer.command.clear",
    descriptionKey: "composer.command.clearDescription",
    icon: EraserIcon,
  },
  compact: {
    titleKey: "composer.command.compact",
    descriptionKey: "composer.command.compactDescription",
    icon: Minimize2,
  },
  model: {
    titleKey: "term.model",
    descriptionKey: "composer.command.modelDescription",
    icon: BrainIcon,
  },
  plan: {
    titleKey: "composer.command.plan",
    descriptionKey: "composer.command.planDescription",
    icon: ListTodoIcon,
  },
  debug: {
    titleKey: "composer.command.debug",
    descriptionKey: "composer.command.debugDescription",
    icon: BugIcon,
  },
  default: {
    titleKey: "composer.command.default",
    descriptionKey: "composer.command.defaultDescription",
    icon: MessageCircleIcon,
  },
  review: {
    titleKey: "composer.command.review",
    descriptionKey: "composer.command.reviewDescription",
    icon: BugIcon,
  },
  fork: {
    titleKey: "composer.command.fork",
    descriptionKey: "composer.command.forkDescription",
    icon: GitForkIcon,
  },
  side: {
    titleKey: "composer.command.side",
    descriptionKey: "composer.command.sideDescription",
    icon: TemporaryThreadIcon,
  },
  status: {
    titleKey: "composer.command.status",
    descriptionKey: "composer.command.statusDescription",
    icon: InfoIcon,
  },
  subagents: {
    titleKey: "composer.command.subagents",
    descriptionKey: "composer.command.subagentsDescription",
    icon: BotIcon,
  },
  fast: {
    titleKey: "composer.command.fast",
    descriptionKey: "composer.command.fastDescription",
    icon: FastModeIcon,
  },
  export: {
    titleKey: "composer.command.export",
    descriptionKey: "composer.command.exportDescription",
    icon: DownloadIcon,
  },
  goal: {
    titleKey: "composer.command.goal",
    descriptionKey: "composer.command.goalDescription",
    icon: GoalIcon,
  },
  feedback: {
    titleKey: "composer.command.feedback",
    descriptionKey: "composer.command.feedbackDescription",
    icon: BugIcon,
  },
  automation: {
    titleKey: "composer.command.automation",
    descriptionKey: "composer.command.automationDescription",
    icon: ClockIcon,
  },
} satisfies Record<BuiltInComposerSlashCommand, BuiltInComposerSlashCommandPresentationDescriptor>;

export function resolveBuiltInComposerSlashCommandPresentation(
  command: BuiltInComposerSlashCommand,
  t: Translate,
): {
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
} {
  const descriptor = BUILT_IN_COMPOSER_SLASH_COMMAND_PRESENTATION[command];
  return {
    title: t(descriptor.titleKey),
    description: t(descriptor.descriptionKey),
    icon: descriptor.icon,
  };
}

export function builtInComposerSlashCommandIcon(command: BuiltInComposerSlashCommand): LucideIcon {
  return BUILT_IN_COMPOSER_SLASH_COMMAND_PRESENTATION[command].icon;
}

export function filterBuiltInComposerSlashCommands(
  query: string,
  commands: readonly BuiltInComposerSlashCommand[],
  t: Translate,
): BuiltInComposerSlashCommand[] {
  return rankProviderDiscoveryItems(commands, query, (command) => {
    const presentation = resolveBuiltInComposerSlashCommandPresentation(command, t);
    return [
      { value: command },
      { value: presentation.title, weight: PROVIDER_DISCOVERY_SECONDARY_FIELD_WEIGHT },
      { value: presentation.description, weight: PROVIDER_DISCOVERY_SECONDARY_FIELD_WEIGHT },
    ];
  });
}
