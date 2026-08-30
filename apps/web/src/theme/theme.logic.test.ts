// FILE: theme.logic.test.ts
// Purpose: Locks down Haros theme parsing, preset normalization, and CSS token derivation.
// Layer: Web appearance domain tests
// Exports: Vitest coverage for theme.logic.

import { describe, expect, it } from "vitest";
import { parseEngineWebSurfaceThemeSnapshot } from "@harnessos/contracts";
import {
  THEME_PRESET_OPTIONS,
  DEFAULT_CHROME_THEME_BY_VARIANT,
  DEFAULT_THEME_STATE,
  buildEngineWebSurfaceThemeSnapshot,
  buildResolvedThemeTokens,
  buildThemePresetSeedPatch,
  buildThemePresetOptions,
  buildThemeCssVariables,
  createThemeShareString,
  getThemePresetSeed,
  getThemePresetSeedPatch,
  normalizeThemeState,
  parseStoredThemeState,
  parseThemeShareString,
  parseThemeShareStringForVariant,
  resolveThemePack,
  setThemePresetId,
  themeColorContrastRatio,
  updateThemePackFromShareString,
} from "./theme.logic";
import { THEME_SEED_CATALOG, type ThemePresetSeed } from "./theme.seed.generated";
import { DEFAULT_MONOSPACE_FONT_FAMILY_STACK } from "../lib/fontFamily";

const PROVIDED_THEME_STRING =
  'codex-theme-v1:{"codeThemeId":"linear","theme":{"accent":"#606acc","contrast":30,"fonts":{"code":"\\"Jetbrains Mono\\"","ui":"Inter"},"ink":"#e3e4e6","opaqueWindows":true,"semanticColors":{"diffAdded":"#69c967","diffRemoved":"#ff7e78","skill":"#c2a1ff"},"surface":"#0f0f11"},"variant":"dark"}';

describe("parseStoredThemeState", () => {
  it("migrates the legacy mode-only value into the new theme store", () => {
    expect(parseStoredThemeState("dark")).toEqual({
      ...DEFAULT_THEME_STATE,
      mode: "dark",
    });
  });

  it("normalizes partial stored packs against the per-variant defaults", () => {
    expect(
      normalizeThemeState({
        mode: "light",
        codeThemeIds: {
          dark: "linear",
        },
        chromeThemes: {
          dark: {
            accent: "#606acc",
          },
        },
      }),
    ).toMatchObject({
      chromeThemes: {
        dark: {
          accent: "#606acc",
          contrast: 0,
        },
        light: DEFAULT_THEME_STATE.chromeThemes.light,
      },
      codeThemeIds: {
        dark: "linear",
        light: DEFAULT_THEME_STATE.codeThemeIds.light,
      },
      mode: "light",
    });
  });

  it("migrates the legacy packs shape into split codeThemeId and chromeTheme stores", () => {
    const migrated = normalizeThemeState({
      mode: "dark",
      packs: {
        dark: {
          codeThemeId: "linear",
          theme: {
            accent: "#606acc",
          },
        },
      },
    });

    expect(migrated.mode).toBe("dark");
    expect(migrated.codeThemeIds.dark).toBe("linear");
    expect(migrated.chromeThemes.dark.accent).toBe("#606acc");
  });

  it("preserves a custom UI font when migrating a stored state without the system-font flag", () => {
    const migrated = normalizeThemeState({
      chromeThemes: {
        dark: {
          fonts: { ui: "Inter" },
        },
      },
    });

    expect(migrated.systemUiFont).toBe(false);
    expect(migrated.chromeThemes.dark.fonts.ui).toBe("Inter");
  });

  it("uses the system UI font for older states that did not store a custom font", () => {
    expect(normalizeThemeState({ mode: "dark" }).systemUiFont).toBe(true);
  });

  it("keeps an explicit system-font preference even when the theme stores a UI font", () => {
    expect(
      normalizeThemeState({
        chromeThemes: {
          dark: {
            fonts: { ui: "Inter" },
          },
        },
        systemUiFont: true,
      }).systemUiFont,
    ).toBe(true);
  });
});

