import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import {
  EDITABLE_TEXT_FILE_MAX_BYTES,
  HARNESSOS_AGENT_PROMPT_MAX_BYTES,
  OmniMindAgentPromptMutationInput,
  OmniMindAgentPromptSnapshot,
  WS_METHODS,
} from "@harnessos/contracts";
import { Effect, Layer, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServerConfig } from "../../config.ts";
import { MAX_WEBSOCKET_MESSAGE_BYTES } from "../../nodeHttpServer.ts";
import { ServerSettingsService, type ServerSettingsShape } from "../../serverSettings.ts";
import type { OmniMindCodingAgentModule } from "../omnimindAgentRuntime.ts";
import {
  OmniMindAgentPromptFiles,
  type OmniMindAgentPromptFilesShape,
} from "../Services/OmniMindAgentPromptFiles.ts";
import {
  makeOmniMindAgentPromptFilesLive,
  type OmniMindAgentPromptFilesLiveOptions,
} from "./OmniMindAgentPromptFiles.ts";

const CANDIDATES = [
  "AGENTS.override.md",
  "AGENTS.md",
  "AGENTS.MD",
  "CLAUDE.md",
  "CLAUDE.MD",
] as const;
const cleanups: string[] = [];

afterEach(() => {
  for (const directory of cleanups.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function harness(options: OmniMindAgentPromptFilesLiveOptions = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "omnimind-prompts-"));
  const baseDir = path.join(root, "state");
  fs.mkdirSync(baseDir, { mode: 0o700 });
  cleanups.push(root);
  const agentDir = path.join(baseDir, "agent");
  const loadProjectContextFiles = vi.fn(
    (input: { readonly agentDir: string; readonly projectContextRoot?: string | false }) => {
      expect(input.projectContextRoot).toBe(false);
      for (const sourceId of CANDIDATES) {
        const filePath = path.join(input.agentDir, sourceId);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          return [{ path: filePath, content: fs.readFileSync(filePath, "utf8") }];
        }
      }
      return [];
    },
  );
  const sdk = {
    DEFAULT_BASE_INSTRUCTIONS: "Factory instructions",
    loadProjectContextFiles,
  } as unknown as OmniMindCodingAgentModule;
  const layer = makeOmniMindAgentPromptFilesLive({
    ...options,
    loadModule: async () => sdk,
  }).pipe(
    Layer.provideMerge(ServerConfig.layerTest(process.cwd(), baseDir)),
    Layer.provideMerge(ServerSettingsService.layerTest()),
    Layer.provideMerge(NodeServices.layer),
  );
  const run = <A>(
    operation: (
      service: OmniMindAgentPromptFilesShape,
      settings: ServerSettingsShape,
    ) => Effect.Effect<A, unknown, never>,
  ) =>
    Effect.runPromise(
      Effect.gen(function* () {
        return yield* operation(yield* OmniMindAgentPromptFiles, yield* ServerSettingsService);
      }).pipe(Effect.provide(layer)),
    );
  return { run, root, baseDir, agentDir, loadProjectContextFiles };
}

function write(agentDir: string, sourceId: string, content: string | Buffer, mode = 0o600) {
  fs.mkdirSync(agentDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(agentDir, sourceId), content, { mode });
}

