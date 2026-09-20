import type { MessageKey } from "~/i18n";
import {
  BotIcon,
  ClockIcon,
  GitForkIcon,
  GitPullRequestIcon,
  GlobeIcon,
  KeyboardIcon,
  type LucideIcon,
} from "~/lib/icons";

export const HAROS_GUIDE_URL = "https://github.com/piai-lab/Haros/blob/main/docs/guide";

export interface TourCard {
  readonly id: string;
  readonly labelKey: MessageKey;
  readonly titleKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly highlightKeys: ReadonlyArray<MessageKey>;
  readonly docsHref: string;
  readonly icon: LucideIcon;
}

export const TOUR_CARDS: ReadonlyArray<TourCard> = [
  {
    id: "engines",
    labelKey: "firstRun.tourEnginesLabel",
    titleKey: "firstRun.tourEnginesTitle",
    descriptionKey: "firstRun.tourEnginesDescription",
    highlightKeys: [
      "firstRun.tourEnginesHighlight1",
      "firstRun.tourEnginesHighlight2",
      "firstRun.tourEnginesHighlight3",
    ],
    docsHref: `${HAROS_GUIDE_URL}/part-02-workbench/11-engines-models-and-options.md`,
    icon: BotIcon,
  },
  {
    id: "worktrees",
    labelKey: "firstRun.tourWorktreesLabel",
    titleKey: "firstRun.tourWorktreesTitle",
    descriptionKey: "firstRun.tourWorktreesDescription",
    highlightKeys: [
      "firstRun.tourWorktreesHighlight1",
      "firstRun.tourWorktreesHighlight2",
      "firstRun.tourWorktreesHighlight3",
    ],
    docsHref: `${HAROS_GUIDE_URL}/part-03-organize-work/22-sidechats-subagents-thread-hierarchy.md`,
    icon: GitForkIcon,
  },
  {
    id: "review",
    labelKey: "firstRun.tourReviewLabel",
    titleKey: "firstRun.tourReviewTitle",
    descriptionKey: "firstRun.tourReviewDescription",
    highlightKeys: [
      "firstRun.tourReviewHighlight1",
      "firstRun.tourReviewHighlight2",
      "firstRun.tourReviewHighlight3",
    ],
    docsHref: `${HAROS_GUIDE_URL}/part-04-capabilities/28-diffs-rollback-edit-resend.md`,
    icon: GitPullRequestIcon,
  },
  {
    id: "browser",
    labelKey: "firstRun.tourBrowserLabel",
    titleKey: "firstRun.tourBrowserTitle",
    descriptionKey: "firstRun.tourBrowserDescription",
    highlightKeys: [
      "firstRun.tourBrowserHighlight1",
      "firstRun.tourBrowserHighlight2",
      "firstRun.tourBrowserHighlight3",
    ],
    docsHref: `${HAROS_GUIDE_URL}/part-04-capabilities/30-browser-workflows-web-access.md`,
    icon: GlobeIcon,
  },
  {
    id: "automations",
    labelKey: "firstRun.tourAutomationsLabel",
    titleKey: "firstRun.tourAutomationsTitle",
    descriptionKey: "firstRun.tourAutomationsDescription",
    highlightKeys: [
      "firstRun.tourAutomationsHighlight1",
      "firstRun.tourAutomationsHighlight2",
      "firstRun.tourAutomationsHighlight3",
    ],
    docsHref: `${HAROS_GUIDE_URL}/part-04-capabilities/34-automations.md`,
    icon: ClockIcon,
  },
  {
    id: "shortcuts",
    labelKey: "firstRun.tourShortcutsLabel",
    titleKey: "firstRun.tourShortcutsTitle",
    descriptionKey: "firstRun.tourShortcutsDescription",
    highlightKeys: [],
    docsHref: `${HAROS_GUIDE_URL}/appendices/appendix-d-command-and-event-index.md`,
    icon: KeyboardIcon,
  },
];

export const TOUR_SHORTCUT_COMMANDS = [
  { command: "chat.new", labelKey: "firstRun.shortcutNewThread" },
  { command: "sidebar.addProject", labelKey: "firstRun.shortcutAddProject" },
  { command: "sidebar.search", labelKey: "firstRun.shortcutSearch" },
  { command: "terminal.toggle", labelKey: "firstRun.shortcutTerminal" },
  { command: "diff.toggle", labelKey: "firstRun.shortcutDiff" },
] as const;
