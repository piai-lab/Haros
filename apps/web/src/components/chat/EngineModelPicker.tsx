// FILE: EngineModelPicker.tsx
// Purpose: Renders the composer engine/model menu and supports controlled opening for shortcuts.
// Layer: Chat composer presentation
// Depends on: engine availability metadata, shared menu primitives, and picker trigger styling.

import { type ModelSlug, type EngineKind, type ServerEngineStatus } from "@harnessos/contracts";
import { resolveSelectableModel } from "@harnessos/shared/model";
import * as Schema from "effect/Schema";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { type EnginePickerKind, ENGINE_OPTIONS } from "../../session-logic";
import { buildEngineSelection, formatEngineModelOptionName } from "../../engineModelOptions";
import { compareEnginesByOrder, filterEngineOptionsByVisibility } from "../../engineOrdering";
import {
  deriveEnginePickerAvailability,
  type EnginePickerAvailabilityState,
} from "../../lib/engineAvailability";
import { Menu, MenuItem, MenuRadioGroup, MenuSub, MenuSubTrigger, MenuTrigger } from "../ui/menu";
import { BrainIcon } from "~/lib/icons";
import { ModelIdentityIcon } from "../ModelIdentityIcon";
import { ENGINE_ICON_COMPONENT_BY_ENGINE } from "../EngineIcon";
import { cn } from "~/lib/utils";
import { PickerPanelShell } from "./PickerPanelShell";
import { PickerTriggerButton } from "./PickerTriggerButton";
import { EngineModelOptionGroupList } from "./EngineModelOptionGroupList";
import { ComposerPickerMenuPopup, ComposerPickerMenuSubPopup } from "./ComposerPickerMenuPopup";
import {
  COMPOSER_PICKER_MODEL_LIST_MAX_HEIGHT_CLASS_NAME,
  COMPOSER_PICKER_MODEL_LIST_SCROLL_CLASS_NAME,
  COMPOSER_PICKER_MODEL_SUBMENU_HEIGHT_CLASS_NAME,
} from "./composerPickerStyles";
import { ShortcutKbd } from "../ui/shortcut-kbd";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  groupEngineModelOptions,
  groupEngineModelOptionsWithFavorites,
  shouldUseCollapsibleModelGroups,
  type EngineModelOption,
} from "../../engineModelOptions";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import {
  FAVORITE_MODEL_STORAGE_KEYS,
  supportsModelFavorites,
  type FavoriteModelEngine,
} from "../../lib/modelFavorites";
import { Skeleton } from "../ui/skeleton";
import { useI18n } from "~/i18n";
import type { EngineModelCatalogState } from "../../hooks/useEngineModelCatalog";
import { resolveComposerModelFallbackMessageKey } from "./modelCatalogPresentation";

export const ENGINE_MODEL_OPTIONS = ENGINE_OPTIONS;

function providerIconClassName(
  engine: EngineKind | EnginePickerKind,
  fallbackClassName: string,
): string {
  return engine === "claude" || engine === "antigravity" || engine === "pi"
    ? "text-foreground"
    : fallbackClassName;
}

const SEARCHABLE_MODEL_PICKER_THRESHOLD = 15;
const FavoriteModelSlugs = Schema.Array(Schema.String);
const EMPTY_FAVORITE_MODEL_SLUGS: ReadonlyArray<string> = [];

// Keeps persisted favorite slugs compact and stable while preserving the user's order.
function toggleFavoriteModelSlug(current: ReadonlyArray<string>, slug: string): string[] {
  const normalizedCurrent = Array.from(new Set(current.filter((entry) => entry.trim().length > 0)));
  return normalizedCurrent.includes(slug)
    ? normalizedCurrent.filter((entry) => entry !== slug)
    : [...normalizedCurrent, slug];
}

function stripParameterizedModelSuffix(model: string): string {
  return model.trim().replace(/\[[^\]]*\]$/u, "");
}

function resolveSelectedModelLabel(input: {
  engine: EngineKind;
  model: string;
  options: ReadonlyArray<EngineModelOption>;
}): string {
  const exact = input.options.find((option) => option.slug === input.model);
  if (exact) {
    return exact.name;
  }
  if (input.engine === "cursor") {
    const baseModel = stripParameterizedModelSuffix(input.model);
    const baseMatch = input.options.find(
      (option) => stripParameterizedModelSuffix(option.slug) === baseModel,
    );
    if (baseMatch) {
      return baseMatch.name;
    }
  }
  return formatEngineModelOptionName({
    engine: input.engine,
    slug: input.model,
  });
}

