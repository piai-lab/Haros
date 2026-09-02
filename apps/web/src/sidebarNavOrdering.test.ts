import { describe, expect, it } from "vitest";

import {
  DEFAULT_SIDEBAR_NAV_ORDER,
  normalizeHiddenSidebarNavItems,
  normalizeSidebarNavOrder,
  SIDEBAR_NAV_ITEM_IDS,
} from "./sidebarNavOrdering";

describe("sidebarNavOrdering", () => {
  it("includes every item in the unchanged default order", () => {
    expect(DEFAULT_SIDEBAR_NAV_ORDER).toEqual([
      "newThread",
      "kanban",
      "pullRequests",
      "automations",
    ]);
    expect(new Set(DEFAULT_SIDEBAR_NAV_ORDER)).toEqual(new Set(SIDEBAR_NAV_ITEM_IDS));
  });

  it("keeps known persisted order and appends newly shipped items", () => {
    expect(normalizeSidebarNavOrder(["automations", "newThread"])).toEqual([
      "automations",
      "newThread",
      "kanban",
      "pullRequests",
    ]);
  });

  it("drops unknown and duplicate order and visibility values", () => {
    expect(normalizeSidebarNavOrder(["kanban", "bogus", "kanban"])).toEqual([
      "kanban",
      "newThread",
      "pullRequests",
      "automations",
    ]);
    expect(normalizeHiddenSidebarNavItems(["bogus", "kanban", "kanban"])).toEqual(["kanban"]);
  });
});
