// FILE: composingOrbPainter.test.ts
// Purpose: Locks the copied-adapted Composing/Ribbon 20px geometry to the upstream frame.
// Layer: Web unit test

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createComposingOrbFrame } from "./composingOrbPainter";

function frameDigest(timeSeconds: number): string {
  const payload = createComposingOrbFrame(timeSeconds)
    .map((dot) =>
      [dot.x, dot.y, dot.z, dot.radius, dot.white, dot.alpha]
        .map((value) => value.toFixed(9))
        .join(","),
    )
    .join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

describe("ComposingOrb official 20px geometry", () => {
  it("matches the fixed reduced-motion frame from thinking-orbs 0.3.1", () => {
    const frame = createComposingOrbFrame(0.6);
    expect(frame).toHaveLength(208);
    expect(frameDigest(0.6)).toBe(
      "60a349bd17f22ea088ad7ced02c95cbed924e72ed856ef41a766048cecf643c5",
    );
  });

  it("keeps a moving frame locked as well as the static representative", () => {
    expect(frameDigest(4.25)).toBe(
      "95dcec878073cb0e1fef51928575de0dad4a805728a829d79b6bd037dc6e2856",
    );
  });
});
