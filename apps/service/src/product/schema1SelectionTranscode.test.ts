import { describe, expect, it } from "vitest";

import {
  ProductSelectionMigrationError,
  migrateSchema1SelectedRun,
} from "./schema1SelectionTranscode";

const selected = {
  state: "selected",
  engineId: "legacy-engine-do-not-normalize",
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

const resolved = {
  engineId: selected.engineId,
  runtimeModelId: selected.runtimeModelId,
  thinking: selected.thinking,
  permissionPolicy: selected.permissionPolicy,
  enforcement: selected.enforcement,
  executionTarget: selected.executionTarget,
  packageGeneration: selected.packageGeneration,
} as const;

describe("schema-1 selected Run migration", () => {
  it("preserves the complete historical intent while omitting enforcement only from intent", () => {
    const migrated = migrateSchema1SelectedRun({
      selectedJson: JSON.stringify(selected),
      runPackageGeneration: selected.packageGeneration,
      bindingEngineId: selected.engineId,
      resolvedSelectionJson: JSON.stringify(resolved),
    });
    expect(migrated.canonicalJson).toBe(
      '{"state":"selected","engineId":"legacy-engine-do-not-normalize","runtimeChoice":{"kind":"product-model","runtimeModelId":"provider/model-exact","thinking":"high"},"permissionPolicy":"auto","executionTarget":{"kind":"local","targetRef":"/fixture/exact","observedAt":"2026-08-06T00:00:00.000Z"},"packageGeneration":"package-exact"}',
    );
    expect(migrated.canonicalJson).not.toContain("enforcement");
  });

  it("isolates a permission-policy mismatch during zero-write preflight", () => {
    expect(() =>
      migrateSchema1SelectedRun({
        selectedJson: JSON.stringify(selected),
        runPackageGeneration: selected.packageGeneration,
        resolvedSelectionJson: JSON.stringify({ ...resolved, permissionPolicy: "full-access" }),
      }),
    ).toThrow(ProductSelectionMigrationError);
  });

  it("isolates a Thinking mismatch during zero-write preflight", () => {
    expect(() =>
      migrateSchema1SelectedRun({
        selectedJson: JSON.stringify(selected),
        runPackageGeneration: selected.packageGeneration,
        resolvedSelectionJson: JSON.stringify({ ...resolved, thinking: "low" }),
      }),
    ).toThrow(ProductSelectionMigrationError);
  });

  it("rejects a historical Pi Run whose durable Package generation contradicts selection", () => {
    expect(() =>
      migrateSchema1SelectedRun({
        selectedJson: JSON.stringify(selected),
        runPackageGeneration: "different-historical-package",
        resolvedSelectionJson: JSON.stringify(resolved),
      }),
    ).toThrow(ProductSelectionMigrationError);
  });
});
