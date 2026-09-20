import type { EngineKind, ServerEngineStatus } from "@harnessos/contracts";

export const ONBOARDING_STEPS = ["welcome", "tour", "engines", "theme", "project", "done"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function nextOnboardingStep(step: OnboardingStep): OnboardingStep {
  const index = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[Math.min(index + 1, ONBOARDING_STEPS.length - 1)] ?? "done";
}

export function previousOnboardingStep(step: OnboardingStep): OnboardingStep {
  const index = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[Math.max(index - 1, 0)] ?? "welcome";
}

export function isOnboardingSetupStep(step: OnboardingStep): boolean {
  return step !== "welcome" && step !== "tour";
}

export interface LocalOnboardingCompletion {
  readonly completedAt: string | null;
  readonly installationKey: string | null;
}

export function resolveLocalOnboardingCompletion(
  local: LocalOnboardingCompletion,
  currentInstallationKey: string | null,
): string | null {
  if (local.completedAt === null) return null;
  if (currentInstallationKey === null || local.installationKey === null) {
    return null;
  }
  return local.installationKey === currentInstallationKey ? local.completedAt : null;
}

export type OnboardingGate = "pending" | "show" | "hidden";

export interface OnboardingGateInputs {
  readonly installationKeyStatus: "pending" | "success" | "error";
  readonly threadsHydrated: boolean;
  readonly settingsSettled: boolean;
  readonly projectCount: number;
  readonly serverCompletedAt: string | null;
  readonly localCompletedAt: string | null;
}

export function resolveOnboardingGate(input: OnboardingGateInputs): OnboardingGate {
  if (
    input.installationKeyStatus === "pending" ||
    !input.threadsHydrated ||
    !input.settingsSettled
  ) {
    return "pending";
  }
  if (input.installationKeyStatus === "error") return "hidden";
  const completed = input.serverCompletedAt !== null || input.localCompletedAt !== null;
  return !completed && input.projectCount === 0 ? "show" : "hidden";
}

export interface OnboardingReconcileInputs {
  readonly threadsHydrated: boolean;
  readonly settingsAvailable: boolean;
  readonly projectCount: number;
  readonly serverCompletedAt: string | null;
  readonly localCompletedAt: string | null;
  readonly now: string;
}

export function resolveOnboardingCompletionToReconcile(
  input: OnboardingReconcileInputs,
): string | null {
  if (!input.threadsHydrated || !input.settingsAvailable || input.serverCompletedAt !== null) {
    return null;
  }
  if (input.localCompletedAt !== null) {
    return input.localCompletedAt;
  }
  return input.projectCount > 0 ? input.now : null;
}

export type EngineSetupState = "connected" | "needs-sign-in" | "not-installed" | "disabled";

export function classifyEngineSetup(input: {
  readonly status: Pick<ServerEngineStatus, "available" | "authStatus"> | null | undefined;
  readonly disabled: boolean;
}): EngineSetupState {
  if (input.disabled) return "disabled";
  if (!input.status || !input.status.available) return "not-installed";
  return input.status.authStatus === "unauthenticated" ? "needs-sign-in" : "connected";
}

export interface EngineSetupSummary {
  readonly enabled: number;
  readonly connected: number;
  readonly needsSignIn: number;
  readonly notInstalled: number;
}

export function summarizeEngineSetup(
  states: ReadonlyArray<{ readonly engine: EngineKind; readonly state: EngineSetupState }>,
): EngineSetupSummary {
  let enabled = 0;
  let connected = 0;
  let needsSignIn = 0;
  let notInstalled = 0;
  for (const entry of states) {
    if (entry.state !== "disabled") enabled += 1;
    if (entry.state === "connected") connected += 1;
    if (entry.state === "needs-sign-in") needsSignIn += 1;
    if (entry.state === "not-installed") notInstalled += 1;
  }
  return { enabled, connected, needsSignIn, notInstalled };
}

export function toggleSelection<T>(selection: ReadonlySet<T>, id: T): ReadonlySet<T> {
  const next = new Set(selection);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}