describe("theme share strings", () => {
  it("round-trips a normalized pack through the share-string format", () => {
    const shareString = createThemeShareString(
      "dark",
      resolveThemePack(DEFAULT_THEME_STATE, "dark"),
    );

    expect(shareString).toMatch(/^harnessos-theme-v1:/);
    expect(parseThemeShareString(shareString)).toEqual({
      presetId: "codex",
      theme: resolveThemePack(DEFAULT_THEME_STATE, "dark").theme,
      variant: "dark",
    });
  });

  it("parses the provided dark Linear theme and preserves its normalized values", () => {
    expect(parseThemeShareString(PROVIDED_THEME_STRING)).toEqual({
      presetId: "linear",
      theme: {
        accent: "#606acc",
        contrast: 30,
        fonts: {
          code: '"Jetbrains Mono"',
          ui: "Inter",
        },
        ink: "#e3e4e6",
        opaqueWindows: true,
        semanticColors: {
          diffAdded: "#69c967",
          diffRemoved: "#ff7e78",
          skill: "#c2a1ff",
        },
        surface: "#0f0f11",
      },
      variant: "dark",
    });
  });

  it("rejects a share string whose variant does not match the target editor variant", () => {
    expect(() => parseThemeShareStringForVariant(PROVIDED_THEME_STRING, "light")).toThrow(
      /variant mismatch/i,
    );
  });

  it("updates only the matching variant pack when importing", () => {
    const nextState = updateThemePackFromShareString(
      DEFAULT_THEME_STATE,
      PROVIDED_THEME_STRING,
      "dark",
    );

    expect(nextState.codeThemeIds.dark).toBe("linear");
    expect(nextState.chromeThemes.light).toEqual(DEFAULT_THEME_STATE.chromeThemes.light);
  });
});

