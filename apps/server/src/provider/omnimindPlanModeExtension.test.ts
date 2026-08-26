import type { ToolCallEvent, ToolCallEventResult } from "@earendil-works/pi-coding-agent";
import { TurnId } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  createOmniMindPlanModeController,
  makeOmniMindPlanModeExtension,
} from "./omnimindPlanModeExtension.ts";

describe("OmniMind Plan mode tool guard", () => {
  it("allows only the fixed read, Product interaction, task, and Web Access tools", async () => {
    const controller = createOmniMindPlanModeController();
    const extension = makeOmniMindPlanModeExtension(controller) as Exclude<
      ReturnType<typeof makeOmniMindPlanModeExtension>,
      (...args: never[]) => unknown
    >;
    let handler:
      | ((event: ToolCallEvent) => ToolCallEventResult | void | Promise<ToolCallEventResult | void>)
      | undefined;
    await extension.factory({
      on(event: string, next: typeof handler) {
        if (event === "tool_call") handler = next;
      },
    } as never);
    expect(handler).toBeDefined();

    const call = (toolName: string) =>
      handler?.({
        type: "tool_call",
        toolCallId: "call-1",
        toolName,
        input: {},
      } as ToolCallEvent);

    expect(await call("write")).toBeUndefined();
    controller.activate(TurnId.makeUnsafe("plan-turn"));
    for (const name of [
      "read",
      "grep",
      "find",
      "ls",
      "ask_user",
      "omnimind_update_tasks",
      "web_search",
      "source_check",
      "fetch_content",
      "get_search_content",
    ]) {
      expect(await call(name), name).toBeUndefined();
    }
    for (const name of ["bash", "edit", "write", "host_tool", "mcp_tool", "future_tool"]) {
      expect(await call(name), name).toEqual({
        block: true,
        terminate: true,
        reason: `Plan mode is read-only. Tool '${name}' is not allowed.`,
      });
    }

    controller.deactivate(TurnId.makeUnsafe("different-turn"));
    expect(await call("write")).toMatchObject({ block: true });
    controller.deactivate(TurnId.makeUnsafe("plan-turn"));
    expect(await call("write")).toBeUndefined();
  });
});
