import "../../index.css";

import { ProjectId, ThreadId, type ProductRuntimeCatalog } from "@omnimind/contracts";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { makeProductModelRuntimeCatalog } from "../../testProductRuntimeCatalog";

const taskCreate = vi.hoisted(() => ({
  send: vi.fn(async () => ({
    threadId: ThreadId.makeUnsafe("created-kanban-task"),
    result: { kind: "dispatched" as const },
  })),
  draft: vi.fn(() => ThreadId.makeUnsafe("draft-kanban-task")),
}));

vi.mock("~/lib/kanbanTaskCreate", () => ({
  createAndSendKanbanTask: taskCreate.send,
  createKanbanDraftTask: taskCreate.draft,
}));

import { useKanbanTaskSubmit } from "./useKanbanTaskSubmit";

const PROJECT_ID = ProjectId.makeUnsafe("submit-browser-project");
const SCRATCH_ID = ThreadId.makeUnsafe("submit-browser-scratch");
function catalog(auth: "configured" | "missing" = "configured"): ProductRuntimeCatalog {
  return makeProductModelRuntimeCatalog([
    {
      id: "host-a/current",
      provider: "host-a",
      modelId: "current",
      name: "Current Host model",
      reasoning: true,
      thinkingLevels: ["max"],
      available: true,
      auth,
    },
  ]);
}

function SubmitHarness(props: { readonly runtimeCatalog: ProductRuntimeCatalog | null }) {
  const submit = useKanbanTaskSubmit({
    selectedProjectId: PROJECT_ID,
    hasSendableContent: true,
    requestedSelection: {
      state: "selected",
      engineId: "pi",
      runtimeChoice: { kind: "product-model", runtimeModelId: "host-a/current", thinking: "max" },
      packageGeneration: "package-submit-browser",
      permissionPolicy: "approval-required",
      executionTarget: null,
    },
    runtimeCatalog: props.runtimeCatalog,
    taskPreview: "Host task",
    trimmedPrompt: "Host task",
    scratchThreadId: SCRATCH_ID,
    envMode: "local",
    sendAsDraft: false,
    isPreparingImages: false,
    waitForPendingImages: async () => undefined,
    onOpenChange: vi.fn(),
  });
  return (
    <button type="button" disabled={!submit.canCreate} onClick={() => void submit.handleCreate()}>
      Send now
    </button>
  );
}

async function renderHarness(runtimeCatalog: ProductRuntimeCatalog | null) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <SubmitHarness runtimeCatalog={runtimeCatalog} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("Kanban New Task Host submit gate", () => {
  afterEach(async () => {
    await cleanup();
    taskCreate.send.mockClear();
    taskCreate.draft.mockClear();
  });

  it("sends through the real hook when Host is configured", async () => {
    await renderHarness(catalog());

    const button = page.getByRole("button", { name: "Send now" });
    expect(button).toBeEnabled();
    await button.click();
    expect(taskCreate.send).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedSelection: {
          state: "selected",
          engineId: "pi",
          runtimeChoice: {
            kind: "product-model",
            runtimeModelId: "host-a/current",
            thinking: "max",
          },
          packageGeneration: "package-submit-browser",
          permissionPolicy: "approval-required",
          executionTarget: null,
        },
      }),
    );
  });

  it.each([[null], [catalog("missing")]] as const)(
    "does not submit when current Host facts are unusable",
    async (runtimeCatalog) => {
      await renderHarness(runtimeCatalog);
      expect(page.getByRole("button", { name: "Send now" })).toBeDisabled();
      expect(taskCreate.send).not.toHaveBeenCalled();
    },
  );
});
