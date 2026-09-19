import type { EngineKind, EngineModelDescriptor, ThreadId } from "@harnessos/contracts";

import { FastModeIcon, FastModeOutlineIcon, Undo2Icon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";
import { useComposerDraftStore } from "../../composerDraftStore";
import { buildNextEngineOptions, type EngineOptions } from "../../engineModelOptions";
import { Slider } from "../ui/slider";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  getComposerTraitSelection,
  planComposerEffortChange,
  resolveComposerEffortLadderIndex,
  resolveComposerTraitStatusLabel,
  supportsComposerFastModeControl,
} from "./composerTraits";

type ComposerEffortSliderCardProps = {
  engine: EngineKind;
  threadId: ThreadId;
  model: string | null | undefined;
  modelLabel: string;
  runtimeModel?: EngineModelDescriptor | undefined;
  modelOptions: EngineOptions | null | undefined;
  prompt: string;
  onPromptChange: (prompt: string) => void;
};

const CARD_ICON_BUTTON_CLASS_NAME =
  "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-border-focus)]/60 disabled:pointer-events-none disabled:opacity-35";

const MAX_FULLY_LABELLED_STOPS = 5;

export function ComposerEffortSliderCard(props: ComposerEffortSliderCardProps) {
  const { t } = useI18n();
  const { engine, threadId, model, modelOptions, prompt, onPromptChange } = props;
  const selection = getComposerTraitSelection(
    engine,
    model,
    prompt,
    modelOptions,
    props.runtimeModel,
  );
  const { effortLevels, defaultEffort, effort, fastModeEnabled, ultrathinkPromptControlled } =
    selection;
  const supportsFastMode = supportsComposerFastModeControl(selection);
  const setEngineModelOptions = useComposerDraftStore((store) => store.setEngineModelOptions);
  const commitTrait = (patch: Record<string, unknown>) => {
    setEngineModelOptions(threadId, engine, buildNextEngineOptions(engine, modelOptions, patch), {
      ...(model !== undefined ? { model } : {}),
      persistSticky: true,
    });
  };

  const ladderIndex = resolveComposerEffortLadderIndex(selection);
  const activeLevel = effortLevels[ladderIndex];
  const statusLabel =
    resolveComposerTraitStatusLabel(selection, {
      ultrathink: t("composer.ultrathink"),
      thinkingOn: t("composer.thinkingOn"),
      thinkingOff: t("composer.thinkingOff"),
    }) ??
    activeLevel?.label ??
    t("composer.effort");
  const effortIsDefault = ultrathinkPromptControlled || effort === defaultEffort;
  const canReset = fastModeEnabled || !effortIsDefault;

  const lastIndex = Math.max(effortLevels.length - 1, 0);
  const showsEveryStopLabel = effortLevels.length <= MAX_FULLY_LABELLED_STOPS;

  const handleSliderChange = (nextIndex: number) => {
    if (nextIndex === ladderIndex) return;
    const nextLevel = effortLevels[nextIndex];
    if (!nextLevel) return;
    const plan = planComposerEffortChange({ engine, selection, prompt, value: nextLevel.value });
    if (!plan) return;
    if (plan.kind === "prompt") {
      onPromptChange(plan.prompt);
      return;
    }
    commitTrait(plan.patch);
  };

  const handleReset = () => {
    const effortPlan =
      defaultEffort && !effortIsDefault
        ? planComposerEffortChange({ engine, selection, prompt, value: defaultEffort })
        : null;
    commitTrait({
      ...(effortPlan?.kind === "options" ? effortPlan.patch : {}),
      ...(fastModeEnabled ? { fastMode: false } : {}),
    });
  };

  return (
    <div className="px-1 pt-0.5 pb-1" data-slot="effort-slider-card">
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center gap-1">
        {supportsFastMode ? (
          <button
            type="button"
            aria-label={fastModeEnabled ? t("composer.fastModeOn") : t("composer.fastModeOff")}
            className={cn(
              CARD_ICON_BUTTON_CLASS_NAME,
              fastModeEnabled
                ? "text-[hsl(var(--chart-4))]"
                : "text-muted-foreground/70 hover:text-[var(--color-text-foreground)]",
            )}
            onClick={() => commitTrait({ fastMode: !fastModeEnabled })}
          >
            {fastModeEnabled ? (
              <FastModeIcon aria-hidden="true" className="size-3.5" />
            ) : (
              <FastModeOutlineIcon aria-hidden="true" className="size-3.5" />
            )}
          </button>
        ) : (
          <span aria-hidden="true" className="size-6" />
        )}
        <div className="flex min-w-0 flex-col items-center justify-center px-2 py-0.5 text-center leading-snug">
          <span className="whitespace-nowrap font-medium text-[length:var(--app-font-size-ui,12px)] text-[var(--color-text-accent)]">
            {statusLabel}
          </span>
          <span className="max-w-full truncate text-[length:var(--app-font-size-ui-sm,11px)] text-muted-foreground">
            {props.modelLabel}
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={t("composer.resetEffortAndSpeed")}
                disabled={!canReset}
                className={cn(
                  CARD_ICON_BUTTON_CLASS_NAME,
                  "text-muted-foreground/70 hover:text-[var(--color-text-foreground)]",
                )}
                onClick={handleReset}
              />
            }
          >
            <Undo2Icon aria-hidden="true" className="size-3.5" />
          </TooltipTrigger>
          <TooltipPopup side="top" variant="picker">
            {t("composer.resetToDefaults")}
          </TooltipPopup>
        </Tooltip>
      </div>
      <div className="mt-1 px-0.5">
        <Slider
          value={ladderIndex}
          min={0}
          max={lastIndex}
          step={1}
          size="large"
          showStepMarks
          magnetic
          disabled={ultrathinkPromptControlled}
          aria-label={t("composer.effort")}
          getAriaValueText={(index) => effortLevels[index]?.label ?? String(index)}
          onValueChange={handleSliderChange}
        />
        {lastIndex > 0 ? (
          <div className="relative mx-2.5 mt-1 h-3.5">
            {effortLevels.map((level, index) => {
              const active = index === ladderIndex;
              if (!showsEveryStopLabel && !active && index !== 0 && index !== lastIndex) {
                return null;
              }
              return (
                <button
                  key={level.value}
                  type="button"
                  tabIndex={-1}
                  disabled={ultrathinkPromptControlled}
                  aria-label={t("composer.setEffortTo", { level: level.label })}
                  className={cn(
                    "absolute top-0 cursor-pointer whitespace-nowrap text-[length:var(--app-font-size-ui-xs,10px)] leading-3.5 transition-colors disabled:pointer-events-none",
                    index === 0 ? "-left-2" : index === lastIndex ? "-right-2" : "-translate-x-1/2",
                    active
                      ? "font-medium text-[var(--color-text-accent)]"
                      : "text-muted-foreground/70 hover:text-[var(--color-text-foreground)]",
                  )}
                  style={
                    index === 0 || index === lastIndex
                      ? undefined
                      : { left: `${(index / lastIndex) * 100}%` }
                  }
                  onClick={() => handleSliderChange(index)}
                >
                  {level.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {ultrathinkPromptControlled ? (
        <div className="px-1 pt-1 text-muted-foreground/80 text-xs">
          {t("composer.removeUltrathinkToChangeEffort")}
        </div>
      ) : null}
    </div>
  );
}
