import {
  ASK_USER_TOOL_NAME,
  type AskUserInteractionPort,
  type AskUserResult,
  type AskUserToolInput,
  validateAskUserResult,
  validateAskUserToolInput,
} from "./product.js";

export interface AskUserToolDefinition {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly promptSnippet: string;
  readonly promptGuidelines: readonly string[];
  readonly parameters: object;
  readonly executionMode: "barrier";
  readonly execute: (
    toolCallId: string,
    params: AskUserToolInput,
    signal?: AbortSignal,
  ) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    details: AskUserResult;
    terminate: boolean;
  }>;
}

export function buildAskUserTool(input: {
  readonly defineTool: <T extends AskUserToolDefinition>(tool: T) => T;
  readonly interaction: AskUserInteractionPort;
}): AskUserToolDefinition {
  return input.defineTool({
    name: ASK_USER_TOOL_NAME,
    label: "Ask user",
    description:
      "Ask the user one or more decision or clarification questions and wait for their response before replanning. Use authored options when they help, but never add an Other/Custom catch-all option; OmniMind always provides that choice.",
    promptSnippet: "Ask the user for blocking decisions or clarification",
    promptGuidelines: [
      "Use ask_user only when the answer materially affects the next action. Do not author an Other, Custom, free-form catch-all, or equivalent sentinel option.",
      "Recommendations and suggestions are advisory only: they are never selected or inserted unless the user explicitly chooses them.",
    ],
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 1,
          items: {
            oneOf: [
              {
                type: "object",
                properties: {
                  type: { const: "choice" },
                  id: { type: "string", minLength: 1 },
                  header: { type: "string", minLength: 1 },
                  prompt: { type: "string", minLength: 1 },
                  multi: { type: "boolean" },
                  options: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      properties: {
                        value: { type: "string", minLength: 1 },
                        label: { type: "string", minLength: 1 },
                        description: { type: "string" },
                        preview: { type: "string" },
                        recommended: { type: "boolean" },
                        recommendationReason: { type: "string" },
                      },
                      required: ["value", "label"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["type", "id", "prompt", "options"],
                additionalProperties: false,
              },
              {
                type: "object",
                properties: {
                  type: { const: "text" },
                  id: { type: "string", minLength: 1 },
                  header: { type: "string", minLength: 1 },
                  prompt: { type: "string", minLength: 1 },
                  placeholder: { type: "string" },
                  suggestion: {
                    type: "object",
                    properties: { text: { type: "string", minLength: 1 }, reason: { type: "string" } },
                    required: ["text"],
                    additionalProperties: false,
                  },
                },
                required: ["type", "id", "prompt"],
                additionalProperties: false,
              },
            ],
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
    executionMode: "barrier",
    execute: async (toolCallId, params, signal) => {
      const request = validateAskUserToolInput(params);
      const result = validateAskUserResult(
        request,
        await input.interaction.present({ toolCallId, request, ...(signal === undefined ? {} : { signal }) }),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        details: result,
        terminate: result.status !== "answered",
      };
    },
  });
}
