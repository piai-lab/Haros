// FILE: useAccountCapacity.test.tsx
// Purpose: Account capacity stays provider-native and never falls back to local history.

import type { ServerProviderUsageSnapshot } from "@omnimind/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { serverQueryKeys } from "~/lib/serverReactQuery";
import { useAccountCapacity } from "./useAccountCapacity";

const snapshot = (
  status: ServerProviderUsageSnapshot["status"] = "ok",
): ServerProviderUsageSnapshot => ({
  provider: "codex",
  updatedAt: "2026-08-11T00:00:00.000Z",
  limits: [{ window: "5h", usedPercent: 20, resetsAt: "2026-08-11T05:00:00.000Z" }],
  usageLines: [{ label: "Credits", value: "$10" }],
  source: "codex-app-server",
  status,
});

describe("useAccountCapacity", () => {
  it("uses only the shared provider-native capacity query", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(serverQueryKeys.allProviderUsage(), [snapshot()]);
    const captured: { current: ReturnType<typeof useAccountCapacity> | null } = { current: null };
    function Probe() {
      captured.current = useAccountCapacity({ provider: "codex" });
      return null;
    }
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
    if (!captured.current) throw new Error("account capacity probe did not render");
    expect(captured.current?.rateLimits).toHaveLength(1);
    expect(captured.current?.usageLines).toEqual([{ label: "Credits", value: "$10" }]);
    expect(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    ).toEqual([serverQueryKeys.allProviderUsage()]);
  });

  it("does not invent fallback capacity when the provider reports an error", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const captured: { current: ReturnType<typeof useAccountCapacity> | null } = { current: null };
    function Probe() {
      captured.current = useAccountCapacity({
        provider: "codex",
        providerSnapshot: snapshot("error"),
      });
      return null;
    }
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
    if (!captured.current) throw new Error("account capacity probe did not render");
    expect(captured.current?.rateLimits).toEqual([]);
    expect(captured.current?.usageLines).toEqual([]);
  });
});
