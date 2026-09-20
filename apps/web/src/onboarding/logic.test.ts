import { describe, expect, it } from "vitest";

import {
  ONBOARDING_STEPS,
  classifyEngineSetup,
  isOnboardingSetupStep,
  nextOnboardingStep,
  previousOnboardingStep,
  resolveLocalOnboardingCompletion,
  resolveOnboardingCompletionToReconcile,
  resolveOnboardingGate,
  summarizeEngineSetup,
  toggleSelection,
} from "./logic";

const COMPLETED_AT = "2026-09-07T00:00:00.000Z";
const NOW = "2026-09-08T00:00:00.000Z";

const GATE_BASE = {
  installationKeyStatus: "success",
  threadsHydrated: true,
  settingsSettled: true,
  projectCount: 0,
  serverCompletedAt: null,
  localCompletedAt: null,
} as const;

const RECONCILE_BASE = {
  threadsHydrated: true,
  settingsAvailable: true,
  projectCount: 0,
  serverCompletedAt: null,
  localCompletedAt: null,
  now: NOW,
} as const;

describe("onboarding steps", () => {
  it("runs intro → tour → engines → theme → project → done", () => {
    expect(ONBOARDING_STEPS).toEqual(["welcome", "tour", "engines", "theme", "project", "done"]);
  });

  it("clamps navigation at both ends", () => {
    expect(nextOnboardingStep("welcome")).toBe("tour");
    expect(nextOnboardingStep("done")).toBe("done");
    expect(previousOnboardingStep("tour")).toBe("welcome");
    expect(previousOnboardingStep("welcome")).toBe("welcome");
  });

  it("treats everything after the tour as a setup step", () => {
    expect(isOnboardingSetupStep("welcome")).toBe(false);
    expect(isOnboardingSetupStep("tour")).toBe(false);
    expect(isOnboardingSetupStep("engines")).toBe(true);
    expect(isOnboardingSetupStep("done")).toBe(true);
  });
});

describe("resolveOnboardingGate", () => {
  it("stays pending until projects and settings have loaded", () => {
    expect(resolveOnboardingGate({ ...GATE_BASE, threadsHydrated: false })).toBe("pending");
    expect(resolveOnboardingGate({ ...GATE_BASE, settingsSettled: false })).toBe("pending");
  });

  it("waits for the installation identity before offering first-run completion", () => {
    expect(resolveOnboardingGate({ ...GATE_BASE, installationKeyStatus: "pending" })).toBe(
      "pending",
    );
  });

  it("leaves the app usable after config failure and offers the tour after recovery", () => {
    expect(resolveOnboardingGate({ ...GATE_BASE, installationKeyStatus: "error" })).toBe("hidden");
    expect(resolveOnboardingGate(GATE_BASE)).toBe("show");
  });

  it("shows on a fresh install with no ordinary projects", () => {
    expect(resolveOnboardingGate(GATE_BASE)).toBe("show");
  });

  it("hides once any ordinary project exists", () => {
    expect(resolveOnboardingGate({ ...GATE_BASE, projectCount: 1 })).toBe("hidden");
  });

  it("hides once either completion marker exists", () => {
    expect(resolveOnboardingGate({ ...GATE_BASE, serverCompletedAt: COMPLETED_AT })).toBe("hidden");
    expect(resolveOnboardingGate({ ...GATE_BASE, localCompletedAt: COMPLETED_AT })).toBe("hidden");
  });
});

describe("resolveLocalOnboardingCompletion", () => {
  it("only counts a local marker for the current installation", () => {
    expect(
      resolveLocalOnboardingCompletion({ completedAt: COMPLETED_AT, installationKey: "/a" }, "/a"),
    ).toBe(COMPLETED_AT);
    expect(
      resolveLocalOnboardingCompletion({ completedAt: COMPLETED_AT, installationKey: "/a" }, "/b"),
    ).toBeNull();
  });
});

describe("resolveOnboardingCompletionToReconcile", () => {
  it("writes a local completion back to the server", () => {
    expect(
      resolveOnboardingCompletionToReconcile({
        ...RECONCILE_BASE,
        localCompletedAt: COMPLETED_AT,
      }),
    ).toBe(COMPLETED_AT);
  });

  it("exempts an existing install without a marker", () => {
    expect(resolveOnboardingCompletionToReconcile({ ...RECONCILE_BASE, projectCount: 1 })).toBe(
      NOW,
    );
  });

  it("does not invent completion for a true fresh install", () => {
    expect(resolveOnboardingCompletionToReconcile(RECONCILE_BASE)).toBeNull();
  });
});

describe("classifyEngineSetup", () => {
  it("classifies disabled, missing, unauthenticated, and usable engines", () => {
    expect(classifyEngineSetup({ status: null, disabled: true })).toBe("disabled");
    expect(
      classifyEngineSetup({ status: { available: false, authStatus: "unknown" }, disabled: false }),
    ).toBe("not-installed");
    expect(
      classifyEngineSetup({
        status: { available: true, authStatus: "unauthenticated" },
        disabled: false,
      }),
    ).toBe("needs-sign-in");
    expect(
      classifyEngineSetup({ status: { available: true, authStatus: "unknown" }, disabled: false }),
    ).toBe("connected");
  });
});

describe("summarizeEngineSetup", () => {
  it("counts enabled engines separately from connected ones", () => {
    expect(
      summarizeEngineSetup([
        { engine: "codex", state: "connected" },
        { engine: "claude", state: "needs-sign-in" },
        { engine: "pi", state: "disabled" },
      ]),
    ).toEqual({ enabled: 2, connected: 1, needsSignIn: 1, notInstalled: 0 });
  });
});

describe("toggleSelection", () => {
  it("adds and removes members without mutating the original set", () => {
    const original = new Set(["codex"]);
    const added = toggleSelection(original, "claude");
    expect([...added]).toEqual(["codex", "claude"]);
    expect([...original]).toEqual(["codex"]);
    expect([...toggleSelection(added, "codex")]).toEqual(["claude"]);
  });
});
