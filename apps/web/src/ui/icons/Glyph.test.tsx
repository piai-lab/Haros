import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getGlyphUrl, Glyph } from "./Glyph";

describe("Glyph", () => {
  it("resolves the stable line and fill styles", () => {
    expect(getGlyphUrl("robot")).toBe("/icons/line/robot.svg");
    expect(getGlyphUrl("stop.svg", "fill")).toBe("/icons/fill/stop.svg");
  });

  it("rejects paths and renders accessible labels", () => {
    expect(getGlyphUrl("../robot")).toBeNull();
    const markup = renderToStaticMarkup(<Glyph name="robot" label="Agent" />);
    expect(markup).toContain('data-slot="glyph"');
    expect(markup).toContain('aria-label="Agent"');
  });
});
