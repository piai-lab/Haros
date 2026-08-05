import type { GitBranch } from "@omnimind/contracts";
import {
  BUILT_IN_COMPOSER_SLASH_COMMANDS,
  isBuiltInComposerSlashCommandName,
  normalizeComposerSlashCommandName,
  type BuiltInComposerSlashCommand,
} from "@omnimind/shared/composerSlashCommands";
import { rankSearchItems } from "./lib/searchRanking";

export { BUILT_IN_COMPOSER_SLASH_COMMANDS };

export type ComposerSlashCommand = BuiltInComposerSlashCommand;

export interface ComposerSlashCommandDefinition {
  command: ComposerSlashCommand;
  label: `/${ComposerSlashCommand}`;
  description: string;
  source: "app" | "shared";
}

export interface ComposerSlashInvocation {
  command: ComposerSlashCommand;
  args: string;
}

const COMPOSER_SLASH_COMMAND_DEFINITIONS: Record<
  ComposerSlashCommand,
  ComposerSlashCommandDefinition
> = {
  clear: {
    command: "clear",
    label: "/clear",
    description: "Start a fresh thread and clear the current conversation context",
    source: "shared",
  },
  model: {
    command: "model",
    label: "/model",
    description: "Switch response model for this thread",
    source: "shared",
  },
  plan: {
    command: "plan",
    label: "/plan",
    description: "Switch this thread into plan mode",
    source: "app",
  },
  default: {
    command: "default",
    label: "/default",
    description: "Switch this thread back to normal chat mode",
    source: "app",
  },
  status: {
    command: "status",
    label: "/status",
    description: "Show context usage and rate-limit status",
    source: "app",
  },
  subagents: {
    command: "subagents",
    label: "/subagents",
    description: "Insert a prompt that asks the assistant to delegate work",
    source: "app",
  },
  export: {
    command: "export",
    label: "/export",
    description: "Download this thread as a ZIP archive (thread.json + transcript.md)",
    source: "app",
  },
  feedback: {
    command: "feedback",
    label: "/feedback",
    description: "Send feedback to the OmniMind team",
    source: "app",
  },
  automation: {
    command: "automation",
    label: "/automation",
    description: "Create a scheduled automation from this prompt",
    source: "app",
  },
};

export function isBuiltInComposerSlashCommand(value: string): value is ComposerSlashCommand {
  return isBuiltInComposerSlashCommandName(value);
}

export function parseComposerSlashInvocation(text: string): ComposerSlashInvocation | null {
  return parseComposerSlashInvocationForCommands(text, BUILT_IN_COMPOSER_SLASH_COMMANDS);
}

export function parseComposerSlashInvocationForCommands(
  text: string,
  commands: ReadonlyArray<ComposerSlashCommand>,
): ComposerSlashInvocation | null {
  const match = /^\/([a-z-]+)(?:\s+(.*))?$/i.exec(text.trim());
  if (!match) {
    return null;
  }
  const command = normalizeComposerSlashCommandName(match[1] ?? "");
  if (!command || !commands.includes(command as ComposerSlashCommand)) {
    return null;
  }
  return {
    command: command as ComposerSlashCommand,
    args: (match[2] ?? "").trim(),
  };
}

export function filterComposerSlashCommands(
  query: string,
  commands: ReadonlyArray<ComposerSlashCommand> = BUILT_IN_COMPOSER_SLASH_COMMANDS,
): ComposerSlashCommandDefinition[] {
  const matches = rankSearchItems(commands, query, (command) => {
    const definition = COMPOSER_SLASH_COMMAND_DEFINITIONS[command];
    return [
      { value: command },
      { value: definition.label.slice(1) },
      { value: definition.description, weight: 200 },
    ];
  });

  return matches.map((command) => COMPOSER_SLASH_COMMAND_DEFINITIONS[command]);
}

export function buildSubagentsPrompt(existingPrompt: string): string {
  const cannedPrompt =
    "Run subagents for different tasks. Delegate distinct work in parallel when helpful and then synthesize the results.";
  const trimmedPrompt = existingPrompt.trim();
  return trimmedPrompt.length > 0 ? `${trimmedPrompt}\n\n${cannedPrompt}` : cannedPrompt;
}

export function resolveComposerSlashRootBranch(input: {
  branches: ReadonlyArray<GitBranch> | null | undefined;
  activeProjectCwd: string | null | undefined;
  activeThreadBranch: string | null | undefined;
}): string | null {
  return (
    input.branches?.find(
      (branch) =>
        branch.current === true &&
        (branch.worktreePath === null ||
          branch.worktreePath === undefined ||
          branch.worktreePath === input.activeProjectCwd),
    )?.name ??
    input.branches?.find((branch) => branch.current === true)?.name ??
    input.activeThreadBranch ??
    null
  );
}

export function getAvailableComposerSlashCommands(input: {
  canOfferExportCommand: boolean;
}): ComposerSlashCommand[] {
  return [
    "clear",
    "model",
    "plan",
    "default",
    "status",
    "subagents",
    ...(input.canOfferExportCommand ? (["export"] as const) : []),
    "feedback",
    "automation",
  ];
}
