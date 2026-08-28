// FILE: feedback.ts
// Purpose: Owns feedback categories, privacy-safe diagnostics, and delivery.
// Layer: Web feature logic
// Depends on: The separately configured Public Surface feedback boundary.

import { APP_VERSION } from "./branding";
import {
  FEEDBACK_RECIPIENT_LABEL,
  resolveFeedbackEndpoint,
  type FeedbackSurfaceActivation,
} from "./publicSurface";

/**
 * `lead` opens the reported summary in the reporter's voice, so the category is
 * readable as a sentence rather than as an enum value.
 */
export const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "Bug", lead: "I ran into a bug" },
  { value: "session", label: "Session", lead: "I hit a session problem" },
  { value: "ui", label: "UI", lead: "Something looked wrong" },
  { value: "performance", label: "Performance", lead: "HarnessOS felt slow" },
  { value: "idea", label: "Idea", lead: "I have an idea" },
  { value: "other", label: "Other", lead: "I have some feedback" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];

const UNCATEGORIZED_LEAD = "I have some feedback";

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
  contactEmail?: string | null;
  /** Reader-facing rendering of `diagnostics`; the reporter never sees or edits it. */
  summary: string;
  diagnostics: FeedbackDiagnostics;
}

const FEEDBACK_REQUEST_TIMEOUT_MS = 20_000;
export const MAX_FEEDBACK_DETAILS_LENGTH = 5_000;
export const MAX_FEEDBACK_EMAIL_LENGTH = 254;
export const MAX_FEEDBACK_BODY_BYTES = 64 * 1_024;
export { FEEDBACK_RECIPIENT_LABEL };

const MAX_DIAGNOSTIC_COUNT = 1_000_000;

function hasUnsupportedControlCharacter(value: string, multiline: boolean): boolean {
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (code >= 0x7f && code <= 0x9f) return true;
    if (code > 0x1f) continue;
    if (multiline && (code === 0x09 || code === 0x0a || code === 0x0d)) continue;
    return true;
  }
  return false;
}

const DIAGNOSTIC_ENUMS = {
  projectKind: ["project", "chat", "studio"],
  environmentMode: ["local", "worktree"],
  runtimeMode: ["approval-required", "auto", "full-access"],
  interactionMode: ["default", "plan", "debug", "converge", "learn"],
  sessionStatus: ["idle", "starting", "running", "ready", "interrupted", "stopped", "error"],
  latestTurnState: ["running", "interrupted", "completed", "error"],
} as const satisfies Record<string, readonly string[]>;

export class FeedbackDeliveryUnavailableError extends Error {
  constructor() {
    super("Feedback delivery is not available in this build. Your draft has been kept.");
    this.name = "FeedbackDeliveryUnavailableError";
  }
}

export class FeedbackDeliveryCancelledError extends Error {
  constructor() {
    super("Feedback sending was cancelled. Your draft has been kept.");
    this.name = "FeedbackDeliveryCancelledError";
  }
}

function formatStateFlags(diagnostics: FeedbackThreadContext): string {
  const flags: string[] = [];
  if (diagnostics.hasThreadError) flags.push("the thread was in an error state");
  if (diagnostics.hasPendingApproval) flags.push("an approval was pending");
  if (diagnostics.hasPendingUserInput) flags.push("the agent was waiting for input");
  return flags.length > 0 ? `${flags.join(", ")}.` : "nothing pending.";
}

/**
 * Renders diagnostics as the report a maintainer reads first, since incoming
 * feedback arrives without any context about what the reporter was doing.
 */
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

  const detailLines = rows
    .filter((row): row is [string, string] => row[1] !== null && row[1] !== "")
    .map(([label, value]) => `${label}: ${value}`);

  return [
    `${lead} in HarnessOS ${diagnostics.appVersion}${usageContext}.`,
    "",
    ...detailLines,
  ].join("\n");
}

export function buildFeedbackSubmission(input: {
  category: FeedbackCategory | null;
  details: string;
  contactEmail?: string;
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
  const contactEmail = input.contactEmail?.trim().toLowerCase() || null;
  if (
    contactEmail &&
    (contactEmail.length > MAX_FEEDBACK_EMAIL_LENGTH ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(contactEmail))
  ) {
    throw new TypeError("Contact email is invalid.");
  }
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
    contactEmail,
    summary: formatFeedbackSummary({
      category: input.category,
      diagnostics,
    }),
    diagnostics,
  };
}

export interface FeedbackDeliveryOptions extends FeedbackSurfaceActivation {
  readonly fetchImplementation?: typeof fetch;
  /** Lets the visible dialog cancel the one in-flight request without discarding its draft. */
  readonly signal?: AbortSignal;
}

export function isFeedbackDeliveryAvailable(options: FeedbackDeliveryOptions = {}): boolean {
  return resolveFeedbackEndpoint(options) !== null;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireBoundedString(
  value: unknown,
  label: string,
  maximumLength: number,
  options: { nullable?: boolean; multiline?: boolean } = {},
): string | null {
  if (options.nullable && (value === null || value === undefined)) return null;
  if (typeof value !== "string") throw new TypeError(`${label} must be a string.`);
  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw new RangeError(`${label} must be ${maximumLength} characters or fewer.`);
  }
  if (hasUnsupportedControlCharacter(normalized, options.multiline === true)) {
    throw new TypeError(`${label} contains unsupported control characters.`);
  }
  return normalized;
}

function requireNullableEnum<K extends keyof typeof DIAGNOSTIC_ENUMS>(
  value: unknown,
  label: K,
): string | null {
  if (value === null) return null;
  if (
    typeof value !== "string" ||
    !(DIAGNOSTIC_ENUMS[label] as readonly string[]).includes(value)
  ) {
    throw new TypeError(`Feedback diagnostic ${label} is invalid.`);
  }
  return value;
}

