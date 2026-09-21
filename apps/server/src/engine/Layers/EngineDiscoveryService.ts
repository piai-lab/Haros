import {
  DEFAULT_SERVER_SETTINGS,
  type EngineComposerCapabilities,
  EngineGetComposerCapabilitiesInput,
  EngineListAgentsInput,
  EngineListCommandsInput,
  EngineListModelsInput,
  type EngineListModelsResult,
  EngineListPluginsInput,
  EngineModelDescriptor,
  EngineListSkillsInput,
  type EngineListSkillsResult,
  EngineReadPluginInput,
  type EngineSkillDiscoveryWarning,
  type EngineSkillDescriptor,
  ThreadId,
} from "@harnessos/contracts";
import { isServerEngineEnabled } from "@harnessos/shared/serverSettings";
import { Effect, Layer, Option, Schema, SchemaIssue } from "effect";

import { ServerConfig } from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { ProjectionSnapshotQuery } from "../../orchestration/Services/ProjectionSnapshotQuery.ts";
import { resolveThreadWorkspaceCwd } from "../../checkpointing/Utils.ts";
import { EngineValidationError } from "../Errors.ts";
import { EngineAdapterRegistry } from "../Services/EngineAdapterRegistry.ts";
import {
  EngineDiscoveryService,
  type EngineDiscoveryServiceShape,
} from "../Services/EngineDiscoveryService.ts";
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
        new EngineValidationError({
          operation: input.operation,
          issue: SchemaIssue.makeFormatterDefault()(schemaError.issue),
          cause: schemaError,
        }),
    ),
  );

type NativeSkillDiscovery = EngineListSkillsResult | "failed" | "unsupported";
type CatalogSkillDiscovery = ReadonlyArray<EngineSkillDescriptor> | "failed";

