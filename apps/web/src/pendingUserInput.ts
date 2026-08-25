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
  /** Ephemeral projection state for the Host-synthesized custom option. */
  customSelected?: boolean;
}

export interface PendingUserInputProgress {
  questionIndex: number;
  activeQuestion: UserInputQuestion | null;
  activeDraft: PendingUserInputDraftAnswer | undefined;
  selectedOptionLabels: string[];
  customText: string;
  customSelected: boolean;
  resolvedAnswer: CanonicalUserInputAnswer | null;
  answeredQuestionCount: number;
  isLastQuestion: boolean;
  isComplete: boolean;
  canAdvance: boolean;
}

export type PendingUserInputSinglePresetAction =
  | { kind: "question"; questionIndex: number }
  | { kind: "submit"; answers: CanonicalUserInputAnswers }
  | { kind: "stay" };

export function claimPendingUserInputResponse(claimedKeys: Set<string>, key: string): boolean {
  if (claimedKeys.has(key)) return false;
  claimedKeys.add(key);
  return true;
}

export function releasePendingUserInputResponse(claimedKeys: Set<string>, key: string): void {
  claimedKeys.delete(key);
}

export async function dispatchClaimedPendingUserInputResponse(input: {
  claimedKeys: Set<string>;
  key: string;
  dispatch: () => Promise<void>;
}): Promise<boolean> {
  if (!claimPendingUserInputResponse(input.claimedKeys, input.key)) return false;
  try {
    await input.dispatch();
    return true;
  } catch (error) {
    releasePendingUserInputResponse(input.claimedKeys, input.key);
    throw error;
  }
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

  return {
    selectedOptionLabels,
    ...(customTextIsAnswer ? { customText: draft!.customText! } : {}),
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
    const { selectedOptionLabels: _labels, ...withoutPreset } = draft ?? {};
    return compactDraft(withoutPreset);
  }

  return compactDraft({
    selectedOptionLabels: [optionLabel],
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

export function derivePendingUserInputSinglePresetAction(
  questions: ReadonlyArray<UserInputQuestion>,
  draftAnswers: Record<string, PendingUserInputDraftAnswer>,
  questionIndex: number,
  questionId: string,
  nextDraftAnswer: PendingUserInputDraftAnswer,
): PendingUserInputSinglePresetAction | null {
  const question = questions[questionIndex];
  if (
    !question ||
    question.id !== questionId ||
    question.options.length === 0 ||
    question.multiSelect ||
    nextDraftAnswer.customSelected === true ||
    selectedLabelsForQuestion(question, nextDraftAnswer.selectedOptionLabels).length !== 1
  ) {
    return null;
  }
  if (questionIndex < questions.length - 1) {
    return { kind: "question", questionIndex: questionIndex + 1 };
  }
  const nextAnswers = { ...draftAnswers, [questionId]: nextDraftAnswer };
  const answers = buildPendingUserInputAnswers(questions, nextAnswers);
  if (!answers) return null;
  return questions.length === 1 ? { kind: "submit", answers } : { kind: "stay" };
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
    customSelected: activeQuestion?.options.length === 0 || activeDraft?.customSelected === true,
    resolvedAnswer,
    answeredQuestionCount,
    isLastQuestion: questions.length === 0 ? true : normalizedQuestionIndex >= questions.length - 1,
    isComplete: buildPendingUserInputAnswers(questions, draftAnswers) !== null,
    canAdvance: resolvedAnswer !== null,
  };
}
