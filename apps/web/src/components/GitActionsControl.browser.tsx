// FILE: GitActionsControl.browser.tsx
// Purpose: Prove the Commit action matrix preserves exact authoring handoff,
//          direct View PR behavior, keyboard-disabled reasons, and narrow geometry.
// Layer: Vitest browser regression

import "../index.css";

import {
  ThreadId,
  type GitRunStackedActionResult,
  type GitStatusResult,
} from "@harnessos/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  localePreference: "en" as "en" | "zh-CN",
  status: null as GitStatusResult | null,
  runStackedAction: vi.fn<(input: Record<string, unknown>) => Promise<GitRunStackedActionResult>>(),
  openExternal: vi.fn<(url: string) => Promise<void>>(),
  refreshAvailability: vi.fn<() => Promise<void>>(),
  serverSettingsError: null as Error | null,
}));

vi.mock("~/engineSettings", () => ({
  getEngineStartOptions: () => null,
}));

vi.mock("~/serverSettings", () => ({
  useServerSettings: () => {
    const settings = {
      engines: { codex: { homePath: "" } },
      textGenerationEngineSelection: { engine: "codex", model: null },
    };
    return {
      settings,
      defaults: settings,
      fetchSettings: async () => {
        if (harness.serverSettingsError) throw harness.serverSettingsError;
        return settings;
      },
    };
  },
}));

