import { link, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveOmniMindAgentDir } from "./omnimindAgentRuntime.ts";

const roots: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "omnimind-agent-root-"));
  roots.push(root);
  return root;
}

async function isolateProviderHome(root: string): Promise<string> {
  const providerHome = path.join(root, "provider-home");
  await mkdir(providerHome);
  vi.stubEnv("HOME", providerHome);
  vi.stubEnv("USERPROFILE", providerHome);
  return providerHome;
}

describe("resolveOmniMindAgentDir", () => {
  it("resolves a physical product-owned agent directory", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    await mkdir(path.join(root, "agent"));

    expect(resolveOmniMindAgentDir(root)).toBe(path.join(await realpath(root), "agent"));
  });

  it("fails closed when the agent directory is a symlink", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const escaped = path.join(root, "escaped");
    await mkdir(escaped);
    await symlink(escaped, path.join(root, "agent"), "dir");

    expect(() => resolveOmniMindAgentDir(root)).toThrow(
      "OmniMind Agent state root is not a private directory",
    );
  });

  it("fails closed when a runtime file is a symlink", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const escaped = path.join(root, "escaped-auth.json");
    await mkdir(path.join(root, "agent"));
    await symlink(escaped, path.join(root, "agent", "auth.json"), "file");

    expect(() => resolveOmniMindAgentDir(root)).toThrow(
      "OmniMind Agent state contains a non-private runtime file",
    );
  });

  it("fails closed when a runtime file aliases another state tree by hard link", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const escaped = path.join(root, "escaped-auth.json");
    await mkdir(path.join(root, "agent"));
    await writeFile(escaped, "{}");
    await link(escaped, path.join(root, "agent", "auth.json"));

    expect(() => resolveOmniMindAgentDir(root)).toThrow(
      "OmniMind Agent state contains a non-private runtime file",
    );
  });

  it("rejects an OmniMind home physically rooted inside isolated stock Pi state", async () => {
    const providerHome = await makeRoot();
    const stockPiDir = path.join(providerHome, ".pi");
    await mkdir(stockPiDir);
    vi.stubEnv("HOME", providerHome);
    vi.stubEnv("USERPROFILE", providerHome);

    expect(() => resolveOmniMindAgentDir(stockPiDir)).toThrow(
      "OmniMind Agent state must be physically separate from stock Pi state",
    );
  });

  it("rejects a candidate rooted at or below an isolated stock Pi symlink target", async () => {
    const root = await makeRoot();
    const providerHome = await isolateProviderHome(root);
    const aliasedStockState = path.join(root, "aliased-stock-state");
    const aliasedChild = path.join(aliasedStockState, "nested-product-state");
    await mkdir(aliasedChild, { recursive: true });
    await symlink(
      aliasedStockState,
      path.join(providerHome, ".pi"),
      process.platform === "win32" ? "junction" : "dir",
    );

    expect(() => resolveOmniMindAgentDir(aliasedStockState)).toThrow(
      "OmniMind Agent state must be physically separate from stock Pi state",
    );
    expect(() => resolveOmniMindAgentDir(aliasedChild)).toThrow(
      "OmniMind Agent state must be physically separate from stock Pi state",
    );
  });

  it("rejects an isolated stock Pi symlink that targets the product agent directory", async () => {
    const root = await makeRoot();
    const providerHome = await isolateProviderHome(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir);
    await symlink(
      agentDir,
      path.join(providerHome, ".pi"),
      process.platform === "win32" ? "junction" : "dir",
    );

    expect(() => resolveOmniMindAgentDir(root)).toThrow(
      "OmniMind Agent state must be physically separate from stock Pi state",
    );
  });

  it("rejects a candidate below an isolated stock Pi alias to the filesystem root", async () => {
    const root = await makeRoot();
    const providerHome = await isolateProviderHome(root);
    const filesystemRoot = path.parse(root).root;
    await symlink(
      filesystemRoot,
      path.join(providerHome, ".pi"),
      process.platform === "win32" ? "junction" : "dir",
    );

    expect(() => resolveOmniMindAgentDir(root)).toThrow(
      "OmniMind Agent state must be physically separate from stock Pi state",
    );
  });
});
