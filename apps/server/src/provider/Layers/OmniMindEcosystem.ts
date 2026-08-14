// FILE: OmniMindEcosystem.ts
// Purpose: Bridges explicit OmniMind Agent ecosystem intents to its bundled Pi owners.
// Layer: Server provider implementation

import type {
  OmniMindEcosystemListResourcesResult,
  OmniMindEcosystemMutationResult,
  OmniMindEcosystemSnapshot,
  OmniMindPackageDescriptor,
} from "@omnimind/contracts";
import { Effect, Layer } from "effect";

import { ServerConfig } from "../../config.ts";
import { loadOmniMindCodingAgentModule, resolveOmniMindAgentDir } from "../omnimindAgentRuntime.ts";
import { OmniMindEcosystem, type OmniMindEcosystemShape } from "../Services/OmniMindEcosystem.ts";
import { ProviderService } from "../Services/ProviderService.ts";

type OmniMindCodingAgentModule = Awaited<ReturnType<typeof loadOmniMindCodingAgentModule>>;

export interface OmniMindEcosystemLiveOptions {
  readonly loadModule?: () => Promise<OmniMindCodingAgentModule>;
}

function createOwners(input: {
  readonly sdk: OmniMindCodingAgentModule;
  readonly agentDir: string;
}) {
  const settingsManager = input.sdk.SettingsManager.create(input.agentDir, input.agentDir, {
    projectTrusted: false,
  });
  const packageManager = new input.sdk.DefaultPackageManager({
    cwd: input.agentDir,
    agentDir: input.agentDir,
    settingsManager,
  });
  return { settingsManager, packageManager };
}

async function snapshot(input: {
  readonly sdk: OmniMindCodingAgentModule;
  readonly agentDir: string;
  readonly checkUpdates?: boolean;
}): Promise<OmniMindEcosystemSnapshot> {
  const { packageManager } = createOwners(input);
  const configured = packageManager
    .listPublicConfiguredPackages()
    .filter((pkg) => pkg.scope === "user");
  const updatePackageIds = new Set(
    input.checkUpdates ? await packageManager.checkPublicPackageUpdates() : [],
  );
  const packages: OmniMindPackageDescriptor[] = configured.slice(0, 512).map((pkg) =>
    input.checkUpdates
      ? {
          packageId: pkg.packageId,
          displayName: pkg.displayName.slice(0, 512),
          kind: pkg.kind,
          installed: pkg.installed,
          filtered: pkg.filtered,
          manageable: pkg.manageable,
          updateAvailable: updatePackageIds.has(pkg.packageId),
        }
      : {
          packageId: pkg.packageId,
          displayName: pkg.displayName.slice(0, 512),
          kind: pkg.kind,
          installed: pkg.installed,
          filtered: pkg.filtered,
          manageable: pkg.manageable,
        },
  );
  return { packages };
}

export function makeOmniMindEcosystemLive(options: OmniMindEcosystemLiveOptions = {}) {
  return Layer.effect(
    OmniMindEcosystem,
    Effect.gen(function* () {
      const config = yield* ServerConfig;
      const providerService = yield* ProviderService;
      let mutationTail = Promise.resolve();
      const run = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: async () => {
            const result = mutationTail.then(operation, operation);
            mutationTail = result.then(
              () => undefined,
              () => undefined,
            );
            return result;
          },
          catch: () => new Error("OmniMind ecosystem operation failed"),
        });

      const withOwners = async () => {
        const sdk = await (options.loadModule ?? loadOmniMindCodingAgentModule)();
        const agentDir = resolveOmniMindAgentDir(config.baseDir);
        return { sdk, agentDir, ...createOwners({ sdk, agentDir }) };
      };
      const readSnapshot = async (checkUpdates = false) => {
        const sdk = await (options.loadModule ?? loadOmniMindCodingAgentModule)();
        const agentDir = resolveOmniMindAgentDir(config.baseDir);
        return snapshot({ sdk, agentDir, checkUpdates });
      };
      const mutationResult = async (
        changed: boolean,
      ): Promise<OmniMindEcosystemMutationResult> => ({
        changed,
        snapshot: await readSnapshot(false),
      });

      return {
        list: (input = {}) => run(() => readSnapshot(input.checkUpdates === true)),
        listResources: (input) =>
          run(async (): Promise<OmniMindEcosystemListResourcesResult> => {
            const { packageManager } = await withOwners();
            const resources = await packageManager.listPublicConfiguredPackageResources(input);
            return { resources: resources.slice(0, 8_192) };
          }),
        install: (input) =>
          run(async () => {
            const { packageManager, settingsManager } = await withOwners();
            await packageManager.installPublicPackage(input.source);
            await settingsManager.flush();
            return mutationResult(true);
          }),
        update: (input) =>
          run(async () => {
            const { packageManager } = await withOwners();
            await packageManager.updatePublicPackage(input);
            return mutationResult(true);
          }),
        remove: (input) =>
          run(async () => {
            const { packageManager, settingsManager } = await withOwners();
            const changed = await packageManager.removePublicPackage(input);
            await settingsManager.flush();
            return mutationResult(changed);
          }),
        setResourceEnabled: (input) =>
          run(async () => {
            const { packageManager, settingsManager } = await withOwners();
            const resources = await packageManager.listPublicConfiguredPackageResources({
              packageId: input.packageId,
            });
            const matches = resources.filter(
              (resource) =>
                resource.resourceType === input.resourceType &&
                resource.resourcePath === input.resourcePath,
            );
            if (matches.length !== 1) throw new Error("Package resource is no longer available");
            const changed = await packageManager.setPublicPackageResourceEnabled(
              input,
              input.enabled,
            );
            if (changed) await settingsManager.flush();
            return mutationResult(changed);
          }),
        reload: (input) => providerService.reloadSessionResources(input),
      } satisfies OmniMindEcosystemShape;
    }),
  );
}

export const OmniMindEcosystemLive = makeOmniMindEcosystemLive();
