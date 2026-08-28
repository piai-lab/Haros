// FILE: ProviderDiscoveryService.test.ts
// Purpose: Verifies the discovery service merges provider-native skills with the
//          unified OmniMind catalog, filters user-disabled skills, and reports
//          skill discovery as supported for every provider.
// Layer: Server provider tests

import { mkdtempSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import type {
  OrchestrationProjectShell,
  OrchestrationThreadShell,
  ProviderComposerCapabilities,
  ProviderKind,
  ProviderListModelsResult,
  ProviderListSkillsResult,
} from "@harnessos/contracts";
import { ProjectId, ThreadId } from "@harnessos/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer, Option } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  deriveServerPaths,
  resolveDefaultChatWorkspaceRoot,
  resolveDefaultStudioWorkspaceRoot,
  ServerConfig,
  type ServerConfigShape,
} from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import {
  ProjectionSnapshotQuery,
  type ProjectionSnapshotQueryShape,
} from "../../orchestration/Services/ProjectionSnapshotQuery.ts";
import type { ProviderAdapterError } from "../Errors.ts";
import { ProviderAdapterRequestError } from "../Errors.ts";
import type { ProviderAdapterShape } from "../Services/ProviderAdapter.ts";
import { ProviderAdapterRegistry } from "../Services/ProviderAdapterRegistry.ts";
import { ProviderDiscoveryService } from "../Services/ProviderDiscoveryService.ts";
import { clearSkillsCatalogCacheForTests } from "../skillsCatalog.ts";
import { combineProviderSkills, ProviderDiscoveryServiceLive } from "./ProviderDiscoveryService.ts";

let root: string;
let homeDir: string;
let baseDir: string;
let cwd: string;

async function writeSkill(skillDir: string, name: string): Promise<void> {
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${name} description\n---\n\n# ${name}\n`,
  );
}

const makeConfigLayer = () =>
  Layer.effect(
    ServerConfig,
    Effect.gen(function* () {
      const derived = yield* deriveServerPaths(baseDir, undefined);
      return {
        mode: "web",
        port: 0,
        host: undefined,
        cwd,
        homeDir,
        chatWorkspaceRoot: resolveDefaultChatWorkspaceRoot({ homeDir }),
        studioWorkspaceRoot: resolveDefaultStudioWorkspaceRoot({ homeDir }),
        baseDir,
        ...derived,
        staticDir: undefined,
        devUrl: undefined,
        publicUrl: undefined,
        allowInsecureRemote: false,
        noBrowser: true,
        authToken: undefined,
        autoBootstrapProjectFromCwd: false,
        logProviderEvents: false,
        logWebSocketEvents: false,
      } satisfies ServerConfigShape;
    }),
  );

const makeRegistryLayer = (adapter: Partial<ProviderAdapterShape<ProviderAdapterError>>) =>
  Layer.succeed(ProviderAdapterRegistry, {
    getByProvider: () => Effect.succeed(adapter as ProviderAdapterShape<ProviderAdapterError>),
    listProviders: () => Effect.succeed([]),
  });

const runListSkills = (input: {
  adapter: Partial<ProviderAdapterShape<ProviderAdapterError>>;
  disabled?: string[];
  provider: ProviderKind;
}) => {
  const baseLayer = Layer.mergeAll(
    makeConfigLayer(),
    ServerSettingsService.layerTest({ skills: { disabled: input.disabled ?? [] } }),
    makeRegistryLayer(input.adapter),
  ).pipe(Layer.provideMerge(NodeServices.layer));
  const testLayer = ProviderDiscoveryServiceLive.pipe(Layer.provideMerge(baseLayer));
  const program = Effect.gen(function* () {
    const discovery = yield* ProviderDiscoveryService;
    return yield* discovery.listSkills({ provider: input.provider, cwd });
  }).pipe(Effect.provide(testLayer));
  return Effect.runPromise(
    program as unknown as Effect.Effect<ProviderListSkillsResult, never, never>,
  );
};

const runListModels = (input: {
  adapter: Partial<ProviderAdapterShape<ProviderAdapterError>>;
  enabled: boolean;
}) => {
  const baseLayer = Layer.mergeAll(
    makeConfigLayer(),
    ServerSettingsService.layerTest({
      providers: {
        cursor: {
          enabled: input.enabled,
        },
      },
    }),
    makeRegistryLayer(input.adapter),
  ).pipe(Layer.provideMerge(NodeServices.layer));
  const testLayer = ProviderDiscoveryServiceLive.pipe(Layer.provideMerge(baseLayer));
  const program = Effect.gen(function* () {
    const discovery = yield* ProviderDiscoveryService;
    return yield* discovery.listModels({ provider: "cursor" });
  }).pipe(Effect.provide(testLayer));
  return Effect.runPromise(
    program as unknown as Effect.Effect<ProviderListModelsResult, never, never>,
  );
};