function buildModelSearchText(option: EngineModelOption): string {
  return [
    option.name,
    option.slug,
    option.description,
    option.upstreamProviderName,
    option.upstreamProviderId,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

type EngineModelMenuItemsProps = {
  engine: EngineKind;
  model: ModelSlug | null;
  lockedEngine: EngineKind | null;
  engines?: ReadonlyArray<ServerEngineStatus>;
  modelOptionsByEngine: Record<EngineKind, ReadonlyArray<EngineModelOption>>;
  loadingEngineModels?: Partial<Record<EngineKind, boolean>>;
  hiddenEngines?: ReadonlyArray<EngineKind>;
  engineOrder?: ReadonlyArray<EngineKind>;
  disabled?: boolean;
  onEngineModelChange: (engine: EngineKind, model: ModelSlug) => void;
  /** Reports an explicitly opened engine submenu before model selection. */
  onEngineBrowse?: (engine: EngineKind) => void;
  // Invoked after a model selection commits so callers can close ancestor
  // menus and refocus the composer.
  onAfterSelection?: () => void;
};

// Renders only the popup body of the engine/model picker. Designed to be
// dropped into any shared picker popup or submenu so the same selection logic can
// be reused by the standalone picker and the combined composer trait picker.
export const EngineModelMenuItems = function EngineModelMenuItems(
  props: EngineModelMenuItemsProps,
) {
  const { t } = useI18n();
  const { onAfterSelection } = props;
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [kiloFavoriteModelSlugs, setKiloFavoriteModelSlugs] = useLocalStorage(
    FAVORITE_MODEL_STORAGE_KEYS.kilo,
    EMPTY_FAVORITE_MODEL_SLUGS,
    FavoriteModelSlugs,
  );
  const [cursorFavoriteModelSlugs, setCursorFavoriteModelSlugs] = useLocalStorage(
    FAVORITE_MODEL_STORAGE_KEYS.cursor,
    EMPTY_FAVORITE_MODEL_SLUGS,
    FavoriteModelSlugs,
  );
  const [openCodeFavoriteModelSlugs, setOpenCodeFavoriteModelSlugs] = useLocalStorage(
    FAVORITE_MODEL_STORAGE_KEYS.opencode,
    EMPTY_FAVORITE_MODEL_SLUGS,
    FavoriteModelSlugs,
  );
  const [piFavoriteModelSlugs, setPiFavoriteModelSlugs] = useLocalStorage(
    FAVORITE_MODEL_STORAGE_KEYS.pi,
    EMPTY_FAVORITE_MODEL_SLUGS,
    FavoriteModelSlugs,
  );
  const deferredModelSearchQuery = useDeferredValue(modelSearchQuery);
  const activeEngine = props.lockedEngine ?? props.engine;
  const hiddenEngines = props.hiddenEngines;
  const engineOrder = props.engineOrder;
  const hiddenEngineSet = new Set<EngineKind>(hiddenEngines ?? []);
  const protectedEngineSet = new Set<EngineKind>([props.engine]);
  if (props.lockedEngine !== null) {
    protectedEngineSet.add(props.lockedEngine);
  }
  const visibleEngineOptions = filterEngineOptionsByVisibility(
    ENGINE_MODEL_OPTIONS.toSorted((left, right) =>
      compareEnginesByOrder(engineOrder ?? [], left.value, right.value),
    ),
    hiddenEngineSet,
    protectedEngineSet,
  );
  const kiloFavoriteModelSlugSet = new Set(kiloFavoriteModelSlugs);
  const openCodeFavoriteModelSlugSet = new Set(openCodeFavoriteModelSlugs);
  const cursorFavoriteModelSlugSet = new Set(cursorFavoriteModelSlugs);
  const piFavoriteModelSlugSet = new Set(piFavoriteModelSlugs);
  const favoriteModelSlugSets = {
    cursor: cursorFavoriteModelSlugSet,
    kilo: kiloFavoriteModelSlugSet,
    opencode: openCodeFavoriteModelSlugSet,
    pi: piFavoriteModelSlugSet,
  };
  const handleModelChange = (engine: EngineKind, value: string) => {
    if (props.disabled) return;
    if (!value) return;
    const resolvedModel = resolveSelectableModel(engine, value, props.modelOptionsByEngine[engine]);
    if (!resolvedModel) return;
    props.onEngineModelChange(engine, resolvedModel);
    onAfterSelection?.();
  };
  const toggleFavoriteModel = (engine: FavoriteModelEngine, slug: string) => {
    const setFavoriteModelSlugs =
      engine === "cursor"
        ? setCursorFavoriteModelSlugs
        : engine === "kilo"
          ? setKiloFavoriteModelSlugs
          : engine === "pi"
            ? setPiFavoriteModelSlugs
            : setOpenCodeFavoriteModelSlugs;
    setFavoriteModelSlugs((current) => toggleFavoriteModelSlug(current, slug));
  };

  const renderModelRadioGroup = (engine: EngineKind) => {
    if (props.loadingEngineModels?.[engine]) {
      return (
        <div className="space-y-2 px-2 py-2" aria-label={t("composer.loadingModels")}>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-2 rounded-md px-2 py-1.5">
              <Skeleton className="size-3.5 rounded-full" />
              <Skeleton className={cn("h-3.5 rounded-full", index % 3 === 0 ? "w-24" : "w-32")} />
            </div>
          ))}
        </div>
      );
    }

    const engineOptions = props.modelOptionsByEngine[engine];
    const shouldShowSearch =
      (engine === "kilo" || engine === "opencode" || engine === "cursor" || engine === "pi") &&
      engineOptions.length >= SEARCHABLE_MODEL_PICKER_THRESHOLD;
    const normalizedModelSearchQuery = deferredModelSearchQuery.trim().toLowerCase();
    const filteredOptions =
      shouldShowSearch && normalizedModelSearchQuery.length > 0
        ? engineOptions.filter((option) =>
            buildModelSearchText(option).includes(normalizedModelSearchQuery),
          )
        : engineOptions;
    const favoriteEngine = supportsModelFavorites(engine) ? engine : null;
    const favoriteModelSlugSet =
      favoriteEngine !== null ? favoriteModelSlugSets[favoriteEngine] : undefined;
    const groupedOptions =
      favoriteModelSlugSet !== undefined
        ? groupEngineModelOptionsWithFavorites({
            options: filteredOptions,
            favoriteSlugs: favoriteModelSlugSet,
            favoriteLabel: t("composer.favorites"),
          })
        : groupEngineModelOptions(filteredOptions);

    const content =
      groupedOptions.length > 0 ? (
        <MenuRadioGroup
          value={activeEngine === engine ? (props.model ?? "") : ""}
          onValueChange={(value) => handleModelChange(engine, value)}
        >
          <EngineModelOptionGroupList
            groupedOptions={groupedOptions}
            engine={engine}
            activeModel={props.model ?? ""}
            isSearching={normalizedModelSearchQuery.length > 0}
            favoriteEngine={favoriteEngine}
            favoriteModelSlugSet={favoriteModelSlugSet}
            onToggleFavorite={toggleFavoriteModel}
            {...(onAfterSelection ? { onAfterSelection } : {})}
          />
        </MenuRadioGroup>
      ) : (
        <div className="px-2 py-2 text-muted-foreground text-sm">
          {engine === "pi" && normalizedModelSearchQuery.length === 0
            ? t("composer.noPiModelsFound")
            : t("composer.noMatches")}
        </div>
      );

    if (!shouldShowSearch) {
      const needsScrollContainer =
        filteredOptions.length >= SEARCHABLE_MODEL_PICKER_THRESHOLD ||
        shouldUseCollapsibleModelGroups(groupedOptions.length, false);
      if (needsScrollContainer) {
        return (
          <div
            className={cn(
              "overflow-y-auto overscroll-contain py-0.5",
              COMPOSER_PICKER_MODEL_LIST_SCROLL_CLASS_NAME,
              COMPOSER_PICKER_MODEL_LIST_MAX_HEIGHT_CLASS_NAME,
            )}
          >
            {content}
          </div>
        );
      }
      return content;
    }

    return (
      <PickerPanelShell
        searchPlaceholder={t("composer.searchModelsOrProviders")}
        query={modelSearchQuery}
        onQueryChange={setModelSearchQuery}
        stopSearchKeyPropagation
        autoFocusSearch
        widthClassName="w-full"
        bleedParentPadding
        listMaxHeightClassName={COMPOSER_PICKER_MODEL_LIST_MAX_HEIGHT_CLASS_NAME}
      >
        {content}
      </PickerPanelShell>
    );
  };

  if (props.lockedEngine !== null) {
    return <>{renderModelRadioGroup(props.lockedEngine)}</>;
  }

  return (
    <>
      {visibleEngineOptions.map((option) => {
        const OptionIcon = ENGINE_ICON_COMPONENT_BY_ENGINE[option.value];
        const liveEngine = props.engines?.find((entry) => entry.engine === option.value);
        const availability = deriveEnginePickerAvailability(liveEngine);
        const availabilityLabel = (
          {
            checking: t("composer.engineChecking"),
            sign_in: t("composer.engineSignIn"),
            not_installed: t("composer.engineNotInstalled"),
            unavailable: t("composer.engineUnavailable"),
            limited: t("composer.engineLimited"),
            ready: null,
          } satisfies Record<EnginePickerAvailabilityState, string | null>
        )[availability.state];
        if (availability.disabled) {
          return (
            <MenuItem key={option.value} disabled>
              <OptionIcon
                aria-hidden="true"
                className={cn(
                  "size-3 shrink-0 opacity-80",
                  providerIconClassName(option.value, "text-muted-foreground/85"),
                )}
              />
              <span>{option.label}</span>
              <span className="ms-auto text-[11px] text-muted-foreground/80">
                {availabilityLabel}
              </span>
            </MenuItem>
          );
        }
        return (
          <MenuSub
            key={option.value}
            onOpenChange={(open) => {
              if (open) props.onEngineBrowse?.(option.value);
            }}
          >
            <MenuSubTrigger>
              <OptionIcon
                aria-hidden="true"
                className={cn(
                  "size-3 shrink-0",
                  providerIconClassName(option.value, "text-muted-foreground/85"),
                )}
              />
              <span className="min-w-0 truncate">{option.label}</span>
              {availabilityLabel ? (
                <span className="ms-auto text-[11px] text-muted-foreground/80">
                  {availabilityLabel}
                </span>
              ) : null}
            </MenuSubTrigger>
            <ComposerPickerMenuSubPopup
              fixedWidth
              className={COMPOSER_PICKER_MODEL_SUBMENU_HEIGHT_CLASS_NAME}
            >
              {renderModelRadioGroup(option.value)}
            </ComposerPickerMenuSubPopup>
          </MenuSub>
        );
      })}
    </>
  );
};

