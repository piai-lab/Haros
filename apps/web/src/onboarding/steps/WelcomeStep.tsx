import { useI18n, type MessageKey } from "~/i18n";
import { BotIcon, CircleCheckIcon, FolderIcon, type LucideIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { ONBOARDING_TILE_CLASS_NAME } from "../layout";

const WELCOME_POINTS: ReadonlyArray<{
  readonly titleKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly icon: LucideIcon;
}> = [
  {
    titleKey: "firstRun.welcomeLocalTitle",
    descriptionKey: "firstRun.welcomeLocalBody",
    icon: FolderIcon,
  },
  {
    titleKey: "firstRun.welcomeEnginesTitle",
    descriptionKey: "firstRun.welcomeEnginesBody",
    icon: BotIcon,
  },
  {
    titleKey: "firstRun.welcomeVerifyTitle",
    descriptionKey: "firstRun.welcomeVerifyBody",
    icon: CircleCheckIcon,
  },
];

export function WelcomeStep() {
  const { t } = useI18n();
  return (
    <ul className="grid grid-cols-3 gap-4">
      {WELCOME_POINTS.map((point) => {
        const Icon = point.icon;
        return (
          <li
            key={point.titleKey}
            className={cn("flex flex-col gap-2.5 p-5", ONBOARDING_TILE_CLASS_NAME)}
          >
            <Icon className="size-[18px] text-foreground/80" aria-hidden />
            <span className="text-[length:var(--app-font-size-ui-lg,13px)] font-medium text-foreground">
              {t(point.titleKey)}
            </span>
            <span className="text-[length:var(--app-font-size-ui,12px)] leading-normal text-muted-foreground">
              {t(point.descriptionKey)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
