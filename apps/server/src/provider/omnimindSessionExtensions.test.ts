import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildOmniMindSessionExtensions } from "./omnimindSessionExtensions.ts";

describe("bundled OmniMind Web Access composition", () => {
  it("creates canonical config only when the Session extension factory starts", async () => {
    const root = mkdtempSync(join(tmpdir(), "omnimind-web-composition-"));
    const agentDir = join(root, "agent");
    const composition = buildOmniMindSessionExtensions({
      agentDir,
      defineTool: (tool) => tool,
    });
    const webAccess = composition.webAccess as Exclude<
      typeof composition.webAccess,
      (...args: never[]) => unknown
    >;
    const configPath = join(agentDir, "web-search.json");
    expect(webAccess.name).toBe("omnimind-web-access");
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
});
