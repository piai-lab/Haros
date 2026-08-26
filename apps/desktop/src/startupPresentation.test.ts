import { describe, expect, it } from "vitest";

import { makeStartupPresentationOwner } from "./startupPresentation";

describe("startup presentation owner", () => {
  it("grants one full presentation and keeps later windows brief", () => {
    const owner = makeStartupPresentationOwner();
    expect(owner.claim()).toBe("full");
    expect(owner.claim()).toBe("brief");
    expect(owner.claim()).toBe("brief");
  });
});
