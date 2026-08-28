import { SETTINGS_TARGETS, defineSettingsSearchRow } from "../settingsSearchMetadata";

export const PROMPTS_SETTINGS_SEARCH = {
  defaultPrompt: defineSettingsSearchRow({
    id: "prompts:default-prompt",
    titleKey: "settings.defaultPrompt",
    keywords: "HarnessOS Agent prompt default instructions foundation restore",
    target: SETTINGS_TARGETS.defaultPrompt,
  }),
  customRules: defineSettingsSearchRow({
    id: "prompts:custom-rules",
    titleKey: "settings.customRules",
    keywords: "HarnessOS Agent personal preferences global rules instructions",
    target: SETTINGS_TARGETS.customRules,
  }),
} as const;
