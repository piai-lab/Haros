import { defineSettingsSearchRow } from "../settingsSearchMetadata";

export const WEB_SEARCH_SETTINGS_SEARCH = {
  routing: defineSettingsSearchRow({
    id: "web-search:routing",
    titleKey: "settings.webSearch.routing",
    keywords: "web search auto all named parallel quota cost provider routing",
  }),
  workflow: defineSettingsSearchRow({
    id: "web-search:workflow",
    titleKey: "settings.webSearch.workflow",
    keywords: "raw results automatic summary review curator source approval",
  }),
  configFile: defineSettingsSearchRow({
    id: "web-search:config-file",
    titleKey: "settings.webSearch.configFile",
    keywords: "web-search.json keys credentials advanced file provider",
  }),
} as const;
