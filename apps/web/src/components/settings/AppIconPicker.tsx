// FILE: AppIconPicker.tsx
// Purpose: Render the visual desktop app-icon choices used by Appearance settings.
// Layer: Settings UI component

import type { DesktopAppIcon } from "@omnimind/contracts";
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
  readonly onValueChange: (value: DesktopAppIcon) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={t("settings.appIcon")}
    >
      {APP_ICON_OPTIONS.filter(
        (option) => option.value !== "dark" || isMacPlatform(platform),
      ).map((option) => {
        const selected = value === option.value;
        const label = t(option.labelKey);
        return (
          <button
            key={option.value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={selected}
            className={cn(
              // Same selection language as ThemeModePicker: the artwork is the whole
              // control, so no filled tile — just a stroke that appears when selected.
              "grid place-items-center rounded-[14px] border-2 p-[3px] transition-colors motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              selected
                ? "border-foreground"
                : "border-transparent hover:border-foreground/25",
            )}
            onClick={() => onValueChange(option.value)}
          >
            <img
              src={option.src}
              alt=""
              draggable={false}
              className="size-10 object-contain"
            />
          </button>
        );
      })}
    </div>
  );
}
