import type { ModelSelection, ProviderKind, ThreadId } from "@omnimind/contracts";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useComposerDraftStore } from "~/composerDraftStore";
import { ProviderIcon } from "~/components/ProviderIcon";
import {
  ModelsSettingsPanel,
  type PreparedModelService,
} from "~/components/settings/ModelsSettingsPanel";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { useI18n, type MessageKey } from "~/i18n";
import { CheckIcon, ChevronRightIcon } from "~/lib/icons";
import { deriveProviderPickerAvailability } from "~/lib/providerAvailability";
import { cn } from "~/lib/utils";
import { PROVIDER_OPTIONS } from "~/session-logic";
import { SETTINGS_TARGETS } from "~/settingsNavigation";
import { useStore } from "~/store";

import {
  clearFirstRunReadinessPreference,
  deferFirstRunReadiness,
} from "./firstRunReadinessPreference";
import { useFirstRunReadinessController } from "./useFirstRunReadinessController";

type WizardStep = "engine" | "prepare" | "model" | "ready";

const INDEPENDENT_ENGINE_OPTIONS = PROVIDER_OPTIONS.filter((option) => option.value !== "omnimind");
const PROVIDER_LABEL_BY_KIND = Object.fromEntries(
  PROVIDER_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ProviderKind, string>;

type OnboardingEngineAvailabilityState =
  | ReturnType<typeof deriveProviderPickerAvailability>["state"]
  | "coming_soon";

const ENGINE_STATUS_KEY_BY_STATE = {
  checking: "composer.engineChecking",
  ready: "onboarding.firstRun.engineReady",
  limited: "composer.engineLimited",
  sign_in: "composer.engineSignIn",
  not_installed: "composer.engineNotInstalled",
  unavailable: "composer.engineUnavailable",
  coming_soon: "composer.engineComingSoon",
} as const satisfies Record<OnboardingEngineAvailabilityState, MessageKey>;

function readSelectionIntentFingerprint(threadId: ThreadId): string {
  const composerState = useComposerDraftStore.getState();
  const draft = composerState.draftsByThreadId[threadId];
  const draftModels = Object.entries(draft?.modelSelectionByProvider ?? {})
    .map(([provider, selection]) => [provider, selection?.model ?? null] as const)
    .toSorted(([left], [right]) => left.localeCompare(right));
  const stickyModels = Object.entries(composerState.stickyModelSelectionByProvider)
    .map(([provider, selection]) => [provider, selection?.model ?? null] as const)
    .toSorted(([left], [right]) => left.localeCompare(right));
  return JSON.stringify({
    activeProvider: draft?.activeProvider ?? null,
    draftModels,
    stickyActiveProvider: composerState.stickyActiveProvider,
    stickyModels,
  });
}

function focusedThreadStillExists(threadId: ThreadId): boolean {
  const composerState = useComposerDraftStore.getState();
  return (
    composerState.draftThreadsByThreadId[threadId] !== undefined ||
    useStore.getState().threadShellById?.[threadId] !== undefined
  );
}

function focusPreviousSurface(element: HTMLElement | null): void {
  window.requestAnimationFrame(() => {
    if (element?.isConnected && element.getClientRects().length > 0) {
      element.focus({ preventScroll: true });
      return;
    }
    const composer = Array.from(
      document.querySelectorAll<HTMLElement>('[contenteditable="true"]'),
    ).find((candidate) => candidate.getClientRects().length > 0);
    composer?.focus({ preventScroll: true });
  });
}

export function FirstRunReadinessDialog() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [selectedProvider, setSelectedProvider] = useState<ProviderKind>("omnimind");
  const controller = useFirstRunReadinessController(selectedProvider);
  const [step, setStep] = useState<WizardStep>("engine");
  const [open, setOpen] = useState(false);
  const [flowStarted, setFlowStarted] = useState(false);
  const [settingsReturnPending, setSettingsReturnPending] = useState(false);
  const [preparedService, setPreparedService] = useState<PreparedModelService | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const targetThreadIdRef = useRef<ThreadId | null>(null);
  const targetIntentFingerprintRef = useRef<string | null>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const completionCommittedRef = useRef(false);

  const selectedProviderStatus = controller.providerStatuses.find(
    (status) => status.provider === selectedProvider,
  );
  const selectedProviderAvailability = deriveProviderPickerAvailability(selectedProviderStatus);
  const selectedProviderPrepared =
    selectedProviderAvailability.state === "ready" ||
    selectedProviderAvailability.state === "limited";
  const selectedProviderModels = controller.modelOptionsByProvider[selectedProvider];
  const selectedProviderCatalogState = controller.catalogStateByProvider[selectedProvider];
  const selectedProviderModelsReady =
    selectedProviderModels.length > 0 &&
    (selectedProviderCatalogState === "ready" || selectedProviderCatalogState === "stale");
  const modelChoices = useMemo(() => {
    if (selectedProvider === "omnimind" && preparedService) {
      return preparedService.models.map((model) => ({
        slug: `${preparedService.service.serviceId}/${model.modelId}`,
        name: model.displayName,
        description: model.reasoning
          ? t("onboarding.firstRun.modelReasoning")
          : t("onboarding.firstRun.modelGeneral"),
      }));
    }
    return selectedProviderModels.map((model) => ({
      slug: model.slug,
      name: model.name,
      description: model.description ?? model.slug,
    }));
  }, [preparedService, selectedProvider, selectedProviderModels, t]);

  const startFlow = useCallback(() => {
    const targetThreadId = controller.focusedThreadId;
    if (!targetThreadId) return;
    targetThreadIdRef.current = targetThreadId;
    targetIntentFingerprintRef.current = readSelectionIntentFingerprint(targetThreadId);
    focusReturnRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    completionCommittedRef.current = false;
    setSelectedProvider("omnimind");
    setPreparedService(null);
    setSelectedModel(null);
    setStep("engine");
    setFlowStarted(true);
    setOpen(true);
  }, [controller.focusedThreadId]);

  useEffect(() => {
    if (
      !flowStarted &&
      controller.readiness === "first-run" &&
      controller.focusedThreadId !== null &&
      pathname !== "/settings"
    ) {
      startFlow();
    }
  }, [controller.focusedThreadId, controller.readiness, flowStarted, pathname, startFlow]);

  useEffect(() => {
    if (!settingsReturnPending || pathname === "/settings") return;
    setSettingsReturnPending(false);
    setOpen(true);
  }, [pathname, settingsReturnPending]);

  useEffect(() => {
    const resume = () => {
      clearFirstRunReadinessPreference();
      setFlowStarted(false);
      startFlow();
    };
    window.addEventListener("omnimind:first-run-readiness:resume", resume);
    return () => window.removeEventListener("omnimind:first-run-readiness:resume", resume);
  }, [startFlow]);

  const deferFlow = useCallback(() => {
    deferFirstRunReadiness();
    setOpen(false);
    setFlowStarted(true);
    focusPreviousSurface(focusReturnRef.current);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setOpen(true);
        return;
      }
      if (completionCommittedRef.current || settingsReturnPending) {
        setOpen(false);
        return;
      }
      deferFlow();
    },
    [deferFlow, settingsReturnPending],
  );

  const openEngineSettings = useCallback(() => {
    setSettingsReturnPending(true);
    setOpen(false);
    void navigate({
      to: "/settings",
      search: { section: "providers", target: SETTINGS_TARGETS.engineDetails },
    });
  }, [navigate]);

  const advanceFromPrepare = useCallback(() => {
    if (selectedProvider === "omnimind") return;
    if (!selectedProviderModelsReady || !selectedProviderPrepared) return;
    setSelectedModel(null);
    setStep("model");
  }, [selectedProvider, selectedProviderModelsReady, selectedProviderPrepared]);

  const handleServicePrepared = useCallback((prepared: PreparedModelService) => {
    setPreparedService(prepared);
    setSelectedModel(null);
    setStep("model");
  }, []);

  const completeSelection = useCallback(() => {
    if (!selectedModel) return;
    setStep("ready");
  }, [selectedModel]);

  const startUsing = useCallback(() => {
    const targetThreadId = targetThreadIdRef.current;
    const capturedIntent = targetIntentFingerprintRef.current;
    if (
      targetThreadId &&
      capturedIntent !== null &&
      focusedThreadStillExists(targetThreadId) &&
      readSelectionIntentFingerprint(targetThreadId) === capturedIntent &&
      selectedModel
    ) {
      const selection: ModelSelection = { provider: selectedProvider, model: selectedModel };
      useComposerDraftStore.getState().setModelSelectionAndSticky(targetThreadId, selection);
    }
    clearFirstRunReadinessPreference();
    completionCommittedRef.current = true;
    setOpen(false);
    setFlowStarted(true);
    focusPreviousSurface(focusReturnRef.current);
  }, [selectedModel, selectedProvider]);

  const currentStepNumber = step === "engine" ? 1 : step === "prepare" ? 2 : 3;
  const selectedProviderLabel = PROVIDER_LABEL_BY_KIND[selectedProvider];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup
        className="first-run-readiness-popup h-[min(720px,92vh)] min-h-0 max-w-[736px] overflow-hidden rounded-[24px] max-lg:h-[min(700px,94vh)] max-lg:max-w-[680px] lg:min-h-[620px]"
        bottomStickOnMobile={false}
        showCloseButton={false}
        data-testid="first-run-readiness-dialog"
      >
        <DialogHeader className="h-[70px] shrink-0 flex-row items-center border-b border-border/60 px-7 py-0 font-system-ui">
          <ProviderIcon provider="omnimind" className="size-[34px]" />
          <span className="text-[length:var(--app-font-size-ui-lg,15px)] font-semibold">
            {t("onboarding.firstRun.header")}
          </span>
          <div
            className="ms-auto flex items-center gap-2"
            role="group"
            aria-label={t("onboarding.firstRun.progress")}
          >
            {[1, 2, 3].map((index) => (
              <span
                key={index}
                aria-current={step !== "ready" && index === currentStepNumber ? "step" : undefined}
                className={cn(
                  "size-1.5 rounded-full bg-border",
                  (step === "ready" || index <= currentStepNumber) && "bg-primary",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label={t("onboarding.firstRun.deferClose")}
            className="ms-1 grid size-8 place-items-center rounded-full text-xl text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            onClick={deferFlow}
          >
            ×
          </button>
        </DialogHeader>

        <DialogPanel className="flex min-h-0 flex-1 flex-col overflow-hidden px-[34px] pt-[30px] pb-3 font-system-ui max-lg:px-7 max-lg:pt-6">
          {step === "engine" ? (
            <section
              className="first-run-step min-h-0 flex-1 overflow-y-auto pe-1 pb-1"
              data-first-run-step="engine"
            >
              <p className="mb-1.5 text-xs font-semibold text-primary">
                {t("onboarding.firstRun.step", { current: 1, total: 3 })}
              </p>
              <DialogTitle className="text-[length:calc(var(--app-font-size-ui-lg,15px)*1.6667)] tracking-[-0.035em]">
                {t("onboarding.firstRun.engineTitle")}
              </DialogTitle>
              <DialogDescription className="mt-1.5 max-w-[610px] text-[length:var(--app-font-size-ui,14px)] leading-relaxed">
                {t("onboarding.firstRun.engineDescription")}
              </DialogDescription>
              <button
                type="button"
                aria-pressed={selectedProvider === "omnimind"}
                className={cn(
                  "mt-6 flex w-full items-center gap-4 rounded-[17px] border p-[17px] text-left outline-none transition-colors motion-reduce:transition-none",
                  selectedProvider === "omnimind"
                    ? "border-primary/45 bg-primary/[0.06] ring-4 ring-primary/[0.06]"
                    : "border-border hover:bg-muted/40",
                )}
                onClick={() => setSelectedProvider("omnimind")}
              >
                <ProviderIcon provider="omnimind" className="size-12" />
                <span className="min-w-0 flex-1">
                  <strong className="block text-[length:var(--app-font-size-ui-lg,15px)]">
                    {PROVIDER_LABEL_BY_KIND.omnimind}
                  </strong>
                  <span className="mt-1 block text-[length:var(--app-font-size-ui-xs,12px)] text-muted-foreground">
                    {t("onboarding.firstRun.omnimindDescription")}
                  </span>
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[length:var(--app-font-size-ui-2xs,11px)] font-semibold text-primary">
                  {t("onboarding.firstRun.recommended")}
                </span>
                {selectedProvider === "omnimind" ? (
                  <span className="grid size-[21px] place-items-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3" />
                  </span>
                ) : null}
              </button>
              <div className="my-5 flex items-center gap-2 text-xs text-muted-foreground after:h-px after:flex-1 after:bg-border/70">
                {t("onboarding.firstRun.otherEngines")}
              </div>
              <div className="grid grid-cols-4 gap-2.5 max-lg:grid-cols-2">
                {INDEPENDENT_ENGINE_OPTIONS.map((option) => {
                  const provider = option.value;
                  const status = controller.providerStatuses.find(
                    (candidate) => candidate.provider === provider,
                  );
                  const availability = option.available
                    ? deriveProviderPickerAvailability(status)
                    : { disabled: true, state: "coming_soon" as const };
                  const selected = selectedProvider === provider;
                  return (
                    <button
                      key={provider}
                      type="button"
                      aria-pressed={selected}
                      disabled={!option.available}
                      className={cn(
                        "flex min-w-0 items-center gap-2 rounded-[13px] border px-2.5 py-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-default disabled:opacity-55 motion-reduce:transition-none",
                        selected && "border-primary/45 bg-primary/[0.05]",
                      )}
                      onClick={() => setSelectedProvider(provider)}
                    >
                      <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] border border-border/70 bg-muted/30">
                        <ProviderIcon provider={provider} className="size-[21px]" />
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-[length:var(--app-font-size-ui-sm,13px)]">
                          {option.label}
                        </strong>
                        <span className="block truncate text-[length:var(--app-font-size-ui-2xs,11px)] text-muted-foreground">
                          {t(ENGINE_STATUS_KEY_BY_STATE[availability.state])}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {step === "prepare" ? (
            <section className="first-run-step min-h-0 flex-1" data-first-run-step="prepare">
              {selectedProvider === "omnimind" ? (
                <div data-first-run-model-services>
                  <p className="mb-1.5 text-xs font-semibold text-primary">
                    {t("onboarding.firstRun.stepWithEngine", {
                      current: 2,
                      total: 3,
                      engine: selectedProviderLabel,
                    })}
                  </p>
                  <DialogTitle className="text-[length:calc(var(--app-font-size-ui-lg,15px)*1.6667)] tracking-[-0.035em]">
                    {t("onboarding.firstRun.serviceTitle")}
                  </DialogTitle>
                  <DialogDescription className="mt-1.5 mb-3 max-w-[610px] text-[length:var(--app-font-size-ui,14px)] leading-relaxed">
                    {t("onboarding.firstRun.serviceDescription")}
                  </DialogDescription>
                  <ModelsSettingsPanel
                    active
                    resetEpoch={0}
                    startInAddFlow
                    presentation="first-run"
                    onServicePrepared={handleServicePrepared}
                  />
                </div>
              ) : (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-primary">
                    {t("onboarding.firstRun.stepWithEngine", {
                      current: 2,
                      total: 3,
                      engine: selectedProviderLabel,
                    })}
                  </p>
                  <DialogTitle className="text-[length:calc(var(--app-font-size-ui-lg,15px)*1.6667)] tracking-[-0.035em]">
                    {t("onboarding.firstRun.prepareEngineTitle", {
                      engine: selectedProviderLabel,
                    })}
                  </DialogTitle>
                  <DialogDescription className="mt-1.5 max-w-[610px] text-[length:var(--app-font-size-ui,14px)] leading-relaxed">
                    {t("onboarding.firstRun.prepareEngineDescription")}
                  </DialogDescription>
                  <div className="mt-7 flex items-center gap-4 rounded-2xl border border-border p-5">
                    <span className="grid size-14 place-items-center rounded-2xl border border-border bg-muted/30">
                      <ProviderIcon provider={selectedProvider} className="size-8" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="text-[length:var(--app-font-size-ui-lg,15px)]">
                        {selectedProviderLabel}
                      </strong>
                      <p className="mt-1 text-[length:var(--app-font-size-ui,14px)] text-muted-foreground">
                        {selectedProviderModelsReady && selectedProviderPrepared
                          ? t("onboarding.firstRun.enginePrepared")
                          : t("onboarding.firstRun.engineNeedsSetup")}
                      </p>
                    </div>
                    {selectedProviderModelsReady && selectedProviderPrepared ? (
                      <CheckIcon className="size-5 text-emerald-600" />
                    ) : null}
                  </div>
                  {!selectedProviderModelsReady || !selectedProviderPrepared ? (
                    <Button className="mt-5" onClick={openEngineSettings}>
                      {t("composer.openEngineSettings")}
                      <ChevronRightIcon />
                    </Button>
                  ) : null}
                </div>
              )}
            </section>
          ) : null}

          {step === "model" ? (
            <section className="first-run-step" data-first-run-step="model">
              <p className="mb-1.5 text-xs font-semibold text-primary">
                {t("onboarding.firstRun.stepWithEngine", {
                  current: 3,
                  total: 3,
                  engine: selectedProviderLabel,
                })}
              </p>
              <DialogTitle className="text-[length:calc(var(--app-font-size-ui-lg,15px)*1.6667)] tracking-[-0.035em]">
                {t("onboarding.firstRun.modelTitle")}
              </DialogTitle>
              <DialogDescription className="mt-1.5 max-w-[610px] text-[length:var(--app-font-size-ui,14px)] leading-relaxed">
                {t("onboarding.firstRun.modelDescription")}
              </DialogDescription>
              <div className="mt-6 grid gap-2.5" role="radiogroup">
                {modelChoices.map((model) => {
                  const selected = selectedModel === model.slug;
                  return (
                    <button
                      key={model.slug}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={cn(
                        "flex items-center gap-3 rounded-[13px] border px-3.5 py-3 text-left outline-none transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none",
                        selected &&
                          "border-primary/50 bg-primary/[0.04] ring-4 ring-primary/[0.05]",
                      )}
                      onClick={() => setSelectedModel(model.slug)}
                    >
                      <span
                        className={cn(
                          "grid size-[18px] place-items-center rounded-full border-[1.5px] border-muted-foreground/45",
                          selected && "border-primary",
                        )}
                      >
                        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-[length:var(--app-font-size-ui-sm,13px)]">
                          {model.name}
                        </strong>
                        <span className="mt-0.5 block truncate text-[length:var(--app-font-size-ui-xs,12px)] text-muted-foreground">
                          {model.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {step === "ready" ? (
            <section
              className="first-run-step grid h-full place-items-center pb-3 text-center"
              data-first-run-step="ready"
            >
              <div>
                <span className="mx-auto mb-5 grid size-[66px] place-items-center rounded-[21px] bg-emerald-500/10 text-emerald-600">
                  <ProviderIcon provider={selectedProvider} className="size-[42px]" />
                </span>
                <DialogTitle className="text-[length:calc(var(--app-font-size-ui-lg,15px)*1.7333)] tracking-[-0.035em]">
                  {t("onboarding.firstRun.readyTitle")}
                </DialogTitle>
                <DialogDescription className="mt-2 text-[length:var(--app-font-size-ui,14px)]">
                  {t("onboarding.firstRun.readyDescription")}
                </DialogDescription>
                <div className="mx-auto mt-6 flex justify-center gap-8 rounded-xl bg-muted/55 px-5 py-3 text-left text-[length:var(--app-font-size-ui-xs,12px)]">
                  <span>
                    <span className="block text-muted-foreground">{t("term.engine")}</span>
                    <strong>{selectedProviderLabel}</strong>
                  </span>
                  <span>
                    <span className="block text-muted-foreground">{t("term.model")}</span>
                    <strong>
                      {modelChoices.find((model) => model.slug === selectedModel)?.name}
                    </strong>
                  </span>
                </div>
              </div>
            </section>
          ) : null}
        </DialogPanel>

        <DialogFooter className="h-[76px] shrink-0 flex-row items-center border-t border-border/60 px-7 py-0 font-system-ui">
          {step === "engine" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-[length:var(--app-font-size-ui,14px)] text-muted-foreground hover:text-foreground"
                onClick={deferFlow}
              >
                {t("onboarding.firstRun.later")}
              </button>
              <span className="text-[length:var(--app-font-size-ui-2xs,11px)] text-muted-foreground/65">
                {t("onboarding.firstRun.settingsHint")}
              </span>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() =>
                setStep(step === "ready" ? "model" : step === "model" ? "prepare" : "engine")
              }
            >
              {t("common.back")}
            </Button>
          )}
          {step === "engine" ? (
            <Button
              className="ms-auto bg-foreground text-background hover:bg-foreground/90"
              onClick={() => setStep("prepare")}
            >
              {t("common.forward")}
            </Button>
          ) : step === "prepare" && selectedProvider !== "omnimind" ? (
            <Button
              className="ms-auto bg-foreground text-background hover:bg-foreground/90"
              disabled={!selectedProviderModelsReady || !selectedProviderPrepared}
              onClick={advanceFromPrepare}
            >
              {controller.loadingModelProviders[selectedProvider]
                ? t("composer.checkingModels")
                : t("common.forward")}
            </Button>
          ) : step === "model" ? (
            <Button
              className="ms-auto bg-foreground text-background hover:bg-foreground/90"
              disabled={!selectedModel}
              onClick={completeSelection}
            >
              {t("onboarding.firstRun.complete")}
            </Button>
          ) : step === "ready" ? (
            <Button
              className="ms-auto bg-foreground text-background hover:bg-foreground/90"
              onClick={startUsing}
            >
              {t("onboarding.firstRun.startUsing")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export function requestFirstRunReadinessResume(): void {
  window.dispatchEvent(new Event("omnimind:first-run-readiness:resume"));
}