beforeEach(async () => {
  clearSkillsCatalogCacheForTests();
  root = mkdtempSync(path.join(os.tmpdir(), "discovery-service-"));
  homeDir = path.join(root, "home");
  baseDir = path.join(homeDir, ".omnimind");
  cwd = path.join(root, "repo");
  await mkdir(cwd, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("ProviderDiscoveryService.listSkills", () => {
  it.each([
    ["project", "project" as const, "project" as const],
    ["chat", "chat" as const, "global-only" as const],
    ["studio", "studio" as const, "global-only" as const],
  ])(
    "derives %s resource trust from the authoritative Project kind",
    async (_label, projectKind, expectedScope) => {
      const projectId = ProjectId.makeUnsafe(`project-scope-${projectKind}`);
      const threadId = ThreadId.makeUnsafe(`thread-scope-${projectKind}`);
      const authoritativeRoot = path.join(root, `authoritative-${projectKind}`);
      const forgedRendererCwd = path.join(root, "forged-renderer-cwd");
      await mkdir(authoritativeRoot, { recursive: true });
      await mkdir(forgedRendererCwd, { recursive: true });
      const observed: unknown[] = [];
      const adapter = {
        listSkills: (input: unknown) => {
          observed.push(input);
          return Effect.succeed({ skills: [], source: "test", cached: false });
        },
        listCommands: (input: unknown) => {
          observed.push(input);
          return Effect.succeed({ commands: [], source: "test", cached: false });
        },
      } satisfies Partial<ProviderAdapterShape<ProviderAdapterError>>;
      const thread = {
        id: threadId,
        projectId,
        envMode: "local",
        worktreePath: null,
        workingDirectory: null,
      } as OrchestrationThreadShell;
      const project = {
        id: projectId,
        kind: projectKind,
        workspaceRoot: authoritativeRoot,
      } as OrchestrationProjectShell;
      const snapshotQuery = {
        getThreadShellById: () => Effect.succeed(Option.some(thread)),
        getProjectShellById: () => Effect.succeed(Option.some(project)),
      } as unknown as ProjectionSnapshotQueryShape;
      const baseLayer = Layer.mergeAll(
        makeConfigLayer(),
        ServerSettingsService.layerTest(),
        makeRegistryLayer(adapter),
        Layer.succeed(ProjectionSnapshotQuery, snapshotQuery),
      ).pipe(Layer.provideMerge(NodeServices.layer));
      const testLayer = ProviderDiscoveryServiceLive.pipe(Layer.provideMerge(baseLayer));
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const discovery = yield* ProviderDiscoveryService;
          const skills = yield* discovery.listSkills({
            provider: "omnimind",
            cwd: forgedRendererCwd,
            threadId,
          });
          const commands = yield* discovery.listCommands({
            provider: "omnimind",
            cwd: forgedRendererCwd,
            threadId,
          });
          return { skills, commands };
        }).pipe(Effect.provide(testLayer)),
      );

      expect(result.skills.source).toContain("test");
      expect(result.commands.source).toBe("test");
      expect(observed).toHaveLength(2);
      for (const scopedInput of observed) {
        expect(scopedInput).toMatchObject(
          expectedScope === "project"
            ? {
                cwd: authoritativeRoot,
                resourceScope: { kind: "project", authoritativeRoot },
              }
            : {
                cwd: homeDir,
                resourceScope: { kind: "global-only" },
              },
        );
        expect(scopedInput).not.toMatchObject({ cwd: forgedRendererCwd });
      }
    },
  );

  it("fails closed to global-only when no server Thread is available", async () => {
    const observed: unknown[] = [];
    await runListSkills({
      adapter: {
        listSkills: (input) => {
          observed.push(input);
          return Effect.succeed({ skills: [], source: "test", cached: false });
        },
      },
      provider: "omnimind",
    });
    expect(observed[0]).toMatchObject({
      cwd: homeDir,
      resourceScope: { kind: "global-only" },
    });
  });

  it("serves the unified catalog for providers without native skill discovery", async () => {
    await writeSkill(path.join(baseDir, "skills", "portable"), "portable");

    const result = await runListSkills({ adapter: {}, provider: "antigravity" });

    expect(result.skills.map((skill) => skill.name)).toEqual(["portable"]);
    expect(result.source).toBe("omnimind.catalog");
    expect(result.warnings).toEqual([]);
  });

  it("prefers provider-native entries and appends catalog-only skills", async () => {
    await writeSkill(path.join(baseDir, "skills", "shared"), "shared");
    await writeSkill(path.join(baseDir, "skills", "portable"), "portable");

    const nativeShared = {
      name: "shared",
      path: path.join(homeDir, ".codex", "skills", "shared", "SKILL.md"),
      enabled: true,
      scope: "user",
    };
    const result = await runListSkills({
      adapter: {
        listSkills: () =>
          Effect.succeed({ skills: [nativeShared], source: "codex-app-server", cached: false }),
      },
      provider: "codex",
    });

    const shared = result.skills.find((skill) => skill.name === "shared");
    expect(shared?.path).toBe(nativeShared.path);
    expect(result.skills.filter((skill) => skill.name.toLowerCase() === "shared")).toHaveLength(2);
    expect(result.skills.some((skill) => skill.name === "portable")).toBe(true);
  });

  it("filters user-disabled skills from merged results", async () => {
    await writeSkill(path.join(baseDir, "skills", "portable"), "portable");
    await writeSkill(path.join(baseDir, "skills", "muted"), "muted");

    const result = await runListSkills({
      adapter: {},
      disabled: ["Muted"],
      provider: "opencode",
    });

    expect(result.skills.map((skill) => skill.name)).toEqual(["portable"]);
  });

  it("keeps catalog skills and reports a sanitized native discovery failure", async () => {
    await writeSkill(path.join(baseDir, "skills", "portable"), "portable");

    const result = await runListSkills({
      adapter: {
        listSkills: () =>
          Effect.fail(
            new ProviderAdapterRequestError({
              provider: "codex",
              method: "skills/list",
              detail: "codex binary missing",
            }),
          ),
      },
      provider: "codex",
    });

    expect(result.skills.map((skill) => skill.name)).toEqual(["portable"]);
    expect(result.source).toBe("omnimind.catalog");
    expect(result.warnings).toEqual([{ source: "engine-native", reason: "discovery-failed" }]);
    expect(JSON.stringify(result)).not.toContain("codex binary missing");
  });

  it("keeps native skills and reports a sanitized OmniMind Library discovery failure", async () => {
    const nativeSkill = {
      name: "native-only",
      path: path.join(homeDir, ".codex", "skills", "native-only", "SKILL.md"),
      enabled: true,
      scope: "user",
    };
    const result = combineProviderSkills({
      native: { skills: [nativeSkill], source: "codex-app-server", cached: false },
      catalog: "failed",
      disabledSkillNames: [],
    });

    expect(result.skills).toEqual([nativeSkill]);
    expect(result.source).toBe("codex-app-server");
    expect(result.warnings).toEqual([{ source: "omnimind-library", reason: "discovery-failed" }]);
  });

  it("distinguishes both failed sources from unsupported native discovery", () => {
    expect(
      combineProviderSkills({ native: "failed", catalog: "failed", disabledSkillNames: [] }),
    ).toEqual({
      skills: [],
      source: "unavailable",
      cached: false,
      warnings: [
        { source: "engine-native", reason: "discovery-failed" },
        { source: "omnimind-library", reason: "discovery-failed" },
      ],
    });
    expect(
      combineProviderSkills({ native: "unsupported", catalog: [], disabledSkillNames: [] })
        .warnings,
    ).toEqual([]);
  });
});

