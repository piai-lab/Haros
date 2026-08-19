// FILE: ProviderModelPicker.tsx
// Purpose: Renders the composer provider/model menu and supports controlled opening for shortcuts.
// Layer: Chat composer presentation
// Depends on: provider availability metadata, shared menu primitives, and picker trigger styling.

import { type ModelSlug, type ProviderKind, type ServerProviderStatus } from "@omnimind/contracts";
import { resolveSelectableModel } from "@omnimind/shared/model";
import * as Schema from "effect/Schema";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { type ProviderPickerKind, PROVIDER_OPTIONS } from "../../session-logic";
import { formatProviderModelOptionName } from "../../providerModelOptions";
import { compareProvidersByOrder, filterProviderOptionsByVisibility } from "../../providerOrdering";
import {
  deriveProviderPickerAvailability,
  type ProviderPickerAvailabilityState,
} from "../../lib/providerAvailability";
import {
  Menu,
  MenuItem,
  MenuRadioGroup,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
  MenuTrigger,
} from "../ui/menu";
import { PROVIDER_ICON_COMPONENT_BY_PROVIDER } from "../ProviderIcon";
import { cn } from "~/lib/utils";
import { PickerPanelShell } from "./PickerPanelShell";
import { PickerTriggerButton } from "./PickerTriggerButton";
import { ProviderModelOptionGroupList } from "./ProviderModelOptionGroupList";
import { ComposerPickerMenuPopup, ComposerPickerMenuSubPopup } from "./ComposerPickerMenuPopup";
import {
  COMPOSER_PICKER_MODEL_LIST_MAX_HEIGHT_CLASS_NAME,
  COMPOSER_PICKER_MODEL_LIST_SCROLL_CLASS_NAME,
  COMPOSER_PICKER_MODEL_SUBMENU_HEIGHT_CLASS_NAME,
} from "./composerPickerStyles";
import { ShortcutKbd } from "../ui/shortcut-kbd";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  groupProviderModelOptions,
  groupProviderModelOptionsWithFavorites,
  shouldUseCollapsibleModelGroups,
  type ProviderModelOption,
} from "../../providerModelOptions";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import {
  FAVORITE_MODEL_STORAGE_KEYS,
  supportsModelFavorites,
  type FavoriteModelProvider,
} from "../../lib/modelFavorites";
import { Skeleton } from "../ui/skeleton";
import { useI18n } from "~/i18n";
import type { ProviderModelCatalogState } from "../../hooks/useProviderModelCatalog";
import { resolveComposerModelFallbackMessageKey } from "./modelCatalogPresentation";

function isAvailableProviderOption(option: (typeof PROVIDER_OPTIONS)[number]): option is {
  value: ProviderKind;
  label: string;
  available: true;
} {
  return option.available;
}

export const AVAILABLE_PROVIDER_OPTIONS = PROVIDER_OPTIONS.filter(isAvailableProviderOption);
const UNAVAILABLE_PROVIDER_OPTIONS = PROVIDER_OPTIONS.filter((option) => !option.available);

function providerIconClassName(
  provider: ProviderKind | ProviderPickerKind,
  fallbackClassName: string,
): string {
  return provider === "claudeAgent" || provider === "antigravity" || provider === "pi"
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
  provider: ProviderKind;
  model: string;
  options: ReadonlyArray<ProviderModelOption>;
}): string {
  const exact = input.options.find((option) => option.slug === input.model);
  if (exact) {
    return exact.name;
  }
  if (input.provider === "cursor") {
    const baseModel = stripParameterizedModelSuffix(input.model);
    const baseMatch = input.options.find(
      (option) => stripParameterizedModelSuffix(option.slug) === baseModel,
    );
    if (baseMatch) {
      return baseMatch.name;
    }
  }
  return formatProviderModelOptionName({
    provider: input.provider,
    slug: input.model,
  });
}

