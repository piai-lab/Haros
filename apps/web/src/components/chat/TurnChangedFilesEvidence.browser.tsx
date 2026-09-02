// FILE: TurnChangedFilesEvidence.browser.tsx
// Purpose: Browser proof for settled Checkpoint-owned Timeline diff evidence.
// Layer: Vitest browser tests

import "../../index.css";

import { CheckpointRef, ThreadId, TurnId } from "@harnessos/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const localeHarness = vi.hoisted(() => ({ localePreference: "en" }));

vi.mock("../../localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../localPreferences")>()),
  useLocalPreferences: () => ({
    preferences: { localePreference: localeHarness.localePreference },
  }),
}));

import { I18nProvider } from "../../i18n";
import type { TurnDiffSummary } from "../../types";
import type { WorkLogEntry } from "../../workLog";
import { ToastProvider, toastManager } from "../ui/toast";
import { TurnChangedFilesEvidence } from "./TurnChangedFilesEvidence";

const THREAD_ID = ThreadId.makeUnsafe("thread-turn-diff-evidence");
const TURN_ID = TurnId.makeUnsafe("turn-turn-diff-evidence");
const PATCH = [
  "diff --git a/src/result.ts b/src/result.ts",
  "index 3367afd..bf1937f 100644",
  "--- a/src/result.ts",
  "+++ b/src/result.ts",
  "@@ -1 +1 @@",
  "-export const result = 'old';",
  "+export const result = 'verified';",
  "",
].join("\n");
const LARGE_PATCH = [
  "diff --git a/src/result.ts b/src/result.ts",
  "index 3367afd..bf1937f 100644",
  "--- a/src/result.ts",
  "+++ b/src/result.ts",
  "@@ -1,160 +1,160 @@",
  ...Array.from({ length: 160 }, (_, index) => `-old line ${index + 1}`),
  ...Array.from({ length: 160 }, (_, index) => `+verified line ${index + 1}`),
  "",
].join("\n");

const SUMMARY: TurnDiffSummary = {
  turnId: TURN_ID,
  completedAt: "2026-09-01T01:00:00.000Z",
  status: "completed",
  files: [{ path: "src/result.ts", additions: 1, deletions: 1 }],
  checkpointRef: CheckpointRef.makeUnsafe("checkpoint-turn-diff-evidence"),
  checkpointTurnCount: 4,
};

async function mountEvidence(
  getTurnDiff: ReturnType<typeof vi.fn>,
  options: {
    technicalEntries?: ReadonlyArray<WorkLogEntry>;
    readToolResult?: ReturnType<typeof vi.fn>;
    onOpenTurnDiff?: (turnId: TurnId, filePath?: string) => void;
    onUndoTurnFiles?: (turnCounts: readonly number[]) => void;
  } = {},
) {
  Object.defineProperty(window, "nativeApi", {
    configurable: true,
    value: {
      orchestration: { getTurnDiff },
      ...(options.readToolResult ? { engine: { readToolResult: options.readToolResult } } : {}),
    },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function TestSurface() {
    return (
      <I18nProvider>
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            <TurnChangedFilesEvidence
              summary={SUMMARY}
              threadId={THREAD_ID}
              turnId={TURN_ID}
              resolvedTheme="light"
              fontSizePx={13}
              onOpenTurnDiff={options.onOpenTurnDiff ?? (() => {})}
              onUndoTurnFiles={options.onUndoTurnFiles}
              technicalEntries={options.technicalEntries}
              timestampFormat="24-hour"
            />
          </QueryClientProvider>
        </ToastProvider>
      </I18nProvider>
    );
  }
  const rootRoute = createRootRoute({ component: TestSurface });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute,
  });
  const screen = await render(<RouterProvider router={router} />);
  return { screen, queryClient };
}

