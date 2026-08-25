// FILE: canonicalUserInput.ts
// Purpose: Encode the product-owned structured answer envelope at legacy Provider boundaries.
// Layer: Provider composition seam

import type {
  CanonicalUserInputAnswer,
  CanonicalUserInputAnswers,
  ProviderUserInputAnswer,
  ProviderUserInputAnswers,
} from "@omnimind/contracts";

function hasMeaningfulText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Native question protocols commonly accept only one string or a string array.
 * Keep their compact legacy shape when it is lossless. When custom text coexists
 * with presets, or a note is present, use one explicit JSON envelope so the model
 * receives every raw field without Host interpretation or string concatenation.
 */
export function encodeCanonicalUserInputAnswer(
  answer: CanonicalUserInputAnswer,
): ProviderUserInputAnswer {
  const selectedOptionLabels = [...answer.selectedOptionLabels];
  const customText = hasMeaningfulText(answer.customText) ? answer.customText : undefined;
  const note = hasMeaningfulText(answer.note) ? answer.note : undefined;
  if (note !== undefined || (customText !== undefined && selectedOptionLabels.length > 0)) {
    return JSON.stringify({
      selectedOptionLabels,
      ...(customText !== undefined ? { customText } : {}),
      ...(note !== undefined ? { note } : {}),
    });
  }
  if (customText !== undefined) return customText;
  if (selectedOptionLabels.length === 1) return selectedOptionLabels[0]!;
  return selectedOptionLabels;
}

export function encodeCanonicalUserInputAnswers(
  answers: CanonicalUserInputAnswers,
): ProviderUserInputAnswers {
  return Object.fromEntries(
    Object.entries(answers).map(([questionId, answer]) => [
      questionId,
      encodeCanonicalUserInputAnswer(answer),
    ]),
  );
}
