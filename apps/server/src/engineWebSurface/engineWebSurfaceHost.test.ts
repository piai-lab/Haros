import { describe, expect, it } from "vitest";

import {
  extractPiCuratorWebSurfaceUrl,
  extractTypedEngineWebSurface,
  isEngineWebSurfaceUrl,
  registerEngineWebSurfaceIntent,
  sanitizeEngineWebSurfacePayload,
} from "./engineWebSurfaceHost";

const TEST_CURATOR_URL = "http://127.0.0.1:43129/?session=fixture-token-123456";

describe("Engine web-surface host", () => {
  it("accepts only the exact short-lived loopback curator URL shape", () => {
    expect(isEngineWebSurfaceUrl(TEST_CURATOR_URL)).toBe(true);
    expect(isEngineWebSurfaceUrl("https://127.0.0.1:43129/?session=fixture-token-123456")).toBe(
      false,
    );
    expect(isEngineWebSurfaceUrl("http://127.0.0.1:43129/dev?session=fixture-token-123456")).toBe(
      false,
    );
    expect(
      isEngineWebSurfaceUrl(
        "http://127.0.0.1:43129/?session=fixture-token-123456&project=arbitrary",
      ),
    ).toBe(false);
  });

  it("requires Pi web_search provenance before extracting a curator intent", () => {
    const result = {
      content: [{ type: "text", text: "Searches streaming to browser..." }],
      details: { phase: "curating", curatorUrl: TEST_CURATOR_URL },
    };
    expect(extractPiCuratorWebSurfaceUrl("web_search", result)).toBe(TEST_CURATOR_URL);
    expect(extractPiCuratorWebSurfaceUrl("bash", result)).toBeUndefined();
  });

  it("prefers the typed token-free surface contract for the bundled extension", () => {
    const result = {
      content: [{ type: "text", text: "Source review is waiting." }],
      details: {
        phase: "curating",
        engineWebSurface: { surfaceId: "surface-opaque-123", status: "pending" },
      },
    };
    expect(extractTypedEngineWebSurface("web_search", result)).toEqual({
      surfaceId: "surface-opaque-123",
      status: "pending",
    });
    expect(extractTypedEngineWebSurface("bash", result)).toBeUndefined();
    expect(extractPiCuratorWebSurfaceUrl("web_search", result)).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("session=");
  });

  it("removes the bearer URL from structured and human-readable runtime payloads", () => {
    const safe = sanitizeEngineWebSurfacePayload(
      {
        content: [{ type: "text", text: `Open the curator manually: ${TEST_CURATOR_URL}` }],
        details: { phase: "curating", curatorUrl: TEST_CURATOR_URL },
      },
      TEST_CURATOR_URL,
    );
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("fixture-token");
    expect(serialized).not.toContain("curatorUrl");
    expect(serialized).toContain("OmniMind Browser temporary page");
  });

  it("lets the product presenter consume an exact registered intent only once", async () => {
    let presentations = 0;
    const unregister = registerEngineWebSurfaceIntent({
      url: TEST_CURATOR_URL,
      identity: {
        provider: "pi",
        threadId: "thread-engine-web-surface" as never,
        toolCallId: "tool-engine-web-surface",
      },
      present: async () => {
        presentations += 1;
      },
    });
    const presenter = (
      globalThis as typeof globalThis & {
        [key: symbol]: { claim: (url: string) => boolean } | undefined;
      }
    )[Symbol.for("omnimind.engineWebSurface.presenter.v1")];
    expect(presenter?.claim(TEST_CURATOR_URL)).toBe(true);
    expect(presenter?.claim(TEST_CURATOR_URL)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(presentations).toBe(1);
    unregister();
  });

  it("uses the Pi extension's optional presenter seam without an OS fallback", async () => {
    let presentations = 0;
    registerEngineWebSurfaceIntent({
      url: TEST_CURATOR_URL,
      identity: {
        provider: "pi",
        threadId: "thread-glimpse-compat" as never,
        toolCallId: "tool-glimpse-compat",
      },
      present: async () => {
        presentations += 1;
      },
    });
    const moduleUrl = new URL(
      "../../engine-web-surface-modules/glimpseui/index.mjs",
      import.meta.url,
    );
    const glimpse = (await import(moduleUrl.href)) as {
      open: (html: string) => { on: (event: string, listener: () => void) => void };
    };
    const handle = glimpse.open(
      `<script>window.location.replace(${JSON.stringify(TEST_CURATOR_URL)});</script>`,
    );
    handle.on("closed", () => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(presentations).toBe(1);
    expect(() => glimpse.open("<script>window.location.replace(\"http://localhost:3000/\");</script>"))
      .toThrow("No matching OmniMind Engine web-surface intent is active.");
  });
});
