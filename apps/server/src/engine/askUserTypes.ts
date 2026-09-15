export const ASK_USER_TOOL_NAME = "ask_user";

export type AskUserQuestion =
  | {
      readonly type: "choice";
      readonly id: string;
      readonly header?: string;
      readonly prompt: string;
      readonly multi?: boolean;
      readonly options: ReadonlyArray<{
        readonly value: string;
        readonly label: string;
        readonly description?: string;
        readonly preview?: string;
        readonly recommended?: boolean;
        readonly recommendationReason?: string;
      }>;
    }
  | {
      readonly type: "text";
      readonly id: string;
      readonly header?: string;
      readonly prompt: string;
      readonly placeholder?: string;
      readonly suggestion?: { readonly text: string };
    };

export interface AskUserToolInput {
  readonly questions: ReadonlyArray<AskUserQuestion>;
}

export type AskUserResultStatus = "answered" | "cancelled" | "aborted" | "stale" | "unavailable";

export interface AskUserAnswer {
  readonly questionId: string;
  readonly selectedValues: ReadonlyArray<string>;
  readonly customText?: string;
}

export interface AskUserResult {
  readonly version: 1;
  readonly requestId: string;
  readonly status: AskUserResultStatus;
  readonly answers?: ReadonlyArray<AskUserAnswer>;
}
