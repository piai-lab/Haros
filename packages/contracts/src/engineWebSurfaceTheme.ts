// FILE: engineWebSurfaceTheme.ts
// Purpose: Own the bounded, credential-blind palette projected into isolated Haros pages.
// Layer: Cross-process presentation contract

export interface EngineWebSurfaceThemeSnapshot {
  accent: string;
  border: string;
  borderStrong: string;
  danger: string;
  elevatedSurface: string;
  hoverSurface: string;
  primaryBackground: string;
  primaryBackgroundHover: string;
  primaryText: string;
  secondaryBackground: string;
  secondaryBackgroundHover: string;
  success: string;
  surface: string;
  surfaceUnder: string;
  text: string;
  textDim: string;
  textMuted: string;
  warning: string;
}

const ENGINE_WEB_SURFACE_THEME_FIELDS = [
  "accent",
  "border",
  "borderStrong",
  "danger",
  "elevatedSurface",
  "hoverSurface",
  "primaryBackground",
  "primaryBackgroundHover",
  "primaryText",
  "secondaryBackground",
  "secondaryBackgroundHover",
  "success",
  "surface",
  "surfaceUnder",
  "text",
  "textDim",
  "textMuted",
  "warning",
] as const satisfies readonly (keyof EngineWebSurfaceThemeSnapshot)[];

const MAX_RESOLVED_THEME_COLOR_LENGTH = 160;
const UNSAFE_RESOLVED_THEME_COLOR = /[;{}<>]|(?:url|var|expression)\s*\(/i;
const HEX_RESOLVED_THEME_COLOR = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
const RGB_RESOLVED_THEME_COLOR =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i;

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function isResolvedThemeColor(value: string): boolean {
  if (HEX_RESOLVED_THEME_COLOR.test(value)) {
    return true;
  }
  const match = RGB_RESOLVED_THEME_COLOR.exec(value);
  if (!match) {
    return false;
  }
  const channels = match.slice(1, 4).map(Number);
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  return channels.every((channel) => channel >= 0 && channel <= 255) && alpha >= 0 && alpha <= 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses the exact bounded palette accepted at the cross-process boundary.
 * Values are already resolved hex/rgb(a) colors; they cannot carry CSS
 * variables, URLs, declarations, markup, control bytes, or partial fallbacks.
 */
export function parseEngineWebSurfaceThemeSnapshot(
  value: unknown,
): EngineWebSurfaceThemeSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const snapshot = {} as EngineWebSurfaceThemeSnapshot;
  for (const field of ENGINE_WEB_SURFACE_THEME_FIELDS) {
    const color = value[field];
    if (
      typeof color !== "string" ||
      color.trim().length === 0 ||
      color.length > MAX_RESOLVED_THEME_COLOR_LENGTH ||
      containsControlCharacter(color) ||
      UNSAFE_RESOLVED_THEME_COLOR.test(color) ||
      !isResolvedThemeColor(color)
    ) {
      return null;
    }
    snapshot[field] = color;
  }
  return snapshot;
}
