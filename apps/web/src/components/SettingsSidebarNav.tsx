// FILE: SettingsSidebarNav.tsx
// Purpose: Settings section sidebar navigation with source-neutral glyphs and reference-style pill rows.
//          Doubles as a settings search surface: typing swaps the section list for ranked
//          row matches (same behavior as the editor file search), each jumping to its section.
// Layer: UI component
// Exports: SettingsSidebarNav

import { type KeyboardEvent as ReactKeyboardEvent, useState } from "react";

import { Glyph } from "~/ui/icons";
import { cn } from "~/lib/styles";
import { getWorkbenchCopy } from "../i18n/workbenchCopy";
import { SearchInput } from "./ui/search-input";
import { SidebarLeadingIcon } from "./SidebarLeadingIcon";
import {
  SETTINGS_NAV_GROUPS,
  SETTINGS_NAV_ITEMS,
  type SettingsNavGroupId,
  type SettingsSectionId,
} from "../settingsNavigation";
import {
  rankSettingsSearchEntries,
  settingsSearchEntryTarget,
  settingsSectionLabel,
  type SettingsSearchEntry,
} from "../settingsSearchIndex";
import {
  SIDEBAR_ROW_HOVER_CLASS_NAME,
  SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME,
  SIDEBAR_THREAD_ROW_BASE_CLASS_NAME,
} from "../sidebarRowStyles";
import {
  SETTINGS_SIDEBAR_ICON_CLASS_NAME,
  SETTINGS_SIDEBAR_ITEM_CLASS_NAME,
  SETTINGS_SIDEBAR_ITEM_LABEL_CLASS_NAME,
  SETTINGS_SIDEBAR_LIST_GAP_CLASS_NAME,
  SETTINGS_SIDEBAR_ROW_FILL_ACTIVE_CLASS_NAME,
  SETTINGS_SIDEBAR_ROW_FILL_HOVER_CLASS_NAME,
  SETTINGS_SIDEBAR_SECTION_CLASS_NAME,
  SETTINGS_SIDEBAR_SECTION_LABEL_CLASS_NAME,
} from "../settingsSidebarNavStyles";

// Cap the result list so a broad query stays a quick scan rather than a wall of rows.
const SETTINGS_SEARCH_RESULTS_LIMIT = 12;

const SETTINGS_SECTION_ICON_BY_ID = new Map<SettingsSectionId, string>(
  SETTINGS_NAV_ITEMS.map((item) => [item.id, item.icon]),
);

function localizedSettingsSectionLabel(section: SettingsSectionId, fallback: string): string {
  const copy = getWorkbenchCopy();
  const labels: Record<SettingsSectionId, string> = {
    general: copy.settingsGeneral,
    profile: copy.settingsProfile,
    appearance: copy.settingsAppearance,
    notifications: copy.settingsNotifications,
    behavior: copy.settingsBehavior,
    shortcuts: copy.settingsShortcuts,
    usage: copy.settingsUsage,
    appsnap: copy.settingsAppSnap,
    integrations: copy.settingsIntegrations,
    models: copy.models,
    agents: copy.agents,
    packages: copy.packages,
    worktrees: copy.settingsWorktrees,
    advanced: copy.settingsAdvanced,
    archived: copy.settingsArchived,
  };
  return labels[section] ?? fallback;
}

function localizedSettingsGroupLabel(group: SettingsNavGroupId, fallback: string): string {
  const copy = getWorkbenchCopy();
  const labels: Record<SettingsNavGroupId, string> = {
    personal: copy.settingsGroupPersonal,
    integrations: copy.settingsGroupIntegrations,
    coding: copy.settingsGroupCoding,
    system: copy.settingsGroupSystem,
    archived: copy.settingsGroupArchived,
  };
  return labels[group] ?? fallback;
}

function SettingsSearchResultRow(props: {
  entry: SettingsSearchEntry;
  onSelect: (entry: SettingsSearchEntry) => void;
}) {
  const { entry, onSelect } = props;
  const icon = SETTINGS_SECTION_ICON_BY_ID.get(entry.section) ?? "settings-gear-4";
  // Mirrors the project header + nested thread layout: the section reuses the nav row
  // (muted icon + label) and the matched setting sits below as an indented thread-style row.
  return (
    <li>
      <button
        type="button"
        className={cn(SETTINGS_SIDEBAR_ITEM_CLASS_NAME, SETTINGS_SIDEBAR_ROW_FILL_HOVER_CLASS_NAME)}
        onClick={() => onSelect(entry)}
      >
        <SidebarLeadingIcon size="sm" tone="text-inherit">
          <Glyph name={icon} className={SETTINGS_SIDEBAR_ICON_CLASS_NAME} />
        </SidebarLeadingIcon>
        <span className={SETTINGS_SIDEBAR_ITEM_LABEL_CLASS_NAME}>
          {localizedSettingsSectionLabel(entry.section, settingsSectionLabel(entry.section))}
        </span>
      </button>
      <button
        type="button"
        className={cn(
          SIDEBAR_THREAD_ROW_BASE_CLASS_NAME,
          SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME,
          SIDEBAR_ROW_HOVER_CLASS_NAME,
          "flex items-center",
        )}
        onClick={() => onSelect(entry)}
      >
        <span className="min-w-0 truncate">{entry.title}</span>
      </button>
    </li>
  );
}

