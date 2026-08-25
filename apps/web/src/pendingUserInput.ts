// FILE: pendingUserInput.ts
// Purpose: Own lossless draft/result semantics and progress for canonical user input.
// Layer: Web chat state utility

import type {
  CanonicalUserInputAnswer,
  CanonicalUserInputAnswers,
  UserInputQuestion,
} from "@omnimind/contracts";

export interface PendingUserInputDraftAnswer {
  selectedOptionLabels?: string[];
  customText?: string;
  note?: string;
  /** Ephemeral projection state for the Host-synthesized custom option. */
  customSelected?: boolean;
}

export interface PendingUserInputProgress {
  questionIndex: number;
  activeQuestion: UserInputQuestion | null;
  activeDraft: PendingUserInputDraftAnswer | undefined;
  selectedOptionLabels: string[];
  customText: string;
  note: string;
  customSelected: boolean;
  resolvedAnswer: CanonicalUserInputAnswer | null;
  answeredQuestionCount: number;
  isLastQuestion: boolean;
  isComplete: boolean;
  canAdvance: boolean;
}

export function hasMeaningfulPendingUserInputText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function selectedLabelsForQuestion(
  question: UserInputQuestion,
  value: string[] | undefined,
): string[] {
  if (!Array.isArray(value)) return [];
  const authoredLabels = new Set(question.options.map((option) => option.label));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of value) {
    if (typeof label !== "string" || !authoredLabels.has(label) || seen.has(label)) continue;
    seen.add(label);
    result.push(label);
  }
  return question.multiSelect ? result : result.slice(0, 1);
}

function compactDraft(draft: PendingUserInputDraftAnswer): PendingUserInputDraftAnswer {
  return {
    ...(draft.selectedOptionLabels && draft.selectedOptionLabels.length > 0
      ? { selectedOptionLabels: draft.selectedOptionLabels }
      : {}),
    ...(draft.customSelected ? { customSelected: true } : {}),
    ...(draft.customText !== undefined ? { customText: draft.customText } : {}),
    ...(draft.note !== undefined ? { note: draft.note } : {}),
  };
}

export function resolvePendingUserInputAnswer(
  question: UserInputQuestion,
  draft: PendingUserInputDraftAnswer | undefined,
): CanonicalUserInputAnswer | null {
  const selectedOptionLabels = selectedLabelsForQuestion(question, draft?.selectedOptionLabels);
  const isTextQuestion = question.options.length === 0;
  const customTextIsAnswer =
    hasMeaningfulPendingUserInputText(draft?.customText) &&
    (isTextQuestion || draft?.customSelected === true);

  if (isTextQuestion && !customTextIsAnswer) return null;
  if (!isTextQuestion && selectedOptionLabels.length === 0 && !customTextIsAnswer) return null;

  const note =
    selectedOptionLabels.length > 0 && hasMeaningfulPendingUserInputText(draft?.note)
      ? draft.note
      : undefined;
  return {
    selectedOptionLabels,
    ...(customTextIsAnswer ? { customText: draft!.customText! } : {}),
    ...(note !== undefined ? { note } : {}),
  };
}

export function setPendingUserInputCustomText(
  question: UserInputQuestion,
  draft: PendingUserInputDraftAnswer | undefined,
  customText: string,
): PendingUserInputDraftAnswer {
  if (question.options.length === 0) {
    return compactDraft({ customSelected: true, customText });
  }
  return compactDraft({ ...draft, customText });
}

export function setPendingUserInputNote(
  question: UserInputQuestion,
  draft: PendingUserInputDraftAnswer | undefined,
  note: string,
): PendingUserInputDraftAnswer {
  const selectedOptionLabels = selectedLabelsForQuestion(question, draft?.selectedOptionLabels);
  if (selectedOptionLabels.length === 0) {
    const { note: _discarded, ...withoutNote } = draft ?? {};
    return compactDraft(withoutNote);
  }
  return compactDraft({ ...draft, selectedOptionLabels, note });
}

export function togglePendingUserInputCustomSelection(
  question: UserInputQuestion,
  draft: PendingUserInputDraftAnswer | undefined,
): PendingUserInputDraftAnswer {
  if (question.options.length === 0) {
    return compactDraft({ ...draft, customSelected: true });
  }
  if (question.multiSelect) {
    const nextSelected = draft?.customSelected !== true;
    if (nextSelected) return compactDraft({ ...draft, customSelected: true });
    const { customSelected: _selected, customText: _text, ...withoutCustom } = draft ?? {};
    return compactDraft(withoutCustom);
  }
  return compactDraft({ customSelected: true, customText: draft?.customText ?? "" });
}

