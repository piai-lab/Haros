// Adapted from @mrclrchtr/supi-ask-user@5.0.0 src/session/controller.ts.

import type {
  AskUserInteractionResult,
  AskUserOutcome,
  ChoiceQuestionResponse,
  NormalizedChoiceQuestion,
  NormalizedQuestion,
  NormalizedQuestionnaire,
  NormalizedTextQuestion,
  TextQuestionResponse,
} from "./types.js";

type OptionState = {
  value: string;
  label: string;
  selected: boolean;
  comment?: string;
};

type ChoiceState = {
  kind: "choice";
  options: OptionState[];
  customText?: string;
  customSelected?: boolean;
  note?: string;
  questionComment?: string;
  markedUnanswered?: boolean;
};

type TextState = {
  kind: "text";
  value: string;
  questionComment?: string;
  markedUnanswered?: boolean;
};

type QuestionState = ChoiceState | TextState;

function hasContent(value: string | undefined): value is string {
  return typeof value === "string" && /\S/u.test(value);
}

export class AskUserController {
  private readonly states: QuestionState[];
  private index = 0;
  private terminal = false;
  private terminalResult: AskUserInteractionResult | undefined;
  private formComment: string | undefined;

  constructor(public readonly questionnaire: NormalizedQuestionnaire) {
    if (questionnaire.questions.length === 0) {
      throw new Error("AskUserController requires at least one question.");
    }
    this.states = questionnaire.questions.map((question) => this.initialState(question));
  }

  get currentIndex(): number {
    return this.index;
  }

  get currentQuestion(): NormalizedQuestion {
    return this.questionnaire.questions[this.index]!;
  }

  get isTerminal(): boolean {
    return this.terminal;
  }

  goNext(): boolean {
    if (this.terminal || this.index >= this.questionnaire.questions.length - 1) return false;
    this.index += 1;
    return true;
  }

  goBack(): boolean {
    if (this.terminal || this.index === 0) return false;
    this.index -= 1;
    return true;
  }

  goTo(index: number): boolean {
    if (this.terminal || index < 0 || index >= this.questionnaire.questions.length) return false;
    this.index = index;
    return true;
  }

  isOptionSelected(questionId: string, optionValue: string): boolean {
    const state = this.stateFor(questionId);
    if (state.kind !== "choice") return false;
    return state.options.find((option) => option.value === optionValue)?.selected ?? false;
  }

  isQuestionMarkedUnanswered(questionId: string): boolean {
    return this.stateFor(questionId).markedUnanswered ?? false;
  }

  get comment(): string | undefined {
    return this.formComment;
  }

  setComment(text: string): void {
    if (this.terminal) return;
    this.formComment = text.length === 0 ? undefined : text;
  }

  setQuestionComment(questionId: string, text: string): void {
    if (this.terminal) return;
    const state = this.stateFor(questionId);
    if (text.length === 0) delete state.questionComment;
    else state.questionComment = text;
  }

  getQuestionComment(questionId: string): string | undefined {
    return this.stateFor(questionId).questionComment;
  }

  getOptionComment(questionId: string, optionValue: string): string | undefined {
    const state = this.stateFor(questionId);
    if (state.kind !== "choice") return undefined;
    return state.options.find((option) => option.value === optionValue)?.comment;
  }

  setChoiceOptionComment(
    question: NormalizedChoiceQuestion,
    optionIndex: number,
    comment: string | undefined,
  ): void {
    if (this.terminal) return;
    const state = this.stateFor(question.id);
    if (state.kind !== "choice") return;
    const option = state.options[optionIndex];
    if (!option) return;
    if (comment === undefined || comment.length === 0) delete option.comment;
    else option.comment = comment;
  }

  selectChoiceOption(question: NormalizedChoiceQuestion, optionIndex: number): void {
    if (this.terminal) return;
    const state = this.stateFor(question.id);
    if (state.kind !== "choice" || !state.options[optionIndex]) return;

    const previousValue = state.options.find((option) => option.selected)?.value;
    for (const option of state.options) {
      option.selected = option === state.options[optionIndex];
    }
    if (previousValue !== state.options[optionIndex]?.value) delete state.note;
    delete state.customSelected;
    delete state.customText;
    state.markedUnanswered = false;
  }

  toggleChoiceOption(question: NormalizedChoiceQuestion, optionIndex: number): void {
    if (this.terminal) return;
    if (!question.multi) {
      this.selectChoiceOption(question, optionIndex);
      return;
    }
    const state = this.stateFor(question.id);
    if (state.kind !== "choice") return;
    const option = state.options[optionIndex];
    if (!option) return;

    option.selected = !option.selected;
    if (!state.options.some((candidate) => candidate.selected)) delete state.note;
    state.markedUnanswered = false;
  }

