import {
  SETTINGS_TARGETS,
  defineSettingsSearchPanel,
  defineSettingsSearchRow,
} from "../settingsSearchMetadata";

export const GENERAL_SETTINGS_SEARCH = {
  defaultEngine: defineSettingsSearchRow({
    id: "general:default-engine",
    titleKey: "settings.defaultEngine",
    keywords: "Choose the engine used for new chats. agent codex claude",
  }),
  newThreads: defineSettingsSearchRow({
    id: "general:new-threads",
    titleKey: "settings.newThreads",
    keywords:
      "Pick the default workspace mode for newly created draft threads. local worktree environment",
  }),
  projectOrder: defineSettingsSearchRow({
    id: "general:project-order",
    titleKey: "settings.projectOrder",
    keywords: "Controls how projects are arranged in the main sidebar. sort updated created manual",
  }),
  threadOrder: defineSettingsSearchRow({
    id: "general:thread-order",
    titleKey: "settings.threadOrder",
    keywords:
      "Controls how threads are arranged inside each project in the main sidebar. sort updated created",
  }),
  studioSection: defineSettingsSearchRow({
    id: "general:studio-section",
    titleKey: "nav.studio",
    keywords:
      "Show Studio in the Agent Chat Studio work surface menu. sidebar section content workspace outputs",
  }),
  environmentUsage: defineSettingsSearchRow({
    id: "general:environment-usage",
    titleKey: "settings.usageLabel",
    keywords: "Show the engine usage row in the chat Environment panel.",
  }),
  environmentRepository: defineSettingsSearchRow({
    id: "general:environment-repository",
    titleKey: "settings.repositoryLabel",
    keywords: "Show the GitHub repository link in the chat Environment panel. git changes worktree",
  }),
  gitWritingModel: defineSettingsSearchRow({
    id: "general:git-writing-model",
    titleKey: "settings.gitWritingModel",
    keywords:
      "Choose the model used to generate commit messages pull request titles and branch names.",
    target: SETTINGS_TARGETS.gitWritingModel,
  }),
  environmentPullRequest: defineSettingsSearchRow({
    id: "general:environment-pull-request",
    titleKey: "settings.pullRequest",
    keywords:
      "Show the open pull request CI checks and review comments in the chat Environment panel. pr fix github",
  }),
  environmentEditor: defineSettingsSearchRow({
    id: "general:environment-editor",
    titleKey: "settings.editor",
    keywords:
      "Show the Editor section in-app editor view and Open in editor picker in the chat Environment panel.",
  }),
  environmentRecap: defineSettingsSearchRow({
    id: "general:environment-recap",
    titleKey: "settings.recap",
    keywords: "Show the auto-generated chat recap in the Environment panel.",
  }),
  environmentPinned: defineSettingsSearchRow({
    id: "general:environment-pinned",
    titleKey: "settings.pinnedMessages",
    keywords: "Show the pinned-messages checklist in the Environment panel.",
  }),
  environmentMarkers: defineSettingsSearchRow({
    id: "general:environment-markers",
    titleKey: "settings.textMarkers",
    keywords: "Show highlighted and underlined transcript text in the Environment panel.",
  }),
  environmentNotepad: defineSettingsSearchRow({
    id: "general:environment-notepad",
    titleKey: "settings.notepad",
    keywords: "Show the per-thread notepad in the Environment panel.",
  }),
} as const;

export const APPEARANCE_SETTINGS_SEARCH = {
  theme: defineSettingsSearchRow({
    id: "appearance:theme",
    titleKey: "settings.theme",
    keywords: "Choose how Haros looks across the app. dark light system color",
    target: SETTINGS_TARGETS.theme,
  }),
  appIcon: defineSettingsSearchPanel({
    id: "appearance:app-icon",
    titleKey: "settings.appIcon",
    keywords: "Choose the icon Haros uses in the dock or taskbar desktop application logo.",
  }),
  customTitleBar: defineSettingsSearchPanel({
    id: "appearance:custom-title-bar",
    titleKey: "settings.customTitleBar",
    keywords:
      "frameless window system title bar Windows Linux caption controls minimize maximize close chrome",
  }),
  systemUiFont: defineSettingsSearchRow({
    id: "appearance:system-ui-font",
    titleKey: "settings.systemUiFont",
    keywords: "Use the operating system interface font throughout Haros.",
  }),
  uiDensity: defineSettingsSearchRow({
    id: "appearance:ui-density",
    titleKey: "settings.uiDensity",
    keywords:
      "Control spacing in the sidebar, composer, chat gutters, and settings rows without changing font size. compact comfortable",
  }),
  chatWidth: defineSettingsSearchRow({
    id: "appearance:chat-width",
    titleKey: "settings.chatWidth",
    keywords:
      "Control how wide the chat column grows so tables and wide content get more room. standard wide full",
  }),
  baseFontSize: defineSettingsSearchRow({
    id: "appearance:base-font-size",
    titleKey: "settings.baseFontSize",
    keywords:
      "Adjust the app text base in pixels. Chat and UI typography scale proportionally. font",
  }),
  terminalFontSize: defineSettingsSearchRow({
    id: "appearance:terminal-font-size",
    titleKey: "settings.terminalFontSize",
    keywords: "Adjust terminal text independently from the app and chat font size.",
  }),
  terminalFont: defineSettingsSearchRow({
    id: "appearance:terminal-font",
    titleKey: "settings.terminalFont",
    keywords:
      "Type any monospace font installed on this device e.g. Fira Code. system monospace family",
  }),
  fontSmoothing: defineSettingsSearchPanel({
    id: "appearance:font-smoothing",
    titleKey: "settings.fontSmoothing",
    keywords: "Use macOS-style antialiasing for lighter, crisper text rendering.",
  }),
  timeFormat: defineSettingsSearchRow({
    id: "appearance:time-format",
    titleKey: "settings.timeFormat",
    keywords:
      "System default follows your browser or OS clock preference. timestamp 12-hour 24-hour locale",
  }),
} as const;

export const BEHAVIOR_SETTINGS_SEARCH = {
  followUpBehavior: defineSettingsSearchRow({
    id: "behavior:follow-up-behavior",
    titleKey: "settings.followUpBehavior",
    keywords:
      "Choose whether messages sent during an active turn wait in the queue or steer the current run. Ctrl Cmd Enter opposite send",
  }),
  assistantOutput: defineSettingsSearchRow({
    id: "behavior:assistant-output",
    titleKey: "settings.assistantOutput",
    keywords: "Show token-by-token output while a response is in progress. streaming",
  }),
  diffLineWrapping: defineSettingsSearchRow({
    id: "behavior:diff-line-wrapping",
    titleKey: "settings.diffLineWrapping",
    keywords: "Set the default wrap state when the diff panel opens. word wrap",
  }),
  deleteConfirmation: defineSettingsSearchRow({
    id: "behavior:delete-confirmation",
    titleKey: "settings.deleteConfirmation",
    keywords: "Ask before deleting a thread and its chat history. safety confirm",
  }),
  archiveConfirmation: defineSettingsSearchRow({
    id: "behavior:archive-confirmation",
    titleKey: "settings.archiveConfirmation",
    keywords: "Ask before archiving a thread. safety confirm",
  }),
  terminalCloseConfirmation: defineSettingsSearchRow({
    id: "behavior:terminal-close-confirmation",
    titleKey: "settings.terminalCloseConfirmation",
    keywords: "Ask before closing a terminal tab and clearing its history. safety confirm",
  }),
} as const;
