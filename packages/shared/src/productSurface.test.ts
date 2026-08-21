import { describe, expect, it } from "vitest";

import { productSurfaceToProviderWorkSurface, projectKindToProductSurface } from "./productSurface";

describe("productSurface", () => {
  it.each([
    ["project", "agent"],
    ["chat", "chat"],
    ["studio", "studio"],
  ] as const)("maps Project kind %s to %s", (kind, expected) => {
    expect(projectKindToProductSurface(kind)).toBe(expected);
  });

  it("keeps Studio and Chat outside the Agent provider trust surface", () => {
    expect(productSurfaceToProviderWorkSurface("agent")).toBe("agent");
    expect(productSurfaceToProviderWorkSurface("chat")).toBe("chat");
    expect(productSurfaceToProviderWorkSurface("studio")).toBe("chat");
  });

  it("treats legacy shells without a kind as Projects", () => {
    expect(projectKindToProductSurface(undefined)).toBe("agent");
  });
});
