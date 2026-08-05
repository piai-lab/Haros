import type { ProductWorkspaceId } from "@omnimind/contracts";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { pullRequestCommentMutationOptions, pullRequestQueryKeys } from "./pullRequestReactQuery";

describe("pullRequestCommentMutationOptions", () => {
  it("invalidates matching repository list scopes and detail only", async () => {
    const queryClient = new QueryClient();
    const workspaceId = "project-a" as ProductWorkspaceId;
    const otherProjectId = "project-b" as ProductWorkspaceId;
    const input = {
      workspaceId,
      repository: "acme/widgets",
      number: 42,
      body: "Looks good",
    } as const;
    const projectListKey = pullRequestQueryKeys.list({ state: "open", workspaceId });
    const allProjectsListKey = pullRequestQueryKeys.list({ state: "open", workspaceId: null });
    const unrelatedListKey = pullRequestQueryKeys.list({
      state: "open",
      workspaceId: otherProjectId,
    });
    const detailKey = pullRequestQueryKeys.detail(input);
    const diffKey = pullRequestQueryKeys.diff(input);
    queryClient.setQueryData(projectListKey, { entries: [] });
    queryClient.setQueryData(allProjectsListKey, { entries: [] });
    queryClient.setQueryData(unrelatedListKey, {
      entries: [
        {
          workspaceId: otherProjectId,
          repository: "other/repository",
          number: 7,
          isPinned: false,
        },
      ],
    });
    queryClient.setQueryData(detailKey, { state: "open" });
    queryClient.setQueryData(diffKey, {});
    const options = pullRequestCommentMutationOptions(queryClient);
    if (!options.onSettled) throw new Error("Comment onSettled hook is missing.");

    await Reflect.apply(options.onSettled, undefined, [{}, null, input, undefined, undefined]);

    expect(queryClient.getQueryState(projectListKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(allProjectsListKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(unrelatedListKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(diffKey)?.isInvalidated).toBe(false);
  });
});
