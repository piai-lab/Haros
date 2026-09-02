export const SIDEBAR_NAV_ITEM_IDS = ["newThread", "kanban", "pullRequests", "automations"] as const;

export type SidebarNavItemId = (typeof SIDEBAR_NAV_ITEM_IDS)[number];

export const DEFAULT_SIDEBAR_NAV_ORDER: readonly SidebarNavItemId[] = SIDEBAR_NAV_ITEM_IDS;

const SIDEBAR_NAV_ITEM_ID_SET: ReadonlySet<SidebarNavItemId> = new Set(SIDEBAR_NAV_ITEM_IDS);

export function isSidebarNavItemId(value: string): value is SidebarNavItemId {
  return SIDEBAR_NAV_ITEM_ID_SET.has(value as SidebarNavItemId);
}

export function normalizeHiddenSidebarNavItems(
  hiddenItems: ReadonlyArray<string>,
): SidebarNavItemId[] {
  return [...new Set(hiddenItems.filter(isSidebarNavItemId))];
}

export function normalizeSidebarNavOrder(order: ReadonlyArray<string>): SidebarNavItemId[] {
  const result = [...new Set(order.filter(isSidebarNavItemId))];
  for (const item of DEFAULT_SIDEBAR_NAV_ORDER) {
    if (!result.includes(item)) result.push(item);
  }
  return result;
}