describe("TurnChangedFilesEvidence", () => {
  afterEach(() => {
    toastManager.close();
    localeHarness.localePreference = "en";
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    Reflect.deleteProperty(window, "nativeApi");
  });

  it("lazy-loads the cumulative Checkpoint patch and gives it one vertical scroll owner", async () => {
    const getTurnDiff = vi.fn(async (_input: unknown, _options?: { signal?: AbortSignal }) => ({
      threadId: THREAD_ID,
      fromTurnCount: 3,
      toTurnCount: 4,
      diff: LARGE_PATCH,
    }));
    const { screen } = await mountEvidence(getTurnDiff);

    try {
      const disclosure = document.querySelector<HTMLButtonElement>(
        '[data-turn-changed-files-evidence="true"] button[aria-expanded]',
      );
      expect(disclosure?.getAttribute("aria-expanded")).toBe("false");
      expect(getTurnDiff).not.toHaveBeenCalled();
      expect(document.body.textContent ?? "").toContain("Edited files");
      expect(document.body.textContent ?? "").not.toContain("Review files");

      disclosure?.click();

      await expect.poll(() => getTurnDiff.mock.calls.length).toBe(1);
      const firstCall = getTurnDiff.mock.calls[0];
      expect(firstCall?.[0]).toEqual({
        threadId: THREAD_ID,
        fromTurnCount: 3,
        toTurnCount: 4,
        ignoreWhitespace: false,
      });
      expect(firstCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
      await expect
        .poll(() => document.querySelector('[data-diff-file-path="src/result.ts"]') !== null)
        .toBe(true);

      const scrollRoots = document.querySelectorAll('[data-turn-diff-scroll-root="true"]');
      expect(scrollRoots).toHaveLength(1);
      const scrollRoot = scrollRoots[0]!;
      const verticalOwners = [
        scrollRoot,
        ...Array.from(scrollRoot.querySelectorAll<HTMLElement>("*")),
      ].filter((element) => {
        const overflowY = getComputedStyle(element).overflowY;
        return overflowY === "auto" || overflowY === "scroll";
      });
      expect(verticalOwners).toHaveLength(1);
      expect(verticalOwners[0]?.classList.contains("diff-render-surface")).toBe(true);
      await expect
        .poll(() => verticalOwners[0]!.scrollHeight > verticalOwners[0]!.clientHeight)
        .toBe(true);
      expect(document.body.textContent ?? "").toContain("result.ts");
      expect(
        document
          .querySelector('[data-timeline-file-copy="src/result.ts"]')
          ?.getAttribute("aria-label"),
      ).toBe("Copy changes for src/result.ts");
      expect(document.body.textContent ?? "").toContain("Full review");
    } finally {
      await screen.unmount();
    }
  });

  it("copies one exact file patch and keeps file actions separate from disclosure", async () => {
    const secondHeader = "diff --git a/src/two.ts b/src/two.ts";
    const patch = `${PATCH}${[
      secondHeader,
      "index 1111111..2222222 100644",
      "--- a/src/two.ts",
      "+++ b/src/two.ts",
      "@@ -1 +1 @@",
      "-two",
      "+TWO",
      "",
    ].join("\n")}`;
    const getTurnDiff = vi.fn(async () => ({
      threadId: THREAD_ID,
      fromTurnCount: 3,
      toTurnCount: 4,
      diff: patch,
    }));
    const onOpenTurnDiff = vi.fn();
    const onUndoTurnFiles = vi.fn();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const { screen } = await mountEvidence(getTurnDiff, {
      onOpenTurnDiff,
      onUndoTurnFiles,
    });

    try {
      document
        .querySelector<HTMLButtonElement>(
          '[data-turn-changed-files-evidence="true"] > button[aria-expanded]',
        )
        ?.click();
      await expect
        .poll(() => document.querySelector('[data-diff-file-path="src/two.ts"]') !== null)
        .toBe(true);

      const firstHeader = document.querySelector<HTMLButtonElement>(
        '[data-diff-file-path="src/result.ts"] [data-diff-file-header] button[aria-expanded]',
      );
      expect(firstHeader?.getAttribute("aria-expanded")).toBe("true");
      firstHeader?.focus();
      await userEvent.keyboard("{Enter}");
      await expect.poll(() => firstHeader?.getAttribute("aria-expanded")).toBe("false");
      await userEvent.keyboard(" ");
      await expect.poll(() => firstHeader?.getAttribute("aria-expanded")).toBe("true");

      document
        .querySelector<HTMLButtonElement>('[data-timeline-file-copy="src/result.ts"]')
        ?.click();
      await expect.poll(() => writeText.mock.calls.length).toBe(1);
      expect(writeText).toHaveBeenCalledWith(patch.slice(0, patch.indexOf(secondHeader)));
      expect(firstHeader?.getAttribute("aria-expanded")).toBe("true");

      const undo = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent === "Undo changes",
      );
      const review = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent === "Full review",
      );
      undo?.click();
      review?.click();
      expect(onUndoTurnFiles).toHaveBeenCalledWith([4]);
      expect(onOpenTurnDiff).toHaveBeenCalledWith(TURN_ID);
    } finally {
      writeText.mockRestore();
      await screen.unmount();
    }
  });

  it.each([
    ["en", "Failed to copy"],
    ["zh-CN", "复制失败"],
  ])(
    "shows the localized %s clipboard failure without entering copied state",
    async (localePreference, expectedFailure) => {
      localeHarness.localePreference = localePreference;
      const getTurnDiff = vi.fn(async () => ({
        threadId: THREAD_ID,
        fromTurnCount: 3,
        toTurnCount: 4,
        diff: PATCH,
      }));
      const writeText = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockRejectedValue(new Error("sensitive clipboard failure"));
      const execCommand = vi.spyOn(document, "execCommand").mockImplementation(() => false);
      const { screen } = await mountEvidence(getTurnDiff);

      try {
        document
          .querySelector<HTMLButtonElement>(
            '[data-turn-changed-files-evidence="true"] > button[aria-expanded]',
          )
          ?.click();
        await expect
          .poll(() => document.querySelector('[data-timeline-file-copy="src/result.ts"]') !== null)
          .toBe(true);

        const copyButton = document.querySelector<HTMLButtonElement>(
          '[data-timeline-file-copy="src/result.ts"]',
        );
        const originalLabel = copyButton?.getAttribute("aria-label");
        copyButton?.click();

        await expect.poll(() => writeText.mock.calls.length).toBe(1);
        await expect
          .poll(() =>
            Array.from(document.querySelectorAll('[data-slot="toast-title"]')).some(
              (element) => element.textContent === expectedFailure,
            ),
          )
          .toBe(true);
        expect(copyButton?.getAttribute("aria-label")).toBe(originalLabel);
        expect(document.body.textContent ?? "").not.toContain("sensitive clipboard failure");
      } finally {
        execCommand.mockRestore();
        writeText.mockRestore();
        await screen.unmount();
      }
    },
  );

  it("keeps raw and Full review available when per-file evidence cannot be proven", async () => {
    const malformedPatch = "not a supported patch\n--- incomplete";
    const getTurnDiff = vi.fn(async () => ({
      threadId: THREAD_ID,
      fromTurnCount: 3,
      toTurnCount: 4,
      diff: malformedPatch,
    }));
    const onOpenTurnDiff = vi.fn();
    const { screen } = await mountEvidence(getTurnDiff, { onOpenTurnDiff });

    try {
      document
        .querySelector<HTMLButtonElement>(
          '[data-turn-changed-files-evidence="true"] > button[aria-expanded]',
        )
        ?.click();
      await expect.poll(() => document.body.textContent ?? "").toContain(malformedPatch);
      expect(document.querySelector("[data-timeline-file-copy]")).toBeNull();
      const review = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent === "Full review",
      );
      expect(review).toBeDefined();
      review?.click();
      expect(onOpenTurnDiff).toHaveBeenCalledWith(TURN_ID);
    } finally {
      await screen.unmount();
    }
  });

  it("does not fan out full-result reads when the technical list opens", async () => {
    const signals = new Map<string, AbortSignal>();
    const readToolResult = vi.fn(
      (input: { toolCallId: string }, options?: { signal?: AbortSignal }) => {
        if (options?.signal) signals.set(input.toolCallId, options.signal);
        return new Promise(() => {});
      },
    );
    const technicalEntries: WorkLogEntry[] = ["call-one", "call-two"].map((toolCallId, index) => ({
      id: `entry-${toolCallId}`,
      createdAt: "2026-09-01T01:00:00.000Z",
      label: `Edited file ${index + 1}`,
      toolTitle: `Edited file ${index + 1}`,
      tone: "tool",
      itemType: "file_change",
      toolDetails: {
        kind: "file-change",
        title: `Edited file ${index + 1}`,
        toolCallId,
        toolName: "edit",
        input: '{"path":"src/result.ts"}',
        output: {
          preview: { head: "tool report", clipped: true, originalBytes: 20_000 },
        },
      },
    }));
    const getTurnDiff = vi.fn(async () => ({
      threadId: THREAD_ID,
      fromTurnCount: 3,
      toTurnCount: 4,
      diff: PATCH,
    }));
    const { screen } = await mountEvidence(getTurnDiff, { technicalEntries, readToolResult });

    try {
      document
        .querySelector<HTMLButtonElement>(
          '[data-turn-changed-files-evidence="true"] > button[aria-expanded]',
        )
        ?.click();
      await expect.poll(() => document.body.textContent ?? "").toContain("Technical details");
      const technical = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.includes("Technical details"),
      );
      technical?.click();
      await expect.poll(() => document.body.textContent ?? "").toContain("Edited file 1");
      expect(readToolResult).not.toHaveBeenCalled();

      const firstCall = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.includes("Edited file 1"),
      );
      firstCall?.click();
      await expect.poll(() => readToolResult.mock.calls.length).toBe(1);
      expect(readToolResult.mock.calls[0]?.[0]).toEqual({
        threadId: THREAD_ID,
        toolCallId: "call-one",
      });
      expect(signals.get("call-one")?.aborted).toBe(false);
      expect(signals.has("call-two")).toBe(false);

      technical?.click();
      await expect.poll(() => signals.get("call-one")?.aborted).toBe(true);
    } finally {
      await screen.unmount();
    }
  });

  it("cancels an in-flight diff read when the disclosure closes", async () => {
    let observedSignal: AbortSignal | undefined;
    const getTurnDiff = vi.fn(
      (_input: unknown, options?: { signal?: AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          observedSignal = options?.signal;
          observedSignal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const { queryClient, screen } = await mountEvidence(getTurnDiff);

    try {
      const disclosure = document.querySelector<HTMLButtonElement>(
        '[data-turn-changed-files-evidence="true"] button[aria-expanded]',
      );
      disclosure?.click();
      await expect.poll(() => observedSignal !== undefined).toBe(true);
      expect(observedSignal?.aborted).toBe(false);

      disclosure?.click();

      await expect.poll(() => observedSignal?.aborted).toBe(true);
      expect(document.querySelector('[data-turn-diff-scroll-root="true"]')).toBeNull();
      await expect.poll(() => queryClient.getQueryCache().getAll()).toHaveLength(0);
    } finally {
      await screen.unmount();
    }
  });
});
