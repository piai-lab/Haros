// FILE: interactionModePresentation.ts
// Purpose: Own the exhaustive visible projection of active non-default interaction modes.
// Layer: Web presentation

import type { ProviderInteractionMode } from "@omnimind/contracts";

import type { MessageKey } from "./i18n";
import { BugIcon, ConvergeIcon, LearnIcon, ListTodoIcon, type LucideIcon } from "./lib/icons";

export interface ActiveInteractionModePresentation {
  readonly badgeKey: MessageKey;
  readonly exitTitleKey: MessageKey;
  readonly icon: LucideIcon;
}

const ACTIVE_INTERACTION_MODE_PRESENTATION = {
  plan: {
    badgeKey: "plan.badge",
    exitTitleKey: "conversation.planModeExit",
    icon: ListTodoIcon,
  },
  debug: {
    badgeKey: "debug.badge",
    exitTitleKey: "conversation.debugModeExit",
    icon: BugIcon,
  },
  converge: {
    badgeKey: "converge.badge",
    exitTitleKey: "conversation.convergeModeExit",
    icon: ConvergeIcon,
  },
  learn: {
    badgeKey: "learn.badge",
    exitTitleKey: "conversation.learnModeExit",
    icon: LearnIcon,
  },
} as const satisfies Record<
  Exclude<ProviderInteractionMode, "default">,
  ActiveInteractionModePresentation
>;

export function activeInteractionModePresentation(
  interactionMode: ProviderInteractionMode,
): ActiveInteractionModePresentation | null {
  return interactionMode === "default"
    ? null
    : ACTIVE_INTERACTION_MODE_PRESENTATION[interactionMode];
}
