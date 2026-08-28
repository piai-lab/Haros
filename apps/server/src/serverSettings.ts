/**
 * ServerSettings - Server-authoritative settings persistence.
 *
 * Owns settings that affect server-side behavior. The web app can continue to
 * keep UI-only preferences in local storage while these values become durable
 * and process-authoritative on the server.
 */
import {
  BUILT_IN_TOOL_GROUP_OVERRIDE_MAX_KEYS,
  BUILT_IN_TOOL_GROUP_IDS,
  BUILT_IN_TOOL_SURFACES,
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_SERVER_SETTINGS,
  type EngineSelection,
  type EngineWithDefaultModel,
  ServerSettings,
  ServerSettingsError,
  type ServerSettingsPatch,
  type ServerSettingsView,
} from "@harnessos/contracts";
import { deepMerge, type DeepPartial } from "@harnessos/shared/Struct";
import {
  applyServerSettingsPatch,
  normalizeServerSettings,
  validateServerSettingsPatch,
} from "@harnessos/shared/serverSettings";
import {
  isBuiltInToolGroupId,
  resolveHostGroupSurfacePolicy,
} from "@harnessos/shared/hostToolSurfacePolicy";
import {
  Cause,
  Deferred,
  Effect,
  FileSystem,
  Layer,
  Path,
  PubSub,
  Ref,
  Schema,
  SchemaIssue,
  ServiceMap,
  Stream,
} from "effect";
import * as Semaphore from "effect/Semaphore";
import { writeFileStringAtomically } from "./atomicWrite";
import { ServerConfig } from "./config";
import {
  EngineCredentials,
  EngineCredentialsLive,
  type ExternalEngineServer,
} from "./engineCredentials";

export interface ServerSettingsShape {
  readonly start: Effect.Effect<void, ServerSettingsError>;
  readonly ready: Effect.Effect<void, ServerSettingsError>;
  readonly getSettings: Effect.Effect<ServerSettings, ServerSettingsError>;
  readonly getSettingsView: Effect.Effect<ServerSettingsView, ServerSettingsError>;
  readonly getSnapshot: Effect.Effect<ServerSettingsSnapshot, ServerSettingsError>;
  readonly updateSettings: (
    patch: ServerSettingsPatch,
  ) => Effect.Effect<ServerSettings, ServerSettingsError>;
  readonly updateSettingsView: (
    patch: ServerSettingsPatch,
  ) => Effect.Effect<ServerSettingsView, ServerSettingsError>;
  readonly resetSettingsView: Effect.Effect<ServerSettingsView, ServerSettingsError>;
  readonly updateEngineCredential: (
    engine: ExternalEngineServer,
    serverPassword: string,
  ) => Effect.Effect<ServerSettingsView, ServerSettingsError>;
  readonly mutateOmniMindDefaultPrompt: (
    expected: string | null,
    next: string | null,
  ) => Effect.Effect<OmniMindDefaultPromptMutationResult, ServerSettingsError>;
  readonly streamChanges: Stream.Stream<ServerSettings>;
  readonly streamViews: Stream.Stream<ServerSettingsView>;
}

export interface OmniMindDefaultPromptMutationResult {
  readonly state: "changed" | "unchanged" | "conflict";
  readonly current: string | null;
}

export interface ServerSettingsSnapshot {
  readonly revision: number;
  readonly migrationVersion: number;
  readonly settings: ServerSettings;
}

const SERVER_SETTINGS_MIGRATION_VERSION = 4;
const LEGACY_HARNESSOS_BUILT_IN_GROUP = "oa";
const HARNESSOS_FINE_GRAINED_BUILT_IN_GROUPS = [
  "tasks",
  "diagnostics",
  "goals",
  "automations",
] as const;

export function toServerSettingsView(settings: ServerSettings): ServerSettingsView {
  const { defaultPrompt: _defaultPrompt, ...oa } = settings.engines.oa;
  return {
    ...settings,
    engines: {
      ...settings.engines,
      oa,
    },
  };
}

