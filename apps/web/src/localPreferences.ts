// FILE: localPreferences.ts
// Purpose: Own the first-public browser-local preference namespace and durable mutations.
// Layer: Web local preference state

import { Option, Schema } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  APP_SNAP_SHORTCUT_KEYS,
  APP_SNAP_SHORTCUT_MODIFIERS,
  DEFAULT_APP_SNAP_SHORTCUT,
} from "@harnessos/shared/appSnapShortcut";
import { EngineKind } from "@harnessos/contracts";
import { DEFAULT_LOCALE_PREFERENCE, LocalePreference } from "./locale";
import {
  DEFAULT_PROVIDER_ORDER,
  normalizeHiddenEngines,
  normalizeEngineOrder,
} from "./engineOrdering";
import { DEFAULT_UI_DENSITY, UI_DENSITY_MODES, normalizeUiDensity } from "./lib/appDensity";
import { DEFAULT_CHAT_WIDTH, CHAT_WIDTH_MODES, normalizeChatWidthMode } from "./lib/chatWidth";
import {
  DEFAULT_SIDEBAR_NAV_ORDER,
  normalizeHiddenSidebarNavItems,
  normalizeSidebarNavOrder,
  SIDEBAR_NAV_ITEM_IDS,
} from "./sidebarNavOrdering";

export const LOCAL_PREFERENCES_STORAGE_KEY = "harnessos:local-preferences:v1";

export const MIN_CHAT_FONT_SIZE_PX = 11;
export const MAX_CHAT_FONT_SIZE_PX = 18;
export const DEFAULT_APP_FONT_SIZE_PX = 14;
export const DEFAULT_CHAT_FONT_SIZE_PX = DEFAULT_APP_FONT_SIZE_PX;
export const MIN_TERMINAL_FONT_SIZE_PX = 10;
export const MAX_TERMINAL_FONT_SIZE_PX = 22;
export const DEFAULT_TERMINAL_FONT_SIZE_PX = 12;
export const DEFAULT_TERMINAL_FONT_FAMILY = "";

export const TERMINAL_FONT_FAMILY_SUGGESTIONS: ReadonlyArray<string> = [
  "JetBrains Mono",
  "Fira Code",
  "Cascadia Code",
  "SF Mono",
  "Menlo",
  "Source Code Pro",
  "IBM Plex Mono",
  "Hack",
  "Roboto Mono",
  "Ubuntu Mono",
  "Consolas",
];

export const TimestampFormat = Schema.Literals(["locale", "12-hour", "24-hour"]);
export type TimestampFormat = typeof TimestampFormat.Type;
export const DEFAULT_TIMESTAMP_FORMAT: TimestampFormat = "locale";
export const SidebarProjectSortOrder = Schema.Literals(["updated_at", "created_at", "manual"]);
export type SidebarProjectSortOrder = typeof SidebarProjectSortOrder.Type;
export const DEFAULT_SIDEBAR_PROJECT_SORT_ORDER: SidebarProjectSortOrder = "manual";
export const SidebarThreadSortOrder = Schema.Literals(["updated_at", "created_at"]);
export type SidebarThreadSortOrder = typeof SidebarThreadSortOrder.Type;
export const DEFAULT_SIDEBAR_THREAD_SORT_ORDER: SidebarThreadSortOrder = "updated_at";
const SidebarNavItemId = Schema.Literals(SIDEBAR_NAV_ITEM_IDS);
export const FollowUpBehavior = Schema.Literals(["queue", "steer"]);
export type FollowUpBehavior = typeof FollowUpBehavior.Type;
export const DEFAULT_FOLLOW_UP_BEHAVIOR: FollowUpBehavior = "queue";
export const UiDensity = Schema.Literals(UI_DENSITY_MODES);
export type UiDensity = typeof UiDensity.Type;
export { DEFAULT_UI_DENSITY };
export const ChatWidthMode = Schema.Literals(CHAT_WIDTH_MODES);
export type ChatWidthMode = typeof ChatWidthMode.Type;
export { DEFAULT_CHAT_WIDTH, DEFAULT_LOCALE_PREFERENCE };

