import {
  AUTOMATION_RPC_METHODS,
  DEFAULT_TERMINAL_ID,
  PRODUCT_RPC_METHODS,
  SYSTEM_RPC_METHODS,
  WS_BOOTSTRAP_METHOD,
  WS_BOOTSTRAP_PATH,
  WS_FEATURE_PATH,
  WS_NEGOTIATE_HTTP_PATH,
  WsBootstrapRpcGroup,
  WsCompatibilityError,
  WsFeatureRpcGroup,
  WsRpcError,
  type ProjectDevServerEvent,
} from "@omnimind/contracts";
import { Effect, Layer, Queue, Scope, Stream } from "effect";
import { Headers, HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { RpcMiddleware, RpcSchema, RpcSerialization, RpcServer } from "effect/unstable/rpc";

import { authErrorResponse, makeEffectAuthRequest } from "./auth/effectHttp";
import { AutomationService } from "./automation/Services/AutomationService";
import {
  ServerAuth,
  type AuthError,
  type AuthRequest,
  type AuthenticatedSession,
  type ServerAuthShape,
} from "./auth/Services/ServerAuth";
import { SessionCredentialService } from "./auth/Services/SessionCredentialService";
import { ServerConfig, type ServerConfigShape } from "./config";
import {
  attachmentPrincipalForSession,
  LOCAL_LOOPBACK_ATTACHMENT_PRINCIPAL,
} from "./managedAttachmentPrincipal";
import { ProductControlPlane, ProductControlPlaneError } from "./product/ProductControlPlane";
import { DevServerSupervisor } from "./devServerSupervisor";
import { GitCore } from "./git/Services/GitCore";
import { createLocalPreviewGrant } from "./localImageFiles";
import { Open } from "./open";
import { PullRequestService } from "./pullRequests/Services/PullRequestService";
import type { PullRequestServiceShape } from "./pullRequests/Services/PullRequestService";
import { TerminalSupervisor } from "./terminal/Services/Supervisor";
import { WorkspaceEntries } from "./workspace/Services/WorkspaceEntries";
import { WorkspaceFileSystem } from "./workspace/Services/WorkspaceFileSystem";
import { WorkspacePaths } from "./workspace/Services/WorkspacePaths";
import { makeWsStreamAdmission } from "./wsStreamAdmission";
import { bufferLiveUiStream } from "./wsStreamBackpressure";
import { isLoopbackHost } from "./startupAccess";
import { makeWsRequestAdmission } from "./wsRequestAdmission";
import {
  provideWsConnectionSession,
  CurrentWsSessionRole,
  WS_CONNECTION_SESSION_HEADER,
  WsConnectionSessions,
  WsConnectionSessionsLive,
  type WsConnectionSession,
} from "./wsConnectionSessions";
import {
  negotiateWsCompatibility,
  parseWsNegotiateSearchParams,
  validateWsFeatureCompatibility,
} from "./wsCompatibility";
import {
  isTrustedAppOrigin,
  normalizeCorsOrigin,
  requiresWebSocketAuthentication,
  shouldRejectUntrustedRequestOrigin,
} from "./trustedOrigins";

class WsRequestAdmissionMiddleware extends RpcMiddleware.Service<WsRequestAdmissionMiddleware>()(
  "omnimind/WsRequestAdmissionMiddleware",
  { error: WsRpcError, requiredForClient: false },
) {}

const AdmittedWsFeatureRpcGroup = WsFeatureRpcGroup.middleware(WsRequestAdmissionMiddleware);

const SYSTEM_RPC_METHOD_SET = new Set<string>(Object.values(SYSTEM_RPC_METHODS));

const systemRpcEffect = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  message: string,
): Effect.Effect<A, WsRpcError, R> =>
  effect.pipe(
    Effect.mapError(
      (cause) =>
        new WsRpcError({
          message: cause instanceof Error ? cause.message : message,
          cause,
        }),
    ),
  );