export class ServerSettingsService extends ServiceMap.Service<
  ServerSettingsService,
  ServerSettingsShape
>()("harnessos/serverSettings/ServerSettingsService") {
  static readonly layerTest = (overrides: DeepPartial<ServerSettings> = {}) =>
    Layer.effect(
      ServerSettingsService,
      Effect.gen(function* () {
        const currentSettingsRef = yield* Ref.make<ServerSettings>(
          normalizeServerSettings(deepMerge(DEFAULT_SERVER_SETTINGS, overrides)),
        );
        const changesPubSub = yield* PubSub.unbounded<ServerSettings>();
        const revisionRef = yield* Ref.make(0);
        const writeSemaphore = yield* Semaphore.make(1);
        const emitChange = (settings: ServerSettings) =>
          PubSub.publish(changesPubSub, settings).pipe(Effect.asVoid);
        const getSettings = Ref.get(currentSettingsRef).pipe(
          Effect.map(resolveTextGenerationEngine),
        );
        const updateSettings = (patch: ServerSettingsPatch) =>
          writeSemaphore.withPermits(1)(
            Ref.get(currentSettingsRef).pipe(
              Effect.flatMap((currentSettings) =>
                normalizeSettings("<memory>", currentSettings, patch),
              ),
              Effect.tap((nextSettings) => Ref.set(currentSettingsRef, nextSettings)),
              Effect.tap(() => Ref.update(revisionRef, (revision) => revision + 1)),
              Effect.tap(emitChange),
              Effect.map(resolveTextGenerationEngine),
            ),
          );
        const updateEngineCredential = (engine: ExternalEngineServer, serverPassword: string) =>
          writeSemaphore.withPermits(1)(
            Effect.gen(function* () {
              const configured = serverPassword.trim().length > 0;
              const current = yield* Ref.get(currentSettingsRef);
              const next = {
                ...current,
                engines: {
                  ...current.engines,
                  [engine]: {
                    ...current.engines[engine],
                    serverPasswordConfigured: configured,
                  },
                },
              } satisfies ServerSettings;
              yield* Ref.set(currentSettingsRef, next);
              yield* emitChange(next);
              return toServerSettingsView(resolveTextGenerationEngine(next));
            }),
          );
        const resetSettingsView = writeSemaphore.withPermits(1)(
          Effect.gen(function* () {
            const current = yield* Ref.get(currentSettingsRef);
            const next = {
              ...DEFAULT_SERVER_SETTINGS,
              engines: {
                ...DEFAULT_SERVER_SETTINGS.engines,
                oa: {
                  ...DEFAULT_SERVER_SETTINGS.engines.oa,
                  defaultPrompt: current.engines.oa.defaultPrompt,
                },
                kilo: {
                  ...DEFAULT_SERVER_SETTINGS.engines.kilo,
                  serverPasswordConfigured: current.engines.kilo.serverPasswordConfigured,
                },
                opencode: {
                  ...DEFAULT_SERVER_SETTINGS.engines.opencode,
                  serverPasswordConfigured: current.engines.opencode.serverPasswordConfigured,
                },
              },
            } satisfies ServerSettings;
            yield* Ref.set(currentSettingsRef, next);
            yield* Ref.update(revisionRef, (revision) => revision + 1);
            yield* emitChange(next);
            return toServerSettingsView(next);
          }),
        );
        const mutateOmniMindDefaultPrompt = (expected: string | null, next: string | null) =>
          writeSemaphore.withPermits(1)(
            Effect.gen(function* () {
              const currentSettings = yield* Ref.get(currentSettingsRef);
              const current = currentSettings.engines.oa.defaultPrompt;
              if (current !== expected) return { state: "conflict" as const, current };
              if (current === next) return { state: "unchanged" as const, current };
              const nextSettings = yield* replaceOmniMindDefaultPrompt(
                "<memory>",
                currentSettings,
                next,
              );
              yield* Ref.set(currentSettingsRef, nextSettings);
              yield* Ref.update(revisionRef, (revision) => revision + 1);
              yield* emitChange(nextSettings);
              return { state: "changed" as const, current: next };
            }),
          );

        return {
          start: Effect.void,
          ready: Effect.void,
          getSettings,
          getSettingsView: getSettings.pipe(Effect.map(toServerSettingsView)),
          getSnapshot: writeSemaphore.withPermits(1)(
            Effect.all({
              revision: Ref.get(revisionRef),
              settings: getSettings,
            }).pipe(
              Effect.map(({ revision, settings }) => ({
                revision,
                migrationVersion: SERVER_SETTINGS_MIGRATION_VERSION,
                settings,
              })),
            ),
          ),
          updateSettings,
          updateSettingsView: (patch) =>
            updateSettings(patch).pipe(Effect.map(toServerSettingsView)),
          resetSettingsView,
          updateEngineCredential,
          mutateOmniMindDefaultPrompt,
          get streamChanges() {
            return Stream.fromPubSub(changesPubSub).pipe(Stream.map(resolveTextGenerationEngine));
          },
          get streamViews() {
            return Stream.fromPubSub(changesPubSub).pipe(
              Stream.map(resolveTextGenerationEngine),
              Stream.map(toServerSettingsView),
            );
          },
        } satisfies ServerSettingsShape;
      }),
    );
}