describe("OmniMindAgentPromptFilesLive", () => {
  it("keeps a passive read of a fresh root side-effect free", async () => {
    const test = harness();

    const snapshot = await test.run((service) => service.getSnapshot());

    expect(snapshot.defaultPrompt).toMatchObject({
      content: "Factory instructions",
      customized: false,
    });
    expect(snapshot.customRules.exists).toBe(false);
    expect(fs.existsSync(test.agentDir)).toBe(false);
    expect(test.loadProjectContextFiles).not.toHaveBeenCalled();
  });

  it("uses bundled discovery for precedence and exposes safe display paths", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.md", "lower");
    write(test.agentDir, "AGENTS.override.md", "active");

    const snapshot = await test.run((service) => service.getSnapshot());

    expect(snapshot.customRules).toMatchObject({
      sourceId: "AGENTS.override.md",
      content: "active",
      exists: true,
    });
    expect(snapshot.customRules.displayPath).toContain("AGENTS.override.md");
    expect(snapshot.customRules.displayPath).not.toContain("..");
    expect(snapshot.customRules.revealPath).toBe(
      fs.realpathSync(path.join(test.agentDir, "AGENTS.override.md")),
    );
    expect(test.loadProjectContextFiles).toHaveBeenCalledTimes(1);
  });

  it("creates AGENTS.md only for the first non-empty save and preserves no-op bytes and mtime", async () => {
    const test = harness();
    const empty = await test.run((service) =>
      service.mutate({ action: "createCustomRules", content: "" }),
    );
    expect(empty.state).toBe("unchanged");
    expect(fs.existsSync(test.agentDir)).toBe(false);

    const created = await test.run((service) =>
      service.mutate({ action: "createCustomRules", content: "hello\n" }),
    );
    expect(created.state).toBe("changed");
    const source = path.join(test.agentDir, "AGENTS.md");
    const before = fs.statSync(source);
    const version = created.snapshot.customRules.version!;

    const unchanged = await test.run((service) =>
      service.mutate({
        action: "updateCustomRules",
        sourceId: "AGENTS.md",
        expectedVersion: version,
        content: "hello\n",
      }),
    );
    const after = fs.statSync(source);
    expect(unchanged.state).toBe("unchanged");
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(fs.readFileSync(source, "utf8")).toBe("hello\n");
    if (process.platform !== "win32") {
      expect(after.mode & 0o777).toBe(0o600);
      expect(fs.statSync(test.agentDir).mode & 0o777).toBe(0o700);
    }
  });

  it("preserves a draft by returning an external content conflict", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.md", "first");
    const snapshot = await test.run((service) => service.getSnapshot());
    fs.writeFileSync(path.join(test.agentDir, "AGENTS.md"), "external");

    const result = await test.run((service) =>
      service.mutate({
        action: "updateCustomRules",
        sourceId: "AGENTS.md",
        expectedVersion: snapshot.customRules.version!,
        content: "mine",
      }),
    );

    expect(result).toMatchObject({ state: "conflict", reason: "content_changed" });
    expect(result.snapshot.customRules.content).toBe("external");
    expect(fs.readFileSync(path.join(test.agentDir, "AGENTS.md"), "utf8")).toBe("external");
  });

  it("rejects moving a draft when a higher-priority candidate appears", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.md", "base");
    const snapshot = await test.run((service) => service.getSnapshot());
    write(test.agentDir, "AGENTS.override.md", "override");

    const result = await test.run((service) =>
      service.mutate({
        action: "updateCustomRules",
        sourceId: "AGENTS.md",
        expectedVersion: snapshot.customRules.version!,
        content: "mine",
      }),
    );

    expect(result).toMatchObject({ state: "conflict", reason: "source_changed" });
    expect(result.snapshot.customRules.sourceId).toBe("AGENTS.override.md");
  });

  it("rediscovers the next candidate after removing the active file", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.override.md", "override");
    write(test.agentDir, "AGENTS.md", "next");
    const snapshot = await test.run((service) => service.getSnapshot());

    const result = await test.run((service) =>
      service.mutate({
        action: "removeCustomRules",
        sourceId: "AGENTS.override.md",
        expectedVersion: snapshot.customRules.version!,
      }),
    );

    expect(result.state).toBe("changed");
    expect(result.snapshot.customRules).toMatchObject({ sourceId: "AGENTS.md", content: "next" });
  });

  it("saves, no-ops, and restores the native default segment without creating a file", async () => {
    const test = harness();
    const { initial, changed, changedRevision, unchanged, unchangedRevision, restored } =
      await test.run((service, settings) =>
        Effect.gen(function* () {
          const initial = yield* service.getSnapshot();
          const changed = yield* service.mutate({
            action: "setDefault",
            expectedVersion: initial.defaultPrompt.version,
            content: "My default",
          });
          const changedRevision = (yield* settings.getSnapshot).revision;
          const unchanged = yield* service.mutate({
            action: "setDefault",
            expectedVersion: changed.snapshot.defaultPrompt.version,
            content: "My default",
          });
          const unchangedRevision = (yield* settings.getSnapshot).revision;
          const restored = yield* service.mutate({
            action: "restoreDefault",
            expectedVersion: unchanged.snapshot.defaultPrompt.version,
          });
          return { initial, changed, changedRevision, unchanged, unchangedRevision, restored };
        }),
      );
    expect(initial.defaultPrompt.customized).toBe(false);
    expect(changed).toMatchObject({
      state: "changed",
      snapshot: { defaultPrompt: { content: "My default", customized: true } },
    });
    expect(unchanged.state).toBe("unchanged");
    expect(unchangedRevision).toBe(changedRevision);
    expect(restored).toMatchObject({
      state: "changed",
      snapshot: {
        defaultPrompt: {
          content: "Factory instructions",
          customized: false,
        },
      },
    });
    expect(fs.existsSync(test.agentDir)).toBe(false);
  });

  it("returns a typed conflict instead of overwriting a concurrent default edit", async () => {
    const test = harness();
    const results = await test.run((service) =>
      Effect.gen(function* () {
        const initial = yield* service.getSnapshot();
        return yield* Effect.all(
          [
            service.mutate({
              action: "setDefault",
              expectedVersion: initial.defaultPrompt.version,
              content: "first",
            }),
            service.mutate({
              action: "setDefault",
              expectedVersion: initial.defaultPrompt.version,
              content: "second",
            }),
          ],
          { concurrency: "unbounded" },
        );
      }),
    );

    expect(results.map(({ state }) => state).toSorted()).toEqual(["changed", "conflict"]);
    const conflict = results.find(({ state }) => state === "conflict");
    expect(conflict).toMatchObject({ state: "conflict", reason: "content_changed" });
    expect(["first", "second"]).toContain(conflict?.snapshot.defaultPrompt.content);
  });

  it("preserves BOM, consistent line endings, and mode on update", async () => {
    const test = harness();
    write(
      test.agentDir,
      "AGENTS.md",
      Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from("one\r\ntwo\r\n")]),
      0o640,
    );
    const snapshot = await test.run((service) => service.getSnapshot());

    const result = await test.run((service) =>
      service.mutate({
        action: "updateCustomRules",
        sourceId: "AGENTS.md",
        expectedVersion: snapshot.customRules.version!,
        content: "three\nfour\n",
      }),
    );

    expect(result.state).toBe("changed");
    const bytes = fs.readFileSync(path.join(test.agentDir, "AGENTS.md"));
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(bytes.subarray(3).toString("utf8")).toBe("three\r\nfour\r\n");
    if (process.platform !== "win32")
      expect(fs.statSync(path.join(test.agentDir, "AGENTS.md")).mode & 0o777).toBe(0o640);
  });

  it("rejects symlinks and hardlinks before bundled discovery can read them", async () => {
    const test = harness();
    const outside = path.join(test.root, "outside.md");
    fs.writeFileSync(outside, "outside");
    fs.mkdirSync(test.agentDir, { mode: 0o700 });
    fs.symlinkSync(outside, path.join(test.agentDir, "AGENTS.md"));

    await expect(test.run((service) => service.getSnapshot())).rejects.toThrow(
      "OmniMind Agent prompt file operation failed",
    );
    expect(test.loadProjectContextFiles).not.toHaveBeenCalled();

    fs.unlinkSync(path.join(test.agentDir, "AGENTS.md"));
    fs.linkSync(outside, path.join(test.agentDir, "AGENTS.md"));
    await expect(test.run((service) => service.getSnapshot())).rejects.toThrow(
      "OmniMind Agent prompt file operation failed",
    );
    expect(test.loadProjectContextFiles).not.toHaveBeenCalled();
  });

  it("keeps the default editable while an unsupported custom-rules file is unavailable", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.md", Buffer.from([0xc3, 0x28]));

    const invalidUtf8 = await test.run((service) => service.getSnapshot());
    expect(invalidUtf8.defaultPrompt.content).toBe("Factory instructions");
    expect(invalidUtf8.customRules).toMatchObject({
      availability: "unavailable",
      unavailableReason: "unsupported_text",
      sourceId: "AGENTS.md",
      content: "",
      version: null,
    });

    const control = harness();
    write(control.agentDir, "AGENTS.md", "plain\u0001control");
    const invalidControl = await control.run((service) => service.getSnapshot());
    expect(invalidControl.customRules).toMatchObject({
      availability: "unavailable",
      unavailableReason: "unsupported_text",
    });
  });

  it("localizes oversized and binary-like custom rules without weakening unsafe path failures", async () => {
    const oversized = harness();
    write(
      oversized.agentDir,
      "AGENTS.md",
      Buffer.alloc(HARNESSOS_AGENT_PROMPT_MAX_BYTES + 1, 0x61),
    );
    const oversizedSnapshot = await oversized.run((service) => service.getSnapshot());
    expect(oversizedSnapshot.defaultPrompt.content).toBe("Factory instructions");
    expect(oversizedSnapshot.customRules).toMatchObject({
      availability: "unavailable",
      unavailableReason: "too_large",
      sourceId: "AGENTS.md",
      exists: true,
      content: "",
      version: null,
    });
    expect(oversizedSnapshot.customRules.displayPath).toContain("AGENTS.md");
    expect(oversized.loadProjectContextFiles).toHaveBeenCalledTimes(1);

    const beyondSafeDiscovery = harness();
    write(
      beyondSafeDiscovery.agentDir,
      "AGENTS.md",
      Buffer.alloc(EDITABLE_TEXT_FILE_MAX_BYTES + 1, 0x61),
    );
    const beyondSafeSnapshot = await beyondSafeDiscovery.run((service) => service.getSnapshot());
    expect(beyondSafeSnapshot.customRules).toMatchObject({
      availability: "unavailable",
      unavailableReason: "too_large",
    });
    expect(beyondSafeDiscovery.loadProjectContextFiles).not.toHaveBeenCalled();

    const shadowedOversized = harness();
    write(shadowedOversized.agentDir, "AGENTS.override.md", "active and editable");
    write(
      shadowedOversized.agentDir,
      "CLAUDE.md",
      Buffer.alloc(HARNESSOS_AGENT_PROMPT_MAX_BYTES + 1, 0x61),
    );
    const shadowedSnapshot = await shadowedOversized.run((service) => service.getSnapshot());
    expect(shadowedSnapshot.customRules).toMatchObject({
      availability: "available",
      sourceId: "AGENTS.override.md",
      content: "active and editable",
    });
    expect(shadowedOversized.loadProjectContextFiles).toHaveBeenCalledTimes(1);

    const binary = harness();
    write(binary.agentDir, "AGENTS.md", "text\0binary");
    const binarySnapshot = await binary.run((service) => service.getSnapshot());
    expect(binarySnapshot.customRules).toMatchObject({
      availability: "unavailable",
      unavailableReason: "unsupported_text",
    });

    const directory = harness();
    fs.mkdirSync(path.join(directory.agentDir, "AGENTS.md"), { recursive: true });
    await expect(directory.run((service) => service.getSnapshot())).rejects.toThrow(
      "OmniMind Agent prompt file operation failed",
    );

    const linkedRoot = harness();
    const outside = path.join(linkedRoot.root, "outside-agent");
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, linkedRoot.agentDir);
    await expect(linkedRoot.run((service) => service.getSnapshot())).rejects.toThrow(
      "OmniMind Agent prompt file operation failed",
    );
  });

  it("rechecks the opened handle size before allocating a read buffer", async () => {
    let expanded = false;
    const test = harness({
      safeReadHooks: {
        afterLeafValidation: async ({ agentDir, sourceId }) => {
          if (expanded) return;
          expanded = true;
          fs.appendFileSync(
            path.join(agentDir, sourceId),
            Buffer.alloc(HARNESSOS_AGENT_PROMPT_MAX_BYTES, 0x61),
          );
        },
      },
    });
    write(test.agentDir, "AGENTS.md", "x");

    const snapshot = await test.run((service) => service.getSnapshot());
    expect(snapshot.customRules).toMatchObject({
      availability: "unavailable",
      unavailableReason: "too_large",
    });
    expect(fs.statSync(path.join(test.agentDir, "AGENTS.md")).size).toBe(
      HARNESSOS_AGENT_PROMPT_MAX_BYTES + 1,
    );
  });

  it("rejects a file that grows after handle admission instead of returning a partial snapshot", async () => {
    let expanded = false;
    const test = harness({
      safeReadHooks: {
        afterHandleStat: async ({ agentDir, sourceId }) => {
          if (expanded) return;
          expanded = true;
          fs.appendFileSync(path.join(agentDir, sourceId), "raced");
        },
      },
    });
    write(test.agentDir, "AGENTS.md", "stable");

    await expect(test.run((service) => service.getSnapshot())).rejects.toThrow(
      "OmniMind Agent prompt file operation failed",
    );
    expect(fs.readFileSync(path.join(test.agentDir, "AGENTS.md"), "utf8")).toBe("stableraced");
  });

  it("keeps the largest legal escaped request and response below the existing WS ceiling", async () => {
    const content = "\\".repeat(HARNESSOS_AGENT_PROMPT_MAX_BYTES);
    for (const payload of [
      Schema.decodeUnknownSync(OmniMindAgentPromptMutationInput)({
        action: "createCustomRules",
        content,
      }),
      Schema.decodeUnknownSync(OmniMindAgentPromptMutationInput)({
        action: "setDefault",
        expectedVersion: "a".repeat(64),
        content,
      }),
    ]) {
      const requestFrame = JSON.stringify({
        _tag: "Request",
        id: "00000000-0000-4000-8000-000000000099",
        tag: WS_METHODS.omnimindAgentPromptsMutate,
        payload,
      });
      expect(Buffer.byteLength(requestFrame, "utf8")).toBeLessThan(MAX_WEBSOCKET_MESSAGE_BYTES);
    }

    const test = harness();
    write(test.agentDir, "AGENTS.md", content);
    const snapshot = await test.run((service) => service.getSnapshot());
    const maxDisplayPath = `/${"x".repeat(4_094)}`;
    const maxRevealPath = `/${"x".repeat(16_382)}`;
    const maxLegalSnapshot = Schema.decodeUnknownSync(OmniMindAgentPromptSnapshot)({
      ...snapshot,
      defaultPrompt: {
        ...snapshot.defaultPrompt,
        content,
        customized: true,
      },
      customRules: {
        ...snapshot.customRules,
        content,
        displayPath: maxDisplayPath,
        revealPath: maxRevealPath,
      },
    });
    const responseFrame = JSON.stringify({
      _tag: "Exit",
      requestId: "00000000-0000-4000-8000-000000000099",
      exit: { _tag: "Success", value: maxLegalSnapshot },
    });
    expect(Buffer.byteLength(responseFrame, "utf8")).toBeLessThan(MAX_WEBSOCKET_MESSAGE_BYTES);
  });

  it("keeps an intentionally empty active file and its native shadow semantics", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.override.md", "non-empty");
    write(test.agentDir, "AGENTS.md", "lower");
    const before = await test.run((service) => service.getSnapshot());

    const result = await test.run((service) =>
      service.mutate({
        action: "updateCustomRules",
        sourceId: "AGENTS.override.md",
        expectedVersion: before.customRules.version!,
        content: "",
      }),
    );

    expect(result.state).toBe("changed");
    expect(result.snapshot.customRules).toMatchObject({
      sourceId: "AGENTS.override.md",
      exists: true,
      content: "",
    });
    expect(fs.existsSync(path.join(test.agentDir, "AGENTS.override.md"))).toBe(true);
  });
});
