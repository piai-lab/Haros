import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import { SystemRpcGroup, WsRpcError } from "../rpc";
import { AutomationRpcGroup } from "../automationRpc";
import {
  ProductArchiveConversationInput,
  ProductAddConversationGroupsInput,
  ProductAddEntryMarkerInput,
  ProductAddEntryPinInput,
  ProductConversationSnapshot,
  ProductControlRunInput,
  ProductControlRunResult,
  ProductCreateConversationInput,
  ProductCreateGroupInput,
  ProductCreateWorkspaceInput,
  ProductDeleteConversationInput,
  ProductDeleteGroupInput,
  ProductDeleteGroupResult,
  ProductDeleteConversationResult,
  ProductDeleteWorkspaceInput,
  ProductDeleteWorkspaceResult,
  ProductDeleteQueueItemInput,
  ProductFactBatch,
  ProductGetConversationInput,
  ProductGroupMembershipResult,
  ProductGroupSummary,
  ProductPutQueueItemInput,
  ProductQueueItem,
  ProductReadFactsInput,
  ProductRemoveEntryMarkerInput,
  ProductRemoveEntryPinInput,
  ProductReorderGroupsInput,
  ProductReorderQueueInput,
  ProductRestoreConversationInput,
  ProductSetConversationBoardStateInput,
  ProductSetConversationGroupsInput,
  ProductSetConversationPinnedInput,
  ProductSetEntryMarkerDoneInput,
  ProductSetEntryMarkerLabelInput,
  ProductSetEntryPinDoneInput,
  ProductSetEntryPinLabelInput,
  ProductSetWorkspacePinnedInput,
  ProductShellSnapshot,
  ProductSubmitQueueItemInput,
  ProductSubmitResult,
  ProductUpdateConversationTitleInput,
  ProductUpdateConversationNotesInput,
  ProductUpdateGroupInput,
  ProductUpdateWorkspaceRunCommandInput,
  ProductUpdateWorkspaceTitleInput,
  ProductWorkspaceSummary,
} from "./state";

export const PRODUCT_RPC_METHODS = {
  createWorkspace: "product.workspace.create",
  updateWorkspaceTitle: "product.workspace.title.update",
  setWorkspacePinned: "product.workspace.pinned.set",
  updateWorkspaceRunCommand: "product.workspace.run-command.update",
  deleteWorkspace: "product.workspace.delete",
  createGroup: "product.group.create",
  updateGroup: "product.group.update",
  reorderGroups: "product.group.reorder",
  deleteGroup: "product.group.delete",
  setConversationGroups: "product.group.conversations.set",
  addConversationGroups: "product.group.conversations.add",
  createConversation: "product.conversation.create",
  updateConversationTitle: "product.conversation.title.update",
  archiveConversation: "product.conversation.archive",
  restoreConversation: "product.conversation.restore",
  deleteConversation: "product.conversation.delete",
  setConversationPinned: "product.conversation.pinned.set",
  updateConversationNotes: "product.conversation.notes.update",
  setConversationBoardState: "product.conversation.board-state.set",
  addEntryPin: "product.entry.pin.add",
  removeEntryPin: "product.entry.pin.remove",
  setEntryPinDone: "product.entry.pin.done.set",
  setEntryPinLabel: "product.entry.pin.label.set",
  addEntryMarker: "product.entry.marker.add",
  removeEntryMarker: "product.entry.marker.remove",
  setEntryMarkerDone: "product.entry.marker.done.set",
  setEntryMarkerLabel: "product.entry.marker.label.set",
  getShellSnapshot: "product.shell.snapshot",
  getConversationSnapshot: "product.conversation.snapshot",
  putQueueItem: "product.queue.put",
  reorderQueue: "product.queue.reorder",
  deleteQueueItem: "product.queue.delete",
  submitQueueItem: "product.queue.submit",
  controlRun: "product.run.control",
  readFacts: "product.facts.read",
} as const;

