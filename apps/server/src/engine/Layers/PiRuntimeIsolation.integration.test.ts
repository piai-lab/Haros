import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as pi from "@earendil-works/pi-coding-agent";
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
  it("keeps sessions and package roots inside the explicit agentDir rather than a forked OA runtime", async () => {
    const root = makeRoot();
    const cwd = path.join(root, "project");
    const firstAgentDir = path.join(root, "first-agent");
    const secondAgentDir = path.join(root, "second-agent");
    mkdirSync(cwd, { recursive: true });

    expect(pi.VERSION).toBe("0.84.4");
    expect(pi.CONFIG_DIR_NAME).toBe(".pi");

    writeSkill(path.join(firstAgentDir, "skills"), "first-global");
    writeSkill(path.join(secondAgentDir, "skills"), "second-global");
    writeSkill(path.join(cwd, ".pi", "skills"), "project-skill");

    const firstLoader = new pi.DefaultResourceLoader({
      cwd,
      agentDir: firstAgentDir,
      noExtensions: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    });
    const secondLoader = new pi.DefaultResourceLoader({
      cwd,
      agentDir: secondAgentDir,
      noExtensions: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    });
    await Promise.all([firstLoader.reload(), secondLoader.reload()]);

    const firstSkillNames = firstLoader.getSkills().skills.map((skill) => skill.name);
    const secondSkillNames = secondLoader.getSkills().skills.map((skill) => skill.name);
    expect(firstSkillNames).toEqual(expect.arrayContaining(["first-global", "project-skill"]));
    expect(firstSkillNames).not.toContain("second-global");
    expect(secondSkillNames).toEqual(expect.arrayContaining(["second-global", "project-skill"]));
    expect(secondSkillNames).not.toContain("first-global");

    const firstSessionDir = path.join(firstAgentDir, "sessions", "test");
    const secondSessionDir = path.join(secondAgentDir, "sessions", "test");
    const firstSession = pi.SessionManager.create(cwd, firstSessionDir);
    const secondSession = pi.SessionManager.create(cwd, secondSessionDir);
    expect(firstSession.getSessionFile()).toContain(firstSessionDir);
    expect(secondSession.getSessionFile()).toContain(secondSessionDir);

    const firstPackagePath = path.join(cwd, ".pi", "npm", "node_modules", "example");
    mkdirSync(firstPackagePath, { recursive: true });
    const firstPackages = new pi.DefaultPackageManager({
      cwd,
      agentDir: firstAgentDir,
      settingsManager: pi.SettingsManager.create(cwd, firstAgentDir, {
        projectTrusted: true,
      }),
    });
    expect(firstPackages.getInstalledPath("npm:example", "project")).toBe(firstPackagePath);
  });
});
