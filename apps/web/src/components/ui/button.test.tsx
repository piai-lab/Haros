import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button interaction presentation", () => {
  it("uses the shared pointer cursor for enabled product actions", () => {
    const html = renderToStaticMarkup(<Button aria-label="Stop generation">Stop</Button>);

    expect(html).toContain('data-slot="button"');
    expect(html).toContain("cursor-pointer");
  });
});
