import {
  DEFAULT_SERVER_SETTINGS,
  type ProviderComposerCapabilities,
  ProviderGetComposerCapabilitiesInput,
  ProviderListAgentsInput,
  ProviderListCommandsInput,
  ProviderListModelsInput,
  type ProviderListModelsResult,
  ProviderListPluginsInput,
  ProviderModelDescriptor,
  ProviderListSkillsInput,
  type ProviderListSkillsResult,
  ProviderReadPluginInput,
  type ProviderSkillDiscoveryWarning,
  type ProviderSkillDescriptor,
  ThreadId,
} from "@omnimind/contracts";
import { Effect, Layer, Option, Schema, SchemaIssue } from "effect";

import { ServerConfig } from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { ProjectionSnapshotQuery } from "../../orchestration/Services/ProjectionSnapshotQuery.ts";
import { resolveThreadWorkspaceCwd } from "../../checkpointing/Utils.ts";
import { ProviderValidationError } from "../Errors.ts";
import { ProviderAdapterRegistry } from "../Services/ProviderAdapterRegistry.ts";
import {
  ProviderDiscoveryService,
  type ProviderDiscoveryServiceShape,
} from "../Services/ProviderDiscoveryService.ts";
import {
  discoverSkillsCatalog,
  filterDisabledSkills,
  mergeSkillsIntoCatalog,
} from "../skillsCatalog.ts";

const decodeInputOrValidationError = <S extends Schema.Top>(input: {
  readonly operation: string;
  readonly schema: S;
  readonly payload: unknown;
}) =>
  Schema.decodeUnknownEffect(input.schema)(input.payload).pipe(
    Effect.mapError(
      (schemaError) =>
        new ProviderValidationError({
          operation: input.operation,
          issue: SchemaIssue.makeFormatterDefault()(schemaError.issue),
          cause: schemaError,
        }),
    ),
  );

type NativeSkillDiscovery = ProviderListSkillsResult | "failed" | "unsupported";
type CatalogSkillDiscovery = ReadonlyArray<ProviderSkillDescriptor> | "failed";

export function combineProviderSkills(input: {
  readonly native: NativeSkillDiscovery;
  readonly catalog: CatalogSkillDiscovery;
  readonly disabledSkillNames: ReadonlyArray<string>;
}): ProviderListSkillsResult {
  const nativeResult = typeof input.native === "string" ? null : input.native;
  const catalogSkills = input.catalog === "failed" ? [] : input.catalog;
  const warnings: ProviderSkillDiscoveryWarning[] = [];
  if (input.native === "failed") {
    warnings.push({ source: "engine-native", reason: "discovery-failed" });
  }
  if (input.catalog === "failed") {
    warnings.push({ source: "omnimind-library", reason: "discovery-failed" });
  }
  const nativeSource = nativeResult ? (nativeResult.source ?? "provider-native") : null;
  const catalogSource = input.catalog === "failed" ? null : "omnimind.catalog";
  return {
    skills: filterDisabledSkills(
      mergeSkillsIntoCatalog({
        native: nativeResult?.skills ?? [],
        catalog: catalogSkills,
      }),
      input.disabledSkillNames,
    ),
    source:
      nativeSource && catalogSource
        ? `${nativeSource}+${catalogSource}`
        : (nativeSource ?? catalogSource ?? "unavailable"),
    cached: nativeResult?.cached ?? false,
    warnings,
  };
}

const decodeProviderModelDescriptorOption = Schema.decodeUnknownOption(ProviderModelDescriptor);

function isolateMalformedModelDescriptors(input: {
  readonly provider: ProviderListModelsInput["provider"];
  readonly result: ProviderListModelsResult;
}): Effect.Effect<ProviderListModelsResult> {
  const models = input.result.models.flatMap((model) => {
    const decoded = decodeProviderModelDescriptorOption(model);
    return Option.isSome(decoded) ? [decoded.value] : [];
  });
  const omittedCount = input.result.models.length - models.length;
  if (omittedCount === 0) {
    return Effect.succeed(input.result);
  }
  return Effect.logWarning("provider model discovery omitted malformed descriptors", {
    provider: input.provider,
    source: input.result.source ?? "unknown",
    omittedCount,
  }).pipe(
    Effect.as({
      ...input.result,
      models,
    }),
  );
}