const AppSnapShortcut = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("both-option-keys") }),
  Schema.Struct({
    kind: Schema.Literal("key-chord"),
    modifier: Schema.Literals(APP_SNAP_SHORTCUT_MODIFIERS),
    key: Schema.Literals(APP_SNAP_SHORTCUT_KEYS),
  }),
]);

const PersistedEngineKind = EngineKind;

const withDefaults =
  <
    S extends Schema.Top & Schema.WithoutConstructorDefault,
    D extends S["~type.make.in"] & S["Encoded"],
  >(
    fallback: () => D,
  ) =>
  (schema: S) =>
    schema.pipe(
      Schema.withConstructorDefault(() => Option.some(fallback())),
      Schema.withDecodingDefault(() => fallback()),
    );

export function getDefaultNativeFontSmoothing(_platform = globalThis.navigator?.platform ?? "") {
  return false;
}

export const LocalPreferencesSchema = Schema.Struct({
  localePreference: LocalePreference.pipe(withDefaults(() => DEFAULT_LOCALE_PREFERENCE)),
  uiDensity: UiDensity.pipe(withDefaults(() => DEFAULT_UI_DENSITY)),
  chatWidth: ChatWidthMode.pipe(withDefaults(() => DEFAULT_CHAT_WIDTH)),
  chatFontSizePx: Schema.Number.pipe(withDefaults(() => DEFAULT_APP_FONT_SIZE_PX)),
  chatCodeFontFamily: Schema.String.check(Schema.isMaxLength(256)).pipe(withDefaults(() => "")),
  terminalFontSizePx: Schema.Number.pipe(withDefaults(() => DEFAULT_TERMINAL_FONT_SIZE_PX)),
  terminalFontFamily: Schema.String.check(Schema.isMaxLength(256)).pipe(
    withDefaults(() => DEFAULT_TERMINAL_FONT_FAMILY),
  ),
  confirmThreadDelete: Schema.Boolean.pipe(withDefaults(() => true)),
  confirmThreadArchive: Schema.Boolean.pipe(withDefaults(() => false)),
  confirmTerminalTabClose: Schema.Boolean.pipe(withDefaults(() => true)),
  diffWordWrap: Schema.Boolean.pipe(withDefaults(() => false)),
  showPullRequestDiffColors: Schema.Boolean.pipe(withDefaults(() => true)),
  showStudioSection: Schema.Boolean.pipe(withDefaults(() => true)),
  showEnvironmentUsage: Schema.Boolean.pipe(withDefaults(() => true)),
  showEnvironmentRepository: Schema.Boolean.pipe(withDefaults(() => true)),
  showEnvironmentPullRequest: Schema.Boolean.pipe(withDefaults(() => true)),
  showEnvironmentEditor: Schema.Boolean.pipe(withDefaults(() => true)),
  showEnvironmentRecap: Schema.Boolean.pipe(withDefaults(() => true)),
  showEnvironmentPinned: Schema.Boolean.pipe(withDefaults(() => true)),
  showEnvironmentMarkers: Schema.Boolean.pipe(withDefaults(() => true)),
  showEnvironmentNotepad: Schema.Boolean.pipe(withDefaults(() => false)),
  followUpBehavior: FollowUpBehavior.pipe(withDefaults(() => DEFAULT_FOLLOW_UP_BEHAVIOR)),
  enableNativeFontSmoothing: Schema.Boolean.pipe(withDefaults(getDefaultNativeFontSmoothing)),
  enableTaskCompletionToasts: Schema.Boolean.pipe(withDefaults(() => true)),
  enableSystemTaskCompletionNotifications: Schema.Boolean.pipe(withDefaults(() => true)),
  resumeChatsAfterQuit: Schema.Boolean.pipe(withDefaults(() => true)),
  enableAppSnap: Schema.Boolean.pipe(withDefaults(() => false)),
  appSnapShortcut: AppSnapShortcut.pipe(withDefaults(() => DEFAULT_APP_SNAP_SHORTCUT)),
  appSnapPlaySound: Schema.Boolean.pipe(withDefaults(() => true)),
  sidebarProjectSortOrder: SidebarProjectSortOrder.pipe(
    withDefaults(() => DEFAULT_SIDEBAR_PROJECT_SORT_ORDER),
  ),
  sidebarThreadSortOrder: SidebarThreadSortOrder.pipe(
    withDefaults(() => DEFAULT_SIDEBAR_THREAD_SORT_ORDER),
  ),
  sidebarNavOrder: Schema.Array(SidebarNavItemId).pipe(
    withDefaults(() => [...DEFAULT_SIDEBAR_NAV_ORDER]),
  ),
  hiddenSidebarNavItems: Schema.Array(SidebarNavItemId).pipe(withDefaults(() => [])),
  timestampFormat: TimestampFormat.pipe(withDefaults(() => DEFAULT_TIMESTAMP_FORMAT)),
  uiFontFamily: Schema.String.check(Schema.isMaxLength(256)).pipe(withDefaults(() => "")),
  hiddenEngines: Schema.Array(PersistedEngineKind).pipe(withDefaults(() => [])),
  engineOrder: Schema.Array(PersistedEngineKind).pipe(
    withDefaults(() => [...DEFAULT_PROVIDER_ORDER]),
  ),
});

