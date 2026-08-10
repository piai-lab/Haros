// FILE: ThreadDetailHydrationState.tsx
// Purpose: Render the transcript placeholder while thread history syncs (or after it fails).
// Layer: Chat presentation
// Depends on: shared Spinner and Button primitives.

import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";

export const ThreadDetailHydrationState = function ThreadDetailHydrationState({
  state,
  onRetry,
}: {
  state: "loading" | "failed";
  onRetry: () => void;
}) {
  const { t } = useI18n();
  if (state === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 select-none">
        <Spinner aria-label={t("hydration.loading")} className="size-5 text-muted-foreground/50" />
        <span className="text-sm text-muted-foreground/50">{t("hydration.loading")}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <span className="text-sm text-muted-foreground">{t("hydration.failed")}</span>
      <Button onClick={onRetry} size="sm" variant="outline">
        {t("common.tryAgain")}
      </Button>
    </div>
  );
};
