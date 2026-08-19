import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { EDITABLE_TEXT_FILE_MAX_BYTES } from "@omnimind/contracts";
import { Effect, Layer } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServerConfig } from "../../config.ts";
import type { OmniMindCodingAgentModule } from "../omnimindAgentRuntime.ts";
import {
  OmniMindAgentPromptFiles,
  type OmniMindAgentPromptFilesShape,
} from "../Services/OmniMindAgentPromptFiles.ts";
import { makeOmniMindAgentPromptFilesLive } from "./OmniMindAgentPromptFiles.ts";

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

function harness() {
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
  const sdk = { loadProjectContextFiles } as unknown as OmniMindCodingAgentModule;
  const layer = makeOmniMindAgentPromptFilesLive({ loadModule: async () => sdk }).pipe(
    Layer.provideMerge(ServerConfig.layerTest(process.cwd(), baseDir)),
    Layer.provideMerge(NodeServices.layer),
  );
  const run = <A>(operation: (service: OmniMindAgentPromptFilesShape) => Effect.Effect<A, Error>) =>
    Effect.runPromise(
      Effect.gen(function* () {
        return yield* operation(yield* OmniMindAgentPromptFiles);
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

    expect(snapshot.globalContext.exists).toBe(false);
    expect(snapshot.globalContextCandidates).toHaveLength(5);
    expect(fs.existsSync(test.agentDir)).toBe(false);
    expect(test.loadProjectContextFiles).not.toHaveBeenCalled();
  });

  it("uses bundled discovery for precedence and exposes safe display paths", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.md", "lower");
    write(test.agentDir, "AGENTS.override.md", "active");

    const snapshot = await test.run((service) =>
      service.getSnapshot({ resource: "globalContext" }),
    );

    expect(snapshot.globalContext).toMatchObject({
      sourceId: "AGENTS.override.md",
      content: "active",
      exists: true,
      contentLoaded: true,
    });
    expect(snapshot.globalContextCandidates.filter((candidate) => candidate.exists)).toHaveLength(
      2,
    );
    expect(snapshot.globalContext.displayPath).toContain("AGENTS.override.md");
    expect(snapshot.globalContext.displayPath).not.toContain("..");
    expect(test.loadProjectContextFiles).toHaveBeenCalledTimes(1);
  });

  it("creates AGENTS.md only for the first non-empty save and preserves no-op bytes and mtime", async () => {
    const test = harness();
    const empty = await test.run((service) =>
      service.mutate({ action: "create", resource: "globalContext", content: "" }),
    );
    expect(empty.state).toBe("unchanged");
    expect(fs.existsSync(test.agentDir)).toBe(false);

    const created = await test.run((service) =>
      service.mutate({ action: "create", resource: "globalContext", content: "hello\n" }),
    );
    expect(created.state).toBe("changed");
    const source = path.join(test.agentDir, "AGENTS.md");
    const before = fs.statSync(source);
    const version = created.snapshot.globalContext.version!;

    const unchanged = await test.run((service) =>
      service.mutate({
        action: "update",
        resource: "globalContext",
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
        action: "update",
        resource: "globalContext",
        sourceId: "AGENTS.md",
        expectedVersion: snapshot.globalContext.version!,
        content: "mine",
      }),
    );

    expect(result).toMatchObject({ state: "conflict", reason: "content_changed" });
    expect(result.snapshot.globalContext.content).toBe("external");
    expect(fs.readFileSync(path.join(test.agentDir, "AGENTS.md"), "utf8")).toBe("external");
  });

  it("rejects moving a draft when a higher-priority candidate appears", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.md", "base");
    const snapshot = await test.run((service) => service.getSnapshot());
    write(test.agentDir, "AGENTS.override.md", "override");

    const result = await test.run((service) =>
      service.mutate({
        action: "update",
        resource: "globalContext",
        sourceId: "AGENTS.md",
        expectedVersion: snapshot.globalContext.version!,
        content: "mine",
      }),
    );

    expect(result).toMatchObject({ state: "conflict", reason: "source_changed" });
    expect(result.snapshot.globalContext.sourceId).toBe("AGENTS.override.md");
  });

  it("rediscovers the next candidate after removing the active file", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.override.md", "override");
    write(test.agentDir, "AGENTS.md", "next");
    const snapshot = await test.run((service) => service.getSnapshot());

    const result = await test.run((service) =>
      service.mutate({
        action: "remove",
        resource: "globalContext",
        sourceId: "AGENTS.override.md",
        expectedVersion: snapshot.globalContext.version!,
      }),
    );

    expect(result.state).toBe("changed");
    expect(result.snapshot.globalContext).toMatchObject({ sourceId: "AGENTS.md", content: "next" });
  });

  it("loads advanced contents only when explicitly requested", async () => {
    const test = harness();
    write(test.agentDir, "APPEND_SYSTEM.md", "append");

    const initial = await test.run((service) => service.getSnapshot());
    expect(initial.appendSystem).toMatchObject({
      exists: true,
      contentLoaded: false,
      content: null,
    });
    const loaded = await test.run((service) => service.getSnapshot({ resource: "appendSystem" }));
    expect(loaded.appendSystem).toMatchObject({
      exists: true,
      contentLoaded: true,
      content: "append",
    });
  });

  it("preserves BOM, consistent line endings, and mode on update", async () => {
    const test = harness();
    write(
      test.agentDir,
      "SYSTEM.md",
      Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from("one\r\ntwo\r\n")]),
      0o640,
    );
    const snapshot = await test.run((service) => service.getSnapshot({ resource: "system" }));

    const result = await test.run((service) =>
      service.mutate({
        action: "update",
        resource: "system",
        sourceId: "SYSTEM.md",
        expectedVersion: snapshot.system.version!,
        content: "three\nfour\n",
      }),
    );

    expect(result.state).toBe("changed");
    const bytes = fs.readFileSync(path.join(test.agentDir, "SYSTEM.md"));
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(bytes.subarray(3).toString("utf8")).toBe("three\r\nfour\r\n");
    if (process.platform !== "win32")
      expect(fs.statSync(path.join(test.agentDir, "SYSTEM.md")).mode & 0o777).toBe(0o640);
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

  it("rejects invalid UTF-8 without exposing bytes", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.md", Buffer.from([0xc3, 0x28]));

    await expect(test.run((service) => service.getSnapshot())).rejects.toThrow(
      "OmniMind Agent prompt file operation failed",
    );
  });

  it("rejects oversized, binary-like, directory, and linked-root inputs", async () => {
    const oversized = harness();
    write(oversized.agentDir, "AGENTS.md", Buffer.alloc(EDITABLE_TEXT_FILE_MAX_BYTES + 1, 0x61));
    await expect(oversized.run((service) => service.getSnapshot())).rejects.toThrow(
      "OmniMind Agent prompt file operation failed",
    );

    const binary = harness();
    write(binary.agentDir, "AGENTS.md", "text\0binary");
    await expect(binary.run((service) => service.getSnapshot())).rejects.toThrow(
      "OmniMind Agent prompt file operation failed",
    );

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

  it("keeps an intentionally empty active file and its native shadow semantics", async () => {
    const test = harness();
    write(test.agentDir, "AGENTS.override.md", "non-empty");
    write(test.agentDir, "AGENTS.md", "lower");
    const before = await test.run((service) => service.getSnapshot());

    const result = await test.run((service) =>
      service.mutate({
        action: "update",
        resource: "globalContext",
        sourceId: "AGENTS.override.md",
        expectedVersion: before.globalContext.version!,
        content: "",
      }),
    );

    expect(result.state).toBe("changed");
    expect(result.snapshot.globalContext).toMatchObject({
      sourceId: "AGENTS.override.md",
      exists: true,
      content: "",
    });
    expect(fs.existsSync(path.join(test.agentDir, "AGENTS.override.md"))).toBe(true);
  });
});
