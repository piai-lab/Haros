import { describe, expect, it, vi } from "vitest";

import { bootstrapPairingSession, createPairingFailureMarkup } from "./pairingBootstrap";

function makeDependencies(input: {
  readonly pathname?: string;
  readonly hash?: string;
  readonly responseOk?: boolean;
}) {
  const events: Array<string> = [];
  const replace = vi.fn((url: string) => events.push(`navigate:${url}`));
  const replaceState = vi.fn((_data: unknown, _unused: string, url?: string | URL | null) =>
    events.push(`scrub:${String(url)}`),
  );
  const fetch = vi.fn(async () => {
    events.push("fetch");
    return { ok: input.responseOk ?? true } as Response;
  });
  const renderFailure = vi.fn(() => events.push("failure"));

  return {
    dependencies: {
      location: {
        pathname: input.pathname ?? "/pair",
        search: "",
        hash: input.hash ?? "#token=PAIRING-SECRET",
        replace,
      },
      history: { replaceState },
      fetch: fetch as typeof globalThis.fetch,
      renderFailure,
    },
    events,
    fetch,
    replace,
    replaceState,
    renderFailure,
  };
}

describe("bootstrapPairingSession", () => {
  it("keeps the pre-React failure surface on a bounded system light/dark palette", () => {
    const markup = createPairingFailureMarkup();

    expect(markup).toContain("color-scheme: light dark");
    expect(markup).toContain("@media (prefers-color-scheme: dark)");
    expect(markup).toContain("background:var(--startup-canvas)");
    expect(markup).not.toContain("#token=");
  });

  it("ships complete English and Simplified Chinese copy without requiring the React catalog", () => {
    expect(createPairingFailureMarkup("en")).toContain("This pairing link could not be used.");
    expect(createPairingFailureMarkup("zh-CN")).toContain("此配对链接无法使用");
  });

  it("ignores every route except the dedicated pairing route", async () => {
    const test = makeDependencies({ pathname: "/" });

    await expect(bootstrapPairingSession(test.dependencies)).resolves.toBe("not-pairing");
    expect(test.fetch).not.toHaveBeenCalled();
    expect(test.replaceState).not.toHaveBeenCalled();
  });

  it("scrubs the fragment before exchanging it and redirects after success", async () => {
    const test = makeDependencies({});

    await expect(bootstrapPairingSession(test.dependencies)).resolves.toBe("redirecting");

    expect(test.events).toEqual(["scrub:/pair", "fetch", "navigate:/"]);
    expect(test.fetch).toHaveBeenCalledWith("/api/auth/bootstrap", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "PAIRING-SECRET" }),
    });
  });

  it("renders a token-free failure state when the exchange is rejected", async () => {
    const test = makeDependencies({ responseOk: false });

    await expect(bootstrapPairingSession(test.dependencies)).resolves.toBe("failed");

    expect(test.events).toEqual(["scrub:/pair", "fetch", "failure"]);
    expect(test.replace).not.toHaveBeenCalled();
    expect(test.renderFailure).toHaveBeenCalledOnce();
  });

  it("fails without making a request when the fragment has no credential", async () => {
    const test = makeDependencies({ hash: "" });

    await expect(bootstrapPairingSession(test.dependencies)).resolves.toBe("failed");
    expect(test.events).toEqual(["scrub:/pair", "failure"]);
    expect(test.fetch).not.toHaveBeenCalled();
  });
});
