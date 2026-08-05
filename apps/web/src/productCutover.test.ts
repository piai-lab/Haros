import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath: string) => fs.readFileSync(path.join(sourceRoot, relativePath), "utf8");

describe("Product Conversation authority closure", () => {
  it("routes draft submission through Product without a donor execution fallback", () => {
    const chatView = read("components/ChatView.tsx");
    const start = chatView.indexOf("const sendProductConversation = async");
    const end = chatView.indexOf("const onSend = async", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const productJourney = chatView.slice(start, end);
    expect(productJourney).toContain("ensureProductConversationRetained();");
    expect(productJourney).toContain("createProductConversationWithRecovery");
    expect(productJourney).toContain("confirmProductQueueOwnershipBeforeDraftClear");
    expect(productJourney).toContain("productApi.putQueueItem");
    expect(productJourney).toContain("productApi.submitQueueItem");
    expect(productJourney).not.toMatch(
      /readNativeApi|resolveComposerAutomationRequest|resolveProviderSendAvailabilityWithRefresh|maybeResolveBrowserPromptAttachment|thread\.turn\.start|promoteThreadCreate/u,
    );
    expect(chatView).not.toContain('type: "thread.turn.start"');
    expect(chatView).not.toContain("resolveProviderSendAvailabilityWithRefresh");
  });

  it("maps the durable Product Queue into the approved mother and typed controls", () => {
    const chatView = read("components/ChatView.tsx");
    const presenter = read("productReadModel.ts");
    const queueActions = read("components/product/productQueueActions.ts");
    expect(presenter).toContain("presentProductConversationQueue");
    expect(chatView).toContain("queuedTurns={visibleQueuedComposerTurns}");
    expect(queueActions).toContain("input.api.deleteQueueItem({");
    expect(queueActions).toContain("input.api.reorderQueue({");
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

  it("exposes Product transport without a buildable legacy dispatcher", () => {
    const nativeApi = read("wsNativeApi.ts");
    expect(nativeApi).toContain("PRODUCT_RPC_METHODS.submitQueueItem");
    expect(nativeApi).toContain("PRODUCT_RPC_METHODS.controlRun");
    expect(nativeApi).not.toContain("ORCHESTRATION_WS_METHODS");
    expect(nativeApi).not.toContain("rejectLegacyProductConversationRoute");
    expect(nativeApi).not.toContain("dispatchCommand:");
  });

  it("composes Product and scoped System RPC without legacy Service writers", () => {
    const serviceRpc = read("../../service/src/wsRpc.ts");
    expect(serviceRpc).toContain("PRODUCT_RPC_METHODS.putQueueItem");
    expect(serviceRpc).toContain("PRODUCT_RPC_METHODS.submitQueueItem");
    expect(serviceRpc).toContain("SYSTEM_RPC_METHODS.ensureWorkspaceRoot");
    expect(serviceRpc).not.toContain("ORCHESTRATION_WS_METHODS");
    expect(serviceRpc).not.toContain("assertLegacyConversationRouteAvailable");
    expect(serviceRpc).not.toMatch(/\b(?:dispatchCommand|importThread|reconcileProviderDelivery)\b/u);
  });

  it("preserves the approved mother under Product and scoped system owners", () => {
    const root = read("routes/__root.tsx");
    const chatRoute = read("routes/_chat.tsx");
    const chatView = read("components/ChatView.tsx");
    expect(root).toContain("<ProductProjectionCoordinator />");
    expect(root).toContain("<SystemHealthCoordinator />");
    expect(root).toContain("<AppSnapCoordinator />");
    expect(root).toContain("<Outlet />");
    expect(root).not.toContain("<EventRouter />");
    expect(root).not.toContain("<DesktopProjectBootstrap />");
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
