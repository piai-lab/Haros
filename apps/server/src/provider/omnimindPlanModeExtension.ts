import type { InlineExtension } from "@earendil-works/pi-coding-agent";
import { ASK_USER_TOOL_NAME } from "@omnimind/om-ask";
import { OMNIMIND_WEB_ACCESS_PLAN_TOOL_NAMES } from "@omnimind/om-web-access";
import type { TurnId } from "@omnimind/contracts";

import { OMNIMIND_TASK_LIST_TOOL_NAME } from "./omnimindTaskListExtension.ts";

export const OMNIMIND_PLAN_MODE_EXTENSION_NAME = "omnimind-agent-plan-guard";

const PLAN_ALLOWED_TOOL_NAMES = new Set([
  "read",
  "grep",
  "find",
  "ls",
  ASK_USER_TOOL_NAME,
  OMNIMIND_TASK_LIST_TOOL_NAME,
  ...OMNIMIND_WEB_ACCESS_PLAN_TOOL_NAMES,
]);

export interface OmniMindPlanModeController {
  readonly activeTurnId: () => TurnId | undefined;
  readonly activate: (turnId: TurnId) => void;
  readonly deactivate: (turnId?: TurnId) => void;
}

export function createOmniMindPlanModeController(): OmniMindPlanModeController {
  let activeTurnId: TurnId | undefined;
  return {
    activeTurnId: () => activeTurnId,
    activate: (turnId) => {
      activeTurnId = turnId;
    },
    deactivate: (turnId) => {
      if (turnId === undefined || turnId === activeTurnId) {
        activeTurnId = undefined;
      }
    },
  };
}

export function makeOmniMindPlanModeExtension(
  controller: OmniMindPlanModeController,
): InlineExtension {
  return {
    name: OMNIMIND_PLAN_MODE_EXTENSION_NAME,
    hidden: true,
    factory: (pi) => {
      pi.on("tool_call", (event) => {
        if (
          controller.activeTurnId() === undefined ||
          PLAN_ALLOWED_TOOL_NAMES.has(event.toolName)
        ) {
          return;
        }
        return {
          block: true,
          terminate: true,
          reason: `Plan mode is read-only. Tool '${event.toolName}' is not allowed.`,
        };
      });
    },
  };
}
