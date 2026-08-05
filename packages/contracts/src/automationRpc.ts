import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import {
  AutomationArchiveRunInput,
  AutomationCancelRunInput,
  AutomationCancelRunResult,
  AutomationCreateInput,
  AutomationDefinition,
  AutomationDeleteInput,
  AutomationGetMemoryInput,
  AutomationListInput,
  AutomationListResult,
  AutomationMarkRunReadInput,
  AutomationMemory,
  AutomationResolveProposalInput,
  AutomationResolveProposalResult,
  AutomationRunActionResult,
  AutomationRunNowInput,
  AutomationRunNowResult,
  AutomationStreamEvent,
  AutomationUpdateInput,
} from "./automation";
import { WsRpcError } from "./rpc";

/** Product-owned Automation management transport. These are not Engine commands. */
export const AUTOMATION_RPC_METHODS = {
  list: "automation.list",
  getMemory: "automation.getMemory",
  create: "automation.create",
  update: "automation.update",
  delete: "automation.delete",
  runNow: "automation.runNow",
  cancelRun: "automation.cancelRun",
  markRunRead: "automation.markRunRead",
  archiveRun: "automation.archiveRun",
  resolveProposal: "automation.resolveProposal",
  subscribeEvents: "automation.subscribe",
} as const;

export const AutomationRpcGroup = RpcGroup.make(
  Rpc.make(AUTOMATION_RPC_METHODS.list, {
    payload: AutomationListInput,
    success: AutomationListResult,
    error: WsRpcError,
  }),
  Rpc.make(AUTOMATION_RPC_METHODS.getMemory, {
    payload: AutomationGetMemoryInput,
    success: Schema.NullOr(AutomationMemory),
    error: WsRpcError,
  }),
  Rpc.make(AUTOMATION_RPC_METHODS.create, {
    payload: AutomationCreateInput,
    success: AutomationDefinition,
    error: WsRpcError,
  }),
  Rpc.make(AUTOMATION_RPC_METHODS.update, {
    payload: AutomationUpdateInput,
    success: AutomationDefinition,
    error: WsRpcError,
  }),
  Rpc.make(AUTOMATION_RPC_METHODS.delete, {
    payload: AutomationDeleteInput,
    success: Schema.Void,
    error: WsRpcError,
  }),
  Rpc.make(AUTOMATION_RPC_METHODS.runNow, {
    payload: AutomationRunNowInput,
    success: AutomationRunNowResult,
    error: WsRpcError,
  }),
  Rpc.make(AUTOMATION_RPC_METHODS.cancelRun, {
    payload: AutomationCancelRunInput,
    success: AutomationCancelRunResult,
    error: WsRpcError,
  }),
  Rpc.make(AUTOMATION_RPC_METHODS.markRunRead, {
    payload: AutomationMarkRunReadInput,
    success: AutomationRunActionResult,
    error: WsRpcError,
  }),
  Rpc.make(AUTOMATION_RPC_METHODS.archiveRun, {
    payload: AutomationArchiveRunInput,
    success: AutomationRunActionResult,
    error: WsRpcError,
  }),
  Rpc.make(AUTOMATION_RPC_METHODS.resolveProposal, {
    payload: AutomationResolveProposalInput,
    success: AutomationResolveProposalResult,
    error: WsRpcError,
  }),
  Rpc.make(AUTOMATION_RPC_METHODS.subscribeEvents, {
    payload: Schema.Struct({}),
    success: AutomationStreamEvent,
    error: WsRpcError,
    stream: true,
  }),
);
