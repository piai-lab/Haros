// FILE: OAEcosystem.ts
// Purpose: Bridges explicit HarnessOS Agent ecosystem intents to its bundled Pi owners.
// Layer: Server engine implementation

import type {
  OAEcosystemListResourcesResult,
  OAEcosystemMutationResult,
  OAEcosystemSnapshot,
  HarnessOSPackageDescriptor,
} from "@harnessos/contracts";
import { Effect, Layer } from "effect";

import { ServerConfig } from "../../config.ts";
import { loadOARuntimeModule, resolveOAAgentDir } from "../oaRuntime.ts";
import { OAEcosystem, type OAEcosystemShape } from "../Services/OAEcosystem.ts";
import { EngineService } from "../Services/EngineService.ts";

type OARuntimeModule = Awaited<ReturnType<typeof loadOARuntimeModule>>;

export interface OAEcosystemLiveOptions {
  readonly loadModule?: () => Promise<OARuntimeModule>;
}

function createOwners(input: { readonly sdk: OARuntimeModule; readonly agentDir: string }) {
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
  readonly sdk: OARuntimeModule;
  readonly agentDir: string;
  readonly checkUpdates?: boolean;
}): Promise<OAEcosystemSnapshot> {
  const { packageManager } = createOwners(input);
  const configured = packageManager
    .listPublicConfiguredPackages()
    .filter((pkg) => pkg.scope === "user");
  const updatePackageIds = new Set(
    input.checkUpdates ? await packageManager.checkPublicPackageUpdates() : [],
  );
  const packages: HarnessOSPackageDescriptor[] = configured.slice(0, 512).map((pkg) =>
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

export function makeOAEcosystemLive(options: OAEcosystemLiveOptions = {}) {
  return Layer.effect(
    OAEcosystem,
    Effect.gen(function* () {
      const config = yield* ServerConfig;
      const engineService = yield* EngineService;
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
          catch: () => new Error("HarnessOS ecosystem operation failed"),
        });

      const withOwners = async () => {
        const sdk = await (options.loadModule ?? loadOARuntimeModule)();
        const agentDir = resolveOAAgentDir(config.baseDir);
        return { sdk, agentDir, ...createOwners({ sdk, agentDir }) };
      };
      const readSnapshot = async (checkUpdates = false) => {
        const sdk = await (options.loadModule ?? loadOARuntimeModule)();
        const agentDir = resolveOAAgentDir(config.baseDir);
        return snapshot({ sdk, agentDir, checkUpdates });
      };
      const mutationResult = async (changed: boolean): Promise<OAEcosystemMutationResult> => ({
        changed,
        snapshot: await readSnapshot(false),
      });

      return {
        list: (input = {}) => run(() => readSnapshot(input.checkUpdates === true)),
        listResources: (input) =>
          run(async (): Promise<OAEcosystemListResourcesResult> => {
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
        reload: (input) => engineService.reloadSessionResources(input),
      } satisfies OAEcosystemShape;
    }),
  );
}

export const OAEcosystemLive = makeOAEcosystemLive();