// Resolves the human-readable label for the currently selected model.
export function resolveEngineModelLabel(input: {
  engine: EngineKind;
  lockedEngine: EngineKind | null;
  model: ModelSlug;
  modelOptionsByEngine: Record<EngineKind, ReadonlyArray<EngineModelOption>>;
}): string {
  const activeEngine = input.lockedEngine ?? input.engine;
  return resolveSelectedModelLabel({
    engine: activeEngine,
    model: input.model,
    options: input.modelOptionsByEngine[activeEngine],
  });
}

export function getProviderIconClassName(
  engine: EngineKind | EnginePickerKind,
  fallbackClassName: string = "text-muted-foreground/70",
): string {
  return providerIconClassName(engine, fallbackClassName);
}

type EngineModelPickerProps = {
  engine: EngineKind;
  model: ModelSlug | null;
  lockedEngine: EngineKind | null;
  engines?: ReadonlyArray<ServerEngineStatus>;
  modelOptionsByEngine: Record<EngineKind, ReadonlyArray<EngineModelOption>>;
  loadingEngineModels?: Partial<Record<EngineKind, boolean>>;
  catalogStateByEngine?: Partial<Record<EngineKind, EngineModelCatalogState>>;
  hiddenEngines?: ReadonlyArray<EngineKind>;
  engineOrder?: ReadonlyArray<EngineKind>;
  activeEngineIconClassName?: string;
  compact?: boolean;
  // Icon-only trigger for narrow composers; the model name moves to title/sr-only.
  hideLabel?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectionCommitted?: () => void;
  shortcutLabel?: string | null;
  onEngineModelChange: (engine: EngineKind, model: ModelSlug) => void;
  onEngineBrowse?: (engine: EngineKind) => void;
};

