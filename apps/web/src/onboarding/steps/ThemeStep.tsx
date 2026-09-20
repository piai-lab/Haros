import { ThemeModePicker } from "~/components/settings/ThemeModePicker";
import { useRadioGroupKeyboardNav } from "~/hooks/useRadioGroupKeyboardNav";
import { useTheme } from "~/hooks/useTheme";
import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";
import { THEME_PRESET_OPTIONS, getThemePresetSeed, type ThemeVariant } from "~/theme/theme.logic";

const ONBOARDING_THEME_PACKS = THEME_PRESET_OPTIONS.filter(
  (option) => option.variants.includes("light") && option.variants.includes("dark"),
);
const ONBOARDING_THEME_PACK_IDS = ONBOARDING_THEME_PACKS.map((option) => option.id);
const THEME_VARIANTS: readonly ThemeVariant[] = ["light", "dark"];

function ThemePackSwatch(props: { codeThemeId: string; variant: ThemeVariant }) {
  const seed = getThemePresetSeed(props.codeThemeId, props.variant);
  return (
    <span
      aria-hidden
      className="relative inline-block size-[18px] shrink-0 rounded-full border"
      style={{ backgroundColor: seed.surface, borderColor: `${seed.ink}40` }}
    >
      <span
        className="absolute -right-px -bottom-px size-2 rounded-full border-[1.5px] border-popover"
        style={{ backgroundColor: seed.accent }}
      />
    </span>
  );
}

export function ThemeStep() {
  const { t } = useI18n();
  const { theme, setTheme, activeTheme, resolvedTheme, setThemePresetId } = useTheme();
  const selectedPackId = activeTheme.codeThemeId;
  const selectPack = (codeThemeId: string) => {
    for (const variant of THEME_VARIANTS) setThemePresetId(variant, codeThemeId);
  };
  const rovingValue = ONBOARDING_THEME_PACK_IDS.includes(selectedPackId)
    ? selectedPackId
    : (ONBOARDING_THEME_PACK_IDS[0] ?? selectedPackId);
  const radioItemProps = useRadioGroupKeyboardNav({
    values: ONBOARDING_THEME_PACK_IDS,
    value: rovingValue,
    onValueChange: selectPack,
  });

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="px-[100px]">
        <ThemeModePicker
          value={theme}
          onValueChange={setTheme}
          ariaLabel={t("firstRun.themePreference")}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <span
            id="onboarding-theme-pack-label"
            className="text-[length:var(--app-font-size-ui,12px)] font-medium text-foreground/80"
          >
            {t("firstRun.themePack")}
          </span>
          <span className="text-[length:var(--app-font-size-ui-sm,11px)] text-muted-foreground/80">
            {t("firstRun.themePackBothModes")}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="onboarding-theme-pack-label"
          className="grid grid-cols-5 gap-2"
        >
          {ONBOARDING_THEME_PACKS.map((option) => {
            const selected = option.id === selectedPackId;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={cn(
                  "flex h-9 min-w-0 cursor-pointer items-center gap-2.5 rounded-[10px] border bg-popover px-2.5 text-start outline-none transition-colors motion-reduce:transition-none",
                  "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
                  selected
                    ? "border-foreground ring-1 ring-foreground ring-inset"
                    : "border-foreground/9 hover:border-foreground/25",
                )}
                onClick={() => selectPack(option.id)}
                {...radioItemProps(option.id)}
              >
                <ThemePackSwatch codeThemeId={option.id} variant={resolvedTheme} />
                <span
                  className={cn(
                    "truncate text-[length:var(--app-font-size-ui,12px)] text-foreground",
                    selected && "font-medium",
                  )}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
