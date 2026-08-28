import "../index.css";

import { page } from "vitest/browser";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { GroupEditorDialog } from "./GroupEditorDialog";

describe("GroupEditorDialog", () => {
  it("suggests a bilingual icon and submits it through the existing Space owner", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    await render(
      <GroupEditorDialog open existingNames={[]} onOpenChange={vi.fn()} onSubmit={onSubmit} />,
    );

    await page.getByRole("textbox", { name: "Name" }).fill("研究计划");
    await expect
      .element(page.getByRole("radio", { name: "Research" }))
      .toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Create group" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: "研究计划", icon: "lab" }),
    );
  });

  it("keeps an explicitly selected icon while the name changes", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    await render(
      <GroupEditorDialog open existingNames={[]} onOpenChange={vi.fn()} onSubmit={onSubmit} />,
    );

    await page.getByRole("radio", { name: "Favorite" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("Work");
    await page.getByRole("button", { name: "Create group" }).click();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Work", icon: "star" }));
  });
});
