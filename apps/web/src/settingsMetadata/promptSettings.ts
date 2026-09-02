import { SETTINGS_TARGETS, defineSettingsSearchRow } from "../settingsSearchMetadata";

export const PROMPTS_SETTINGS_SEARCH = {
  personalStrategy: defineSettingsSearchRow({
    id: "prompts:personal-strategy",
    titleKey: "settings.personalStrategy",
    keywords: "OA Agent personal strategy preferences global rules instructions",
    target: SETTINGS_TARGETS.personalStrategy,
  }),
} as const;