const ENGINE_ORDER: readonly EngineWithDefaultModel[] = ["codex", "claude", "kilo", "opencode"];

function resolveTextGenerationEngine(settings: ServerSettings): ServerSettings {
  const selection = settings.textGenerationEngineSelection;
  if (settings.engines[selection.engine].enabled) {
    return settings;
  }

  const fallback = ENGINE_ORDER.find((engine) => settings.engines[engine].enabled);
  if (!fallback) {
    return settings;
  }

  return {
    ...settings,
    textGenerationEngineSelection: {
      engine: fallback,
      model: DEFAULT_MODEL_BY_PROVIDER[fallback],
    } as EngineSelection,
  };
}

function normalizeSettings(
  settingsPath: string,
  current: ServerSettings,
  patch: ServerSettingsPatch,
): Effect.Effect<ServerSettings, ServerSettingsError> {
  const patchError = validateServerSettingsPatch(current, patch);
  if (patchError !== null) {
    return Effect.fail(
      new ServerSettingsError({
        settingsPath,
        detail: `failed to normalize server settings: ${patchError}`,
      }),
    );
  }
  return Schema.decodeUnknownEffect(ServerSettings)(applyServerSettingsPatch(current, patch)).pipe(
    Effect.mapError(
      (cause) =>
        new ServerSettingsError({
          settingsPath,
          detail: `failed to normalize server settings: ${SchemaIssue.makeFormatterDefault()(cause.issue)}`,
          cause,
        }),
    ),
  );
}

function replaceOmniMindDefaultPrompt(
  settingsPath: string,
  current: ServerSettings,
  defaultPrompt: string | null,
): Effect.Effect<ServerSettings, ServerSettingsError> {
  return Schema.decodeUnknownEffect(ServerSettings)({
    ...current,
    engines: {
      ...current.engines,
      oa: {
        ...current.engines.oa,
        defaultPrompt,
      },
    },
  }).pipe(
    Effect.mapError(
      (cause) =>
        new ServerSettingsError({
          settingsPath,
          detail: `failed to normalize OmniMind default prompt: ${SchemaIssue.makeFormatterDefault()(cause.issue)}`,
          cause,
        }),
    ),
  );
}

const EXTERNAL_SERVER_PROVIDERS = ["kilo", "opencode"] as const;

