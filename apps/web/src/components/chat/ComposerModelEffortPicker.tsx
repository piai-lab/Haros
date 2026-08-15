// FILE: ComposerModelEffortPicker.tsx
// Purpose: Current-Engine model and native-options picker for the chat Composer.
// Layer: Chat composer presentation

import {
  type ModelSlug,
  type ProviderAgentDescriptor,
  type ProviderKind,
  type ProviderModelDescriptor,
  type ProviderModelOptions,
  type ThreadId,
} from "@omnimind/contracts";
import { useState } from "react";

import { useI18n } from "~/i18n";
import { ChevronDownIcon, FastModeIcon, RefreshCwIcon, SettingsIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import type { ProviderModelCatalogState } from "../../hooks/useProviderModelCatalog";
import type { ProviderModelOption } from "../../providerModelOptions";
import { Button } from "../ui/button";
import { Menu, MenuItem, MenuSeparator, MenuSub, MenuSubTrigger, MenuTrigger } from "../ui/menu";
import { ShortcutKbd } from "../ui/shortcut-kbd";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  COMPOSER_MUTED_ACCENT_TEXT_CLASS_NAME,
  COMPOSER_PICKER_MODEL_SUBMENU_HEIGHT_CLASS_NAME,
  COMPOSER_PICKER_TRIGGER_TEXT_CLASS_NAME,
} from "./composerPickerStyles";
import { ComposerPickerMenuPopup, ComposerPickerMenuSubPopup } from "./ComposerPickerMenuPopup";
import { renderProviderTraitsMenuContent } from "./composerProviderRegistry";
import { ProviderModelMenuItems, resolveProviderModelLabel } from "./ProviderModelPicker";
import { resolveTraitsTriggerSummary } from "./TraitsPicker";

type ComposerModelEffortPickerProps = {
  provider: ProviderKind;
  model: ModelSlug | null;
  catalogState: ProviderModelCatalogState;
  modelOptionsByProvider: Record<ProviderKind, ReadonlyArray<ProviderModelOption>>;
  loadingModelProviders?: Partial<Record<ProviderKind, boolean>>;
  compact?: boolean;
  hideModelLabel?: boolean;
  hideStatusLabel?: boolean;
  disabled?: boolean;
  onProviderModelChange: (provider: ProviderKind, model: ModelSlug) => void;
  onRefreshModels: () => void;
  onOpenSettings: () => void;
  onSelectionCommitted?: () => void;
  threadId: ThreadId;
  runtimeModel?: ProviderModelDescriptor | undefined;
  runtimeModels?: ReadonlyArray<ProviderModelDescriptor> | null | undefined;
  runtimeAgents?: ReadonlyArray<ProviderAgentDescriptor> | null | undefined;
  modelOptions: ProviderModelOptions[ProviderKind] | undefined;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  shortcutLabel?: string | null;
};

