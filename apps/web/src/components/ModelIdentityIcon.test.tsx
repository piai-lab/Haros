import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { resolveModelPresentationIdentity } from "~/engineModelOptions";
import { ModelIdentityIcon, resolveModelIdentityPresentation } from "./ModelIdentityIcon";

describe("ModelIdentityIcon", () => {
  it("keeps stock Pi Google, Anthropic, and OpenAI on their service marks", () => {
    for (const [serviceId, model] of [
      ["google", "google/gemini-3-flash"],
      ["anthropic", "anthropic/claude-sonnet-4-6"],
      ["openai", "openai/gpt-5"],
    ] as const) {
      const markup = renderToStaticMarkup(
        <ModelIdentityIcon
          selection={{ engine: "pi", model }}
          identity={{
            model,
            displayName: model,
            serviceId,
            source: "unknown",
          }}
        />,
      );
      expect(markup).toContain('data-model-service-icon="brand"');
      expect(markup).not.toContain('data-model-service-icon="generic"');
    }
  });

  it("renders the official DeepSeek whale mark for stock Pi DeepSeek", () => {
    const selection = { engine: "pi" as const, model: "deepseek/deepseek-v4-flash" };
    const markup = renderToStaticMarkup(
      <ModelIdentityIcon
        selection={selection}
        identity={{
          model: selection.model,
          displayName: "DeepSeek V4 Flash",
          serviceId: "deepseek",
          serviceName: "DeepSeek",
          source: "builtin-catalog",
        }}
        historical
      />,
    );
    expect(markup).toContain('viewBox="0 0 24 24"');
    expect(markup).toContain("M23.748 4.482");
    expect(markup).toContain('data-model-service-icon="brand"');
    expect(markup).not.toContain("deepseek-color.svg");
  });

  it("renders DeepSeek for an OpenCode-selected DeepSeek model", () => {
    const selection = { engine: "opencode" as const, model: "deepseek/deepseek-v4-flash" };
    const markup = renderToStaticMarkup(
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
    );
    expect(markup).toContain("M23.748 4.482");
    expect(markup).not.toContain("opencode");
  });

  it("uses Kimi service identity for OpenCode without consumer-specific parsing", () => {
    const selection = { engine: "opencode" as const, model: "kimi-for-coding/k3" };
    const markup = renderToStaticMarkup(<ModelIdentityIcon selection={selection} />);
    expect(markup.toLowerCase()).toContain("%3ctitle%3ekimi%3c/title%3e");
    expect(markup).toContain('data-model-service-icon-render="contained-image"');
  });

  it("prefers a trusted model family over an aggregate service", () => {
    const selection = {
      engine: "opencode" as const,
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
    const selection = { engine: "codex" as const, model: "gpt-5.5" };
    const identity = resolveModelPresentationIdentity({ selection });
    const markup = renderToStaticMarkup(
      <ModelIdentityIcon selection={selection} identity={identity} historical />,
    );
    expect(markup).toContain('data-model-service-icon="brand"');
    expect(markup).toContain('data-model-service-icon-level="model"');
    expect(markup).not.toContain("codex");
  });

  it("does not guess an unqualified legacy Turn without an admitted identity snapshot", () => {
    const selection = { engine: "codex" as const, model: "gpt-5.6" };
    const markup = renderToStaticMarkup(<ModelIdentityIcon selection={selection} historical />);
    expect(markup).toContain('data-model-service-icon="generic"');
    expect(markup).not.toContain('data-model-service-icon-level="model"');
  });

  it("keeps an authoritative unknown snapshot generic even when its slug resembles a family", () => {
    const selection = { engine: "codex" as const, model: "gpt-private" };
    const markup = renderToStaticMarkup(
      <ModelIdentityIcon
        selection={selection}
        identity={{ model: selection.model, displayName: "Private", source: "unknown" }}
      />,
    );
    expect(markup).toContain('data-model-service-icon="generic"');
  });

  it("keeps custom, extension, unknown, and mismatched history safe", () => {
    const selection = { engine: "opencode" as const, model: "private/model" };
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
