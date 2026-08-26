import type { InlineExtension, ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { ProviderWorkSurface, TurnTasksUpdatedPayload } from "@omnimind/contracts";
import type { AskUserProductInteractionPort } from "@omnimind/om-ask";
import { makeOmniMindWebAccessInlineExtension } from "@omnimind/om-web-access";
import type { CuratorPresenter } from "@omnimind/om-web-access/curator-presentation";
import { getWebSearchConfigService } from "@omnimind/om-web-access/config-service";

import type { AgentGatewayMcpFetch } from "../agentGateway/mcpInjection.ts";
import type { AgentGatewayMcpConnection } from "../agentGateway/Services/AgentGatewayCredentials.ts";
import {
  makeAgentGatewayHostExtension,
  type AgentGatewayHostExtensionHandle,
} from "./agentGatewayHostExtension.ts";
import { makeOmniMindTaskListExtension } from "./omnimindTaskListExtension.ts";
import { makeOmniMindAskUserExtension } from "./omnimindAskUserExtension.ts";
import {
  createOmniMindPlanModeController,
  makeOmniMindPlanModeExtension,
  type OmniMindPlanModeController,
} from "./omnimindPlanModeExtension.ts";

export interface OmniMindSessionExtensionComposition {
  readonly extensions: InlineExtension[];
  readonly todoExtension?: InlineExtension;
  readonly host?: AgentGatewayHostExtensionHandle;
  readonly webAccess: InlineExtension;
  readonly askUserExtension?: InlineExtension;
  readonly planModeController: OmniMindPlanModeController;
}

/** Explicit product wiring only; user and third-party Extensions stay in Pi's ResourceLoader. */
export function buildOmniMindSessionExtensions(input: {
  readonly agentDir: string;
  readonly workSurface?: ProviderWorkSurface;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly gatewayConnection?: AgentGatewayMcpConnection;
  readonly gatewayFetch?: AgentGatewayMcpFetch;
  readonly curatorPresenter?: CuratorPresenter;
  readonly onTasksUpdated?: (input: {
    readonly toolCallId: string;
    readonly payload: TurnTasksUpdatedPayload;
  }) => void;
  readonly askUserInteraction?: AskUserProductInteractionPort;
}): OmniMindSessionExtensionComposition {
  const planModeController = createOmniMindPlanModeController();
  const planModeExtension = makeOmniMindPlanModeExtension(planModeController);
  const webAccess = makeOmniMindWebAccessInlineExtension({
    configService: getWebSearchConfigService(input.agentDir),
    ...(input.curatorPresenter === undefined ? {} : { curatorPresenter: input.curatorPresenter }),
  });
  const todoExtension =
    input.workSurface !== undefined && input.onTasksUpdated !== undefined
      ? makeOmniMindTaskListExtension({
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
      : makeOmniMindAskUserExtension({
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
