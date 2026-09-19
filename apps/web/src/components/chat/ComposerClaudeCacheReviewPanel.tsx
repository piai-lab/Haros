import type { PendingClaudeCacheReview } from "@harnessos/contracts";
import { useRef, useState } from "react";

import { formatContextWindowTokens } from "~/lib/contextWindow";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";
import { ComposerChoiceRow } from "./ComposerChoiceRow";
import { COMPOSER_INPUT_SURFACE_CLASS_NAME } from "./composerPickerStyles";

export type ClaudeCacheReviewDecision = "continue" | "compact" | "cancel";

export function ComposerClaudeCacheReviewPanel(props: {
  review: PendingClaudeCacheReview;
  compactDisabledReason?: string | null;
  isCompactionRequest?: boolean;
  onRespond: (
    review: PendingClaudeCacheReview,
    decision: ClaudeCacheReviewDecision,
  ) => Promise<void>;
}) {
  const { t } = useI18n();
  const { review } = props;
  const compactDisabledReason = props.compactDisabledReason ?? null;
  const isCompactionRequest = props.isCompactionRequest === true;
  const submittedReviewRef = useRef<PendingClaudeCacheReview | null>(null);
  const [submittedReview, setSubmittedReview] = useState<PendingClaudeCacheReview | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const actionable = review.status === "pending" || review.status === "failed";
  const disabled = !actionable || submittedReview === review;
  const contextTokens = review.assessment.contextTokens;
  const title =
    review.status === "compacting"
      ? t("composer.claudeCacheCompactingTitle")
      : review.status === "responding"
        ? t("composer.claudeCacheRespondingTitle")
        : review.status === "uncertain"
          ? t("composer.claudeCacheUncertainTitle")
          : isCompactionRequest
            ? t("composer.claudeCacheExpiredCompactTitle")
            : t("composer.claudeCacheExpiredTitle");

  const respondOnce = (decision: ClaudeCacheReviewDecision) => {
    if (disabled || submittedReviewRef.current === review) return;
    if (decision === "compact" && (compactDisabledReason !== null || isCompactionRequest)) return;
    submittedReviewRef.current = review;
    setSubmittedReview(review);
    setDispatchError(null);
    void props.onRespond(review, decision).catch((error: unknown) => {
      if (submittedReviewRef.current !== review) return;
      submittedReviewRef.current = null;
      setSubmittedReview(null);
      setDispatchError(
        error instanceof Error ? error.message : t("composer.claudeCacheChoiceFailed"),
      );
    });
  };

  return (
    <section
      aria-label={t("composer.claudeCacheReview")}
      aria-busy={
        review.status === "responding" ||
        review.status === "compacting" ||
        submittedReview === review
      }
      className={cn(COMPOSER_INPUT_SURFACE_CLASS_NAME, "overflow-hidden px-3.5 py-3")}
    >
      <p className="text-[13px] font-medium leading-snug text-foreground/90">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {review.status === "uncertain"
          ? t("composer.claudeCacheUncertainBody")
          : review.status === "compacting"
            ? t("composer.claudeCacheCompactingBody")
            : review.status === "responding"
              ? t("composer.claudeCacheRespondingBody")
              : t("composer.claudeCacheExpiredBody", {
                  tokens:
                    contextTokens === undefined
                      ? t("composer.claudeCacheContextFallback")
                      : t("composer.claudeCacheAboutTokens", {
                          tokens: formatContextWindowTokens(contextTokens),
                        }),
                })}
      </p>
      {review.error || dispatchError ? (
        <p role="alert" className="mt-2 text-xs leading-relaxed text-destructive">
          {dispatchError ?? review.error}
        </p>
      ) : null}
      <div className="mt-2.5 space-y-0.5">
        <ComposerChoiceRow
          shortcut={null}
          label={
            isCompactionRequest
              ? t("composer.claudeCacheContinueCompact")
              : t("composer.claudeCacheContinue")
          }
          description={
            isCompactionRequest
              ? t("composer.claudeCacheContinueCompactHint")
              : t("composer.claudeCacheContinueHint")
          }
          disabled={disabled}
          onSelect={() => respondOnce("continue")}
        />
        {!isCompactionRequest ? (
          <ComposerChoiceRow
            shortcut={null}
            label={t("composer.claudeCacheCompact")}
            description={compactDisabledReason ?? t("composer.claudeCacheCompactHint")}
            disabled={disabled || compactDisabledReason !== null}
            onSelect={() => respondOnce("compact")}
          />
        ) : null}
        <ComposerChoiceRow
          shortcut={null}
          label={t("composer.claudeCacheCancel")}
          description={t("composer.claudeCacheCancelHint")}
          disabled={disabled}
          onSelect={() => respondOnce("cancel")}
        />
      </div>
    </section>
  );
}
