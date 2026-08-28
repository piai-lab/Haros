// FILE: GitPanel.diffIdentity.browser.tsx
// Purpose: Prove selected Git diff identity remounts mount-time diff content on selection/content/theme changes.
// Layer: Vitest browser regression

import "../../index.css";

import { ProjectId, ThreadId } from "@harnessos/contracts";
import type { FileDiffMetadata } from "@pierre/diffs/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  stagedPatch: "",
  unstagedPatch: "",
  theme: "light" as "light" | "dark",
  settings: { localePreference: "en" as const },
}));

vi.mock("~/localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useMutation: () => ({ isPending: false, mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: (options: { queryKey?: readonly unknown[] }) => ({
    data: {
      patch: options.queryKey?.at(-1) === "staged" ? harness.stagedPatch : harness.unstagedPatch,
    },
    error: null,
    isError: false,
    isLoading: false,
  }),
}));

vi.mock("~/hooks/useTheme", () => ({
  useTheme: () => ({ resolvedTheme: harness.theme }),
}));
vi.mock("~/store", () => ({ useStore: (selector: (state: unknown) => unknown) => selector({}) }));
vi.mock("~/storeSelectors", () => ({
  createProjectSelector: () => () => null,
  createThreadSelector: () => () => ({ worktreePath: "/task/worktree" }),
}));

vi.mock("./FileDiffView", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./FileDiffView")>();
  const { useState } = await import("react");
  return {
    ...actual,
    FileDiffCard: (props: { fileDiff: FileDiffMetadata; theme: "light" | "dark" }) => {
      // @pierre/diffs consumes fileDiff/options as mount-time configuration.
      // Holding the first identity makes this harness fail unless GitPanel
      // remounts the selected view at the exact content/theme boundary.
      const [mountedIdentity] = useState(
        () => `${props.fileDiff.name}:${props.fileDiff.cacheKey}:${props.theme}`,
      );
      return <output data-testid="mounted-diff-identity">{mountedIdentity}</output>;
    },
  };
});

import { I18nProvider } from "~/i18n";
import { GitPanel } from "./GitPanel";

function filePatch(path: string, before: string, after: string): string {
  return [
    `diff --git a/${path} b/${path}`,
    "index 1111111..2222222 100644",
    `--- a/${path}`,
    `+++ b/${path}`,
    "@@ -1,1 +1,1 @@",
    `-${before}`,
    `+${after}`,
    "",
  ].join("\n");
}

function panel() {
  return (
    <I18nProvider>
      <div className="h-[500px] w-[600px]">
        <GitPanel
          hostThreadId={ThreadId.makeUnsafe("git-diff-identity-thread")}
          projectId={ProjectId.makeUnsafe("git-diff-identity-project")}
        />
      </div>
    </I18nProvider>
  );
}

async function selectFile(path: string) {
  const row = page.getByRole("button", { name: path, exact: true });
  await row.click();
  expect(row.element()).toBe(document.activeElement);
}

function mountedIdentity(): string {
  return page.getByTestId("mounted-diff-identity").element().textContent ?? "";
}

describe("GitPanel selected diff render identity", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.stagedPatch = "";
    harness.unstagedPatch = "";
    harness.theme = "light";
  });

  it("remounts across same-shape staged and unstaged file selections", async () => {
    harness.stagedPatch = filePatch("src/staged-a.ts", "oldA", "newA");
    harness.unstagedPatch = filePatch("src/unstaged-b.ts", "oldB", "newB");
    await render(panel());

    await selectFile("src/staged-a.ts");
    const stagedIdentity = mountedIdentity();
    expect(stagedIdentity).toContain("src/staged-a.ts");

    await selectFile("src/unstaged-b.ts");
    expect(mountedIdentity()).toContain("src/unstaged-b.ts");
    expect(mountedIdentity()).not.toBe(stagedIdentity);
  });

  it("remounts when the selected file receives refreshed diff content", async () => {
    harness.stagedPatch = filePatch("src/refresh.ts", "before", "first");
    const mounted = await render(panel());
    await selectFile("src/refresh.ts");
    const firstIdentity = mountedIdentity();

    harness.stagedPatch = filePatch("src/refresh.ts", "before", "second");
    await mounted.rerender(panel());

    expect(mountedIdentity()).not.toBe(firstIdentity);
  });

  it("remounts the selected diff when the resolved theme changes", async () => {
    harness.stagedPatch = filePatch("src/theme.ts", "before", "after");
    const mounted = await render(panel());
    await selectFile("src/theme.ts");
    const lightIdentity = mountedIdentity();
    expect(lightIdentity).toMatch(/:light$/u);

    harness.theme = "dark";
    await mounted.rerender(panel());

    expect(mountedIdentity()).toMatch(/:dark$/u);
    expect(mountedIdentity()).not.toBe(lightIdentity);
  });
});
