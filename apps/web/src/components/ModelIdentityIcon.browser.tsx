import "../index.css";

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ModelIdentityIcon } from "./ModelIdentityIcon";

describe("ModelIdentityIcon", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
    document.body.innerHTML = "";
  });

  it.each([
    ["light", 24],
    ["light", 620],
    ["dark", 24],
    ["dark", 620],
  ] as const)(
    "keeps Kimi at its requested size in a %s surface %ipx wide",
    async (theme, width) => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      const host = document.createElement("div");
      host.style.width = `${width}px`;
      document.body.append(host);
      const screen = await render(
        <ModelIdentityIcon
          selection={{ provider: "opencode", model: "kimi-for-coding/k3" }}
          className="size-5"
        />,
        { container: host },
      );

      try {
        const carrier = host.querySelector<HTMLElement>(
          '[data-model-service-icon-render="contained-image"]',
        );
        const image = carrier?.querySelector("img");
        await vi.waitFor(() => expect(image?.complete).toBe(true));

        expect(carrier?.getBoundingClientRect().width).toBe(20);
        expect(carrier?.getBoundingClientRect().height).toBe(20);
        expect(getComputedStyle(carrier!).backgroundColor).toBe("rgb(17, 24, 39)");
        expect(getComputedStyle(image!).objectFit).toBe("contain");
        expect(image?.getBoundingClientRect().width).toBeCloseTo(14.4, 1);
        expect(image?.getBoundingClientRect().height).toBeCloseTo(14.4, 1);
        expect(image?.naturalWidth).toBeGreaterThan(0);
      } finally {
        await screen.unmount();
        host.remove();
      }
    },
  );
});
