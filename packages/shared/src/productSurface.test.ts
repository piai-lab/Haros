import { describe, expect, it } from "vitest";

import { productSurfaceToEngineWorkSurface, projectKindToProductSurface } from "./productSurface";

describe("productSurface", () => {
  it.each([
    ["project", "agent"],
    ["chat", "chat"],
    ["studio", "studio"],
  ] as const)("maps Project kind %s to %s", (kind, expected) => {
    expect(projectKindToProductSurface(kind)).toBe(expected);
  });

  it("keeps Studio and Chat outside the Agent provider trust surface", () => {
    expect(productSurfaceToEngineWorkSurface("agent")).toBe("agent");
    expect(productSurfaceToEngineWorkSurface("chat")).toBe("chat");
    expect(productSurfaceToEngineWorkSurface("studio")).toBe("chat");
  });

  it("treats legacy shells without a kind as Projects", () => {
    expect(projectKindToProductSurface(undefined)).toBe("agent");
  });
});
