import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

async function loadOAuthPageModule() {
  const packageIndex = resolvePiAiPackageIndex();
  const moduleUrl = pathToFileURL(
    path.join(path.dirname(packageIndex), "auth", "oauth", "oauth-page.js"),
  ).href;
  return (await import(moduleUrl)) as {
    readonly oauthSuccessHtml: (
      message: string,
      renderer?: (input: { kind: "authorization_received" | "error" }) => string,
    ) => string;
    readonly oauthErrorHtml: (
      message: string,
      details?: string,
      renderer?: (input: { kind: "authorization_received" | "error" }) => string,
    ) => string;
  };
}

function resolvePiAiPackageIndex(): string {
  return fileURLToPath(import.meta.resolve("@earendil-works/pi-ai"));
}

describe("patched Pi OAuth page presentation seam", () => {
  it("routes every Pi browser callback engine through the request-scoped renderer", () => {
    const authRoot = path.join(path.dirname(resolvePiAiPackageIndex()), "auth", "oauth");

    for (const providerFile of ["anthropic.js", "openai-codex.js", "openrouter.js", "radius.js"]) {
      expect(readFileSync(path.join(authRoot, providerFile), "utf8"), providerFile).toContain(
        "interaction.renderOAuthPage",
      );
    }
  });

  it("preserves the stock page when no app renderer is provided", async () => {
    const { oauthSuccessHtml } = await loadOAuthPageModule();
    const html = oauthSuccessHtml("Stock Pi completion");

    expect(html).toContain("Authentication successful");
    expect(html).toContain("Stock Pi completion");
    expect(html).toContain("#09090b");
  });

  it("uses a request-scoped renderer and falls back safely if presentation fails", async () => {
    const { oauthErrorHtml, oauthSuccessHtml } = await loadOAuthPageModule();
    const rendered = oauthErrorHtml("Engine failure", "technical detail", (input) =>
      JSON.stringify(input),
    );
    expect(JSON.parse(rendered)).toEqual({
      kind: "error",
    });

    const received = oauthSuccessHtml("Engine-owned pre-exchange message", (input) =>
      JSON.stringify(input),
    );
    expect(JSON.parse(received)).toEqual({ kind: "authorization_received" });

    const fallback = oauthSuccessHtml("Callback still completes", () => {
      throw new Error("presentation failed");
    });
    expect(fallback).toContain("Authentication successful");
    expect(fallback).toContain("Callback still completes");
  });
});
