import "../../index.css";

import type { ProviderKind, ServerProviderStatus } from "@omnimind/contracts";
import { page, userEvent } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { useState } from "react";

import { I18nProvider } from "../../i18n";
import { ComposerEnginePicker } from "./ComposerEnginePicker";

const harness = vi.hoisted(() => ({ settings: { localePreference: "en" } }));

vi.mock("../../localPreferences", () => ({
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

const READY_AT = "2026-08-12T00:00:00.000Z";

function providerStatus(
  provider: ProviderKind,
  overrides: Partial<ServerProviderStatus> = {},
): ServerProviderStatus {
  return {
    provider,
    status: "ready",
    available: true,
    authStatus: "authenticated",
    checkedAt: READY_AT,
    ...overrides,
  };
}

const READY_PROVIDERS: ReadonlyArray<ServerProviderStatus> = [
  "omnimind",
  "codex",
  "claudeAgent",
  "cursor",
  "antigravity",
  "grok",
  "droid",
  "kilo",
  "opencode",
  "pi",
].map((provider) => providerStatus(provider as ProviderKind));

async function mountPicker(input: {
  provider?: ProviderKind;
  providers?: ReadonlyArray<ServerProviderStatus>;
  hiddenProviders?: ReadonlyArray<ProviderKind>;
  providerOrder?: ReadonlyArray<ProviderKind>;
  locale?: "en" | "zh-CN";
}) {
  harness.settings.localePreference = input.locale ?? "en";
  const onProviderChange = vi.fn<(provider: ProviderKind) => void>();
  const onProviderIntent = vi.fn<(provider: ProviderKind) => void>();
  const host = document.createElement("div");
  document.body.append(host);

  function Harness() {
    const [provider, setProvider] = useState<ProviderKind>(input.provider ?? "codex");
    return (
      <I18nProvider>
        <ComposerEnginePicker
          provider={provider}
          providers={input.providers ?? READY_PROVIDERS}
          {...(input.hiddenProviders ? { hiddenProviders: input.hiddenProviders } : {})}
          {...(input.providerOrder ? { providerOrder: input.providerOrder } : {})}
          onProviderChange={(nextProvider) => {
            onProviderChange(nextProvider);
            setProvider(nextProvider);
          }}
          onProviderIntent={onProviderIntent}
        />
      </I18nProvider>
    );
  }

  const screen = await render(<Harness />, { container: host });
  return {
    onProviderChange,
    onProviderIntent,
    cleanup: async () => {
      await screen.unmount();
      host.remove();
    },
  };
}

describe("ComposerEnginePicker", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.settings.localePreference = "en";
  });

  it("renders an icon-only trigger with an accessible Engine name", async () => {
    const mounted = await mountPicker({});
    try {
      const trigger = page.getByRole("button", { name: "Change engine. Current: Codex" });
      await expect.element(trigger).toBeVisible();
      expect(trigger.element().querySelector("svg, [data-slot=central-icon]")).not.toBeNull();
      expect(trigger.element().textContent).toBe("");
    } finally {
      await mounted.cleanup();
    }
  });

  it("supports keyboard selection and returns focus to the trigger", async () => {
    const mounted = await mountPicker({});
    try {
      const trigger = page.getByRole("button", { name: "Change engine. Current: Codex" });
      const triggerElement = trigger.element();
      triggerElement.focus();
      await userEvent.keyboard("{Enter}");
      await expect
        .element(page.getByRole("menuitemradio", { name: "Codex" }))
        .toHaveAttribute("aria-checked", "true");
      page.getByRole("menuitemradio", { name: "Claude" }).element().focus();
      await userEvent.keyboard("{Enter}");
      expect(mounted.onProviderChange).toHaveBeenCalledTimes(1);
      await vi.waitFor(() => expect(document.activeElement).toBe(triggerElement));
    } finally {
      await mounted.cleanup();
    }
  });

  it("closes with Escape and restores focus to the Engine trigger", async () => {
    const mounted = await mountPicker({});
    try {
      const trigger = page.getByRole("button", { name: "Change engine. Current: Codex" });
      const triggerElement = trigger.element();
      triggerElement.focus();
      await userEvent.keyboard("{Enter}");
      await expect.element(page.getByRole("menuitemradio", { name: "Codex" })).toBeVisible();
      await userEvent.keyboard("{Escape}");
      await expect
        .element(page.getByRole("menuitemradio", { name: "Codex" }))
        .not.toBeInTheDocument();
      await vi.waitFor(() => expect(document.activeElement).toBe(triggerElement));
    } finally {
      await mounted.cleanup();
    }
  });

  it("applies custom order while retaining the hidden active Engine", async () => {
    const mounted = await mountPicker({
      hiddenProviders: ["codex", "cursor"],
      providerOrder: ["pi", "codex", "claudeAgent"],
    });
    try {
      await page.getByRole("button", { name: "Change engine. Current: Codex" }).click();
      const labels = Array.from(document.querySelectorAll('[role="menuitemradio"]')).map((node) =>
        node.textContent?.trim(),
      );
      expect(labels.slice(0, 3)).toEqual(["Pi", "Codex", "Claude"]);
      expect(labels).not.toContain("Cursor");
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows honest states while keeping recoverable Engines selectable", async () => {
    const mounted = await mountPicker({
      providers: [
        providerStatus("codex"),
        providerStatus("claudeAgent", { authStatus: "unauthenticated" }),
        providerStatus("cursor", {
          available: false,
          status: "error",
          unavailableReason: "not_installed",
        }),
        providerStatus("antigravity", { available: false, status: "error" }),
        providerStatus("grok", { status: "warning" }),
      ],
    });
    try {
      await page.getByRole("button", { name: "Change engine. Current: Codex" }).click();
      await expect
        .element(page.getByRole("menuitemradio", { name: /Claude.*Sign in/ }))
        .not.toHaveAttribute("aria-disabled", "true");
      await expect
        .element(page.getByRole("menuitemradio", { name: /Cursor.*Not installed/ }))
        .not.toHaveAttribute("aria-disabled", "true");
      await expect
        .element(page.getByRole("menuitemradio", { name: /Antigravity.*Unavailable/ }))
        .not.toHaveAttribute("aria-disabled", "true");
      await expect
        .element(page.getByRole("menuitemradio", { name: /Droid.*Checking/ }))
        .not.toHaveAttribute("aria-disabled", "true");
      await expect
        .element(page.getByRole("menuitemradio", { name: /Grok.*Limited/ }))
        .toBeVisible();
      await expect
        .element(page.getByRole("menuitemradio", { name: "Codex" }))
        .not.toHaveAttribute("aria-disabled", "true");
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps the longest localized Engine status in an independent trailing column", async () => {
    const mounted = await mountPicker({
      locale: "zh-CN",
      providers: [
        providerStatus("codex"),
        providerStatus("cursor", {
          available: false,
          status: "error",
          unavailableReason: "not_installed",
        }),
        providerStatus("antigravity", { available: false, status: "error" }),
      ],
    });
    try {
      await page.getByRole("button", { name: "更改引擎。当前：Codex" }).click();
      const row = page.getByRole("menuitemradio", { name: /Cursor.*未安装/ });
      await expect.element(row).toBeVisible();
      expect(row.element().className).toContain("grid-cols-[minmax(0,1fr)_auto]");
      const status = row.element().querySelector<HTMLElement>(".text-muted-foreground\\/80");
      expect(status?.textContent).toBe("未安装");
      expect(status?.className).toContain("text-[11px]");
      await expect
        .element(page.getByRole("menuitemradio", { name: /Antigravity.*不可用/ }))
        .toBeVisible();
    } finally {
      await mounted.cleanup();
    }
  });

  it("does not inspect stock Pi until Pi is explicitly activated", async () => {
    const mounted = await mountPicker({});
    try {
      await page.getByRole("button", { name: "Change engine. Current: Codex" }).click();
      expect(mounted.onProviderIntent).not.toHaveBeenCalled();
      await page.getByRole("menuitemradio", { name: "Pi" }).click();
      expect(mounted.onProviderIntent).toHaveBeenCalledTimes(1);
      expect(mounted.onProviderIntent).toHaveBeenCalledWith("pi");
      expect(mounted.onProviderChange).toHaveBeenCalledWith("pi");
    } finally {
      await mounted.cleanup();
    }
  });

  it("names OmniMind explicitly in the trigger and tooltip", async () => {
    const mounted = await mountPicker({ provider: "omnimind" });
    try {
      const trigger = page.getByRole("button", { name: "Change engine. Current: OmniMind" });
      await expect.element(trigger).toBeVisible();
      await userEvent.hover(trigger);
      await expect.element(page.getByText("Engine · OmniMind")).toBeVisible();
    } finally {
      await mounted.cleanup();
    }
  });
});
