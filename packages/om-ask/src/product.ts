export const ASK_USER_TOOL_NAME = "ask_user";
export const ASK_USER_CONTRACT_VERSION = 1 as const;
export const ASK_USER_RESERVED_CUSTOM_VALUE = "__omnimind_custom__";
export const ASK_USER_MAX_UTF8_BYTES = 1024 * 1024;
export const ASK_USER_MAX_NODES = 10_000;

export interface AskUserOptionInput {
  value: string;
  label: string;
  description?: string;
  preview?: string;
  recommended?: boolean;
  recommendationReason?: string;
}

export interface AskUserChoiceInput {
  type: "choice";
  id: string;
  header?: string;
  prompt: string;
  multi?: boolean;
  options: AskUserOptionInput[];
}

export interface AskUserTextInput {
  type: "text";
  id: string;
  header?: string;
  prompt: string;
  placeholder?: string;
  suggestion?: { text: string; reason?: string };
}

export interface AskUserToolInput {
  questions: Array<AskUserChoiceInput | AskUserTextInput>;
}

export interface AskUserAnswer {
  questionId: string;
  selectedValues: string[];
  customText?: string;
  note?: string;
}

export type AskUserResultStatus =
  | "answered"
  | "cancelled"
  | "aborted"
  | "timed_out"
  | "unavailable"
  | "stale";

export interface AskUserResult {
  version: 1;
  requestId: string;
  status: AskUserResultStatus;
  answers?: AskUserAnswer[];
}

export interface AskUserInteractionPort {
  present(input: {
    readonly toolCallId: string;
    readonly request: AskUserToolInput;
    readonly signal?: AbortSignal;
  }): Promise<AskUserResult>;
}

export class AskUserProductValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AskUserProductValidationError";
  }
}

function nonBlank(value: unknown): value is string {
  return typeof value === "string" && /\S/u.test(value);
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function validateAskUserToolInput(input: AskUserToolInput): AskUserToolInput {
  if (!input || !Array.isArray(input.questions) || input.questions.length === 0) {
    throw new AskUserProductValidationError("ask_user requires at least one question.");
  }
  if (byteLength(input) > ASK_USER_MAX_UTF8_BYTES) {
    throw new AskUserProductValidationError("ask_user request exceeds the 1 MiB UTF-8 safety guard.");
  }
  const questionIds = new Set<string>();
  let nodes = 0;
  for (const question of input.questions) {
    nodes += 1;
    if (!nonBlank(question.id) || !nonBlank(question.prompt)) {
      throw new AskUserProductValidationError("Every ask_user question requires a non-empty id and prompt.");
    }
    if (question.header !== undefined && !nonBlank(question.header)) {
      throw new AskUserProductValidationError(`Question "${question.id}" has an empty header.`);
    }
    if (questionIds.has(question.id)) {
      throw new AskUserProductValidationError(`Duplicate question id "${question.id}".`);
    }
    questionIds.add(question.id);
    if (question.type === "text") {
      if (question.suggestion !== undefined && !nonBlank(question.suggestion.text)) {
        throw new AskUserProductValidationError(`Text question "${question.id}" has an empty suggestion.`);
      }
      continue;
    }
    if (question.type !== "choice" || !Array.isArray(question.options) || question.options.length === 0) {
      throw new AskUserProductValidationError(`Choice question "${question.id}" requires authored options.`);
    }
    const values = new Set<string>();
    const labels = new Set<string>();
    for (const option of question.options) {
      nodes += 1;
      if (!nonBlank(option.value) || !nonBlank(option.label)) {
        throw new AskUserProductValidationError(`Choice question "${question.id}" has an empty option value or label.`);
      }
      if (option.value === ASK_USER_RESERVED_CUSTOM_VALUE) {
        throw new AskUserProductValidationError(`Option value "${ASK_USER_RESERVED_CUSTOM_VALUE}" is reserved by OmniMind.`);
      }
      if (values.has(option.value) || labels.has(option.label)) {
        throw new AskUserProductValidationError(`Choice question "${question.id}" has duplicate option values or labels.`);
      }
      values.add(option.value);
      labels.add(option.label);
      if (option.recommendationReason !== undefined && option.recommended !== true) {
        throw new AskUserProductValidationError(
          `Choice question "${question.id}" has a recommendation reason on a non-recommended option.`,
        );
      }
    }
  }
  if (nodes > ASK_USER_MAX_NODES) {
    throw new AskUserProductValidationError("ask_user request exceeds the 10,000-node safety guard.");
  }
  return input;
}

export function validateAskUserResult(request: AskUserToolInput, result: AskUserResult): AskUserResult {
  if (result.version !== ASK_USER_CONTRACT_VERSION || !nonBlank(result.requestId)) {
    throw new AskUserProductValidationError("ask_user interaction returned an invalid result envelope.");
  }
  if (result.status !== "answered") {
    if (result.answers !== undefined) {
      throw new AskUserProductValidationError(`${result.status} ask_user result cannot carry answers.`);
    }
    return result;
  }
  if (!Array.isArray(result.answers) || result.answers.length !== request.questions.length) {
    throw new AskUserProductValidationError("answered ask_user result must contain exactly one answer per question.");
  }
  const requestById = new Map(request.questions.map((question) => [question.id, question] as const));
  const seen = new Set<string>();
  for (const answer of result.answers) {
    const question = requestById.get(answer.questionId);
    if (!question || seen.has(answer.questionId)) {
      throw new AskUserProductValidationError("ask_user result contains an unknown or duplicate question id.");
    }
    seen.add(answer.questionId);
    if (!Array.isArray(answer.selectedValues)) {
      throw new AskUserProductValidationError(`Answer "${answer.questionId}" has invalid selectedValues.`);
    }
    if (question.type === "text") {
      if (answer.selectedValues.length > 0 || answer.note !== undefined) {
        throw new AskUserProductValidationError(`Text answer "${answer.questionId}" cannot carry selections or note.`);
      }
      continue;
    }
    const allowed = new Set(question.options.map((option) => option.value));
    if (new Set(answer.selectedValues).size !== answer.selectedValues.length) {
      throw new AskUserProductValidationError(`Answer "${answer.questionId}" has duplicate selected values.`);
    }
    if (answer.selectedValues.some((value) => !allowed.has(value))) {
      throw new AskUserProductValidationError(`Answer "${answer.questionId}" has an unknown selected value.`);
    }
    if (!question.multi && answer.selectedValues.length > 1) {
      throw new AskUserProductValidationError(`Single-choice answer "${answer.questionId}" has multiple selected values.`);
    }
    if (!question.multi && answer.customText !== undefined && answer.selectedValues.length > 0) {
      throw new AskUserProductValidationError(`Single-choice answer "${answer.questionId}" cannot combine custom text and a preset.`);
    }
    if (answer.note !== undefined && answer.selectedValues.length === 0) {
      throw new AskUserProductValidationError(`Answer "${answer.questionId}" cannot carry a note without a preset selection.`);
    }
  }
  if (byteLength(result) > ASK_USER_MAX_UTF8_BYTES) {
    throw new AskUserProductValidationError("ask_user result exceeds the 1 MiB UTF-8 safety guard.");
  }
  return result;
}
