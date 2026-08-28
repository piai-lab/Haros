// FILE: FeedbackDialog.tsx
// Purpose: Builds a local GitHub issue draft from explicit feedback and privacy-bounded diagnostics.
// Layer: Shared UI component

import { useEffect, useRef, useState } from "react";
import {
  buildFeedbackIssueUrl,
  buildFeedbackSubmission,
  FEEDBACK_CATEGORIES,
  FEEDBACK_RECIPIENT_LABEL,
  MAX_FEEDBACK_DETAILS_LENGTH,
  type FeedbackCategory,
  type FeedbackThreadContext,
} from "../feedback";
import { useI18n } from "../i18n";
import { openExternalLink } from "../lib/linkChips";
import { Button } from "./ui/button";
import { Dialog, DialogHeader, DialogPopup, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { toastManager } from "./ui/toast";

const FEEDBACK_CATEGORY_KEYS = {
  bug: "feedback.categoryBug",
  session: "feedback.categoryTask",
  ui: "feedback.categoryUi",
  performance: "feedback.categoryPerformance",
  idea: "feedback.categoryIdea",
  other: "feedback.categoryOther",
} as const satisfies Record<FeedbackCategory, Parameters<ReturnType<typeof useI18n>["t"]>[0]>;

export interface FeedbackDialogProps {
  open: boolean;
  context: FeedbackThreadContext;
  onOpenChange: (open: boolean) => void;
  /** Test injection; production opens the fixed GitHub Issues boundary. */
  onOpenIssue?: (url: string) => void;
}

export function FeedbackDialog({
  open,
  context,
  onOpenChange,
  onOpenIssue = openExternalLink,
}: FeedbackDialogProps) {
  const { t } = useI18n();

  const handleSubmit = (category: FeedbackCategory | null, details: string) => {
    const issueUrl = buildFeedbackIssueUrl(buildFeedbackSubmission({ category, details, context }));
    onOpenIssue(issueUrl);
    onOpenChange(false);
    toastManager.add({
      type: "success",
      title: t("feedback.draftOpened"),
      description: t("feedback.reviewOnGitHub"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-xl">
        <DialogHeader className="gap-0 px-5 pt-5 pb-3">
          <DialogTitle className="text-xl tracking-[-0.01em]">{t("feedback.title")}</DialogTitle>
        </DialogHeader>
        <FeedbackDialogForm onSubmit={handleSubmit} />
      </DialogPopup>
    </Dialog>
  );
}

function FeedbackDialogForm({
  onSubmit,
}: {
  onSubmit: (category: FeedbackCategory | null, details: string) => void;
}) {
  const { t } = useI18n();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [details, setDetails] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => textareaRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const canSubmit = details.trim().length > 0;

  return (
    <form
      className="flex min-h-0 flex-col gap-3 px-5 pb-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(category, details);
      }}
    >
      <div className="flex flex-wrap gap-1.5" aria-label={t("feedback.category")}>
        {FEEDBACK_CATEGORIES.map((option) => {
          const selected = category === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant={selected ? "secondary" : "outline"}
              size="sm"
              aria-pressed={selected}
              className="rounded-full px-3.5 font-normal"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setCategory(selected ? null : option.value)}
            >
              <span aria-hidden="true">{selected ? "−" : "+"}</span>
              {t(FEEDBACK_CATEGORY_KEYS[option.value])}
            </Button>
          );
        })}
      </div>

      <Textarea
        ref={textareaRef}
        value={details}
        maxLength={MAX_FEEDBACK_DETAILS_LENGTH}
        placeholder={t("feedback.detailsPlaceholder")}
        aria-label={t("feedback.details")}
        className="[&_[data-slot=textarea]]:min-h-32 [&_[data-slot=textarea]]:resize-y"
        onChange={(event) => setDetails(event.target.value)}
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("feedback.githubDraft", { recipient: FEEDBACK_RECIPIENT_LABEL })}{" "}
        {t("feedback.neverSends")}
      </p>

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {t("feedback.openGitHubIssue")}
      </Button>
    </form>
  );
}