const make = Effect.gen(function* () {
  const registry = yield* ProviderAdapterRegistry;
  const serverConfig = yield* ServerConfig;
  const serverSettings = yield* ServerSettingsService;
  const snapshotQuery = Option.getOrUndefined(yield* Effect.serviceOption(ProjectionSnapshotQuery));

  const resolveResourceScope = (input: { readonly threadId?: string | undefined }) =>
    Effect.gen(function* () {
      if (!input.threadId || !snapshotQuery) {
        return {
          cwd: serverConfig.homeDir,
          resourceScope: { kind: "global-only" } as const,
        };
      }
      const thread = yield* snapshotQuery
        .getThreadShellById(ThreadId.makeUnsafe(input.threadId))
        .pipe(Effect.catch(() => Effect.succeed(Option.none())));
      if (Option.isNone(thread)) {
        return {
          cwd: serverConfig.homeDir,
          resourceScope: { kind: "global-only" } as const,
        };
      }
      const project = yield* snapshotQuery
        .getProjectShellById(thread.value.projectId)
        .pipe(Effect.catch(() => Effect.succeed(Option.none())));
      if (Option.isNone(project) || project.value.kind !== "project") {
        return {
          cwd: serverConfig.homeDir,
          resourceScope: { kind: "global-only" } as const,
        };
      }
      const authoritativeRoot = resolveThreadWorkspaceCwd({
        thread: thread.value,
        projects: [project.value],
      });
      if (!authoritativeRoot) {
        return {
          cwd: serverConfig.homeDir,
          resourceScope: { kind: "global-only" } as const,
        };
      }
      return {
        cwd: authoritativeRoot,
        resourceScope: { kind: "project", authoritativeRoot } as const,
      };
    });

  const getComposerCapabilities: ProviderDiscoveryServiceShape["getComposerCapabilities"] = (
    input,
  ) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "ProviderDiscoveryService.getComposerCapabilities",
        schema: ProviderGetComposerCapabilitiesInput,
        payload: input,
      });
      const adapter = yield* registry.getByProvider(parsed.provider);
      const capabilities: ProviderComposerCapabilities = {
        provider: parsed.provider,
        supportsSkillMentions: adapter.capabilities.supportsSkillMentions === true,
        supportsSkillDiscovery: adapter.capabilities.supportsSkillDiscovery === true,
        supportsNativeSlashCommandDiscovery:
          adapter.capabilities.supportsNativeSlashCommandDiscovery === true,
        supportsPluginMentions: adapter.capabilities.supportsPluginMentions === true,
        supportsPluginDiscovery: adapter.capabilities.supportsPluginDiscovery === true,
        supportsRuntimeModelList: adapter.capabilities.supportsRuntimeModelList === true,
        supportsThreadCompaction: adapter.capabilities.supportsThreadCompaction === true,
        supportsThreadImport: adapter.capabilities.supportsThreadImport === true,
      };
      // The unified OmniMind skills catalog backs skill discovery for every
      // provider, including ones without native skill support.
      return {
        ...capabilities,
        supportsSkillMentions: true,
        supportsSkillDiscovery: true,
      };
    });

  const listSkills: ProviderDiscoveryServiceShape["listSkills"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "ProviderDiscoveryService.listSkills",
        schema: ProviderListSkillsInput,
        payload: input,
      });
      const scope = yield* resolveResourceScope(parsed);
      const scopedInput = {
        ...parsed,
        cwd: scope.cwd,
        resourceScope: scope.resourceScope,
      };
      const adapter = yield* registry.getByProvider(parsed.provider);
      const nativeDiscovery = adapter.listSkills
        ? yield* adapter.listSkills(scopedInput).pipe(
            Effect.map((result) => ({ _tag: "success", result }) as const),
            Effect.catch(() =>
              Effect.logWarning("provider-native skill discovery failed", {
                provider: parsed.provider,
                surface: "skills",
              }).pipe(Effect.as({ _tag: "failed" } as const)),
            ),
          )
        : ({ _tag: "unsupported" } as const);
      const catalogDiscovery = yield* Effect.tryPromise(() =>
        discoverSkillsCatalog({
          ...(scope.resourceScope.kind === "project" ? { cwd: scope.cwd } : {}),
          homeDir: serverConfig.homeDir,
          omnimindBaseDir: serverConfig.baseDir,
          provider: parsed.provider,
          includeDuplicateOrigins: true,
          ...(parsed.forceReload !== undefined ? { forceReload: parsed.forceReload } : {}),
        }),
      ).pipe(
        Effect.map((skills) => ({ _tag: "success", skills }) as const),
        Effect.catchCause(() =>
          Effect.logWarning("omnimind skills catalog discovery failed", {
            provider: parsed.provider,
            surface: "skills",
          }).pipe(Effect.as({ _tag: "failed" } as const)),
        ),
      );
      const settings = yield* serverSettings.getSettings.pipe(
        Effect.orElseSucceed(() => DEFAULT_SERVER_SETTINGS),
      );
      return combineProviderSkills({
        native: nativeDiscovery._tag === "success" ? nativeDiscovery.result : nativeDiscovery._tag,
        catalog: catalogDiscovery._tag === "success" ? catalogDiscovery.skills : "failed",
        disabledSkillNames: settings.skills.disabled,
      });
    });

  const listCommands: ProviderDiscoveryServiceShape["listCommands"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "ProviderDiscoveryService.listCommands",
        schema: ProviderListCommandsInput,
        payload: input,
      });
      const scope = yield* resolveResourceScope(parsed);
      const adapter = yield* registry.getByProvider(parsed.provider);
      if (!adapter.listCommands) {
        return {
          commands: [],
          source: "unsupported",
          cached: false,
        };
      }
      return yield* adapter.listCommands({
        ...parsed,
        cwd: scope.cwd,
        resourceScope: scope.resourceScope,
      });
    });

  const listPlugins: ProviderDiscoveryServiceShape["listPlugins"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "ProviderDiscoveryService.listPlugins",
        schema: ProviderListPluginsInput,
        payload: input,
      });
      const adapter = yield* registry.getByProvider(parsed.provider);
      if (!adapter.listPlugins) {
        return {
          marketplaces: [],
          marketplaceLoadErrors: [],
          remoteSyncError: null,
          featuredPluginIds: [],
          source: "unsupported",
          cached: false,
        };
      }
      return yield* adapter.listPlugins(parsed);
    });

  const readPlugin: ProviderDiscoveryServiceShape["readPlugin"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "ProviderDiscoveryService.readPlugin",
        schema: ProviderReadPluginInput,
        payload: input,
      });
      const adapter = yield* registry.getByProvider(parsed.provider);
      if (!adapter.readPlugin) {
        return yield* new ProviderValidationError({
          operation: "ProviderDiscoveryService.readPlugin",
          issue: `Plugin discovery is unavailable for provider '${parsed.provider}'.`,
        });
      }
      return yield* adapter.readPlugin(parsed);
    });

  const listModels: ProviderDiscoveryServiceShape["listModels"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "ProviderDiscoveryService.listModels",
        schema: ProviderListModelsInput,
        payload: input,
      });
      // The enabled check is a short-circuit, not a precondition, and
      // ServerSettingsError is outside this operation's error channel. An
      // unreadable settings file falls back to discovering models, which is
      // what this call did before the gate existed.
      const settings = yield* serverSettings.getSettings.pipe(
        Effect.catch(() => Effect.succeed(null)),
      );
      if (settings !== null && !settings.providers[parsed.provider].enabled) {
        return {
          models: [],
          source: "disabled",
          cached: false,
        };
      }
      const adapter = yield* registry.getByProvider(parsed.provider);
      if (!adapter.listModels) {
        return {
          models: [],
          source: "unsupported",
          cached: false,
        };
      }
      const result = yield* adapter.listModels(parsed);
      return yield* isolateMalformedModelDescriptors({
        provider: parsed.provider,
        result,
      });
    });

  const listAgents: ProviderDiscoveryServiceShape["listAgents"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "ProviderDiscoveryService.listAgents",
        schema: ProviderListAgentsInput,
        payload: input,
      });
      const adapter = yield* registry.getByProvider(parsed.provider);
      if (!adapter.listAgents) {
        return {
          agents: [],
          source: "unsupported",
          cached: false,
        };
      }
      return yield* adapter.listAgents(parsed);
    });

  return {
    getComposerCapabilities,
    listCommands,
    listSkills,
    listPlugins,
    readPlugin,
    listModels,
    listAgents,
  } satisfies ProviderDiscoveryServiceShape;
});

export const ProviderDiscoveryServiceLive = Layer.effect(ProviderDiscoveryService, make);