export type LocalPreferences = typeof LocalPreferencesSchema.Type;
export type LocalPreferencesPatch = Partial<LocalPreferences>;
export type LocalPreferenceMutationResult =
  | {
      readonly state: "saved" | "unchanged";
      readonly preferences: LocalPreferences;
    }
  | {
      readonly state: "failed";
      readonly preferences: LocalPreferences;
      readonly error: unknown;
    };

export const DEFAULT_LOCAL_PREFERENCES: LocalPreferences = LocalPreferencesSchema.makeUnsafe({});

export function normalizeChatFontSizePx(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_APP_FONT_SIZE_PX;
  return Math.min(MAX_CHAT_FONT_SIZE_PX, Math.max(MIN_CHAT_FONT_SIZE_PX, Math.round(value)));
}

export function normalizeTerminalFontSizePx(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TERMINAL_FONT_SIZE_PX;
  return Math.min(
    MAX_TERMINAL_FONT_SIZE_PX,
    Math.max(MIN_TERMINAL_FONT_SIZE_PX, Math.round(value)),
  );
}

export function normalizeTerminalFontFamily(value: string | null | undefined): string {
  return (value ?? "").replace(/[;{}<>\n\r]/g, "").slice(0, 256);
}

export function resolveTerminalFontFamilyStack(value: string | null | undefined): string | null {
  const normalized = normalizeTerminalFontFamily(value).replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const hasGenericFallback = /\b(?:monospace|serif|sans-serif|system-ui|ui-monospace)\b/.test(
    normalized,
  );
  if (normalized.includes(",")) return hasGenericFallback ? normalized : `${normalized}, monospace`;
  const isQuoted = /^(["']).*\1$/.test(normalized);
  const family = !isQuoted && /\s/.test(normalized) ? `"${normalized}"` : normalized;
  return hasGenericFallback ? family : `${family}, monospace`;
}

export function resolveFollowUpDispatchMode(input: {
  behavior: FollowUpBehavior;
  hasLiveTurn: boolean;
  useOppositeBehavior?: boolean;
}): FollowUpBehavior {
  if (!input.hasLiveTurn) return "queue";
  if (!input.useOppositeBehavior) return input.behavior;
  return input.behavior === "queue" ? "steer" : "queue";
}

export function normalizeLocalPreferences(preferences: LocalPreferences): LocalPreferences {
  return {
    ...preferences,
    uiDensity: normalizeUiDensity(preferences.uiDensity),
    chatWidth: normalizeChatWidthMode(preferences.chatWidth),
    chatFontSizePx: normalizeChatFontSizePx(preferences.chatFontSizePx),
    terminalFontSizePx: normalizeTerminalFontSizePx(preferences.terminalFontSizePx),
    terminalFontFamily: normalizeTerminalFontFamily(preferences.terminalFontFamily),
    sidebarNavOrder: normalizeSidebarNavOrder(preferences.sidebarNavOrder),
    hiddenSidebarNavItems: normalizeHiddenSidebarNavItems(preferences.hiddenSidebarNavItems),
    hiddenEngines: normalizeHiddenEngines(preferences.hiddenEngines),
    engineOrder: normalizeEngineOrder(preferences.engineOrder),
  };
}

const decodePreferences = Schema.decodeSync(Schema.fromJsonString(LocalPreferencesSchema));
const encodePreferences = Schema.encodeSync(Schema.fromJsonString(LocalPreferencesSchema));
const LOCAL_PREFERENCES_CHANGE_EVENT = "harnessos:local-preferences-change";

function readBrowserLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function readLocalPreferences(storage?: Storage): LocalPreferences {
  try {
    const raw = (storage ?? readBrowserLocalStorage())?.getItem(LOCAL_PREFERENCES_STORAGE_KEY);
    return raw ? normalizeLocalPreferences(decodePreferences(raw)) : DEFAULT_LOCAL_PREFERENCES;
  } catch {
    return DEFAULT_LOCAL_PREFERENCES;
  }
}

function samePreferences(left: LocalPreferences, right: LocalPreferences): boolean {
  return encodePreferences(left) === encodePreferences(right);
}

export function persistLocalPreferences(
  storage: Storage | undefined,
  patch: LocalPreferencesPatch,
): LocalPreferenceMutationResult {
  const current = readLocalPreferences(storage);
  try {
    const next = normalizeLocalPreferences({ ...current, ...patch });
    if (samePreferences(current, next)) return { state: "unchanged", preferences: current };
    if (!storage) throw new Error("Local preference storage is unavailable.");
    storage.setItem(LOCAL_PREFERENCES_STORAGE_KEY, encodePreferences(next));
    return { state: "saved", preferences: next };
  } catch (error) {
    return { state: "failed", preferences: current, error };
  }
}

export function useLocalPreferences() {
  const [preferences, setPreferences] = useState<LocalPreferences>(readLocalPreferences);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const updatePreferences = useCallback(
    (patch: LocalPreferencesPatch): LocalPreferenceMutationResult => {
      const result = persistLocalPreferences(readBrowserLocalStorage(), patch);
      if (result.state === "saved") {
        setPreferences(result.preferences);
        globalThis.dispatchEvent?.(new CustomEvent(LOCAL_PREFERENCES_CHANGE_EVENT));
      }
      return result.state === "failed"
        ? { ...result, preferences: preferencesRef.current }
        : result;
    },
    [],
  );

  const resetPreferences = useCallback(
    () => updatePreferences(DEFAULT_LOCAL_PREFERENCES),
    [updatePreferences],
  );

  useEffect(() => {
    const sync = () => setPreferences(readLocalPreferences());
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_PREFERENCES_STORAGE_KEY) sync();
    };
    globalThis.addEventListener?.("storage", onStorage);
    globalThis.addEventListener?.(LOCAL_PREFERENCES_CHANGE_EVENT, sync);
    return () => {
      globalThis.removeEventListener?.("storage", onStorage);
      globalThis.removeEventListener?.(LOCAL_PREFERENCES_CHANGE_EVENT, sync);
    };
  }, []);

  return {
    preferences,
    defaults: DEFAULT_LOCAL_PREFERENCES,
    updatePreferences,
    resetPreferences,
  } as const;
}
