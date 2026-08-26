import { link, mkdir, mkdtemp, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const privateReadRace = vi.hoisted(() => ({
  afterSuccessfulLstat: undefined as undefined | ((candidate: string) => Promise<void>),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    lstat: async (...args: Parameters<typeof actual.lstat>) => {
      const metadata = await actual.lstat(...args);
      const hook = privateReadRace.afterSuccessfulLstat;
      if (hook) await hook(String(args[0]));
      return metadata;
    },
  };
});

import {
  createOmniMindModelsConfigReader,
  readOmniMindPrivateTextFile,
  resolveOmniMindAgentDir,
} from "./omnimindAgentRuntime.ts";

const roots: string[] = [];

afterEach(async () => {
  privateReadRace.afterSuccessfulLstat = undefined;
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

describe("readOmniMindPrivateTextFile", () => {
  it("reads one ordinary fixed leaf and treats a missing models config as absent", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir);
    await writeFile(path.join(agentDir, "models.json"), "{\n  // Pi parses this\n}\n", {
      mode: 0o600,
    });

    await expect(readOmniMindPrivateTextFile({ agentDir, filename: "models.json" })).resolves.toBe(
      "{\n  // Pi parses this\n}\n",
    );
    await rm(path.join(agentDir, "models.json"));
    await expect(createOmniMindModelsConfigReader(agentDir)({})).resolves.toBeUndefined();
  });

  it("rejects disappearance after the models config was observed", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const agentDir = path.join(root, "agent");
    const modelsPath = path.join(agentDir, "models.json");
    await mkdir(agentDir);
    await writeFile(modelsPath, "{}");
    let removed = false;
    privateReadRace.afterSuccessfulLstat = async (candidate) => {
      if (!removed && candidate === modelsPath) {
        removed = true;
        await rm(modelsPath);
      }
    };

    await expect(createOmniMindModelsConfigReader(agentDir)({})).rejects.toThrow(
      "OmniMind Agent state changed during the safe read",
    );
  });

  it("rejects deletion after the same reader accepted the models config", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const agentDir = path.join(root, "agent");
    const modelsPath = path.join(agentDir, "models.json");
    await mkdir(agentDir);
    await writeFile(modelsPath, "{}");
    const reader = createOmniMindModelsConfigReader(agentDir);

    await expect(reader({})).resolves.toBe("{}");
    await rm(modelsPath);

    await expect(reader({})).rejects.toThrow("OmniMind Agent state changed during the safe read");
  });

  it("rejects replacement after the same reader accepted the models config", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const agentDir = path.join(root, "agent");
    const modelsPath = path.join(agentDir, "models.json");
    const replacementPath = path.join(agentDir, "models.next.json");
    await mkdir(agentDir);
    await writeFile(modelsPath, '{"version":1}');
    const reader = createOmniMindModelsConfigReader(agentDir);

    await expect(reader({})).resolves.toBe('{"version":1}');
    await writeFile(replacementPath, '{"version":2}');
    await rename(replacementPath, modelsPath);

    await expect(reader({})).rejects.toThrow("OmniMind Agent state changed during the safe read");
  });

  it.each(["symbolic link", "hard link"] as const)("rejects a %s leaf", async (kind) => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const agentDir = path.join(root, "agent");
    const outside = path.join(root, "outside.json");
    await mkdir(agentDir);
    await writeFile(outside, '{ "providers": {} }');
    if (kind === "symbolic link") {
      await symlink(outside, path.join(agentDir, "models.json"), "file");
    } else {
      await link(outside, path.join(agentDir, "models.json"));
    }

    await expect(createOmniMindModelsConfigReader(agentDir)({})).rejects.toThrow(
      "OmniMind Agent state is not a private regular file",
    );
  });

  it("rejects a linked state root without relying on leaf path normalization", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const physicalAgentDir = path.join(root, "physical-agent");
    const linkedAgentDir = path.join(root, "agent");
    await mkdir(physicalAgentDir);
    await writeFile(path.join(physicalAgentDir, "models.json"), "{}");
    await symlink(
      physicalAgentDir,
      linkedAgentDir,
      process.platform === "win32" ? "junction" : "dir",
    );

    await expect(createOmniMindModelsConfigReader(linkedAgentDir)({})).rejects.toThrow(
      "OmniMind Agent state root is not a private directory",
    );
  });

  it("rejects oversized and malformed UTF-8 content without returning partial text", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const agentDir = path.join(root, "agent");
    const modelsPath = path.join(agentDir, "models.json");
    await mkdir(agentDir);
    await writeFile(modelsPath, new Uint8Array(4 * 1024 * 1024 + 1));
    await expect(createOmniMindModelsConfigReader(agentDir)({})).rejects.toThrow(
      "safe read boundary",
    );

    await writeFile(modelsPath, new Uint8Array([0xc3, 0x28]));
    await expect(createOmniMindModelsConfigReader(agentDir)({})).rejects.toThrow();
  });

  it("honors cancellation before opening the private file", async () => {
    const root = await makeRoot();
    await isolateProviderHome(root);
    const agentDir = path.join(root, "agent");
    await mkdir(agentDir);
    await writeFile(path.join(agentDir, "models.json"), "{}");
    const controller = new AbortController();
    controller.abort();

    await expect(
      createOmniMindModelsConfigReader(agentDir)({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
