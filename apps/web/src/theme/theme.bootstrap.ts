// FILE: theme.bootstrap.ts
// Purpose: Applies the persisted OmniMind theme before React and keeps that DOM projection canonical.
// Layer: Web appearance bootstrap

import { isElectron } from "../env";
import { isMacPlatform } from "../lib/utils";
import {
  DEFAULT_THEME_STATE,
  type ThemeMode,
  type ThemeState,
  buildThemeCssVariables,
  parseStoredThemeState,
  resolveThemePack,
  resolveThemeVariant,
} from "./theme.logic";

export const THEME_STORAGE_KEY = "harnessos:theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";
let lastDesktopTheme: ThemeMode | null = null;

export function hasThemeStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getSystemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MEDIA_QUERY).matches;
}

export function readStoredThemeState(): ThemeState {
  if (!hasThemeStorage()) return DEFAULT_THEME_STATE;
  try {
    return parseStoredThemeState(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_STATE;
  }
}

function syncDesktopTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  const bridge = window.desktopBridge;
  if (!bridge || lastDesktopTheme === theme) return;

  lastDesktopTheme = theme;
  void bridge.setTheme(theme).catch(() => {
    if (lastDesktopTheme === theme) lastDesktopTheme = null;
  });
}

export function applyThemeState(state: ThemeState, suppressTransitions = false) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const root = document.documentElement;
  if (
    typeof root.classList?.toggle !== "function" ||
    typeof root.style?.setProperty !== "function" ||
    typeof root.style?.removeProperty !== "function"
  ) {
    return;
  }

  if (suppressTransitions) root.classList.add("no-transitions");

  const variant = resolveThemeVariant(state.mode, getSystemDark());
  const activeTheme = resolveThemePack(state, variant);
  const cssVariableBuild = buildThemeCssVariables(activeTheme, variant, {
    electron: isElectron,
    isMac: isMacPlatform(typeof navigator === "undefined" ? "" : navigator.platform),
    systemUiFont: state.systemUiFont,
  });

  root.classList.toggle("dark", variant === "dark");
  root.setAttribute("data-theme-preset-id", activeTheme.codeThemeId);
  root.setAttribute("data-theme-mode", state.mode);
  root.setAttribute("data-theme-variant", variant);
  root.setAttribute("data-window-material", cssVariableBuild.material);

  for (const [name, value] of Object.entries(cssVariableBuild.variables)) {
    if (value.trim().length === 0) root.style.removeProperty(name);
    else root.style.setProperty(name, value);
  }

  syncDesktopTheme(state.mode);

  if (suppressTransitions) {
    // oxlint-disable-next-line no-unused-expressions
    root.offsetHeight;
    requestAnimationFrame(() => root.classList.remove("no-transitions"));
  }
}

export function applyStoredThemeState(): void {
  applyThemeState(readStoredThemeState());
}
