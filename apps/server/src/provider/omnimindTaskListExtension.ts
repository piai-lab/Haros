import type {
  InlineExtension,
  LoadExtensionsResult,
  ToolDefinition,
  ToolInfo,
} from "@earendil-works/pi-coding-agent";
import { type RuntimeTaskListItem, type TurnTasksUpdatedPayload } from "@omnimind/contracts";

import { makeRuntimeTaskListItem } from "./runtimeTaskList.ts";

export const OMNIMIND_TASK_LIST_TOOL_NAME = "omnimind_update_tasks";
export const OMNIMIND_TASK_LIST_EXTENSION_NAME = "omnimind-agent-task-list";
export const OMNIMIND_TASK_LIST_EXTENSION_PATH = `<inline:${OMNIMIND_TASK_LIST_EXTENSION_NAME}>`;

const OMNIMIND_TASK_LIST_MAX_ITEMS = 50;
const OMNIMIND_TASK_TEXT_MAX_LENGTH = 1_000;
const OMNIMIND_TASK_EXPLANATION_MAX_LENGTH = 2_000;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function boundedTrimmedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : undefined;
}

/** Decode one complete, turn-scoped task snapshot without creating durable Todo state. */
export function decodeOmniMindTaskListUpdate(args: unknown): TurnTasksUpdatedPayload | null {
  const input = record(args);
  const rawTasks = input?.tasks;
  if (
    !Array.isArray(rawTasks) ||
    rawTasks.length === 0 ||
    rawTasks.length > OMNIMIND_TASK_LIST_MAX_ITEMS
  ) {
    return null;
  }

  const tasks: RuntimeTaskListItem[] = [];
  let inProgressCount = 0;
  for (const rawTask of rawTasks) {
    const taskInput = record(rawTask);
    const task = boundedTrimmedString(taskInput?.task, OMNIMIND_TASK_TEXT_MAX_LENGTH);
    const status = taskInput?.status;
    if (
      task === undefined ||
      (status !== "pending" &&
        status !== "in_progress" &&
        status !== "inProgress" &&
        status !== "completed")
    ) {
      return null;
    }
    const item = makeRuntimeTaskListItem(task, status);
    if (!item) return null;
    if (item.status === "inProgress") inProgressCount += 1;
    tasks.push(item);
  }
  if (inProgressCount > 1) return null;

  const rawExplanation = input?.explanation;
  if (rawExplanation !== undefined && typeof rawExplanation !== "string") return null;
  const explanation = boundedTrimmedString(rawExplanation, OMNIMIND_TASK_EXPLANATION_MAX_LENGTH);
  if (typeof rawExplanation === "string" && rawExplanation.trim().length > 0 && !explanation) {
    return null;
  }
  return {
    ...(explanation ? { explanation } : {}),
    tasks,
  };
}

export function buildOmniMindTaskListTool(input: {
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly onValidatedPayload?: (payload: TurnTasksUpdatedPayload) => void;
}): ToolDefinition {
  return input.defineTool({
    name: OMNIMIND_TASK_LIST_TOOL_NAME,
    label: "Update OmniMind tasks",
    description:
      "Replace the current OmniMind Agent task snapshot. Use it when non-trivial work benefits from visible progress, and send the complete current snapshot with at most one task in progress.",
    promptSnippet: "Maintain a revisable task snapshot when useful",
    promptGuidelines: [
      "Track user goals and meaningful outcomes when progress visibility helps; investigate first when needed, and never list internal tool or loading steps.",
    ],
    parameters: {
      type: "object",
      properties: {
        explanation: {
          type: "string",
          maxLength: OMNIMIND_TASK_EXPLANATION_MAX_LENGTH,
          description: "Optional concise reason for the task-list update.",
        },
        tasks: {
          type: "array",
          minItems: 1,
          maxItems: OMNIMIND_TASK_LIST_MAX_ITEMS,
          items: {
            type: "object",
            properties: {
              task: { type: "string", minLength: 1, maxLength: OMNIMIND_TASK_TEXT_MAX_LENGTH },
              status: {
                type: "string",
                enum: ["pending", "in_progress", "completed"],
              },
            },
            required: ["task", "status"],
            additionalProperties: false,
          },
        },
      },
      required: ["tasks"],
      additionalProperties: false,
    } as ToolDefinition["parameters"],
    executionMode: "sequential",
    execute: async (_toolCallId, params) => {
      const payload = decodeOmniMindTaskListUpdate(params);
      if (!payload) {
        throw new Error(
          "Invalid OmniMind task list: provide 1-50 non-empty tasks and at most one in-progress task.",
        );
      }
      input.onValidatedPayload?.(payload);
      return {
        content: [
          {
            type: "text",
            text: `Updated the current OmniMind task list (${payload.tasks.length} tasks).`,
          },
        ],
        details: payload,
      };
    },
  });
}

function hasProductSource(tool: ToolInfo | undefined): boolean {
  return (
    tool?.sourceInfo.path === OMNIMIND_TASK_LIST_EXTENSION_PATH &&
    tool.sourceInfo.source === "inline" &&
    tool.sourceInfo.scope === "temporary" &&
    tool.sourceInfo.origin === "top-level"
  );
}

/** Inspect whether Pi's native precedence selected the product Extension tool. */
export function inspectOmniMindTaskListExtensionRegistration(input: {
  readonly extensions: LoadExtensionsResult;
  readonly tools: ReadonlyArray<ToolInfo>;
  readonly activeToolNames: ReadonlyArray<string>;
}): { readonly available: boolean; readonly diagnostics: ReadonlyArray<string> } {
  const registeredTool = input.tools.find((tool) => tool.name === OMNIMIND_TASK_LIST_TOOL_NAME);
  const available =
    hasProductSource(registeredTool) &&
    input.activeToolNames.includes(OMNIMIND_TASK_LIST_TOOL_NAME);
  const diagnostics = input.extensions.errors
    .filter(
      ({ path, error }) =>
        path === OMNIMIND_TASK_LIST_EXTENSION_PATH || error.includes(OMNIMIND_TASK_LIST_TOOL_NAME),
    )
    .map(({ error }) => error);
  return {
    available,
    diagnostics:
      !available && diagnostics.length === 0
        ? ["Pi did not select the bundled OmniMind task Extension tool."]
        : diagnostics,
  };
}

export function makeOmniMindTaskListExtension(input: {
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly onTasksUpdated: (input: {
    readonly toolCallId: string;
    readonly payload: TurnTasksUpdatedPayload;
  }) => void;
}): InlineExtension {
  return {
    name: OMNIMIND_TASK_LIST_EXTENSION_NAME,
    hidden: true,
    factory: (pi) => {
      const trustedPayloads = new WeakSet<object>();
      pi.registerTool(
        buildOmniMindTaskListTool({
          defineTool: input.defineTool,
          onValidatedPayload: (payload) => trustedPayloads.add(payload),
        }),
      );
      pi.on("tool_execution_end", (event) => {
        if (event.isError || event.toolName !== OMNIMIND_TASK_LIST_TOOL_NAME) return;
        const details = record(record(event.result)?.details);
        if (!details || !trustedPayloads.delete(details)) return;
        input.onTasksUpdated({
          toolCallId: event.toolCallId,
          payload: details as TurnTasksUpdatedPayload,
        });
      });
    },
  };
}
