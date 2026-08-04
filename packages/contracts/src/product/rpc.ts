import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import { WsFeatureRpcGroup as ExistingFeatureRpcGroup, WsRpcError } from "../rpc";
import {
  ProductConversationSnapshot,
  ProductControlRunInput,
  ProductControlRunResult,
  ProductCreateConversationInput,
  ProductDeleteQueueItemInput,
  ProductFactBatch,
  ProductGetConversationInput,
  ProductPutQueueItemInput,
  ProductQueueItem,
  ProductReadFactsInput,
  ProductReorderQueueInput,
  ProductShellSnapshot,
  ProductSubmitQueueItemInput,
  ProductSubmitResult,
} from "./state";

export const PRODUCT_RPC_METHODS = {
  createConversation: "product.conversation.create",
  getShellSnapshot: "product.shell.snapshot",
  getConversationSnapshot: "product.conversation.snapshot",
  putQueueItem: "product.queue.put",
  reorderQueue: "product.queue.reorder",
  deleteQueueItem: "product.queue.delete",
  submitQueueItem: "product.queue.submit",
  controlRun: "product.run.control",
  readFacts: "product.facts.read",
} as const;

export const ProductCreateConversationRpc = Rpc.make(PRODUCT_RPC_METHODS.createConversation, {
  payload: ProductCreateConversationInput,
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
  ProductCreateConversationRpc,
  ProductGetShellSnapshotRpc,
  ProductGetConversationSnapshotRpc,
  ProductPutQueueItemRpc,
  ProductReorderQueueRpc,
  ProductDeleteQueueItemRpc,
  ProductSubmitQueueItemRpc,
  ProductControlRunRpc,
  ProductReadFactsRpc,
);

/** First-journey cutover extends the moved transport without changing donor command semantics. */
export const ProductWsFeatureRpcGroup = ExistingFeatureRpcGroup.merge(ProductRpcGroup);
