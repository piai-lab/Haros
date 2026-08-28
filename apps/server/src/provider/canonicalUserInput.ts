// FILE: canonicalUserInput.ts
// Purpose: Encode the product-owned structured answer envelope at legacy Engine boundaries.
// Layer: Engine composition seam

import {
  CanonicalUserInputRequest,
  type UserInputQuestion,
  CanonicalUserInputAnswer,
  CanonicalUserInputAnswers,
  CanonicalUserInputResponse,
  EngineUserInputAnswer,
  EngineUserInputAnswers,
} from "@harnessos/contracts";
import { Schema } from "effect";

function hasMeaningfulText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * One Engine-owned seam upgrades native/legacy question arrays into the
 * versioned Product request and runs the canonical bounds/identity decoder.
 * Adapters must call this before publishing `user-input.requested`.
 */
export function canonicalUserInputRequestFromQuestions(
  questions: ReadonlyArray<UserInputQuestion>,
): CanonicalUserInputRequest {
  const request = {
    version: 1 as const,
    questions: questions.map((question) => {
      const shared = {
        id: question.id,
        header: question.header,
        prompt: question.prompt ?? question.question,
      };
      if (
        question.kind === "text" ||
        (question.kind !== "choice" && question.options.length === 0)
      ) {
        return {
          ...shared,
          kind: "text" as const,
          ...(question.placeholder === undefined ? {} : { placeholder: question.placeholder }),
          ...(question.suggestion === undefined ? {} : { suggestion: question.suggestion }),
        };
      }
      return {
        ...shared,
        kind: "choice" as const,
        cardinality:
          question.cardinality === "multiple" || question.multiSelect
            ? ("multiple" as const)
            : ("single" as const),
        options: question.options.map((option) => ({
          label: option.label,
          ...(typeof option.description === "string" && option.description.trim().length > 0
            ? { description: option.description }
            : {}),
          ...(option.preview === undefined ? {} : { preview: option.preview }),
          ...(option.recommended === undefined ? {} : { recommended: option.recommended }),
          ...(option.recommendationReason === undefined
            ? {}
            : { recommendationReason: option.recommendationReason }),
        })),
      };
    }),
  };
  return Schema.decodeUnknownSync(CanonicalUserInputRequest)(request);
}

/**
 * Native question protocols commonly accept only one string or a string array.
 * Keep their compact legacy shape when it is lossless. When custom text coexists
 * with presets, use one explicit JSON envelope so the model
 * receives every raw field without Host interpretation or string concatenation.
 */
export function encodeCanonicalUserInputAnswer(
  answer: CanonicalUserInputAnswer,
): EngineUserInputAnswer {
  const selectedOptionLabels = [...answer.selectedOptionLabels];
  const customText = hasMeaningfulText(answer.customText) ? answer.customText : undefined;
  if (customText !== undefined && selectedOptionLabels.length > 0) {
    return JSON.stringify({
      selectedOptionLabels,
      ...(customText !== undefined ? { customText } : {}),
    });
  }
  if (customText !== undefined) return customText;
  if (selectedOptionLabels.length === 1) return selectedOptionLabels[0]!;
  return selectedOptionLabels;
}

export function encodeCanonicalUserInputAnswers(
  answers: CanonicalUserInputAnswers,
): EngineUserInputAnswers {
  return Object.fromEntries(
    Object.entries(answers).map(([questionId, answer]) => [
      questionId,
      encodeCanonicalUserInputAnswer(answer),
    ]),
  );
}

export function encodeCanonicalUserInputResponse(response: CanonicalUserInputResponse): {
  readonly answers: EngineUserInputAnswers;
  readonly cancelled: boolean;
} {
  return response.status === "answered"
    ? { answers: encodeCanonicalUserInputAnswers(response.answers), cancelled: false }
    : { answers: {}, cancelled: true };
}
