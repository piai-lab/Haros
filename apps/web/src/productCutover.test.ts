import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath: string) => fs.readFileSync(path.join(sourceRoot, relativePath), "utf8");

describe("Product Conversation cutover reachability", () => {
  it("routes new draft submission through Product only while retaining donor physical debt", () => {
    const chatView = read("components/ChatView.tsx");
    const start = chatView.indexOf("PRODUCT_CONVERSATION_CUTOVER_START");
    const end = chatView.indexOf("PRODUCT_CONVERSATION_CUTOVER_END");
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const productJourney = chatView.slice(start, end);
    expect(chatView).toContain(
      "const shouldUseProductConversation = isLocalDraftThread || productReadModel !== undefined",
    );
    expect(productJourney).toContain("if (shouldUseProductConversation)");
    expect(productJourney).toContain("ensureProductConversationRetained();");
    expect(productJourney).toContain("if (baseBranchForWorktree !== null)");
    expect(productJourney).toContain("productApi.createConversation");
    expect(productJourney).toContain("confirmProductQueueOwnershipBeforeDraftClear");
    expect(productJourney).toContain("productApi.putQueueItem");
    expect(productJourney).toContain("productApi.submitQueueItem");
    expect(productJourney).not.toContain("thread.turn.start");
    expect(productJourney).not.toContain("promoteThreadCreate");
    expect(chatView.slice(end)).toContain('type: "thread.turn.start"');
  });

  it("maps the durable Product Queue into the approved mother and typed controls", () => {
    const chatView = read("components/ChatView.tsx");
    const presenter = read("productReadModel.ts");
    expect(presenter).toContain("presentProductConversationQueue");
    expect(chatView).toContain("queuedTurns={visibleQueuedComposerTurns}");
    expect(chatView).toContain(".deleteQueueItem({");
    expect(chatView).toContain(".reorderQueue({");
    expect(chatView).toContain("expectedRevision: productQueueEdit?.revision ?? null");
    expect(chatView).not.toContain("enqueueQueuedComposerTurn(productConversationId");
  });

  it("fails closed for registered Product ids before the legacy transport request", () => {
    const nativeApi = read("wsNativeApi.ts");
    expect(nativeApi).toContain("productConversationIds.add");
    const dispatchStart = nativeApi.indexOf("dispatchCommand: (command) => {");
    const dispatchEnd = nativeApi.indexOf("importThread:", dispatchStart);
    const dispatch = nativeApi.slice(dispatchStart, dispatchEnd);
    const guard = dispatch.indexOf("rejectLegacyProductConversationRoute(command)");
    const transport = dispatch.indexOf(
      "transport.request(ORCHESTRATION_WS_METHODS.dispatchCommand",
    );
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(transport).toBeGreaterThan(guard);
    expect(nativeApi).toContain("Promise.reject");
  });

  it("wires the authoritative Product Store guard into every legacy Service writer", () => {
    const serviceRpc = read("../../service/src/wsRpc.ts");
    expect(
      serviceRpc.match(/assertLegacyConversationRouteAvailable\(/gu)?.length,
    ).toBeGreaterThanOrEqual(3);
    for (const method of ["dispatchCommand", "importThread", "reconcileProviderDelivery"]) {
      const handler = serviceRpc.indexOf(`[ORCHESTRATION_WS_METHODS.${method}]`);
      expect(handler).toBeGreaterThan(0);
      expect(serviceRpc.indexOf("assertLegacyConversationRouteAvailable", handler)).toBeGreaterThan(
        handler,
      );
    }
  });

  it("preserves the approved mother and non-Product EventRouter responsibilities", () => {
    const root = read("routes/__root.tsx");
    const chatRoute = read("routes/_chat.tsx");
    const chatView = read("components/ChatView.tsx");
    expect(root).toContain("<EventRouter />");
    expect(root).toContain("<ProductProjectionCoordinator />");
    expect(root).toContain("<DesktopProjectBootstrap />");
    expect(root).toContain("resolveSplitViewThreadIds");
    expect(root).toContain("!isProductConversationId(threadId)");
    expect(root).toContain("productDraftThreadsById[threadId] === undefined");
    expect(root).toContain("isProductConversationId(String(event.aggregateId))");
    expect(chatRoute).toContain("<ThreadSidebar />");
    expect(chatView).toContain("ChatTranscriptPane");
    expect(chatView).toContain('label: "Split chat"');
    expect(chatView).toContain("TerminalWorkspaceTabs");
    expect(chatView).toContain("if (productReadModel !== undefined) {");
    expect(chatView).toContain("setThreadError(threadId, productConversationError)");
  });

  it("keeps Product code free of raw execution imports and generic payload renderers", () => {
    const productFiles = [
      "productReadModel.ts",
      "productProjectionCoordinator.tsx",
      "store/productStore.ts",
      "../../service/src/product/ProductControlPlane.ts",
      "../../../packages/contracts/src/product/state.ts",
      "../../../packages/contracts/src/product/rpc.ts",
    ];
    for (const productFile of productFiles) {
      const source = read(productFile);
      const moduleSpecifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
        (match) => match[1] ?? "",
      );
      expect(moduleSpecifiers.join("\n")).not.toMatch(
        /providerRuntime|agentclientprotocol|pi-(?:agent|ai|coding)|orchestration\/Layers/iu,
      );
      expect(source).not.toMatch(/payload\s*:\s*(?:unknown|Schema\.Unknown)/u);
    }
    const presenter = read("productReadModel.ts");
    expect(presenter).toContain("ProductConversationReadModel");
    expect(presenter).not.toContain("useStore");
    expect(presenter).not.toContain("NativeApi");
  });
});