  setChoiceCustomText(question: NormalizedChoiceQuestion, text: string, selected = true): void {
    if (this.terminal) return;
    const state = this.stateFor(question.id);
    if (state.kind !== "choice") return;
    state.customSelected = selected;
    if (selected) state.customText = text;
    else delete state.customText;
    if (!question.multi && selected) {
      for (const option of state.options) option.selected = false;
      delete state.note;
    }
    if (selected && hasContent(text)) state.markedUnanswered = false;
  }

  getChoiceCustomText(questionId: string): string | undefined {
    const state = this.stateFor(questionId);
    return state.kind === "choice" && state.customSelected ? state.customText : undefined;
  }

  setChoiceNote(questionId: string, text: string): void {
    if (this.terminal) return;
    const state = this.stateFor(questionId);
    if (state.kind !== "choice") return;
    if (!state.options.some((option) => option.selected) || !hasContent(text)) {
      delete state.note;
      return;
    }
    state.note = text;
  }

  getChoiceNote(questionId: string): string | undefined {
    const state = this.stateFor(questionId);
    return state.kind === "choice" ? state.note : undefined;
  }

  setTextAnswer(questionId: string, value: string): void {
    if (this.terminal) return;
    const state = this.stateFor(questionId);
    if (state.kind !== "text") return;
    state.value = value;
    if (hasContent(state.value)) state.markedUnanswered = false;
  }

  getTextAnswer(questionId: string): string {
    const state = this.stateFor(questionId);
    return state.kind === "text" ? state.value : "";
  }

  markCurrentQuestionUnanswered(): void {
    if (this.terminal) return;
    const state = this.states[this.index]!;
    if (state.kind === "choice") {
      for (const option of state.options) option.selected = false;
      delete state.customSelected;
      delete state.customText;
      delete state.note;
    } else {
      state.value = "";
    }
    state.markedUnanswered = true;
  }

  cancel(): AskUserInteractionResult {
    return this.settle({ kind: "cancel" });
  }

  abort(): AskUserInteractionResult {
    return this.settle({ kind: "abort" });
  }

  getInteractionResult(): AskUserInteractionResult | undefined {
    return this.terminalResult;
  }

  outcome(): AskUserOutcome {
    const responses = this.questionnaire.questions.map((question) => this.buildResponse(question));
    const allAnswered = responses.every((response) => response.answer.answered);

    return {
      outcome: allAnswered ? "submitted" : "needs_discussion",
      ...(this.formComment === undefined ? {} : { comment: this.formComment }),
      responses,
    };
  }

  private settle(result: AskUserInteractionResult): AskUserInteractionResult {
    if (this.terminalResult) return this.terminalResult;
    this.terminal = true;
    this.terminalResult = result;
    return result;
  }

  private stateFor(questionId: string): QuestionState {
    const index = this.questionnaire.questions.findIndex((question) => question.id === questionId);
    if (index < 0) {
      throw new Error(`Unknown question id "${questionId}" in AskUserController.`);
    }
    return this.states[index]!;
  }

  private initialState(question: NormalizedQuestion): QuestionState {
    if (question.type === "choice") {
      return {
        kind: "choice",
        options: question.options.map((option) => ({
          value: option.value,
          label: option.label,
          selected: false,
        })),
      };
    }
    return { kind: "text", value: "" };
  }

  private buildResponse(
    question: NormalizedQuestion,
  ): ChoiceQuestionResponse | TextQuestionResponse {
    const state = this.stateFor(question.id);
    return question.type === "choice"
      ? this.buildChoiceResponse(question, state as ChoiceState)
      : this.buildTextResponse(question, state as TextState);
  }

  private buildChoiceResponse(
    question: NormalizedChoiceQuestion,
    state: ChoiceState,
  ): ChoiceQuestionResponse {
    const touchedOptions = state.options.filter(
      (option) => option.selected || option.comment !== undefined,
    );
    const selectedValues = state.options
      .filter((option) => option.selected)
      .map((option) => option.value);
    const customText =
      state.customSelected && hasContent(state.customText) ? state.customText : undefined;
    const note = selectedValues.length > 0 && hasContent(state.note) ? state.note : undefined;
    return {
      questionId: question.id,
      ...(state.questionComment === undefined ? {} : { questionComment: state.questionComment }),
      answer: {
        kind: "choice",
        answered: selectedValues.length > 0 || customText !== undefined,
        selectedValues,
        ...(customText === undefined ? {} : { customText }),
        ...(note === undefined ? {} : { note }),
        options: touchedOptions.map((option) =>
          option.comment === undefined
            ? { value: option.value, label: option.label, selected: option.selected }
            : {
                value: option.value,
                label: option.label,
                selected: option.selected,
                comment: option.comment,
              },
        ),
      },
    };
  }

  private buildTextResponse(
    question: NormalizedTextQuestion,
    state: TextState,
  ): TextQuestionResponse {
    const answered = hasContent(state.value);
    return {
      questionId: question.id,
      ...(state.questionComment === undefined ? {} : { questionComment: state.questionComment }),
      answer: {
        kind: "text",
        answered,
        ...(answered ? { value: state.value } : {}),
      },
    };
  }
}
