// FILE: sidebarContextMenuStyles.tsx
// Purpose: Shared chrome for sidebar right-click menus.
// Layer: Sidebar UI styling
// Why: Sidebar item menus use one panel, item, and icon treatment.

import type { GlyphComponent } from "~/lib/icons";

export const SIDEBAR_CONTEXT_MENU_PANEL_CLASS_NAME = "w-48 min-w-48";

export const SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME =
  "text-[var(--color-text-foreground)] data-highlighted:text-[var(--color-text-foreground)]";

export const SIDEBAR_CONTEXT_MENU_ICON_CLASS_NAME =
  "inline-flex size-3.5 shrink-0 items-center justify-center text-[var(--color-text-foreground-secondary)] [&>svg]:size-3.5 [&>[data-slot=glyph]]:size-3.5";

/** Leading glyph slot; keeps every menu icon on the same box and secondary tone. */
export function SidebarContextMenuIcon({ icon: Icon }: { icon: GlyphComponent }) {
  return (
    <span className={SIDEBAR_CONTEXT_MENU_ICON_CLASS_NAME}>
      <Icon aria-hidden="true" />
    </span>
  );
}
