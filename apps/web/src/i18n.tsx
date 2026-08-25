import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useLocalPreferences } from "./localPreferences";
import { resolveAppLocale, type AppLocale } from "./locale";
import { THINKING_HINT_CATALOGS } from "./i18n/thinkingHints";
import { FOUNDATION_MESSAGES } from "./i18n/messages/foundation";
import { SHELL_MESSAGES } from "./i18n/messages/shell";
import { ONBOARDING_MESSAGES } from "./i18n/messages/onboarding";
import { COMPOSER_MESSAGES } from "./i18n/messages/composer";
import { CONVERSATION_MESSAGES } from "./i18n/messages/conversation";
import { TIMELINE_MESSAGES } from "./i18n/messages/timeline";
import { PROJECTS_MESSAGES } from "./i18n/messages/projects";
import { WORKBENCH_MESSAGES } from "./i18n/messages/workbench";
import { SOURCE_CONTROL_MESSAGES } from "./i18n/messages/source-control";
import { AUTOMATION_MESSAGES } from "./i18n/messages/automation";
import { ECOSYSTEM_MESSAGES } from "./i18n/messages/ecosystem";
import { SETTINGS_CORE_MESSAGES } from "./i18n/messages/settings-core";
import { SETTINGS_APPEARANCE_MESSAGES } from "./i18n/messages/settings-appearance";
import { SETTINGS_DESKTOP_MESSAGES } from "./i18n/messages/settings-desktop";
import { SETTINGS_ENGINES_MESSAGES } from "./i18n/messages/settings-engines";
import { SETTINGS_MODEL_SERVICES_MESSAGES } from "./i18n/messages/settings-model-services";
import { SETTINGS_CAPABILITIES_MESSAGES } from "./i18n/messages/settings-capabilities";
import { SETTINGS_CONNECTIONS_MESSAGES } from "./i18n/messages/settings-connections";
import { SETTINGS_WEB_SEARCH_MESSAGES } from "./i18n/messages/settings-web-search";
import { SETTINGS_PROFILE_USAGE_MESSAGES } from "./i18n/messages/settings-profile-usage";
import { SETTINGS_STORAGE_RECOVERY_MESSAGES } from "./i18n/messages/settings-storage-recovery";
import { composeMessageCatalog } from "./i18n/messageCatalog";

const COMPOSED_MESSAGE_CATALOGS = composeMessageCatalog([
  FOUNDATION_MESSAGES,
  SHELL_MESSAGES,
  ONBOARDING_MESSAGES,
  COMPOSER_MESSAGES,
  CONVERSATION_MESSAGES,
  TIMELINE_MESSAGES,
  PROJECTS_MESSAGES,
  WORKBENCH_MESSAGES,
  SOURCE_CONTROL_MESSAGES,
  AUTOMATION_MESSAGES,
  ECOSYSTEM_MESSAGES,
  SETTINGS_CORE_MESSAGES,
  SETTINGS_APPEARANCE_MESSAGES,
  SETTINGS_DESKTOP_MESSAGES,
  SETTINGS_ENGINES_MESSAGES,
  SETTINGS_MODEL_SERVICES_MESSAGES,
  SETTINGS_CAPABILITIES_MESSAGES,
  SETTINGS_CONNECTIONS_MESSAGES,
  SETTINGS_WEB_SEARCH_MESSAGES,
  SETTINGS_PROFILE_USAGE_MESSAGES,
  SETTINGS_STORAGE_RECOVERY_MESSAGES,
] as const);

export const EN_MESSAGES = COMPOSED_MESSAGE_CATALOGS.en;
export type MessageKey = keyof typeof EN_MESSAGES;
type MessageCatalog = { readonly [Key in MessageKey]: string };
type MessageParams = Readonly<Record<string, string | number>>;
export const ZH_CN_MESSAGES = COMPOSED_MESSAGE_CATALOGS["zh-CN"] satisfies MessageCatalog;

export const MESSAGE_CATALOGS: Readonly<Record<AppLocale, MessageCatalog>> = {
  en: EN_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

export function translate(locale: AppLocale, key: MessageKey, params?: MessageParams): string {
  const message = MESSAGE_CATALOGS[locale][key];
  if (!params) return message;
  return message.replace(/\{([a-zA-Z0-9_]+)\}/g, (token, name: string) => {
    const value = params[name];
    return value === undefined ? token : String(value);
  });
}

type I18nContextValue = {
  readonly locale: AppLocale;
  readonly t: (key: MessageKey, params?: MessageParams) => string;
  readonly thinkingHints: readonly string[];
};

const DEFAULT_I18N_CONTEXT: I18nContextValue = {
  locale: "en",
  t: (key, params) => translate("en", key, params),
  thinkingHints: THINKING_HINT_CATALOGS.en,
};

const I18nContext = createContext<I18nContextValue>(DEFAULT_I18N_CONTEXT);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { preferences } = useLocalPreferences();
  const [systemLanguages, setSystemLanguages] = useState<readonly string[]>(() => [
    ...(globalThis.navigator?.languages ?? []),
  ]);

  useEffect(() => {
    const handleLanguageChange = () => setSystemLanguages([...(navigator.languages ?? [])]);
    globalThis.addEventListener?.("languagechange", handleLanguageChange);
    return () => globalThis.removeEventListener?.("languagechange", handleLanguageChange);
  }, []);

  const locale = resolveAppLocale(preferences.localePreference, systemLanguages);
  const t = useCallback(
    (key: MessageKey, params?: MessageParams) => translate(locale, key, params),
    [locale],
  );
  const thinkingHints = THINKING_HINT_CATALOGS[locale];
  const value = useMemo<I18nContextValue>(
    () => ({ locale, t, thinkingHints }),
    [locale, t, thinkingHints],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function DocumentLocaleSync() {
  const { locale } = useI18n();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