function buildModelSearchText(option: ProviderModelOption): string {
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

type ProviderModelMenuItemsProps = {
  provider: ProviderKind;
  model: ModelSlug | null;
  lockedProvider: ProviderKind | null;
  providers?: ReadonlyArray<ServerProviderStatus>;
  modelOptionsByProvider: Record<ProviderKind, ReadonlyArray<ProviderModelOption>>;
  loadingModelProviders?: Partial<Record<ProviderKind, boolean>>;
  hiddenProviders?: ReadonlyArray<ProviderKind>;
  providerOrder?: ReadonlyArray<ProviderKind>;
  disabled?: boolean;
  onProviderModelChange: (provider: ProviderKind, model: ModelSlug) => void;
  /** Reports an explicitly opened provider submenu before model selection. */
  onProviderBrowse?: (provider: ProviderKind) => void;
  // Invoked after a model selection commits so callers can close ancestor
  // menus and refocus the composer.
  onAfterSelection?: () => void;
};

// Renders only the popup body of the provider/model picker. Designed to be
// dropped into any shared picker popup or submenu so the same selection logic can
// be reused by the standalone picker and the combined composer trait picker.
export const ProviderModelMenuItems = function ProviderModelMenuItems(
  props: ProviderModelMenuItemsProps,
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
  const activeProvider = props.lockedProvider ?? props.provider;
  const hiddenProviders = props.hiddenProviders;
  const providerOrder = props.providerOrder;
  const hiddenProviderSet = new Set<ProviderKind>(hiddenProviders ?? []);
  const protectedProviderSet = new Set<ProviderKind>([props.provider]);
  if (props.lockedProvider !== null) {
    protectedProviderSet.add(props.lockedProvider);
  }
  const visibleAvailableProviderOptions = filterProviderOptionsByVisibility(
    AVAILABLE_PROVIDER_OPTIONS.toSorted((left, right) =>
      compareProvidersByOrder(providerOrder ?? [], left.value, right.value),
    ),
    hiddenProviderSet,
    protectedProviderSet,
  );
  const visibleUnavailableProviderOptions = filterProviderOptionsByVisibility(
    UNAVAILABLE_PROVIDER_OPTIONS.toSorted((left, right) =>
      compareProvidersByOrder(providerOrder ?? [], left.value, right.value),
    ),
    hiddenProviderSet,
    protectedProviderSet,
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
  const handleModelChange = (provider: ProviderKind, value: string) => {
    if (props.disabled) return;
    if (!value) return;
    const resolvedModel = resolveSelectableModel(
      provider,
      value,
      props.modelOptionsByProvider[provider],
    );
    if (!resolvedModel) return;
    props.onProviderModelChange(provider, resolvedModel);
    onAfterSelection?.();
  };
  const toggleFavoriteModel = (provider: FavoriteModelProvider, slug: string) => {
    const setFavoriteModelSlugs =
      provider === "cursor"
        ? setCursorFavoriteModelSlugs
        : provider === "kilo"
          ? setKiloFavoriteModelSlugs
          : provider === "pi"
            ? setPiFavoriteModelSlugs
            : setOpenCodeFavoriteModelSlugs;
    setFavoriteModelSlugs((current) => toggleFavoriteModelSlug(current, slug));
  };

  const renderModelRadioGroup = (provider: ProviderKind) => {
    if (props.loadingModelProviders?.[provider]) {
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

    const providerOptions = props.modelOptionsByProvider[provider];
    const shouldShowSearch =
      (provider === "kilo" ||
        provider === "opencode" ||
        provider === "cursor" ||
        provider === "pi") &&
      providerOptions.length >= SEARCHABLE_MODEL_PICKER_THRESHOLD;
    const normalizedModelSearchQuery = deferredModelSearchQuery.trim().toLowerCase();
    const filteredOptions =
      shouldShowSearch && normalizedModelSearchQuery.length > 0
        ? providerOptions.filter((option) =>
            buildModelSearchText(option).includes(normalizedModelSearchQuery),
          )
        : providerOptions;
    const favoriteProvider = supportsModelFavorites(provider) ? provider : null;
    const favoriteModelSlugSet =
      favoriteProvider !== null ? favoriteModelSlugSets[favoriteProvider] : undefined;
    const groupedOptions =
      favoriteModelSlugSet !== undefined
        ? groupProviderModelOptionsWithFavorites({
            options: filteredOptions,
            favoriteSlugs: favoriteModelSlugSet,
            favoriteLabel: t("composer.favorites"),
          })
        : groupProviderModelOptions(filteredOptions);

    const content =
      groupedOptions.length > 0 ? (
        <MenuRadioGroup
          value={activeProvider === provider ? (props.model ?? "") : ""}
          onValueChange={(value) => handleModelChange(provider, value)}
        >
          <ProviderModelOptionGroupList
            groupedOptions={groupedOptions}
            provider={provider}
            activeModel={props.model ?? ""}
            isSearching={normalizedModelSearchQuery.length > 0}
            favoriteProvider={favoriteProvider}
            favoriteModelSlugSet={favoriteModelSlugSet}
            onToggleFavorite={toggleFavoriteModel}
            {...(onAfterSelection ? { onAfterSelection } : {})}
          />
        </MenuRadioGroup>
      ) : (
        <div className="px-2 py-2 text-muted-foreground text-sm">
          {provider === "pi" && normalizedModelSearchQuery.length === 0
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

  if (props.lockedProvider !== null) {
    return <>{renderModelRadioGroup(props.lockedProvider)}</>;
  }

  return (
    <>
      {visibleAvailableProviderOptions.map((option) => {
        const OptionIcon = PROVIDER_ICON_COMPONENT_BY_PROVIDER[option.value];
        const liveProvider = props.providers?.find((entry) => entry.provider === option.value);
        const availability = deriveProviderPickerAvailability(liveProvider);
        const availabilityLabel = (
          {
            checking: t("composer.engineChecking"),
            sign_in: t("composer.engineSignIn"),
            not_installed: t("composer.engineNotInstalled"),
            unavailable: t("composer.engineUnavailable"),
            limited: t("composer.engineLimited"),
            ready: null,
          } satisfies Record<ProviderPickerAvailabilityState, string | null>
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
              if (open) props.onProviderBrowse?.(option.value);
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
      {visibleUnavailableProviderOptions.length > 0 && <MenuSeparator />}
      {visibleUnavailableProviderOptions.map((option) => {
        const OptionIcon = PROVIDER_ICON_COMPONENT_BY_PROVIDER[option.value];
        return (
          <MenuItem key={option.value} disabled>
            <OptionIcon
              aria-hidden="true"
              className="size-3 shrink-0 text-muted-foreground/85 opacity-80"
            />
            <span>{option.label}</span>
            <span className="ms-auto text-[11px] text-muted-foreground/80">
              {t("composer.engineComingSoon")}
            </span>
          </MenuItem>
        );
      })}
    </>
  );
};

// Resolves the human-readable label for the currently selected model.
export function resolveProviderModelLabel(input: {
  provider: ProviderKind;
  lockedProvider: ProviderKind | null;
  model: ModelSlug;
  modelOptionsByProvider: Record<ProviderKind, ReadonlyArray<ProviderModelOption>>;
}): string {
  const activeProvider = input.lockedProvider ?? input.provider;
  return resolveSelectedModelLabel({
    provider: activeProvider,
    model: input.model,
    options: input.modelOptionsByProvider[activeProvider],
  });
}

export function getProviderIconClassName(
  provider: ProviderKind | ProviderPickerKind,
  fallbackClassName: string = "text-muted-foreground/70",
): string {
  return providerIconClassName(provider, fallbackClassName);
}

type ProviderModelPickerProps = {
  provider: ProviderKind;
  model: ModelSlug | null;
  lockedProvider: ProviderKind | null;
  providers?: ReadonlyArray<ServerProviderStatus>;
  modelOptionsByProvider: Record<ProviderKind, ReadonlyArray<ProviderModelOption>>;
  loadingModelProviders?: Partial<Record<ProviderKind, boolean>>;
  catalogStateByProvider?: Partial<Record<ProviderKind, ProviderModelCatalogState>>;
  hiddenProviders?: ReadonlyArray<ProviderKind>;
  providerOrder?: ReadonlyArray<ProviderKind>;
  activeProviderIconClassName?: string;
  compact?: boolean;
  // Icon-only trigger for narrow composers; the model name moves to title/sr-only.
  hideLabel?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectionCommitted?: () => void;
  shortcutLabel?: string | null;
  onProviderModelChange: (provider: ProviderKind, model: ModelSlug) => void;
  onProviderBrowse?: (provider: ProviderKind) => void;
};

export const ProviderModelPicker = function ProviderModelPicker(props: ProviderModelPickerProps) {
  const { t } = useI18n();
  const { onOpenChange, onSelectionCommitted, open } = props;
  const [uncontrolledMenuOpen, setUncontrolledMenuOpen] = useState(false);
  const selectionCommitTimerRef = useRef<number | null>(null);
  const isMenuOpen = open ?? uncontrolledMenuOpen;
  const activeProvider = props.lockedProvider ?? props.provider;
  const activeCatalogState =
    props.catalogStateByProvider?.[activeProvider] ??
    (props.loadingModelProviders?.[activeProvider] ? "checking" : null);
  const selectedModelLabel = props.model
    ? resolveProviderModelLabel({
        provider: props.provider,
        lockedProvider: props.lockedProvider,
        model: props.model,
        modelOptionsByProvider: props.modelOptionsByProvider,
      })
    : activeCatalogState
      ? t(resolveComposerModelFallbackMessageKey(activeCatalogState))
      : t("composer.noAvailableModel");
  const ProviderIcon = PROVIDER_ICON_COMPONENT_BY_PROVIDER[activeProvider];

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
        <ProviderIcon
          aria-hidden="true"
          className={cn(
            // opacity-100 opts out of the Button base's [&_svg]:opacity-80 dimming.
            "size-3.5 shrink-0 opacity-100",
            providerIconClassName(activeProvider, "text-muted-foreground/70"),
            props.activeProviderIconClassName,
          )}
        />
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
        <ProviderModelMenuItems
          provider={props.provider}
          model={props.model}
          lockedProvider={props.lockedProvider}
          {...(props.providers ? { providers: props.providers } : {})}
          modelOptionsByProvider={props.modelOptionsByProvider}
          {...(props.loadingModelProviders
            ? { loadingModelProviders: props.loadingModelProviders }
            : {})}
          {...(props.hiddenProviders ? { hiddenProviders: props.hiddenProviders } : {})}
          {...(props.providerOrder ? { providerOrder: props.providerOrder } : {})}
          {...(props.disabled !== undefined ? { disabled: props.disabled } : {})}
          onProviderModelChange={props.onProviderModelChange}
          {...(props.onProviderBrowse ? { onProviderBrowse: props.onProviderBrowse } : {})}
          onAfterSelection={handleAfterSelection}
        />
      </ComposerPickerMenuPopup>
    </Menu>
  );
};
