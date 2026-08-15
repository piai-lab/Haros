// FILE: GitPanel.errorDetails.browser.tsx
// Purpose: Preserve localized Git pane failure copy while exposing safe query Error.message detail.
// Layer: Vitest browser regression

import "../../index.css";

import { ProjectId, ThreadId } from "@omnimind/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  stagedError: null as unknown,
  unstagedError: null as unknown,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useMutation: () => ({ isPending: false, mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: (options: { queryKey?: readonly unknown[] }) => {
    const scope = options.queryKey?.at(-1);
    const error = scope === "staged" ? harness.stagedError : harness.unstagedError;
    return {
      data: undefined,
      error,
      isError: error !== null,
      isLoading: false,
    };
  },
}));

vi.mock("~/hooks/useTheme", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("~/store", () => ({ useStore: (selector: (state: unknown) => unknown) => selector({}) }));
vi.mock("~/storeSelectors", () => ({
  createProjectSelector: () => () => null,
  createThreadSelector: () => () => ({ worktreePath: "/task/worktree" }),
}));

import { I18nProvider } from "~/i18n";
import { GitPanel } from "./GitPanel";

async function renderPanel() {
  return render(
    <I18nProvider>
      <div className="h-[500px] w-[600px]">
        <GitPanel
          hostThreadId={ThreadId.makeUnsafe("git-error-thread")}
          projectId={ProjectId.makeUnsafe("git-error-project")}
        />
      </div>
    </I18nProvider>,
  );
}

describe("GitPanel query error detail", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.stagedError = null;
    harness.unstagedError = null;
  });

  it("keeps the localized summary and shows the deterministic staged Error.message", async () => {
    harness.stagedError = new Error("staged diff transport failed");
    harness.unstagedError = new Error("unstaged diff transport failed");
    await renderPanel();

    expect(
      page.getByText("Couldn’t load changes. Try refreshing.", { exact: true }),
    ).toBeInTheDocument();
    expect(page.getByText("staged diff transport failed", { exact: true })).toBeInTheDocument();
    expect(
      page.getByText("unstaged diff transport failed", { exact: true }),
    ).not.toBeInTheDocument();
  });

  it("uses only the localized fallback for a non-Error query failure", async () => {
    harness.stagedError = { message: "object detail must stay hidden" };
    await renderPanel();

    expect(
      page.getByText("Couldn’t load changes. Try refreshing.", { exact: true }),
    ).toBeInTheDocument();
    expect(
      page.getByText("object detail must stay hidden", { exact: true }),
    ).not.toBeInTheDocument();
  });
});
