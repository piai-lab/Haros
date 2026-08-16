// FILE: ComposerBranchMismatchNotice.tsx
// Purpose: Explains that resuming a settled local task uses the checkout's current branch.
// Layer: Chat composer UI

import { ArrowRightIcon, TriangleAlertIcon } from "~/lib/icons";
import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";

import { COMPOSER_INPUT_SURFACE_CLASS_NAME } from "./composerPickerStyles";

export function ComposerBranchMismatchNotice({
  threadBranch,
  currentBranch,
}: {
  threadBranch: string;
  currentBranch: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        COMPOSER_INPUT_SURFACE_CLASS_NAME,
        "flex w-full min-w-0 items-center gap-3 px-4 py-3.5",
      )}
      data-testid="composer-branch-mismatch-notice"
      role="status"
    >
      <TriangleAlertIcon
        aria-hidden="true"
        className="size-4.5 shrink-0 text-[var(--color-text-foreground-secondary)]"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[length:var(--app-font-size-ui,12px)] font-medium leading-5 text-foreground/95">
          {t("git.branch.resumeNotice")}
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[length:var(--app-font-size-ui-sm,11px)] leading-5">
          <code
            className="max-w-[40%] truncate text-muted-foreground/80"
            title={t("git.branch.savedLabel", { branch: threadBranch })}
          >
            {threadBranch}
          </code>
          <ArrowRightIcon aria-hidden="true" className="size-3 shrink-0 text-muted-foreground/50" />
          <code
            className="min-w-0 truncate font-medium text-foreground/85"
            title={t("git.branch.currentLabel", { branch: currentBranch })}
          >
            {currentBranch}
          </code>
        </div>
      </div>
    </div>
  );
}
