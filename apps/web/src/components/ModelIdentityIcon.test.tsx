import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { resolveModelPresentationIdentity } from "~/providerModelOptions";
import { ModelIdentityIcon, resolveModelIdentityPresentation } from "./ModelIdentityIcon";

describe("ModelIdentityIcon", () => {
  it("renders DeepSeek for an OpenCode-selected DeepSeek model", () => {
    const selection = { provider: "opencode" as const, model: "deepseek/deepseek-v4-flash" };
    const markup = decodeURIComponent(
      renderToStaticMarkup(
        <ModelIdentityIcon
          selection={selection}
          identity={{
            model: selection.model,
            displayName: "DeepSeek V4 Flash",
            serviceId: "deepseek",
            serviceName: "DeepSeek",
            source: "runtime-catalog",
          }}
        />,
      ),
    );
    expect(markup).toContain("<title>DeepSeek</title>");
    expect(markup).not.toContain("<title>opencode</title>");
  });

  it("uses Kimi service identity for OpenCode without consumer-specific parsing", () => {
    const selection = { provider: "opencode" as const, model: "kimi-for-coding/k3" };
    const markup = renderToStaticMarkup(<ModelIdentityIcon selection={selection} />);
    expect(markup.toLowerCase()).toContain("%3ctitle%3ekimi%3c/title%3e");
    expect(markup).toContain('data-model-service-icon-render="contained-image"');
  });

  it("prefers a trusted model family over an aggregate service", () => {
    const selection = {
      provider: "opencode" as const,
      model: "openrouter/anthropic/claude-sonnet-4-6",
    };
    const resolved = resolveModelIdentityPresentation({
      selection,
      identity: {
        model: selection.model,
        displayName: "Claude Sonnet 4.6",
        serviceId: "openrouter",
        source: "runtime-catalog",
      },
    });
    const markup = decodeURIComponent(
      renderToStaticMarkup(
        <ModelIdentityIcon selection={selection} identity={resolved.identity} />,
      ),
    );
    expect(markup).toContain("<title>Claude</title>");
    expect(markup).not.toContain("<title>OpenRouter</title>");
  });

  it("recognizes a trusted frozen model family without borrowing the fixed Engine icon", () => {
    const selection = { provider: "codex" as const, model: "gpt-5.5" };
    const identity = resolveModelPresentationIdentity({ selection });
    const markup = renderToStaticMarkup(
      <ModelIdentityIcon selection={selection} identity={identity} historical />,
    );
    expect(markup).toContain('data-model-service-icon="brand"');
    expect(markup).toContain('data-model-service-icon-level="model"');
    expect(markup).not.toContain("codex");
  });

  it("does not guess an unqualified legacy Turn without an admitted identity snapshot", () => {
    const selection = { provider: "codex" as const, model: "gpt-5.6" };
    const markup = renderToStaticMarkup(<ModelIdentityIcon selection={selection} historical />);
    expect(markup).toContain('data-model-service-icon="generic"');
    expect(markup).not.toContain('data-model-service-icon-level="model"');
  });

  it("keeps an authoritative unknown snapshot generic even when its slug resembles a family", () => {
    const selection = { provider: "codex" as const, model: "gpt-private" };
    const markup = renderToStaticMarkup(
      <ModelIdentityIcon
        selection={selection}
        identity={{ model: selection.model, displayName: "Private", source: "unknown" }}
      />,
    );
    expect(markup).toContain('data-model-service-icon="generic"');
  });

  it("keeps custom, extension, unknown, and mismatched history safe", () => {
    const selection = { provider: "opencode" as const, model: "private/model" };
    for (const [source, expected] of [
      ["user-configured", 'data-model-service-icon="custom"'],
      ["extension", 'data-model-service-icon="extension"'],
      ["unknown", 'data-model-service-icon="generic"'],
    ] as const) {
      const markup = renderToStaticMarkup(
        <ModelIdentityIcon
          selection={selection}
          identity={{ model: selection.model, displayName: "Private", source }}
        />,
      );
      expect(markup).toContain(expected);
      expect(markup).not.toContain("opencode.svg");
    }
    const mismatched = resolveModelIdentityPresentation({
      selection,
      identity: {
        model: "deepseek/deepseek-v4-flash",
        displayName: "Wrong",
        serviceId: "deepseek",
        source: "runtime-catalog",
      },
    });
    expect(mismatched.identity.displayName).not.toBe("Wrong");
    expect(mismatched.serviceId).toBe("private");
    expect(mismatched.serviceId).not.toBe("deepseek");
  });
});
