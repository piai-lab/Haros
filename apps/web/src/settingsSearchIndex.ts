// FILE: settingsSearchIndex.ts
// Purpose: Aggregate and rank Settings-owned search metadata without owning row identity.
// Layer: Route/UI support

import type { MessageKey } from "./i18n";
import { rankProviderDiscoveryItems } from "./lib/engineDiscovery";
import {
  SETTINGS_NAV_ITEMS,
  SETTINGS_SECTION_BY_ID,
  type SettingsSectionId,
} from "./settingsNavigation";
import type { OwnedSettingsSearchRecord } from "./settingsSearchMetadata";

export interface SettingsSearchRecord extends OwnedSettingsSearchRecord {
  readonly section: SettingsSectionId;
}

export interface SettingsSearchEntry extends SettingsSearchRecord {
  readonly title: string;
}

/** Narrow projection of section- and row-owned metadata for sidebar search. */
export const SETTINGS_SEARCH_RECORDS: readonly SettingsSearchRecord[] = SETTINGS_NAV_ITEMS.flatMap(
  (section) => section.searchRecords.map((record) => ({ ...record, section: section.id })),
);

export type SettingsSearchRecordId = (typeof SETTINGS_SEARCH_RECORDS)[number]["id"];

/** DOM id a resolved result deep-links to, or null for a panel-level result. */
export function settingsSearchEntryTarget(entry: SettingsSearchEntry): string | null {
  return entry.target;
}

/**
 * Fuzzy-rank settings rows for the sidebar search. Title carries the strongest intent;
 * keywords and the owning section label match more loosely.
 */
export function rankSettingsSearchEntries(
  query: string,
  limit: number,
  translate: (key: MessageKey) => string,
): readonly SettingsSearchEntry[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const entries = SETTINGS_SEARCH_RECORDS.map((record) => ({
    id: record.id,
    section: record.section,
    titleKey: record.titleKey,
    keywords: record.keywords,
    target: record.target,
    title: localizeSettingsSearchEntryTitle(record, translate),
  }));
  const ranked = rankProviderDiscoveryItems(entries, trimmed, (entry) => {
    const section = SETTINGS_SECTION_BY_ID.get(entry.section);
    return [
      { value: entry.title },
      { value: entry.keywords, weight: 200 },
      { value: section ? translate(section.labelKey) : entry.section, weight: 400 },
    ];
  });
  return ranked.slice(0, limit);
}

/** Project a stable owner record into the active product language. */
export function localizeSettingsSearchEntryTitle(
  entry: SettingsSearchRecord,
  translate: (key: MessageKey) => string,
): string {
  return translate(entry.titleKey);
}