export function ComposerModelEffortPicker(props: ComposerModelEffortPickerProps) {
  const { t } = useI18n();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isMenuOpen = props.open ?? uncontrolledOpen;
  const setMenuOpen = (nextOpen: boolean) => {
    if (props.open === undefined) setUncontrolledOpen(nextOpen);
    props.onOpenChange?.(nextOpen);
  };

  const modelLabel = props.model
    ? resolveProviderModelLabel({
        provider: props.provider,
        lockedProvider: props.provider,
        model: props.model,
        modelOptionsByProvider: props.modelOptionsByProvider,
      })
    : t("composer.noAvailableModel");
  const traitsSummary = resolveTraitsTriggerSummary({
    provider: props.provider,
    model: props.model,
    prompt: props.prompt,
    modelOptions: props.modelOptions,
    runtimeModel: props.runtimeModel,
    runtimeAgents: props.runtimeAgents,
    labels: {
      fast: t("composer.fast"),
      default: t("composer.default"),
      ultrathink: t("composer.ultrathink"),
      thinkingOn: t("composer.thinkingOn"),
      thinkingOff: t("composer.thinkingOff"),
    },
  });
  const triggerStatusLabel = props.model ? traitsSummary.summaryText || null : null;
  const showsFastBadge = props.model ? traitsSummary.showsFastBadge : false;
  const catalogIsChecking = props.catalogState === "checking";
  const catalogIsIdle = props.catalogState === "idle";
  const catalogIsStale = props.catalogState === "stale";
  const catalogIsError = props.catalogState === "error";
  const closeAndRefocus = () => {
    setMenuOpen(false);
    props.onSelectionCommitted?.();
  };
  const traitsContent = props.model
    ? renderProviderTraitsMenuContent({
        provider: props.provider,
        threadId: props.threadId,
        model: props.model,
        ...(props.runtimeModel ? { runtimeModel: props.runtimeModel } : {}),
        ...(props.runtimeModels !== undefined ? { runtimeModels: props.runtimeModels } : {}),
        ...(props.runtimeAgents !== undefined ? { runtimeAgents: props.runtimeAgents } : {}),
        modelOptions: props.modelOptions,
        prompt: props.prompt,
        onPromptChange: props.onPromptChange,
        onSelectionComplete: closeAndRefocus,
      })
    : null;

  const hiddenTriggerTitle = [
    props.hideModelLabel ? modelLabel : null,
    props.hideStatusLabel ? traitsSummary.summaryText : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  const trigger = (
    <Button
      size="sm"
      variant="chrome"
      disabled={props.disabled ?? false}
      className={cn(
        "min-w-0 shrink-0 justify-start gap-1.5 whitespace-nowrap px-2 sm:px-2.5 [&_svg]:mx-0",
        COMPOSER_PICKER_TRIGGER_TEXT_CLASS_NAME,
      )}
      aria-label={t("composer.changeModelReasoning")}
      {...(hiddenTriggerTitle ? { title: hiddenTriggerTitle } : {})}
    />
  );
  const triggerContent = (
    <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      {props.hideModelLabel ? (
        <span className="sr-only">{modelLabel}</span>
      ) : (
        <span className="min-w-0 truncate text-[var(--color-text-foreground)]">{modelLabel}</span>
      )}
      {triggerStatusLabel ? (
        props.hideStatusLabel ? (
          <>
            <SettingsIcon
              aria-hidden="true"
              className={cn("size-3.5 shrink-0", COMPOSER_MUTED_ACCENT_TEXT_CLASS_NAME)}
            />
            <span className="sr-only">{triggerStatusLabel}</span>
          </>
        ) : (
          <>
            {traitsSummary.primaryLabel ? (
              <span
                data-composer-primary-option="true"
                className={cn("shrink-0", COMPOSER_MUTED_ACCENT_TEXT_CLASS_NAME)}
              >
                {traitsSummary.primaryLabel}
              </span>
            ) : null}
            {showsFastBadge ? (
              <span
                data-composer-fast-badge="true"
                aria-hidden="true"
                className={cn("inline-flex shrink-0", COMPOSER_MUTED_ACCENT_TEXT_CLASS_NAME)}
              >
                <FastModeIcon className="size-3.5" />
              </span>
            ) : null}
            {traitsSummary.contextWindowLabel ? (
              <span
                data-composer-context-option="true"
                className={cn("shrink-0", COMPOSER_MUTED_ACCENT_TEXT_CLASS_NAME)}
              >
                {traitsSummary.contextWindowLabel}
              </span>
            ) : null}
          </>
        )
      ) : showsFastBadge ? (
        <span
          data-composer-fast-badge="true"
          aria-hidden="true"
          className={cn("inline-flex shrink-0", COMPOSER_MUTED_ACCENT_TEXT_CLASS_NAME)}
        >
          <FastModeIcon className="size-3.5" />
        </span>
      ) : null}
      <ChevronDownIcon aria-hidden="true" className="ms-0.5 size-3 shrink-0 opacity-60" />
    </span>
  );

  return (
    <Menu
      open={isMenuOpen}
      onOpenChange={(nextOpen) => {
        if (props.disabled) {
          setMenuOpen(false);
          return;
        }
        setMenuOpen(nextOpen);
      }}
    >
      <Tooltip>
        <TooltipTrigger render={<MenuTrigger render={trigger} />}>{triggerContent}</TooltipTrigger>
        {!isMenuOpen ? (
          <TooltipPopup side="top" sideOffset={6} variant="picker">
            <span className="inline-flex items-center gap-2 px-1 py-0.5">
              <span>{t("composer.changeModelReasoning")}</span>
              {props.shortcutLabel ? <ShortcutKbd shortcutLabel={props.shortcutLabel} /> : null}
            </span>
          </TooltipPopup>
        ) : null}
      </Tooltip>
      <ComposerPickerMenuPopup align="end" side="top" fixedWidth>
        {props.model ? (
          <>
            {catalogIsStale || catalogIsError || catalogIsIdle ? (
              <>
                <div className="px-2 py-2" role="status">
                  <p className="text-sm text-foreground">
                    {catalogIsStale
                      ? t("composer.modelCatalogStale")
                      : t("composer.modelCatalogUnavailable")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {catalogIsStale
                      ? t("composer.modelCatalogStaleHint")
                      : catalogIsIdle
                        ? t("composer.modelCatalogIdleHint")
                        : t("composer.modelCatalogUnavailableHint")}
                  </p>
                </div>
                {!catalogIsIdle ? (
                  <MenuItem
                    onClick={() => {
                      props.onRefreshModels();
                      closeAndRefocus();
                    }}
                  >
                    <RefreshCwIcon aria-hidden="true" className="size-3.5" />
                    {t("composer.refreshModels")}
                  </MenuItem>
                ) : null}
                {catalogIsError || catalogIsIdle ? (
                  <MenuItem
                    onClick={() => {
                      props.onOpenSettings();
                      closeAndRefocus();
                    }}
                  >
                    <SettingsIcon aria-hidden="true" className="size-3.5" />
                    {props.provider === "omnimind"
                      ? t("composer.openModelServices")
                      : t("composer.openEngineSettings")}
                  </MenuItem>
                ) : null}
                <MenuSeparator />
              </>
            ) : null}
            {traitsContent ? (
              <>
                {traitsContent}
                <MenuSeparator />
                <MenuSub>
                  <MenuSubTrigger>
                    <span className="truncate">{modelLabel}</span>
                  </MenuSubTrigger>
                  <ComposerPickerMenuSubPopup
                    fixedWidth
                    className={COMPOSER_PICKER_MODEL_SUBMENU_HEIGHT_CLASS_NAME}
                  >
                    <ProviderModelMenuItems
                      provider={props.provider}
                      model={props.model}
                      lockedProvider={props.provider}
                      modelOptionsByProvider={props.modelOptionsByProvider}
                      {...(props.loadingModelProviders
                        ? { loadingModelProviders: props.loadingModelProviders }
                        : {})}
                      onProviderModelChange={props.onProviderModelChange}
                      onAfterSelection={closeAndRefocus}
                    />
                  </ComposerPickerMenuSubPopup>
                </MenuSub>
              </>
            ) : (
              <ProviderModelMenuItems
                provider={props.provider}
                model={props.model}
                lockedProvider={props.provider}
                modelOptionsByProvider={props.modelOptionsByProvider}
                {...(props.loadingModelProviders
                  ? { loadingModelProviders: props.loadingModelProviders }
                  : {})}
                onProviderModelChange={props.onProviderModelChange}
                onAfterSelection={closeAndRefocus}
              />
            )}
          </>
        ) : (
          <>
            <div className="px-2 py-2" role="status">
              <p className="text-sm text-foreground">
                {catalogIsChecking
                  ? t("composer.checkingModels")
                  : catalogIsStale
                    ? t("composer.modelCatalogStale")
                    : catalogIsError || catalogIsIdle
                      ? t("composer.modelCatalogUnavailable")
                      : t("composer.noAvailableModels")}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {catalogIsChecking
                  ? t("composer.checkingModelsHint")
                  : catalogIsStale
                    ? t("composer.modelCatalogStaleHint")
                    : catalogIsIdle
                      ? t("composer.modelCatalogIdleHint")
                      : catalogIsError
                        ? t("composer.modelCatalogUnavailableHint")
                        : t("composer.noAvailableModelsHint")}
              </p>
            </div>
            {!catalogIsChecking ? (
              <>
                <MenuSeparator />
                {!catalogIsIdle ? (
                  <MenuItem
                    onClick={() => {
                      props.onRefreshModels();
                      closeAndRefocus();
                    }}
                  >
                    <RefreshCwIcon aria-hidden="true" className="size-3.5" />
                    {t("composer.refreshModels")}
                  </MenuItem>
                ) : null}
                <MenuItem
                  onClick={() => {
                    props.onOpenSettings();
                    closeAndRefocus();
                  }}
                >
                  <SettingsIcon aria-hidden="true" className="size-3.5" />
                  {props.provider === "omnimind"
                    ? t("composer.openModelServices")
                    : t("composer.openEngineSettings")}
                </MenuItem>
              </>
            ) : null}
          </>
        )}
      </ComposerPickerMenuPopup>
    </Menu>
  );
}
