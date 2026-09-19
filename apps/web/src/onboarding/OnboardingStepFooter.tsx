import { Button } from "~/components/ui/button";
import { DialogFooter } from "~/components/ui/dialog";
import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";
import { ONBOARDING_INSET_CLASS_NAME } from "./layout";
import { ONBOARDING_STEPS, type OnboardingStep } from "./logic";

const FOOTER_BUTTON_CLASS_NAME =
  "px-4 text-[length:var(--app-font-size-ui-lg,13px)] sm:text-[length:var(--app-font-size-ui-lg,13px)]";

export function OnboardingStepFooter(props: {
  step: OnboardingStep;
  onBack: () => void;
  onSkip: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryBusy?: boolean;
  navigationLocked?: boolean;
}) {
  const { t } = useI18n();
  const stepIndex = ONBOARDING_STEPS.indexOf(props.step);
  const showBack = props.step !== "welcome" && props.step !== "done";
  const showSkip = props.step !== "done";
  return (
    <DialogFooter
      variant="bare"
      className={cn("items-center gap-2 pt-5 pb-6", ONBOARDING_INSET_CLASS_NAME)}
    >
      <div className="flex flex-1 items-center gap-4">
        <div
          className="flex items-center gap-1.5"
          role="progressbar"
          aria-label={t("firstRun.setupProgress")}
          aria-valuemin={1}
          aria-valuemax={ONBOARDING_STEPS.length}
          aria-valuenow={stepIndex + 1}
        >
          {ONBOARDING_STEPS.map((step, index) => (
            <span
              key={step}
              className={cn(
                "size-1.5 rounded-full transition-colors motion-reduce:transition-none",
                index === stepIndex
                  ? "bg-foreground"
                  : index < stepIndex
                    ? "bg-foreground/50"
                    : "bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
        {showSkip ? (
          <button
            type="button"
            disabled={props.navigationLocked}
            className="text-[length:var(--app-font-size-ui,12px)] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60 motion-reduce:transition-none"
            onClick={props.onSkip}
          >
            {t("firstRun.skip")}
          </button>
        ) : null}
      </div>
      {showBack ? (
        <Button
          variant="ghost"
          shape="capsule"
          className={FOOTER_BUTTON_CLASS_NAME}
          disabled={props.navigationLocked}
          onClick={props.onBack}
        >
          {t("firstRun.back")}
        </Button>
      ) : null}
      <Button
        variant="prominent"
        shape="capsule"
        className={cn(FOOTER_BUTTON_CLASS_NAME, "hover:scale-100")}
        disabled={props.primaryBusy || props.navigationLocked}
        onClick={props.onPrimary}
      >
        {props.primaryBusy ? t("firstRun.working") : props.primaryLabel}
      </Button>
    </DialogFooter>
  );
}
