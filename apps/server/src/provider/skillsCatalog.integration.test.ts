// FILE: skillsCatalog.test.ts
// Purpose: Verifies the unified cross-engine skills catalog discovery, dedup
//          precedence, merge with engine-native results, and toggle filtering.
// Layer: Server engine tests

import { mkdtempSync, rmSync } from "node:fs";
import { mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import type { EngineSkillDescriptor } from "@harnessos/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearSkillsCatalogCacheForTests,
  discoverSkillsCatalog,
  filterDisabledSkills,
  mergeSkillsIntoCatalog,
  parseSkillFrontmatter,
  skillsCatalogRoots,
} from "./skillsCatalog.ts";
import { pathIsWithin } from "./claudePluginSkills.ts";

let root: string;
let homeDir: string;
let harnessosBaseDir: string;

async function writeSkill(skillDir: string, name: string, description: string): Promise<void> {
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    `---
name: ${name}
description: ${description}
---

# ${name}
`,
  );
}

function claudePluginInstallPath(marketplace: string, plugin: string, version: string): string {
  return path.join(homeDir, ".claude", "plugins", "cache", marketplace, plugin, version);
}

async function writeClaudePluginManifest(
  plugins: Record<string, ReadonlyArray<Record<string, unknown>> | unknown>,
): Promise<void> {
  const manifestPath = path.join(homeDir, ".claude", "plugins", "installed_plugins.json");
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify({ version: 2, plugins }, null, 2));
}

