import {
  type ContextWindowSnapshot,
  deriveContextWindowMeterDisplay,
  formatContextWindowTokens,
  formatCostUsd,
} from "~/lib/contextWindow";
import { useI18n } from "~/i18n";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";

export function ContextWindowMeter(props: {
  usage: ContextWindowSnapshot;
  cumulativeCostUsd?: number | null | undefined;
  activeWindowLabel?: string | null | undefined;
  pendingWindowLabel?: string | null | undefined;
}) {
  const { t } = useI18n();
  const { usage, cumulativeCostUsd, activeWindowLabel, pendingWindowLabel } = props;
  const display = deriveContextWindowMeterDisplay(usage);
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (display.normalizedPercentage / 100) * circumference;

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={0}
        render={
          <button
            type="button"
            className="group inline-flex shrink-0 items-center justify-center rounded-full p-0.5 transition-opacity hover:opacity-80"
            aria-label={
              display.usedPercentageLabel
                ? t("contextWindow.ariaPercentage", {
                    percentage: display.usedPercentageLabel,
                  })
                : t("contextWindow.ariaTokens", { tokens: display.tokenUsageLabel })
            }
          >
            <span className="relative flex h-4 w-4 items-center justify-center">
              <svg
                viewBox="0 0 16 16"
                className="-rotate-90 absolute inset-0 h-full w-full transform-gpu"
                aria-hidden="true"
              >
                <circle
                  cx="8"
                  cy="8"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-[var(--color-text-foreground-tertiary)]"
                />
                <circle
                  cx="8"
                  cy="8"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="text-[var(--color-text-foreground)] transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
                />
              </svg>
            </span>
          </button>
        }
      />
      <PopoverPopup tooltipStyle side="top" align="end" className="w-max max-w-none px-3 py-2">
        <div className="space-y-1.5 leading-tight">
          <div className="text-[11px] font-medium text-muted-foreground">
            {t("contextWindow.title")}
          </div>
          {pendingWindowLabel ? (
            <div className="text-xs text-muted-foreground">
              {t("contextWindow.currentSession", {
                window: activeWindowLabel ?? t("contextWindow.unknown"),
              })}
            </div>
          ) : null}
          {display.usedPercentageLabel ? (
            <div className="whitespace-nowrap text-xs font-medium text-foreground">
              <span>{display.usedPercentageLabel}</span>
              {display.hasReliableTokenRatio ? (
                <>
                  <span className="mx-1">⋅</span>
                  <span>{display.tokenUsageLabel}</span>
                  <span>/</span>
                  <span>
                    {formatContextWindowTokens(usage.maxTokens)} {t("contextWindow.used")}
                  </span>
                </>
              ) : (
                <span className="ml-1">{t("contextWindow.used")}</span>
              )}
            </div>
          ) : (
            <div className="text-sm text-foreground">
              {t("contextWindow.tokensUsed", { tokens: display.tokenUsageLabel })}
            </div>
          )}
          {usage.maxTokens !== null ? (
            <div className="text-xs text-muted-foreground">
              {t("contextWindow.modelWindow", {
                tokens: formatContextWindowTokens(usage.maxTokens),
              })}
            </div>
          ) : null}
          {pendingWindowLabel ? (
            <div className="text-xs text-muted-foreground">
              {t("contextWindow.nextTurn", { window: pendingWindowLabel })}
            </div>
          ) : null}
          {(usage.totalProcessedTokens ?? null) !== null &&
          (usage.totalProcessedTokens ?? 0) > usage.usedTokens ? (
            <div className="text-xs text-muted-foreground">
              {t("contextWindow.totalProcessed", {
                tokens: formatContextWindowTokens(usage.totalProcessedTokens ?? null),
              })}
            </div>
          ) : null}
          {usage.compactsAutomatically ? (
            <div className="text-xs text-muted-foreground">
              {t("contextWindow.compactsAutomatically")}
            </div>
          ) : null}
          {cumulativeCostUsd !== null && cumulativeCostUsd !== undefined ? (
            <div className="text-xs text-muted-foreground">
              {t("contextWindow.sessionCost", { cost: formatCostUsd(cumulativeCostUsd) })}
            </div>
          ) : null}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
