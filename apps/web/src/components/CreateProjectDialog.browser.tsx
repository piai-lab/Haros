import "../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { CreateProjectDialog } from "./CreateProjectDialog";

describe("CreateProjectDialog", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("submits the typed folder through the create-if-missing System flow", async () => {
    const onSubmit = vi.fn(async () => undefined);

    await render(
      <CreateProjectDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await page.getByLabelText("Project folder path").fill("~/Projects/new-project");
    await page.getByRole("button", { name: "Create project", exact: true }).click();

    expect(onSubmit).toHaveBeenCalledWith({
      workspaceRoot: "~/Projects/new-project",
      createIfMissing: true,
    });
  });
});
