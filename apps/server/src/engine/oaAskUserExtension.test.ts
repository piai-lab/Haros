import { describe, expect, it } from "vitest";

import { ASK_USER_TOOL_NAME } from "@harnessos/oa-ask";
import {
  inspectOAAskUserRegistration,
  makeOAAskUserExtension,
  HARNESSOS_ASK_USER_EXTENSION_PATH,
} from "./oaAskUserExtension.ts";

describe("bundled Ask User Extension", () => {
  it("registers one barrier tool backed only by the supplied product interaction", async () => {
    let registered: any;
    const extension = makeOAAskUserExtension({
      defineTool: (definition) => definition,
      interaction: {
        present: async () => ({
          version: 1,
          requestId: "request-1",
          status: "cancelled",
        }),
      },
    });
    if (typeof extension === "function") throw new Error("expected named inline Extension");
    await extension.factory({ registerTool: (tool: unknown) => (registered = tool) } as never);

    expect(registered.name).toBe(ASK_USER_TOOL_NAME);
    expect(registered.executionMode).toBe("barrier");
    await expect(
      registered.execute("call-1", {
        questions: [{ type: "text", id: "q", prompt: "Question" }],
      }),
    ).resolves.toMatchObject({ details: { status: "cancelled" }, terminate: true });
  });

  it("accepts only the bundled inline winner provenance", () => {
    const bundledExtension = {
      sourceInfo: {
        path: HARNESSOS_ASK_USER_EXTENSION_PATH,
        source: "inline",
        scope: "temporary",
        origin: "top-level",
      },
      tools: new Map([[ASK_USER_TOOL_NAME, {}]]),
    };
    const base = {
      extensions: { errors: [], extensions: [bundledExtension], runtime: {} } as never,
      activeToolNames: [ASK_USER_TOOL_NAME],
    };
    expect(
      inspectOAAskUserRegistration({
        ...base,
        tools: [
          {
            name: ASK_USER_TOOL_NAME,
            sourceInfo: {
              path: HARNESSOS_ASK_USER_EXTENSION_PATH,
              source: "inline",
              scope: "temporary",
              origin: "top-level",
            },
          },
        ] as never,
      }),
    ).toMatchObject({ available: true, registered: true });
    expect(
      inspectOAAskUserRegistration({
        ...base,
        tools: [
          {
            name: ASK_USER_TOOL_NAME,
            sourceInfo: {
              path: "/third-party/ask.ts",
              source: "extension",
              scope: "project",
              origin: "top-level",
            },
          },
        ] as never,
      }),
    ).toMatchObject({ available: false, registered: false });

    expect(
      inspectOAAskUserRegistration({
        ...base,
        extensions: {
          errors: [],
          extensions: [
            bundledExtension,
            {
              sourceInfo: {
                path: "/third-party/ask.ts",
                source: "extension",
                scope: "project",
                origin: "top-level",
              },
              tools: new Map([[ASK_USER_TOOL_NAME, {}]]),
            },
          ],
          runtime: {},
        } as never,
        tools: [
          {
            name: ASK_USER_TOOL_NAME,
            sourceInfo: bundledExtension.sourceInfo,
          },
        ] as never,
      }),
    ).toMatchObject({ available: false, registered: false });
  });
});
