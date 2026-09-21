import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { useProjectDialogStore } from "../projectDialogStore";
import { ChatIndexRouteView } from "../routes/_chat.index";

const fixture = vi.hoisted(() => ({
  state: {
    threadsHydrated: true,
    projects: [] as Array<{ id: string; kind: string }>,
    threadIds: [],
    sidebarThreadSummaryById: {},
  },
}));
vi.mock("../store", () => ({
  useStore: (select: (state: unknown) => unknown) => select(fixture.state),
  EMPTY_THREAD_IDS: [],
}));
vi.mock("../hooks/useHandleNewThread", () => ({
  useHandleNewThread: () => ({ handleNewThread: vi.fn() }),
}));
vi.mock("../composerDraftStore", () => ({
  useComposerDraftStore: (select: (state: unknown) => unknown) =>
    select({ draftThreadsByThreadId: {} }),
}));
vi.mock("../components/RestoreOrCreateChatRoute", () => ({
  RestoreOrCreateChatRoute: () => <div>Restore existing work</div>,
}));

afterEach(() => {
  fixture.state.threadsHydrated = true;
  fixture.state.projects = [];
  useProjectDialogStore.getState().setOpen(false);
});

it("opens the shared project dialog instead of retrying on an empty Agent home", async () => {
  await render(<ChatIndexRouteView />);
  await expect.element(page.getByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  await page.getByRole("button", { name: "Add project", exact: false }).click();
  expect(useProjectDialogStore.getState().isOpen).toBe(true);
});

it("waits for hydration before offering to add a project", async () => {
  fixture.state.threadsHydrated = false;
  await render(<ChatIndexRouteView />);
  await expect.element(page.getByText("Restore existing work")).toBeVisible();
  await expect.element(page.getByRole("button")).not.toBeInTheDocument();
});

it("restores work when an Agent project exists", async () => {
  fixture.state.projects = [{ id: "project-1", kind: "project" }];
  await render(<ChatIndexRouteView />);
  await expect.element(page.getByText("Restore existing work")).toBeVisible();
});
