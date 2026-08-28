import type { MessageKey } from "./i18n";

export type OwnedSettingsSearchRecord = {
  readonly id: string;
  readonly titleKey: MessageKey;
  readonly keywords: string;
  readonly target: string | null;
};

type SearchRecordInput<Id extends string> = {
  readonly id: Id;
  readonly titleKey: MessageKey;
  readonly keywords: string;
};

function stableSettingsRowTarget(recordId: string): string {
  return `setting-${recordId.replace(/:/g, "-")}`;
}

/** Declare an exact, locale-independent row target in the row's Settings domain. */
export function defineSettingsSearchRow<const Id extends string>(
  record: SearchRecordInput<Id> & { readonly target?: string },
): SearchRecordInput<Id> & { readonly target: string } {
  return {
    ...record,
    target: record.target ?? stableSettingsRowTarget(record.id),
  };
}

/** Declare a searchable panel or conditional row that cannot promise an exact DOM target. */
export function defineSettingsSearchPanel<const Id extends string>(
  record: SearchRecordInput<Id>,
): SearchRecordInput<Id> & { readonly target: null } {
  return { ...record, target: null };
}

/**
 * Deep-link targets with an existing external/shared contract. Keep these bytes stable while
 * visible product copy and search terms evolve independently.
 */
export const SETTINGS_TARGETS = {
  engineUpdates: "engine-updates",
  engineDetails: "setting-installed-clis",
  environmentPanel: "environment-panel",
  gitWritingModel: "setting-git-writing-model",
  theme: "setting-theme",
  defaultPrompt: "setting-default-prompt",
  customRules: "setting-custom-rules",
} as const;