export const ProductCreateWorkspaceRpc = Rpc.make(PRODUCT_RPC_METHODS.createWorkspace, {
  payload: ProductCreateWorkspaceInput,
  success: ProductWorkspaceSummary,
  error: WsRpcError,
});
export const ProductUpdateWorkspaceTitleRpc = Rpc.make(
  PRODUCT_RPC_METHODS.updateWorkspaceTitle,
  {
    payload: ProductUpdateWorkspaceTitleInput,
    success: ProductWorkspaceSummary,
    error: WsRpcError,
  },
);
export const ProductSetWorkspacePinnedRpc = Rpc.make(PRODUCT_RPC_METHODS.setWorkspacePinned, {
  payload: ProductSetWorkspacePinnedInput,
  success: ProductWorkspaceSummary,
  error: WsRpcError,
});
export const ProductUpdateWorkspaceRunCommandRpc = Rpc.make(
  PRODUCT_RPC_METHODS.updateWorkspaceRunCommand,
  {
    payload: ProductUpdateWorkspaceRunCommandInput,
    success: ProductWorkspaceSummary,
    error: WsRpcError,
  },
);
export const ProductDeleteWorkspaceRpc = Rpc.make(PRODUCT_RPC_METHODS.deleteWorkspace, {
  payload: ProductDeleteWorkspaceInput,
  success: ProductDeleteWorkspaceResult,
  error: WsRpcError,
});

export const ProductCreateGroupRpc = Rpc.make(PRODUCT_RPC_METHODS.createGroup, {
  payload: ProductCreateGroupInput,
  success: ProductGroupSummary,
  error: WsRpcError,
});
export const ProductUpdateGroupRpc = Rpc.make(PRODUCT_RPC_METHODS.updateGroup, {
  payload: ProductUpdateGroupInput,
  success: ProductGroupSummary,
  error: WsRpcError,
});
export const ProductReorderGroupsRpc = Rpc.make(PRODUCT_RPC_METHODS.reorderGroups, {
  payload: ProductReorderGroupsInput,
  success: Schema.Array(ProductGroupSummary),
  error: WsRpcError,
});
export const ProductDeleteGroupRpc = Rpc.make(PRODUCT_RPC_METHODS.deleteGroup, {
  payload: ProductDeleteGroupInput,
  success: ProductDeleteGroupResult,
  error: WsRpcError,
});
export const ProductSetConversationGroupsRpc = Rpc.make(
  PRODUCT_RPC_METHODS.setConversationGroups,
  {
    payload: ProductSetConversationGroupsInput,
    success: ProductGroupMembershipResult,
    error: WsRpcError,
  },
);
export const ProductAddConversationGroupsRpc = Rpc.make(
  PRODUCT_RPC_METHODS.addConversationGroups,
  {
    payload: ProductAddConversationGroupsInput,
    success: ProductGroupMembershipResult,
    error: WsRpcError,
  },
);