describe("theme preset seeds", () => {
  it("projects a newly added or removed preset from the catalog without a consumer list", () => {
    const warmLight = {
      ...DEFAULT_CHROME_THEME_BY_VARIANT.light,
      accent: "#85500e",
      ink: "#2e2315",
      surface: "#fffbf4",
    };
    const withPaper = buildThemePresetOptions({
      existing: { dark: DEFAULT_CHROME_THEME_BY_VARIANT.dark },
      paper: { light: warmLight },
    });

    expect(withPaper).toEqual([
      { id: "existing", label: "Existing", variants: ["dark"] },
      { id: "paper", label: "Paper", variants: ["light"] },
    ]);
    expect(buildThemePresetOptions({ paper: { light: warmLight } })).toEqual([
      { id: "paper", label: "Paper", variants: ["light"] },
    ]);
  });

  it("keeps rich preset application semantics inside the catalog descriptor", () => {
    const richPaper: ThemePresetSeed = {
      ...DEFAULT_CHROME_THEME_BY_VARIANT.light,
      accent: "#85500e",
      apply: {
        contrast: true,
        fonts: { code: true, ui: true },
        opaqueWindows: true,
      },
      contrast: 18,
      fonts: { code: '"Berkeley Mono"', ui: "Source Serif 4" },
      ink: "#2e2315",
      opaqueWindows: true,
      surface: "#fffbf4",
    };

    expect(buildThemePresetOptions({ paper: { light: richPaper } })).toEqual([
      { id: "paper", label: "Paper", variants: ["light"] },
    ]);
    expect(buildThemePresetSeedPatch(richPaper, "light")).toEqual({
      accent: "#85500e",
      contrast: 18,
      fonts: { code: '"Berkeley Mono"', ui: "Source Serif 4" },
      ink: "#2e2315",
      opaqueWindows: true,
      semanticColors: DEFAULT_CHROME_THEME_BY_VARIANT.light.semanticColors,
      surface: "#fffbf4",
    });
  });

  it("derives every declared preset variant from an actual bundled seed", () => {
    expect(THEME_PRESET_OPTIONS).toContainEqual({
      id: "github",
      label: "GitHub",
      variants: ["light", "dark"],
    });
    expect(THEME_PRESET_OPTIONS).toContainEqual({
      id: "ayu",
      label: "Ayu",
      variants: ["dark"],
    });
  });

  it("starts every bundled theme variant at zero contrast", () => {
    for (const option of THEME_PRESET_OPTIONS) {
      for (const variant of option.variants) {
        expect(getThemePresetSeed(option.id, variant).contrast).toBe(0);
      }
    }
  });

  it("loads the exact normalized seed for a bundled theme preset", () => {
    expect(getThemePresetSeed("linear", "dark")).toEqual({
      accent: "#606acc",
      contrast: 0,
      fonts: {
        code: null,
        ui: "Inter",
      },
      ink: "#e3e4e6",
      opaqueWindows: true,
      semanticColors: {
        diffAdded: "#69c967",
        diffRemoved: "#ff7e78",
        skill: "#c2a1ff",
      },
      surface: "#0f0f11",
    });
  });

  it("exposes only the raw seed fields that Codex merges on theme switching", () => {
    expect(getThemePresetSeedPatch("linear", "dark")).toEqual({
      accent: "#606acc",
      fonts: {
        ui: "Inter",
      },
      ink: "#e3e4e6",
      opaqueWindows: true,
      semanticColors: {
        diffAdded: "#69c967",
        diffRemoved: "#ff7e78",
        skill: "#c2a1ff",
      },
      surface: "#0f0f11",
    });
  });

  it("merges the selected theme seed into the current pack instead of hard-resetting", () => {
    const nextState = setThemePresetId(
      {
        ...DEFAULT_THEME_STATE,
        chromeThemes: {
          ...DEFAULT_THEME_STATE.chromeThemes,
          dark: {
            ...DEFAULT_THEME_STATE.chromeThemes.dark,
            fonts: {
              code: '"JetBrains Mono"',
              ui: "Old UI",
            },
            accent: "#ff00aa",
            contrast: 12,
            opaqueWindows: false,
          },
        },
      },
      "dark",
      "linear",
    );

    expect(resolveThemePack(nextState, "dark")).toEqual({
      codeThemeId: "linear",
      theme: {
        accent: "#606acc",
        contrast: 12,
        fonts: {
          code: '"JetBrains Mono"',
          ui: "Inter",
        },
        ink: "#e3e4e6",
        opaqueWindows: true,
        semanticColors: {
          diffAdded: "#69c967",
          diffRemoved: "#ff7e78",
          skill: "#c2a1ff",
        },
        surface: "#0f0f11",
      },
    });
  });

  it("preserves current optional values when the new seed does not define them", () => {
    const nextState = setThemePresetId(
      {
        ...DEFAULT_THEME_STATE,
        chromeThemes: {
          ...DEFAULT_THEME_STATE.chromeThemes,
          dark: {
            ...DEFAULT_THEME_STATE.chromeThemes.dark,
            fonts: {
              code: '"JetBrains Mono"',
              ui: "Current UI",
            },
            contrast: 22,
            opaqueWindows: true,
          },
        },
      },
      "dark",
      "lobster",
    );

    expect(resolveThemePack(nextState, "dark")).toEqual({
      codeThemeId: "lobster",
      theme: {
        ...DEFAULT_THEME_STATE.chromeThemes.dark,
        accent: getThemePresetSeed("lobster", "dark").accent,
        contrast: 22,
        fonts: {
          code: '"JetBrains Mono"',
          ui: "Satoshi",
        },
        ink: getThemePresetSeed("lobster", "dark").ink,
        opaqueWindows: true,
        semanticColors: getThemePresetSeed("lobster", "dark").semanticColors,
        surface: getThemePresetSeed("lobster", "dark").surface,
      },
    });
  });

  it("applies explicit contrast overrides when a seed defines them", () => {
    const nextState = setThemePresetId(
      {
        ...DEFAULT_THEME_STATE,
        chromeThemes: {
          ...DEFAULT_THEME_STATE.chromeThemes,
          dark: {
            ...DEFAULT_THEME_STATE.chromeThemes.dark,
            contrast: 12,
          },
        },
      },
      "dark",
      "vercel",
    );

    expect(resolveThemePack(nextState, "dark")).toEqual({
      codeThemeId: "vercel",
      theme: getThemePresetSeed("vercel", "dark"),
    });
  });
});

