import { describe, expect, it } from "vitest";

import { SIDEBAR_OFFCANVAS_MOTION_CLASS } from "./sidebar";

describe("shared offcanvas motion", () => {
  it("disables the left Sidebar and RightDock slide under reduced motion", () => {
    expect(SIDEBAR_OFFCANVAS_MOTION_CLASS).toContain("motion-reduce:transition-none");
    expect(SIDEBAR_OFFCANVAS_MOTION_CLASS).toContain("will-change-[transform]");
  });
});
