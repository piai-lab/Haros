// FILE: TerminalSearch.browser.tsx
// Purpose: Proves an open terminal search repaints from the resolved theme without recreating PTY state.
// Layer: Vitest browser regression

import "../index.css";

import type { ISearchOptions, SearchAddon } from "@xterm/addon-search";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import type { ThemePack, ThemeVariant } from "~/theme/theme.logic";

const harness = vi.hoisted(() => ({
  activeTheme: null as ThemePack | null,
  resolvedTheme: "light" as ThemeVariant,
  settings: { localePreference: "en" as const },
}));

vi.mock("~/localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

vi.mock("~/hooks/useTheme", () => ({
  useTheme: () => ({
    activeTheme: harness.activeTheme,
    resolvedTheme: harness.resolvedTheme,
  }),
}));

import { I18nProvider } from "~/i18n";
import { TerminalSearch } from "./TerminalSearch";

function theme(surface: string, ink: string, accent: string): ThemePack {
  return {
    codeThemeId: "terminal-search-test",
    theme: {
      accent,
      contrast: 12,
      fonts: { code: null, ui: null },
      ink,
      opaqueWindows: true,
      semanticColors: {
        diffAdded: "#2d7c55",
        diffRemoved: "#b13b32",
        skill: "#7d5aa6",
      },
      surface,
    },
  };
}

describe("TerminalSearch resolved theme lifecycle", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.activeTheme = null;
    harness.resolvedTheme = "light";
  });

  it("re-runs the active query with new decorations when the resolved theme changes", async () => {
    const findNext = vi.fn((_query: string, _options?: ISearchOptions) => true);
    const searchAddon = {
      clearDecorations: vi.fn(),
      findNext,
      findPrevious: vi.fn(() => true),
    } as unknown as SearchAddon;
    harness.activeTheme = theme("#fff3df", "#392c20", "#b65a32");

    const mounted = await render(
      <I18nProvider>
        <TerminalSearch searchAddon={searchAddon} isOpen onClose={vi.fn()} />
      </I18nProvider>,
    );
    await page.getByPlaceholder("Find").fill("needle");
    await vi.waitFor(() => expect(findNext).toHaveBeenCalledTimes(1));
    const firstOptions = findNext.mock.calls[0]?.[1];
    expect(firstOptions?.decorations?.activeMatchBorder).toBe("#b05730");

    harness.activeTheme = theme("#eef4ff", "#18263a", "#2c66b8");
    await mounted.rerender(
      <I18nProvider>
        <TerminalSearch searchAddon={searchAddon} isOpen onClose={vi.fn()} />
      </I18nProvider>,
    );

    await vi.waitFor(() => expect(findNext).toHaveBeenCalledTimes(2));
    const secondOptions = findNext.mock.calls[1]?.[1];
    expect(secondOptions?.decorations?.activeMatchBorder).toBe("#2c66b8");
  });
});
