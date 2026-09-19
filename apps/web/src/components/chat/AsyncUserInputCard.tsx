import type { AsyncUserInput, MessageId, UserInputQuestion } from "@harnessos/contracts";
import { useMemo, useRef, useState } from "react";

import { CheckIcon, CircleQuestionIcon } from "~/lib/icons";
import { useI18n } from "~/i18n";
import {
  buildPendingUserInputAnswers,
  derivePendingUserInputProgress,
  setPendingUserInputCustomText,
  togglePendingUserInputOptionSelection,
  type PendingUserInputDraftAnswer,
} from "../../pendingUserInput";
import { Button } from "../ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";
import { Textarea } from "../ui/textarea";
import { ComposerChoiceRow } from "./ComposerChoiceRow";

export function AsyncUserInputCard({
  messageId,
  input,
  onRespond,
}: {
  messageId: MessageId;
  input: AsyncUserInput;
  onRespond?: ((messageId: MessageId, answers: readonly string[]) => Promise<void>) | undefined;
}) {
  const { t } = useI18n();
  const questions = useMemo<ReadonlyArray<UserInputQuestion>>(
    () =>
      input.questions.map((question, index) => ({
        id: `question-${index}`,
        header: t("asyncInput.question"),
        question: question.title,
        options: (question.options ?? []).map((label) => ({ label, description: label })),
        multiSelect: false,
      })),
    [input.questions, t],
  );
  const [answers, setAnswers] = useState<Record<string, PendingUserInputDraftAnswer>>({});
  const [open, setOpen] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<{
    answers: readonly string[];
    responseSequence: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const acceptedAnswers =
    input.response?.answers ??
    (submission?.responseSequence === (input.responseSequence ?? 0) ? submission.answers : null);
  const answered = acceptedAnswers !== null;
  const disabled = answered || submitting || !onRespond;
  const progress = derivePendingUserInputProgress(questions, answers, questionIndex);
  const activeQuestion = progress.activeQuestion;

  const advance = async () => {
    if (disabled || inFlight.current || !progress.canAdvance) return;
    if (!progress.isLastQuestion) {
      setQuestionIndex(progress.questionIndex + 1);
      return;
    }
    const resolved = buildPendingUserInputAnswers(questions, answers);
    if (!resolved) return;
    const response = questions.map((question) => {
      const answer = resolved[question.id]!;
      return answer.customText?.trim() || answer.selectedOptionLabels.join(", ");
    });
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onRespond!(messageId, response);
      setSubmission({ answers: response, responseSequence: input.responseSequence ?? 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("asyncInput.submitFailed"));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="my-2">
      <CollapsibleTrigger
        aria-label={t("asyncInput.formLabel")}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      >
        <CircleQuestionIcon className="size-3.5" aria-hidden="true" />
        {t("asyncInput.questionCount", { count: questions.length })}
        {answered ? (
          <>
            <CheckIcon className="size-3" aria-hidden="true" />
            <span>{t("asyncInput.answered")}</span>
          </>
        ) : null}
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="pt-2">
          {acceptedAnswers ? (
            <dl className="space-y-3 rounded-xl border border-border p-3.5 text-sm">
              {questions.map((question, index) => (
                <div key={question.id}>
                  <dt className="font-medium">{question.question}</dt>
                  <dd className="whitespace-pre-wrap text-muted-foreground">
                    {acceptedAnswers[index]}
                  </dd>
                </div>
              ))}
            </dl>
          ) : activeQuestion ? (
            <form
              aria-label={t("asyncInput.formLabel")}
              onSubmit={(event) => {
                event.preventDefault();
                void advance();
              }}
            >
              <p className="text-sm font-medium">{activeQuestion.question}</p>
              {activeQuestion.options.length > 0 ? (
                <div className="mt-2 space-y-0.5">
                  {activeQuestion.options.map((option) => (
                    <ComposerChoiceRow
                      key={option.label}
                      shortcut={null}
                      label={option.label}
                      selected={progress.selectedOptionLabels.includes(option.label)}
                      disabled={disabled}
                      selectionRole="radio"
                      selectionName={activeQuestion.id}
                      onSelect={() => {
                        const draft = togglePendingUserInputOptionSelection(
                          activeQuestion,
                          answers[activeQuestion.id],
                          option.label,
                        );
                        setAnswers((current) => ({ ...current, [activeQuestion.id]: draft }));
                      }}
                    />
                  ))}
                </div>
              ) : null}
              <div className="mt-3 space-y-2">
                <Textarea
                  aria-label={t("asyncInput.answerLabel", { question: activeQuestion.question })}
                  value={progress.customText}
                  disabled={disabled}
                  rows={2}
                  placeholder={
                    activeQuestion.options.length > 0
                      ? t("asyncInput.customPlaceholder")
                      : t("asyncInput.textPlaceholder")
                  }
                  onChange={(event) => {
                    const draft = setPendingUserInputCustomText(
                      activeQuestion,
                      answers[activeQuestion.id],
                      event.target.value,
                    );
                    setAnswers((current) => ({ ...current, [activeQuestion.id]: draft }));
                  }}
                />
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t("asyncInput.keepWorking")}
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      disabled ||
                      !progress.canAdvance ||
                      (progress.isLastQuestion && !progress.isComplete)
                    }
                  >
                    {submitting
                      ? t("asyncInput.submitting")
                      : progress.isLastQuestion
                        ? t("asyncInput.send")
                        : t("asyncInput.next")}
                  </Button>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
