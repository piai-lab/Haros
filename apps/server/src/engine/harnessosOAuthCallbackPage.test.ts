import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createHarosOAuthPageRenderer,
  loadHarosOAuthLogoDataUrl,
} from "./harnessosOAuthCallbackPage.ts";

describe("Haros OAuth callback page", () => {
  it("renders a self-contained system-variant branded success page with the shipped icon", () => {
    const logoDataUrl = loadHarosOAuthLogoDataUrl(
      fileURLToPath(new URL("../../../web/public", import.meta.url)),
    );
    expect(logoDataUrl).toMatch(/^data:image\/svg\+xml;base64,/u);

    const html = createHarosOAuthPageRenderer({
      serviceName: "Anthropic",
      logoDataUrl,
    })({ kind: "authorization_received" });

    expect(html).toContain('meta name="color-scheme" content="light dark"');
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain('alt="Haros"');
    expect(html).toContain("Authorization received");
    expect(html).toContain("已收到授权");
    expect(html).toContain("Authorization from Anthropic was received");
    expect(html).toContain("已收到来自 Anthropic 的授权");
    expect(html).toContain("navigator.languages");
    expect(html).not.toContain("Signed in");
    expect(html).not.toContain("is connected");
    expect(html).not.toContain("#09090b");
  });

  it("uses recoverable product copy and never exposes raw engine error details", () => {
    const html = createHarosOAuthPageRenderer({
      serviceName: '<OpenRouter & "Proxy">',
      logoDataUrl: null,
    })({
      kind: "error",
    });

    expect(html).toContain("Authorization didn’t complete");
    expect(html).toContain("授权未完成");
    expect(html).toContain("&lt;OpenRouter &amp; &quot;Proxy&quot;&gt;");
    expect(html).toContain("Return to Haros");
  });
});
