// FILE: SidebarStatusTrailingGlyph.tsx
// Purpose: Keep thread status glyphs identical across classic and Activity sidebar rows.
// Layer: Sidebar UI primitive

import { cn } from "~/lib/utils";
import type { ThreadStatusPill } from "./Sidebar.logic";
import { ThreadRunningSpinner } from "./ThreadRunningSpinner";

export function SidebarUnreadCompletionGlyph({
  className,
  ariaLabel = "Unread completion",
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={cn("size-[7px] shrink-0 rounded-full bg-[var(--color-text-accent)]", className)}
    />
  );
}

export function SidebarStatusTrailingGlyph({
  status,
  ariaLabel = status.label,
}: {
  status: ThreadStatusPill;
  ariaLabel?: string;
}) {
  if (status.label === "Completed") {
    return <SidebarUnreadCompletionGlyph ariaLabel={ariaLabel} />;
  }
  if (status.pulse) {
    return (
      <span role="img" aria-label={ariaLabel} className="inline-flex shrink-0">
        <ThreadRunningSpinner />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={cn("size-1.5 shrink-0 rounded-full", status.dotClass)}
    />
  );
}
