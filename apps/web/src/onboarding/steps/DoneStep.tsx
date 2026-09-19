import { useI18n } from "~/i18n";
import { TourShortcutList } from "./FeatureTourStep";

export function DoneStep() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3.5 px-[120px]">
      <p className="text-[length:var(--app-font-size-ui-sm,11px)] font-medium tracking-[0.04em] text-muted-foreground/70 uppercase">
        {t("firstRun.doneShortcuts")}
      </p>
      <TourShortcutList />
    </div>
  );
}
