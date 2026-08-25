// FILE: TraitsPicker.tsx
// Purpose: Renders composer trait controls for effort, thinking, and fast mode across menu surfaces.
// Layer: Chat composer presentation
// Depends on: shared trait resolution helpers, provider model option updates, and shared menu primitives.

import {
  type OpenCodeModelOptions,
  type ProviderAgentDescriptor,
  type ProviderKind,
  type ProviderModelDescriptor,
  type ThreadId,
} from "@omnimind/contracts";
import { applyClaudePromptEffortPrefix } from "@omnimind/shared/model";
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon, FastModeIcon, FastModeOutlineIcon, SettingsIcon } from "~/lib/icons";
import { Button } from "../ui/button";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator as MenuDivider,
  MenuTrigger,
} from "../ui/menu";
import { useComposerDraftStore } from "../../composerDraftStore";
import {
  buildNextProviderOptions,
  buildProviderOptionPatch,
  type ProviderOptions,
} from "../../providerModelOptions";
import { COMPOSER_PICKER_TRIGGER_TEXT_CLASS_NAME } from "./composerPickerStyles";
import { ComposerPickerMenuPopup } from "./ComposerPickerMenuPopup";
import {
  getComposerTraitSelection,
  hasVisibleComposerTraitControls,
  resolveComposerTraitStatusLabel,
  showsComposerFastModeBadge,
  supportsComposerFastModeControl,
} from "./composerTraits";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { ShortcutKbd } from "../ui/shortcut-kbd";
import { useI18n } from "~/i18n";

const ULTRATHINK_PROMPT_PREFIX = "Ultrathink:\n";

function defaultAgentForProvider(provider: ProviderKind): string | null {
  if (provider === "kilo") return "code";
  if (provider === "opencode") return "build";
  return null;
}

function getAgentOptions(
  provider: ProviderKind,
  runtimeAgents: ReadonlyArray<ProviderAgentDescriptor> | null | undefined,
): ReadonlyArray<ProviderAgentDescriptor> {
  if (provider !== "kilo" && provider !== "opencode") return [];
  return runtimeAgents ?? [];
}

function getSelectedAgentValue(
  provider: ProviderKind,
  modelOptions: ProviderOptions | null | undefined,
): string | null {
  const defaultAgent = defaultAgentForProvider(provider);
  if (!defaultAgent) return null;
  const selectedAgent = (modelOptions as OpenCodeModelOptions | undefined)?.agent?.trim();
  return selectedAgent && selectedAgent.length > 0 ? selectedAgent : defaultAgent;
}

function findAgentLabel(
  agents: ReadonlyArray<ProviderAgentDescriptor>,
  value: string | null,
): string | null {
  if (!value) return null;
  const agent = agents.find((candidate) => candidate.name === value);
  return agent?.displayName ?? value;
}