function readLegacyEnginePasswords(raw: string): ReadonlyMap<ExternalEngineServer, string> {
  try {
    const parsed = JSON.parse(raw) as {
      engines?: Partial<Record<ExternalEngineServer, { readonly serverPassword?: unknown }>>;
    };
    const passwords = new Map<ExternalEngineServer, string>();
    for (const engine of EXTERNAL_SERVER_PROVIDERS) {
      const value = parsed.engines?.[engine]?.serverPassword;
      if (typeof value === "string" && value.trim().length > 0) {
        passwords.set(engine, value.trim());
      }
    }
    return passwords;
  } catch {
    return new Map();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function migrateLegacyBuiltInGroupIntent(
  settings: unknown,
  migrationVersion: number,
): {
  readonly settings: unknown;
  readonly migrated: boolean;
} {
  if (!isRecord(settings)) return { settings, migrated: false };
  let migrated = migrationVersion < SERVER_SETTINGS_MIGRATION_VERSION;
  let disabledBuiltInGroups: unknown;
  if (!Object.hasOwn(settings, "agentTools")) {
    disabledBuiltInGroups = [];
    migrated = true;
  } else if (!isRecord(settings.agentTools)) {
    return { settings, migrated: false };
  } else if (!Object.hasOwn(settings.agentTools, "disabledBuiltInGroups")) {
    disabledBuiltInGroups = [];
    migrated = true;
  } else {
    disabledBuiltInGroups = settings.agentTools.disabledBuiltInGroups;
  }

  if (migrationVersion < 3 && Array.isArray(disabledBuiltInGroups)) {
    const expanded = disabledBuiltInGroups.flatMap((group) =>
      group === LEGACY_HARNESSOS_BUILT_IN_GROUP ? HARNESSOS_FINE_GRAINED_BUILT_IN_GROUPS : [group],
    );
    if (expanded.length !== disabledBuiltInGroups.length) migrated = true;
    disabledBuiltInGroups = expanded;
  }

  if (migrationVersion >= SERVER_SETTINGS_MIGRATION_VERSION) {
    return { settings, migrated: false };
  }

  const legacyDisabled = new Set<string>();
  if (Array.isArray(disabledBuiltInGroups)) {
    for (const value of disabledBuiltInGroups) {
      if (
        typeof value === "string" &&
        value.length <= 64 &&
        /^[a-z0-9-]+$/u.test(value) &&
        legacyDisabled.size < 32
      ) {
        legacyDisabled.add(value);
      }
    }
  }

  const builtInGroupOverrides: Partial<
    Record<(typeof BUILT_IN_TOOL_SURFACES)[number], Record<string, boolean>>
  > = {};
  const ensureSurface = (surface: (typeof BUILT_IN_TOOL_SURFACES)[number]) =>
    (builtInGroupOverrides[surface] ??= {});
  for (const group of BUILT_IN_TOOL_GROUP_IDS) {
    const legacyEnabled = !legacyDisabled.has(group);
    for (const surface of ["agent", "studio"] as const) {
      const policy = resolveHostGroupSurfacePolicy(group, surface);
      if (policy.supported && legacyEnabled !== policy.defaultEnabled) {
        ensureSurface(surface)[group] = legacyEnabled;
      }
    }
    if (group === "browser") {
      const policy = resolveHostGroupSurfacePolicy(group, "chat");
      if (legacyEnabled !== policy.defaultEnabled) {
        ensureSurface("chat")[group] = legacyEnabled;
      }
    }
  }
  for (const group of legacyDisabled) {
    if (isBuiltInToolGroupId(group)) continue;
    for (const surface of BUILT_IN_TOOL_SURFACES) {
      const surfaceOverrides = ensureSurface(surface);
      if (Object.keys(surfaceOverrides).length < BUILT_IN_TOOL_GROUP_OVERRIDE_MAX_KEYS) {
        surfaceOverrides[group] = false;
      }
    }
  }

  const legacyAgentTools = isRecord(settings.agentTools) ? settings.agentTools : {};
  const { disabledBuiltInGroups: _disabledBuiltInGroups, ...retainedAgentTools } = legacyAgentTools;
  return {
    settings: {
      ...settings,
      agentTools: {
        ...retainedAgentTools,
        builtInGroupOverrides,
      },
    },
    migrated,
  };
}

function decodeSettingsFromJson(settingsPath: string, raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const envelope =
      parsed !== null && typeof parsed === "object" && "settings" in parsed
        ? (parsed as { revision?: unknown; migrationVersion?: unknown; settings: unknown })
        : null;
    const migrationVersion =
      envelope && Number.isSafeInteger(envelope.migrationVersion)
        ? Number(envelope.migrationVersion)
        : 0;
    const legacyBuiltInGroupIntent = migrateLegacyBuiltInGroupIntent(
      envelope?.settings ?? parsed,
      migrationVersion,
    );
    const decoded = Schema.decodeUnknownExit(ServerSettings)(legacyBuiltInGroupIntent.settings);
    if (decoded._tag === "Failure") {
      return { _tag: "Failure" as const, error: Cause.pretty(decoded.cause) };
    }
    return {
      _tag: "Success" as const,
      value: normalizeServerSettings(decoded.value),
      revision:
        envelope && Number.isSafeInteger(envelope.revision) && Number(envelope.revision) >= 0
          ? Number(envelope.revision)
          : 0,
      migrationVersion,
      legacyFormat: envelope === null,
      builtInGroupIntentMigrated: legacyBuiltInGroupIntent.migrated,
    };
  } catch (cause) {
    const error = new ServerSettingsError({
      settingsPath,
      detail: "failed to parse settings JSON",
      cause,
    });
    return { _tag: "Failure" as const, error: error.message };
  }
}

const makeServerSettings = Effect.gen(function* () {
  const { settingsPath } = yield* ServerConfig;
  const engineCredentials = yield* EngineCredentials;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const writeSemaphore = yield* Semaphore.make(1);
  const changesPubSub = yield* PubSub.unbounded<ServerSettings>();
  const settingsRef = yield* Ref.make<ServerSettings>(DEFAULT_SERVER_SETTINGS);
  const revisionRef = yield* Ref.make(0);
  const startedRef = yield* Ref.make(false);
  const startedDeferred = yield* Deferred.make<void, ServerSettingsError>();

  const emitChange = (settings: ServerSettings) =>
    PubSub.publish(changesPubSub, settings).pipe(Effect.asVoid);

  const withCredentialState = (settings: ServerSettings) =>
    Effect.all({
      kilo: engineCredentials.isServerPasswordConfigured("kilo"),
      opencode: engineCredentials.isServerPasswordConfigured("opencode"),
    }).pipe(
      Effect.map(
        (configured): ServerSettings => ({
          ...settings,
          engines: {
            ...settings.engines,
            kilo: {
              ...settings.engines.kilo,
              serverPasswordConfigured: configured.kilo,
            },
            opencode: {
              ...settings.engines.opencode,
              serverPasswordConfigured: configured.opencode,
            },
          },
        }),
      ),
      Effect.mapError(
        (cause) =>
          new ServerSettingsError({
            settingsPath,
            detail: "failed to read engine credential state",
            cause,
          }),
      ),
    );

  const loadSettingsFromDisk = Effect.gen(function* () {
    const exists = yield* fs.exists(settingsPath).pipe(
      Effect.mapError(
        (cause) =>
          new ServerSettingsError({
            settingsPath,
            detail: "failed to check settings file existence",
            cause,
          }),
      ),
    );
    if (!exists) {
      return {
        settings: yield* withCredentialState(DEFAULT_SERVER_SETTINGS),
        revision: 0,
        migrated: false,
      };
    }

    const raw = yield* fs.readFileString(settingsPath).pipe(
      Effect.mapError(
        (cause) =>
          new ServerSettingsError({
            settingsPath,
            detail: "failed to read settings file",
            cause,
          }),
      ),
    );
    const decoded = decodeSettingsFromJson(settingsPath, raw);
    if (decoded._tag === "Failure") {
      const quarantinePath = `${settingsPath}.invalid-${Date.now()}`;
      yield* fs.rename(settingsPath, quarantinePath).pipe(Effect.catch(() => Effect.void));
      yield* Effect.logWarning("quarantined invalid settings.json, using defaults", {
        path: settingsPath,
        quarantinePath,
        error: decoded.error,
      });
      return {
        settings: yield* withCredentialState(DEFAULT_SERVER_SETTINGS),
        revision: 0,
        migrated: false,
      };
    }
    const legacyPasswords = readLegacyEnginePasswords(raw);
    yield* Effect.forEach(
      legacyPasswords,
      ([engine, password]) => engineCredentials.replaceServerPassword(engine, password),
      { discard: true },
    ).pipe(
      Effect.mapError(
        (cause) =>
          new ServerSettingsError({
            settingsPath,
            detail: "failed to migrate engine credentials",
            cause,
          }),
      ),
    );
    return {
      settings: yield* withCredentialState(decoded.value),
      revision: decoded.revision,
      migrated:
        legacyPasswords.size > 0 ||
        decoded.legacyFormat ||
        decoded.builtInGroupIntentMigrated ||
        decoded.migrationVersion !== SERVER_SETTINGS_MIGRATION_VERSION,
    };
  });

  const writeSettingsAtomically = (snapshot: ServerSettingsSnapshot) => {
    return writeFileStringAtomically({
      filePath: settingsPath,
      contents: `${JSON.stringify(snapshot, null, 2)}\n`,
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ServerSettingsError({
            settingsPath,
            detail: "failed to write settings file",
            cause,
          }),
      ),
    );
  };

  const start = Effect.gen(function* () {
    const shouldStart = yield* Ref.modify(startedRef, (started) => [!started, true]);
    if (!shouldStart) {
      return yield* Deferred.await(startedDeferred);
    }

    const startup = Effect.gen(function* () {
      yield* fs.makeDirectory(path.dirname(settingsPath), { recursive: true }).pipe(
        Effect.mapError(
          (cause) =>
            new ServerSettingsError({
              settingsPath,
              detail: "failed to prepare settings directory",
              cause,
            }),
        ),
      );
      const loaded = yield* loadSettingsFromDisk;
      if (loaded.migrated) {
        loaded.revision += 1;
        yield* writeSettingsAtomically({
          revision: loaded.revision,
          migrationVersion: SERVER_SETTINGS_MIGRATION_VERSION,
          settings: loaded.settings,
        });
      }
      yield* Ref.set(settingsRef, loaded.settings);
      yield* Ref.set(revisionRef, loaded.revision);
    });

    const startupExit = yield* Effect.exit(startup);
    if (startupExit._tag === "Failure") {
      yield* Deferred.failCause(startedDeferred, startupExit.cause).pipe(Effect.orDie);
      return yield* Effect.failCause(startupExit.cause);
    }

    yield* Deferred.succeed(startedDeferred, undefined).pipe(Effect.orDie);
  });

  const getSettings = Ref.get(settingsRef).pipe(Effect.map(resolveTextGenerationEngine));
  const updateSettings = (patch: ServerSettingsPatch) =>
    writeSemaphore.withPermits(1)(
      Effect.gen(function* () {
        const disk = yield* loadSettingsFromDisk;
        const current = disk.settings;
        const normalized = yield* normalizeSettings(settingsPath, current, patch);
        const next = yield* withCredentialState(normalized);
        const nextRevision = Math.max(disk.revision, yield* Ref.get(revisionRef)) + 1;
        yield* writeSettingsAtomically({
          revision: nextRevision,
          migrationVersion: SERVER_SETTINGS_MIGRATION_VERSION,
          settings: next,
        });
        yield* Ref.set(settingsRef, next);
        yield* Ref.set(revisionRef, nextRevision);
        yield* emitChange(next);
        return resolveTextGenerationEngine(next);
      }),
    );

  const mutateOmniMindDefaultPrompt = (expected: string | null, nextValue: string | null) =>
    writeSemaphore.withPermits(1)(
      Effect.gen(function* () {
        const disk = yield* loadSettingsFromDisk;
        const current = disk.settings.engines.oa.defaultPrompt;
        if (current !== expected) return { state: "conflict" as const, current };
        if (current === nextValue) return { state: "unchanged" as const, current };
        const next = yield* replaceOmniMindDefaultPrompt(settingsPath, disk.settings, nextValue);
        const nextRevision = Math.max(disk.revision, yield* Ref.get(revisionRef)) + 1;
        yield* writeSettingsAtomically({
          revision: nextRevision,
          migrationVersion: SERVER_SETTINGS_MIGRATION_VERSION,
          settings: next,
        });
        yield* Ref.set(settingsRef, next);
        yield* Ref.set(revisionRef, nextRevision);
        yield* emitChange(next);
        return { state: "changed" as const, current: nextValue };
      }),
    );

  const updateEngineCredential = (engine: ExternalEngineServer, serverPassword: string) =>
    writeSemaphore.withPermits(1)(
      Effect.gen(function* () {
        // Refresh non-secret settings before committing the credential. If the
        // settings file cannot be read, fail before the secret owner changes;
        // after credential acceptance, projection cannot fail independently.
        const disk = yield* loadSettingsFromDisk;
        yield* engineCredentials.replaceServerPassword(engine, serverPassword).pipe(
          Effect.mapError(
            (cause) =>
              new ServerSettingsError({
                settingsPath,
                detail: `failed to update ${engine} server credential`,
                cause,
              }),
          ),
        );
        // Ordinary mutations and external file edits both converge through the
        // same serialized snapshot before the credential-blind push is emitted.
        const current = disk.settings;
        const configured = serverPassword.trim().length > 0;
        const fresh = resolveTextGenerationEngine({
          ...current,
          engines: {
            ...current.engines,
            [engine]: {
              ...current.engines[engine],
              serverPasswordConfigured: configured,
            },
          },
        });
        yield* Ref.set(settingsRef, fresh);
        yield* Ref.update(revisionRef, (revision) => Math.max(revision, disk.revision));
        yield* emitChange(fresh);
        return toServerSettingsView(fresh);
      }),
    );

  const resetSettingsView = writeSemaphore.withPermits(1)(
    Effect.gen(function* () {
      const disk = yield* loadSettingsFromDisk;
      const credentialState = yield* withCredentialState(DEFAULT_SERVER_SETTINGS);
      const next = {
        ...credentialState,
        engines: {
          ...credentialState.engines,
          oa: {
            ...credentialState.engines.oa,
            defaultPrompt: disk.settings.engines.oa.defaultPrompt,
          },
        },
      } satisfies ServerSettings;
      const nextRevision = Math.max(disk.revision, yield* Ref.get(revisionRef)) + 1;
      yield* writeSettingsAtomically({
        revision: nextRevision,
        migrationVersion: SERVER_SETTINGS_MIGRATION_VERSION,
        settings: next,
      });
      yield* Ref.set(settingsRef, next);
      yield* Ref.set(revisionRef, nextRevision);
      yield* emitChange(next);
      return toServerSettingsView(resolveTextGenerationEngine(next));
    }),
  );

  return {
    start,
    ready: Deferred.await(startedDeferred),
    getSettings,
    getSettingsView: getSettings.pipe(Effect.map(toServerSettingsView)),
    getSnapshot: writeSemaphore.withPermits(1)(
      Effect.all({ revision: Ref.get(revisionRef), settings: getSettings }).pipe(
        Effect.map(({ revision, settings }) => ({
          revision,
          migrationVersion: SERVER_SETTINGS_MIGRATION_VERSION,
          settings,
        })),
      ),
    ),
    updateSettings,
    updateSettingsView: (patch) => updateSettings(patch).pipe(Effect.map(toServerSettingsView)),
    resetSettingsView,
    updateEngineCredential,
    mutateOmniMindDefaultPrompt,
    get streamChanges() {
      return Stream.fromPubSub(changesPubSub).pipe(Stream.map(resolveTextGenerationEngine));
    },
    get streamViews() {
      return Stream.fromPubSub(changesPubSub).pipe(
        Stream.map(resolveTextGenerationEngine),
        Stream.map(toServerSettingsView),
      );
    },
  } satisfies ServerSettingsShape;
});

export const ServerSettingsLive = Layer.effect(ServerSettingsService, makeServerSettings).pipe(
  Layer.provide(EngineCredentialsLive),
);
