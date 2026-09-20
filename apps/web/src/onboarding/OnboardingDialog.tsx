import { ENGINE_DESCRIPTORS } from "@harnessos/shared/engineMetadata";
import { useEffect, useState } from "react";

import { HarosLogo } from "~/components/HarosLogo";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { useEngineStatusesForLocalConfig } from "~/hooks/useEngineStatusesForLocalConfig";
import { useTheme } from "~/hooks/useTheme";
import { useI18n, type MessageKey } from "~/i18n";
import { CheckIcon } from "~/lib/icons";
import { findEngineStatus } from "~/lib/engineAvailability";
import { cn } from "~/lib/utils";
import { useLocalPreferences } from "~/localPreferences";
import { THEME_PRESET_OPTIONS } from "~/theme/theme.logic";
import { ONBOARDING_INSET_CLASS_NAME } from "./layout";
import {
  classifyEngineSetup,
  isOnboardingSetupStep,
  nextOnboardingStep,
  ONBOARDING_STEPS,
  previousOnboardingStep,
  summarizeEngineSetup,
  type OnboardingStep,
} from "./logic";
import { OnboardingStepFooter } from "./OnboardingStepFooter";
import { useOnboarding } from "./useOnboarding";
import { useOnboardingDialogStore } from "./onboardingDialogStore";
import { DoneStep } from "./steps/DoneStep";
import { EnginesStep } from "./steps/EnginesStep";
import { FeatureTourStep } from "./steps/FeatureTourStep";
import { ProjectStep, type OnboardingProjectResult } from "./steps/ProjectStep";
import { ThemeStep } from "./steps/ThemeStep";
import { WelcomeStep } from "./steps/WelcomeStep";

const STEP_TITLE_KEYS: Record<OnboardingStep, MessageKey> = {
  welcome: "firstRun.welcomeTitle",
  tour: "firstRun.tourTitle",
  engines: "firstRun.enginesTitle",
  theme: "firstRun.themeTitle",
  project: "firstRun.projectTitle",
  done: "firstRun.doneTitle",
};

const STEP_BODY_KEYS: Record<Exclude<OnboardingStep, "done">, MessageKey | null> = {
  welcome: "firstRun.welcomeBody",
  tour: null,
  engines: "firstRun.enginesBody",
  theme: "firstRun.themeBody",
  project: "firstRun.projectBody",
};

function isHeroStep(step: OnboardingStep): boolean {
  return step === "welcome" || step === "done";
}