export const ProductCreateConversationRpc = Rpc.make(PRODUCT_RPC_METHODS.createConversation, {
  payload: ProductCreateConversationInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductUpdateConversationTitleRpc = Rpc.make(
  PRODUCT_RPC_METHODS.updateConversationTitle,
  {
    payload: ProductUpdateConversationTitleInput,
    success: ProductConversationSnapshot,
    error: WsRpcError,
  },
);
export const ProductArchiveConversationRpc = Rpc.make(PRODUCT_RPC_METHODS.archiveConversation, {
  payload: ProductArchiveConversationInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductRestoreConversationRpc = Rpc.make(PRODUCT_RPC_METHODS.restoreConversation, {
  payload: ProductRestoreConversationInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductDeleteConversationRpc = Rpc.make(PRODUCT_RPC_METHODS.deleteConversation, {
  payload: ProductDeleteConversationInput,
  success: ProductDeleteConversationResult,
  error: WsRpcError,
});
export const ProductSetConversationPinnedRpc = Rpc.make(
  PRODUCT_RPC_METHODS.setConversationPinned,
  {
    payload: ProductSetConversationPinnedInput,
    success: ProductConversationSnapshot,
    error: WsRpcError,
  },
);
export const ProductUpdateConversationNotesRpc = Rpc.make(
  PRODUCT_RPC_METHODS.updateConversationNotes,
  {
    payload: ProductUpdateConversationNotesInput,
    success: ProductConversationSnapshot,
    error: WsRpcError,
  },
);
export const ProductSetConversationBoardStateRpc = Rpc.make(
  PRODUCT_RPC_METHODS.setConversationBoardState,
  {
    payload: ProductSetConversationBoardStateInput,
    success: ProductConversationSnapshot,
    error: WsRpcError,
  },
);
export const ProductAddEntryPinRpc = Rpc.make(PRODUCT_RPC_METHODS.addEntryPin, {
  payload: ProductAddEntryPinInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductRemoveEntryPinRpc = Rpc.make(PRODUCT_RPC_METHODS.removeEntryPin, {
  payload: ProductRemoveEntryPinInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductSetEntryPinDoneRpc = Rpc.make(PRODUCT_RPC_METHODS.setEntryPinDone, {
  payload: ProductSetEntryPinDoneInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductSetEntryPinLabelRpc = Rpc.make(PRODUCT_RPC_METHODS.setEntryPinLabel, {
  payload: ProductSetEntryPinLabelInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductAddEntryMarkerRpc = Rpc.make(PRODUCT_RPC_METHODS.addEntryMarker, {
  payload: ProductAddEntryMarkerInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductRemoveEntryMarkerRpc = Rpc.make(PRODUCT_RPC_METHODS.removeEntryMarker, {
  payload: ProductRemoveEntryMarkerInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductSetEntryMarkerDoneRpc = Rpc.make(PRODUCT_RPC_METHODS.setEntryMarkerDone, {
  payload: ProductSetEntryMarkerDoneInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductSetEntryMarkerLabelRpc = Rpc.make(PRODUCT_RPC_METHODS.setEntryMarkerLabel, {
  payload: ProductSetEntryMarkerLabelInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductGetShellSnapshotRpc = Rpc.make(PRODUCT_RPC_METHODS.getShellSnapshot, {
  payload: Schema.Struct({}),
  success: ProductShellSnapshot,
  error: WsRpcError,
});
export const ProductGetConversationSnapshotRpc = Rpc.make(
  PRODUCT_RPC_METHODS.getConversationSnapshot,
  {
    payload: ProductGetConversationInput,
    success: ProductConversationSnapshot,
    error: WsRpcError,
  },
);
export const ProductPutQueueItemRpc = Rpc.make(PRODUCT_RPC_METHODS.putQueueItem, {
  payload: ProductPutQueueItemInput,
  success: ProductQueueItem,
  error: WsRpcError,
});
export const ProductReorderQueueRpc = Rpc.make(PRODUCT_RPC_METHODS.reorderQueue, {
  payload: ProductReorderQueueInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductDeleteQueueItemRpc = Rpc.make(PRODUCT_RPC_METHODS.deleteQueueItem, {
  payload: ProductDeleteQueueItemInput,
  success: ProductConversationSnapshot,
  error: WsRpcError,
});
export const ProductSubmitQueueItemRpc = Rpc.make(PRODUCT_RPC_METHODS.submitQueueItem, {
  payload: ProductSubmitQueueItemInput,
  success: ProductSubmitResult,
  error: WsRpcError,
});
export const ProductControlRunRpc = Rpc.make(PRODUCT_RPC_METHODS.controlRun, {
  payload: ProductControlRunInput,
  success: ProductControlRunResult,
  error: WsRpcError,
});
export const ProductReadFactsRpc = Rpc.make(PRODUCT_RPC_METHODS.readFacts, {
  payload: ProductReadFactsInput,
  success: ProductFactBatch,
  error: WsRpcError,
});

export const ProductRpcGroup = RpcGroup.make(
  ProductCreateWorkspaceRpc,
  ProductUpdateWorkspaceTitleRpc,
  ProductSetWorkspacePinnedRpc,
  ProductUpdateWorkspaceRunCommandRpc,
  ProductDeleteWorkspaceRpc,
  ProductCreateGroupRpc,
  ProductUpdateGroupRpc,
  ProductReorderGroupsRpc,
  ProductDeleteGroupRpc,
  ProductSetConversationGroupsRpc,
  ProductAddConversationGroupsRpc,
  ProductCreateConversationRpc,
  ProductUpdateConversationTitleRpc,
  ProductArchiveConversationRpc,
  ProductRestoreConversationRpc,
  ProductDeleteConversationRpc,
  ProductSetConversationPinnedRpc,
  ProductUpdateConversationNotesRpc,
  ProductSetConversationBoardStateRpc,
  ProductAddEntryPinRpc,
  ProductRemoveEntryPinRpc,
  ProductSetEntryPinDoneRpc,
  ProductSetEntryPinLabelRpc,
  ProductAddEntryMarkerRpc,
  ProductRemoveEntryMarkerRpc,
  ProductSetEntryMarkerDoneRpc,
  ProductSetEntryMarkerLabelRpc,
  ProductGetShellSnapshotRpc,
  ProductGetConversationSnapshotRpc,
  ProductPutQueueItemRpc,
  ProductReorderQueueRpc,
  ProductDeleteQueueItemRpc,
  ProductSubmitQueueItemRpc,
  ProductControlRunRpc,
  ProductReadFactsRpc,
);

/** Product facts plus concrete system capabilities; no Engine command bus. */
export const ProductWsFeatureRpcGroup = SystemRpcGroup.merge(ProductRpcGroup).merge(
  AutomationRpcGroup,
);
