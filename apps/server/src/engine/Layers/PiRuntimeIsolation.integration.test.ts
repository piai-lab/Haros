import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as stock from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "harnessos-pi-isolation-"));
  roots.push(root);
  return root;
}

function writeSkill(root: string, name: string): void {
  const directory = path.join(root, name);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${name}\n---\n\n# ${name}\n`,
  );
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Pi runtime physical isolation", () => {
  it("keeps stock Pi module identity, resources, sessions, and package roots on .pi", async () => {
    const root = makeRoot();
    const cwd = path.join(root, "project");
    const stockAgentDir = path.join(root, "stock-agent");
    mkdirSync(cwd, { recursive: true });

    expect(stock.VERSION).toBe("0.84.4");
    expect(stock.CONFIG_DIR_NAME).toBe(".pi");

    writeSkill(path.join(stockAgentDir, "skills"), "stock-global");
    writeSkill(path.join(cwd, ".pi", "skills"), "stock-project");

    const stockLoader = new stock.DefaultResourceLoader({
      cwd,
      agentDir: stockAgentDir,
      noExtensions: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    });
    await stockLoader.reload();

    const stockSkillNames = stockLoader.getSkills().skills.map((skill) => skill.name);
    expect(stockSkillNames).toEqual(expect.arrayContaining(["stock-global", "stock-project"]));

    const stockSessionDir = path.join(stockAgentDir, "sessions", "test");
    const stockSession = stock.SessionManager.create(cwd, stockSessionDir);
    expect(stockSession.getSessionFile()).toContain(stockSessionDir);

    const stockPackagePath = path.join(cwd, ".pi", "npm", "node_modules", "example");
    mkdirSync(stockPackagePath, { recursive: true });
    const stockPackages = new stock.DefaultPackageManager({
      cwd,
      agentDir: stockAgentDir,
      settingsManager: stock.SettingsManager.create(cwd, stockAgentDir, {
        projectTrusted: true,
      }),
    });
    expect(stockPackages.getInstalledPath("npm:example", "project")).toBe(stockPackagePath);
  });
});
