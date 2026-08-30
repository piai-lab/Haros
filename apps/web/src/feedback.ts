// FILE: feedback.ts
// Purpose: Builds a privacy-bounded GitHub issue draft from visible user input and typed diagnostics.
// Layer: Web feature logic

import { APP_VERSION } from "./branding";
import { buildGitHubIssueDraftUrl, FEEDBACK_RECIPIENT_LABEL } from "./publicSurface";

export const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "Bug", lead: "I ran into a bug" },
  { value: "session", label: "Session", lead: "I hit a session problem" },
  { value: "ui", label: "UI", lead: "Something looked wrong" },
  { value: "performance", label: "Performance", lead: "Haros felt slow" },
  { value: "idea", label: "Idea", lead: "I have an idea" },
  { value: "other", label: "Other", lead: "I have some feedback" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];

export interface FeedbackThreadContext {
  engine: string | null;
  model: string | null;
  projectKind: string | null;
  environmentMode: string | null;
  runtimeMode: string | null;
  interactionMode: string | null;
  sessionStatus: string | null;
  latestTurnState: string | null;
  messageCount: number;
  activityCount: number;
  hasPendingApproval: boolean;
  hasPendingUserInput: boolean;
  hasThreadError: boolean;
}

export type FeedbackDiagnostics = FeedbackThreadContext & {
  appVersion: string;
  submittedAt: string;
  userAgent: string;
  platform: string;
  language: string;
  viewport: string;
};

export interface FeedbackSubmission {
  category: FeedbackCategory | null;
  details: string;
  summary: string;
  diagnostics: FeedbackDiagnostics;
}

export const MAX_FEEDBACK_DETAILS_LENGTH = 5_000;
export { FEEDBACK_RECIPIENT_LABEL };

const MAX_DIAGNOSTIC_COUNT = 1_000_000;
const UNCATEGORIZED_LEAD = "I have some feedback";
const DIAGNOSTIC_ENUMS = {
  projectKind: ["project", "chat", "studio"],
  environmentMode: ["local", "worktree"],
  runtimeMode: ["approval-required", "auto", "full-access"],
  interactionMode: ["default", "plan", "debug", "converge", "learn"],
  sessionStatus: ["idle", "starting", "running", "ready", "interrupted", "stopped", "error"],
  latestTurnState: ["running", "interrupted", "completed", "error"],
} as const satisfies Record<string, readonly string[]>;

function formatStateFlags(diagnostics: FeedbackThreadContext): string {
  const flags: string[] = [];
  if (diagnostics.hasThreadError) flags.push("the thread was in an error state");
  if (diagnostics.hasPendingApproval) flags.push("an approval was pending");
  if (diagnostics.hasPendingUserInput) flags.push("the agent was waiting for input");
  return flags.length > 0 ? `${flags.join(", ")}.` : "nothing pending.";
}

export function formatFeedbackSummary(input: {
  category: FeedbackCategory | null;
  diagnostics: FeedbackDiagnostics;
}): string {
  const { diagnostics } = input;
  const category = FEEDBACK_CATEGORIES.find((option) => option.value === input.category);
  const lead = category?.lead ?? UNCATEGORIZED_LEAD;
  const usageContext = diagnostics.engine
    ? diagnostics.model
      ? `, using ${diagnostics.engine} with ${diagnostics.model}`
      : `, using ${diagnostics.engine}`
    : " outside an active chat";
  const rows: Array<[string, string | null]> = [
    ["Report type", category?.label ?? "Unspecified"],
    ["App version", diagnostics.appVersion],
    ["Engine", diagnostics.engine],
    ["Model", diagnostics.model],
    ["Project kind", diagnostics.projectKind],
    ["Environment mode", diagnostics.environmentMode],
    ["Runtime mode", diagnostics.runtimeMode],
    ["Interaction mode", diagnostics.interactionMode],
    ["Session status", diagnostics.sessionStatus],
    ["Latest turn state", diagnostics.latestTurnState],
    [
      "Thread size",
      `${diagnostics.messageCount} messages, ${diagnostics.activityCount} activities`,
    ],
    ["At submission", formatStateFlags(diagnostics)],
    ["Platform", `${diagnostics.platform}, viewport ${diagnostics.viewport}`],
    ["Language", diagnostics.language],
    ["User agent", diagnostics.userAgent],
    ["Submitted at", diagnostics.submittedAt],
  ];

  return [
    `${lead} in Haros ${diagnostics.appVersion}${usageContext}.`,
    "",
    ...rows
      .filter((row): row is [string, string] => row[1] !== null && row[1] !== "")
      .map(([label, value]) => `${label}: ${value}`),
  ].join("\n");
}

export function buildFeedbackSubmission(input: {
  category: FeedbackCategory | null;
  details: string;
  context: FeedbackThreadContext;
  now?: Date;
  userAgent?: string;
  platform?: string;
  language?: string;
  viewport?: { width: number; height: number };
}): FeedbackSubmission {
  const details = input.details.trim();
  if (details.length > MAX_FEEDBACK_DETAILS_LENGTH) {
    throw new RangeError(
      `Feedback details must be ${MAX_FEEDBACK_DETAILS_LENGTH} characters or fewer.`,
    );
  }
  const viewport = input.viewport ?? { width: window.innerWidth, height: window.innerHeight };
  const diagnostics: FeedbackDiagnostics = {
    engine: input.context.engine,
    model: input.context.model,
    projectKind: input.context.projectKind,
    environmentMode: input.context.environmentMode,
    runtimeMode: input.context.runtimeMode,
    interactionMode: input.context.interactionMode,
    sessionStatus: input.context.sessionStatus,
    latestTurnState: input.context.latestTurnState,
    messageCount: input.context.messageCount,
    activityCount: input.context.activityCount,
    hasPendingApproval: input.context.hasPendingApproval,
    hasPendingUserInput: input.context.hasPendingUserInput,
    hasThreadError: input.context.hasThreadError,
    appVersion: APP_VERSION,
    submittedAt: (input.now ?? new Date()).toISOString(),
    userAgent: input.userAgent ?? navigator.userAgent,
    platform: input.platform ?? navigator.platform,
    language: input.language ?? navigator.language,
    viewport: `${viewport.width}x${viewport.height}`,
  };

  return {
    category: input.category,
    details,
    summary: formatFeedbackSummary({ category: input.category, diagnostics }),
    diagnostics,
  };
}

