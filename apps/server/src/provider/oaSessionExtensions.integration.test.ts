import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildOASessionExtensions } from "./oaSessionExtensions.ts";

const compositionRoots = new Set<string>();

afterEach(() => {
  for (const root of compositionRoots) {
    rmSync(root, { recursive: true, force: true });
    compositionRoots.delete(root);
  }
});

describe("bundled HarnessOS Web Access composition", () => {
  it("creates canonical config only when the Session extension factory starts", async () => {
    const root = mkdtempSync(join(tmpdir(), "harnessos-web-composition-"));
    compositionRoots.add(root);
    const agentDir = join(root, "agent");
    const composition = buildOASessionExtensions({
      agentDir,
      defineTool: (tool) => tool,
    });
    const webAccess = composition.webAccess as Exclude<
      typeof composition.webAccess,
      (...args: never[]) => unknown
    >;
    const configPath = join(agentDir, "web-search.json");
    expect(webAccess.name).toBe("harnessos-web-access");
    expect(
      typeof composition.extensions[0] === "function" ? undefined : composition.extensions[0]?.name,
    ).toBe("harnessos-agent-plan-guard");
    expect(existsSync(configPath)).toBe(false);

    const tools: Array<{ readonly name: string }> = [];
    await webAccess.factory({
      registerTool(tool: { readonly name: string }) {
        tools.push(tool);
      },
      registerCommand() {},
      registerShortcut() {},
      on() {},
    } as never);

    expect(tools.map(({ name }) => name)).toEqual([
      "web_search",
      "source_check",
      "fetch_content",
      "get_search_content",
    ]);
    expect(JSON.parse(readFileSync(configPath, "utf8"))).toEqual({
      schemaVersion: 1,
      provider: "auto",
      workflow: "auto-summary",
      autoOpenBrowser: false,
    });
    if (process.platform !== "win32") {
      expect(statSync(configPath).mode & 0o777).toBe(0o600);
    }
  });

  it("adds Ask User only when the Host supplies the canonical interaction port", async () => {
    const root = mkdtempSync(join(tmpdir(), "harnessos-ask-composition-"));
    compositionRoots.add(root);
    const withoutPresenter = buildOASessionExtensions({
      agentDir: join(root, "without"),
      defineTool: (tool) => tool,
    });
    expect(withoutPresenter.askUserExtension).toBeUndefined();

    const withPresenter = buildOASessionExtensions({
      agentDir: join(root, "with"),
      defineTool: (tool) => tool,
      askUserInteraction: {
        present: async () => ({ version: 1, requestId: "request-1", status: "unavailable" }),
      },
    });
    expect(withPresenter.askUserExtension).toBeDefined();
    expect(
      withPresenter.extensions.filter(
        (extension) =>
          typeof extension !== "function" && extension.name === "harnessos-agent-ask-user",
      ),
    ).toHaveLength(1);
  });
});
