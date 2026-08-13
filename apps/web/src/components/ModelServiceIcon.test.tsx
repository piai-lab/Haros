// FILE: ModelServiceIcon.test.tsx
// Purpose: Proves brand resolution remains presentation-only and fallbacks are deterministic.
// Layer: Web presentation tests

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModelServiceIcon, resolveModelServiceIcon } from "./ModelServiceIcon";

describe("ModelServiceIcon", () => {
  it("resolves known service identities to bundled local brand assets", () => {
    expect(
      resolveModelServiceIcon({ serviceId: "deepseek", origin: "builtin" }),
    ).toMatchObject({
      kind: "brand",
    });
    expect(
      resolveModelServiceIcon({ serviceId: "xiaomi-token-plan-cn" }),
    ).toMatchObject({
      kind: "brand",
    });
    const markup = renderToStaticMarkup(
      <ModelServiceIcon serviceId="openai-codex" />,
    );
    expect(markup).toContain('data-model-service-icon="brand"');
    expect(markup).toContain("%3ctitle%3eOpenAI%3c/title%3e");
  });

  it("uses origin-owned local fallbacks without changing the service identity", () => {
    expect(
      resolveModelServiceIcon({ serviceId: "deepseek", origin: "models_json" }),
    ).toEqual({
      kind: "custom",
      src: null,
    });
    expect(
      resolveModelServiceIcon({ serviceId: "deepseek", origin: "extension" }),
    ).toEqual({
      kind: "extension",
      src: null,
    });
    expect(resolveModelServiceIcon({ serviceId: "deepseek", origin: "unknown" })).toEqual({
      kind: "generic",
      src: null,
    });
    expect(resolveModelServiceIcon({ serviceId: "private-service" })).toEqual({
      kind: "generic",
      src: null,
    });

    const markup = renderToStaticMarkup(
      <ModelServiceIcon serviceId="private-service" origin="models_json" />,
    );
    expect(markup).toContain('data-model-service-icon="custom"');
    expect(markup).not.toContain("private-service");
  });
});
