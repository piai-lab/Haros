import type { ResolvedThreadWorkspaceState } from "@harnessos/shared/threadEnvironment";
import type { ProviderInteractionMode } from "@harnessos/contracts";
import type { DraftThreadEnvMode } from "../../composerDraftStore";
import {
  type ContextWindowSnapshot,
  formatContextWindowTokens,
  formatCostUsd,
} from "../../lib/contextWindow";
import type { RateLimitStatus } from "./RateLimitBanner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { ContextWindowMeter } from "./ContextWindowMeter";
import { useI18n } from "../../i18n";
import type { AppLocale } from "../../locale";

type StatusTranslate = ReturnType<typeof useI18n>["t"];

function formatRateLimitMessage(
  rateLimitStatus: RateLimitStatus,
  t: StatusTranslate,
  locale: AppLocale,
): string {
  const resetSuffix = rateLimitStatus.resetsAt
    ? t("taskStatus.rateLimitReset", {
        time: new Date(rateLimitStatus.resetsAt).toLocaleTimeString(locale),
      })
    : "";
  if (rateLimitStatus.status === "rejected") {
    return `${t("taskStatus.rateLimitReached")}${resetSuffix}`;
  }
  const utilization =
    typeof rateLimitStatus.utilization === "number"
      ? t("taskStatus.rateLimitUtilization", {
          percent: Math.round(rateLimitStatus.utilization * 100),
        })
      : "";
  return `${t("taskStatus.rateLimitApproaching", { utilization })}${resetSuffix}`;
}

function formatEnvironmentLabel(
  envMode: DraftThreadEnvMode,
  envState: ResolvedThreadWorkspaceState,
  t: StatusTranslate,
): string {
  if (envMode === "local") {
    return t("taskStatus.local");
  }
  return envState === "worktree-pending"
    ? t("taskStatus.newWorktreePending")
    : t("thread.worktree");
}

export function ComposerSlashStatusDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel: string | null | undefined;
  nativeOptionsSummary: string;
  interactionMode: ProviderInteractionMode;
  envMode: DraftThreadEnvMode;
  envState: ResolvedThreadWorkspaceState;
  branch: string | null;
  contextWindow: ContextWindowSnapshot | null;
  cumulativeCostUsd: number | null;
  rateLimitStatus: RateLimitStatus | null;
  activeContextWindowLabel?: string | null;
  pendingContextWindowLabel?: string | null;
}) {
  const { locale, t } = useI18n();
  const {
    open,
    onOpenChange,
    selectedModel,
    nativeOptionsSummary,
    interactionMode,
    envMode,
    envState,
    branch,
    contextWindow,
    cumulativeCostUsd,
    rateLimitStatus,
    activeContextWindowLabel,
    pendingContextWindowLabel,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("taskStatus.title")}</DialogTitle>
          <DialogDescription>{t("taskStatus.description")}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("term.model")}</p>
              <p className="font-medium text-foreground">
                {selectedModel ?? t("taskStatus.unknown")}
              </p>
            </div>
            {nativeOptionsSummary ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("composer.options")}</p>
                <p className="font-medium text-foreground">{nativeOptionsSummary}</p>
              </div>
            ) : null}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("taskStatus.mode")}</p>
              <p className="font-medium text-foreground">
                {interactionMode === "plan" ? t("taskStatus.plan") : t("taskStatus.default")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("taskStatus.environment")}</p>
              <p className="font-medium text-foreground">
                {formatEnvironmentLabel(envMode, envState, t)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("git.pr.branch")}</p>
              <p className="font-medium text-foreground">{branch ?? t("taskStatus.unknown")}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("taskStatus.contextWindow")}</p>
                <p className="text-sm text-muted-foreground">{t("taskStatus.latestUsage")}</p>
                {pendingContextWindowLabel ? (
                  <p className="text-sm text-muted-foreground">
                    {t("taskStatus.windowTransition", {
                      current: activeContextWindowLabel ?? t("taskStatus.unknown"),
                      next: pendingContextWindowLabel,
                    })}
                  </p>
                ) : null}
              </div>
              {contextWindow ? (
                <ContextWindowMeter
                  usage={contextWindow}
                  cumulativeCostUsd={cumulativeCostUsd}
                  activeWindowLabel={activeContextWindowLabel}
                  pendingWindowLabel={pendingContextWindowLabel}
                />
              ) : null}
            </div>
            {contextWindow ? (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">{t("taskStatus.used")}</p>
                  <p className="font-medium text-foreground">
                    {formatContextWindowTokens(contextWindow.usedTokens)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("taskStatus.remaining")}</p>
                  <p className="font-medium text-foreground">
                    {formatContextWindowTokens(contextWindow.remainingTokens)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("taskStatus.window")}</p>
                  <p className="font-medium text-foreground">
                    {formatContextWindowTokens(contextWindow.maxTokens)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("taskStatus.cost")}</p>
                  <p className="font-medium text-foreground">
                    {cumulativeCostUsd !== null
                      ? formatCostUsd(cumulativeCostUsd)
                      : t("taskStatus.notAvailable")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("taskStatus.noContext")}</p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 bg-card p-4">
            <p className="text-xs text-muted-foreground">{t("taskStatus.rateLimits")}</p>
            {rateLimitStatus ? (
              <p className="text-sm text-foreground">
                {formatRateLimitMessage(rateLimitStatus, t, locale)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("taskStatus.noRateLimit")}</p>
            )}
          </div>
        </DialogPanel>
        <DialogFooter variant="bare">
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