beforeEach(() => {
  clearSkillsCatalogCacheForTests();
  root = mkdtempSync(path.join(os.tmpdir(), "harnessos-skills-catalog-"));
  homeDir = path.join(root, "home");
  harnessosBaseDir = path.join(homeDir, ".harnessos");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("parseSkillFrontmatter", () => {
  it("parses scalar Agent Skill metadata", () => {
    expect(
      parseSkillFrontmatter(`---
name: check-code
description: "Review recent code changes"
disable-model-invocation: true
---

# Check Code
`),
    ).toEqual({
      name: "check-code",
      description: "Review recent code changes",
      "disable-model-invocation": true,
    });
  });
});

describe("pathIsWithin", () => {
  it("rejects Windows paths on another drive while preserving same-drive containment", () => {
    expect(pathIsWithin("C:\\plugins", "C:\\plugins", path.win32)).toBe(true);
    expect(pathIsWithin("C:\\plugins", "C:\\plugins\\workflow-kit", path.win32)).toBe(true);
    expect(pathIsWithin("C:\\plugins", "C:\\other", path.win32)).toBe(false);
    expect(pathIsWithin("C:\\plugins", "D:\\plugins\\workflow-kit", path.win32)).toBe(false);
  });
});

describe("discoverSkillsCatalog", () => {
  it("creates the HarnessOS skills folder on first discovery", async () => {
    await discoverSkillsCatalog({ homeDir, harnessosBaseDir });
    await expect(access(path.join(harnessosBaseDir, "skills"))).resolves.toBeUndefined();
  });

  it("aggregates shared engine homes without touching stock Pi state", async () => {
    await writeSkill(
      path.join(harnessosBaseDir, "skills", "portable"),
      "portable",
      "HarnessOS skill",
    );
    await writeSkill(path.join(homeDir, ".codex", "skills", "codex-only"), "codex-only", "Codex");
    await writeSkill(
      path.join(homeDir, ".claude", "skills", "claude-only"),
      "claude-only",
      "Claude",
    );
    await writeSkill(
      path.join(homeDir, ".cursor", "skills", "cursor-only"),
      "cursor-only",
      "Cursor",
    );
    await writeSkill(path.join(homeDir, ".grok", "skills", "grok-only"), "grok-only", "Grok");
    await writeSkill(path.join(homeDir, ".kilo", "skills", "kilo-only"), "kilo-only", "Kilo");
    await writeSkill(
      path.join(homeDir, ".config", "opencode", "skills", "opencode-only"),
      "opencode-only",
      "OpenCode",
    );
    await writeSkill(path.join(homeDir, ".pi", "agent", "skills", "pi-only"), "pi-only", "Pi");

    const skills = await discoverSkillsCatalog({ homeDir, harnessosBaseDir });
    const byName = new Map(skills.map((skill) => [skill.name, skill]));

    expect(byName.get("portable")?.scope).toBe("oa");
    expect(byName.get("codex-only")?.scope).toBe("codex");
    expect(byName.get("claude-only")?.scope).toBe("claude");
    expect(byName.get("cursor-only")?.scope).toBe("cursor");
    expect(byName.get("grok-only")?.scope).toBe("grok");
    expect(byName.get("kilo-only")?.scope).toBe("kilo");
    expect(byName.get("opencode-only")?.scope).toBe("opencode");
    expect(byName.get("pi-only")).toBeUndefined();
  });

  it("includes stock Pi roots only after Pi is explicitly selected", () => {
    const neutralRoots = skillsCatalogRoots({ homeDir, harnessosBaseDir });
    expect(neutralRoots.some((root) => root.path.includes(`${path.sep}.pi${path.sep}`))).toBe(
      false,
    );

    const piRoots = skillsCatalogRoots({ homeDir, harnessosBaseDir, engine: "pi" });
    expect(piRoots.some((root) => root.path.includes(`${path.sep}.pi${path.sep}`))).toBe(true);
  });

  it("does not scan unrelated Engine homes for a selected engine", () => {
    const codexRoots = skillsCatalogRoots({
      homeDir,
      harnessosBaseDir,
      engine: "codex",
    });
    const paths = codexRoots.map((root) => root.path);

    expect(paths.some((rootPath) => rootPath.includes(`${path.sep}.codex${path.sep}`))).toBe(true);
    expect(paths.some((rootPath) => rootPath.includes(`${path.sep}.harnessos${path.sep}`))).toBe(
      true,
    );
    expect(paths.some((rootPath) => rootPath.includes(`${path.sep}.claude${path.sep}`))).toBe(
      false,
    );
    expect(paths.some((rootPath) => rootPath.includes(`${path.sep}.pi${path.sep}`))).toBe(false);
  });

  it("discovers only the registered Claude plugin version for Grok with its native namespace", async () => {
    const currentInstallPath = claudePluginInstallPath("skill-forge", "workflow-kit", "1.21.0");
    const staleInstallPath = claudePluginInstallPath("skill-forge", "workflow-kit", "1.20.0");
    await writeSkill(
      path.join(currentInstallPath, "skills", "feature-delivery"),
      "feature-delivery",
      "Deliver a feature",
    );
    await writeSkill(
      path.join(staleInstallPath, "skills", "stale-only"),
      "stale-only",
      "Old cache entry",
    );
    await writeClaudePluginManifest({
      "workflow-kit@skill-forge": [
        {
          scope: "user",
          installPath: currentInstallPath,
          version: "1.21.0",
        },
      ],
    });

    const skills = await discoverSkillsCatalog({
      homeDir,
      harnessosBaseDir,
      engine: "grok",
    });

    expect(skills.find((skill) => skill.name === "workflow-kit:feature-delivery")).toMatchObject({
      scope: "claude",
      path: await realpath(path.join(currentInstallPath, "skills", "feature-delivery", "SKILL.md")),
    });
    expect(skills.some((skill) => skill.name.includes("stale-only"))).toBe(false);
  });

  it("dedupes duplicate Claude plugin registrations deterministically", async () => {
    const installPath = claudePluginInstallPath("skill-forge", "workflow-kit", "1.21.0");
    await writeSkill(
      path.join(installPath, "skills", "feature-delivery"),
      "feature-delivery",
      "Deliver a feature",
    );
    const install = { scope: "user", installPath, version: "1.21.0" };
    await writeClaudePluginManifest({
      "workflow-kit@skill-forge": [install, install],
    });

    const skills = await discoverSkillsCatalog({
      homeDir,
      harnessosBaseDir,
      includeDuplicateOrigins: true,
    });

    expect(skills.filter((skill) => skill.name === "workflow-kit:feature-delivery")).toHaveLength(
      1,
    );
  });

  it("uses deterministic plugin-id precedence when namespaces and skill names collide", async () => {
    const alphaInstallPath = claudePluginInstallPath("alpha", "workflow-kit", "1.0.0");
    const zetaInstallPath = claudePluginInstallPath("zeta", "workflow-kit", "1.0.0");
    await Promise.all([
      writeSkill(
        path.join(alphaInstallPath, "skills", "feature-delivery"),
        "feature-delivery",
        "Alpha copy",
      ),
      writeSkill(
        path.join(zetaInstallPath, "skills", "feature-delivery"),
        "feature-delivery",
        "Zeta copy",
      ),
    ]);
    await writeClaudePluginManifest({
      "workflow-kit@zeta": [{ scope: "user", installPath: zetaInstallPath }],
      "workflow-kit@alpha": [{ scope: "user", installPath: alphaInstallPath }],
    });

    const skills = await discoverSkillsCatalog({ homeDir, harnessosBaseDir });
    const featureDelivery = skills.find((skill) => skill.name === "workflow-kit:feature-delivery");

    expect(featureDelivery?.description).toBe("Alpha copy");
    expect(featureDelivery?.path).toContain(path.join("cache", "alpha", "workflow-kit"));
  });

  it("includes user and matching project Claude plugins but excludes other projects", async () => {
    const cwd = path.join(root, "repo", "packages", "web");
    const otherProject = path.join(root, "other-repo");
    await Promise.all([mkdir(cwd, { recursive: true }), mkdir(otherProject, { recursive: true })]);
    const userInstallPath = claudePluginInstallPath("plugins", "user-tools", "1.0.0");
    const projectInstallPath = claudePluginInstallPath("plugins", "project-tools", "1.0.0");
    const otherInstallPath = claudePluginInstallPath("plugins", "other-tools", "1.0.0");
    await Promise.all([
      writeSkill(path.join(userInstallPath, "skills", "user-skill"), "user-skill", "User"),
      writeSkill(
        path.join(projectInstallPath, "skills", "project-skill"),
        "project-skill",
        "Project",
      ),
      writeSkill(path.join(otherInstallPath, "skills", "other-skill"), "other-skill", "Other"),
    ]);
    await writeClaudePluginManifest({
      "user-tools@plugins": [{ scope: "user", installPath: userInstallPath }],
      "project-tools@plugins": [
        { scope: "project", projectPath: path.join(root, "repo"), installPath: projectInstallPath },
      ],
      "other-tools@plugins": [
        { scope: "project", projectPath: otherProject, installPath: otherInstallPath },
      ],
    });

    const skills = await discoverSkillsCatalog({ cwd, homeDir, harnessosBaseDir });
    expect(skills.map((skill) => skill.name)).toEqual(
      expect.arrayContaining(["user-tools:user-skill", "project-tools:project-skill"]),
    );
    expect(skills.some((skill) => skill.name === "other-tools:other-skill")).toBe(false);
  });

  it("uses one highest-precedence applicable install per Claude plugin ID", async () => {
    const cwd = path.join(root, "repo", "packages", "web");
    await mkdir(cwd, { recursive: true });
    const userInstallPath = claudePluginInstallPath("plugins", "workflow-kit", "1.0.0");
    const projectInstallPath = claudePluginInstallPath("plugins", "workflow-kit", "2.0.0");
    await Promise.all([
      writeSkill(path.join(userInstallPath, "skills", "user-only"), "user-only", "User copy only"),
      writeSkill(
        path.join(projectInstallPath, "skills", "project-only"),
        "project-only",
        "Project copy only",
      ),
    ]);
    await writeClaudePluginManifest({
      "workflow-kit@plugins": [
        { scope: "user", installPath: userInstallPath },
        {
          scope: "project",
          projectPath: path.join(root, "repo"),
          installPath: projectInstallPath,
        },
      ],
    });

    const skills = await discoverSkillsCatalog({ cwd, homeDir, harnessosBaseDir });
    expect(skills.map((skill) => skill.name)).toContain("workflow-kit:project-only");
    expect(skills.map((skill) => skill.name)).not.toContain("workflow-kit:user-only");
  });

  it("ignores malformed registrations and install paths outside Claude's plugin cache", async () => {
    const validInstallPath = claudePluginInstallPath("plugins", "valid", "1.0.0");
    const outsideInstallPath = path.join(root, "outside-plugin");
    await writeSkill(path.join(validInstallPath, "skills", "valid-skill"), "valid-skill", "Valid");
    await writeSkill(
      path.join(outsideInstallPath, "skills", "outside-skill"),
      "outside-skill",
      "Outside",
    );
    await symlink(
      path.join(outsideInstallPath, "skills", "outside-skill"),
      path.join(validInstallPath, "skills", "linked-outside"),
      "dir",
    );
    await writeClaudePluginManifest({
      "valid@plugins": [{ scope: "user", installPath: validInstallPath }],
      "outside@plugins": [{ scope: "user", installPath: outsideInstallPath }],
      "relative@plugins": [{ scope: "user", installPath: "relative/plugin" }],
      "missing@plugins": [{ scope: "user", installPath: path.join(validInstallPath, "missing") }],
      malformed: [{ scope: "user", installPath: validInstallPath }],
      "wrong-shape@plugins": { scope: "user", installPath: validInstallPath },
    });

    const skills = await discoverSkillsCatalog({ homeDir, harnessosBaseDir });
    expect(skills.map((skill) => skill.name)).toContain("valid:valid-skill");
    expect(skills.some((skill) => skill.name.includes("outside-skill"))).toBe(false);
    expect(skills.filter((skill) => skill.name === "valid:valid-skill")).toHaveLength(1);
  });

  it("follows symlinked skill directories from engine homes", async () => {
    const realSkillDir = path.join(root, "linked-skills", "check-code");
    await writeSkill(realSkillDir, "check-code", "Linked Claude skill");
    await mkdir(path.join(homeDir, ".claude", "skills"), { recursive: true });
    await symlink(realSkillDir, path.join(homeDir, ".claude", "skills", "check-code"), "dir");

    const skills = await discoverSkillsCatalog({
      homeDir,
      harnessosBaseDir,
      includeDuplicateOrigins: true,
    });

    const linkedSkill = skills.find((skill) => skill.name === "check-code");
    expect(linkedSkill?.scope).toBe("claude");
    expect(linkedSkill?.path).toContain(path.join(".claude", "skills", "check-code", "SKILL.md"));
  });

  it("can include duplicate skill names from different origins for settings", async () => {
    await writeSkill(path.join(homeDir, ".codex", "skills", "reviewer"), "reviewer", "Codex");
    await writeSkill(path.join(homeDir, ".claude", "skills", "reviewer"), "reviewer", "Claude");

    const defaultCatalog = await discoverSkillsCatalog({ homeDir, harnessosBaseDir });
    expect(defaultCatalog.filter((skill) => skill.name === "reviewer")).toHaveLength(1);
    expect(defaultCatalog.find((skill) => skill.name === "reviewer")?.scope).toBe("codex");

    const settingsCatalog = await discoverSkillsCatalog({
      homeDir,
      harnessosBaseDir,
      includeDuplicateOrigins: true,
    });
    expect(settingsCatalog.filter((skill) => skill.name === "reviewer")).toHaveLength(2);
    expect(settingsCatalog.map((skill) => skill.scope).sort()).toEqual(["claude", "codex"]);
  });

  it("prefers the engine-native copy and falls back to HarnessOS for that engine", async () => {
    await writeSkill(path.join(harnessosBaseDir, "skills", "shared"), "shared", "HarnessOS copy");
    await writeSkill(path.join(homeDir, ".codex", "skills", "shared"), "shared", "Codex copy");
    await writeSkill(
      path.join(harnessosBaseDir, "skills", "only-harnessos"),
      "only-harnessos",
      "Fallback",
    );

    const codexView = await discoverSkillsCatalog({ homeDir, harnessosBaseDir, engine: "codex" });
    const codexShared = codexView.find((skill) => skill.name === "shared");
    expect(codexShared?.scope).toBe("codex");
    expect(codexShared?.path).toContain(path.join(".codex", "skills"));
    expect(codexView.some((skill) => skill.name === "only-harnessos")).toBe(true);

    // A engine without its own copy resolves the HarnessOS fallback.
    const claudeView = await discoverSkillsCatalog({
      homeDir,
      harnessosBaseDir,
      engine: "claude",
    });
    const claudeShared = claudeView.find((skill) => skill.name === "shared");
    expect(claudeShared?.scope).toBe("oa");
  });

  it("uses documented engine alias roots before HarnessOS fallbacks", async () => {
    await writeSkill(path.join(harnessosBaseDir, "skills", "shared"), "shared", "HarnessOS copy");
    await writeSkill(path.join(homeDir, ".agents", "skills", "shared"), "shared", "Agents alias");
    const antigravityView = await discoverSkillsCatalog({
      homeDir,
      harnessosBaseDir,
      engine: "antigravity",
    });

    expect(antigravityView.find((skill) => skill.name === "shared")?.scope).toBe("agents");
  });

  it("uses engine-native roots before shared aliases for Grok and Pi", async () => {
    await writeSkill(path.join(harnessosBaseDir, "skills", "shared"), "shared", "HarnessOS copy");
    await writeSkill(path.join(homeDir, ".agents", "skills", "shared"), "shared", "Agents alias");
    await writeSkill(path.join(homeDir, ".grok", "skills", "shared"), "shared", "Grok copy");
    await writeSkill(path.join(homeDir, ".pi", "agent", "skills", "shared"), "shared", "Pi copy");

    const grokView = await discoverSkillsCatalog({
      homeDir,
      harnessosBaseDir,
      engine: "grok",
    });
    const piView = await discoverSkillsCatalog({
      homeDir,
      harnessosBaseDir,
      engine: "pi",
    });

    expect(grokView.find((skill) => skill.name === "shared")?.scope).toBe("grok");
    expect(piView.find((skill) => skill.name === "shared")?.scope).toBe("pi");
  });

  it("discovers Pi direct markdown skills from Pi roots", async () => {
    const piRoot = path.join(homeDir, ".pi", "agent", "skills");
    await mkdir(piRoot, { recursive: true });
    await writeFile(
      path.join(piRoot, "direct-review.md"),
      `---
name: direct-review
description: Direct Pi markdown skill
---

# Direct Review
`,
    );

    const skills = await discoverSkillsCatalog({ homeDir, harnessosBaseDir, engine: "pi" });

    const directSkill = skills.find((skill) => skill.name === "direct-review");
    expect(directSkill?.scope).toBe("pi");
    expect(directSkill?.path).toContain(path.join(".pi", "agent", "skills", "direct-review.md"));
  });

  it("serves cached results within the TTL and rescans on forceReload", async () => {
    await writeSkill(path.join(harnessosBaseDir, "skills", "first"), "first", "First skill");

    const initial = await discoverSkillsCatalog({ homeDir, harnessosBaseDir });
    expect(initial.map((skill) => skill.name)).toEqual(["first"]);

    // A skill added after the first scan is invisible to the cached entry...
    await writeSkill(path.join(harnessosBaseDir, "skills", "second"), "second", "Second skill");
    const cached = await discoverSkillsCatalog({ homeDir, harnessosBaseDir });
    expect(cached.map((skill) => skill.name)).toEqual(["first"]);

    // ...but forceReload bypasses the cache and refreshes it.
    const reloaded = await discoverSkillsCatalog({ homeDir, harnessosBaseDir, forceReload: true });
    expect(reloaded.map((skill) => skill.name).sort()).toEqual(["first", "second"]);
  });

  it("includes project-level .harnessos skills when a cwd is provided", async () => {
    const cwd = path.join(root, "repo", "packages", "web");
    await mkdir(cwd, { recursive: true });
    await mkdir(path.join(root, "repo", ".git"));
    await writeSkill(
      path.join(root, "repo", ".harnessos", "skills", "repo-skill"),
      "repo-skill",
      "Project skill",
    );

    const skills = await discoverSkillsCatalog({ cwd, homeDir, harnessosBaseDir });
    expect(skills.find((skill) => skill.name === "repo-skill")?.scope).toBe("project");
  });

  it("does not scan Engine homes above the nearest repository boundary", async () => {
    const cwd = path.join(root, "repo", "packages", "web");
    await mkdir(cwd, { recursive: true });
    await mkdir(path.join(root, "repo", ".git"));
    await writeSkill(
      path.join(root, ".harnessos", "skills", "outside-repo"),
      "outside-repo",
      "Must stay outside the selected project",
    );
    await writeSkill(
      path.join(root, "repo", ".harnessos", "skills", "inside-repo"),
      "inside-repo",
      "Selected project skill",
    );

    const skills = await discoverSkillsCatalog({ cwd, homeDir, harnessosBaseDir });
    expect(skills.some((skill) => skill.name === "outside-repo")).toBe(false);
    expect(skills.find((skill) => skill.name === "inside-repo")?.scope).toBe("project");
  });

  it("keeps home origins when the cwd lives under the home dir", async () => {
    // The home dir is an ancestor of the cwd here, so home skill folders are
    // reachable as "project" roots too; they must keep their true origin.
    const cwd = path.join(homeDir, "projects", "app");
    await mkdir(cwd, { recursive: true });
    await writeSkill(path.join(homeDir, ".codex", "skills", "from-codex"), "from-codex", "Codex");
    await writeSkill(path.join(harnessosBaseDir, "skills", "portable"), "portable", "HarnessOS");

    const skills = await discoverSkillsCatalog({ cwd, homeDir, harnessosBaseDir });

    const names = skills.map((skill) => skill.name);
    expect(names.filter((name) => name === "from-codex")).toHaveLength(1);
    expect(skills.find((skill) => skill.name === "from-codex")?.scope).toBe("codex");
    expect(skills.find((skill) => skill.name === "portable")?.scope).toBe("oa");
  });

  it("dedupes same-named skills within a root deterministically", async () => {
    await writeSkill(path.join(harnessosBaseDir, "skills", "zeta"), "twin", "Copy in zeta");
    await writeSkill(path.join(harnessosBaseDir, "skills", "alpha"), "twin", "Copy in alpha");

    const skills = await discoverSkillsCatalog({ homeDir, harnessosBaseDir });
    const twins = skills.filter((skill) => skill.name === "twin");
    expect(twins).toHaveLength(1);
    expect(twins[0]?.path).toContain(path.join("skills", "alpha"));
  });
});

describe("mergeSkillsIntoCatalog", () => {
  const descriptor = (name: string, scope: string): EngineSkillDescriptor => ({
    name,
    path: `/tmp/${scope}/${name}/SKILL.md`,
    enabled: true,
    scope,
  });

  it("preserves same-named identities from different paths", () => {
    const merged = mergeSkillsIntoCatalog({
      native: [descriptor("shared", "codex-native")],
      catalog: [descriptor("Shared", "oa"), descriptor("extra", "oa")],
    });
    expect(merged).toHaveLength(3);
    expect(
      merged.filter((skill) => skill.name.toLowerCase() === "shared").map((skill) => skill.scope),
    ).toEqual(["codex-native", "oa"]);
    expect(merged.some((skill) => skill.name === "extra")).toBe(true);
  });

  it("dedupes the same physical identity rediscovered by an adapter", () => {
    const native = descriptor("shared", "codex-native");
    const merged = mergeSkillsIntoCatalog({
      native: [native],
      catalog: [{ ...native, scope: "codex-catalog" }],
    });

    expect(merged).toEqual([native]);
  });

  it("dedupes the same physical identity reached through a symlinked path", async () => {
    const skillDir = path.join(root, "physical-skill");
    const aliasDir = path.join(root, "skill-alias");
    await writeSkill(skillDir, "shared", "One physical skill");
    await symlink(skillDir, aliasDir, "dir");
    const native: EngineSkillDescriptor = {
      name: "shared",
      path: path.join(skillDir, "SKILL.md"),
      enabled: true,
      scope: "native",
    };

    expect(
      mergeSkillsIntoCatalog({
        native: [native],
        catalog: [{ ...native, path: path.join(aliasDir, "SKILL.md"), scope: "catalog" }],
      }),
    ).toEqual([native]);
  });
});

describe("filterDisabledSkills", () => {
  it("filters HarnessOS-owned skills without disabling Engine-native copies", () => {
    const skills: EngineSkillDescriptor[] = [
      {
        name: "Reviewer",
        path: "/Users/test/.harnessos/skills/reviewer/SKILL.md",
        enabled: true,
        scope: "oa",
      },
      {
        name: "Reviewer",
        path: "/Users/test/.codex/skills/reviewer/SKILL.md",
        enabled: true,
        scope: "codex",
      },
      {
        name: "writer",
        path: "/Users/test/.harnessos/skills/writer/SKILL.md",
        enabled: true,
        scope: "oa",
      },
    ];
    expect(filterDisabledSkills(skills, ["reviewer"]).map((skill) => skill.path)).toEqual([
      "/Users/test/.codex/skills/reviewer/SKILL.md",
      "/Users/test/.harnessos/skills/writer/SKILL.md",
    ]);
    expect(filterDisabledSkills(skills, [])).toHaveLength(3);
  });
});
