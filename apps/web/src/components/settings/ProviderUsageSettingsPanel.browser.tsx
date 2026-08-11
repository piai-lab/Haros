// FILE: ProviderUsageSettingsPanel.browser.tsx
// Purpose: Browser proof that history failures and cleared state remain explicit.

import "../../index.css";

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  command: { isPending: false, isError: false, mutate: vi.fn() } as Record<string, unknown>,
  refetch: vi.fn(),
}));

vi.mock("~/hooks/useUsageHistory", () => ({
  useUsageHistory: () => ({ query: harness.query, command: harness.command }),
}));

vi.mock("~/i18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));

import { UsageHistorySection } from "./ProviderUsageSettingsPanel";

const emptyProgress = {
  filesDiscovered: 0,
  filesIndexed: 0,
  bytesDiscovered: 0,
  bytesRead: 0,
  skippedFiles: 0,
  discoveryComplete: true,
};

describe("UsageHistorySection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.refetch.mockReset();
    harness.command = { isPending: false, isError: false, mutate: vi.fn() };
  });

  it("shows a scoped recoverable error instead of pretending an undefined query is authorized", async () => {
    harness.query = {
      data: undefined,
      isPending: false,
      isError: true,
      refetch: harness.refetch,
    };

    await render(<UsageHistorySection />);

    expect(document.body.textContent).toContain("settings.usageHistoryLoadFailed");
    expect(document.body.textContent).toContain("common.tryAgain");
    expect(document.body.textContent).not.toContain("settings.usageHistoryReady");
  });

  it("keeps a cleared index distinct from ready and offers an explicit resume", async () => {
    harness.query = {
      data: {
        status: "idle",
        pricingVersion: "test-v1",
        progress: emptyProgress,
        providers: [
          { provider: "codex", status: "pending", progress: emptyProgress },
          { provider: "claudeAgent", status: "pending", progress: emptyProgress },
        ],
        rows: [],
      },
      isPending: false,
      isError: false,
      refetch: harness.refetch,
    };

    await render(<UsageHistorySection />);

    expect(document.body.textContent).toContain("settings.usageHistoryIdle");
    expect(document.body.textContent).toContain("settings.resume");
    expect(document.body.textContent).not.toContain("settings.usageHistoryReady");
  });
});
