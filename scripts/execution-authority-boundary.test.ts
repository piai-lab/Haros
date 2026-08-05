import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

function sourceFiles(path: string): string[] {
  const absolutePath = resolve(repositoryRoot, path);
  if (!existsSync(absolutePath)) return [];
  if (statSync(absolutePath).isFile()) return [absolutePath];
  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(absolutePath, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return [".ts", ".tsx", ".mts", ".cts"].includes(extname(entry.name)) ? [child] : [];
  });
}

describe("execution authority boundary", () => {
  it("physically removes retired Service execution buses", () => {
    const retiredRoots = [
      "apps/service/src/agentGateway",
      "apps/service/src/browserAutomation",
      "apps/service/src/externalMcp",
      "apps/service/src/orchestration",
      "apps/service/src/provider",
      "apps/service/src/providerUsage",
    ];

    for (const path of retiredRoots) {
      expect(sourceFiles(path), path).toEqual([]);
    }
  });

  it("does not compose a buildable general execution bridge in Product Service", () => {
    const composition = [
      read("apps/service/src/serverLayers.ts"),
      read("apps/service/src/main.ts"),
      read("apps/service/src/effectServer.ts"),
    ].join("\n");

    expect(composition).not.toMatch(
      /AgentGateway|BrowserAutomationHost|ExternalMcpGateway|OrchestrationEngine|ProviderService|RuntimeReceiptBus/u,
    );
  });

  it("preserves Desktop Browser ownership while removing the orphan Service bridge", () => {
    expect(existsSync(resolve(repositoryRoot, "apps/desktop/src/browserAutomation"))).toBe(true);
    expect(
      existsSync(
        resolve(
          repositoryRoot,
          "apps/desktop/src/browserAutomation/desktopBrowserAutomationHost.ts",
        ),
      ),
    ).toBe(true);
    expect(sourceFiles("apps/service/src/browserAutomation")).toEqual([]);
  });

  it("removes the shared and renderer entrypoints for the retired authority", () => {
    const retiredEntrypoints = [
      "packages/contracts/src/agentGateway.ts",
      "packages/contracts/src/externalMcp.ts",
      "packages/contracts/src/model.ts",
      "packages/contracts/src/orchestration.ts",
      "packages/contracts/src/provider.ts",
      "packages/contracts/src/providerDiscovery.ts",
      "packages/contracts/src/providerRuntime.ts",
      "apps/web/src/lib/providerDiscovery.ts",
      "apps/web/src/hooks/useThreadHandoff.ts",
    ];

    for (const path of retiredEntrypoints) {
      expect(existsSync(resolve(repositoryRoot, path)), path).toBe(false);
    }

    const productionRoots = [
      "apps/desktop/src",
      "apps/service/src",
      "apps/web/src",
      "packages/contracts/src",
      "packages/shared/src",
    ];
    const productionSource = productionRoots
      .flatMap(sourceFiles)
      .filter((path) => !/\.(?:test|browser)\.[cm]?tsx?$/u.test(path))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(productionSource).not.toMatch(
      /\bProviderKind\b|\bModelSelection\b|ProviderDiscoveryKind|MODEL_OPTIONS_BY_PROVIDER|PROVIDER_DISPLAY_NAMES|api\.orchestration|ORCHESTRATION_WS_METHODS/u,
    );
  });

  it("retires donor commands from public defaults, help, and route dispatch", () => {
    const retiredCommand =
      /chat\.new(?:Claude|Codex|Cursor)|modelPicker\.toggle|model\.(?:next|previous)|traitsPicker\.toggle/u;
    const publicCommandSurfaces = [
      read("packages/contracts/src/keybindings.ts"),
      read("apps/web/src/keybindings.ts"),
      read("apps/web/src/shortcutsSheet.ts"),
      read("apps/web/src/routes/_chat.tsx"),
      read("apps/web/src/components/ChatView.tsx"),
      read("apps/web/src/components/ChatView.logic.ts"),
    ].join("\n");
    const serviceKeybindings = read("apps/service/src/keybindings.ts");
    const serviceDefaults = serviceKeybindings.slice(
      0,
      serviceKeybindings.indexOf("const LEGACY_KEYBINDING_COMMAND_ALIASES"),
    );

    expect(publicCommandSurfaces).not.toMatch(retiredCommand);
    expect(serviceDefaults).not.toMatch(retiredCommand);
    for (const command of [
      "chat.newClaude",
      "chat.newCodex",
      "chat.newCursor",
      "modelPicker.toggle",
      "model.next",
      "model.previous",
      "traitsPicker.toggle",
    ]) {
      expect(serviceKeybindings).toContain(`"${command}"`);
    }
  });

  it("keeps donor interaction types and source ids in historical boundaries only", () => {
    const currentWebSource = [
      read("apps/web/src/types.ts"),
      read("apps/web/src/composerDraftStore.ts"),
      read("apps/web/src/composerDraftPersistence.ts"),
      read("apps/web/src/components/ChatView.tsx"),
      read("apps/web/src/lib/threadBootstrap.ts"),
      read("apps/web/src/lib/threadRename.ts"),
    ].join("\n");

    expect(currentWebSource).not.toContain("ProviderInteractionMode");
    expect(read("apps/web/src/storeNormalization.ts")).not.toContain("toLegacyProvider");
    expect(read("apps/web/src/historicalConversation.ts")).toContain("ProviderInteractionMode");
  });
});
