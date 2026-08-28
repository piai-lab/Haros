// FILE: ChatHeader.pull.browser.tsx
// Purpose: Prove the Environment-mode header exposes only the exact fast-forward Pull intent.
// Layer: Vitest browser regression

import "../../index.css";

import { ThreadId, type GitStatusResult } from "@harnessos/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const ROOT_CWD = "/repo/project";
const WORKTREE_CWD = "/repo/project/.harnessos/worktrees/feature";

const harness = vi.hoisted(() => ({
  branchesReady: true,
  branchesError: false,
  isRepo: true,
  statusReady: true,
  statusError: false,
  gitStatus: null as GitStatusResult | null,
  pullRunning: false,
  mutationCwds: [] as Array<string | null>,
  toastPromise: vi.fn(),
  settings: { localePreference: "en" as "en" | "zh-CN" },
}));

vi.mock("~/localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useIsMutating: () => (harness.pullRunning ? 1 : 0),
  useMutation: (options: { mutationKey?: readonly unknown[] }) => ({
    mutateAsync: async () => {
      const cwd = options.mutationKey?.at(-1);
      harness.mutationCwds.push(typeof cwd === "string" ? cwd : null);
      return {
        status: "pulled" as const,
        branch: "feature/test",
        upstreamBranch: "origin/feature/test",
      };
    },
  }),
  useQueryClient: () => ({}),
  useQuery: (options: { queryKey?: readonly unknown[] }) => {
    if (options.queryKey?.[1] === "branches") {
      return {
        data: harness.branchesReady
          ? { isRepo: harness.isRepo, hasOriginRemote: true, branches: [] }
          : undefined,
        isError: harness.branchesError,
        isSuccess: harness.branchesReady && !harness.branchesError,
      };
    }
    return {
      data: harness.statusReady ? harness.gitStatus : undefined,
      isError: harness.statusError,
      isSuccess: harness.statusReady && !harness.statusError,
    };
  },
}));

vi.mock("~/components/ui/toast", () => ({
  toastManager: {
    add: vi.fn(() => "toast-test"),
    promise: harness.toastPromise,
    update: vi.fn(),
  },
}));

import { I18nProvider } from "~/i18n";
import { ChatHeaderPullControl } from "./ChatHeader";

function behindStatus(overrides: Partial<GitStatusResult> = {}): GitStatusResult {
  return {
    branch: "feature/test",
    hasWorkingTreeChanges: false,
    workingTree: { files: [], insertions: 0, deletions: 0 },
    hasUpstream: true,
    upstreamBranch: "origin/feature/test",
    aheadCount: 0,
    behindCount: 2,
    pr: null,
    ...overrides,
  };
}

function pullControl(input: { cwd: string; compact: boolean }) {
  return (
    <I18nProvider>
      <div data-testid="pull-host" className="flex w-full min-w-0 items-center overflow-hidden">
        <ChatHeaderPullControl
          activeThreadId={ThreadId.makeUnsafe("chat-header-pull-thread")}
          compact={input.compact}
          enabled
          gitCwd={input.cwd}
        />
      </div>
    </I18nProvider>
  );
}

describe("ChatHeader behind-only Pull", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.branchesReady = true;
    harness.branchesError = false;
    harness.isRepo = true;
    harness.statusReady = true;
    harness.statusError = false;
    harness.gitStatus = behindStatus();
    harness.pullRunning = false;
    harness.mutationCwds.length = 0;
    harness.toastPromise.mockClear();
    harness.settings.localePreference = "en";
  });

  it.each([ROOT_CWD, WORKTREE_CWD])("dispatches the exact checkout cwd from %s", async (cwd) => {
    harness.gitStatus = behindStatus();
    await render(pullControl({ cwd, compact: false }));
    const pull = page.getByRole("button", { name: "Pull", exact: true });

    pull.element().focus();
    await userEvent.keyboard("{Enter}");

    expect(pull.element()).toBe(document.activeElement);
    expect(harness.mutationCwds).toEqual([cwd]);
    expect(harness.toastPromise).toHaveBeenCalledOnce();
    const presentation = harness.toastPromise.mock.calls[0]?.[1] as
      | {
          loading: { title: string };
          success: (result: {
            status: "pulled" | "skipped_up_to_date";
            branch: string;
            upstreamBranch: string | null;
          }) => { title: string; description: string };
          error: (error: unknown) => { title: string; description: string };
        }
      | undefined;
    expect(presentation?.loading.title).toBe("Syncing with remote…");
    expect(
      presentation?.success({
        status: "pulled",
        branch: "feature/test",
        upstreamBranch: "origin/feature/test",
      }),
    ).toMatchObject({
      title: "Remote synced",
      description: "Updated feature/test from origin/feature/test.",
    });
    expect(presentation?.error(new Error("pull failed"))).toMatchObject({
      title: "Sync failed",
      description: "See or copy the Git details to diagnose the problem.",
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it("hides unavailable status and keeps Pulling visible for the running exact cwd", async () => {
    harness.gitStatus = behindStatus();
    harness.statusReady = false;
    const mounted = await render(pullControl({ cwd: ROOT_CWD, compact: false }));
    expect(page.getByRole("button", { name: "Pull", exact: true })).not.toBeInTheDocument();

    harness.pullRunning = true;
    harness.statusError = true;
    await mounted.rerender(pullControl({ cwd: ROOT_CWD, compact: false }));

    const pulling = page.getByRole("button", { name: "Pulling…", exact: true });
    expect(pulling).toBeInTheDocument();
    expect(pulling.element()).toBeDisabled();
    expect(pulling.element()).toHaveAttribute("aria-busy", "true");
  });

  it.each([
    { width: 480, locale: "en", label: "Pull", compact: true },
    { width: 960, locale: "en", label: "Pull", compact: false },
    { width: 1440, locale: "en", label: "Pull", compact: false },
    { width: 480, locale: "zh-CN", label: "拉取", compact: true },
    { width: 960, locale: "zh-CN", label: "拉取", compact: false },
    { width: 1440, locale: "zh-CN", label: "拉取", compact: false },
  ] as const)(
    "keeps $locale actual copy and header geometry at $width px",
    async ({ width, locale, label, compact }) => {
      await page.viewport(width, 720);
      harness.settings.localePreference = locale;
      harness.gitStatus = behindStatus();
      await render(pullControl({ cwd: ROOT_CWD, compact }));

      const pull = page.getByRole("button", { name: label, exact: true });
      expect(pull).toBeInTheDocument();
      expect(pull.element().textContent?.trim()).toBe(compact ? "" : label);
      const host = page.getByTestId("pull-host").element();
      expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);
      expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);
    },
  );
});