describe("buildThemeCssVariables", () => {
  it("derives the renderer token map from the imported theme pack", () => {
    const importedTheme = parseThemeShareString(PROVIDED_THEME_STRING);
    const cssVariables = buildThemeCssVariables(
      {
        codeThemeId: importedTheme.presetId,
        theme: importedTheme.theme,
      },
      importedTheme.variant,
      { electron: true },
    );

    expect(cssVariables.material).toBe("opaque");
    expect(cssVariables.variables["--codex-base-accent"]).toBe("#606acc");
    expect(cssVariables.variables["--background"]).toBe("#0d0d0f");
    expect(cssVariables.variables["--card"]).toBe("#151517");
    expect(cssVariables.variables["--composer-surface"]).toBe("rgb(27, 27, 29)");
    expect(cssVariables.variables["--composer-surface"]).not.toBe(cssVariables.variables["--card"]);
    expect(cssVariables.variables["--sidebar-accent"]).toBe(
      "color-mix(in srgb, var(--color-text-foreground) 5%, transparent)",
    );
    expect(cssVariables.variables["--sidebar-accent-active"]).toBe(
      "color-mix(in srgb, var(--color-text-foreground) 8%, transparent)",
    );
    expect(cssVariables.variables["--app-sidebar-backdrop-filter"]).toBe("none");
    expect(cssVariables.variables["--app-sidebar-surface"]).toBe("#0f0f11");
    expect(cssVariables.variables["--theme-font-ui-family"]).toBe("Inter");
    expect(cssVariables.variables["--theme-font-code-family"]).toBe(
      `"Jetbrains Mono", ${DEFAULT_MONOSPACE_FONT_FAMILY_STACK}`,
    );
    expect(cssVariables.variables["--vscode-terminal-ansiBlue"]).toBe("#606acc");
    expect(cssVariables.variables["--vscode-terminal-ansiGreen"]).toBe("#56a554");
    expect(cssVariables.variables["--vscode-terminal-ansiMagenta"]).toBe("#c2a1ff");
    expect(cssVariables.variables["--vscode-terminal-ansiRed"]).toBe("#ff7e78");
    expect(cssVariables.variables["--vscode-terminal-foreground"]).toBe("#e3e4e6");
    expect(cssVariables.variables["--color-token-terminal-ansi-blue"]).toBe("#606acc");
    expect(cssVariables.variables["--color-token-terminal-ansi-green"]).toBe("#56a554");
    expect(cssVariables.variables["--color-token-terminal-ansi-magenta"]).toBe("#c2a1ff");
    expect(cssVariables.variables["--color-token-terminal-ansi-red"]).toBe("#ff7e78");
  });

  it("exposes a structured derived-token surface for retrieving non-stored colors", () => {
    const importedTheme = parseThemeShareString(PROVIDED_THEME_STRING);
    const tokens = buildResolvedThemeTokens(
      {
        codeThemeId: importedTheme.presetId,
        theme: importedTheme.theme,
      },
      importedTheme.variant,
    );

    expect(tokens.computed.surfaceUnder).toBe("#0d0d0f");
    expect(tokens.computed.panel).toBe("#151517");
    expect(tokens.derived.textForegroundSecondary).toBe("rgba(227, 228, 230, 0.645)");
    expect(tokens.derived.buttonSecondaryBackground).toBe("rgba(227, 228, 230, 0.039)");
    expect(tokens.derived.iconAccent).toBe("rgb(143, 150, 219)");
    // Dark primary button label is the surface color (dark) on the white (ink) button.
    expect(tokens.derived.textButtonPrimary).toBe("#0f0f11");
    expect(tokens.derived.buttonPrimaryBackground).toBe("#e3e4e6");
    // Codex maps the sidebar token to the PRIMARY surface (same as main-surface-primary),
    // not the darker under-surface; mirror that so the sidebar color matches Codex.
    expect(tokens.aliases["--color-token-side-bar-background"]).toBe("#0f0f11");
    expect(tokens.aliases["--color-token-list-hover-background"]).toBe(
      tokens.derived.buttonSecondaryBackgroundHover,
    );
    expect(tokens.aliases["--color-token-dropdown-background"]).toBe(
      tokens.derived.controlBackgroundOpaque,
    );
    expect(tokens.aliases["--color-token-main-surface-primary"]).toBe("#0f0f11");
    expect(tokens.aliases["--color-token-input-background"]).toBe("rgba(27, 27, 29, 0.96)");
    expect(tokens.aliases["--color-token-terminal-background"]).toBe("#0f0f11");
    expect(tokens.aliases["--color-token-terminal-foreground"]).toBe("#e3e4e6");
    expect(tokens.aliases["--color-token-terminal-ansi-black"]).toBe(
      tokens.derived.textForegroundTertiary,
    );
    expect(tokens.aliases["--color-token-terminal-ansi-bright-black"]).toBe(
      tokens.derived.textForegroundSecondary,
    );
    expect(tokens.aliases["--color-token-terminal-ansi-yellow"]).toBe("#f5b44a");
  });

  it("projects a custom palette to isolated Haros surfaces without exposing ThemeState", () => {
    const pack = {
      codeThemeId: "custom-light",
      theme: {
        ...DEFAULT_THEME_STATE.chromeThemes.light,
        accent: "#85500e",
        ink: "#2e2315",
        semanticColors: {
          diffAdded: "#26844c",
          diffRemoved: "#b42d26",
          skill: "#7648a8",
        },
        surface: "#fffbf4",
      },
    };

    const snapshot = buildEngineWebSurfaceThemeSnapshot(pack, "light");

    expect(snapshot).toMatchObject({
      accent: expect.any(String),
      danger: "#b42d26",
      success: "#26844c",
      surface: "#fffbf4",
      text: "#2e2315",
    });
    expect(snapshot).not.toHaveProperty("codeThemeId");
    expect(snapshot).not.toHaveProperty("theme");
  });

  it("keeps every bundled preset inside the bounded cross-process color contract", () => {
    for (const option of THEME_PRESET_OPTIONS) {
      for (const variant of option.variants) {
        const snapshot = buildEngineWebSurfaceThemeSnapshot(
          {
            codeThemeId: option.id,
            theme: getThemePresetSeed(option.id, variant),
          },
          variant,
        );
        expect(parseEngineWebSurfaceThemeSnapshot(snapshot)).toEqual(snapshot);
      }
    }
  });

  it("keeps bundled normal text, links, and small status roles readable on app surfaces", () => {
    const readableTextTokens = [
      "--color-text-foreground",
      "--color-text-accent",
      "--color-text-danger",
      "--color-text-success",
      "--color-text-warning",
      "--color-text-status-merged",
      "--color-text-status-neutral",
      "--destructive",
      "--info",
      "--status-failure",
      "--status-merged",
      "--status-neutral",
      "--status-open",
      "--status-success",
      "--success",
      "--warning",
    ] as const;

    for (const [presetId, variants] of Object.entries(THEME_SEED_CATALOG)) {
      for (const variant of ["light", "dark"] as const) {
        const seed = variants[variant];
        if (!seed) {
          continue;
        }
        const variables = buildThemeCssVariables(
          { codeThemeId: presetId, theme: getThemePresetSeed(presetId, variant) },
          variant,
        ).variables;
        const backgrounds = [
          variables["--color-background-surface"],
          variables["--color-background-surface-under"],
          variables["--color-background-panel"],
        ];

        for (const token of readableTextTokens) {
          for (const background of backgrounds) {
            expect(
              themeColorContrastRatio(variables[token]!, background!),
              `${presetId}/${variant} ${token} on ${background}`,
            ).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });

  it("preserves Solarized identity accent while deriving readable link text", () => {
    const variables = buildThemeCssVariables(
      {
        codeThemeId: "solarized",
        theme: getThemePresetSeed("solarized", "light"),
      },
      "light",
    ).variables;

    expect(variables["--codex-base-accent"]).toBe("#b58900");
    expect(variables["--color-decoration-added"]).toBe("#859900");
    expect(variables["--color-text-accent"]).not.toBe("#b58900");
    expect(
      themeColorContrastRatio(
        variables["--color-text-accent"]!,
        variables["--color-background-surface"]!,
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("uses the zero-contrast dark composer and dropdown control color", () => {
    const tokens = buildResolvedThemeTokens(
      {
        codeThemeId: "codex",
        theme: DEFAULT_CHROME_THEME_BY_VARIANT.dark,
      },
      "dark",
    );

    expect(tokens.derived.controlBackgroundOpaque).toBe("rgb(38, 38, 38)");
    expect(tokens.aliases["--color-token-dropdown-background"]).toBe("rgb(38, 38, 38)");
  });

  it("matches Codex's light composer surface token path", () => {
    const cssVariables = buildThemeCssVariables(
      {
        codeThemeId: "absolutely",
        theme: getThemePresetSeed("absolutely", "light"),
      },
      "light",
      { electron: true },
    );

    expect(cssVariables.variables["--composer-surface"]).toBe(
      "color-mix(in oklab, var(--color-background-control) 90%, transparent)",
    );
    expect(cssVariables.variables["--color-background-control"]).toBe("rgba(250, 250, 248, 0.96)");
  });

  it("uses the light-theme foreground color for the primary button background", () => {
    const tokens = buildResolvedThemeTokens(
      {
        codeThemeId: "codex",
        theme: DEFAULT_THEME_STATE.chromeThemes.light,
      },
      "light",
    );

    expect(tokens.derived.buttonPrimaryBackground).toBe(DEFAULT_THEME_STATE.chromeThemes.light.ink);
    expect(tokens.derived.textButtonPrimary).toBe(DEFAULT_THEME_STATE.chromeThemes.light.surface);
    expect(tokens.derived.textButtonPrimary).not.toBe(tokens.derived.buttonPrimaryBackground);
  });

  it("uses the dark-theme foreground color for the primary button background", () => {
    const tokens = buildResolvedThemeTokens(
      {
        codeThemeId: "codex",
        theme: DEFAULT_THEME_STATE.chromeThemes.dark,
      },
      "dark",
    );

    // Dark mode mirrors light mode's high-contrast primary: bg = ink (white),
    // label = surface (dark), so the primary action reads as a filled button.
    expect(tokens.derived.buttonPrimaryBackground).toBe(DEFAULT_THEME_STATE.chromeThemes.dark.ink);
    expect(tokens.derived.textButtonPrimary).toBe(DEFAULT_THEME_STATE.chromeThemes.dark.surface);
    expect(tokens.derived.textButtonPrimary).not.toBe(tokens.derived.buttonPrimaryBackground);
  });

  it("shares the user message bubble background with the chat code-block surface", () => {
    const pack = {
      codeThemeId: "custom-light",
      theme: {
        ...DEFAULT_THEME_STATE.chromeThemes.light,
        ink: "#2d2d2b",
        surface: "#f8f8f6",
      },
    };
    const tokens = buildResolvedThemeTokens(pack, "light");
    const cssVariables = buildThemeCssVariables(pack, "light");

    expect(cssVariables.variables["--app-user-message-background"]).toBe(
      tokens.derived.buttonSecondaryBackground,
    );
    expect(cssVariables.variables["--app-chat-code-surface"]).toBe(
      cssVariables.variables["--app-user-message-background"],
    );
  });
});
