import "../../index.css";

import { ProjectId, ThreadId, type ProductRuntimeCatalog } from "@omnimind/contracts";
import { useState } from "react";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { useComposerDraftStore } from "../../composerDraftStore";
import { useProductStore } from "../../store/productStore";
import type { KanbanCard } from "./kanban.logic";
import { useKanbanDraftDispatchAdmission } from "./useKanbanDraftDispatchAdmission";

const PROJECT_ID = ProjectId.makeUnsafe("kanban-admission-project");
const THREAD_ID = ThreadId.makeUnsafe("kanban-admission-thread");
const NOW = "2026-08-05T00:00:00.000Z";
function runtimeCatalog(auth: "configured" | "missing" = "configured"): ProductRuntimeCatalog {
  return {
    engineId: "pi",
    runtimeVersion: "test",
    packageGeneration: "package-board-browser",
    models: [
      {
        id: "host-a/current",
        provider: "host-a",
        modelId: "current",
        name: "Current Host model",
        reasoning: true,
        thinkingLevels: ["medium"],
        available: true,
        auth,
      },
    ],
    capabilities: {
      ingress: "typed-native-host",
      lineage: { continue: "available", rebuild: "available" },
      controls: {
        steer: "available",
        followUp: "available",
        abort: "available",
        cancel: "unknown",
      },
      structuredQuestions: "unknown",
      packages: "unknown",
      filesRead: "unknown",
      filesWrite: "unknown",
      terminal: "unknown",
      enforcement: "unverified",
    },
    truncated: false,
  };
}

const card: KanbanCard = {
  cardId: "draft:kanban-admission-thread",
  threadId: THREAD_ID,
  projectId: PROJECT_ID,
  column: "draft",
  title: "Host task",
  provider: "pi",
  isTerminal: false,
  branch: null,
  envMode: "local",
  worktreePath: null,
  thread: null,
  draftPrompt: "Run the task",
  draftHasAttachments: false,
  sortTimestamp: Date.parse(NOW),
  timestamp: NOW,
  activeWorkStartedAt: null,
  isOptimisticDispatch: false,
};

function AdmissionHarness() {
  const resolveAdmission = useKanbanDraftDispatchAdmission();
  const [result, setResult] = useState("untested");
  return (
    <button
      type="button"
      onClick={() => {
        const admission = resolveAdmission(card);
        setResult(admission.usable ? "admitted" : admission.reason);
      }}
    >
      {result}
    </button>
  );
}

describe("Kanban board Host dispatch admission", () => {
  afterEach(async () => {
    await cleanup();
    useProductStore.setState({ runtimeCatalog: null });
    useComposerDraftStore.getState().clearDraftThread(THREAD_ID);
  });

  it("admits the board entry from Host facts", async () => {
    useProductStore.setState({ runtimeCatalog: runtimeCatalog() });
    useComposerDraftStore.getState().registerDraftThread(THREAD_ID, {
      projectId: PROJECT_ID,
      envMode: "local",
      requestedSelection: {
        state: "selected",
        engineId: "pi",
        runtimeModelId: "host-a/current",
        thinking: "medium",
        permissionPolicy: "approval-required",
        enforcement: "unverified",
        executionTarget: { kind: "local", targetRef: "/workspace", observedAt: NOW },
        packageGeneration: "package-board-browser",
      },
    });
    await render(<AdmissionHarness />);

    await page.getByRole("button", { name: "untested" }).click();
    expect(page.getByRole("button", { name: "admitted" })).toBeInTheDocument();
  });

  it("keeps the draft blocked when the Host catalog has no usable selection", async () => {
    useProductStore.setState({ runtimeCatalog: runtimeCatalog("missing") });
    useComposerDraftStore.getState().registerDraftThread(THREAD_ID, {
      projectId: PROJECT_ID,
      envMode: "local",
      requestedSelection: {
        state: "selected",
        engineId: "pi",
        runtimeModelId: "host-a/current",
        thinking: null,
        permissionPolicy: "approval-required",
        enforcement: "unverified",
        executionTarget: { kind: "local", targetRef: "/workspace", observedAt: NOW },
        packageGeneration: "package-board-browser",
      },
    });
    useComposerDraftStore.getState().setPrompt(THREAD_ID, "Preserve this draft");
    await render(<AdmissionHarness />);

    await page.getByRole("button", { name: "untested" }).click();
    expect(page.getByRole("button", { name: /authentication/ })).toBeInTheDocument();
    expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt).toBe(
      "Preserve this draft",
    );
  });
});
