// FILE: useTheme.ts
// Purpose: Persists HarnessOS appearance intent and projects one active pack into typed surfaces.
// Layer: Web appearance state hook
// Exports: useTheme for mode, resolved variant, theme-pack import/export, and active theme metadata.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME_STATE,
  type ChromeTheme,
  type ThemeFonts,
  type ThemeMode,
  type ThemePack,
  type ThemeState,
  type ThemeVariant,
  areThemePacksEqual,
  buildEngineWebSurfaceThemeSnapshot,
  canParseThemeShareString,
  createThemeShareString,
  resetThemeVariant as resetThemeVariantState,
  resolveThemePack,
  resolveThemeVariant,
  serializeThemeState,
  setThemePresetId as setThemePresetIdState,
  setThemeFonts,
  updateChromeTheme,
  updateThemePackFromShareString,
} from "../theme/theme.logic";
import {
  THEME_STORAGE_KEY,
  applyThemeState,
  getSystemDark,
  hasThemeStorage,
  readStoredThemeState,
} from "../theme/theme.bootstrap";

type ThemeSnapshot = {
  state: ThemeState;
  systemDark: boolean;
};

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

let listeners: Array<() => void> = [];
let lastSnapshot: ThemeSnapshot | null = null;
let lastSnapshotKey = "";

// ─── Store wiring ─────────────────────────────────────────────────────────

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function writeStoredThemeState(state: ThemeState) {
  if (!hasThemeStorage()) {
    return;
  }

  localStorage.setItem(THEME_STORAGE_KEY, serializeThemeState(state));
}

function getSnapshot(): ThemeSnapshot {
  const state = readStoredThemeState();
  const systemDark = state.mode === "system" ? getSystemDark() : false;
  const snapshotKey = `${serializeThemeState(state)}|${systemDark ? "dark" : "light"}`;

  if (lastSnapshot && lastSnapshotKey === snapshotKey) {
    return lastSnapshot;
  }

  lastSnapshotKey = snapshotKey;
  lastSnapshot = { state, systemDark };
  return lastSnapshot;
}

function updateStoredThemeState(update: (state: ThemeState) => ThemeState) {
  const nextState = update(readStoredThemeState());
  writeStoredThemeState(nextState);
  applyThemeState(nextState, true);
  emitChange();
}

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  listeners.push(listener);

  const mediaQuery = window.matchMedia(MEDIA_QUERY);
  const handleMediaChange = () => {
    const state = readStoredThemeState();
    if (state.mode === "system") {
      applyThemeState(state, true);
    }
    emitChange();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }
    applyThemeState(readStoredThemeState(), true);
    emitChange();
  };

  mediaQuery.addEventListener("change", handleMediaChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners = listeners.filter((currentListener) => currentListener !== listener);
    mediaQuery.removeEventListener("change", handleMediaChange);
    window.removeEventListener("storage", handleStorage);
  };
}

// Apply immediately on module load to minimize flash before React mounts.
if (typeof document !== "undefined") {
  applyThemeState(readStoredThemeState());
}

// ─── Public hook ──────────────────────────────────────────────────────────

function setTheme(nextTheme: ThemeMode) {
  updateStoredThemeState((state) => ({
    ...state,
    mode: nextTheme,
  }));
}

function setSystemUiFont(enabled: boolean) {
  updateStoredThemeState((state) => ({
    ...state,
    systemUiFont: enabled,
  }));
}

function resetThemeVariant(variant: ThemeVariant) {
  updateStoredThemeState((state) => resetThemeVariantState(state, variant));
}

function resetAllThemes() {
  updateStoredThemeState(() => DEFAULT_THEME_STATE);
}

function updateThemePack(variant: ThemeVariant, patch: Partial<ChromeTheme>) {
  updateStoredThemeState((state) => updateChromeTheme(state, variant, patch));
}

function updateThemeFonts(variant: ThemeVariant, patch: Partial<ThemeFonts>) {
  updateStoredThemeState((state) => setThemeFonts(state, variant, patch));
}

function setThemePresetId(variant: ThemeVariant, presetId: string) {
  updateStoredThemeState((state) => setThemePresetIdState(state, variant, presetId));
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => ({
    state: DEFAULT_THEME_STATE,
    systemDark: false,
  }));
  const theme = snapshot.state.mode;
  const resolvedTheme = resolveThemeVariant(theme, snapshot.systemDark);
  const activeTheme = useMemo(
    () => resolveThemePack(snapshot.state, resolvedTheme),
    [snapshot.state, resolvedTheme],
  );
  const darkTheme = resolveThemePack(snapshot.state, "dark");
  const lightTheme = resolveThemePack(snapshot.state, "light");
  const defaultActiveTheme = resolveThemePack(DEFAULT_THEME_STATE, resolvedTheme);
  const isDefaultActiveTheme = areThemePacksEqual(activeTheme, defaultActiveTheme);
  const engineWebSurfaceThemeSnapshot = useMemo(
    () => buildEngineWebSurfaceThemeSnapshot(activeTheme, resolvedTheme),
    [activeTheme, resolvedTheme],
  );

  const canImportThemeString = (value: string, variant: ThemeVariant = resolvedTheme) =>
    canParseThemeShareString(value, variant);

  const importThemeString = (value: string, variant: ThemeVariant = resolvedTheme) => {
    updateStoredThemeState((state) => updateThemePackFromShareString(state, value, variant));
  };

  const exportThemeString = (variant: ThemeVariant = resolvedTheme) =>
    createThemeShareString(variant, resolveThemePack(snapshot.state, variant));

  const resetActiveTheme = () => {
    updateStoredThemeState((state) => resetThemeVariantState(state, resolvedTheme));
  };

  const isDefaultThemePack = (variant: ThemeVariant) =>
    areThemePacksEqual(
      resolveThemePack(snapshot.state, variant),
      resolveThemePack(DEFAULT_THEME_STATE, variant),
    );

  // Keep the DOM synced if something bypassed the immediate module-load apply.
  useEffect(() => {
    applyThemeState(snapshot.state);
  }, [snapshot.state]);

  return {
    activeTheme,
    canImportThemeString,
    systemUiFont: snapshot.state.systemUiFont,
    setSystemUiFont,
    darkTheme,
    engineWebSurfaceThemeSnapshot,
    defaultActiveTheme,
    exportThemeString,
    importThemeString,
    isDefaultActiveTheme,
    isDefaultThemePack,
    lightTheme,
    resetActiveTheme,
    resetAllThemes,
    resetThemeVariant,
    resolvedTheme,
    setThemePresetId,
    setTheme,
    theme,
    themeState: snapshot.state,
    updateThemeFonts,
    updateThemePack,
  } as const;
}

export type { ChromeTheme, ThemeFonts, ThemeMode, ThemePack, ThemeState, ThemeVariant };
