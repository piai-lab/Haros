// FILE: EnvironmentLocalServersSection.errorDetails.browser.tsx
// Purpose: Preserve localized local-server recovery copy and safe scan Error.message detail.
// Layer: Vitest browser regression

import "../../../index.css";

import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({ error: null as unknown }));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useMutation: () => ({ isPending: false, variables: null, mutate: vi.fn() }),
  useQueryClient: () => ({}),
  useQuery: () => ({
    data: undefined,
    error: harness.error,
    isError: harness.error !== null,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

import { I18nProvider } from "~/i18n";
import { EnvironmentLocalServersSection } from "./EnvironmentLocalServersSection";

let mounted: Awaited<ReturnType<typeof render>> | null = null;

async function renderAndOpen() {
  mounted = await render(
    <I18nProvider>
      <EnvironmentLocalServersSection enabled />
    </I18nProvider>,
  );
  await page.getByRole("button", { name: /Local servers/ }).click();
}

describe("Environment local-server scan error detail", () => {
  afterEach(async () => {
    await mounted?.unmount();
    mounted = null;
    harness.error = null;
  });

  it("keeps localized title and recovery summary beside Error.message", async () => {
    harness.error = new Error("port monitor permission denied");
    await renderAndOpen();

    expect(page.getByText("Couldn’t scan local ports", { exact: true })).toBeInTheDocument();
    expect(
      page.getByText("Check that the OmniMind server can inspect local ports, then try again.", {
        exact: true,
      }),
    ).toBeInTheDocument();
    expect(page.getByText("port monitor permission denied", { exact: true })).toBeInTheDocument();
  });

  it("keeps the localized fallback and hides non-Error objects", async () => {
    harness.error = { message: "object detail must stay hidden" };
    await renderAndOpen();

    expect(page.getByText("Couldn’t scan local ports", { exact: true })).toBeInTheDocument();
    expect(
      page.getByText("Check that the OmniMind server can inspect local ports, then try again.", {
        exact: true,
      }),
    ).toBeInTheDocument();
    expect(
      page.getByText("object detail must stay hidden", { exact: true }),
    ).not.toBeInTheDocument();
  });
});
