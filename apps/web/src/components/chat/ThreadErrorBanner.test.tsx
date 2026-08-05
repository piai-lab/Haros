// FILE: ThreadErrorBanner.test.tsx
// Purpose: Guards the historical thread error presentation.
// Layer: Component rendering tests
// Depends on: the banner component and React server rendering.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThreadErrorBanner } from "./ThreadErrorBanner";

describe("ThreadErrorBanner", () => {
  it("shows historical errors without advertising removed replay authority", () => {
    const markup = renderToStaticMarkup(
      <ThreadErrorBanner error="Historical execution failed." onDismiss={() => {}} />,
    );

    expect(markup).toContain("Historical execution failed.");
    expect(markup).toContain("Dismiss error");
    expect(markup).not.toContain("Unblock thread");
  });

  it("renders nothing without an error", () => {
    expect(renderToStaticMarkup(<ThreadErrorBanner error={null} />)).toBe("");
  });
});
