import { SETTINGS_TARGETS, defineSettingsSearchRow } from "../settingsSearchMetadata";

export const PROVIDERS_SETTINGS_SEARCH = {
  automaticCliUpdateChecks: defineSettingsSearchRow({
    id: "providers:automatic-cli-update-checks",
    titleKey: "settings.automaticCliUpdates",
    keywords:
      "Check Codex Claude and other provider CLIs for newer versions in the background. updates upgrade disable nags",
  }),
  visibleProviders: defineSettingsSearchRow({
    id: "providers:visible-providers",
    titleKey: "settings.visibleProviders",
    keywords:
      "Drag providers into your preferred picker order and hide the ones you don't use. visibility order",
  }),
  providerUpdates: defineSettingsSearchRow({
    id: "providers:provider-updates",
    titleKey: "settings.providerUpdates",
    keywords: "Update installed provider tools that OmniMind can safely update. upgrade cli",
    target: SETTINGS_TARGETS.providerUpdates,
  }),
  installedClis: defineSettingsSearchRow({
    id: "providers:installed-clis",
    titleKey: "settings.installedClis",
    keywords:
      "Review engine versions, paths, update tools, independent engine models, and custom model slugs. add remove reset binary overrides install",
    target: SETTINGS_TARGETS.engineDetails,
  }),
} as const;
