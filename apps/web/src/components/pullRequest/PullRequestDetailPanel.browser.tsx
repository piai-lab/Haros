// FILE: PullRequestDetailPanel.browser.tsx
// Purpose: Browser regression for exact merge expectations, stale confirmation invalidation,
//          keyboard-accessible blocked reasons, and single-dispatch confirmation.
// Layer: Pull request presentation test

import "../../index.css";

import { ProjectId, type PullRequestDetail } from "@omnimind/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  detail: null as PullRequestDetail | null,
  detailReadFails: false,
  action: vi.fn<(input: Record<string, unknown>) => Promise<Record<string, unknown>>>(),
}));

vi.mock("~/appSettings", () => ({
  useAppSettings: () => ({
    settings: { defaultThreadEnvMode: "current", localePreference: "en" },
  }),
}));

vi.mock("~/hooks/useHandleNewThread", () => ({
  useHandleNewThread: () => ({ handleNewThread: vi.fn() }),
}));

vi.mock("~/components/ui/toast", () => ({
  toastManager: { add: vi.fn(), update: vi.fn(), close: vi.fn(), promise: vi.fn() },
}));

vi.mock("~/nativeApi", () => ({
  ensureNativeApi: () => ({
    pullRequests: {
      detail: vi.fn(async () => {
        if (harness.detailReadFails) throw new Error("Detail refresh failed");
        if (!harness.detail) throw new Error("Missing detail fixture");
        return harness.detail;
      }),
      action: harness.action,
    },
    shell: { openExternal: vi.fn(async () => undefined) },
  }),
  readNativeApi: () => ({
    pullRequests: {
      detail: vi.fn(async () => {
        if (harness.detailReadFails) throw new Error("Detail refresh failed");
        if (!harness.detail) throw new Error("Missing detail fixture");
        return harness.detail;
      }),
      action: harness.action,
    },
    shell: { openExternal: vi.fn(async () => undefined) },
  }),
}));

import { pullRequestQueryKeys } from "~/lib/pullRequestReactQuery";
import PullRequestDetailPanel from "./PullRequestDetailPanel";

const input = {
  projectId: ProjectId.makeUnsafe("merge-browser-project"),
  repository: "acme/widgets",
  number: 42,
} as const;

function detail(overrides: Partial<PullRequestDetail> = {}): PullRequestDetail {
  return {
    ...input,
    projectTitle: "Widgets",
    workspaceRoot: "/repo",
    title: "Stack member",
    body: "",
    url: "https://github.com/acme/widgets/pull/42",
    author: null,
    state: "open",
    isDraft: false,
    mergeable: "MERGEABLE",
    mergeability: "mergeable",
    mergeStateStatus: "CLEAN",
    reviewDecision: null,
    additions: 1,
    deletions: 0,
    changedFiles: 1,
    headBranch: "feature/top",
    baseBranch: "feature/base",
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
    mergedAt: null,
    closedAt: null,
    maintainerCanModify: true,
    reviewers: [],
    labels: [],
    checks: [],
    comments: [],
    commentsTruncated: false,
    commentsIncomplete: false,
    commits: [],
    mergeCapabilities: { merge: true, squash: true, rebase: true, deleteBranchOnMerge: false },
    stack: {
      number: 8,
      size: 3,
      position: 2,
      baseBranch: "main",
      entries: [
        { position: 1, number: 41 },
        { position: 2, number: 42 },
        { position: 3, number: 43 },
      ],
    },
    stackMetadataIncomplete: false,
    ...overrides,
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("PullRequestDetailPanel merge confirmation", () => {
  beforeEach(() => {
    harness.detail = detail();
    harness.detailReadFails = false;
    harness.action.mockReset();
    harness.action.mockResolvedValue({
      ...input,
      workspaceRoot: "/repo",
      mergeOutcome: "merged",
    });
  });

  it("invalidates stale confirmation and submits only the freshly reconfirmed exact targets", async () => {
    const queryClient = makeQueryClient();
    await render(
      <QueryClientProvider client={queryClient}>
        <PullRequestDetailPanel input={input} pollingEnabled={false} />
      </QueryClientProvider>,
    );

    await page.getByRole("button", { name: "Merge" }).click();
    expect(page.getByText("Merge #41, #42 into main using merge.", { exact: false })).toBeVisible();

    harness.detail = detail({
      stack: {
        number: 8,
        size: 3,
        position: 2,
        baseBranch: "release",
        entries: [
          { position: 1, number: 40 },
          { position: 2, number: 42 },
          { position: 3, number: 43 },
        ],
      },
    });
    await queryClient.refetchQueries({ queryKey: pullRequestQueryKeys.detail(input), exact: true });
    const staleConfirm = page.getByRole("button", { name: "Merge", exact: true }).last();
    await vi.waitFor(() =>
      expect(
        page.getByText("Pull request details changed or were refreshed.", { exact: false }),
      ).toBeVisible(),
    );
    expect(staleConfirm).toHaveAttribute("aria-disabled", "true");
    staleConfirm.element().focus();
    await userEvent.keyboard("{Enter}");
    expect(harness.action).not.toHaveBeenCalled();

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Merge" }).click();
    expect(
      page.getByText("Merge #40, #42 into release using merge.", { exact: false }),
    ).toBeVisible();
    const freshConfirm = page.getByRole("button", { name: "Merge", exact: true }).last();
    freshConfirm.element().focus();
    await userEvent.keyboard("{Enter}");

    await vi.waitFor(() => expect(harness.action).toHaveBeenCalledOnce());
    expect(harness.action.mock.calls[0]?.[0]).toMatchObject({
      action: "merge",
      expectation: {
        kind: "stack",
        stackNumber: 8,
        stackSize: 3,
        selectedPosition: 2,
        baseBranch: "release",
        targetPullRequestNumbers: [40, 42],
      },
    });
  });

  it("keeps incomplete stack metadata keyboard reachable but impossible to confirm", async () => {
    harness.detail = detail({ stack: null, stackMetadataIncomplete: true });
    const queryClient = makeQueryClient();
    await render(
      <QueryClientProvider client={queryClient}>
        <PullRequestDetailPanel input={input} pollingEnabled={false} />
      </QueryClientProvider>,
    );

    await page.getByRole("button", { name: "Merge" }).click();
    expect(
      page.getByText("Current pull request or stack details are unavailable.", { exact: false }),
    ).toBeVisible();
    const confirm = page.getByRole("button", { name: "Merge", exact: true }).last();
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    confirm.element().focus();
    await userEvent.keyboard(" ");
    expect(harness.action).not.toHaveBeenCalled();
  });

  it("does not treat cached detail as a fresh merge authority after refresh error", async () => {
    const queryClient = makeQueryClient();
    await render(
      <QueryClientProvider client={queryClient}>
        <PullRequestDetailPanel input={input} pollingEnabled={false} />
      </QueryClientProvider>,
    );

    harness.detailReadFails = true;
    await queryClient.refetchQueries({ queryKey: pullRequestQueryKeys.detail(input), exact: true });
    await page.getByRole("button", { name: "Merge" }).click();
    expect(
      page.getByText("Current pull request or stack details are unavailable.", { exact: false }),
    ).toBeVisible();
    const confirm = page.getByRole("button", { name: "Merge", exact: true }).last();
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    confirm.element().focus();
    await userEvent.keyboard("{Enter}");
    expect(harness.action).not.toHaveBeenCalled();
  });
});