/** Shared source for the handlers installed in the feature RpcGroup and their wire tests. */
export function makePullRequestSystemRpcHandlers(pullRequests: PullRequestServiceShape) {
  return {
    [SYSTEM_RPC_METHODS.pullRequestsList]: (
      input: Parameters<PullRequestServiceShape["list"]>[0],
    ) => systemRpcEffect(pullRequests.list(input), "Failed to list pull requests"),
    [SYSTEM_RPC_METHODS.pullRequestsReviewRequestCount]: (
      input: Parameters<PullRequestServiceShape["reviewRequestCount"]>[0],
    ) =>
      systemRpcEffect(
        pullRequests.reviewRequestCount(input),
        "Failed to count pull request reviews",
      ),
    [SYSTEM_RPC_METHODS.pullRequestsDetail]: (
      input: Parameters<PullRequestServiceShape["detail"]>[0],
    ) => systemRpcEffect(pullRequests.detail(input), "Failed to read pull request"),
    [SYSTEM_RPC_METHODS.pullRequestsDiff]: (
      input: Parameters<PullRequestServiceShape["diff"]>[0],
    ) => systemRpcEffect(pullRequests.diff(input), "Failed to read pull request diff"),
    [SYSTEM_RPC_METHODS.pullRequestsAction]: (
      input: Parameters<PullRequestServiceShape["action"]>[0],
    ) => systemRpcEffect(pullRequests.action(input), "Failed to update pull request"),
    [SYSTEM_RPC_METHODS.pullRequestsComment]: (
      input: Parameters<PullRequestServiceShape["comment"]>[0],
    ) => systemRpcEffect(pullRequests.comment(input), "Failed to comment on pull request"),
    [SYSTEM_RPC_METHODS.pullRequestsSetPinned]: (
      input: Parameters<PullRequestServiceShape["setPinned"]>[0],
    ) => systemRpcEffect(pullRequests.setPinned(input), "Failed to update pull request pin"),
  } as const;
}

