// FILE: AppIconPicker.tsx
// Purpose: Render the visual desktop app-icon choices used by Appearance settings.
// Layer: Settings UI component

import type { DesktopAppIcon } from "@omnimind/contracts";
import { cn } from "~/lib/utils";
import { useI18n, type MessageKey } from "~/i18n";

const APP_ICON_OPTIONS = [
  { value: "default", labelKey: "settings.defaultIcon", src: "/app-icons/default.png" },
  { value: "icon", labelKey: "settings.alternateIcon", src: "/app-icons/alternate.png" },
] as const satisfies ReadonlyArray<{
  value: DesktopAppIcon;
  labelKey: MessageKey;
  src: string;
}>;

export function AppIconPicker({
  value,
  onValueChange,
}: {
  readonly value: DesktopAppIcon;
  readonly onValueChange: (value: DesktopAppIcon) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2" role="group" aria-label={t("settings.appIcon")}>
      {APP_ICON_OPTIONS.map((option) => {
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
              "relative grid size-16 place-items-center rounded-[18px] border transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-foreground bg-accent"
                : "border-border/70 bg-muted/30 hover:border-border hover:bg-muted/60",
            )}
            onClick={() => onValueChange(option.value)}
          >
            <img src={option.src} alt="" draggable={false} className="size-10 object-contain" />
          </button>
        );
      })}
    </div>
  );
}
