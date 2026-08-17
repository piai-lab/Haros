import { describe, expect, it } from "vitest";

import type {
  PullRequestComment,
  PullRequestCommit,
  PullRequestDetailInput,
} from "@omnimind/contracts";

import type { RightDockPane } from "~/rightDockStore.logic";

import {
  buildPullRequestTimelineEvents,
  describePullRequestState,
  pullRequestDetailInputFromPane,
  pullRequestDetailInputKey,
  pullRequestPaneTabLabel,
  pullRequestMergeExpectation,
  pullRequestMergeExpectationsEqual,
  pullRequestStackNavigation,
  stripHtmlComments,
} from "./pullRequestDetail.logic";

const stackEntries = [1, 2, 3].map((position) => ({
  position,
  number: 40 + position,
  title: `Layer ${position}`,
  url: `https://github.com/acme/app/pull/${40 + position}`,
  headBranch: `layer-${position}`,
  baseBranch: position === 1 ? "main" : `layer-${position - 1}`,
  state: "open" as const,
  isDraft: false,
  mergeability: "mergeable" as const,
  mergeStateStatus: "CLEAN",
}));

function makeCommit(overrides: Partial<PullRequestCommit> = {}): PullRequestCommit {
  return {
    oid: "abcdef1234567890",
    messageHeadline: "Fix the widget",
    messageBody: "",
    committedDate: "2026-07-02T10:00:00Z",
    authors: [],
    ...overrides,
  };
}

function makeComment(overrides: Partial<PullRequestComment> = {}): PullRequestComment {
  return {
    id: "comment-1",
    kind: "issue-comment",
    author: { login: "reviewer", name: null, avatarUrl: null, url: null },
    body: "Looks good",
    createdAt: "2026-07-03T10:00:00Z",
    updatedAt: null,
    url: null,
    path: null,
    reviewState: null,
    ...overrides,
  };
}

function makeTimelineSource() {
  return {
    createdAt: "2026-07-01T10:00:00Z",
    author: { login: "author", name: null, avatarUrl: null, url: null },
    commits: [makeCommit()],
    comments: [makeComment()],
    mergedAt: null,
    closedAt: null,
  };
}

describe("pullRequestDetailInputKey", () => {
  it("builds a stable projectId:repository#number identity", () => {
    const input: PullRequestDetailInput = {
      projectId: "project-1" as PullRequestDetailInput["projectId"],
      repository: "acme/widgets",
      number: 350,
    };
    expect(pullRequestDetailInputKey(input)).toBe("project-1:acme/widgets#350");
  });
});

describe("pullRequestPaneTabLabel", () => {
  it("formats the shared tab chip label", () => {
    expect(pullRequestPaneTabLabel(350)).toBe("PR #350");
  });
});

describe("pullRequestStackNavigation", () => {
  const detail = {
    number: 42,
    stackMetadataIncomplete: false,
    stack: {
      number: 8,
      size: 3,
      position: 2,
      baseBranch: "main",
      entries: stackEntries,
    },
  };

  it("derives adjacent PR numbers from the authoritative position order", () => {
    expect(pullRequestStackNavigation(detail)).toEqual({
      position: 2,
      size: 3,
      previousNumber: 41,
      nextNumber: 43,
    });
  });

  it("fails closed for incomplete, count, position, or selected-PR mismatches", () => {
    expect(pullRequestStackNavigation({ ...detail, stackMetadataIncomplete: true })).toBeNull();
    expect(
      pullRequestStackNavigation({
        ...detail,
        stack: { ...detail.stack, size: 4 },
      }),
    ).toBeNull();
    expect(
      pullRequestStackNavigation({
        ...detail,
        stack: {
          ...detail.stack,
          entries: [stackEntries[0]!, { ...stackEntries[1]!, position: 3 }, stackEntries[2]!],
        },
      }),
    ).toBeNull();
    expect(pullRequestStackNavigation({ ...detail, number: 99 })).toBeNull();
  });
});

describe("pullRequestMergeExpectation", () => {
  const standalone = {
    number: 42,
    baseBranch: "main",
    stack: null,
    stackMetadataIncomplete: false,
  } as const;

  it("distinguishes confirmed standalone detail from incomplete stack metadata", () => {
    expect(pullRequestMergeExpectation(standalone)).toEqual({
      kind: "standalone",
      baseBranch: "main",
    });
    expect(
      pullRequestMergeExpectation({ ...standalone, stackMetadataIncomplete: true }),
    ).toBeNull();
  });

  it("projects only the exact bottom-to-selected stack targets", () => {
    const expectation = pullRequestMergeExpectation({
      ...standalone,
      stack: {
        number: 8,
        size: 3,
        position: 2,
        baseBranch: "main",
        entries: stackEntries,
      },
    });
    expect(expectation).toEqual({
      kind: "stack",
      stackNumber: 8,
      stackSize: 3,
      selectedPosition: 2,
      baseBranch: "main",
      targetPullRequestNumbers: [41, 42],
    });
    if (!expectation || expectation.kind !== "stack") throw new Error("Expected stack merge");
    expect(pullRequestMergeExpectationsEqual(expectation, expectation)).toBe(true);
    expect(
      pullRequestMergeExpectationsEqual(expectation, {
        ...expectation,
        targetPullRequestNumbers: [42, 41],
      }),
    ).toBe(false);
  });
});

