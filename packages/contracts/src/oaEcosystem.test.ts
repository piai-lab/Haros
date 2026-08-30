import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  OAEcosystemInstallInput,
  OAEcosystemReloadInput,
  OAEcosystemReloadResult,
  OAEcosystemResourceToggleInput,
} from "./oaEcosystem";

const decodeInstallInput = Schema.decodeUnknownSync(OAEcosystemInstallInput);

describe("Haros ecosystem contracts", () => {
  it("accepts canonical scoped npm package identities", () => {
    expect(decodeInstallInput({ source: "npm:@scope/package@1.2.3" })).toEqual({
      source: "npm:@scope/package@1.2.3",
    });
  });

  it.each([
    "git:https://github.com/example/public-package.git",
    "git:https://gitlab.com/example/public-package.git",
    "git:https://codeberg.org/example/public-package.git",
    "git:ssh://token@example.invalid/owner/repo.git",
    "git:https://token@example.invalid/owner/repo.git",
    "git:https://example.invalid/owner/repo.git?token=secret",
    "git:https://example.invalid/owner/repo.git#revision",
    "git:https://127.0.0.1.nip.io/owner/repo.git",
    "git:https://169.254.169.254.sslip.io/owner/repo.git",
    "git:https://localhost/owner/repo.git",
    "git:https://127.0.0.1/owner/repo.git",
    "git:https://[::1]/owner/repo.git",
    "npm:file:///private/local-package",
    "npm:https://example.invalid/archive.tgz",
    "/private/local-package",
  ])("rejects non-public package input before it can cross the command boundary: %s", (source) => {
    expect(() => decodeInstallInput({ source })).toThrow();
  });

  it.each(["/private/skill.md", "../skill.md", "skills/../skill.md", "skills\\skill.md"])(
    "rejects non-relative or traversing resource paths: %s",
    (resourcePath) => {
      expect(() =>
        Schema.decodeUnknownSync(OAEcosystemResourceToggleInput)({
          packageId: "a".repeat(64),
          resourceType: "skills",
          resourcePath,
          enabled: true,
        }),
      ).toThrow();
    },
  );

  it("requires an exact thread and exposes bounded active-session reload states", () => {
    expect(Schema.decodeUnknownSync(OAEcosystemReloadInput)({ threadId: "thread-active" })).toEqual(
      { threadId: "thread-active" },
    );
    expect(() => Schema.decodeUnknownSync(OAEcosystemReloadInput)({})).toThrow();
    for (const state of ["reloaded", "no_active_session", "different_engine", "busy"] as const) {
      expect(Schema.decodeUnknownSync(OAEcosystemReloadResult)({ state })).toEqual({ state });
    }
  });
});
