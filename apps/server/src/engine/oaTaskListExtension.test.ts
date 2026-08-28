// FILE: oaTaskListExtension.test.ts
// Purpose: Verifies the product-bundled Todo Extension's bounded snapshot and provenance contract.
// Layer: Engine Extension tests

import { describe, expect, it } from "vitest";

import {
  buildOATaskListTool,
  decodeOATaskListUpdate,
  makeOATaskListExtension,
} from "./oaTaskListExtension.ts";

describe("HarnessOS task-list Extension", () => {
  it("normalizes one bounded snapshot and rejects competing current tasks", async () => {
    expect(
      decodeOATaskListUpdate({
        explanation: "  Intake reconciled  ",
        tasks: [
          { task: "  Inspect source  ", status: "completed" },
          { task: "Implement candidate", status: "in_progress" },
          { task: "Verify result", status: "pending" },
        ],
      }),
    ).toEqual({
      explanation: "Intake reconciled",
      tasks: [
        { task: "Inspect source", status: "completed" },
        { task: "Implement candidate", status: "inProgress" },
        { task: "Verify result", status: "pending" },
      ],
    });
    expect(
      decodeOATaskListUpdate({
        tasks: [
          { task: "First", status: "in_progress" },
          { task: "Second", status: "in_progress" },
        ],
      }),
    ).toBeNull();
    expect(decodeOATaskListUpdate({ tasks: [] })).toBeNull();
    expect(
      decodeOATaskListUpdate({ tasks: [{ task: "Invalid", status: "abandoned" }] }),
    ).toBeNull();

    const tool = buildOATaskListTool({ defineTool: (definition) => definition });
    expect(tool.name).toBe("harnessos_update_tasks");
    expect(tool.promptGuidelines).toEqual([
      "Track user goals and meaningful outcomes when progress visibility helps; investigate first when needed, and never list internal tool or loading steps.",
    ]);
    const openAiFunctionEnvelope = {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
    expect(Buffer.byteLength(JSON.stringify(openAiFunctionEnvelope), "utf8")).toBeLessThan(1_024);
    expect(Buffer.byteLength(JSON.stringify(tool.promptGuidelines), "utf8")).toBeLessThan(256);
    await expect(
      tool.execute(
        "task-call",
        { tasks: [{ task: "Finish", status: "completed" }] },
        undefined,
        undefined,
        {} as never,
      ),
    ).resolves.toMatchObject({
      details: { tasks: [{ task: "Finish", status: "completed" }] },
    });
  });

  it("projects only result details created by the product Extension instance", async () => {
    const projected: unknown[] = [];
    let tool: any;
    let onExecutionEnd: ((event: any) => void) | undefined;
    const extension = makeOATaskListExtension({
      defineTool: (definition) => definition,
      onTasksUpdated: (update) => projected.push(update),
    });
    expect(typeof extension).not.toBe("function");
    if (typeof extension === "function") throw new Error("expected a named inline Extension");
    await extension.factory({
      registerTool: (definition: unknown) => {
        tool = definition;
      },
      on: (event: string, handler: (value: any) => void) => {
        if (event === "tool_execution_end") onExecutionEnd = handler;
      },
    } as never);

    onExecutionEnd?.({
      type: "tool_execution_end",
      toolCallId: "forged",
      toolName: "harnessos_update_tasks",
      isError: false,
      result: { details: { tasks: [{ task: "Forged", status: "completed" }] } },
    });
    expect(projected).toEqual([]);

    const result = await tool.execute(
      "trusted",
      { tasks: [{ task: "Verified outcome", status: "completed" }] },
      undefined,
      undefined,
      {} as never,
    );
    onExecutionEnd?.({
      type: "tool_execution_end",
      toolCallId: "trusted",
      toolName: "harnessos_update_tasks",
      isError: false,
      result,
    });
    expect(projected).toEqual([
      {
        toolCallId: "trusted",
        payload: { tasks: [{ task: "Verified outcome", status: "completed" }] },
      },
    ]);

    onExecutionEnd?.({
      type: "tool_execution_end",
      toolCallId: "replayed",
      toolName: "harnessos_update_tasks",
      isError: false,
      result,
    });
    expect(projected).toHaveLength(1);
  });
});
