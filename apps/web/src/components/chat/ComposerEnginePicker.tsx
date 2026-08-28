// FILE: ComposerEnginePicker.tsx
// Purpose: Flat Engine selector for the chat Composer.
// Layer: Chat composer presentation
// Depends on: canonical provider metadata, asset registry, live health, and shared menu primitives.

import type { EngineKind, ServerProviderStatus } from "@harnessos/contracts";
import { useState } from "react";

import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";
import { PROVIDER_OPTIONS } from "../../session-logic";
import {
  deriveProviderPickerAvailability,
  findProviderStatus,
  type ProviderPickerAvailabilityState,
} from "../../lib/providerAvailability";
import { compareProvidersByOrder, filterProviderOptionsByVisibility } from "../../providerOrdering";
import { Button } from "../ui/button";
import { Menu, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { ProviderIcon } from "../ProviderIcon";
import { ComposerPickerMenuPopup } from "./ComposerPickerMenuPopup";

type ComposerEnginePickerProps = {
  provider: EngineKind;
  providers: ReadonlyArray<ServerProviderStatus>;
  hiddenProviders?: ReadonlyArray<EngineKind>;
  providerOrder?: ReadonlyArray<EngineKind>;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onProviderChange: (provider: EngineKind) => void;
  onProviderIntent?: (provider: EngineKind) => void;
  onSelectionCommitted?: () => void;
};

function statusLabel(
  state: Exclude<ProviderPickerAvailabilityState, "ready"> | "coming_soon",
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (state) {
    case "checking":
      return t("composer.engineChecking");
    case "sign_in":
      return t("composer.engineSignIn");
    case "limited":
      return t("composer.engineLimited");
    case "unavailable":
      return t("composer.engineUnavailable");
    case "not_installed":
      return t("composer.engineNotInstalled");
    case "coming_soon":
      return t("composer.engineComingSoon");
  }
}

export function ComposerEnginePicker(props: ComposerEnginePickerProps) {
  const { t } = useI18n();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = props.open ?? uncontrolledOpen;
  const setOpen = (nextOpen: boolean) => {
    if (props.open === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    props.onOpenChange?.(nextOpen);
  };

  const hiddenProviders = new Set(props.hiddenProviders ?? []);
  const protectedProviders = new Set<EngineKind>([props.provider]);
  const options = filterProviderOptionsByVisibility(
    PROVIDER_OPTIONS.toSorted((left, right) =>
      compareProvidersByOrder(props.providerOrder ?? [], left.value, right.value),
    ),
    hiddenProviders,
    protectedProviders,
  );
  const currentEngineLabel =
    PROVIDER_OPTIONS.find((option) => option.value === props.provider)?.label ?? props.provider;

  const trigger = (
    <Button
      type="button"
      size="icon-xs"
      variant="chrome"
      disabled={props.disabled ?? false}
      aria-label={t("composer.changeEngineCurrent", { engine: currentEngineLabel })}
      className="shrink-0"
    >
      <ProviderIcon provider={props.provider} className="size-3.5" />
    </Button>
  );

  return (
    <Menu
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (props.disabled) {
          setOpen(false);
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <Tooltip>
        <TooltipTrigger render={<MenuTrigger render={trigger} />} />
        {!isOpen ? (
          <TooltipPopup side="top" sideOffset={6} variant="picker">
            {t("composer.engineTooltip", { engine: currentEngineLabel })}
          </TooltipPopup>
        ) : null}
      </Tooltip>
      <ComposerPickerMenuPopup align="end" side="top" fixedWidth>
        <MenuRadioGroup
          value={props.provider}
          onValueChange={(value) => {
            const nextProvider = options.find((option) => option.value === value)?.value;
            if (!nextProvider || nextProvider === props.provider) {
              setOpen(false);
              props.onSelectionCommitted?.();
              return;
            }
            props.onProviderIntent?.(nextProvider);
            props.onProviderChange(nextProvider);
            setOpen(false);
            props.onSelectionCommitted?.();
          }}
        >
          {options.map((option) => {
            const liveStatus = findProviderStatus(props.providers, option.value);
            const availability = deriveProviderPickerAvailability(liveStatus);
            const trailing =
              availability.state === "ready" ? null : (
                <span className="text-[11px] text-muted-foreground/80">
                  {statusLabel(availability.state, t)}
                </span>
              );
            return (
              <MenuRadioItem
                key={option.value}
                value={option.value}
                disabled={availability.disabled}
                preserveChildLayout
                className="grid-cols-[minmax(0,1fr)_auto]"
                trailing={trailing}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ProviderIcon
                    provider={option.value}
                    className={cn(
                      "size-3.5 shrink-0",
                      availability.disabled ? "opacity-60" : undefined,
                    )}
                  />
                  <span className="min-w-0 truncate">{option.label}</span>
                </span>
              </MenuRadioItem>
            );
          })}
        </MenuRadioGroup>
      </ComposerPickerMenuPopup>
    </Menu>
  );
}
