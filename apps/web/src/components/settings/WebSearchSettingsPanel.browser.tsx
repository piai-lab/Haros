// FILE: WebSearchSettingsPanel.browser.tsx
// Purpose: Protect the visible draft-test and external-conflict Settings journeys.
// Layer: Browser UI test

import "../../index.css";

import type {
  NativeApi,
  OmniMindWebSearchSettingsSnapshot,
} from "@omnimind/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({ availableEditors: ["vscode"] }));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQuery: () => ({ data: harness }),
}));

const field = (configKey: string, value: string | null, environmentVariable: string) => ({
  id: configKey,
  configKey,
  kind: "secret" as const,
  role: "api-key" as const,
  required: true,
  environmentVariable,
  qualifier: null,
  value,
  invalidStoredValue: false,
});

const provider = (
  id: string,
  displayName: string,
  fields: ReturnType<typeof field>[],
) => ({
  id,
  displayName,
  prerequisite: "key" as const,
  costHint: "may-charge" as const,
  participation: { auto: true, all: "included" as const, explicitOnly: false },
  configured: fields.some(({ value }) => Boolean(value)),
  structurallyPossible: fields.some(({ value }) => Boolean(value)),
  fields,
  advancedFileOnly: [],
  icon: { kind: "neutral" as const, assetId: null, admission: "not-admitted" as const },
});

function snapshot(input: {
  readonly revision?: string;
  readonly tavilyKey?: string | null;
  readonly workflow?: "none" | "auto-summary" | "summary-review";
} = {}): OmniMindWebSearchSettingsSnapshot {
  return {
    state: "ready",
    revision: input.revision ?? "a".repeat(64),
    schemaVersion: 1,
    provider: "auto",
    workflow: input.workflow ?? "summary-review",
    capabilityStatus: "possible",
    providers: [
      {
        ...provider("tavily", "Tavily", [field("tavilyApiKey", input.tavilyKey ?? null, "TAVILY_API_KEY")]),
        icon: {
          kind: "local-asset" as const,
          assetId: "tavily",
          assetPath: "/web-access/provider-icons/tavily.svg",
          admission: "admitted" as const,
        },
      },
      {
        ...provider("gemini", "Gemini", [field("geminiApiKey", null, "GEMINI_API_KEY")]),
        prerequisite: "gemini" as const,
        costHint: "provider-dependent" as const,
        participation: { auto: true, all: "api-only" as const, explicitOnly: false },
        advancedFileOnly: ["allowBrowserCookies", "chromeProfile"],
      },
    ],
  };
}

function installApi(input: {
  readonly open?: NativeApi["omnimindWebSearch"]["open"];
  readonly refresh?: NativeApi["omnimindWebSearch"]["refresh"];
  readonly mutate?: NativeApi["omnimindWebSearch"]["mutate"];
  readonly testProvider?: NativeApi["omnimindWebSearch"]["testProvider"];
}) {
  window.nativeApi = {
    omnimindWebSearch: {
      open: input.open ?? vi.fn().mockResolvedValue(snapshot()),
      refresh: input.refresh ?? vi.fn().mockResolvedValue(snapshot()),
      mutate: input.mutate ?? vi.fn(),
      testProvider: input.testProvider ?? vi.fn(),
      recheck: vi.fn(),
      openConfig: vi.fn(),
      diagnoseGemini: vi.fn(),
    },
  } as unknown as NativeApi;
}

import { WebSearchSettingsPanel } from "./WebSearchSettingsPanel";

describe("WebSearchSettingsPanel", () => {
  afterEach(() => {
    delete window.nativeApi;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("tests the complete unsaved service draft without saving it", async () => {
    await page.viewport(480, 720);
    const mutate = vi.fn();
    const probeResult = {
      state: "ready",
      provider: "tavily",
      reason: "request-succeeded",
      durationMs: 12,
    } as const;
    const testProvider = vi.fn((_input: unknown) => Promise.resolve(probeResult));
    installApi({ mutate, testProvider });

    await render(<WebSearchSettingsPanel active />);
    await expect.element(page.getByText("OmniMind Web Access")).toBeVisible();
    await expect.element(page.getByText("Structurally possible · not a permanent connection claim")).toBeVisible();
    await expect.element(page.getByText("Network search")).toBeVisible();
    await expect.element(page.getByText("Open and read pages")).toBeVisible();
    await expect.element(page.getByText("Source handling")).toBeVisible();
    expect(document.body.textContent).not.toContain("Enable Web search");

    await page.getByRole("button", { name: "Add service" }).click();
    expect(document.querySelectorAll('[data-provider-icon-kind="local-asset"]')).toHaveLength(1);
    expect(document.querySelector<HTMLImageElement>('img[src="/web-access/provider-icons/tavily.svg"]')?.className).not.toContain("dark:invert");
    expect(document.querySelectorAll('[data-provider-icon-kind="neutral"]')).toHaveLength(1);
    await expect.element(page.getByText(/API key required · Not configured/)).toBeVisible();
    await page.getByRole("button", { name: "Edit" }).first().click();
    const keyInput = page.getByRole("textbox", { name: "tavilyApiKey" });
    await keyInput.fill("unsaved-tavily-key");
    await expect.element(page.getByText(/without saving it.*may consume quota/i)).toBeVisible();
    const testButton = page.getByRole("button", { name: "Test" });
    await testButton.click();
    await expect.element(page.getByText("This real request succeeded.")).toBeVisible();
    expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);

    expect(testProvider).toHaveBeenCalledTimes(1);
    expect(testProvider).toHaveBeenCalledWith(expect.objectContaining({
      providerId: "tavily",
      draft: expect.objectContaining({
        workflow: "summary-review",
        fields: expect.arrayContaining([
          { configKey: "tavilyApiKey", value: "unsaved-tavily-key" },
        ]),
      }),
    }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it("preserves a dirty draft when focus discovers an external revision", async () => {
    await page.viewport(1_280, 720);
    const initial = snapshot();
    const external = snapshot({ revision: "b".repeat(64), tavilyKey: "external-key", workflow: "none" });
    const refresh = vi.fn().mockResolvedValue(external);
    const mutate = vi.fn().mockResolvedValue({ state: "changed", snapshot: external });
    installApi({ open: vi.fn().mockResolvedValue(initial), refresh, mutate });

    await render(<WebSearchSettingsPanel active />);
    await page.getByRole("button", { name: "Add service" }).click();
    await page.getByRole("button", { name: "Edit" }).first().click();
    const keyInput = page.getByRole("textbox", { name: "tavilyApiKey" });
    await keyInput.fill("my-unsaved-key");
    window.dispatchEvent(new Event("focus"));

    await expect.element(page.getByText("The config file changed outside this draft")).toBeVisible();
    await expect.element(keyInput).toHaveValue("my-unsaved-key");
    expect(refresh).toHaveBeenCalledWith({ knownRevision: "a".repeat(64) });

    await page.getByRole("button", { name: "Overwrite with draft" }).click();
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
      expectedRevision: "b".repeat(64),
      allowOverwriteConflict: true,
      draft: expect.objectContaining({
        fields: expect.arrayContaining([{ configKey: "tavilyApiKey", value: "my-unsaved-key" }]),
      }),
    }));
  });
});