export function requireSystemRpcOwner<A, E, R>(
  method: string,
  operation: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | WsRpcError, R> {
  if (!SYSTEM_RPC_METHOD_SET.has(method)) return operation;
  return Effect.gen(function* () {
    const role = yield* CurrentWsSessionRole;
    if (role !== "owner") {
      return yield* new WsRpcError({
        code: "SYSTEM_RPC_OWNER_REQUIRED",
        message: "This concrete System capability is available only to the owner session.",
        retryable: false,
      });
    }
    return yield* operation;
  });
}

const wsRequestAdmissionMiddlewareLayer = Layer.effect(
  WsRequestAdmissionMiddleware,
  Effect.gen(function* () {
    const admission = yield* makeWsRequestAdmission;
    const connectionSessions = yield* WsConnectionSessions;
    return ((effect, options) => {
      const scoped = provideWsConnectionSession(
        requireSystemRpcOwner(options.rpc._tag, effect),
        connectionSessions.lookup(Headers.get(options.headers, WS_CONNECTION_SESSION_HEADER)),
      );
      return RpcSchema.isStreamSchema(options.rpc.successSchema)
        ? scoped
        : admission.guard(options.clientId, options.rpc._tag, scoped);
    }) satisfies RpcMiddleware.RpcMiddleware<never, WsRpcError, never>;
  }),
);

const makeWsRpcHandlersLayer = () =>
  AdmittedWsFeatureRpcGroup.toLayer(
    Effect.gen(function* () {
      const productControlPlane = yield* ProductControlPlane;
      const automationService = yield* AutomationService;
      const workspaceEntries = yield* WorkspaceEntries;
      const workspaceFileSystem = yield* WorkspaceFileSystem;
      const workspacePaths = yield* WorkspacePaths;
      const devServerSupervisor = yield* DevServerSupervisor;
      const git = yield* GitCore;
      const open = yield* Open;
      const terminalSupervisor = yield* TerminalSupervisor;
      const pullRequests = yield* PullRequestService;
      const streamAdmission = yield* makeWsStreamAdmission();
      const productRpcEffect = <A>(productEffect: Effect.Effect<A, ProductControlPlaneError>) =>
        productEffect.pipe(
          Effect.mapError(
            (cause) =>
              new WsRpcError({
                message: cause.message,
                code: cause.code,
                retryable: cause.retryable,
              }),
          ),
        );
      const automationRpcEffect = <A>(
        effect: Effect.Effect<A, { readonly message: string }>,
      ): Effect.Effect<A, WsRpcError> =>
        effect.pipe(
          Effect.mapError(
            (cause) =>
              new WsRpcError({
                message: cause.message,
                cause,
              }),
          ),
        );
      const ensureWorkspaceRoot = (input: {
        readonly path: string;
        readonly createIfMissing: boolean;
      }) => {
        return workspacePaths
          .normalizeWorkspaceRoot(input.path, { createIfMissing: input.createIfMissing })
          .pipe(
            Effect.map((canonicalRoot) => ({ canonicalRoot })),
            Effect.mapError((cause) => {
              const code =
                cause._tag === "WorkspaceRootInvalidError"
                  ? "SYSTEM_WORKSPACE_ROOT_INVALID"
                  : cause._tag === "WorkspaceRootNotExistsError"
                    ? "SYSTEM_WORKSPACE_ROOT_NOT_FOUND"
                    : cause._tag === "WorkspaceRootNotDirectoryError"
                      ? "SYSTEM_WORKSPACE_ROOT_NOT_DIRECTORY"
                      : cause._tag === "WorkspaceRootCreateFailedError"
                        ? "SYSTEM_WORKSPACE_ROOT_CREATE_FAILED"
                        : cause._tag === "WorkspaceRootDeadlineExceededError"
                          ? "SYSTEM_WORKSPACE_ROOT_DEADLINE_EXCEEDED"
                          : "SYSTEM_WORKSPACE_ROOT_INSPECT_FAILED";
              return new WsRpcError({
                code,
                message: cause.message,
                retryable: cause._tag === "WorkspaceRootDeadlineExceededError",
              });
            }),
          );
      };
      const readGitPatch = (input: {
        readonly cwd: string;
        readonly scope?: "workingTree" | "unstaged" | "staged" | "branch" | undefined;
      }) => {
        switch (input.scope ?? "workingTree") {
          case "unstaged":
            return git.readUnstagedPatch(input.cwd);
          case "staged":
            return git.readStagedPatch(input.cwd);
          case "branch":
            return git.readBranchPatch(input.cwd);
          default:
            return git.readWorkingTreePatch(input.cwd);
        }
      };
      const diffStats = (patch: string) => {
        let additions = 0;
        let deletions = 0;
        let fileCount = 0;
        for (const line of patch.split("\n")) {
          if (line.startsWith("diff --git ")) fileCount += 1;
          else if (line.startsWith("+") && !line.startsWith("+++")) additions += 1;
          else if (line.startsWith("-") && !line.startsWith("---")) deletions += 1;
        }
        return { additions, deletions, fileCount };
      };
      const pullRequestHandlers = makePullRequestSystemRpcHandlers(pullRequests);

      return AdmittedWsFeatureRpcGroup.of({
        ...pullRequestHandlers,
        [PRODUCT_RPC_METHODS.createWorkspace]: (input) =>
          productRpcEffect(productControlPlane.createWorkspace(input)),
        [PRODUCT_RPC_METHODS.updateWorkspaceTitle]: (input) =>
          productRpcEffect(productControlPlane.updateWorkspaceTitle(input)),
        [PRODUCT_RPC_METHODS.setWorkspacePinned]: (input) =>
          productRpcEffect(productControlPlane.setWorkspacePinned(input)),
        [PRODUCT_RPC_METHODS.updateWorkspaceRunCommand]: (input) =>
          productRpcEffect(productControlPlane.updateWorkspaceRunCommand(input)),
        [PRODUCT_RPC_METHODS.deleteWorkspace]: (input) =>
          productRpcEffect(productControlPlane.deleteWorkspace(input)),
        [PRODUCT_RPC_METHODS.createGroup]: (input) =>
          productRpcEffect(productControlPlane.createGroup(input)),
        [PRODUCT_RPC_METHODS.updateGroup]: (input) =>
          productRpcEffect(productControlPlane.updateGroup(input)),
        [PRODUCT_RPC_METHODS.reorderGroups]: (input) =>
          productRpcEffect(productControlPlane.reorderGroups(input)),
        [PRODUCT_RPC_METHODS.deleteGroup]: (input) =>
          productRpcEffect(productControlPlane.deleteGroup(input)),
        [PRODUCT_RPC_METHODS.setConversationGroups]: (input) =>
          productRpcEffect(productControlPlane.setConversationGroups(input)),
        [PRODUCT_RPC_METHODS.addConversationGroups]: (input) =>
          productRpcEffect(productControlPlane.addConversationGroups(input)),
        [PRODUCT_RPC_METHODS.createConversation]: (input) =>
          productRpcEffect(productControlPlane.createConversation(input)),
        [PRODUCT_RPC_METHODS.updateConversationTitle]: (input) =>
          productRpcEffect(productControlPlane.updateConversationTitle(input)),
        [PRODUCT_RPC_METHODS.archiveConversation]: (input) =>
          productRpcEffect(productControlPlane.archiveConversation(input)),
        [PRODUCT_RPC_METHODS.restoreConversation]: (input) =>
          productRpcEffect(productControlPlane.restoreConversation(input)),
        [PRODUCT_RPC_METHODS.deleteConversation]: (input) =>
          productRpcEffect(productControlPlane.deleteConversation(input)),
        [PRODUCT_RPC_METHODS.setConversationPinned]: (input) =>
          productRpcEffect(productControlPlane.setConversationPinned(input)),
        [PRODUCT_RPC_METHODS.updateConversationNotes]: (input) =>
          productRpcEffect(productControlPlane.updateConversationNotes(input)),
        [PRODUCT_RPC_METHODS.setConversationBoardState]: (input) =>
          productRpcEffect(productControlPlane.setConversationBoardState(input)),
        [PRODUCT_RPC_METHODS.addEntryPin]: (input) =>
          productRpcEffect(productControlPlane.addEntryPin(input)),
        [PRODUCT_RPC_METHODS.removeEntryPin]: (input) =>
          productRpcEffect(productControlPlane.removeEntryPin(input)),
        [PRODUCT_RPC_METHODS.setEntryPinDone]: (input) =>
          productRpcEffect(productControlPlane.setEntryPinDone(input)),
        [PRODUCT_RPC_METHODS.setEntryPinLabel]: (input) =>
          productRpcEffect(productControlPlane.setEntryPinLabel(input)),
        [PRODUCT_RPC_METHODS.addEntryMarker]: (input) =>
          productRpcEffect(productControlPlane.addEntryMarker(input)),
        [PRODUCT_RPC_METHODS.removeEntryMarker]: (input) =>
          productRpcEffect(productControlPlane.removeEntryMarker(input)),
        [PRODUCT_RPC_METHODS.setEntryMarkerDone]: (input) =>
          productRpcEffect(productControlPlane.setEntryMarkerDone(input)),
        [PRODUCT_RPC_METHODS.setEntryMarkerLabel]: (input) =>
          productRpcEffect(productControlPlane.setEntryMarkerLabel(input)),
        [PRODUCT_RPC_METHODS.getShellSnapshot]: () =>
          productRpcEffect(productControlPlane.getShellSnapshot()),
        [PRODUCT_RPC_METHODS.getConversationSnapshot]: (input) =>
          productRpcEffect(productControlPlane.getConversationSnapshot(input)),
        [PRODUCT_RPC_METHODS.putQueueItem]: (input) =>
          productRpcEffect(productControlPlane.putQueueItem(input)),
        [PRODUCT_RPC_METHODS.reorderQueue]: (input) =>
          productRpcEffect(productControlPlane.reorderQueue(input)),
        [PRODUCT_RPC_METHODS.deleteQueueItem]: (input) =>
          productRpcEffect(productControlPlane.deleteQueueItem(input)),
        [PRODUCT_RPC_METHODS.submitQueueItem]: (input) =>
          productRpcEffect(productControlPlane.submitQueueItem(input)),
        [PRODUCT_RPC_METHODS.retryDispatch]: (input) =>
          productRpcEffect(productControlPlane.retryDispatch(input)),
        [PRODUCT_RPC_METHODS.controlRun]: (input) =>
          productRpcEffect(productControlPlane.controlRun(input)),
        [PRODUCT_RPC_METHODS.readFacts]: (input) =>
          productRpcEffect(productControlPlane.readFacts(input)),
        [SYSTEM_RPC_METHODS.ensureWorkspaceRoot]: (input) => ensureWorkspaceRoot(input),
        [AUTOMATION_RPC_METHODS.list]: (input) =>
          automationRpcEffect(automationService.list(input)),
        [AUTOMATION_RPC_METHODS.getMemory]: (input) =>
          automationRpcEffect(automationService.getMemory(input.automationId)),
        [AUTOMATION_RPC_METHODS.create]: (input) =>
          automationRpcEffect(automationService.create(input)),
        [AUTOMATION_RPC_METHODS.update]: (input) =>
          automationRpcEffect(automationService.update(input)),
        [AUTOMATION_RPC_METHODS.delete]: (input) =>
          automationRpcEffect(automationService.delete(input)),
        [AUTOMATION_RPC_METHODS.runNow]: (input) =>
          automationRpcEffect(automationService.runNow(input)),
        [AUTOMATION_RPC_METHODS.cancelRun]: (input) =>
          automationRpcEffect(automationService.cancelRun(input)),
        [AUTOMATION_RPC_METHODS.markRunRead]: (input) =>
          automationRpcEffect(automationService.markRunRead(input)),
        [AUTOMATION_RPC_METHODS.archiveRun]: (input) =>
          automationRpcEffect(automationService.archiveRun(input)),
        [AUTOMATION_RPC_METHODS.resolveProposal]: (input) =>
          automationRpcEffect(automationService.resolveProposal(input)),
        [AUTOMATION_RPC_METHODS.subscribeEvents]: (_, { clientId }) =>
          streamAdmission.guard(
            clientId,
            { key: "product.automation.events" },
            Stream.concat(
              Stream.fromEffect(
                automationRpcEffect(automationService.list()).pipe(
                  Effect.map((snapshot) => ({ type: "snapshot", ...snapshot }) as const),
                ),
              ),
              bufferLiveUiStream(automationService.streamEvents, {
                label: "product.automation.events",
              }),
            ),
          ),
        [SYSTEM_RPC_METHODS.listDirectories]: (input) =>
          systemRpcEffect(workspaceEntries.listDirectories(input), "Failed to list directories"),
        [SYSTEM_RPC_METHODS.discoverScripts]: (input) =>
          systemRpcEffect(workspaceEntries.discoverScripts(input), "Failed to discover scripts"),
        [SYSTEM_RPC_METHODS.searchEntries]: (input) =>
          systemRpcEffect(workspaceEntries.search(input), "Failed to search workspace"),
        [SYSTEM_RPC_METHODS.searchLocalEntries]: (input) =>
          systemRpcEffect(workspaceEntries.searchLocal(input), "Failed to search local entries"),
        [SYSTEM_RPC_METHODS.readFile]: (input) =>
          systemRpcEffect(workspaceFileSystem.readFile(input), "Failed to read workspace file"),
        [SYSTEM_RPC_METHODS.createLocalFilePreviewGrant]: (input) =>
          systemRpcEffect(
            Effect.promise(() => createLocalPreviewGrant({ requestedPath: input.path })),
            "Failed to create preview grant",
          ),
        [SYSTEM_RPC_METHODS.writeFile]: (input) =>
          systemRpcEffect(workspaceFileSystem.writeFile(input), "Failed to write workspace file"),
        [SYSTEM_RPC_METHODS.runDevServer]: (input) =>
          systemRpcEffect(devServerSupervisor.run(input), "Failed to start dev server"),
        [SYSTEM_RPC_METHODS.stopDevServer]: (input) =>
          systemRpcEffect(devServerSupervisor.stop(input), "Failed to stop dev server"),
        [SYSTEM_RPC_METHODS.listDevServers]: () =>
          systemRpcEffect(devServerSupervisor.list, "Failed to list dev servers"),
        [SYSTEM_RPC_METHODS.subscribeDevServerEvents]: (_, { clientId }) =>
          streamAdmission.guard(
            clientId,
            { key: "system.workspace.dev-server.events" },
            Stream.concat(
              Stream.fromEffect(
                devServerSupervisor.list.pipe(
                  Effect.map(
                    (result): ProjectDevServerEvent => ({
                      type: "snapshot",
                      servers: result.servers,
                    }),
                  ),
                ),
              ),
              bufferLiveUiStream(devServerSupervisor.stream, {
                label: "system.workspace.dev-server.events",
              }),
            ),
          ),
        [SYSTEM_RPC_METHODS.browseFilesystem]: (input) =>
          systemRpcEffect(workspaceEntries.browse(input), "Failed to browse filesystem"),
        [SYSTEM_RPC_METHODS.openInEditor]: (input) =>
          systemRpcEffect(open.openInEditor(input), "Failed to open editor"),
        [SYSTEM_RPC_METHODS.gitStatus]: (input) =>
          systemRpcEffect(git.status(input), "Failed to read Git status"),
        [SYSTEM_RPC_METHODS.gitReadDiff]: (input) =>
          systemRpcEffect(readGitPatch(input), "Failed to read Git diff"),
        [SYSTEM_RPC_METHODS.gitDiffStats]: (input) =>
          systemRpcEffect(
            readGitPatch(input).pipe(Effect.map(({ patch }) => diffStats(patch))),
            "Failed to read Git diff stats",
          ),
        [SYSTEM_RPC_METHODS.gitPull]: (input) =>
          systemRpcEffect(
            git.withMutation(input.cwd, git.pullCurrentBranch(input.cwd)),
            "Failed to pull Git branch",
          ),
        [SYSTEM_RPC_METHODS.gitListBranches]: (input) =>
          systemRpcEffect(git.listBranches(input), "Failed to list Git branches"),
        [SYSTEM_RPC_METHODS.gitCreateWorktree]: (input) =>
          systemRpcEffect(
            git.withMutation(input.cwd, git.createWorktree(input)),
            "Failed to create Git worktree",
          ),
        [SYSTEM_RPC_METHODS.gitCreateDetachedWorktree]: (input) =>
          systemRpcEffect(
            git.withMutation(input.cwd, git.createDetachedWorktree(input)),
            "Failed to create detached Git worktree",
          ),
        [SYSTEM_RPC_METHODS.gitRemoveWorktree]: (input) =>
          systemRpcEffect(
            git.withMutation(input.cwd, git.removeWorktree(input)),
            "Failed to remove Git worktree",
          ),
        [SYSTEM_RPC_METHODS.gitCreateBranch]: (input) =>
          systemRpcEffect(
            git.withMutation(input.cwd, git.createBranch(input)),
            "Failed to create Git branch",
          ),
        [SYSTEM_RPC_METHODS.gitCheckout]: (input) =>
          systemRpcEffect(
            git.withMutation(input.cwd, Effect.scoped(git.checkoutBranch(input))),
            "Failed to checkout Git branch",
          ),
        [SYSTEM_RPC_METHODS.gitStashAndCheckout]: (input) =>
          systemRpcEffect(
            git.withMutation(input.cwd, Effect.scoped(git.stashAndCheckout(input))),
            "Failed to stash and checkout",
          ),
        [SYSTEM_RPC_METHODS.gitStashDrop]: (input) =>
          systemRpcEffect(
            git.withMutation(input.cwd, git.stashDrop(input)),
            "Failed to drop Git stash",
          ),
        [SYSTEM_RPC_METHODS.gitStashInfo]: (input) =>
          systemRpcEffect(git.stashInfo(input), "Failed to read Git stash"),
        [SYSTEM_RPC_METHODS.gitRemoveIndexLock]: (input) =>
          systemRpcEffect(
            git.withMutation(input.cwd, git.removeIndexLock(input)),
            "Failed to remove Git index lock",
          ),
        [SYSTEM_RPC_METHODS.gitInit]: (input) =>
          systemRpcEffect(
            git.withMutation(input.cwd, git.initRepo(input)),
            "Failed to initialize Git repository",
          ),
        [SYSTEM_RPC_METHODS.gitStageFiles]: (input) =>
          systemRpcEffect(
            git
              .withMutation(input.cwd, git.stageFiles(input.cwd, input.paths))
              .pipe(Effect.as({ ok: true })),
            "Failed to stage files",
          ),
        [SYSTEM_RPC_METHODS.gitUnstageFiles]: (input) =>
          systemRpcEffect(
            git
              .withMutation(input.cwd, git.unstageFiles(input.cwd, input.paths))
              .pipe(Effect.as({ ok: true })),
            "Failed to unstage files",
          ),
        [SYSTEM_RPC_METHODS.terminalOpen]: (input) =>
          systemRpcEffect(terminalSupervisor.open(input), "Failed to open terminal"),
        [SYSTEM_RPC_METHODS.terminalWrite]: (input) =>
          systemRpcEffect(terminalSupervisor.write(input), "Failed to write terminal"),
        [SYSTEM_RPC_METHODS.terminalAckOutput]: (input) =>
          systemRpcEffect(
            terminalSupervisor.ackOutput(input),
            "Failed to acknowledge terminal output",
          ),
        [SYSTEM_RPC_METHODS.terminalResize]: (input) =>
          systemRpcEffect(terminalSupervisor.resize(input), "Failed to resize terminal"),
        [SYSTEM_RPC_METHODS.terminalClear]: (input) =>
          systemRpcEffect(terminalSupervisor.clear(input), "Failed to clear terminal"),
        [SYSTEM_RPC_METHODS.terminalRestart]: (input) =>
          systemRpcEffect(terminalSupervisor.restart(input), "Failed to restart terminal"),
        [SYSTEM_RPC_METHODS.terminalClose]: (input) =>
          systemRpcEffect(
            terminalSupervisor.close({
              ...input,
              terminalId: input.terminalId ?? DEFAULT_TERMINAL_ID,
            }),
            "Failed to close terminal",
          ),
        [SYSTEM_RPC_METHODS.subscribeTerminalEvents]: (_, { clientId }) =>
          streamAdmission.guard(
            clientId,
            { key: "system.terminal.events" },
            Stream.callback((queue) =>
              Effect.gen(function* () {
                const unsubscribe = yield* terminalSupervisor.subscribe((event) => {
                  Effect.runFork(Queue.offer(queue, event).pipe(Effect.asVoid));
                });
                yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));
              }),
            ),
          ),
      });
    }),
  );

