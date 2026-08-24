// FILE: startupSurface.ts
// Purpose: Owns the bounded system-variant palette and locale choice for pre-React product pages.
// Layer: Web bootstrap presentation

export type StartupSurfaceLocale = "en" | "zh-CN";

export function resolveStartupSurfaceLocale(languages: readonly string[]): StartupSurfaceLocale {
  return languages.some((language) => /^zh(?:-|$)/i.test(language)) ? "zh-CN" : "en";
}

/**
 * Pre-React pages cannot consume the resolved app ThemePack. They share this
 * deliberately bounded system light/dark palette instead of each inventing a
 * second startup palette or pretending to support named presets.
 */
export const STARTUP_SURFACE_THEME_STYLE = `
  <style>
    :root {
      color-scheme: light dark;
      --startup-canvas: #f5f4ef;
      --startup-surface: #fffdf7;
      --startup-border: #d8d4c8;
      --startup-text: #29261f;
      --startup-muted: #6e695f;
      --startup-accent: #596b00;
      --startup-shadow: #d8d4c8;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --startup-canvas: #10110f;
        --startup-surface: #171915;
        --startup-border: #373a34;
        --startup-text: #fffdf7;
        --startup-muted: #b8bbb2;
        --startup-accent: #d6ff55;
        --startup-shadow: #080907;
      }
    }
  </style>`;