function requireCount(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_DIAGNOSTIC_COUNT
  ) {
    throw new TypeError(`Feedback diagnostic ${label} must be a bounded non-negative integer.`);
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(`Feedback diagnostic ${label} must be a boolean.`);
  }
  return value;
}

function normalizeFeedbackDiagnostics(value: unknown): FeedbackDiagnostics {
  const candidate = requireRecord(value, "Feedback diagnostics");
  const submittedAt = requireBoundedString(candidate.submittedAt, "Submitted at", 40);
  if (!submittedAt || Number.isNaN(Date.parse(submittedAt))) {
    throw new TypeError("Feedback diagnostic submittedAt is invalid.");
  }
  const viewport = requireBoundedString(candidate.viewport, "Viewport", 24);
  if (!viewport || !/^\d{1,5}x\d{1,5}$/u.test(viewport)) {
    throw new TypeError("Feedback diagnostic viewport is invalid.");
  }

  return {
    engine: requireBoundedString(candidate.engine, "Engine", 128, { nullable: true }),
    model: requireBoundedString(candidate.model, "Model", 256, { nullable: true }),
    projectKind: requireNullableEnum(candidate.projectKind, "projectKind"),
    environmentMode: requireNullableEnum(candidate.environmentMode, "environmentMode"),
    runtimeMode: requireNullableEnum(candidate.runtimeMode, "runtimeMode"),
    interactionMode: requireNullableEnum(candidate.interactionMode, "interactionMode"),
    sessionStatus: requireNullableEnum(candidate.sessionStatus, "sessionStatus"),
    latestTurnState: requireNullableEnum(candidate.latestTurnState, "latestTurnState"),
    messageCount: requireCount(candidate.messageCount, "messageCount"),
    activityCount: requireCount(candidate.activityCount, "activityCount"),
    hasPendingApproval: requireBoolean(candidate.hasPendingApproval, "hasPendingApproval"),
    hasPendingUserInput: requireBoolean(candidate.hasPendingUserInput, "hasPendingUserInput"),
    hasThreadError: requireBoolean(candidate.hasThreadError, "hasThreadError"),
    appVersion: requireBoundedString(candidate.appVersion, "App version", 64)!,
    submittedAt,
    userAgent: requireBoundedString(candidate.userAgent, "User agent", 1_024)!,
    platform: requireBoundedString(candidate.platform, "Platform", 128)!,
    language: requireBoundedString(candidate.language, "Language", 64)!,
    viewport,
  };
}

function serializeFeedbackSubmission(submission: FeedbackSubmission): string {
  const validCategory = FEEDBACK_CATEGORIES.some(
    (candidate) => candidate.value === submission.category,
  );
  if (submission.category !== null && !validCategory) {
    throw new TypeError("Feedback category is invalid.");
  }
  const category = submission.category;
  const details = requireBoundedString(
    (submission as unknown as Record<string, unknown>).details,
    "Feedback details",
    MAX_FEEDBACK_DETAILS_LENGTH,
    { multiline: true },
  )!;
  const contactEmail = requireBoundedString(
    (submission as unknown as Record<string, unknown>).contactEmail,
    "Contact email",
    MAX_FEEDBACK_EMAIL_LENGTH,
    { nullable: true },
  );
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(contactEmail)) {
    throw new TypeError("Contact email is invalid.");
  }
  if (details.length > MAX_FEEDBACK_DETAILS_LENGTH) {
    throw new RangeError(
      `Feedback details must be ${MAX_FEEDBACK_DETAILS_LENGTH} characters or fewer.`,
    );
  }

  const diagnostics = normalizeFeedbackDiagnostics(
    (submission as unknown as Record<string, unknown>).diagnostics,
  );
  const body = JSON.stringify({
    source: "desktop",
    category,
    details,
    contactEmail: contactEmail?.toLowerCase() ?? null,
    summary: formatFeedbackSummary({ category, diagnostics }),
    diagnostics,
  });
  if (new TextEncoder().encode(body).byteLength > MAX_FEEDBACK_BODY_BYTES) {
    throw new RangeError(`Feedback request must be ${MAX_FEEDBACK_BODY_BYTES} bytes or fewer.`);
  }
  return body;
}

export async function submitFeedback(
  submission: FeedbackSubmission,
  options: FeedbackDeliveryOptions = {},
): Promise<void> {
  const endpoint = resolveFeedbackEndpoint(options);
  if (!endpoint) throw new FeedbackDeliveryUnavailableError();
  const body = serializeFeedbackSubmission(submission);

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const controller = new AbortController();
  let timedOut = false;
  const cancelFromCaller = () => controller.abort();
  if (options.signal?.aborted) throw new FeedbackDeliveryCancelledError();
  options.signal?.addEventListener("abort", cancelFromCaller, { once: true });
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, FEEDBACK_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImplementation(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-harnessos-feedback": "1",
      },
      body,
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
    });
    if (response.redirected) {
      throw new Error("Feedback delivery refused a redirected response.");
    }
    if (response.ok) return;

    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
    const message = typeof payload?.error === "string" ? payload.error.trim() : "";
    throw new Error(message || `Feedback could not be sent (${response.status}).`);
  } catch (error) {
    if (controller.signal.aborted && options.signal?.aborted && !timedOut) {
      throw new FeedbackDeliveryCancelledError();
    }
    if (controller.signal.aborted && timedOut) {
      throw new Error("Feedback delivery timed out. Please try again.", { cause: error });
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancelFromCaller);
  }
}