export const makeWsRpcLayer = () =>
  Layer.merge(makeWsRpcHandlersLayer(), wsRequestAdmissionMiddlewareLayer);

const makeRpcWebSocketHttpEffect = RpcServer.toHttpEffectWebsocket(AdmittedWsFeatureRpcGroup, {
  spanPrefix: "ws.rpc",
  spanAttributes: {
    "rpc.transport": "websocket",
    "rpc.system": "effect-rpc",
  },
}).pipe(Effect.provide(makeWsRpcLayer().pipe(Layer.provideMerge(RpcSerialization.layerJson))));

const makeBootstrapWebSocketHttpEffect = RpcServer.toHttpEffectWebsocket(WsBootstrapRpcGroup, {
  spanPrefix: "ws.bootstrap",
  spanAttributes: {
    "rpc.transport": "websocket",
    "rpc.system": "effect-rpc",
  },
}).pipe(
  Effect.provide(
    WsBootstrapRpcGroup.toLayer(
      Effect.succeed(
        WsBootstrapRpcGroup.of({
          [WS_BOOTSTRAP_METHOD]: negotiateWsCompatibility,
        }),
      ),
    ).pipe(Layer.provideMerge(RpcSerialization.layerJson)),
  ),
);

function trustedWebSocketRequestUrl(
  request: HttpServerRequest.HttpServerRequest,
  config: ServerConfigShape,
): URL | null {
  const url = HttpServerRequest.toURL(request);
  return url &&
    !shouldRejectUntrustedRequestOrigin({
      rawOrigin: request.headers.origin,
      requestOrigin: url.origin,
      config,
    })
    ? url
    : null;
}

