import {
  PRODUCT_MAX_FACTS_PER_BATCH,
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
} from "@omnimind/contracts";
import { useEffect } from "react";

import { useProductStore } from "./store/productStore";
import { readProductNativeApi } from "./wsNativeApi";
import { addWsTransportStateListener } from "./wsTransportEvents";

const PRODUCT_FACT_CATCHUP_INTERVAL_MS = 1_500;

async function refreshProductSnapshots(conversationIds: ReadonlyArray<string>): Promise<void> {
  const api = readProductNativeApi();
  const store = useProductStore.getState();
  store.setShellSnapshot(await api.getShellSnapshot());
  await Promise.all(
    conversationIds.map(async (rawConversationId) => {
      const conversationId = ProductConversationId.makeUnsafe(rawConversationId);
      try {
        store.setConversationSnapshot(
          await api.getConversationSnapshot({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId,
          }),
        );
      } catch {
        // Keep the last typed detail until a tombstone or successful resnapshot replaces it.
      }
    }),
  );
}

async function catchUpProductFacts(): Promise<void> {
  const api = readProductNativeApi();
  let store = useProductStore.getState();
  const shellBatch = await api.readFacts({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    scope: { kind: "shell" },
    afterSequence: store.shellSequence,
    limit: PRODUCT_MAX_FACTS_PER_BATCH,
  });
  if (store.applyFactBatch(shellBatch) === "resnapshot") {
    store.setShellSnapshot(await api.getShellSnapshot());
  }

  store = useProductStore.getState();
  const activeConversationIds = Object.keys(store.detailRetainCountByConversation);
  await Promise.all(
    activeConversationIds.map(async (rawConversationId) => {
      const conversationId = ProductConversationId.makeUnsafe(rawConversationId);
      const current = useProductStore.getState();
      try {
        const batch = await api.readFacts({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          scope: { kind: "conversation", conversationId },
          afterSequence: current.detailSequenceByConversation[conversationId] ?? 0,
          limit: PRODUCT_MAX_FACTS_PER_BATCH,
        });
        if (useProductStore.getState().applyFactBatch(batch) === "resnapshot") {
          useProductStore.getState().setConversationSnapshot(
            await api.getConversationSnapshot({
              protocolVersion: PRODUCT_PROTOCOL_VERSION,
              conversationId,
            }),
          );
        }
      } catch {
        // Keep the last typed detail until a tombstone or successful resnapshot replaces it.
      }
    }),
  );
}

/** One Product projection writer: background shell summaries plus active details. */
export function ProductProjectionCoordinator() {
  useEffect(() => {
    let disposed = false;
    let inFlight = false;

    const synchronize = async (resnapshot: boolean) => {
      if (disposed || inFlight) return;
      inFlight = true;
      try {
        const activeConversationIds = Object.keys(
          useProductStore.getState().detailRetainCountByConversation,
        );
        if (resnapshot) {
          await refreshProductSnapshots(activeConversationIds);
        } else {
          await catchUpProductFacts();
        }
      } catch {
        // Transport lifecycle owns reconnect. The next open event or interval retries.
      } finally {
        inFlight = false;
      }
    };

    void synchronize(true);
    const intervalId = window.setInterval(
      () => void synchronize(false),
      PRODUCT_FACT_CATCHUP_INTERVAL_MS,
    );
    const unsubscribe = addWsTransportStateListener(
      (state) => {
        if (state !== "open") return;
        useProductStore.getState().markReconnect();
        void synchronize(true);
      },
      { replayCurrent: true },
    );
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      unsubscribe();
    };
  }, []);

  return null;
}
