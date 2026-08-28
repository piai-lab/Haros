import { Effect, Layer } from "effect";

import { HostGatewayCredentialsWithSecretsLive } from "../hostGateway/Layers/HostGatewayCredentials";
import { BrowserAutomationHostLive } from "../browserAutomation/Layers/BrowserAutomationHost";
import { ServerConfig } from "../config";
import {
  makeEngineServerPasswordResolver,
  EngineCredentials,
  EngineCredentialsLive,
} from "../engineCredentials";
import { ServerSettingsLive } from "../serverSettings";
import { makeClaudeAdapterLive } from "./Layers/ClaudeAdapter";
import { makeCodexAdapterLive } from "./Layers/CodexAdapter";
import { makeCursorAdapterLive } from "./Layers/CursorAdapter";
import { makeEventNdjsonLogger } from "./Layers/EventNdjsonLogger";
import { makeAntigravityAdapterLive } from "./Layers/AntigravityAdapter";
import { makeDroidAdapterLive } from "./Layers/DroidAdapter";
import { makeGrokAdapterLive } from "./Layers/GrokAdapter";
import { makeKiloAdapterLive, makeOpenCodeAdapterLive } from "./Layers/OpenCodeAdapter";
import { makeOAAgentAdapterLive, makePiAdapterLive } from "./Layers/PiAdapter";
import { EngineAdapterRegistryLive } from "./Layers/EngineAdapterRegistry";
import { EngineDiscoveryServiceLive } from "./Layers/EngineDiscoveryService";
import { OAEcosystemLive } from "./Layers/OAEcosystem";
import { OAAgentPromptFilesLive } from "./Layers/OAAgentPromptFiles";
import { OAWebSearchSettingsLive } from "./Layers/OAWebSearchSettings";
import { OAModelServicesLive } from "./Layers/OAModelServices";
import { makeDurableEngineServiceLive } from "./Layers/EngineService";
import { EngineSessionDirectoryLive } from "./Layers/EngineSessionDirectory";
import { EngineSessionRuntimeRepositoryLive } from "../persistence/Layers/EngineSessionRuntime";
import { EngineRuntimeEventRepositoryLive } from "../persistence/Layers/EngineRuntimeEvents";
import { OrchestrationProjectionSnapshotQueryLive } from "../orchestration/Layers/ProjectionSnapshotQuery";

