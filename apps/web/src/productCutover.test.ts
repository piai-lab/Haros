import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath: string) => fs.readFileSync(path.join(sourceRoot, relativePath), "utf8");

describe("Product Conversation cutover reachability", () => {
  it("routes new draft submission through Product only while retaining donor physical debt", () => {
    const chatView = read("components/ChatView.tsx");
    const start = chatView.indexOf("const sendProductConversation = async");
    const end = chatView.indexOf("const onSend = async", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const productJourney = chatView.slice(start, end);
    expect(productJourney).toContain("ensureProductConversationRetained();");
    expect(productJourney).toContain("productApi.createConversation");
    expect(productJourney).toContain("confirmProductQueueOwnershipBeforeDraftClear");
    expect(productJourney).toContain("productApi.putQueueItem");
    expect(productJourney).toContain("productApi.submitQueueItem");
    expect(productJourney).not.toMatch(
      /readNativeApi|resolveComposerAutomationRequest|resolveProviderSendAvailabilityWithRefresh|maybeResolveBrowserPromptAttachment|thread\.turn\.start|promoteThreadCreate/u,
    );
    const genericJourney = chatView.slice(end);
    const productGuard = genericJourney.indexOf("if (isProductConversationThread)");
    const legacyApi = genericJourney.indexOf("const api = readNativeApi();");
    expect(productGuard).toBeGreaterThanOrEqual(0);
    expect(legacyApi).toBeGreaterThan(productGuard);
    expect(genericJourney).toContain('type: "thread.turn.start"');
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

  it("retains a shell-known Product conversation before its first detail request", () => {
    const chatView = read("components/ChatView.tsx");
    const effectStart = chatView.indexOf("if (!isKnownProductConversation) return;");
    const effectEnd = chatView.indexOf("const markThreadVisited", effectStart);
    const detailLifecycle = chatView.slice(effectStart, effectEnd);
    const retain = detailLifecycle.indexOf("ensureProductConversationRetained();");
    const fetch = detailLifecycle.indexOf(".getConversationSnapshot({");
    const release = detailLifecycle.indexOf("releaseProductConversation(productConversationId)");
    expect(effectStart).toBeGreaterThan(0);
    expect(retain).toBeGreaterThanOrEqual(0);
    expect(fetch).toBeGreaterThan(retain);
    expect(release).toBeGreaterThan(fetch);
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
    expect(chatView).toContain("ProductConversationNotice");
    expect(chatView).toContain("presentProductConversationState");
    expect(chatView).not.toContain("setThreadError(threadId, productConversationError)");
  });

  it("keeps missing Chat deep links in Product without donor recovery or surface loss", () => {
    const route = read("routes/_chat.$threadId.tsx");
    const productBoundary = route.indexOf("if (isMissingProductChatRoute)");
    const donorRecovery = route.indexOf("shouldStartMissingThreadRouteRecovery", productBoundary);
    expect(productBoundary).toBeGreaterThan(0);
    expect(donorRecovery).toBeGreaterThan(productBoundary);
    expect(route.slice(productBoundary, donorRecovery)).toContain("return;");
    expect(route).toContain("ProductConversationRouteState");
    expect(route).toContain('search: { surface: "chat" }');
    expect(route).toContain("conversationMissingDescription");
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

  it("keeps Product Chat search source-neutral and routes it through the Chat surface", () => {
    const sidebar = read("components/Sidebar.tsx");
    const searchController = sidebar.indexOf("function SidebarSearchPaletteController");
    const productProjection = sidebar.indexOf(
      "const productThreads: SidebarSearchThread[]",
      searchController,
    );
    const donorProjection = sidebar.indexOf(
      "const donorThreads = sidebarDisplayThreads.flatMap",
      productProjection,
    );
    const productSearchFacts = sidebar.slice(productProjection, donorProjection);
    expect(productProjection).toBeGreaterThan(searchController);
    expect(productSearchFacts).toContain("provider: null");
    expect(productSearchFacts).toContain("messages: []");
    expect(productSearchFacts).toContain('if (props.surface === "chat")');
    expect(productSearchFacts).toContain("localChatDraftThreads");
    expect(sidebar.slice(donorProjection)).toContain("!agentThreadIds.has(threadSummary.id)");

    const openThread = sidebar.indexOf("onOpenThread={(threadId) => {");
    const donorActivation = sidebar.indexOf("activateThreadFromSidebarIntent", openThread);
    const productRouting = sidebar.slice(openThread, donorActivation);
    expect(openThread).toBeGreaterThan(0);
    expect(productRouting).toContain("resolveSidebarSearchThreadActivation(surface)");
    expect(productRouting).not.toContain("productChatConversations.some");
    expect(productRouting).toContain('surface: "chat"');
    expect(productRouting).toContain("splitViewId: undefined");
    expect(productRouting).toContain("return;");
  });

  it("keeps retained Conversation identity independent from the globally focused route", () => {
    const chatView = read("components/ChatView.tsx");
    const retainedSurface = read("components/chat/ChatThreadSurfacePrimitives.tsx");
    const terminalController = read("components/chat/useChatTerminalController.ts");

    expect(chatView).not.toContain("useDiffRouteSearch");
    expect(chatView).not.toContain("useFocusedChatContext");
    expect(chatView).toContain("useHandleNewThreadForFocusedContext");
    expect(chatView).toContain("routeThreadId: threadId");
    expect(retainedSurface).toContain("isFocusedPane={props.isFocusedPane}");
    expect(retainedSurface).not.toContain("isFocusedPane={props.isFocusedPane && active}");
    expect(retainedSurface).toContain('data-active-conversation={active ? "true" : undefined}');
    expect(retainedSurface).toContain("aria-hidden={active ? undefined : true}");
    expect(retainedSurface).toContain("inert={active ? undefined : true}");
    expect(terminalController).toContain("if (!isInteractionActive()) return;");
  });
});