export function togglePendingUserInputOptionSelection(
  question: UserInputQuestion,
  draft: PendingUserInputDraftAnswer | undefined,
  optionLabel: string,
): PendingUserInputDraftAnswer {
  if (!question.options.some((option) => option.label === optionLabel)) {
    return compactDraft(draft ?? {});
  }
  if (question.multiSelect) {
    const selectedOptionLabels = selectedLabelsForQuestion(question, draft?.selectedOptionLabels);
    const nextSelectedOptionLabels = selectedOptionLabels.includes(optionLabel)
      ? selectedOptionLabels.filter((label) => label !== optionLabel)
      : [...selectedOptionLabels, optionLabel];
    if (nextSelectedOptionLabels.length > 0) {
      return compactDraft({ ...draft, selectedOptionLabels: nextSelectedOptionLabels });
    }
    const { note: _note, selectedOptionLabels: _labels, ...withoutPreset } = draft ?? {};
    return compactDraft(withoutPreset);
  }

  const previousSelection = selectedLabelsForQuestion(question, draft?.selectedOptionLabels)[0];
  return compactDraft({
    selectedOptionLabels: [optionLabel],
    ...(previousSelection === optionLabel && draft?.note !== undefined ? { note: draft.note } : {}),
  });
}

export function buildPendingUserInputAnswers(
  questions: ReadonlyArray<UserInputQuestion>,
  draftAnswers: Record<string, PendingUserInputDraftAnswer>,
): CanonicalUserInputAnswers | null {
  const answers: Record<string, CanonicalUserInputAnswer> = {};
  for (const question of questions) {
    const answer = resolvePendingUserInputAnswer(question, draftAnswers[question.id]);
    if (!answer) return null;
    answers[question.id] = answer;
  }
  return answers;
}

export function hasCompletePendingUserInputAnswers(answers: CanonicalUserInputAnswers): boolean {
  const entries = Object.values(answers);
  return (
    entries.length > 0 &&
    entries.every(
      (answer) =>
        answer.selectedOptionLabels.length > 0 ||
        hasMeaningfulPendingUserInputText(answer.customText),
    )
  );
}

export function countAnsweredPendingUserInputQuestions(
  questions: ReadonlyArray<UserInputQuestion>,
  draftAnswers: Record<string, PendingUserInputDraftAnswer>,
): number {
  return questions.reduce(
    (count, question) =>
      resolvePendingUserInputAnswer(question, draftAnswers[question.id]) ? count + 1 : count,
    0,
  );
}

export function findFirstUnansweredPendingUserInputQuestionIndex(
  questions: ReadonlyArray<UserInputQuestion>,
  draftAnswers: Record<string, PendingUserInputDraftAnswer>,
): number {
  const unansweredIndex = questions.findIndex(
    (question) => !resolvePendingUserInputAnswer(question, draftAnswers[question.id]),
  );
  return unansweredIndex === -1 ? Math.max(questions.length - 1, 0) : unansweredIndex;
}

export function derivePendingUserInputProgress(
  questions: ReadonlyArray<UserInputQuestion>,
  draftAnswers: Record<string, PendingUserInputDraftAnswer>,
  questionIndex: number,
): PendingUserInputProgress {
  const normalizedQuestionIndex =
    questions.length === 0 ? 0 : Math.max(0, Math.min(questionIndex, questions.length - 1));
  const activeQuestion = questions[normalizedQuestionIndex] ?? null;
  const activeDraft = activeQuestion ? draftAnswers[activeQuestion.id] : undefined;
  const resolvedAnswer = activeQuestion
    ? resolvePendingUserInputAnswer(activeQuestion, activeDraft)
    : null;
  const answeredQuestionCount = countAnsweredPendingUserInputQuestions(questions, draftAnswers);
  return {
    questionIndex: normalizedQuestionIndex,
    activeQuestion,
    activeDraft,
    selectedOptionLabels: activeQuestion
      ? selectedLabelsForQuestion(activeQuestion, activeDraft?.selectedOptionLabels)
      : [],
    customText: activeDraft?.customText ?? "",
    note: activeDraft?.note ?? "",
    customSelected: activeQuestion?.options.length === 0 || activeDraft?.customSelected === true,
    resolvedAnswer,
    answeredQuestionCount,
    isLastQuestion: questions.length === 0 ? true : normalizedQuestionIndex >= questions.length - 1,
    isComplete: buildPendingUserInputAnswers(questions, draftAnswers) !== null,
    canAdvance: resolvedAnswer !== null,
  };
}
