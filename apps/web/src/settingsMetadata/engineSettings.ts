import { SETTINGS_TARGETS, defineSettingsSearchRow } from "../settingsSearchMetadata";

export const PROVIDERS_SETTINGS_SEARCH = {
  automaticCliUpdateChecks: defineSettingsSearchRow({
    id: "engines:automatic-cli-update-checks",
    titleKey: "settings.automaticCliUpdates",
    keywords:
      "Check Codex Claude and other engine CLIs for newer versions in the background. updates upgrade disable nags",
  }),
  visibleEngines: defineSettingsSearchRow({
    id: "engines:visible-engines",
    titleKey: "settings.visibleEngines",
    keywords:
      "Drag engines into your preferred picker order and hide the ones you don't use. visibility order",
  }),
  engineUpdates: defineSettingsSearchRow({
    id: "engines:engine-updates",
    titleKey: "settings.engineUpdates",
    keywords: "Update installed engine tools that HarnessOS can safely update. upgrade cli",
    target: SETTINGS_TARGETS.engineUpdates,
  }),
  installedClis: defineSettingsSearchRow({
    id: "engines:installed-clis",
    titleKey: "settings.installedClis",
    keywords:
      "Review engine versions, paths, update tools, independent engine models, and custom model slugs. add remove reset binary overrides install",
    target: SETTINGS_TARGETS.engineDetails,
  }),
} as const;