vi.mock("~/localPreferences", () => ({
  useLocalPreferences: () => ({
    preferences: { localePreference: harness.localePreference },
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useIsMutating: () => 0,
  useQueryClient: () => ({ invalidateQueries: vi.fn(), refetchQueries: vi.fn() }),
  useQuery: (options: { queryKey?: readonly unknown[] }) => {
    const queryKind = options.queryKey?.[1];
    if (queryKind === "branches") {
      const branch = harness.status?.branch ?? "feature/test";
      return {
        data: {
          isRepo: true,
          hasOriginRemote: true,
          branches: branch
            ? [
                {
                  name: branch,
                  current: true,
                  isRemote: false,
                  isDefault: branch === "main" || branch === "master",
                },
                ...(branch === "main"
                  ? []
                  : [{ name: "main", current: false, isRemote: false, isDefault: true }]),
              ]
            : [{ name: "main", current: false, isRemote: false, isDefault: true }],
        },
        isSuccess: true,
      };
    }
    return {
      data: harness.status,
      error: null,
      isFetching: false,
    };
  },
  useMutation: (options: { mutationKey?: readonly unknown[] }) => {
    const mutationKind = options.mutationKey?.[2];
    if (mutationKind === "run-stacked-action") {
      return {
        isPending: false,
        mutate: vi.fn(),
        mutateAsync: harness.runStackedAction,
      };
    }
    return {
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn(async () => ({ status: "up_to_date" })),
    };
  },
}));

vi.mock("~/lib/gitReactQuery", () => ({
  gitBranchesQueryOptions: (cwd: string | null) => ({ queryKey: ["git", "branches", cwd] }),
  gitStatusQueryOptions: (cwd: string | null) => ({ queryKey: ["git", "status", cwd] }),
  gitInitMutationOptions: ({ cwd }: { cwd: string | null }) => ({
    mutationKey: ["git", "mutation", "init", cwd],
  }),
  gitPullMutationOptions: ({ cwd }: { cwd: string | null }) => ({
    mutationKey: ["git", "mutation", "pull", cwd],
  }),
  gitRunStackedActionMutationOptions: ({ cwd }: { cwd: string | null }) => ({
    mutationKey: ["git", "mutation", "run-stacked-action", cwd],
  }),
  gitMutationKeys: {
    pull: (cwd: string | null) => ["git", "mutation", "pull", cwd],
    runStackedAction: (cwd: string | null) => ["git", "mutation", "run-stacked-action", cwd],
  },
  refreshGitActionAvailability: harness.refreshAvailability,
  invalidateGitQueries: vi.fn(async () => undefined),
  isGitExpensiveReadCapacityError: () => false,
}));

vi.mock("~/storeSelectors", () => ({
  createThreadSelector: () => () => ({
    worktreePath: "/task/repo",
    branch: harness.status?.branch ?? null,
    title: "Git browser test",
    createBranchFlowCompleted: true,
  }),
}));

vi.mock("~/store", () => ({
  useStore: (selector: (state: unknown) => unknown) => selector({ setThreadWorkspace: vi.fn() }),
}));

vi.mock("~/nativeApi", () => ({
  readNativeApi: () => ({
    shell: { openExternal: harness.openExternal },
    git: {
      onActionProgress: () => () => undefined,
      createBranch: vi.fn(async () => undefined),
      checkout: vi.fn(async () => undefined),
      githubRepository: vi.fn(async () => ({ repository: null })),
    },
    orchestration: { dispatchCommand: vi.fn(async () => undefined) },
  }),
}));

vi.mock("~/components/ui/toast", () => ({
  toastManager: {
    add: vi.fn(() => "git-browser-toast"),
    update: vi.fn(),
    close: vi.fn(),
    promise: vi.fn(),
  },
}));

import { I18nProvider } from "~/i18n";
import GitActionsControl from "./GitActionsControl";

const ACTIVE_THREAD_ID = ThreadId.makeUnsafe("git-actions-browser-thread");

function status(overrides: Partial<GitStatusResult> = {}): GitStatusResult {
  return {
    branch: "feature/test",
    hasWorkingTreeChanges: true,
    workingTree: {
      files: [
        { path: "src/a.ts", insertions: 3, deletions: 1 },
        { path: "src/b.ts", insertions: 2, deletions: 0 },
      ],
      insertions: 5,
      deletions: 1,
    },
    hasUpstream: true,
    upstreamBranch: "feature/test",
    aheadCount: 0,
    behindCount: 0,
    pr: null,
    ...overrides,
  };
}

function successfulResult(): GitRunStackedActionResult {
  return {
    action: "commit_push_pr",
    branch: { status: "skipped_not_requested" },
    commit: { status: "created", commitSha: "abcdef0123456789", subject: "Focused commit" },
    push: { status: "pushed", branch: "feature/test", upstreamBranch: "feature/test" },
    pr: {
      status: "created",
      number: 42,
      title: "Focused PR",
      url: "https://example.com/pr/42",
      baseBranch: "main",
      headBranch: "feature/test",
    },
  };
}

function control() {
  return (
    <I18nProvider>
      <div className="w-full">
        <GitActionsControl gitCwd="/task/repo" activeThreadId={ACTIVE_THREAD_ID} variant="panel" />
      </div>
    </I18nProvider>
  );
}

async function openGitMenu() {
  const trigger = page.getByRole("button", {
    name:
      harness.localePreference === "zh-CN"
        ? /提交或推送|Git 操作选项|打开 Git 操作菜单/u
        : /Commit or push|Git action options|open the Git actions menu/iu,
  });
  await trigger.click();
}

async function openCommitDialog() {
  await openGitMenu();
  await page
    .getByRole("menuitem", {
      name: harness.localePreference === "zh-CN" ? "提交" : "Commit",
      exact: true,
    })
    .click();
  await expect.element(page.getByRole("dialog")).toBeVisible();
}

async function excludeSecondFileAndTypeMessage(message: string) {
  await page
    .getByRole("button", { name: harness.localePreference === "zh-CN" ? "编辑" : "Edit" })
    .click();
  const checkboxes = page.getByRole("checkbox").elements();
  expect(checkboxes).toHaveLength(3);
  await userEvent.click(checkboxes[2]!);
  await page
    .getByPlaceholder(
      harness.localePreference === "zh-CN" ? "留空则自动生成" : "Leave empty to generate",
    )
    .fill(message);
}

describe("GitActionsControl Commit action matrix", () => {
  beforeEach(() => {
    harness.localePreference = "en";
    harness.status = status();
    harness.runStackedAction.mockReset();
    harness.runStackedAction.mockResolvedValue(successfulResult());
    harness.openExternal.mockReset();
    harness.openExternal.mockResolvedValue(undefined);
    harness.refreshAvailability.mockReset();
    harness.refreshAvailability.mockResolvedValue(undefined);
    harness.serverSettingsError = null;
  });

  afterEach(async () => {
    await page.viewport(1280, 720);
  });

  it("hands trimmed commit authoring and the exact non-empty file subset into Create PR", async () => {
    await render(control());
    await openCommitDialog();
    await excludeSecondFileAndTypeMessage("  keep this commit message  ");

    await page.getByRole("button", { name: /^Create PR/u }).click();
    await expect.element(page.getByLabelText("Pull request title")).toBeVisible();
    await page.getByRole("button", { name: /^Create PR/u }).click();

    await vi.waitFor(() => expect(harness.runStackedAction).toHaveBeenCalledTimes(1));
    expect(harness.runStackedAction.mock.calls[0]?.[0]).toMatchObject({
      action: "commit_push_pr",
      commitMessage: "keep this commit message",
      filePaths: ["src/a.ts"],
    });
  });

  it("runs clean default-branch commit_push without commit authoring after confirmation", async () => {
    harness.status = status({ branch: "main", upstreamBranch: "main" });
    const mounted = await render(control());
    await openCommitDialog();
    await excludeSecondFileAndTypeMessage("  must not reach clean push  ");
    await userEvent.click(page.getByRole("checkbox").elements()[1]!);

    const actionRow = page.getByRole("button", { name: "Commit and push", exact: true });
    const dirtyActionElement = actionRow.element();
    expect(dirtyActionElement).toBeInstanceOf(HTMLButtonElement);
    expect(dirtyActionElement.getAttribute("aria-disabled")).toBe("true");
    if (!(dirtyActionElement instanceof HTMLButtonElement)) return;
    dirtyActionElement.click();
    expect(harness.runStackedAction).not.toHaveBeenCalled();
    await expect.element(page.getByRole("dialog")).toBeVisible();

    harness.status = status({
      branch: "main",
      hasWorkingTreeChanges: false,
      workingTree: { files: [], insertions: 0, deletions: 0 },
      upstreamBranch: "main",
      aheadCount: 2,
    });
    await mounted.rerender(control());
    await vi.waitFor(() => expect(actionRow.element().getAttribute("aria-disabled")).toBeNull());
    await actionRow.click();

    const continuePush = page.getByRole("button", { name: "Push to main", exact: true });
    await expect.element(continuePush).toBeVisible();
    expect(harness.runStackedAction).not.toHaveBeenCalled();
    await continuePush.click();

    await vi.waitFor(() => expect(harness.runStackedAction).toHaveBeenCalledTimes(1));
    const input = harness.runStackedAction.mock.calls[0]?.[0] ?? {};
    expect(input).toMatchObject({ action: "commit_push" });
    expect(input).not.toHaveProperty("commitMessage");
    expect(input).not.toHaveProperty("filePaths");
  });

  it("drops the Commit-dialog handoff when Create PR excludes local changes", async () => {
    harness.status = status({ aheadCount: 1 });
    await render(control());
    await openCommitDialog();
    await excludeSecondFileAndTypeMessage("  do not carry me  ");

    await page.getByRole("button", { name: "Create PR", exact: true }).click();
    await page.getByRole("checkbox", { name: "Commit and push local changes" }).click();
    await page.getByRole("button", { name: /^Create PR/u }).click();

    await vi.waitFor(() => expect(harness.runStackedAction).toHaveBeenCalledTimes(1));
    const submission = harness.runStackedAction.mock.calls[0]?.[0] ?? {};
    expect(submission).toMatchObject({ action: "create_pr", allowDirtyWorkingTree: true });
    expect(submission).not.toHaveProperty("commitMessage");
    expect(submission).not.toHaveProperty("filePaths");
  });

  it("opens an existing PR directly without opening authoring or running a mutation", async () => {
    harness.status = status({
      pr: {
        number: 17,
        title: "Existing PR",
        url: "https://example.com/pr/17",
        baseBranch: "main",
        headBranch: "feature/test",
        state: "open",
        isDraft: false,
        mergeability: "unknown",
        additions: null,
        deletions: null,
        changedFiles: null,
      },
    });
    await render(control());
    await openCommitDialog();

    await page.getByRole("button", { name: "View PR", exact: true }).click();

    await vi.waitFor(() =>
      expect(harness.openExternal).toHaveBeenCalledWith("https://example.com/pr/17"),
    );
    expect(harness.runStackedAction).not.toHaveBeenCalled();
    expect(page.getByLabelText("Pull request title").elements()).toHaveLength(0);
  });

  it("keeps disabled menu and dialog actions focusable, described, and inert from the keyboard", async () => {
    harness.status = status({ behindCount: 2 });
    await render(control());
    await openGitMenu();

    const menuElement = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (element) => element.getAttribute("aria-label") === "Commit and push",
    );
    expect(menuElement).toBeDefined();
    if (!menuElement) return;
    menuElement.focus();
    expect(document.activeElement).toBe(menuElement);
    expect(menuElement.getAttribute("aria-disabled")).toBe("true");
    const menuReasonId = menuElement.getAttribute("aria-describedby");
    expect(menuReasonId).toBeTruthy();
    expect(document.getElementById(menuReasonId!)?.textContent).toContain(
      "Pull or rebase before committing and pushing",
    );
    await userEvent.keyboard("{Enter} ");
    expect(harness.runStackedAction).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(menuElement);

    await page.getByRole("menuitem", { name: "Commit", exact: true }).click();
    const disabledDialogAction = page.getByRole("button", {
      name: "Commit and push",
      exact: true,
    });
    const dialogElement = disabledDialogAction.element();
    dialogElement.focus();
    expect(document.activeElement).toBe(dialogElement);
    expect(dialogElement.getAttribute("aria-disabled")).toBe("true");
    const dialogReasonId = dialogElement.getAttribute("aria-describedby");
    expect(document.getElementById(dialogReasonId!)?.textContent).toContain(
      "Pull or rebase before committing and pushing",
    );
    await userEvent.keyboard("{Enter} ");
    expect(harness.runStackedAction).not.toHaveBeenCalled();
    await expect.element(page.getByRole("dialog")).toBeVisible();
  });

  it("keeps the four-action Chinese dialog inside the 480px product viewport", async () => {
    harness.localePreference = "zh-CN";
    await page.viewport(480, 620);
    await render(control());
    await openCommitDialog();

    for (const label of ["在新分支上提交", "提交", "提交并推送", "创建 PR"]) {
      await expect.element(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
    const dialogRect = page.getByRole("dialog").element().getBoundingClientRect();
    expect(dialogRect.left).toBeGreaterThanOrEqual(0);
    expect(dialogRect.right).toBeLessThanOrEqual(window.innerWidth + 1);
    expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
  });
});
