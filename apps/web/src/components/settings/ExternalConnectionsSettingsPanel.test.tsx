// FILE: ExternalConnectionsSettingsPanel.test.tsx
// Purpose: Guards the fresh external-connection scope and user-facing connection semantics.
// Layer: Component rendering tests
// Depends on: ExternalConnectionsSettingsPanel and React Query's session-local cache.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ExternalConnectionsSettingsPanel } from "./ExternalConnectionsSettingsPanel";

describe("ExternalConnectionsSettingsPanel", () => {
  it("starts with selected-project scope and requires a project before creation", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ExternalConnectionsSettingsPanel active />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Connect an external app");
    expect(markup).toContain('role="switch"');
    expect(markup).toContain('data-unchecked=""');
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Create connection<\/button>/);
    expect(markup).not.toContain("MCP manager");
  });
});
