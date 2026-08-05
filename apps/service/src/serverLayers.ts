import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";

import { AuthControlPlaneLive } from "./auth/Layers/AuthControlPlane";
import { BootstrapCredentialServiceLive } from "./auth/Layers/BootstrapCredentialService";
import { ServerAuthLive } from "./auth/Layers/ServerAuth";
import { ServerAuthPolicyLive } from "./auth/Layers/ServerAuthPolicy";
import { ServerSecretStoreLive } from "./auth/Layers/ServerSecretStore";
import { SessionCredentialServiceLive } from "./auth/Layers/SessionCredentialService";
import { AutomationSchedulerLive } from "./automation/Layers/AutomationScheduler";
import { AutomationServiceLive } from "./automation/Layers/AutomationService";
import { DevServerSupervisorLive } from "./devServerSupervisor";
import { ServerEnvironmentLive } from "./environment/Layers/ServerEnvironment";
import { GitLayerLive } from "./git/runtimeLayer";
import { KeybindingsLive } from "./keybindings";
import { ManagedAttachmentCleanupLive } from "./managedAttachmentCleanup";
import { NativeHostProductControlPlaneLive } from "./native-host/executionBoundary";
import { ManagedAttachmentRepositoryLive } from "./persistence/Layers/ManagedAttachments";
import { AutomationRepositoryLive } from "./persistence/Layers/AutomationRepository";
import { WorkspacePullRequestPinsLive } from "./persistence/Layers/WorkspacePullRequestPins";
import { WorkspacePullRequestPins } from "./persistence/Services/WorkspacePullRequestPins";
import { NativeHostHealthMonitorLive } from "./product/health/nativeHostHealthMonitor";
import { ProductControlPlane } from "./product/ProductControlPlane";
import { ProjectFaviconResolverLive } from "./project/Layers/ProjectFaviconResolver";
import { makePullRequestService } from "./pullRequests/Layers/PullRequestService";
import { resolveGitHubRepositories } from "./pullRequests/repositoryResolution";
import { PullRequestService } from "./pullRequests/Services/PullRequestService";
import { GitCore } from "./git/Services/GitCore";
import { GitHubCli } from "./git/Services/GitHubCli";
import { ServerConfig } from "./config";
import { ServerLifecycleEventsLive } from "./serverLifecycleEvents";
import { ServerRuntimeStartupLive } from "./serverRuntimeStartup";
import { TerminalLayerLive } from "./terminal/runtimeLayer";
import { WorkspaceLayerLive } from "./workspace/runtimeLayer";

export function makeServerRuntimeServicesLayer() {
  const sessionCredentialLayer = SessionCredentialServiceLive.pipe(
    Layer.provide(ServerSecretStoreLive),
  );
  const authControlPlaneLayer = AuthControlPlaneLive.pipe(
    Layer.provide(BootstrapCredentialServiceLive),
    Layer.provide(sessionCredentialLayer),
  );
  const serverAuthLayer = ServerAuthLive.pipe(
    Layer.provide(ServerAuthPolicyLive),
    Layer.provide(BootstrapCredentialServiceLive),
    Layer.provide(sessionCredentialLayer),
    Layer.provide(authControlPlaneLayer),
  );
  const authServicesLayer = Layer.mergeAll(
    ServerAuthPolicyLive,
    ServerSecretStoreLive,
    BootstrapCredentialServiceLive,
    sessionCredentialLayer,
    authControlPlaneLayer,
    serverAuthLayer,
  );
  const managedAttachmentCleanupLayer = ManagedAttachmentCleanupLive.pipe(
    Layer.provideMerge(ManagedAttachmentRepositoryLive),
  );
  const devServerSupervisorLayer = DevServerSupervisorLive.pipe(Layer.provide(TerminalLayerLive));
  const automationServiceLayer = AutomationServiceLive.pipe(
    Layer.provideMerge(AutomationRepositoryLive),
  );
  const automationLayer = AutomationSchedulerLive.pipe(Layer.provideMerge(automationServiceLayer));
  const pullRequestServiceLayer = Layer.effect(
    PullRequestService,
    Effect.gen(function* () {
      const config = yield* ServerConfig;
      const productControlPlane = yield* ProductControlPlane;
      const git = yield* GitCore;
      const github = yield* GitHubCli;
      const pins = yield* WorkspacePullRequestPins;
      return yield* makePullRequestService({
        homeDir: config.homeDir,
        github,
        pins,
        listWorkspaces: () =>
          productControlPlane
            .getShellSnapshot()
            .pipe(Effect.map((snapshot) => snapshot.workspaces)),
        resolveRepositories: (workspace) => resolveGitHubRepositories(git, workspace.workspaceRoot),
      });
    }),
  ).pipe(
    Layer.provideMerge(GitLayerLive),
    Layer.provideMerge(NativeHostProductControlPlaneLive),
    Layer.provideMerge(WorkspacePullRequestPinsLive),
  );

  return Layer.mergeAll(
    automationLayer,
    authServicesLayer,
    devServerSupervisorLayer,
    GitLayerLive,
    KeybindingsLive,
    ManagedAttachmentRepositoryLive,
    managedAttachmentCleanupLayer,
    NativeHostProductControlPlaneLive,
    NativeHostHealthMonitorLive,
    pullRequestServiceLayer,
    ProjectFaviconResolverLive,
    ServerEnvironmentLive,
    ServerLifecycleEventsLive,
    ServerRuntimeStartupLive,
    TerminalLayerLive,
    WorkspaceLayerLive,
  ).pipe(Layer.provideMerge(NodeServices.layer));
}

export function makeServerApplicationLayers() {
  return {
    runtimeServicesLayer: makeServerRuntimeServicesLayer(),
  } as const;
}
