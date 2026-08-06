import { describe, expect, it } from "vitest";

import {
  migrateSchema1AutomationPermissionSnapshot,
  migrateSchema1AutomationSelection,
} from "./automationSelectionTranscode";

const selected = {
  state: "selected",
  engineId: "legacy-engine-exact",
  runtimeModelId: "provider/model-exact",
  thinking: "high",
  packageGeneration: "package-exact",
  permissionPolicy: "auto",
  enforcement: "engine-enforced",
  executionTarget: {
    kind: "local",
    targetRef: "/fixture/exact",
    observedAt: "2026-08-06T00:00:00.000Z",
  },
} as const;

describe("schema-1 Automation selection migration", () => {
  it("transcodes a definition selection without normalizing historical intent", () => {
    const migrated = migrateSchema1AutomationSelection(JSON.stringify(selected));

    expect(migrated.canonicalJson).toBe(
      '{"state":"selected","engineId":"legacy-engine-exact","runtimeChoice":{"kind":"product-model","runtimeModelId":"provider/model-exact","thinking":"high"},"permissionPolicy":"auto","executionTarget":{"kind":"local","targetRef":"/fixture/exact","observedAt":"2026-08-06T00:00:00.000Z"},"packageGeneration":"package-exact"}',
    );
    expect(migrated.canonicalJson).not.toContain("enforcement");
  });

  it("makes legacy unavailable intent explicitly Pi-scoped without selecting a fallback", () => {
    const migrated = migrateSchema1AutomationSelection(
      JSON.stringify({
        state: "unavailable",
        reason: "auth-missing",
        requestedRuntimeModelId: "provider/model-wanted",
        permissionPolicy: "approval-required",
        enforcement: "unverified",
        executionTarget: null,
      }),
    );

    expect(migrated.value).toEqual({
      state: "unavailable",
      requestedEngineId: "pi",
      requestedRuntimeChoice: {
        kind: "product-model",
        runtimeModelId: "provider/model-wanted",
        thinking: null,
      },
      reason: "auth-required",
      permissionPolicy: "approval-required",
      executionTarget: null,
      packageGeneration: null,
    });
  });

  it("replaces only the nested Run selection and preserves permission semantics", () => {
    const migrated = migrateSchema1AutomationPermissionSnapshot(
      JSON.stringify({
        settingsRevision: 9,
        requestedSelection: selected,
        completionPolicyVersion: 4,
        iterationNumber: 3,
        worktreeMode: "worktree",
        allowedCapabilities: ["send-turn", "create-worktree"],
        createdAt: "2026-08-06T00:00:01.000Z",
      }),
    );

    expect(migrated.value).toMatchObject({
      settingsRevision: 9,
      completionPolicyVersion: 4,
      iterationNumber: 3,
      worktreeMode: "worktree",
      allowedCapabilities: ["send-turn", "create-worktree"],
      createdAt: "2026-08-06T00:00:01.000Z",
      requestedSelection: {
        state: "selected",
        engineId: "legacy-engine-exact",
        permissionPolicy: "auto",
      },
    });
    expect(migrated.canonicalJson).not.toContain("enforcement");
  });

  it("rejects malformed definition and permission-snapshot rows during preflight", () => {
    expect(() => migrateSchema1AutomationSelection('{"state":"selected"}')).toThrow();
    expect(() =>
      migrateSchema1AutomationPermissionSnapshot(
        JSON.stringify({ requestedSelection: selected, worktreeMode: "always" }),
      ),
    ).toThrow();
  });
});
