import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import {
  HARNESSOS_AGENT_PERSONAL_STRATEGY_SOURCE_IDS,
  HARNESSOS_AGENT_PROMPT_MAX_BYTES,
  OAAgentPromptMutationInput,
  OAAgentPromptSnapshot,
  WS_METHODS,
} from "@harnessos/contracts";
import { Effect, Layer, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServerConfig } from "../../config.ts";
import { MAX_WEBSOCKET_MESSAGE_BYTES } from "../../nodeHttpServer.ts";
import type { OARuntimeModule } from "../oaRuntime.ts";
import {
  OAAgentPromptFiles,
  type OAAgentPromptFilesShape,
} from "../Services/OAAgentPromptFiles.ts";
import {
  makeOAAgentPromptFilesLive,
  type OAAgentPromptFilesLiveOptions,
} from "./OAAgentPromptFiles.ts";

const CANDIDATES = HARNESSOS_AGENT_PERSONAL_STRATEGY_SOURCE_IDS;
const cleanups: string[] = [];

afterEach(() => {
  for (const directory of cleanups.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

function harness(options: OAAgentPromptFilesLiveOptions = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oa-prompts-"));
  const baseDir = path.join(root, "state");
  fs.mkdirSync(baseDir, { mode: 0o700 });
  cleanups.push(root);
  const agentDir = path.join(baseDir, "agent");
  const loadProjectContextFiles = vi.fn((input: { readonly agentDir: string }) => {
    for (const sourceId of CANDIDATES) {
      const filePath = path.join(input.agentDir, sourceId);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return [{ path: filePath, content: fs.readFileSync(filePath, "utf8") }];
      }
    }
    return [];
  });
  const sdk = { loadProjectContextFiles } as unknown as OARuntimeModule;
  const layer = makeOAAgentPromptFilesLive({
    ...options,
    loadModule: async () => sdk,
  }).pipe(
    Layer.provideMerge(ServerConfig.layerTest(process.cwd(), baseDir)),
    Layer.provideMerge(NodeServices.layer),
  );
  const run = <A>(operation: (service: OAAgentPromptFilesShape) => Effect.Effect<A, unknown>) =>
    Effect.runPromise(
      Effect.gen(function* () {
        return yield* operation(yield* OAAgentPromptFiles);
      }).pipe(Effect.provide(layer)),
    );
  return { run, root, agentDir };
}

function write(agentDir: string, sourceId: string, content: string | Buffer, mode = 0o600) {
  fs.mkdirSync(agentDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(agentDir, sourceId), content, { mode });
}

describe("OAAgentPromptFilesLive", () => {
  it("creates one localized Personal Strategy and never overwrites it on locale changes", async () => {
    const test = harness();
    const zh = await test.run((service) => service.getSnapshot({ locale: "zh-CN" }));
    expect(zh.personalStrategy).toMatchObject({
      availability: "available",
      sourceId: "AGENTS.md",
    });
    expect(zh.personalStrategy.content).toContain("保持犀利、诚实和独立判断");
    expect(fs.statSync(path.join(test.agentDir, "AGENTS.md")).mode & 0o777).toBe(0o600);

    fs.writeFileSync(path.join(test.agentDir, "AGENTS.md"), "用户修改", "utf8");
    const en = await test.run((service) => service.getSnapshot({ locale: "en" }));
    expect(en.personalStrategy.content).toBe("用户修改");
  });

  it("uses Pi's native candidate precedence as the sole global strategy owner", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.md", "lower");
    write(test.agentDir, "AGENTS.override.md", "active");
    const snapshot = await test.run((service) => service.getSnapshot({ locale: "en" }));
    expect(snapshot.personalStrategy).toMatchObject({
      sourceId: "AGENTS.override.md",
      content: "active",
    });
  });

  it("updates and restores the same source with optimistic concurrency", async () => {
    const test = harness();
    const initial = await test.run((service) => service.getSnapshot({ locale: "en" }));
    if (initial.personalStrategy.availability !== "available")
      throw new Error("strategy unavailable");
    const initialStrategy = initial.personalStrategy;
    const changed = await test.run((service) =>
      service.mutate({
        action: "setPersonalStrategy",
        sourceId: initialStrategy.sourceId,
        expectedVersion: initialStrategy.version,
        locale: "en",
        content: "Be exact.",
      }),
    );
    expect(changed).toMatchObject({
      state: "changed",
      snapshot: { personalStrategy: { content: "Be exact." } },
    });

    const conflict = await test.run((service) =>
      service.mutate({
        action: "setPersonalStrategy",
        sourceId: initialStrategy.sourceId,
        expectedVersion: initialStrategy.version,
        locale: "en",
        content: "stale",
      }),
    );
    expect(conflict.state).toBe("conflict");
    if (
      changed.state === "conflict" ||
      changed.snapshot.personalStrategy.availability !== "available"
    ) {
      throw new Error("unexpected conflict");
    }
    const changedStrategy = changed.snapshot.personalStrategy;
    const restored = await test.run((service) =>
      service.mutate({
        action: "restorePersonalStrategy",
        sourceId: changedStrategy.sourceId,
        expectedVersion: changedStrategy.version,
        locale: "zh-CN",
      }),
    );
    expect(restored.snapshot.personalStrategy.content).toContain("结论先行");
  });

  it("reports unsupported and oversized files without replacing them", async () => {
    const invalid = harness();
    write(invalid.agentDir, "AGENTS.md", Buffer.from([0xff, 0xfe]));
    const invalidSnapshot = await invalid.run((service) => service.getSnapshot({ locale: "en" }));
    expect(invalidSnapshot.personalStrategy).toMatchObject({
      availability: "unavailable",
      unavailableReason: "unsupported_text",
    });

    const oversized = harness();
    write(
      oversized.agentDir,
      "AGENTS.md",
      Buffer.alloc(HARNESSOS_AGENT_PROMPT_MAX_BYTES + 1, 0x61),
    );
    const oversizedSnapshot = await oversized.run((service) =>
      service.getSnapshot({ locale: "en" }),
    );
    expect(oversizedSnapshot.personalStrategy).toMatchObject({
      availability: "unavailable",
      unavailableReason: "too_large",
    });
  });

  it("rejects symlink sources and races instead of escaping or returning partial content", async () => {
    const linked = harness();
    fs.mkdirSync(linked.agentDir, { recursive: true });
    const target = path.join(linked.root, "outside.md");
    fs.writeFileSync(target, "outside");
    fs.symlinkSync(target, path.join(linked.agentDir, "AGENTS.md"));
    await expect(linked.run((service) => service.getSnapshot({ locale: "en" }))).rejects.toThrow(
      "OA Agent prompt file operation failed",
    );

    let expanded = false;
    const raced = harness({
      safeReadHooks: {
        afterHandleStat: async ({ agentDir, sourceId }) => {
          if (expanded) return;
          expanded = true;
          fs.appendFileSync(path.join(agentDir, sourceId), "raced");
        },
      },
    });
    write(raced.agentDir, "AGENTS.md", "stable");
    await expect(raced.run((service) => service.getSnapshot({ locale: "en" }))).rejects.toThrow(
      "OA Agent prompt file operation failed",
    );
  });

  it("keeps the largest legal mutation and snapshot below the existing WS ceiling", async () => {
    const content = "\\".repeat(HARNESSOS_AGENT_PROMPT_MAX_BYTES);
    const payload = Schema.decodeUnknownSync(OAAgentPromptMutationInput)({
      action: "setPersonalStrategy",
      sourceId: "AGENTS.md",
      expectedVersion: "a".repeat(64),
      locale: "en",
      content,
    });
    expect(
      Buffer.byteLength(JSON.stringify({ tag: WS_METHODS.oaAgentPromptsMutate, payload })),
    ).toBeLessThan(MAX_WEBSOCKET_MESSAGE_BYTES);
    const snapshot = Schema.decodeUnknownSync(OAAgentPromptSnapshot)({
      personalStrategy: {
        availability: "available",
        unavailableReason: null,
        sourceId: "AGENTS.md",
        displayPath: `/${"x".repeat(4_094)}`,
        revealPath: `/${"x".repeat(16_382)}`,
        version: "a".repeat(64),
        content,
      },
      maxBytes: HARNESSOS_AGENT_PROMPT_MAX_BYTES,
    });
    expect(Buffer.byteLength(JSON.stringify(snapshot))).toBeLessThan(MAX_WEBSOCKET_MESSAGE_BYTES);
  });
});