export function authenticateRpcWebSocketUpgrade(input: {
  readonly config: Pick<ServerConfigShape, "authToken" | "host" | "publicUrl">;
  readonly legacyToken: string | null;
  readonly request: AuthRequest;
  readonly serverAuth: Pick<ServerAuthShape, "authenticateWebSocketUpgrade">;
}): Effect.Effect<AuthenticatedSession | null, AuthError> {
  if (
    !requiresWebSocketAuthentication(input.config) ||
    (isLoopbackHost(input.config.host) &&
      !input.config.publicUrl &&
      input.legacyToken === input.config.authToken)
  ) {
    return Effect.succeed(null);
  }
  return input.serverAuth.authenticateWebSocketUpgrade(input.request);
}

export function makeWebsocketRpcRouteLayer<R>(
  rpcWebSocketHttpEffectSource: Effect.Effect<
    Effect.Effect<
      HttpServerResponse.HttpServerResponse,
      never,
      HttpServerRequest.HttpServerRequest | Scope.Scope
    >,
    never,
    R
  >,
) {
  return Layer.effectDiscard(
    Effect.gen(function* () {
      const rpcWebSocketHttpEffect = yield* rpcWebSocketHttpEffectSource;
      const connectionSessions = yield* WsConnectionSessions;
      const router = yield* HttpRouter.HttpRouter;
      const runWithConnectionSession = (
        request: HttpServerRequest.HttpServerRequest,
        session: WsConnectionSession,
      ) =>
        Effect.gen(function* () {
          const sessionKey = yield* connectionSessions.register(session);
          return yield* rpcWebSocketHttpEffect.pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              request.modify({
                headers: Headers.set(request.headers, WS_CONNECTION_SESSION_HEADER, sessionKey),
              }),
            ),
          );
        });
      yield* router.add(
        "GET",
        WS_FEATURE_PATH,
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const config = yield* ServerConfig;
          const serverAuth = yield* ServerAuth;
          const sessions = yield* SessionCredentialService;
          const url = trustedWebSocketRequestUrl(request, config);
          if (!url) return HttpServerResponse.text("Forbidden", { status: 403 });
          const compatibilityError = validateWsFeatureCompatibility(url.searchParams);
          if (compatibilityError) {
            return HttpServerResponse.jsonUnsafe(compatibilityError, {
              status: 426,
              headers: { "Cache-Control": "no-store" },
            });
          }
          const authenticatedSession = yield* authenticateRpcWebSocketUpgrade({
            config,
            legacyToken: url.searchParams.get("token"),
            request: makeEffectAuthRequest(request),
            serverAuth,
          });
          if (!authenticatedSession) {
            return yield* runWithConnectionSession(request, {
              role: "owner",
              attachmentPrincipal: LOCAL_LOOPBACK_ATTACHMENT_PRINCIPAL,
            });
          }
          return yield* sessions.runAuthenticatedConnection(
            authenticatedSession.sessionId,
            runWithConnectionSession(request, {
              role: authenticatedSession.role,
              attachmentPrincipal: attachmentPrincipalForSession(authenticatedSession.sessionId),
            }),
          );
        }).pipe(
          Effect.catchTags({
            AuthError: (error) => Effect.succeed(authErrorResponse(error)),
            SessionCapacityError: (error) =>
              Effect.succeed(
                HttpServerResponse.text(error.message, {
                  status: 429,
                  headers: {
                    "Cache-Control": "no-store",
                    "Retry-After": String(error.retryAfterSeconds),
                  },
                }),
              ),
            SessionCredentialError: (error) =>
              Effect.succeed(HttpServerResponse.text(error.message, { status: 401 })),
          }),
        ),
      );
    }),
  );
}