export function makeServerEngineLayer(
  options: {
    readonly hostGatewayCredentialsLayer?: typeof HostGatewayCredentialsWithSecretsLive;
  } = {},
) {
  return Effect.gen(function* () {
    const credentials = yield* EngineCredentials;
    const resolveEngineServerPassword = makeEngineServerPasswordResolver(credentials);
    const { logEngineEvents, engineEventLogPath } = yield* ServerConfig;
    const nativeEventLogger = logEngineEvents
      ? yield* makeEventNdjsonLogger(engineEventLogPath, {
          stream: "native",
        })
      : undefined;
    const canonicalEventLogger = logEngineEvents
      ? yield* makeEventNdjsonLogger(engineEventLogPath, {
          stream: "canonical",
        })
      : undefined;
    const engineSessionDirectoryLayer = EngineSessionDirectoryLive.pipe(
      Layer.provide(EngineSessionRuntimeRepositoryLive),
    );
    // Gives gateway-capable sessions their thread-scoped harnessos_* credentials.
    // OpenCode/Kilo isolate managed servers before installing MCP; Pi projects
    // the same MCP catalog/dispatcher through its native custom-tool API.
    const hostGatewayCredentialsLayer =
      options.hostGatewayCredentialsLayer ?? HostGatewayCredentialsWithSecretsLive;
    const codexAdapterLayer = makeCodexAdapterLive(
      nativeEventLogger ? { nativeEventLogger } : undefined,
    ).pipe(Layer.provide(hostGatewayCredentialsLayer));
    const claudeAdapterLayer = makeClaudeAdapterLive(
      nativeEventLogger ? { nativeEventLogger } : undefined,
    ).pipe(Layer.provide(hostGatewayCredentialsLayer));
    const openCodeAdapterLayer = makeOpenCodeAdapterLive({
      ...(nativeEventLogger ? { nativeEventLogger } : {}),
      resolveServerPassword: resolveEngineServerPassword,
    }).pipe(Layer.provide(hostGatewayCredentialsLayer));
    const kiloAdapterLayer = makeKiloAdapterLive({
      ...(nativeEventLogger ? { nativeEventLogger } : {}),
      resolveServerPassword: resolveEngineServerPassword,
    }).pipe(Layer.provide(hostGatewayCredentialsLayer));
    const antigravityAdapterLayer = makeAntigravityAdapterLive().pipe(
      Layer.provide(hostGatewayCredentialsLayer),
    );
    const grokAdapterLayer = makeGrokAdapterLive(
      {},
      nativeEventLogger ? { nativeEventLogger } : undefined,
    ).pipe(Layer.provide(hostGatewayCredentialsLayer));
    const droidAdapterLayer = makeDroidAdapterLive(
      {},
      nativeEventLogger ? { nativeEventLogger } : undefined,
    ).pipe(Layer.provide(hostGatewayCredentialsLayer));
    const cursorAdapterLayer = makeCursorAdapterLive(
      {},
      nativeEventLogger ? { nativeEventLogger } : undefined,
    ).pipe(Layer.provide(hostGatewayCredentialsLayer));
    const piAdapterLayer = makePiAdapterLive(
      nativeEventLogger ? { nativeEventLogger } : undefined,
    ).pipe(Layer.provide(hostGatewayCredentialsLayer), Layer.provide(BrowserAutomationHostLive));
    const omniMindAgentAdapterLayer = makeOAAgentAdapterLive(
      nativeEventLogger ? { nativeEventLogger } : undefined,
    ).pipe(
      Layer.provide(hostGatewayCredentialsLayer),
      Layer.provide(BrowserAutomationHostLive),
      Layer.provide(ServerSettingsLive),
    );
    const adapterRegistryLayer = EngineAdapterRegistryLive.pipe(
      Layer.provide(codexAdapterLayer),
      Layer.provide(claudeAdapterLayer),
      Layer.provide(cursorAdapterLayer),
      Layer.provide(antigravityAdapterLayer),
      Layer.provide(grokAdapterLayer),
      Layer.provide(droidAdapterLayer),
      Layer.provide(kiloAdapterLayer),
      Layer.provide(openCodeAdapterLayer),
      Layer.provide(omniMindAgentAdapterLayer),
      Layer.provide(piAdapterLayer),
      Layer.provideMerge(engineSessionDirectoryLayer),
    );
    const engineServiceLayer = makeDurableEngineServiceLive(
      canonicalEventLogger ? { canonicalEventLogger } : undefined,
    ).pipe(
      Layer.provide(adapterRegistryLayer),
      Layer.provide(engineSessionDirectoryLayer),
      Layer.provide(EngineRuntimeEventRepositoryLive),
    );
    const engineDiscoveryLayer = EngineDiscoveryServiceLive.pipe(
      Layer.provide(adapterRegistryLayer),
      Layer.provide(OrchestrationProjectionSnapshotQueryLive),
      // Skill toggles live in server settings; the shared ServerSettingsLive
      // layer is memoized so this reuses the instance built at the top level.
      Layer.provide(ServerSettingsLive),
    );
    const omniMindModelServicesLayer = OAModelServicesLive.pipe(Layer.provide(engineServiceLayer));
    const omniMindEcosystemLayer = OAEcosystemLive.pipe(Layer.provide(engineServiceLayer));
    const omniMindAgentPromptFilesLayer = OAAgentPromptFilesLive.pipe(
      Layer.provide(ServerSettingsLive),
    );
    return Layer.mergeAll(
      engineServiceLayer,
      engineDiscoveryLayer,
      omniMindEcosystemLayer,
      omniMindAgentPromptFilesLayer,
      OAWebSearchSettingsLive,
      omniMindModelServicesLayer,
      adapterRegistryLayer,
      engineSessionDirectoryLayer,
    );
  }).pipe(Effect.provide(EngineCredentialsLive.pipe(Layer.orDie)), Layer.unwrap);
}