export function SettingsSidebarNav(props: {
  activeSection: SettingsSectionId;
  onBack: () => void;
  onSelectSection: (section: SettingsSectionId, options?: { target?: string }) => void;
}) {
  const { onSelectSection } = props;
  const copy = getWorkbenchCopy();
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;
  const results = rankSettingsSearchEntries(trimmedQuery, SETTINGS_SEARCH_RESULTS_LIMIT);

  const handleSelectResult = (entry: SettingsSearchEntry) => {
    const target = settingsSearchEntryTarget(entry);
    onSelectSection(entry.section, target ? { target } : undefined);
    setQuery("");
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const topMatch = results[0];
      if (topMatch) {
        handleSelectResult(topMatch);
      }
      return;
    }
    if (event.key === "Escape" && query.length > 0) {
      event.stopPropagation();
      setQuery("");
    }
  };

  return (
    <div className="px-1.5 py-1.5">
      <div className="mb-3">
        <button
          type="button"
          className={cn(
            SETTINGS_SIDEBAR_ITEM_CLASS_NAME,
            SETTINGS_SIDEBAR_ROW_FILL_HOVER_CLASS_NAME,
          )}
          onClick={props.onBack}
        >
          <SidebarLeadingIcon size="sm" tone="text-inherit">
            <Glyph name="arrow-left" className={SETTINGS_SIDEBAR_ICON_CLASS_NAME} />
          </SidebarLeadingIcon>
          <span className={SETTINGS_SIDEBAR_ITEM_LABEL_CLASS_NAME}>{copy.backToApp}</span>
        </button>
      </div>

      <div className="mb-3 px-1">
        <SearchInput
          value={query}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder={copy.searchSettings}
          aria-label={copy.searchSettings}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
      </div>

      {isSearching ? (
        results.length === 0 ? (
          <p className={SETTINGS_SIDEBAR_SECTION_LABEL_CLASS_NAME}>{copy.noMatchingSettings}</p>
        ) : (
          <ul
            aria-label={copy.settingsSearchResults}
            className={cn("flex flex-col", SETTINGS_SIDEBAR_LIST_GAP_CLASS_NAME)}
          >
            {results.map((entry) => (
              <SettingsSearchResultRow key={entry.id} entry={entry} onSelect={handleSelectResult} />
            ))}
          </ul>
        )
      ) : (
        <nav aria-label={copy.settingsSections} className="flex flex-col">
          {SETTINGS_NAV_GROUPS.map((group) => {
            const items = SETTINGS_NAV_ITEMS.filter((item) => item.group === group.id);
            if (items.length === 0) {
              return null;
            }

            return (
              <section
                key={group.id}
                aria-labelledby={`settings-nav-${group.id}`}
                className={SETTINGS_SIDEBAR_SECTION_CLASS_NAME}
              >
                <h2
                  id={`settings-nav-${group.id}`}
                  className={SETTINGS_SIDEBAR_SECTION_LABEL_CLASS_NAME}
                >
                  {localizedSettingsGroupLabel(group.id, group.label)}
                </h2>
                <ul className={cn("flex flex-col", SETTINGS_SIDEBAR_LIST_GAP_CLASS_NAME)}>
                  {items.map((item) => {
                    const isActive = item.id === props.activeSection;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            SETTINGS_SIDEBAR_ITEM_CLASS_NAME,
                            isActive
                              ? SETTINGS_SIDEBAR_ROW_FILL_ACTIVE_CLASS_NAME
                              : SETTINGS_SIDEBAR_ROW_FILL_HOVER_CLASS_NAME,
                          )}
                          onClick={() => props.onSelectSection(item.id)}
                        >
                          <SidebarLeadingIcon size="sm" tone="text-inherit">
                            <Glyph name={item.icon} className={SETTINGS_SIDEBAR_ICON_CLASS_NAME} />
                          </SidebarLeadingIcon>
                          <span className={SETTINGS_SIDEBAR_ITEM_LABEL_CLASS_NAME}>
                            {localizedSettingsSectionLabel(item.id, item.label)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </nav>
      )}
    </div>
  );
}
