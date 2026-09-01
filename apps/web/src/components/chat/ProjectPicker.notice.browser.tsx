// FILE: ProjectPicker.notice.browser.tsx
// Purpose: Verifies continuity boundaries remain visible while choosing an Agent project.
// Layer: Browser UI test

import "../../index.css";

import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { ProjectPicker } from "./ProjectPicker";

describe("ProjectPicker continuity notice", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps the non-continuation boundary visible while the destination is selected", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const notice =
      "Creates a new Agent task. Only visible messages and recoverable attachments are copied; running tools, temporary state, and the native Engine Session are not continued.";
    const screen = await render(
      <ProjectPicker
        selectionMode="project"
        notice={notice}
        renderTrigger={<button aria-label="Send to Agent">Send to Agent</button>}
      />,
      { container: host },
    );
    try {
      await page.getByLabelText("Send to Agent").click();
      await expect
        .poll(() => document.querySelector("[data-project-picker-notice='true']")?.textContent)
        .toBe(notice);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });
});
