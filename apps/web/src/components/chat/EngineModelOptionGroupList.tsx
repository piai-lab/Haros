// FILE: EngineModelOptionGroupList.tsx
// Purpose: Renders grouped engine model radio items with optional collapsible sections.
// Layer: Chat composer presentation
// Depends on: menu radio primitives, collapsible UI, and engine model grouping helpers.

import { useState } from "react";

import { useI18n } from "~/i18n";
import { StarFilledIcon, StarIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import {
  buildEngineSelection,
  resolveModelGroupDefaultOpen,
  shouldUseCollapsibleModelGroups,
  providerModelCostMultiplierLabel,
  providerModelOptionProvenanceLabel,
  type EngineModelOption,
  type EngineModelOptionGroup,
} from "../../providerModelOptions";
import type { EngineKind } from "@harnessos/contracts";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";
import { DisclosureChevron } from "../ui/DisclosureChevron";
import { ModelIdentityIcon } from "../ModelIdentityIcon";
import { ModelServiceIcon } from "../ModelServiceIcon";
import { MenuGroup, MenuGroupLabel, MenuRadioItem } from "../ui/menu";
import {
  COMPOSER_PICKER_MODEL_GROUP_HEADER_CLASS_NAME,
  COMPOSER_PICKER_MODEL_ROW_LABEL_INDENT_CLASS_NAME,
  COMPOSER_PICKER_RADIUS_CLASS_NAME,
} from "./composerPickerStyles";

type FavoriteModelProvider = "cursor" | "kilo" | "opencode" | "pi";

type EngineModelOptionGroupListProps = {
  groupedOptions: ReadonlyArray<EngineModelOptionGroup>;
  engine: EngineKind;
  activeModel: string;
  isSearching: boolean;
  favoriteProvider: FavoriteModelProvider | null;
  favoriteModelSlugSet: ReadonlySet<string> | undefined;
  onToggleFavorite: (engine: FavoriteModelProvider, slug: string) => void;
  onAfterSelection?: () => void;
};

function EngineModelRadioItem(
  props: Readonly<{
    engine: EngineKind;
    modelOption: EngineModelOption;
    favoriteProvider: FavoriteModelProvider | null;
    isFavorite: boolean;
    showProvenance: boolean;
    onToggleFavorite: (engine: FavoriteModelProvider, slug: string) => void;
    onAfterSelection?: () => void;
  }>,
) {
  const { t } = useI18n();
  const {
    engine,
    modelOption,
    favoriteProvider,
    isFavorite,
    showProvenance,
    onToggleFavorite,
    onAfterSelection,
  } = props;
  const supportsFavorites = favoriteProvider !== null;
  const costMultiplierLabel =
    engine === "droid" ? providerModelCostMultiplierLabel(modelOption.description) : null;
  const provenanceLabel = showProvenance
    ? providerModelOptionProvenanceLabel({ engine, option: modelOption })
    : null;
  const accessibleModelName = provenanceLabel
    ? `${modelOption.name} — ${provenanceLabel}`
    : costMultiplierLabel && modelOption.description
      ? `${modelOption.name} ${modelOption.description}`
      : modelOption.name;

  return (
    <MenuRadioItem
      key={`${engine}:${modelOption.slug}`}
      value={modelOption.slug}
      aria-label={accessibleModelName}
      title={modelOption.name}
      preserveChildLayout
      className={supportsFavorites ? undefined : "grid-cols-[minmax(0,1fr)_auto]"}
      trailing={
        supportsFavorites ? (
          <button
            type="button"
            aria-label={
              isFavorite
                ? t("composer.removeFavorite", { model: accessibleModelName })
                : t("composer.addFavorite", { model: accessibleModelName })
            }
            className={cn(
              "inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground/50 transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60",
              COMPOSER_PICKER_RADIUS_CLASS_NAME,
              isFavorite && "text-amber-400 hover:text-amber-300",
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite(favoriteProvider, modelOption.slug);
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            {isFavorite ? (
              <StarFilledIcon aria-hidden="true" className="size-3" />
            ) : (
              <StarIcon aria-hidden="true" className="size-3" />
            )}
          </button>
        ) : costMultiplierLabel && modelOption.description ? (
          <span
            title={modelOption.description}
            className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground/65"
          >
            <span aria-hidden="true">{costMultiplierLabel}</span>
            <span className="sr-only">{modelOption.description}</span>
          </span>
        ) : null
      }
      onClick={() => {
        onAfterSelection?.();
      }}
    >
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          supportsFavorites && COMPOSER_PICKER_MODEL_ROW_LABEL_INDENT_CLASS_NAME,
        )}
      >
        <ModelIdentityIcon
          selection={buildEngineSelection(engine, modelOption.slug)}
          descriptor={modelOption}
          className="size-3.5"
        />
        <span className="flex min-w-0 flex-col">
          <span className="block min-w-0 truncate">{modelOption.name}</span>
          {provenanceLabel ? (
            <span
              aria-hidden="true"
              className="block min-w-0 truncate text-[10px] leading-tight text-muted-foreground/60"
            >
              {provenanceLabel}
            </span>
          ) : null}
        </span>
      </span>
    </MenuRadioItem>
  );
}

function CollapsibleModelGroup(
  props: Readonly<{
    group: EngineModelOptionGroup;
    defaultOpen: boolean;
    children: React.ReactNode;
  }>,
) {
  const [open, setOpen] = useState(props.defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="px-0.5">
      <CollapsibleTrigger
        className={cn(COMPOSER_PICKER_MODEL_GROUP_HEADER_CLASS_NAME, open && "text-foreground/75")}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <DisclosureChevron open={open} className="col-start-1 size-3 shrink-0 opacity-50" />
        <span className="col-start-2 min-w-0 truncate normal-case tracking-normal">
          <span className="flex min-w-0 items-center gap-1.5">
            {props.group.key === "__favorites__" ? null : (
              <ModelServiceIcon
                serviceId={props.group.key}
                {...(props.group.options[0]?.upstreamProviderOrigin
                  ? { origin: props.group.options[0].upstreamProviderOrigin }
                  : {})}
                className="size-3.5"
              />
            )}
            <span className="truncate">{props.group.label}</span>
          </span>
        </span>
        <span className="col-start-3 shrink-0 justify-self-end rounded-full bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-1.5 py-px text-[9px] font-normal tabular-nums normal-case tracking-normal text-muted-foreground/70">
          {props.group.options.length}
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel className="flex flex-col gap-px pb-0.5">{props.children}</CollapsiblePanel>
    </Collapsible>
  );
}

export function EngineModelOptionGroupList(props: EngineModelOptionGroupListProps) {
  const useCollapsibleGroups = shouldUseCollapsibleModelGroups(
    props.groupedOptions.length,
    props.isSearching,
  );

  return (
    <div className="flex flex-col gap-px">
      {props.groupedOptions.map((group) => {
        const groupItems = group.options.map((modelOption) => (
          <EngineModelRadioItem
            key={`${props.engine}:${modelOption.slug}`}
            engine={props.engine}
            modelOption={modelOption}
            favoriteProvider={props.favoriteProvider}
            isFavorite={props.favoriteModelSlugSet?.has(modelOption.slug) ?? false}
            showProvenance={group.key === "__favorites__"}
            onToggleFavorite={props.onToggleFavorite}
            {...(props.onAfterSelection ? { onAfterSelection: props.onAfterSelection } : {})}
          />
        ));

        if (group.label === null) {
          return (
            <MenuGroup key={`${props.engine}:${group.key}`} className="flex flex-col gap-px px-0.5">
              {groupItems}
            </MenuGroup>
          );
        }

        if (useCollapsibleGroups) {
          return (
            <CollapsibleModelGroup
              key={`${props.engine}:${group.key}`}
              group={group}
              defaultOpen={resolveModelGroupDefaultOpen({
                groupKey: group.key,
                options: group.options,
                activeModel: props.activeModel,
                groupCount: props.groupedOptions.length,
              })}
            >
              {groupItems}
            </CollapsibleModelGroup>
          );
        }

        return (
          <MenuGroup key={`${props.engine}:${group.key}`} className="flex flex-col gap-px px-0.5">
            <MenuGroupLabel className="flex items-center gap-1.5">
              {group.key === "__favorites__" ? null : (
                <ModelServiceIcon
                  serviceId={group.key}
                  {...(group.options[0]?.upstreamProviderOrigin
                    ? { origin: group.options[0].upstreamProviderOrigin }
                    : {})}
                  className="size-3.5"
                />
              )}
              <span className="truncate">{group.label}</span>
            </MenuGroupLabel>
            {groupItems}
          </MenuGroup>
        );
      })}
    </div>
  );
}
