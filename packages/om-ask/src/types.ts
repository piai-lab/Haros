// Adapted from @mrclrchtr/supi-ask-user@5.0.0 src/types.ts.
// This is an internal fork-kernel model, not OmniMind's public Ask User contract.

export interface QuestionnaireOptionInput {
  value: string;
  label: string;
  description?: string;
  details?: string;
}

interface BaseQuestionInput {
  id: string;
  header: string;
  prompt: string;
}

export interface ChoiceQuestionInput extends BaseQuestionInput {
  type: "choice";
  options: QuestionnaireOptionInput[];
  multi?: boolean;
  recommendation?: string | string[];
}

export interface TextQuestionInput extends BaseQuestionInput {
  type: "text";
  recommendation?: string;
  placeholder?: string;
}

export type QuestionnaireQuestionInput = ChoiceQuestionInput | TextQuestionInput;

export interface QuestionnaireInput {
  title?: string;
  intro?: string;
  questions: QuestionnaireQuestionInput[];
}

export interface NormalizedOption {
  value: string;
  label: string;
  description?: string;
  details?: string;
}

interface BaseQuestion {
  id: string;
  header: string;
  prompt: string;
}

export interface NormalizedChoiceQuestion extends BaseQuestion {
  type: "choice";
  options: NormalizedOption[];
  multi: boolean;
  recommendedValues: string[];
}

export interface NormalizedTextQuestion extends BaseQuestion {
  type: "text";
  suggestedText?: string;
  placeholder?: string;
}

export type NormalizedQuestion = NormalizedChoiceQuestion | NormalizedTextQuestion;

export interface NormalizedQuestionnaire {
  title?: string;
  intro?: string;
  questions: NormalizedQuestion[];
}

export type AskUserOutcomeKind = "submitted" | "needs_discussion";

export interface ChoiceQuestionResponse {
  questionId: string;
  questionComment?: string;
  answer: {
    kind: "choice";
    answered: boolean;
    selectedValues: string[];
    customText?: string;
    note?: string;
    options: Array<{
      value: string;
      label: string;
      selected: boolean;
      comment?: string;
    }>;
  };
}

export interface TextQuestionResponse {
  questionId: string;
  questionComment?: string;
  answer: {
    kind: "text";
    answered: boolean;
    value?: string;
  };
}

export type AskUserResponse = ChoiceQuestionResponse | TextQuestionResponse;

export interface AskUserOutcome {
  outcome: AskUserOutcomeKind;
  comment?: string;
  responses: AskUserResponse[];
}

export interface AskUserDetails extends AskUserOutcome {
  title?: string;
  intro?: string;
  questions: NormalizedQuestion[];
}

export type AskUserInteractionResult = AskUserInteractionCancel | AskUserInteractionAbort;

export interface AskUserInteractionCancel {
  kind: "cancel";
}

export interface AskUserInteractionAbort {
  kind: "abort";
}

export type AskUserKernelResult =
  | { kind: "completed"; details: AskUserDetails }
  | AskUserInteractionCancel
  | AskUserInteractionAbort;

export function isChoiceQuestion(
  question: NormalizedQuestion,
): question is NormalizedChoiceQuestion {
  return question.type === "choice";
}

export function isTextQuestion(question: NormalizedQuestion): question is NormalizedTextQuestion {
  return question.type === "text";
}
