import "../index.css";

import { ProjectId, SpaceId, ThreadId } from "@synara/contracts";
import { page } from "vitest/browser";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import type { Project, SidebarThreadSummary, Space } from "../types";
import { ConversationGroupPickerDialog } from "./ConversationGroupPickerDialog";

const firstGroupId = SpaceId.makeUnsafe("group-research");
const secondGroupId = SpaceId.makeUnsafe("group-release");
const project: Project = {
  id: ProjectId.makeUnsafe("project-omnimind"),
  kind: "project",
  name: "OmniMind",
  remoteName: "OmniMind",
  folderName: "OmniMind",
  localName: null,
  cwd: "/tmp/OmniMind",
  defaultModelSelection: null,
  expanded: true,
  spaceId: null,
  scripts: [],
};
const groups: Space[] = [
  {
    id: firstGroupId,
    name: "Research",
    icon: "bag",
    sortOrder: 0,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
  },
  {
    id: secondGroupId,
    name: "Release",
    icon: "bag",
    sortOrder: 1,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
  },
];
const thread: SidebarThreadSummary = {
  id: ThreadId.makeUnsafe("thread-grouped"),
  projectId: project.id,
  groupIds: [firstGroupId],
  title: "Polish conversation groups",
  modelSelection: { provider: "omnimind", model: "mimo-v2-pro" },
  interactionMode: "default",
  branch: null,
  worktreePath: null,
  session: null,
  createdAt: "2026-08-10T00:00:00.000Z",
  latestTurn: null,
  latestUserMessageAt: null,
  hasPendingApprovals: false,
  hasPendingUserInput: false,
  hasActionableProposedPlan: false,
  hasLiveTailWork: false,
};
const secondThread: SidebarThreadSummary = {
  ...thread,
  id: ThreadId.makeUnsafe("thread-second"),
  groupIds: [],
  title: "Prepare release notes",
};

describe("ConversationGroupPickerDialog", () => {
  it("assigns one conversation to multiple Groups without changing its Project", async () => {
    const onSubmitThreadGroups = vi.fn().mockResolvedValue(undefined);
    await render(
      <ConversationGroupPickerDialog
        open
        target={{ kind: "thread", thread }}
        projects={[project]}
        threads={[thread]}
        groups={groups}
        onOpenChange={vi.fn()}
        onSubmitThreadGroups={onSubmitThreadGroups}
      />,
    );

    await expect.element(page.getByRole("checkbox", { name: "Research" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("checkbox", { name: "Release" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await vi.waitFor(() =>
      expect(onSubmitThreadGroups).toHaveBeenCalledWith(thread.id, [firstGroupId, secondGroupId]),
    );
    expect(project.spaceId).toBeNull();
  });

  it("selects conversations from Projects when editing a Group", async () => {
    await render(
      <ConversationGroupPickerDialog
        open
        target={{ kind: "group", group: groups[0]! }}
        projects={[project]}
        threads={[thread]}
        groups={groups}
        onOpenChange={vi.fn()}
        onSubmitThreadGroups={vi.fn()}
      />,
    );

    await expect
      .element(page.getByRole("checkbox", { name: /Polish conversation groups/ }))
      .toHaveAttribute("aria-checked", "true");
    expect(document.body.textContent).toContain("OmniMind");
  });

  it("reports a partial multi-conversation save and restores last confirmed selections", async () => {
    const onSubmitThreadGroups = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Connection lost"));
    await render(
      <ConversationGroupPickerDialog
        open
        target={{ kind: "group", group: groups[0]! }}
        projects={[project]}
        threads={[thread, secondThread]}
        groups={groups}
        onOpenChange={vi.fn()}
        onSubmitThreadGroups={onSubmitThreadGroups}
      />,
    );

    const first = page.getByRole("checkbox", { name: /Polish conversation groups/ });
    const second = page.getByRole("checkbox", { name: /Prepare release notes/ });
    await first.click();
    await second.click();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect.element(page.getByRole("alert")).toHaveTextContent("Saved 1 of 2 changes");
    await expect.element(first).toHaveAttribute("aria-checked", "false");
    await expect.element(second).toHaveAttribute("aria-checked", "false");
  });
});
