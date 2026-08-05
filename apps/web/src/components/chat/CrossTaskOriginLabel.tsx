// FILE: CrossTaskOriginLabel.tsx
// Purpose: Identify the source thread for conversations created by another OmniMind agent.
// Layer: Chat transcript UI

import { type ThreadId } from "@omnimind/contracts";
import { memo, type ReactNode } from "react";

import { BrandMark } from "../BrandMark";
import { cn } from "~/lib/utils";

export interface CrossTaskOrigin {
  readonly sourceThreadId: ThreadId;
  readonly sourceProvider: string | null;
}

// A single, app-level attribution: the message reached this thread from another
// OmniMind thread, so it always reads as "Sent by OmniMind" with the OmniMind mark
// (the origin provider is not surfaced here to keep one consistent label).
function OriginContent(): ReactNode {
  return (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground/70">
        <BrandMark className="h-4 w-auto" aria-label="OmniMind" />
      </span>
      <span className="truncate">Sent by OmniMind from another thread</span>
    </>
  );
}

export const CrossTaskOriginLabel = memo(function CrossTaskOriginLabel({
  origin,
  onOpenSourceThread,
}: {
  readonly origin: CrossTaskOrigin;
  readonly onOpenSourceThread?: (threadId: ThreadId) => void;
}) {
  const className = cn(
    "inline-flex max-w-full items-center gap-2 self-end rounded-md py-1",
    "font-system-ui text-[length:var(--app-font-size-ui,12px)] font-normal text-muted-foreground/72",
    onOpenSourceThread &&
      "cursor-pointer transition-colors duration-150 hover:text-foreground/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  );

  if (onOpenSourceThread) {
    return (
      <button
        type="button"
        className={className}
        data-cross-task-origin="true"
        aria-label="Open source thread"
        onClick={() => onOpenSourceThread(origin.sourceThreadId)}
      >
        <OriginContent />
      </button>
    );
  }

  return (
    <div className={className} data-cross-task-origin="true">
      <OriginContent />
    </div>
  );
});
