import "../../index.css";

import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { I18nProvider } from "../../i18n";
import { TimelineWorkEntryRow } from "./TimelineWorkEntryRow";

function CanonicalAskRow() {
  return (
    <I18nProvider>
      <TimelineWorkEntryRow
        workEntry={{
          id: "canonical-user-input",
          createdAt: "2026-08-25T00:00:00.000Z",
          label: "User input requested",
          tone: "info",
          activityKind: "user-input.requested",
          // Conflicting Tool hints must not displace the canonical identity.
          toolName: "ask_user",
          itemType: "mcp_tool_call",
        }}
        chatMetaFontSizePx={12}
        textFontSizePx={13}
        density="compact"
        onImageExpand={() => {}}
        markdownCwd={undefined}
        timestampFormat="24-hour"
      />
    </I18nProvider>
  );
}

function createHost(width: number): HTMLDivElement {
  const host = document.createElement("div");
  host.style.cssText = `width:${width}px;max-width:100%;overflow:auto;padding:8px;`;
  document.body.append(host);
  return host;
}

describe("canonical User Input Timeline projection", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
    document.body.innerHTML = "";
  });

  it.each([
    { theme: "light", width: 480 },
    { theme: "dark", width: 430 },
  ])("keeps bubbles quiet, 14px, and overflow-free in $theme at $width px", async (input) => {
    document.documentElement.classList.toggle("dark", input.theme === "dark");
    const host = createHost(input.width);
    const screen = await render(<CanonicalAskRow />, { container: host });

    const icon = host.querySelector<SVGElement>('[data-central-icon-name="bubbles"]');
    expect(icon).not.toBeNull();
    expect(icon?.getBoundingClientRect().width).toBe(14);
    expect(icon?.getBoundingClientRect().height).toBe(14);
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
    expect(host.querySelector('[data-central-icon-name="hammer"]')).toBeNull();

    await screen.unmount();
  });
});