// Mirrors the trigger label assembly so callers (e.g. the composer footer
// width planner) can measure the summary without rendering the picker.
export function resolveTraitsTriggerSummary(options: {
  provider: ProviderKind;
  model: string | null | undefined;
  prompt: string;
  modelOptions: ProviderOptions | null | undefined;
  runtimeModel?: ProviderModelDescriptor | undefined;
  runtimeAgents: ReadonlyArray<ProviderAgentDescriptor> | null | undefined;
  labels?: {
    readonly fast: string;
    readonly default: string;
    readonly ultrathink: string;
    readonly thinkingOn: string;
    readonly thinkingOff: string;
  };
}): {
  contextWindowLabel: string | null;
  primaryLabel: string | null;
  showsFastBadge: boolean;
  summaryText: string;
} {
  const selection = getComposerTraitSelection(
    options.provider,
    options.model,
    options.prompt,
    options.modelOptions,
    options.runtimeModel,
  );
  const {
    effortLevels,
    thinkingEnabled,
    fastModeEnabled,
    contextWindow,
    contextWindowOptions,
    defaultContextWindow,
  } = selection;
  // Providers whose only trait control is the fast toggle surface it as the
  // primary label ("Fast"/"Default") instead of the appended badge.
  const isFastOnlyControl =
    supportsComposerFastModeControl(selection) &&
    effortLevels.length === 0 &&
    thinkingEnabled === null &&
    contextWindowOptions.length <= 1;
  // The shared status ladder (ultrathink → effort → thinking) covers every model
  // that exposes those controls; the fast-only fallback only applies when it does not.
  const primaryLabel =
    resolveComposerTraitStatusLabel(selection, options.labels) ??
    (isFastOnlyControl
      ? fastModeEnabled
        ? (options.labels?.fast ?? "Fast")
        : (options.labels?.default ?? "Default")
      : null);
  // Only departures from the default context window earn a label.
  const contextWindowLabel =
    contextWindowOptions.length > 1 && contextWindow !== defaultContextWindow
      ? (contextWindowOptions.find((option) => option.value === contextWindow)?.label ?? null)
      : null;
  const agentOptions = getAgentOptions(options.provider, options.runtimeAgents);
  const explicitAgent = (options.modelOptions as OpenCodeModelOptions | undefined)?.agent?.trim();
  const selectedAgent = getSelectedAgentValue(options.provider, options.modelOptions);
  const agentLabel = findAgentLabel(agentOptions, selectedAgent);
  // An explicit Agent/Mode choice is more informative than a default Variant.
  // Otherwise preserve the established primary-trait summary, falling back to
  // the provider-owned default Agent/Mode when it is the only useful option.
  const resolvedPrimaryLabel = explicitAgent ? agentLabel : (primaryLabel ?? agentLabel);
  const showsFastBadge = showsComposerFastModeBadge(selection) && !isFastOnlyControl;
  const summaryText = [
    resolvedPrimaryLabel,
    showsFastBadge ? (options.labels?.fast ?? "Fast") : null,
    contextWindowLabel,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return {
    contextWindowLabel,
    primaryLabel: resolvedPrimaryLabel,
    showsFastBadge,
    summaryText,
  };
}

interface TraitRadioOption {
  value: string;
  label: string;
  isDefault?: boolean;
  description?: string | null;
}

// Shared layout for one composer trait section: a labeled radio group whose rows
// optionally show a "(default)" suffix and a right-side description tooltip.
// `onSelectionComplete` runs on every row click (not just on value change) so
// re-selecting the already-active option still closes the menu — a radio group's
// `onValueChange` does not fire when the value is unchanged.
function TraitRadioSection({
  label,
  note,
  value,
  options,
  disabled,
  onValueChange,
  onSelectionComplete,
}: {
  label: string;
  note?: ReactNode;
  value: string;
  options: ReadonlyArray<TraitRadioOption>;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onSelectionComplete?: (() => void) | undefined;
}) {
  const { t } = useI18n();
  return (
    <MenuGroup>
      <MenuGroupLabel>{label}</MenuGroupLabel>
      {note}
      <MenuRadioGroup value={value} onValueChange={onValueChange}>
        {options.map((option) => {
          const optionLabel = `${option.label}${option.isDefault ? t("composer.defaultSuffix") : ""}`;
          const item = (
            <MenuRadioItem
              key={option.value}
              value={option.value}
              aria-label={optionLabel}
              title={optionLabel}
              preserveChildLayout
              className="grid-cols-[minmax(0,1fr)_auto]"
              {...(disabled ? { disabled: true } : {})}
              onClick={() => onSelectionComplete?.()}
            >
              <span className="block min-w-0 truncate">{optionLabel}</span>
            </MenuRadioItem>
          );
          return option.description ? (
            <Tooltip key={option.value}>
              <TooltipTrigger render={item} />
              <TooltipPopup
                side="right"
                variant="picker"
                className="max-w-80 whitespace-normal leading-tight"
              >
                {option.description}
              </TooltipPopup>
            </Tooltip>
          ) : (
            item
          );
        })}
      </MenuRadioGroup>
    </MenuGroup>
  );
}

export interface TraitsMenuContentProps {
  provider: ProviderKind;
  threadId: ThreadId;
  model: string | null | undefined;
  runtimeModel?: ProviderModelDescriptor | undefined;
  runtimeModels?: ReadonlyArray<ProviderModelDescriptor> | null | undefined;
  runtimeAgents?: ReadonlyArray<ProviderAgentDescriptor> | null | undefined;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  includeFastMode?: boolean;
  modelOptions?: ProviderOptions | null | undefined;
  onSelectionComplete?: () => void;
}

export const TraitsMenuContent = memo(function TraitsMenuContentImpl({
  provider,
  threadId,
  model,
  runtimeModel,
  runtimeAgents,
  prompt,
  onPromptChange,
  includeFastMode: includeFastModeProp,
  modelOptions,
  onSelectionComplete,
}: TraitsMenuContentProps) {
  const { t } = useI18n();
  const includeFastMode = includeFastModeProp ?? true;
  const setProviderModelOptions = useComposerDraftStore((store) => store.setProviderModelOptions);
  const {
    caps,
    defaultEffort,
    effort,
    effortLevels,
    thinkingEnabled,
    fastModeEnabled,
    contextWindowOptions,
    contextWindow,
    defaultContextWindow,
    contextWindowDescriptor,
    ultrathinkPromptControlled,
    primarySelectDescriptor,
    fastModeDescriptor,
    promptInjectedValues,
  } = getComposerTraitSelection(provider, model, prompt, modelOptions, runtimeModel);
  const hasVisibleControls = hasVisibleComposerTraitControls(
    { caps, effortLevels, thinkingEnabled, contextWindowOptions, fastModeDescriptor },
    { includeFastMode },
  );
  const supportsFastModeControl = supportsComposerFastModeControl({ caps, fastModeDescriptor });
  // Fast mode rides the Effort header as a compact icon toggle whenever an
  // effort section exists; fast-only models (no effort levels) keep the
  // standalone radio section instead.
  const showsFastModeEffortToggle =
    includeFastMode && supportsFastModeControl && effortLevels.length > 0;
  const agentOptions = getAgentOptions(provider, runtimeAgents);
  const defaultAgent = defaultAgentForProvider(provider);
  const selectedAgent = getSelectedAgentValue(provider, modelOptions);
  const hasAgentControls = agentOptions.length > 0 && defaultAgent !== null;
  const hasPriorContextWindowSection = thinkingEnabled !== null;
  // Both descriptor ids are resolved up here rather than inline. React Compiler cannot lower a `??`
  // in an object-key position, and it cannot match an optional-chained expression in a dependency
  // list to its own inferred scope — either one makes it skip this component entirely.
  const contextWindowTraitId = contextWindowDescriptor?.id ?? "contextWindow";
  const primarySelectDescriptorId = primarySelectDescriptor?.id;
  const hasPriorEffortSection = thinkingEnabled !== null || contextWindowOptions.length > 1;
  const hasPriorFastModeSection =
    thinkingEnabled !== null || effortLevels.length > 0 || contextWindowOptions.length > 1;

  // Single home for committing a trait change: merge the patch into the provider
  // options, persist it as sticky, and close the menu. Every section funnels here.
  // The fast-mode header toggle passes `keepMenuOpen` so its state flip stays visible.
  const commitTrait = useCallback(
    (patch: Record<string, unknown>, options?: { keepMenuOpen?: boolean }) => {
      setProviderModelOptions(
        threadId,
        provider,
        buildNextProviderOptions(provider, modelOptions, patch),
        { ...(model !== undefined ? { model } : {}), persistSticky: true },
      );
      if (!options?.keepMenuOpen) {
        onSelectionComplete?.();
      }
    },
    [threadId, provider, modelOptions, model, setProviderModelOptions, onSelectionComplete],
  );

  // Deliberately not wrapped in `useCallback`: its inputs all come out of one
  // `getComposerTraitSelection` call, which React Compiler memoizes as a single scope, so no
  // hand-written dependency list can match it and the validator refuses to compile the component at
  // all. Letting the compiler own this memoization is what gets the whole file optimized.
  const handleEffortChange = (value: string) => {
    if (ultrathinkPromptControlled) return;
    if (!value) return;
    const nextOption = effortLevels.find((option) => option.value === value);
    if (!nextOption) return;
    if (promptInjectedValues.includes(nextOption.value)) {
      const nextPrompt =
        prompt.trim().length === 0
          ? ULTRATHINK_PROMPT_PREFIX
          : applyClaudePromptEffortPrefix(prompt, "ultrathink");
      onPromptChange(nextPrompt);
      onSelectionComplete?.();
      return;
    }
    const optionId =
      primarySelectDescriptorId ??
      (provider === "kilo" || provider === "opencode"
        ? "variant"
        : provider === "pi" || provider === "omnimind"
          ? "thinkingLevel"
          : provider === "claudeAgent"
            ? "effort"
            : "reasoningEffort");
    commitTrait(buildProviderOptionPatch(provider, optionId, nextOption.value));
  };

  if (!hasVisibleControls && !hasAgentControls) {
    return null;
  }

  return (
    <>
      {thinkingEnabled !== null ? (
        <TraitRadioSection
          label={t("composer.thinking")}
          value={thinkingEnabled ? "on" : "off"}
          options={[
            { value: "on", label: t("common.onDefault") },
            { value: "off", label: t("common.off") },
          ]}
          onValueChange={(value) => commitTrait({ thinking: value === "on" })}
          onSelectionComplete={onSelectionComplete}
        />
      ) : null}
      {contextWindowOptions.length > 1 ? (
        <>
          {hasPriorContextWindowSection ? <MenuDivider /> : null}
          <TraitRadioSection
            label={t("composer.context")}
            value={contextWindow ?? defaultContextWindow ?? ""}
            options={contextWindowOptions.map((option) => ({
              value: option.value,
              label: option.label,
              isDefault: option.value === defaultContextWindow,
            }))}
            onValueChange={(value) => commitTrait({ [contextWindowTraitId]: value })}
            onSelectionComplete={onSelectionComplete}
          />
        </>
      ) : null}
      {effortLevels.length > 0 ? (
        <>
          {hasPriorEffortSection ? <MenuDivider /> : null}
          <TraitRadioSection
            label={
              provider === "kilo" || provider === "opencode"
                ? t("composer.variant")
                : provider === "pi" || provider === "omnimind"
                  ? t("composer.thinkingLevel")
                  : t("composer.effort")
            }
            note={
              ultrathinkPromptControlled ? (
                <div className="px-2 pb-1.5 text-muted-foreground/80 text-xs">
                  {t("composer.removeUltrathinkToChangeEffort")}
                </div>
              ) : undefined
            }
            value={effort ?? ""}
            disabled={ultrathinkPromptControlled}
            options={effortLevels.map((option) => ({
              value: option.value,
              label: option.label,
              isDefault: option.value === defaultEffort,
              description: option.description ?? null,
            }))}
            onValueChange={handleEffortChange}
            onSelectionComplete={onSelectionComplete}
          />
          {showsFastModeEffortToggle ? (
            <MenuCheckboxItem
              checked={fastModeEnabled}
              closeOnClick={false}
              onCheckedChange={(checked) =>
                commitTrait({ fastMode: checked === true }, { keepMenuOpen: true })
              }
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                {fastModeEnabled ? (
                  <FastModeIcon
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-[hsl(var(--chart-4))]"
                  />
                ) : (
                  <FastModeOutlineIcon
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground/70"
                  />
                )}
                <span className="truncate">{t("composer.fastMode")}</span>
              </span>
            </MenuCheckboxItem>
          ) : null}
        </>
      ) : null}
      {includeFastMode && supportsFastModeControl && !showsFastModeEffortToggle ? (
        <>
          {hasPriorFastModeSection ? <MenuDivider /> : null}
          <TraitRadioSection
            label={t("composer.speed")}
            value={fastModeEnabled ? "on" : "off"}
            options={[
              { value: "off", label: t("composer.default") },
              { value: "on", label: t("composer.fast") },
            ]}
            onValueChange={(value) => commitTrait({ fastMode: value === "on" })}
            onSelectionComplete={onSelectionComplete}
          />
        </>
      ) : null}
      {hasAgentControls ? (
        <>
          {hasVisibleControls ? <MenuDivider /> : null}
          <TraitRadioSection
            label={provider === "kilo" ? t("composer.mode") : t("composer.agent")}
            value={selectedAgent ?? defaultAgent ?? ""}
            options={agentOptions.map((agent) => ({
              value: agent.name,
              label: agent.displayName,
              isDefault: agent.name === defaultAgent,
              description: agent.description ?? null,
            }))}
            onValueChange={(value) => {
              if (!value || !defaultAgent) return;
              commitTrait({ agent: value === defaultAgent ? undefined : value });
            }}
            onSelectionComplete={onSelectionComplete}
          />
        </>
      ) : null}
    </>
  );
});

export const TraitsPicker = memo(function TraitsPicker({
  provider,
  threadId,
  model,
  runtimeModel,
  runtimeAgents,
  prompt,
  onPromptChange,
  includeFastMode: includeFastModeProp,
  modelOptions,
  open,
  onOpenChange,
  onSelectionCommitted,
  shortcutLabel,
  hideLabel: hideLabelProp,
}: TraitsMenuContentProps & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectionCommitted?: () => void;
  shortcutLabel?: string | null;
  // Icon-only trigger (gear + chevron) for narrow composers; the effort/context
  // summary moves to title/sr-only.
  hideLabel?: boolean;
}) {
  const { t } = useI18n();
  const includeFastMode = includeFastModeProp ?? true;
  const hideLabel = hideLabelProp ?? false;
  const [uncontrolledMenuOpen, setUncontrolledMenuOpen] = useState(false);
  const selectionCommitTimerRef = useRef<number | null>(null);
  const isMenuOpen = open ?? uncontrolledMenuOpen;
  const setMenuOpen = useCallback(
    (nextOpen: boolean) => {
      if (open === undefined) {
        setUncontrolledMenuOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, open],
  );
  const scheduleSelectionCommitted = useCallback(() => {
    if (selectionCommitTimerRef.current !== null) {
      window.clearTimeout(selectionCommitTimerRef.current);
    }
    selectionCommitTimerRef.current = window.setTimeout(() => {
      selectionCommitTimerRef.current = null;
      onSelectionCommitted?.();
    }, 0);
  }, [onSelectionCommitted]);
  useEffect(
    () => () => {
      if (selectionCommitTimerRef.current !== null) {
        window.clearTimeout(selectionCommitTimerRef.current);
      }
    },
    [],
  );
  const handleSelectionComplete = useCallback(() => {
    setMenuOpen(false);
    scheduleSelectionCommitted();
  }, [scheduleSelectionCommitted, setMenuOpen]);
  const { caps, effortLevels, thinkingEnabled, contextWindowOptions, fastModeDescriptor } =
    getComposerTraitSelection(provider, model, prompt, modelOptions, runtimeModel);
  const hasVisibleControls = hasVisibleComposerTraitControls(
    { caps, effortLevels, thinkingEnabled, contextWindowOptions, fastModeDescriptor },
    { includeFastMode },
  );
  const agentOptions = getAgentOptions(provider, runtimeAgents);
  const defaultAgent = defaultAgentForProvider(provider);
  const hasAgentControls = agentOptions.length > 0 && defaultAgent !== null;

  if (!hasVisibleControls && !hasAgentControls) {
    return null;
  }

  const {
    contextWindowLabel,
    primaryLabel: visiblePrimaryTriggerLabel,
    showsFastBadge,
    summaryText: hiddenLabelTitle,
  } = resolveTraitsTriggerSummary({
    provider,
    model,
    prompt,
    modelOptions,
    runtimeModel,
    runtimeAgents,
    labels: {
      fast: t("composer.fast"),
      default: t("composer.default"),
      ultrathink: t("composer.ultrathink"),
      thinkingOn: t("composer.thinkingOn"),
      thinkingOff: t("composer.thinkingOff"),
    },
  });

  const isCodexStyle = provider === "codex";

  const triggerButton = (
    <Button
      size="sm"
      variant="chrome"
      className={`min-w-0 shrink-0 justify-start overflow-hidden whitespace-nowrap px-2 sm:px-2.5 [&_svg]:mx-0 ${COMPOSER_PICKER_TRIGGER_TEXT_CLASS_NAME}`}
      aria-label={t("composer.changeNativeOptions")}
      {...(hideLabel && hiddenLabelTitle.length > 0 ? { title: hiddenLabelTitle } : {})}
    />
  );

  const triggerContent = hideLabel ? (
    <span className="flex min-w-0 items-center gap-1">
      <SettingsIcon aria-hidden="true" className="size-3.5 shrink-0 opacity-75" />
      {hiddenLabelTitle.length > 0 ? <span className="sr-only">{hiddenLabelTitle}</span> : null}
      <ChevronDownIcon aria-hidden="true" className="size-3 shrink-0 opacity-60" />
    </span>
  ) : isCodexStyle ? (
    <span className="flex min-w-0 w-full items-center gap-2 overflow-hidden">
      <span className="min-w-0 flex flex-1 items-center gap-1.5 truncate">
        {visiblePrimaryTriggerLabel ? (
          <span className="truncate">{visiblePrimaryTriggerLabel}</span>
        ) : (
          <span className="truncate">{t("composer.options")}</span>
        )}
        {showsFastBadge ? (
          <>
            <span className="shrink-0 text-muted-foreground/45">·</span>
            <span className="inline-flex shrink-0 items-center gap-1">
              <FastModeIcon aria-hidden="true" className="size-3 text-[hsl(var(--chart-4))]" />
              <span>{t("composer.fast")}</span>
            </span>
          </>
        ) : null}
        {contextWindowLabel ? (
          <>
            {visiblePrimaryTriggerLabel || showsFastBadge ? (
              <span className="shrink-0 text-muted-foreground/45">·</span>
            ) : null}
            <span className="shrink-0">{contextWindowLabel}</span>
          </>
        ) : null}
      </span>
      <ChevronDownIcon aria-hidden="true" className="size-3 shrink-0 opacity-60" />
    </span>
  ) : (
    <>
      <span className="inline-flex items-center gap-1.5">
        <span>{visiblePrimaryTriggerLabel ?? t("composer.options")}</span>
        {showsFastBadge ? (
          <>
            <span className="text-muted-foreground/45">·</span>
            <span className="inline-flex items-center gap-1">
              <FastModeIcon aria-hidden="true" className="size-3 text-[hsl(var(--chart-4))]" />
              <span>{t("composer.fast")}</span>
            </span>
          </>
        ) : null}
        {contextWindowLabel ? (
          <>
            {visiblePrimaryTriggerLabel || showsFastBadge ? (
              <span className="text-muted-foreground/45">·</span>
            ) : null}
            <span>{contextWindowLabel}</span>
          </>
        ) : null}
      </span>
      <ChevronDownIcon aria-hidden="true" className="size-3 opacity-60" />
    </>
  );

  return (
    <Menu
      open={isMenuOpen}
      onOpenChange={(open) => {
        setMenuOpen(open);
      }}
    >
      {shortcutLabel ? (
        <Tooltip>
          <TooltipTrigger render={<MenuTrigger render={triggerButton} />}>
            {triggerContent}
          </TooltipTrigger>
          {!isMenuOpen ? (
            <TooltipPopup side="top" sideOffset={6} variant="picker">
              <span className="inline-flex items-center gap-2 px-1 py-0.5">
                <span>{t("composer.changeNativeOptions")}</span>
                <ShortcutKbd
                  shortcutLabel={shortcutLabel}
                  className="h-4 min-w-4 px-1 text-[length:var(--app-font-size-ui-2xs,9px)] text-muted-foreground"
                />
              </span>
            </TooltipPopup>
          ) : null}
        </Tooltip>
      ) : (
        <MenuTrigger render={triggerButton}>{triggerContent}</MenuTrigger>
      )}
      <ComposerPickerMenuPopup align="start" fixedWidth>
        <TraitsMenuContent
          provider={provider}
          threadId={threadId}
          model={model}
          runtimeModel={runtimeModel}
          runtimeAgents={runtimeAgents}
          prompt={prompt}
          onPromptChange={onPromptChange}
          includeFastMode={includeFastMode}
          modelOptions={modelOptions}
          onSelectionComplete={handleSelectionComplete}
        />
      </ComposerPickerMenuPopup>
    </Menu>
  );
});
