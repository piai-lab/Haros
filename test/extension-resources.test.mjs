import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  digestArtifact,
  materializeGeneration,
} from "../packages/engine/artifact-generation.mjs";
import { preflightExtension } from "../packages/engine/extension-preflight.mjs";
import {
  buildProviderRequest,
  loadPublicResources,
} from "../packages/engine/extension-resources.mjs";

const ENTRY_SOURCE = `
export async function loadResources(host) {
  const composeTool = {
    id: "compose_note",
    description: "Compose a note as a generated file",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
      additionalProperties: false
    },
    effect: "write",
    async execute(input) { return { text: input.text }; }
  };
  return {
    tools: [
      composeTool,
      {
        id: "unused_schema",
        description: "A tool that is not active",
        inputSchema: {
          type: "object",
          properties: { hidden: { type: "string" } }
        },
        effect: "read",
        async execute() { return { hidden: true }; }
      }
    ],
    skills: [{ id: "plain-writing" }],
    prompts: [{ id: "brief" }],
    commands: [{ id: "compose" }],
    provider: { current: "package-owned" },
    session: { current: "package-owned" },
    activate() {
      composeTool.inputSchema.properties.package_state = { type: "boolean" };
      host.registerTool({
        id: "late_tool",
        description: "Registered after resource activation",
        inputSchema: {
          type: "object",
          properties: { value: { type: "number" } }
        },
        effect: "none",
        async execute(input) { return input; }
      });
      return {
        providerMutation: { ignored: true },
        sessionMutation: { ignored: true }
      };
    }
  };
}
`;

async function supportedGeneration(temporaryRoot) {
  const artifactRoot = path.join(temporaryRoot, "artifact");
  await mkdir(artifactRoot, { recursive: true });
  const manifest = {
    formatVersion: 1,
    apiVersion: 1,
    id: "ordinary-writer",
    entry: "index.mjs",
    headless: true,
    lineage: { source: "fixture:ordinary-writer", revision: "revision-1" },
    stateAuthority: "none",
    lifecycleScripts: [],
    nativeDependencies: [],
    permissions: ["write-output"],
    capabilities: ["tools"],
    hostBehaviors: [],
  };
  await writeFile(path.join(artifactRoot, "extension.json"), `${JSON.stringify(manifest)}\n`);
  await writeFile(path.join(artifactRoot, "index.mjs"), ENTRY_SOURCE);
  const generation = await materializeGeneration({
    artifactRoot,
    expectedDigest: await digestArtifact(artifactRoot),
    expectedLineage: manifest.lineage,
    storeRoot: path.join(temporaryRoot, "store"),
  });
  const report = await preflightExtension({
    generation,
    allowedPermissions: ["write-output"],
    allowedCapabilities: ["tools"],
  });
  assert.equal(report.verdict, "supported");
  return { generation, report };
}

test("loads only the public root and excludes inactive schemas from provider requests", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "public-resources-"));
  const { generation, report } = await supportedGeneration(temporaryRoot);
  const loaded = await loadPublicResources({
    generation,
    report,
    activeToolIds: ["compose_note"],
  });

  const request = buildProviderRequest({ registry: loaded.registry, messages: [{ role: "user" }] });
  const serialized = JSON.stringify(request);

  assert.deepEqual(loaded.registry.registeredToolIds(), ["compose_note", "unused_schema"]);
  assert.deepEqual(loaded.registry.activeToolIds(), ["compose_note"]);
  assert.deepEqual(request.tools.map((tool) => tool.name), ["compose_note"]);
  assert.equal(serialized.includes("unused_schema"), false);
  assert.equal(serialized.includes("hidden"), false);
  assert.deepEqual(loaded.nonAuthoritativeKeys, ["provider", "session"]);
  assert.deepEqual(
    loaded.resources,
    {
      skills: [{ id: "plain-writing" }],
      prompts: [{ id: "brief" }],
      commands: [{ id: "compose" }],
    },
  );
  assert.equal(request.toolMetrics.registeredToolCount, 2);
  assert.equal(request.toolMetrics.activeToolCount, 1);
  assert.ok(request.toolMetrics.registeredDescriptorBytes > request.toolMetrics.activeDescriptorBytes);
});

test("keeps the active set accurate after dynamic registration", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "dynamic-resources-"));
  const { generation, report } = await supportedGeneration(temporaryRoot);
  const loaded = await loadPublicResources({
    generation,
    report,
    activeToolIds: ["compose_note"],
  });

  const activation = await loaded.activate();
  assert.deepEqual(loaded.registry.registeredToolIds(), [
    "compose_note",
    "unused_schema",
    "late_tool",
  ]);
  assert.deepEqual(loaded.registry.activeToolIds(), ["compose_note"]);
  assert.deepEqual(activation.nonAuthoritativeKeys, ["providerMutation", "sessionMutation"]);
  assert.equal(
    JSON.stringify(buildProviderRequest({ registry: loaded.registry, messages: [] })).includes(
      "package_state",
    ),
    false,
  );

  loaded.registry.setActive(["late_tool"]);
  const request = buildProviderRequest({ registry: loaded.registry, messages: [] });
  assert.deepEqual(request.tools.map((tool) => tool.name), ["late_tool"]);
  assert.equal(JSON.stringify(request).includes("compose_note"), false);
  assert.equal(request.toolMetrics.activeToolCount, 1);
});

test("refuses resource loading when the machine report is rejected", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "rejected-resources-"));
  const { generation, report } = await supportedGeneration(temporaryRoot);
  await assert.rejects(
    loadPublicResources({
      generation,
      report: { ...report, verdict: "rejected" },
      activeToolIds: ["compose_note"],
    }),
    (error) => error.code === "PREFLIGHT_REQUIRED",
  );
});
