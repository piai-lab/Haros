import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { type PendingUserInput } from "../../session-logic";
import {
  derivePendingUserInputProgress,
  setPendingUserInputCustomText,
  togglePendingUserInputCustomSelection,
  togglePendingUserInputOptionSelection,
  type PendingUserInputDraftAnswer,
} from "../../pendingUserInput";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { ComposerChoiceRow } from "./ComposerChoiceRow";
import { COMPOSER_INPUT_SURFACE_CLASS_NAME } from "./composerPickerStyles";
import { useI18n } from "../../i18n";

interface PendingUserInputPanelProps {
  pendingUserInputs: PendingUserInput[];
  isResponding: boolean;
  answers: Record<string, PendingUserInputDraftAnswer>;
  questionIndex: number;
  isFocusedPane: boolean;
  onChangeAnswer: (questionId: string, answer: PendingUserInputDraftAnswer) => void;
  onSelectSinglePreset: (questionId: string, answer: PendingUserInputDraftAnswer) => void;
  onAdvance: () => void;
  onPrevious: () => void;
  onCancel: () => void;
}

const NAV_BUTTON_CLASS_NAME =
  "flex size-5 items-center justify-center rounded-md text-[var(--color-text-foreground-tertiary)] transition-colors duration-150 hover:bg-[var(--color-background-button-secondary-hover)] hover:text-[var(--color-text-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-text-foreground-tertiary)] disabled:pointer-events-none disabled:opacity-30";
const INLINE_TEXTAREA_CLASS_NAME =
  "w-full resize-none bg-transparent text-xs leading-relaxed text-[var(--color-text-foreground)] outline-none placeholder:text-[var(--color-text-foreground-tertiary)]";

export function ComposerPendingUserInputPanel({
  pendingUserInputs,
  isResponding,
  answers,
  questionIndex,
  isFocusedPane,
  onChangeAnswer,
  onSelectSinglePreset,
  onAdvance,
  onPrevious,
  onCancel,
}: PendingUserInputPanelProps) {
  if (pendingUserInputs.length === 0) return null;
  const activePrompt = pendingUserInputs[0];
  if (!activePrompt) return null;
  return (
    <ComposerPendingUserInputCard
      key={`${activePrompt.requestId}:${activePrompt.lifecycleGeneration ?? "legacy"}`}
      prompt={activePrompt}
      isResponding={isResponding}
      answers={answers}
      questionIndex={questionIndex}
      isFocusedPane={isFocusedPane}
      onChangeAnswer={onChangeAnswer}
      onSelectSinglePreset={onSelectSinglePreset}
      onAdvance={onAdvance}
      onPrevious={onPrevious}
      onCancel={onCancel}
    />
  );
}

