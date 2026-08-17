// FILE: PullRequestStackNavigation.browser.tsx
// Purpose: Browser regression coverage for stack ARIA, keyboard navigation, focus handoff,
//          and compact geometry at supported product widths.
// Layer: Pull request presentation test

import "../../index.css";

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import {
  PullRequestStackNavigation,
  type StackNavigationDirection,
} from "./PullRequestStackNavigation";

const stack = { number: 8, size: 3 };

function StackNavigationHarness() {
  const [selection, setSelection] = useState<{
    number: number;
    direction?: StackNavigationDirection;
  }>({ number: 42 });
  const position = selection.number - 40;
  return (
    <PullRequestStackNavigation
      key={selection.number}
      stack={{ ...stack, position }}
      previousNumber={position > 1 ? selection.number - 1 : null}
      nextNumber={position < stack.size ? selection.number + 1 : null}
      {...(selection.direction ? { preferredFocus: selection.direction } : {})}
      onSelectPullRequest={(number, direction) => setSelection({ number, direction })}
    />
  );
}

describe("PullRequestStackNavigation", () => {
  it("announces stack position and preserves a usable focus target across keyboard selection", async () => {
    await render(<StackNavigationHarness />);

    expect(page.getByRole("group", { name: "Pull request stack navigation" })).toBeVisible();
    expect(page.getByLabelText("Pull request 2 of 3 in stack")).toBeVisible();

    const previous = page.getByRole("button", { name: "Previous pull request in stack" });
    previous.element().focus();
    await userEvent.keyboard("{Enter}");

    await vi.waitFor(() => {
      expect(page.getByLabelText("Pull request 1 of 3 in stack")).toBeVisible();
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Next pull request in stack");
    });

    await userEvent.keyboard(" ");
    await vi.waitFor(() => {
      expect(page.getByLabelText("Pull request 2 of 3 in stack")).toBeVisible();
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Next pull request in stack");
    });
  });

  it("stays inside 480, 960, and 1440 pixel viewports", async () => {
    await render(<StackNavigationHarness />);
    for (const width of [480, 960, 1440]) {
      await page.viewport(width, 620);
      const rect = page
        .getByRole("group", { name: "Pull request stack navigation" })
        .element()
        .getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(window.innerWidth + 1);
      expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
    }
  });
});
