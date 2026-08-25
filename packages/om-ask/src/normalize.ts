// Adapted from @mrclrchtr/supi-ask-user@5.0.0 src/normalize.ts.

import type {
  ChoiceQuestionInput,
  NormalizedChoiceQuestion,
  NormalizedOption,
  NormalizedQuestion,
  NormalizedQuestionnaire,
  NormalizedTextQuestion,
  QuestionnaireInput,
  QuestionnaireQuestionInput,
  TextQuestionInput,
} from "./types.js";

const DEPRECATED_TOP_LEVEL_KEYS = ["allowPartialSubmit"] as const;
const DEPRECATED_CHOICE_KEYS = ["required", "initial", "allowOther"] as const;
const DEPRECATED_TEXT_KEYS = ["required", "initial"] as const;

export class AskUserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AskUserValidationError";
  }
}

export function normalizeQuestionnaire(params: QuestionnaireInput): NormalizedQuestionnaire {
  for (const key of DEPRECATED_TOP_LEVEL_KEYS) {
    if (key in params) {
      throw new AskUserValidationError(`The "${key}" field is no longer supported.`);
    }
  }

  if (!Array.isArray(params.questions) || params.questions.length === 0) {
    throw new AskUserValidationError("ask_user requires at least one question.");
  }

  const seen = new Set<string>();
  const questions = params.questions.map((question) => {
    const normalized = normalizeQuestion(question);
    if (seen.has(normalized.id)) {
      throw new AskUserValidationError(
        `Duplicate question id "${normalized.id}" — ids must be unique within one form.`,
      );
    }
    seen.add(normalized.id);
    return normalized;
  });

  return {
    ...(params.title === undefined ? {} : { title: params.title }),
    ...(params.intro === undefined ? {} : { intro: params.intro }),
    questions,
  };
}

function normalizeQuestion(question: QuestionnaireQuestionInput): NormalizedQuestion {
  validateCommonFields(question);
  return question.type === "choice" ? normalizeChoice(question) : normalizeText(question);
}

function validateCommonFields(question: QuestionnaireQuestionInput): void {
  if (isBlank(question.id)) {
    throw new AskUserValidationError("Question id must be a non-empty string.");
  }
  if (isBlank(question.header)) {
    throw new AskUserValidationError(`Question "${question.id}" must include a non-empty header.`);
  }
  if (isBlank(question.prompt)) {
    throw new AskUserValidationError(`Question "${question.id}" must include a non-empty prompt.`);
  }
}

function normalizeChoice(question: ChoiceQuestionInput): NormalizedChoiceQuestion {
  for (const key of DEPRECATED_CHOICE_KEYS) {
    if (key in question) {
      throw new AskUserValidationError(
        `The "${key}" field on choice questions is no longer supported.`,
      );
    }
  }

  if (!Array.isArray(question.options) || question.options.length === 0) {
    throw new AskUserValidationError(
      `choice question "${question.id}" requires at least one authored option.`,
    );
  }

  const options = normalizeOptions(question.id, question.options);
  const multi = question.multi ?? false;
  const recommendedValues = normalizeRecommendation(
    question.id,
    question.recommendation,
    multi,
    options,
  );

  return {
    id: question.id,
    header: question.header,
    prompt: question.prompt,
    type: "choice",
    options,
    multi,
    recommendedValues,
  };
}

function normalizeText(question: TextQuestionInput): NormalizedTextQuestion {
  for (const key of DEPRECATED_TEXT_KEYS) {
    if (key in question) {
      throw new AskUserValidationError(
        `The "${key}" field on text questions is no longer supported.`,
      );
    }
  }

  return {
    id: question.id,
    header: question.header,
    prompt: question.prompt,
    type: "text",
    ...(question.recommendation === undefined ? {} : { suggestedText: question.recommendation }),
    ...(question.placeholder === undefined ? {} : { placeholder: question.placeholder }),
  };
}

function normalizeOptions(
  questionId: string,
  options: ChoiceQuestionInput["options"],
): NormalizedOption[] {
  const seen = new Set<string>();
  return options.map((option) => {
    if (isBlank(option.value) || isBlank(option.label)) {
      throw new AskUserValidationError(
        `choice question "${questionId}" has an option with empty value or label.`,
      );
    }
    if (seen.has(option.value)) {
      throw new AskUserValidationError(
        `choice question "${questionId}" has duplicate option value "${option.value}".`,
      );
    }
    seen.add(option.value);
    return {
      value: option.value,
      label: option.label,
      ...(option.description === undefined ? {} : { description: option.description }),
      ...(option.details === undefined ? {} : { details: option.details }),
    };
  });
}

function normalizeRecommendation(
  questionId: string,
  value: string | string[] | undefined,
  multi: boolean,
  options: NormalizedOption[],
): string[] {
  if (value === undefined) return [];
  if (multi && !Array.isArray(value)) {
    throw new AskUserValidationError(
      `multi-select question "${questionId}" recommendation must be an array, not a string.`,
    );
  }
  if (!multi && Array.isArray(value)) {
    throw new AskUserValidationError(
      `single-select question "${questionId}" recommendation must be a string, not an array.`,
    );
  }

  const values = multi ? (value as string[]) : [value as string];
  const seen = new Set<string>();
  for (const entry of values) {
    if (seen.has(entry)) {
      throw new AskUserValidationError(
        `choice question "${questionId}" has duplicate recommendation value "${entry}".`,
      );
    }
    seen.add(entry);
    if (!options.some((option) => option.value === entry)) {
      const allowed = options.map((option) => `"${option.value}"`).join(", ");
      throw new AskUserValidationError(
        `choice question "${questionId}" recommendation value "${entry}" does not match any option value. Allowed values: [${allowed}].`,
      );
    }
  }
  return [...values];
}

function isBlank(value: string): boolean {
  return !/\S/u.test(value);
}
