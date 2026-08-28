// FILE: ComposerEnginePicker.tsx
// Purpose: Flat Engine selector for the chat Composer.
// Layer: Chat composer presentation
// Depends on: canonical engine metadata, asset registry, live health, and shared menu primitives.

import type { EngineKind, ServerEngineStatus } from "@harnessos/contracts";
import { useState } from "react";

import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";
import { ENGINE_OPTIONS } from "../../session-logic";
import {
  deriveEnginePickerAvailability,
  findEngineStatus,
  type EnginePickerAvailabilityState,
} from "../../lib/engineAvailability";
import { compareEnginesByOrder, filterEngineOptionsByVisibility } from "../../engineOrdering";
import { Button } from "../ui/button";
import { Menu, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { EngineIcon } from "../EngineIcon";
import { ComposerPickerMenuPopup } from "./ComposerPickerMenuPopup";

type ComposerEnginePickerProps = {
  engine: EngineKind;
  engines: ReadonlyArray<ServerEngineStatus>;
  hiddenEngines?: ReadonlyArray<EngineKind>;
  engineOrder?: ReadonlyArray<EngineKind>;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEngineChange: (engine: EngineKind) => void;
  onEngineIntent?: (engine: EngineKind) => void;
  onSelectionCommitted?: () => void;
};

function statusLabel(
  state: Exclude<EnginePickerAvailabilityState, "ready"> | "coming_soon",
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

  const hiddenEngines = new Set(props.hiddenEngines ?? []);
  const protectedEngines = new Set<EngineKind>([props.engine]);
  const options = filterEngineOptionsByVisibility(
    ENGINE_OPTIONS.toSorted((left, right) =>
      compareEnginesByOrder(props.engineOrder ?? [], left.value, right.value),
    ),
    hiddenEngines,
    protectedEngines,
  );
  const currentEngineLabel =
    ENGINE_OPTIONS.find((option) => option.value === props.engine)?.label ?? props.engine;

  const trigger = (
    <Button
      type="button"
      size="icon-xs"
      variant="chrome"
      disabled={props.disabled ?? false}
      aria-label={t("composer.changeEngineCurrent", { engine: currentEngineLabel })}
      className="shrink-0"
    >
      <EngineIcon engine={props.engine} className="size-3.5" />
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
          value={props.engine}
          onValueChange={(value) => {
            const nextProvider = options.find((option) => option.value === value)?.value;
            if (!nextProvider || nextProvider === props.engine) {
              setOpen(false);
              props.onSelectionCommitted?.();
              return;
            }
            props.onEngineIntent?.(nextProvider);
            props.onEngineChange(nextProvider);
            setOpen(false);
            props.onSelectionCommitted?.();
          }}
        >
          {options.map((option) => {
            const liveStatus = findEngineStatus(props.engines, option.value);
            const availability = deriveEnginePickerAvailability(liveStatus);
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
                  <EngineIcon
                    engine={option.value}
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
