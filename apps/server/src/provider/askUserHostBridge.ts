import type { AskUserResult, AskUserToolInput } from "@harnessos/om-ask";
import type { CanonicalUserInputRequest, CanonicalUserInputResponse } from "@harnessos/contracts";

export interface AskUserHostProjection {
  readonly request: CanonicalUserInputRequest;
  readonly valuesByQuestionAndLabel: ReadonlyMap<string, ReadonlyMap<string, string>>;
}

function meaningful(value: string | undefined): value is string {
  return value !== undefined && /\S/u.test(value);
}

export function projectAskUserRequest(input: AskUserToolInput): AskUserHostProjection {
  const valuesByQuestionAndLabel = new Map<string, ReadonlyMap<string, string>>();
  const questions = input.questions.map((question) => {
    if (question.type === "text") {
      return {
        kind: "text" as const,
        id: question.id,
        ...(question.header === undefined ? {} : { header: question.header }),
        prompt: question.prompt,
        ...(question.placeholder === undefined ? {} : { placeholder: question.placeholder }),
        ...(question.suggestion === undefined ? {} : { suggestion: question.suggestion }),
      };
    }
    valuesByQuestionAndLabel.set(
      question.id,
      new Map(question.options.map((option) => [option.label, option.value] as const)),
    );
    return {
      kind: "choice" as const,
      id: question.id,
      ...(question.header === undefined ? {} : { header: question.header }),
      prompt: question.prompt,
      cardinality: question.multi ? ("multiple" as const) : ("single" as const),
      options: question.options.map((option) => ({
        label: option.label,
        ...(option.description === undefined ? {} : { description: option.description }),
        ...(option.preview === undefined ? {} : { preview: option.preview }),
        ...(option.recommended === undefined ? {} : { recommended: option.recommended }),
        ...(option.recommendationReason === undefined
          ? {}
          : { recommendationReason: option.recommendationReason }),
      })),
    };
  });
  return {
    request: { version: 1, questions },
    valuesByQuestionAndLabel,
  };
}

export function resolveAskUserResponse(input: {
  readonly request: AskUserToolInput;
  readonly projection: AskUserHostProjection;
  readonly response: CanonicalUserInputResponse;
  readonly requestId: string;
}): AskUserResult | null {
  if (input.response.status === "cancelled") {
    return { version: 1, requestId: input.requestId, status: "cancelled" };
  }
  const answerIds = Object.keys(input.response.answers);
  if (
    answerIds.length !== input.request.questions.length ||
    answerIds.some((id) => !input.request.questions.some((question) => question.id === id))
  ) {
    return null;
  }
  const answers: NonNullable<AskUserResult["answers"]> = [];
  for (const question of input.request.questions) {
    const answer = input.response.answers[question.id];
    if (!answer) return null;
    if (answer.customText !== undefined && !meaningful(answer.customText)) return null;
    if (question.type === "text") {
      if (answer.selectedOptionLabels.length > 0 || answer.customText === undefined) {
        return null;
      }
      answers.push({
        questionId: question.id,
        selectedValues: [],
        ...(answer.customText === undefined ? {} : { customText: answer.customText }),
      });
      continue;
    }
    const valueByLabel = input.projection.valuesByQuestionAndLabel.get(question.id);
    if (!valueByLabel) return null;
    const selectedValues: string[] = [];
    for (const label of answer.selectedOptionLabels) {
      const value = valueByLabel.get(label);
      if (value === undefined || selectedValues.includes(value)) return null;
      selectedValues.push(value);
    }
    if (!question.multi && selectedValues.length > 1) return null;
    if (!question.multi && selectedValues.length > 0 && answer.customText !== undefined)
      return null;
    if (selectedValues.length === 0 && answer.customText === undefined) return null;
    answers.push({
      questionId: question.id,
      selectedValues,
      ...(answer.customText === undefined ? {} : { customText: answer.customText }),
    });
  }
  return { version: 1, requestId: input.requestId, status: "answered", answers };
}
