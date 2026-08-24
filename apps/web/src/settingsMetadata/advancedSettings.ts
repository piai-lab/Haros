import { defineSettingsSearchRow } from "../settingsSearchMetadata";

export const ADVANCED_SETTINGS_SEARCH = {
  keybindings: defineSettingsSearchRow({
    id: "advanced:keybindings",
    titleKey: "settings.keybindings",
    keywords:
      "Open the persisted keybindings.json file to edit advanced bindings directly. shortcuts",
  }),
  recoveryTools: defineSettingsSearchRow({
    id: "advanced:recovery-tools",
    titleKey: "settings.recoveryTools",
    keywords:
      "Rebuild local project indexes without clearing existing chats when the local state gets out of sync.",
  }),
  version: defineSettingsSearchRow({
    id: "advanced:version",
    titleKey: "settings.version",
    keywords: "Current application version. about",
  }),
  releaseHistory: defineSettingsSearchRow({
    id: "advanced:release-history",
    titleKey: "settings.releaseHistory",
    keywords:
      "A running log of every update, newest first. changelog what's new about release notes",
  }),
} as const;
