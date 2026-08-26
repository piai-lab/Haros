import { describe, expect, it } from "vitest";

import { resolveSelectionActionAnchor } from "./chatSelectionActions";

describe("chatSelectionActions", () => {
  it("preserves selection geometry without assuming toolbar dimensions", () => {
    const selectionRect = {
      left: 100,
      right: 200,
      top: 100,
      bottom: 120,
      width: 100,
      height: 20,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect;

    expect(
      resolveSelectionActionAnchor({
        selectionRect,
        pointer: { x: 150, y: 120 },
        viewportHeight: 600,
      }),
    ).toEqual({
      anchorX: 150,
      selectionTop: 100,
      selectionBottom: 120,
      placement: "bottom",
    });
  });
});
