// FILE: PullRequestStackNavigation.tsx
// Purpose: Compact read-only stack position and internal previous/next PR navigation.
// Layer: Pull request presentation
// Exports: PullRequestStackPosition, PullRequestStackNavigation

import type { PullRequestStackSummary } from "@omnimind/contracts";

import { Badge } from "~/components/ui/badge";
import { IconButton } from "~/components/ui/icon-button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { useI18n } from "~/i18n";
import { ChevronLeftIcon, ChevronRightIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";

type StackPosition = Pick<PullRequestStackSummary, "number" | "size" | "position">;
export type StackNavigationDirection = "previous" | "next";

export function PullRequestStackPosition({
  stack,
  className,
}: {
  stack: StackPosition;
  className?: string;
}) {
  const { t } = useI18n();
  const label = t("pullRequest.stackPosition", {
    position: stack.position,
    size: stack.size,
  });
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant="outline"
            size="sm"
            aria-label={label}
            className={cn("font-normal tabular-nums text-muted-foreground", className)}
          >
            {stack.position}/{stack.size}
          </Badge>
        }
      />
      <TooltipPopup side="top">
        {t("pullRequest.stackPositionDetail", {
          number: stack.number,
          position: stack.position,
          size: stack.size,
        })}
      </TooltipPopup>
    </Tooltip>
  );
}

export function PullRequestStackNavigation({
  stack,
  previousNumber,
  nextNumber,
  preferredFocus,
  onSelectPullRequest,
}: {
  stack: StackPosition;
  previousNumber: number | null;
  nextNumber: number | null;
  preferredFocus?: StackNavigationDirection;
  onSelectPullRequest: (number: number, direction: StackNavigationDirection) => void;
}) {
  const { t } = useI18n();
  const focusTarget =
    preferredFocus == null
      ? null
      : preferredFocus === "previous"
        ? previousNumber !== null
          ? "previous"
          : nextNumber !== null
            ? "next"
            : null
        : nextNumber !== null
          ? "next"
          : previousNumber !== null
            ? "previous"
            : null;
  return (
    <div
      role="group"
      aria-label={t("pullRequest.stackNavigation")}
      className="flex shrink-0 items-center gap-0.5"
    >
      <IconButton
        variant="chrome"
        className="size-7"
        label={t("pullRequest.previousInStack")}
        tooltip={t("pullRequest.previousInStack")}
        disabled={previousNumber === null}
        autoFocus={focusTarget === "previous"}
        onClick={() => {
          if (previousNumber !== null) onSelectPullRequest(previousNumber, "previous");
        }}
      >
        <ChevronLeftIcon />
      </IconButton>
      <PullRequestStackPosition stack={stack} className="mx-0.5" />
      <IconButton
        variant="chrome"
        className="size-7"
        label={t("pullRequest.nextInStack")}
        tooltip={t("pullRequest.nextInStack")}
        disabled={nextNumber === null}
        autoFocus={focusTarget === "next"}
        onClick={() => {
          if (nextNumber !== null) onSelectPullRequest(nextNumber, "next");
        }}
      >
        <ChevronRightIcon />
      </IconButton>
    </div>
  );
}