function OnboardingFlow(props: {
  onComplete: () => void;
  projectBusy: boolean;
  onProjectBusyChange: (busy: boolean) => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [projectResults, setProjectResults] = useState<ReadonlyArray<OnboardingProjectResult>>([]);
  const { preferences } = useLocalPreferences();
  const statuses = useEngineStatusesForLocalConfig();
  const { activeTheme } = useTheme();
  const hiddenEngines = new Set(preferences.hiddenEngines);

  const goBack = () => setStep(previousOnboardingStep(step));
  const goNext = () => setStep(nextOnboardingStep(step));

  const markEngaged = useOnboardingDialogStore((store) => store.markEngaged);
  useEffect(() => {
    if (isOnboardingSetupStep(step)) markEngaged();
  }, [markEngaged, step]);

  const engineSummary = summarizeEngineSetup(
    ENGINE_DESCRIPTORS.map((descriptor) => ({
      engine: descriptor.kind,
      state: classifyEngineSetup({
        status: findEngineStatus(statuses, descriptor.kind),
        disabled: hiddenEngines.has(descriptor.kind),
      }),
    })),
  );
  const themeLabel =
    THEME_PRESET_OPTIONS.find((option) => option.id === activeTheme.codeThemeId)?.label ??
    activeTheme.codeThemeId;
  const doneSummary = [
    t("firstRun.doneEnginesConnected", { count: engineSummary.connected }),
    t("firstRun.doneTheme", { theme: themeLabel }),
    projectResults.length > 0
      ? t("firstRun.doneProjectsAdded", { count: projectResults.length })
      : t("firstRun.doneNoProject"),
  ].join(" · ");

  const bodyKey = step === "done" ? null : STEP_BODY_KEYS[step];
  const description = step === "done" ? doneSummary : bodyKey ? t(bodyKey) : null;
  const stepIndex = ONBOARDING_STEPS.indexOf(step);
  const hero = isHeroStep(step);

  const primaryAction = (() => {
    switch (step) {
      case "welcome":
        return { label: t("firstRun.getStartedShort"), onPrimary: goNext };
      case "tour":
        return { label: t("firstRun.setUp"), onPrimary: goNext };
      case "engines":
      case "theme":
        return { label: t("firstRun.continue"), onPrimary: goNext };
      case "project":
        return projectResults.length > 0
          ? { label: t("firstRun.continue"), onPrimary: goNext }
          : { label: t("firstRun.skipForNow"), onPrimary: goNext };
      case "done":
        return { label: t("firstRun.getStarted"), onPrimary: props.onComplete };
    }
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col outline-none" tabIndex={-1}>
      <DialogHeader
        className={cn(
          "gap-1.5 pt-8 pb-0",
          ONBOARDING_INSET_CLASS_NAME,
          hero && "items-center text-center",
        )}
      >
        {step === "welcome" ? <HarosLogo size={44} aria-hidden className="mb-3.5" /> : null}
        {step === "done" ? (
          <span
            aria-hidden
            className="mb-3.5 flex size-11 items-center justify-center rounded-full bg-success/8 text-success dark:bg-success/16"
          >
            <CheckIcon className="size-5" />
          </span>
        ) : null}
        {hero ? null : (
          <span className="text-[length:var(--app-font-size-ui-sm,11px)] font-medium tracking-[0.04em] text-muted-foreground/70 uppercase">
            {t("firstRun.stepOf", { current: stepIndex + 1, total: ONBOARDING_STEPS.length })}
          </span>
        )}
        <DialogTitle className="text-[22px] tracking-[-0.01em]">
          {t(STEP_TITLE_KEYS[step])}
        </DialogTitle>
        {description ? (
          <DialogDescription className="max-w-[560px] text-[length:var(--app-font-size-ui-lg,13px)] leading-normal">
            {description}
          </DialogDescription>
        ) : null}
      </DialogHeader>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto pt-6",
          ONBOARDING_INSET_CLASS_NAME,
          hero && "justify-center pb-6",
        )}
      >
        {step === "welcome" ? <WelcomeStep /> : null}
        {step === "tour" ? <FeatureTourStep /> : null}
        {step === "engines" ? <EnginesStep /> : null}
        {step === "theme" ? <ThemeStep /> : null}
        {step === "project" ? (
          <ProjectStep
            results={projectResults}
            onBusyChange={props.onProjectBusyChange}
            onResult={(result) =>
              setProjectResults((current) =>
                current.some((entry) => entry.projectId === result.projectId)
                  ? current
                  : [...current, result],
              )
            }
          />
        ) : null}
        {step === "done" ? <DoneStep /> : null}
      </div>
      <OnboardingStepFooter
        step={step}
        onBack={goBack}
        onSkip={props.onComplete}
        primaryLabel={primaryAction.label}
        onPrimary={primaryAction.onPrimary}
        primaryBusy={step === "project" && props.projectBusy}
        navigationLocked={props.projectBusy}
      />
    </div>
  );
}

export function OnboardingDialog() {
  const { isOpen, complete, onOpenChange } = useOnboarding();
  const [projectBusy, setProjectBusy] = useState(false);
  const handleOpenChange = (open: boolean) => {
    if (!open && projectBusy) return;
    onOpenChange(open);
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPopup showCloseButton className="h-[540px] max-h-full max-w-[800px]">
        {isOpen ? (
          <OnboardingFlow
            onComplete={complete}
            projectBusy={projectBusy}
            onProjectBusyChange={setProjectBusy}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}