export const EngineModelPicker = function EngineModelPicker(props: EngineModelPickerProps) {
  const { t } = useI18n();
  const { onOpenChange, onSelectionCommitted, open } = props;
  const [uncontrolledMenuOpen, setUncontrolledMenuOpen] = useState(false);
  const selectionCommitTimerRef = useRef<number | null>(null);
  const isMenuOpen = open ?? uncontrolledMenuOpen;
  const activeEngine = props.lockedEngine ?? props.engine;
  const activeCatalogState =
    props.catalogStateByEngine?.[activeEngine] ??
    (props.loadingEngineModels?.[activeEngine] ? "checking" : null);
  const selectedModelLabel = props.model
    ? resolveEngineModelLabel({
        engine: props.engine,
        lockedEngine: props.lockedEngine,
        model: props.model,
        modelOptionsByEngine: props.modelOptionsByEngine,
      })
    : activeCatalogState
      ? t(resolveComposerModelFallbackMessageKey(activeCatalogState))
      : t("composer.noAvailableModel");
  const selectedDescriptor = props.model
    ? (props.modelOptionsByEngine[activeEngine]?.find((option) => option.slug === props.model) ??
      null)
    : null;
  const selectedModel = props.model ? buildEngineSelection(activeEngine, props.model) : null;

  const setMenuOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setUncontrolledMenuOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };
  const scheduleSelectionCommitted = () => {
    if (selectionCommitTimerRef.current !== null) {
      window.clearTimeout(selectionCommitTimerRef.current);
    }
    // Base UI restores focus to the trigger while closing; refocus callers after that tick.
    selectionCommitTimerRef.current = window.setTimeout(() => {
      selectionCommitTimerRef.current = null;
      onSelectionCommitted?.();
    }, 0);
  };
  useEffect(
    () => () => {
      if (selectionCommitTimerRef.current !== null) {
        window.clearTimeout(selectionCommitTimerRef.current);
      }
    },
    [],
  );

  const handleAfterSelection = () => {
    setMenuOpen(false);
    scheduleSelectionCommitted();
  };

  const triggerButton = (
    <PickerTriggerButton
      disabled={props.disabled ?? false}
      compact={props.compact ?? false}
      hideLabel={props.hideLabel ?? false}
      className="text-[var(--color-text-foreground)]"
      icon={
        selectedModel ? (
          <ModelIdentityIcon
            selection={selectedModel}
            descriptor={selectedDescriptor}
            className={cn("size-3.5 opacity-100", props.activeEngineIconClassName)}
          />
        ) : (
          <BrainIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
        )
      }
      label={selectedModelLabel}
    />
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
      {props.shortcutLabel ? (
        <Tooltip>
          <TooltipTrigger render={<MenuTrigger render={triggerButton} />}>
            <span className="sr-only">{selectedModelLabel}</span>
          </TooltipTrigger>
          {!isMenuOpen ? (
            <TooltipPopup side="top" sideOffset={6} variant="picker">
              <span className="inline-flex items-center gap-2 px-1 py-0.5">
                <span>{t("composer.changeModel")}</span>
                <ShortcutKbd
                  shortcutLabel={props.shortcutLabel}
                  className="h-4 min-w-4 px-1 text-[length:var(--app-font-size-ui-2xs,9px)] text-muted-foreground"
                />
              </span>
            </TooltipPopup>
          ) : null}
        </Tooltip>
      ) : (
        <MenuTrigger render={triggerButton}>
          <span className="sr-only">{selectedModelLabel}</span>
        </MenuTrigger>
      )}
      <ComposerPickerMenuPopup align="start" fixedWidth>
        <EngineModelMenuItems
          engine={props.engine}
          model={props.model}
          lockedEngine={props.lockedEngine}
          {...(props.engines ? { engines: props.engines } : {})}
          modelOptionsByEngine={props.modelOptionsByEngine}
          {...(props.loadingEngineModels ? { loadingEngineModels: props.loadingEngineModels } : {})}
          {...(props.hiddenEngines ? { hiddenEngines: props.hiddenEngines } : {})}
          {...(props.engineOrder ? { engineOrder: props.engineOrder } : {})}
          {...(props.disabled !== undefined ? { disabled: props.disabled } : {})}
          onEngineModelChange={props.onEngineModelChange}
          {...(props.onEngineBrowse ? { onEngineBrowse: props.onEngineBrowse } : {})}
          onAfterSelection={handleAfterSelection}
        />
      </ComposerPickerMenuPopup>
    </Menu>
  );
};