function requireBoundedString(
  value: unknown,
  label: string,
  maximumLength: number,
  options: { nullable?: boolean; multiline?: boolean } = {},
): string | null {
  if (options.nullable && value === null) return null;
  if (typeof value !== "string") throw new TypeError(`${label} must be a string.`);
  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw new RangeError(`${label} must be ${maximumLength} characters or fewer.`);
  }
  for (const character of normalized) {
    const code = character.codePointAt(0)!;
    if (code >= 0x7f && code <= 0x9f) {
      throw new TypeError(`${label} contains unsupported control characters.`);
    }
    if (code > 0x1f) continue;
    if (options.multiline && (code === 0x09 || code === 0x0a || code === 0x0d)) continue;
    throw new TypeError(`${label} contains unsupported control characters.`);
  }
  return normalized;
}

function validateDiagnostics(value: unknown): FeedbackDiagnostics {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Feedback diagnostics must be an object.");
  }
  const candidate = value as Record<string, unknown>;
  const nullableEnum = (key: keyof typeof DIAGNOSTIC_ENUMS): string | null => {
    const current = candidate[key];
    if (current === null) return null;
    if (typeof current !== "string" || !DIAGNOSTIC_ENUMS[key].includes(current as never)) {
      throw new TypeError(`Feedback diagnostic ${key} is invalid.`);
    }
    return current;
  };
  const count = (key: "messageCount" | "activityCount"): number => {
    const current = candidate[key];
    if (
      typeof current !== "number" ||
      !Number.isInteger(current) ||
      current < 0 ||
      current > MAX_DIAGNOSTIC_COUNT
    ) {
      throw new TypeError(`Feedback diagnostic ${key} must be a bounded non-negative integer.`);
    }
    return current;
  };
  const flag = (key: "hasPendingApproval" | "hasPendingUserInput" | "hasThreadError"): boolean => {
    if (typeof candidate[key] !== "boolean") {
      throw new TypeError(`Feedback diagnostic ${key} must be a boolean.`);
    }
    return candidate[key];
  };
  const submittedAt = requireBoundedString(candidate.submittedAt, "Submitted at", 40)!;
  if (Number.isNaN(Date.parse(submittedAt))) {
    throw new TypeError("Feedback diagnostic submittedAt is invalid.");
  }
  const viewport = requireBoundedString(candidate.viewport, "Viewport", 24)!;
  if (!/^\d{1,5}x\d{1,5}$/u.test(viewport)) {
    throw new TypeError("Feedback diagnostic viewport is invalid.");
  }

  return {
    engine: requireBoundedString(candidate.engine, "Engine", 128, { nullable: true }),
    model: requireBoundedString(candidate.model, "Model", 256, { nullable: true }),
    projectKind: nullableEnum("projectKind"),
    environmentMode: nullableEnum("environmentMode"),
    runtimeMode: nullableEnum("runtimeMode"),
    interactionMode: nullableEnum("interactionMode"),
    sessionStatus: nullableEnum("sessionStatus"),
    latestTurnState: nullableEnum("latestTurnState"),
    messageCount: count("messageCount"),
    activityCount: count("activityCount"),
    hasPendingApproval: flag("hasPendingApproval"),
    hasPendingUserInput: flag("hasPendingUserInput"),
    hasThreadError: flag("hasThreadError"),
    appVersion: requireBoundedString(candidate.appVersion, "App version", 64)!,
    submittedAt,
    userAgent: requireBoundedString(candidate.userAgent, "User agent", 1_024)!,
    platform: requireBoundedString(candidate.platform, "Platform", 128)!,
    language: requireBoundedString(candidate.language, "Language", 64)!,
    viewport,
  };
}

export function buildFeedbackIssueUrl(submission: FeedbackSubmission): string {
  const category = FEEDBACK_CATEGORIES.find((item) => item.value === submission.category);
  if (submission.category !== null && !category) {
    throw new TypeError("Feedback category is invalid.");
  }
  const details = requireBoundedString(
    (submission as unknown as Record<string, unknown>).details,
    "Feedback details",
    MAX_FEEDBACK_DETAILS_LENGTH,
    { multiline: true },
  )!;
  const diagnostics = validateDiagnostics(
    (submission as unknown as Record<string, unknown>).diagnostics,
  );
  const label = category?.label ?? "Feedback";
  const firstLine = details.split(/\r?\n/u, 1)[0]?.trim() || "Haros feedback";
  const title = `[${label}] ${firstLine}`.slice(0, 120);
  const body = [
    "## Feedback",
    "",
    details,
    "",
    "<details>",
    "<summary>Haros diagnostics</summary>",
    "",
    formatFeedbackSummary({ category: submission.category, diagnostics }),
    "",
    "</details>",
    "",
    "> This draft was created locally by Haros. Review it before submitting to GitHub.",
  ].join("\n");
  const labels =
    submission.category === "idea" ? ["enhancement", "needs-triage"] : ["needs-triage"];
  if (submission.category === "bug" || submission.category === "session") labels.unshift("bug");
  return buildGitHubIssueDraftUrl({ title, body, labels });
}