export function combineProviderSkills(input: {
  readonly native: NativeSkillDiscovery;
  readonly catalog: CatalogSkillDiscovery;
  readonly disabledSkillNames: ReadonlyArray<string>;
}): EngineListSkillsResult {
  const nativeResult = typeof input.native === "string" ? null : input.native;
  const catalogSkills = input.catalog === "failed" ? [] : input.catalog;
  const warnings: EngineSkillDiscoveryWarning[] = [];
  if (input.native === "failed") {
    warnings.push({ source: "engine-native", reason: "discovery-failed" });
  }
  if (input.catalog === "failed") {
    warnings.push({ source: "harnessos-library", reason: "discovery-failed" });
  }
  const nativeSource = nativeResult ? (nativeResult.source ?? "engine-native") : null;
  const catalogSource = input.catalog === "failed" ? null : "harnessos.catalog";
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

const decodeProviderModelDescriptorOption = Schema.decodeUnknownOption(EngineModelDescriptor);

function isolateMalformedModelDescriptors(input: {
  readonly engine: EngineListModelsInput["engine"];
  readonly result: EngineListModelsResult;
}): Effect.Effect<EngineListModelsResult> {
  const models = input.result.models.flatMap((model) => {
    const decoded = decodeProviderModelDescriptorOption(model);
    return Option.isSome(decoded) ? [decoded.value] : [];
  });
  const omittedCount = input.result.models.length - models.length;
  if (omittedCount === 0) {
    return Effect.succeed(input.result);
  }
  return Effect.logWarning("engine model discovery omitted malformed descriptors", {
    engine: input.engine,
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
  const registry = yield* EngineAdapterRegistry;
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

  const getComposerCapabilities: EngineDiscoveryServiceShape["getComposerCapabilities"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "EngineDiscoveryService.getComposerCapabilities",
        schema: EngineGetComposerCapabilitiesInput,
        payload: input,
      });
      const adapter = yield* registry.getByEngine(parsed.engine);
      const capabilities: EngineComposerCapabilities = {
        engine: parsed.engine,
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
      // The unified Haros skills catalog backs skill discovery for every
      // engine, including ones without native skill support.
      return {
        ...capabilities,
        supportsSkillMentions: true,
        supportsSkillDiscovery: true,
      };
    });

  const listSkills: EngineDiscoveryServiceShape["listSkills"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "EngineDiscoveryService.listSkills",
        schema: EngineListSkillsInput,
        payload: input,
      });
      const scope = yield* resolveResourceScope(parsed);
      const scopedInput = {
        ...parsed,
        cwd: scope.cwd,
        resourceScope: scope.resourceScope,
      };
      const adapter = yield* registry.getByEngine(parsed.engine);
      const nativeDiscovery = adapter.listSkills
        ? yield* adapter.listSkills(scopedInput).pipe(
            Effect.map((result) => ({ _tag: "success", result }) as const),
            Effect.catch(() =>
              Effect.logWarning("engine-native skill discovery failed", {
                engine: parsed.engine,
                surface: "skills",
              }).pipe(Effect.as({ _tag: "failed" } as const)),
            ),
          )
        : ({ _tag: "unsupported" } as const);
      const catalogDiscovery = yield* Effect.tryPromise(() =>
        discoverSkillsCatalog({
          ...(scope.resourceScope.kind === "project" ? { cwd: scope.cwd } : {}),
          homeDir: serverConfig.homeDir,
          harnessosBaseDir: serverConfig.baseDir,
          engine: parsed.engine,
          includeDuplicateOrigins: true,
          ...(parsed.forceReload !== undefined ? { forceReload: parsed.forceReload } : {}),
        }),
      ).pipe(
        Effect.map((skills) => ({ _tag: "success", skills }) as const),
        Effect.catchCause(() =>
          Effect.logWarning("harnessos skills catalog discovery failed", {
            engine: parsed.engine,
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

  const listCommands: EngineDiscoveryServiceShape["listCommands"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "EngineDiscoveryService.listCommands",
        schema: EngineListCommandsInput,
        payload: input,
      });
      const scope = yield* resolveResourceScope(parsed);
      const adapter = yield* registry.getByEngine(parsed.engine);
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

  const listPlugins: EngineDiscoveryServiceShape["listPlugins"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "EngineDiscoveryService.listPlugins",
        schema: EngineListPluginsInput,
        payload: input,
      });
      const adapter = yield* registry.getByEngine(parsed.engine);
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

  const readPlugin: EngineDiscoveryServiceShape["readPlugin"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "EngineDiscoveryService.readPlugin",
        schema: EngineReadPluginInput,
        payload: input,
      });
      const adapter = yield* registry.getByEngine(parsed.engine);
      if (!adapter.readPlugin) {
        return yield* new EngineValidationError({
          operation: "EngineDiscoveryService.readPlugin",
          issue: `Plugin discovery is unavailable for engine '${parsed.engine}'.`,
        });
      }
      return yield* adapter.readPlugin(parsed);
    });

  const listModels: EngineDiscoveryServiceShape["listModels"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "EngineDiscoveryService.listModels",
        schema: EngineListModelsInput,
        payload: input,
      });
      // The enabled check is a short-circuit, not a precondition, and
      // ServerSettingsError is outside this operation's error channel. An
      // unreadable settings file falls back to discovering models, which is
      // what this call did before the gate existed.
      const settings = yield* serverSettings.getSettings.pipe(
        Effect.catch(() => Effect.succeed(null)),
      );
      if (settings !== null && !isServerEngineEnabled(settings, parsed.engine)) {
        return {
          models: [],
          source: "disabled",
          cached: false,
        };
      }
      const adapter = yield* registry.getByEngine(parsed.engine);
      if (!adapter.listModels) {
        return {
          models: [],
          source: "unsupported",
          cached: false,
        };
      }
      const result = yield* adapter.listModels(parsed);
      return yield* isolateMalformedModelDescriptors({
        engine: parsed.engine,
        result,
      });
    });

  const listAgents: EngineDiscoveryServiceShape["listAgents"] = (input) =>
    Effect.gen(function* () {
      const parsed = yield* decodeInputOrValidationError({
        operation: "EngineDiscoveryService.listAgents",
        schema: EngineListAgentsInput,
        payload: input,
      });
      const adapter = yield* registry.getByEngine(parsed.engine);
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
  } satisfies EngineDiscoveryServiceShape;
});

export const EngineDiscoveryServiceLive = Layer.effect(EngineDiscoveryService, make);
