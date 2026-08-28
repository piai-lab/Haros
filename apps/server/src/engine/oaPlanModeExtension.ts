import type { InlineExtension } from "@earendil-works/pi-coding-agent";
import { ASK_USER_TOOL_NAME } from "@harnessos/oa-ask";
import { OA_WEB_ACCESS_PLAN_TOOL_NAMES } from "@harnessos/oa-web-access";
import type { TurnId } from "@harnessos/contracts";

import { HARNESSOS_TASK_LIST_TOOL_NAME } from "./oaTaskListExtension.ts";

export const HARNESSOS_PLAN_MODE_EXTENSION_NAME = "harnessos-agent-plan-guard";

const PLAN_ALLOWED_TOOL_NAMES = new Set([
  "read",
  "grep",
  "find",
  "ls",
  ASK_USER_TOOL_NAME,
  HARNESSOS_TASK_LIST_TOOL_NAME,
  ...OA_WEB_ACCESS_PLAN_TOOL_NAMES,
]);

export interface OAPlanModeController {
  readonly activeTurnId: () => TurnId | undefined;
  readonly activate: (turnId: TurnId) => void;
  readonly deactivate: (turnId?: TurnId) => void;
}

export function createOAPlanModeController(): OAPlanModeController {
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

export function makeOAPlanModeExtension(controller: OAPlanModeController): InlineExtension {
  return {
    name: HARNESSOS_PLAN_MODE_EXTENSION_NAME,
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
