// FILE: EnvironmentProjectInstructionsSection.browser.tsx
// Purpose: Browser-level regression tests for project instructions autosave behavior.
// Layer: Vitest browser tests

import "../../../index.css";

import { ProjectId } from "@omnimind/contracts";
import { useState } from "react";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { EnvironmentProjectInstructionsSection } from "./EnvironmentProjectInstructionsSection";

const PROJECT_A = ProjectId.makeUnsafe("project-instructions-a");
const PROJECT_B = ProjectId.makeUnsafe("project-instructions-b");

describe("EnvironmentProjectInstructionsSection", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("keeps the existing 500ms autosave boundary", async () => {
    const onInstructionsChange = vi.fn();
    await render(
      <EnvironmentProjectInstructionsSection
        projectId={PROJECT_A}
        instructions="Saved"
        threadNotes=""
        canCopyToThreadNotes
        onInstructionsChange={onInstructionsChange}
        onCopyToThreadNotes={vi.fn()}
      />,
    );
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea).not.toBeNull();
    vi.useFakeTimers();
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    valueSetter?.call(textarea, "Draft after debounce");
    textarea?.dispatchEvent(new InputEvent("input", { bubbles: true }));

    await vi.advanceTimersByTimeAsync(499);
    expect(onInstructionsChange).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onInstructionsChange).toHaveBeenCalledWith(PROJECT_A, "Draft after debounce");
  });

  it("flushes pending edits on blur and unmount", async () => {
    const onBlurChange = vi.fn();
    const mounted = await render(
      <EnvironmentProjectInstructionsSection
        projectId={PROJECT_A}
        instructions="Saved"
        threadNotes=""
        canCopyToThreadNotes
        onInstructionsChange={onBlurChange}
        onCopyToThreadNotes={vi.fn()}
      />,
    );
    await page
      .getByPlaceholder("Architecture notes, conventions, and repository links…")
      .fill("Blur draft");
    document.querySelector<HTMLTextAreaElement>("textarea")?.blur();
    expect(onBlurChange).toHaveBeenCalledWith(PROJECT_A, "Blur draft");
    await mounted.unmount();

    const onUnmountChange = vi.fn();
    const remounted = await render(
      <EnvironmentProjectInstructionsSection
        projectId={PROJECT_A}
        instructions="Saved"
        threadNotes=""
        canCopyToThreadNotes
        onInstructionsChange={onUnmountChange}
        onCopyToThreadNotes={vi.fn()}
      />,
    );
    await page
      .getByPlaceholder("Architecture notes, conventions, and repository links…")
      .fill("Unmount draft");
    await remounted.unmount();
    expect(onUnmountChange).toHaveBeenCalledWith(PROJECT_A, "Unmount draft");
  });

  it("flushes pending edits to the original project before switching projects", async () => {
    const onInstructionsChange = vi.fn();

    function ProjectSwitchHarness() {
      const [projectId, setProjectId] = useState<ProjectId>(PROJECT_A);
      return (
        <>
          <button type="button" onClick={() => setProjectId(PROJECT_B)}>
            Switch project
          </button>
          <EnvironmentProjectInstructionsSection
            projectId={projectId}
            instructions={
              projectId === PROJECT_A ? "Saved instructions for A" : "Saved instructions for B"
            }
            threadNotes=""
            canCopyToThreadNotes
            onInstructionsChange={onInstructionsChange}
            onCopyToThreadNotes={vi.fn()}
          />
        </>
      );
    }

    await render(<ProjectSwitchHarness />);

    await page
      .getByPlaceholder("Architecture notes, conventions, and repository links…")
      .fill("Draft for A");
    await page.getByRole("button", { name: "Switch project" }).click();

    expect(onInstructionsChange).toHaveBeenCalledWith(PROJECT_A, "Draft for A");
    expect(onInstructionsChange).not.toHaveBeenCalledWith(PROJECT_B, "Draft for A");
    expect(document.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe(
      "Saved instructions for B",
    );
  });
});
