import type { InlineExtension, ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { EngineWorkSurface, TurnTasksUpdatedPayload } from "@harnessos/contracts";
import type { AskUserProductInteractionPort } from "@harnessos/oa-ask";
import { makeOAWebAccessInlineExtension } from "@harnessos/oa-web-access";
import type { CuratorPresenter } from "@harnessos/oa-web-access/curator-presentation";
import { getWebSearchConfigService } from "@harnessos/oa-web-access/config-service";

import type { AgentGatewayMcpFetch } from "../agentGateway/mcpInjection.ts";
import type { AgentGatewayMcpConnection } from "../agentGateway/Services/AgentGatewayCredentials.ts";
import {
  makeAgentGatewayHostExtension,
  type AgentGatewayHostExtensionHandle,
} from "./agentGatewayHostExtension.ts";
import { makeOATaskListExtension } from "./oaTaskListExtension.ts";
import { makeOAAskUserExtension } from "./oaAskUserExtension.ts";
import {
  createOAPlanModeController,
  makeOAPlanModeExtension,
  type OAPlanModeController,
} from "./oaPlanModeExtension.ts";

export interface OASessionExtensionComposition {
  readonly extensions: InlineExtension[];
  readonly todoExtension?: InlineExtension;
  readonly host?: AgentGatewayHostExtensionHandle;
  readonly webAccess: InlineExtension;
  readonly askUserExtension?: InlineExtension;
  readonly planModeController: OAPlanModeController;
}

/** Explicit product wiring only; user and third-party Extensions stay in Pi's ResourceLoader. */
export function buildOASessionExtensions(input: {
  readonly agentDir: string;
  readonly workSurface?: EngineWorkSurface;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly gatewayConnection?: AgentGatewayMcpConnection;
  readonly gatewayFetch?: AgentGatewayMcpFetch;
  readonly curatorPresenter?: CuratorPresenter;
  readonly onTasksUpdated?: (input: {
    readonly toolCallId: string;
    readonly payload: TurnTasksUpdatedPayload;
  }) => void;
  readonly askUserInteraction?: AskUserProductInteractionPort;
}): OASessionExtensionComposition {
  const planModeController = createOAPlanModeController();
  const planModeExtension = makeOAPlanModeExtension(planModeController);
  const webAccess = makeOAWebAccessInlineExtension({
    configService: getWebSearchConfigService(input.agentDir),
    ...(input.curatorPresenter === undefined ? {} : { curatorPresenter: input.curatorPresenter }),
  });
  const todoExtension =
    input.workSurface !== undefined && input.onTasksUpdated !== undefined
      ? makeOATaskListExtension({
          defineTool: input.defineTool,
          onTasksUpdated: input.onTasksUpdated,
        })
      : undefined;
  const host =
    input.gatewayConnection === undefined
      ? undefined
      : makeAgentGatewayHostExtension({
          connection: input.gatewayConnection,
          defineTool: input.defineTool,
          ...(input.gatewayFetch === undefined ? {} : { fetch: input.gatewayFetch }),
        });
  const askUserExtension =
    input.askUserInteraction === undefined
      ? undefined
      : makeOAAskUserExtension({
          defineTool: input.defineTool,
          interaction: input.askUserInteraction,
        });
  return {
    extensions: [
      planModeExtension,
      webAccess,
      ...(todoExtension === undefined ? [] : [todoExtension]),
      ...(askUserExtension === undefined ? [] : [askUserExtension]),
      ...(host === undefined ? [] : [host.extension]),
    ],
    ...(todoExtension === undefined ? {} : { todoExtension }),
    ...(host === undefined ? {} : { host }),
    ...(askUserExtension === undefined ? {} : { askUserExtension }),
    webAccess,
    planModeController,
  };
}