describe("describePullRequestState", () => {
  it("describes each state, with draft only applying to open pull requests", () => {
    expect(describePullRequestState("open", true)).toBe("Draft");
    expect(describePullRequestState("open", false)).toBe("Ready for review");
    expect(describePullRequestState("merged", true)).toBe("Merged");
    expect(describePullRequestState("closed", false)).toBe("Closed");
  });

  it("renders the same states in simplified Chinese", () => {
    expect(describePullRequestState("open", true, "zh-CN")).toBe("草稿");
    expect(describePullRequestState("open", false, "zh-CN")).toBe("等待评审");
    expect(describePullRequestState("merged", false, "zh-CN")).toBe("已合并");
  });
});

describe("buildPullRequestTimelineEvents", () => {
  it("orders created, commit, and comment events chronologically", () => {
    const events = buildPullRequestTimelineEvents(makeTimelineSource());
    expect(events.map((event) => event.id)).toEqual(["created", "abcdef1234567890", "comment-1"]);
  });

  it("titles review comments differently from issue comments", () => {
    const events = buildPullRequestTimelineEvents({
      ...makeTimelineSource(),
      comments: [
        makeComment({ kind: "review" }),
        makeComment({ id: "comment-2", kind: "review-comment" }),
      ],
    });
    const titles = events.map((event) => event.title);
    expect(titles).toContain("reviewer reviewed");
    expect(titles).toContain("reviewer commented");
  });

  it("falls back to placeholders for missing authors and empty commit messages", () => {
    const events = buildPullRequestTimelineEvents({
      ...makeTimelineSource(),
      author: null,
      commits: [makeCommit({ messageHeadline: "" })],
      comments: [makeComment({ author: null })],
    });
    expect(events[0]?.title).toBe("Someone opened this pull request");
    expect(events[1]?.body).toBe("No commit message.");
    expect(events[2]?.title).toBe("Someone commented");
  });

  it("appends a merged event and suppresses the closed event when both timestamps exist", () => {
    const events = buildPullRequestTimelineEvents({
      ...makeTimelineSource(),
      mergedAt: "2026-07-04T10:00:00Z",
      closedAt: "2026-07-04T10:00:00Z",
    });
    const ids = events.map((event) => event.id);
    expect(ids).toContain("merged");
    expect(ids).not.toContain("closed");
    expect(events.at(-1)?.title).toBe("Pull request merged");
  });

  it("appends a closed event for a closed-but-unmerged pull request", () => {
    const events = buildPullRequestTimelineEvents({
      ...makeTimelineSource(),
      closedAt: "2026-07-04T10:00:00Z",
    });
    expect(events.at(-1)?.title).toBe("Pull request closed");
  });

  it("localizes product-authored timeline framing without changing raw identities", () => {
    const events = buildPullRequestTimelineEvents(makeTimelineSource(), "zh-CN");
    expect(events[0]?.title).toBe("author 开启了此拉取请求");
    expect(events[1]?.title).toBe("提交 abcdef1");
    expect(events[2]?.title).toBe("reviewer 发表了评论");
  });
});

describe("pullRequestDetailInputFromPane", () => {
  const basePane: RightDockPane = {
    id: "pane-1",
    kind: "pullRequest",
    threadId: null,
    diffTurnId: null,
    diffFilePath: null,
    filePath: null,
    pullRequestProjectId: "project-1" as RightDockPane["pullRequestProjectId"],
    pullRequestRepository: "acme/widgets",
    pullRequestNumber: 350,
    pullRequestInitialTab: null,
  };

  it("builds the detail input from a fully-populated pull request pane", () => {
    expect(pullRequestDetailInputFromPane(basePane)).toEqual({
      projectId: "project-1",
      repository: "acme/widgets",
      number: 350,
    });
  });

  it("returns null for empty pull request panes and other pane kinds", () => {
    expect(pullRequestDetailInputFromPane({ ...basePane, pullRequestNumber: null })).toBeNull();
    expect(pullRequestDetailInputFromPane({ ...basePane, kind: "diff" })).toBeNull();
  });
});

describe("stripHtmlComments", () => {
  it("removes PR template boilerplate comments", () => {
    expect(stripHtmlComments("<!-- ⚠️ READ BEFORE OPENING -->\n## Summary\nReal content.")).toBe(
      "## Summary\nReal content.",
    );
  });

  it("removes multi-line comments anywhere in the body", () => {
    expect(stripHtmlComments("Before\n<!--\nline one\nline two\n-->\nAfter")).toBe(
      "Before\n\nAfter",
    );
  });

  it("keeps comments inside fenced code blocks", () => {
    const markdown = "Intro\n```html\n<!-- keep me -->\n```\n<!-- drop me -->";
    expect(stripHtmlComments(markdown)).toBe("Intro\n```html\n<!-- keep me -->\n```");
  });

  it("passes plain markdown through untouched", () => {
    expect(stripHtmlComments("## Summary\n- item")).toBe("## Summary\n- item");
  });
});
