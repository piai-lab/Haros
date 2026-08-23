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
  configurationState: fields.some(({ value }) => Boolean(value))
    ? ("complete" as const)
    : ("missing" as const),
  missingRequiredConfigKeys: fields.filter(({ value }) => !value).map(({ configKey }) => configKey),
  structurallyPossible: fields.some(({ value }) => Boolean(value)),
  fields,
  settingsGroup: "credentials" as const,
  advancedFileOnly: [],
  icon: { kind: "neutral" as const, assetId: null, admission: "not-admitted" as const },
});

function snapshot(input: {
  readonly revision?: string;
  readonly provider?: "auto" | "tavily";
  readonly tavilyKey?: string | null;
  readonly workflow?: "none" | "auto-summary" | "summary-review";
  readonly autoShowSearchProcess?: boolean;
} = {}): OmniMindWebSearchSettingsSnapshot {
  return {
    state: "ready",
    revision: input.revision ?? "a".repeat(64),
    schemaVersion: 1,
    provider: input.provider ?? "auto",
    workflow: input.workflow ?? "auto-summary",
    autoShowSearchProcess: input.autoShowSearchProcess ?? false,
    capabilityStatus: "possible",
    tools: {
      webSearch: { enabled: true, reason: "enabled" },
      sourceCheck: { enabled: true, reason: "enabled" },
      fetchContent: { enabled: true, reason: "enabled" },
      getSearchContent: { enabled: true, reason: "enabled" },
    },
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

import { translate } from "../../i18n";
import {
  WebSearchSettingsPanel,
  webSearchProviderFieldAccessibleLabel,
} from "./WebSearchSettingsPanel";

const renderPanel = () => render(<WebSearchSettingsPanel active />);

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

    await renderPanel();
    await expect.element(page.getByText("Web search")).toBeVisible();
    await expect.element(page.getByText("Available", { exact: true }).first()).toBeVisible();
    await expect.element(page.getByText("Can the Agent search the web?")).toBeVisible();
    expect(document.body.textContent).not.toContain("Enable Web search");
	const processSwitch = page.getByRole("switch", { name: "Show search progress automatically" });
	await expect.element(processSwitch).not.toBeChecked();
	await processSwitch.click();
	await expect.element(processSwitch).toBeChecked();

    await page.getByRole("button", { name: "Add service" }).click();
    expect(document.querySelectorAll('[data-provider-icon-kind="local-asset"]')).toHaveLength(1);
    expect(document.querySelector<HTMLImageElement>('img[src="/web-access/provider-icons/tavily.svg"]')?.className).not.toContain("dark:invert");
    expect(document.querySelectorAll('[data-provider-icon-kind="neutral"]')).toHaveLength(1);
    await expect.element(page.getByText(/API key required · Setup required/)).toBeVisible();
    await page.getByRole("button", { name: "Set up" }).first().click();
    const keyInput = page.getByRole("textbox", { name: "Tavily · API key" });
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
        workflow: "auto-summary",
		autoShowSearchProcess: true,
        fields: expect.arrayContaining([
          { configKey: "tavilyApiKey", value: "unsaved-tavily-key" },
        ]),
      }),
    }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it("keeps the selected service visible as current while its setup is incomplete", async () => {
    installApi({ open: vi.fn().mockResolvedValue(snapshot({ provider: "tavily" })) });

    await renderPanel();
    await page.getByRole("button", { name: "Add service" }).click();

    const currentGroup = document.querySelector('[data-provider-group="configured"]');
    expect(currentGroup?.textContent).toContain("Current and configured");
    expect(currentGroup?.textContent).toContain("Tavily");
    expect(currentGroup?.textContent).toContain("API key required · Setup required");
    expect(currentGroup?.querySelector("button")?.textContent).toBe("Set up");
  });

  it("preserves a dirty draft when focus discovers an external revision", async () => {
    await page.viewport(1_280, 720);
    const initial = snapshot();
    const external = snapshot({ revision: "b".repeat(64), tavilyKey: "external-key", workflow: "none" });
    const refresh = vi.fn().mockResolvedValue(external);
    const mutate = vi.fn().mockResolvedValue({ state: "changed", snapshot: external });
    installApi({ open: vi.fn().mockResolvedValue(initial), refresh, mutate });

    await renderPanel();
    await page.getByRole("button", { name: "Add service" }).click();
    await page.getByRole("button", { name: "Set up" }).first().click();
    const keyInput = page.getByRole("textbox", { name: "Tavily · API key" });
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

  it("keeps late and cancelled probe results bound to the exact service and request", async () => {
    type ProbeResolver = (value: {
      readonly state: "ready";
      readonly provider: "tavily";
      readonly reason: "request-succeeded";
      readonly requestId: string;
      readonly durationMs: number;
    }) => void;
    let resolveFirst: ProbeResolver | undefined;
    let firstRequestId = "";
    const testProvider = vi.fn(
      (input: { readonly requestId: string; readonly providerId: string }) => {
        if (testProvider.mock.calls.length === 1) {
          firstRequestId = input.requestId;
          return new Promise((resolve) => {
            resolveFirst = resolve;
          });
        }
        if (testProvider.mock.calls.length === 2) {
          return Promise.resolve({
            state: "failed" as const,
            provider: input.providerId,
            reason: "request-cancelled" as const,
            requestId: input.requestId,
            durationMs: 1,
          });
        }
        return Promise.resolve({
          state: "ready" as const,
          provider: input.providerId,
          reason: "request-succeeded" as const,
          requestId: input.requestId,
          durationMs: 2,
        });
      },
    );
    installApi({ testProvider: testProvider as NativeApi["omnimindWebSearch"]["testProvider"] });

    await renderPanel();
    await page.getByRole("button", { name: "Add service" }).click();
    await page.getByRole("button", { name: "Set up" }).first().click();
    await page.getByRole("button", { name: "Test" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Add service" }).click();
    await page.getByRole("button", { name: "Set up" }).last().click();

    const settleFirst = resolveFirst as ProbeResolver | undefined;
    settleFirst?.({
      state: "ready",
      provider: "tavily",
      reason: "request-succeeded",
      requestId: firstRequestId,
      durationMs: 1,
    });
    await expect.element(page.getByRole("button", { name: "Test" })).toBeEnabled();
    expect(document.body.textContent).not.toContain("This real request succeeded.");

    await page.getByRole("button", { name: "Test" }).click();
    await expect
      .element(page.getByText("The test was cancelled. No lasting connection state was created."))
      .toBeVisible();
    await page.getByRole("button", { name: "Test" }).click();
    await expect.element(page.getByText("This real request succeeded.")).toBeVisible();
    expect(testProvider).toHaveBeenCalledTimes(3);
  });

  it("derives English and Chinese accessible input names from visible labels", () => {
    expect(
      webSearchProviderFieldAccessibleLabel(
        "Tavily",
        translate("en", "settings.webSearch.fieldRole.api-key"),
      ),
    ).toBe("Tavily · API key");
    expect(
      webSearchProviderFieldAccessibleLabel(
        "Tavily",
        translate("zh-CN", "settings.webSearch.fieldRole.api-key"),
      ),
    ).toBe("Tavily · API Key");
  });
});
