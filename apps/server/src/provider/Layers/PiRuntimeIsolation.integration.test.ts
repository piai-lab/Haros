import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as product from "@harnessos/oa-runtime";
import * as stock from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "omnimind-pi-isolation-"));
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
  it("keeps module identity, global/project resources, sessions, and package roots separate", async () => {
    const root = makeRoot();
    const cwd = path.join(root, "project");
    const stockAgentDir = path.join(root, "stock-agent");
    const productAgentDir = path.join(root, "product-agent");
    mkdirSync(cwd, { recursive: true });

    expect(stock.VERSION).toBe("0.84.3");
    expect(product.VERSION).toBe("0.84.3");
    expect(stock.CONFIG_DIR_NAME).toBe(".pi");
    expect(product.CONFIG_DIR_NAME).toBe(".harnessos");
    expect(stock.SessionManager).not.toBe(product.SessionManager);
    expect(stock.DefaultPackageManager).not.toBe(product.DefaultPackageManager);

    writeSkill(path.join(stockAgentDir, "skills"), "stock-global");
    writeSkill(path.join(productAgentDir, "skills"), "product-global");
    writeSkill(path.join(cwd, ".pi", "skills"), "stock-project");
    writeSkill(path.join(cwd, ".harnessos", "skills"), "product-project");

    const stockLoader = new stock.DefaultResourceLoader({
      cwd,
      agentDir: stockAgentDir,
      noExtensions: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    });
    const productLoader = new product.DefaultResourceLoader({
      cwd,
      agentDir: productAgentDir,
      noExtensions: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    });
    await Promise.all([stockLoader.reload(), productLoader.reload()]);

    expect(
      stockLoader
        .getSkills()
        .skills.map((skill) => skill.name)
        .toSorted(),
    ).toEqual(["stock-global", "stock-project"]);
    expect(
      productLoader
        .getSkills()
        .skills.map((skill) => skill.name)
        .toSorted(),
    ).toEqual(["product-global", "product-project"]);

    const stockSessionDir = path.join(stockAgentDir, "sessions", "test");
    const productSessionDir = path.join(productAgentDir, "sessions", "test");
    const stockSession = stock.SessionManager.create(cwd, stockSessionDir);
    const productSession = product.SessionManager.create(cwd, productSessionDir);
    expect(stockSession.getSessionFile()).toContain(stockSessionDir);
    expect(productSession.getSessionFile()).toContain(productSessionDir);

    const stockPackagePath = path.join(cwd, ".pi", "npm", "node_modules", "example");
    const productPackagePath = path.join(cwd, ".harnessos", "npm", "node_modules", "example");
    mkdirSync(stockPackagePath, { recursive: true });
    mkdirSync(productPackagePath, { recursive: true });
    const stockPackages = new stock.DefaultPackageManager({
      cwd,
      agentDir: stockAgentDir,
      settingsManager: stock.SettingsManager.create(cwd, stockAgentDir, {
        projectTrusted: true,
      }),
    });
    const productPackages = new product.DefaultPackageManager({
      cwd,
      agentDir: productAgentDir,
      settingsManager: product.SettingsManager.create(cwd, productAgentDir, {
        projectTrusted: true,
      }),
    });
    expect(stockPackages.getInstalledPath("npm:example", "project")).toBe(stockPackagePath);
    expect(productPackages.getInstalledPath("npm:example", "project")).toBe(productPackagePath);
  });
});
