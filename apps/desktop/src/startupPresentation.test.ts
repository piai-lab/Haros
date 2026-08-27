import { describe, expect, it } from "vitest";

import { makeStartupPresentationOwner } from "./startupPresentation";

describe("startup presentation owner", () => {
  it("grants one full presentation and skips it for later windows in the same process", () => {
    const owner = makeStartupPresentationOwner();
    expect(owner.claim()).toBe("full");
    expect(owner.claim()).toBe("none");
    expect(owner.claim()).toBe("none");
  });
});
