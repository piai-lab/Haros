import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { GitHubProjectProvisionInput } from "./githubProjectProvisioning";

const decodeInput = Schema.decodeUnknownSync(GitHubProjectProvisionInput);

describe("GitHubProjectProvisionInput", () => {
  it("preserves an unbound Project default instead of requiring a fallback Engine", () => {
    const input = decodeInput({
      operationId: "github-project-provision",
      repository: "owner/repository",
      destinationParent: "/Users/test/Developer",
      directoryName: "repository",
      commandId: "command-github-project-provision",
      projectId: "project-github-project-provision",
      defaultModelSelection: null,
      createdAt: "2026-08-12T00:00:00.000Z",
    });

    expect(input.defaultModelSelection).toBeNull();
  });
});
