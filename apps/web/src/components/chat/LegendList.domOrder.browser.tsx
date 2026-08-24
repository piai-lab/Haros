// FILE: LegendList.domOrder.browser.tsx
// Purpose: Locks the narrow immediate DOM-order seam used by the accessible Timeline.
// Layer: Vitest browser tests

import { LegendList } from "@legendapp/list/react";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

function ListHarness(props: { immediate?: boolean; items: readonly string[] }) {
  return (
    <LegendList
      data={props.items}
      keyExtractor={(item) => item}
      renderItem={({ item }) => (
        <button
          type="button"
          data-dom-order-item={item}
          style={{ display: "block", height: 40, width: "100%" }}
        >
          {item}
        </button>
      )}
      estimatedItemSize={40}
      getFixedItemSize={() => 40}
      recycleItems={false}
      {...(props.immediate ? { immediateDOMOrder: true } : {})}
    />
  );
}

function itemOrder(): string[] {
  return [...document.querySelectorAll<HTMLElement>("[data-dom-order-item]")].map(
    (element) => element.dataset.domOrderItem ?? "",
  );
}

function createHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.style.cssText = "width:400px;height:300px;overflow:auto;";
  document.body.append(host);
  return host;
}

describe("LegendList DOM-order seam", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps the donor default deferred when immediate DOM ordering is not enabled", async () => {
    const host = createHost();
    const screen = await render(<ListHarness items={["answer"]} />, { container: host });

    try {
      await expect.poll(itemOrder).toEqual(["answer"]);
      await screen.rerender(<ListHarness items={["narration", "answer"]} />);
      expect(itemOrder()).toEqual(["answer", "narration"]);
      await expect.poll(itemOrder, { timeout: 1_000 }).toEqual(["narration", "answer"]);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("orders opted-in rows before the next task and preserves focus while moving a container", async () => {
    const host = createHost();
    const screen = await render(<ListHarness immediate items={["answer"]} />, {
      container: host,
    });

    try {
      await expect.poll(itemOrder).toEqual(["answer"]);
      const answer = document.querySelector<HTMLButtonElement>(
        '[data-dom-order-item="answer"]',
      );
      expect(answer).not.toBeNull();
      answer!.focus();
      expect(document.activeElement).toBe(answer);

      await screen.rerender(<ListHarness immediate items={["narration", "answer"]} />);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      expect(itemOrder()).toEqual(["narration", "answer"]);
      expect(document.activeElement).toBe(answer);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });
});
