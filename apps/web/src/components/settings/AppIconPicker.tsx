// FILE: AppIconPicker.tsx
// Purpose: Render the visual desktop app-icon choices used by Appearance settings.
// Layer: Settings UI component

import { useState } from "react";

import type { DesktopAppIcon } from "@harnessos/contracts";
import { Spinner } from "~/components/ui/spinner";
import { cn, isMacPlatform } from "~/lib/utils";
import { useI18n, type MessageKey } from "~/i18n";

const APP_ICON_OPTIONS = [
  {
    value: "default",
    labelKey: "settings.defaultIcon",
    src: "/app-icons/default.png",
  },
  {
    value: "icon",
    labelKey: "settings.alternateIcon",
    src: "/app-icons/alternate.png",
  },
  { value: "dark", labelKey: "settings.darkIcon", src: "/app-icons/dark.png" },
] as const satisfies ReadonlyArray<{
  value: DesktopAppIcon;
  labelKey: MessageKey;
  src: string;
}>;

export function AppIconPicker({
  platform,
  value,
  onValueChange,
}: {
  readonly platform: string;
  readonly value: DesktopAppIcon;
  readonly onValueChange: (value: DesktopAppIcon) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [pendingIcon, setPendingIcon] = useState<DesktopAppIcon | null>(null);
  const busy = pendingIcon !== null;
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={t("settings.appIcon")}
      aria-busy={busy}
    >
      {APP_ICON_OPTIONS.filter(
        (option) => option.value !== "dark" || isMacPlatform(platform),
      ).map((option) => {
        const selected = value === option.value;
        const applying = pendingIcon === option.value;
        const label = t(option.labelKey);
        return (
          <button
            key={option.value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={selected}
            disabled={busy}
            className={cn(
              // Same selection language as ThemeModePicker: the artwork is the whole
              // control, so no filled tile — just a stroke that appears when selected.
              "relative grid place-items-center rounded-[14px] border-2 p-[3px] transition-colors motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "disabled:pointer-events-none",
              selected || applying
                ? "border-foreground"
                : "border-transparent hover:border-foreground/25",
            )}
            onClick={() => {
              if (busy) return;
              setPendingIcon(option.value);
              void (async () => {
                try {
                  await onValueChange(option.value);
                } catch {
                  // Native preference synchronization owns rollback. The picker
                  // only owns its transient loading state.
                } finally {
                  setPendingIcon((current) => (current === option.value ? null : current));
                }
              })();
            }}
          >
            <img
              src={option.src}
              alt=""
              draggable={false}
              className={cn("size-10 object-contain", applying && "opacity-40")}
            />
            {applying ? (
              <Spinner
                aria-label={t("settings.updatingAppIcon")}
                className="absolute size-4 text-foreground motion-reduce:animate-none"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