function makeWsNegotiateHttpRouteLayer() {
  return Layer.effectDiscard(
    Effect.gen(function* () {
      const router = yield* HttpRouter.HttpRouter;
      yield* router.add(
        "GET",
        WS_NEGOTIATE_HTTP_PATH,
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const config = yield* ServerConfig;
          const url = trustedWebSocketRequestUrl(request, config);
          if (!url) {
            return HttpServerResponse.text("Forbidden", {
              status: 403,
              headers: { "Cache-Control": "no-store", Vary: "Origin" },
            });
          }
          const origin = normalizeCorsOrigin(request.headers.origin);
          const corsHeaders =
            origin && isTrustedAppOrigin({ origin, requestOrigin: url.origin, config })
              ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
              : {};
          const headers = { "Cache-Control": "no-store", ...corsHeaders };
          const input = parseWsNegotiateSearchParams(url.searchParams);
          if (input instanceof WsCompatibilityError) {
            return HttpServerResponse.jsonUnsafe(input, { status: 426, headers });
          }
          return yield* negotiateWsCompatibility(input).pipe(
            Effect.map((result) => HttpServerResponse.jsonUnsafe(result, { status: 200, headers })),
            Effect.catch((error) =>
              Effect.succeed(HttpServerResponse.jsonUnsafe(error, { status: 426, headers })),
            ),
          );
        }),
      );
    }),
  );
}

