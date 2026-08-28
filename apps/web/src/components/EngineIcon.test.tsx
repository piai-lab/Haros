// FILE: EngineIcon.test.tsx
// Purpose: Covers shared engine icon rendering that many chat surfaces reuse.
// Layer: web UI tests
// Depends on: react-dom server rendering and EngineIcon engine mapping.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EngineIcon, ENGINE_ICON_COMPONENT_BY_PROVIDER } from "./EngineIcon";

describe("EngineIcon", () => {
  it("uses Antigravity branding", () => {
    expect(ENGINE_ICON_COMPONENT_BY_PROVIDER).not.toHaveProperty("gemini");

    const markup = renderToStaticMarkup(<EngineIcon engine="antigravity" />);
    expect(markup).toContain('viewBox="0 0 16 15"');
    expect(markup).toContain("#FFE432");
  });

  it("uses the reversed Central icon for opencode in dark mode", () => {
    const markup = renderToStaticMarkup(
      <EngineIcon engine="opencode" className="size-4 text-muted-foreground" />,
    );

    expect(markup).toContain("dark:hidden");
    expect(markup).toContain("hidden dark:inline-block");
    expect(markup).toContain("dark:text-foreground/90");
    expect(markup).toContain("/central-icons-reversed/opencode.svg");
  });
});