describe("ProviderDiscoveryService.getComposerCapabilities", () => {
  it("reports skill discovery as supported even when the adapter declines it", async () => {
    const baseLayer = Layer.mergeAll(
      makeConfigLayer(),
      ServerSettingsService.layerTest(),
      makeRegistryLayer({
        capabilities: {
          sessionModelSwitch: "restart-session",
          supportsSkillMentions: false,
          supportsSkillDiscovery: false,
        },
      }),
    ).pipe(Layer.provideMerge(NodeServices.layer));
    const testLayer = ProviderDiscoveryServiceLive.pipe(Layer.provideMerge(baseLayer));

    const program = Effect.gen(function* () {
      const discovery = yield* ProviderDiscoveryService;
      return yield* discovery.getComposerCapabilities({ provider: "grok" });
    }).pipe(Effect.provide(testLayer));
    const capabilities = await Effect.runPromise(
      program as unknown as Effect.Effect<ProviderComposerCapabilities, never, never>,
    );

    expect(capabilities.supportsSkillDiscovery).toBe(true);
    expect(capabilities.supportsSkillMentions).toBe(true);
  });
});

describe("ProviderDiscoveryService.listModels", () => {
  it("does not invoke the adapter for a disabled provider", async () => {
    let adapterCalls = 0;
    const result = await runListModels({
      adapter: {
        listModels: () => {
          adapterCalls += 1;
          return Effect.succeed({
            models: [{ slug: "cursor-model", name: "Cursor Model" }],
            source: "cursor.cli",
            cached: false,
          });
        },
      },
      enabled: false,
    });

    expect(result).toEqual({
      models: [],
      source: "disabled",
      cached: false,
    });
    expect(adapterCalls).toBe(0);
  });

  it("dispatches model discovery for an enabled provider", async () => {
    let adapterCalls = 0;
    const result = await runListModels({
      adapter: {
        listModels: () => {
          adapterCalls += 1;
          return Effect.succeed({
            models: [{ slug: "cursor-model", name: "Cursor Model" }],
            source: "cursor.cli",
            cached: false,
          });
        },
      },
      enabled: true,
    });

    expect(result.models).toEqual([{ slug: "cursor-model", name: "Cursor Model" }]);
    expect(adapterCalls).toBe(1);
  });

  it("omits malformed model descriptors while preserving valid entries", async () => {
    const result = await runListModels({
      adapter: {
        listModels: () =>
          Effect.succeed({
            models: [
              { slug: "valid-model", name: "Valid Model" },
              { slug: "invalid-model", name: " " },
            ],
            source: "cursor.cli",
            cached: false,
          } as ProviderListModelsResult),
      },
      enabled: true,
    });

    expect(result).toEqual({
      models: [{ slug: "valid-model", name: "Valid Model" }],
      source: "cursor.cli",
      cached: false,
    });
  });
});
