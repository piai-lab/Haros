import { EngineSessionStartInput, ThreadId } from "@harnessos/contracts";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { ENGINE_DESCRIPTORS } from "./engineMetadata";
import {
  productSurfaceToEngineWorkSurface,
  projectKindToEngineSessionAdmission,
  projectKindToProductSurface,
} from "./productSurface";

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

  it("derives one complete Engine Session admission", () => {
    expect(projectKindToEngineSessionAdmission("project", "/repo")).toEqual({
      productSurface: "agent",
      workSurface: "agent",
      projectContextRoot: "/repo",
    });
    expect(projectKindToEngineSessionAdmission("chat", "/ignored")).toEqual({
      productSurface: "chat",
      workSurface: "chat",
      projectContextRoot: null,
    });
    expect(projectKindToEngineSessionAdmission("studio", "/ignored")).toEqual({
      productSurface: "studio",
      workSurface: "chat",
      projectContextRoot: null,
    });
  });

  it("admits all 3 Product surfaces through all 10 canonical Engines", () => {
    const surfaces = [
      ["project", "/repo"],
      ["chat", null],
      ["studio", null],
    ] as const;

    expect(ENGINE_DESCRIPTORS).toHaveLength(10);
    for (const descriptor of ENGINE_DESCRIPTORS) {
      for (const [kind, expectedRoot] of surfaces) {
        const admission = projectKindToEngineSessionAdmission(kind, "/repo");
        const parsed = Schema.decodeUnknownSync(EngineSessionStartInput)({
          threadId: ThreadId.makeUnsafe(`${descriptor.kind}-${kind}`),
          engine: descriptor.kind,
          admission,
          runtimeMode: "full-access",
        });

        expect(parsed.engine).toBe(descriptor.kind);
        expect(parsed.admission.productSurface).toBe(projectKindToProductSurface(kind));
        expect(parsed.admission.projectContextRoot).toBe(expectedRoot);
      }
    }
  });
});