function makeWebsocketBootstrapRouteLayer<R>(
  bootstrapWebSocketHttpEffectSource: Effect.Effect<
    Effect.Effect<
      HttpServerResponse.HttpServerResponse,
      never,
      HttpServerRequest.HttpServerRequest | Scope.Scope
    >,
    never,
    R
  >,
) {
  return Layer.effectDiscard(
    Effect.gen(function* () {
      const bootstrapWebSocketHttpEffect = yield* bootstrapWebSocketHttpEffectSource;
      const router = yield* HttpRouter.HttpRouter;
      yield* router.add(
        "GET",
        WS_BOOTSTRAP_PATH,
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const config = yield* ServerConfig;
          const url = trustedWebSocketRequestUrl(request, config);
          return url
            ? yield* bootstrapWebSocketHttpEffect
            : HttpServerResponse.text("Forbidden", { status: 403 });
        }),
      );
    }),
  );
}

export const makeWebsocketNegotiationRouteLayer = () =>
  Layer.merge(
    makeWsNegotiateHttpRouteLayer(),
    makeWebsocketBootstrapRouteLayer(makeBootstrapWebSocketHttpEffect),
  );

export const websocketRpcRouteLayer = Layer.merge(
  makeWebsocketNegotiationRouteLayer(),
  makeWebsocketRpcRouteLayer(makeRpcWebSocketHttpEffect).pipe(
    Layer.provide(WsConnectionSessionsLive),
  ),
);
