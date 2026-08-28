// FILE: FeedbackDialog.tsx
// Purpose: Collects categorized HarnessOS feedback with privacy-safe diagnostics.
// Layer: Shared UI component
// Depends on: Feedback delivery logic and the shared dialog primitives.

import { useEffect, useRef, useState } from "react";
import {
  buildFeedbackSubmission,
  FEEDBACK_RECIPIENT_LABEL,
  FEEDBACK_CATEGORIES,
  isFeedbackDeliveryAvailable,
  MAX_FEEDBACK_DETAILS_LENGTH,
  MAX_FEEDBACK_EMAIL_LENGTH,
  submitFeedback,
  type FeedbackCategory,
  type FeedbackDeliveryOptions,
  type FeedbackThreadContext,
} from "../feedback";
import { Button } from "./ui/button";
import { Dialog, DialogHeader, DialogPopup, DialogTitle } from "./ui/dialog";
import { Spinner } from "./ui/spinner";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { toastManager } from "./ui/toast";
import { useI18n } from "../i18n";

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
  /** Test/release injection; production callers use the build configuration. */
  deliveryOptions?: FeedbackDeliveryOptions;
}

export function FeedbackDialog({
  open,
  context,
  onOpenChange,
  deliveryOptions,
}: FeedbackDialogProps) {
  const { t } = useI18n();
  const [isSending, setIsSending] = useState(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const deliveryAvailable = isFeedbackDeliveryAvailable(deliveryOptions);

  const handleSubmit = async (
    category: FeedbackCategory | null,
    details: string,
    contactEmail: string,
  ) => {
    const requestController = new AbortController();
    requestControllerRef.current = requestController;
    setIsSending(true);
    try {
      await submitFeedback(buildFeedbackSubmission({ category, details, contactEmail, context }), {
        ...deliveryOptions,
        signal: requestController.signal,
      });
      onOpenChange(false);
      toastManager.add({
        type: "success",
        title: t("feedback.sent"),
        description: t("feedback.thanks"),
      });
    } finally {
      if (requestControllerRef.current === requestController) {
        requestControllerRef.current = null;
      }
      setIsSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSending) onOpenChange(nextOpen);
      }}
    >
      <DialogPopup className="max-w-xl" showCloseButton={!isSending}>
        <DialogHeader className="gap-0 px-5 pt-5 pb-3">
          <DialogTitle className="text-xl tracking-[-0.01em]">{t("feedback.title")}</DialogTitle>
        </DialogHeader>
        {/* The form state lives below DialogPopup, which unmounts its children
            once the close transition ends — every open starts from a blank
            form without a reset effect, and closing never flashes empty. */}
        <FeedbackDialogForm
          deliveryAvailable={deliveryAvailable}
          isSending={isSending}
          onCancel={() => requestControllerRef.current?.abort()}
          onSubmit={handleSubmit}
        />
      </DialogPopup>
    </Dialog>
  );
}

function FeedbackDialogForm({
  isSending,
  deliveryAvailable,
  onSubmit,
  onCancel,
}: {
  isSending: boolean;
  deliveryAvailable: boolean;
  onSubmit: (
    category: FeedbackCategory | null,
    details: string,
    contactEmail: string,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [details, setDetails] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => textareaRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const canSubmit = deliveryAvailable && details.trim().length > 0 && !isSending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setDeliveryError(null);
    try {
      await onSubmit(category, details, contactEmail);
    } catch (error) {
      setDeliveryError(error instanceof Error ? error.message : "");
    }
  };

  return (
    <form
      className="flex min-h-0 flex-col gap-3 px-5 pb-5"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
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
              // Reference pills breathe at ~14px per side; the default `sm`
              // padding (10px) crams the label against the pill wall.
              className="rounded-full px-3.5 font-normal"
              disabled={isSending}
              // Keeps the caret (and the field's focus ring) in the details
              // textarea, so picking a category never interrupts typing.
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
        disabled={isSending}
        className="[&_[data-slot=textarea]]:min-h-32 [&_[data-slot=textarea]]:resize-y"
        onChange={(event) => {
          setDetails(event.target.value);
          if (deliveryError) setDeliveryError(null);
        }}
      />

      <div className="space-y-1.5">
        <label htmlFor="feedback-contact-email" className="text-xs font-medium text-foreground">
          {t("feedback.contactEmail")}
        </label>
        <Input
          id="feedback-contact-email"
          type="email"
          autoComplete="email"
          maxLength={MAX_FEEDBACK_EMAIL_LENGTH}
          value={contactEmail}
          placeholder={t("feedback.contactEmailPlaceholder")}
          disabled={isSending}
          onChange={(event) => {
            setContactEmail(event.target.value);
            if (deliveryError) setDeliveryError(null);
          }}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("feedback.contactEmailPrivacy")}
        </p>
      </div>

      {!deliveryAvailable ? (
        <p role="status" className="text-xs leading-relaxed text-muted-foreground">
          {t("feedback.unavailable")}
        </p>
      ) : null}

      {deliveryError ? (
        <div role="alert" className="space-y-1 text-xs leading-relaxed text-destructive">
          <p>{t("feedback.deliveryFailed")}</p>
          {deliveryError ? <p className="font-mono">{deliveryError}</p> : null}
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {deliveryAvailable
          ? t("feedback.recipientPrivacy", { recipient: FEEDBACK_RECIPIENT_LABEL })
          : t("feedback.futurePrivacy")}{" "}
        {t("feedback.neverSends")}
      </p>

      {isSending ? (
        <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
          <Spinner />
          {t("feedback.cancelSending")}
        </Button>
      ) : (
        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {t("feedback.submit")}
        </Button>
      )}
    </form>
  );
}
