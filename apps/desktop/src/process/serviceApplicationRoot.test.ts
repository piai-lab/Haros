import { describe, expect, it } from "vitest";

import {
  attachServiceApplicationRoot,
  resolveServiceApplicationRoot,
} from "./serviceApplicationRoot";

describe("Product Service application root", () => {
  it("selects the repository root in development and app.getAppPath in packaged builds", () => {
    expect(
      resolveServiceApplicationRoot({
        packaged: false,
        repositoryRoot: "/source/OmniMind",
        packagedAppPath: "/Applications/OmniMind.app/Contents/Resources/app.asar",
      }),
    ).toBe("/source/OmniMind");
    expect(
      resolveServiceApplicationRoot({
        packaged: true,
        repositoryRoot: "/source/OmniMind",
        packagedAppPath: "/Applications/OmniMind.app/Contents/Resources/app.asar",
      }),
    ).toBe("/Applications/OmniMind.app/Contents/Resources/app.asar");
  });

  it("attaches only an absolute stable root", () => {
    expect(
      attachServiceApplicationRoot({ OMNIMIND_HOME: "/private/product-home" }, "/app/root"),
    ).toEqual({
      OMNIMIND_HOME: "/private/product-home",
      OMNIMIND_APP_ROOT: "/app/root",
    });
    expect(() => attachServiceApplicationRoot({}, "relative/app")).toThrow("must be absolute");
  });
});