function ComposerPendingUserInputCard({
  prompt,
  isResponding,
  answers,
  questionIndex,
  isFocusedPane,
  onChangeAnswer,
  onSelectSinglePreset,
  onAdvance,
  onPrevious,
  onCancel,
}: {
  prompt: PendingUserInput;
  isResponding: boolean;
  answers: Record<string, PendingUserInputDraftAnswer>;
  questionIndex: number;
  isFocusedPane: boolean;
  onChangeAnswer: (questionId: string, answer: PendingUserInputDraftAnswer) => void;
  onSelectSinglePreset: (questionId: string, answer: PendingUserInputDraftAnswer) => void;
  onAdvance: () => void;
  onPrevious: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const progress = derivePendingUserInputProgress(prompt.questions, answers, questionIndex);
  const activeQuestion = progress.activeQuestion;
  const customInputRef = useRef<HTMLTextAreaElement | null>(null);
  const questionHeadingRef = useRef<HTMLParagraphElement | null>(null);
  const [expandedPreviewLabel, setExpandedPreviewLabel] = useState<string | null>(null);
  const [suggestionExpanded, setSuggestionExpanded] = useState(false);

  useEffect(() => {
    if (progress.customSelected && activeQuestion?.options.length) {
      customInputRef.current?.focus();
    }
  }, [activeQuestion?.id, activeQuestion?.options.length, progress.customSelected]);

  useEffect(() => {
    setExpandedPreviewLabel(null);
    setSuggestionExpanded(false);
  }, [activeQuestion?.id]);

  useEffect(() => {
    if (isFocusedPane) questionHeadingRef.current?.focus({ preventScroll: true });
  }, [activeQuestion?.id, isFocusedPane]);

  if (!activeQuestion) return null;
  const questionCount = prompt.questions.length;
  const canGoBack = progress.questionIndex > 0;
  const canGoForward = !progress.isLastQuestion && progress.canAdvance;
  const selectionRole = activeQuestion.multiSelect ? "checkbox" : "radio";

  const handleScopedKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isResponding || event.metaKey || event.ctrlKey || event.altKey) return;
    if ((event.target as HTMLElement).closest("input, textarea, [contenteditable='true']")) return;
    const digit = Number.parseInt(event.key, 10);
    if (Number.isNaN(digit) || digit < 1 || digit > 9) return;
    const index = digit - 1;
    if (index < activeQuestion.options.length) {
      const option = activeQuestion.options[index];
      if (!option) return;
      event.preventDefault();
      const nextAnswer = togglePendingUserInputOptionSelection(
        activeQuestion,
        progress.activeDraft,
        option.label,
      );
      if (activeQuestion.multiSelect) onChangeAnswer(activeQuestion.id, nextAnswer);
      else onSelectSinglePreset(activeQuestion.id, nextAnswer);
      return;
    }
    if (index === activeQuestion.options.length && activeQuestion.options.length > 0) {
      event.preventDefault();
      onChangeAnswer(
        activeQuestion.id,
        togglePendingUserInputCustomSelection(activeQuestion, progress.activeDraft),
      );
    }
  };

  return (
    <div
      className={cn(COMPOSER_INPUT_SURFACE_CLASS_NAME, "overflow-hidden px-3.5 py-3")}
      onKeyDown={handleScopedKeyboard}
      aria-busy={isResponding}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {activeQuestion.header !== activeQuestion.question ? (
            <p className="mb-0.5 text-[11px] text-muted-foreground/55">{activeQuestion.header}</p>
          ) : null}
          <p
            ref={questionHeadingRef}
            tabIndex={-1}
            className="text-[13px] font-medium leading-snug text-foreground/90 outline-none"
          >
            {activeQuestion.question}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 pt-px text-muted-foreground/70">
          <button
            type="button"
            disabled={isResponding}
            onClick={onCancel}
            className="mr-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground/45 transition-colors hover:bg-[var(--color-background-button-secondary-hover)] hover:text-[var(--color-text-foreground-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
          >
            {t("pendingInput.cancelAnswer")}
          </button>
          {questionCount > 1 ? (
            <>
              <button
                type="button"
                disabled={!canGoBack || isResponding}
                onClick={onPrevious}
                className={NAV_BUTTON_CLASS_NAME}
                aria-label={t("pendingInput.previous")}
              >
                <ChevronLeftIcon className="size-3.5" />
              </button>
              <span className="px-0.5 text-[11px] tabular-nums">
                {t("pendingInput.progress", {
                  current: progress.questionIndex + 1,
                  total: questionCount,
                })}
              </span>
              <button
                type="button"
                disabled={!canGoForward || isResponding}
                onClick={onAdvance}
                className={NAV_BUTTON_CLASS_NAME}
                aria-label={t("pendingInput.next")}
              >
                <ChevronRightIcon className="size-3.5" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Focused heading announces question text; this live region announces only view progress. */}
      {isFocusedPane ? (
        <span className="sr-only" role="status" aria-live="polite">
          {t("pendingInput.questionAnnouncement", {
            current: progress.questionIndex + 1,
            total: questionCount,
          })}
        </span>
      ) : null}

      {activeQuestion.options.length > 0 ? (
        <div
          className="mt-2.5 space-y-0.5"
          role={activeQuestion.multiSelect ? "group" : "radiogroup"}
          aria-label={activeQuestion.question}
        >
          {activeQuestion.options.map((option, index) => {
            const selected = progress.selectedOptionLabels.includes(option.label);
            const previewExpanded = expandedPreviewLabel === option.label;
            const hasDetails = Boolean(option.preview || option.recommendationReason);
            return (
              <div
                key={`${activeQuestion.id}:${option.label}`}
                className="overflow-hidden rounded-lg"
              >
                <ComposerChoiceRow
                  shortcut={index < 9 ? index + 1 : null}
                  label={option.label}
                  {...(option.description === undefined ? {} : { description: option.description })}
                  selected={selected}
                  selectionRole={selectionRole}
                  selectionName={`ask:${prompt.requestId}:${prompt.lifecycleGeneration ?? "legacy"}:${activeQuestion.id}`}
                  disabled={isResponding}
                  onSelect={() => {
                    const nextAnswer = togglePendingUserInputOptionSelection(
                      activeQuestion,
                      progress.activeDraft,
                      option.label,
                    );
                    if (activeQuestion.multiSelect) {
                      onChangeAnswer(activeQuestion.id, nextAnswer);
                    } else {
                      onSelectSinglePreset(activeQuestion.id, nextAnswer);
                    }
                  }}
                  trailing={
                    selected ? (
                      <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-[var(--color-text-foreground)]" />
                    ) : null
                  }
                />
                {option.recommended || hasDetails ? (
                  <div className="mx-9 flex min-h-5 items-start gap-2 pb-1 text-[11px] text-muted-foreground/60">
                    {option.recommended ? (
                      <span className="shrink-0">{t("pendingInput.recommended")}</span>
                    ) : null}
                    {hasDetails ? (
                      <button
                        type="button"
                        className="rounded-sm underline-offset-2 hover:text-foreground/80 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                        aria-expanded={previewExpanded}
                        onClick={() =>
                          setExpandedPreviewLabel(previewExpanded ? null : option.label)
                        }
                      >
                        {previewExpanded
                          ? t("pendingInput.hidePreview")
                          : t("pendingInput.preview")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {previewExpanded ? (
                  <div className="mx-9 mb-1 whitespace-pre-wrap break-words border-l border-[var(--color-border)] pl-2 text-[11px] leading-relaxed text-muted-foreground/75">
                    {option.preview ? <p>{option.preview}</p> : null}
                    {option.recommendationReason ? <p>{option.recommendationReason}</p> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
          <div
            className={cn(
              "overflow-hidden rounded-lg",
              progress.customSelected && "bg-[var(--color-background-button-secondary)]",
            )}
          >
            <ComposerChoiceRow
              shortcut={
                activeQuestion.options.length < 9 ? activeQuestion.options.length + 1 : null
              }
              label={t("pendingInput.custom")}
              description={t(
                activeQuestion.multiSelect
                  ? "pendingInput.customMultipleDescription"
                  : "pendingInput.customSingleDescription",
              )}
              selected={progress.customSelected}
              selectionRole={selectionRole}
              selectionName={`ask:${prompt.requestId}:${prompt.lifecycleGeneration ?? "legacy"}:${activeQuestion.id}`}
              disabled={isResponding}
              onSelect={() =>
                onChangeAnswer(
                  activeQuestion.id,
                  togglePendingUserInputCustomSelection(activeQuestion, progress.activeDraft),
                )
              }
              trailing={
                progress.customSelected ? (
                  <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-[var(--color-text-foreground)]" />
                ) : null
              }
            />
            {progress.customSelected ? (
              <textarea
                ref={customInputRef}
                rows={2}
                value={progress.customText}
                disabled={isResponding}
                onChange={(event) =>
                  onChangeAnswer(
                    activeQuestion.id,
                    setPendingUserInputCustomText(
                      activeQuestion,
                      progress.activeDraft,
                      event.currentTarget.value,
                    ),
                  )
                }
                className={cn(
                  INLINE_TEXTAREA_CLASS_NAME,
                  "mx-9 mb-2 w-[calc(100%-4.5rem)] border-t border-[var(--color-border)] pt-2",
                )}
                placeholder={t("pendingInput.customPlaceholder")}
                aria-label={t("pendingInput.customInputLabel")}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-2.5">
          {activeQuestion.suggestion ? (
            <div className="mb-2 border-b border-[var(--color-border)] px-2 pb-2 text-[11px] text-muted-foreground/65">
              <button
                type="button"
                className="rounded-sm underline-offset-2 hover:text-foreground/80 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                aria-expanded={suggestionExpanded}
                onClick={() => setSuggestionExpanded((value) => !value)}
              >
                {suggestionExpanded
                  ? t("pendingInput.hideSuggestion")
                  : t("pendingInput.showSuggestion")}
              </button>
              {suggestionExpanded ? (
                <div className="mt-1.5 whitespace-pre-wrap break-words">
                  <p>{activeQuestion.suggestion.text}</p>
                  {activeQuestion.suggestion.reason ? (
                    <p className="mt-1 text-muted-foreground/55">
                      {activeQuestion.suggestion.reason}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={isResponding}
                    className="mt-1.5 rounded-md border border-[var(--color-border)] px-2 py-1 text-foreground/75 hover:bg-[var(--color-background-button-secondary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                    onClick={() =>
                      onChangeAnswer(
                        activeQuestion.id,
                        setPendingUserInputCustomText(
                          activeQuestion,
                          progress.activeDraft,
                          activeQuestion.suggestion!.text,
                        ),
                      )
                    }
                  >
                    {t("pendingInput.useSuggestion")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <textarea
            rows={5}
            value={progress.customText}
            disabled={isResponding}
            onChange={(event) =>
              onChangeAnswer(
                activeQuestion.id,
                setPendingUserInputCustomText(
                  activeQuestion,
                  progress.activeDraft,
                  event.currentTarget.value,
                ),
              )
            }
            className={cn(INLINE_TEXTAREA_CLASS_NAME, "min-h-28 px-2 py-2")}
            placeholder={activeQuestion.placeholder ?? t("pendingInput.freeTextPlaceholder")}
            aria-label={t("pendingInput.freeTextInputLabel")}
          />
        </div>
      )}
    </div>
  );
}
