import type { ProductExecutionTarget } from "@omnimind/contracts";
import { Schema } from "effect";

type JsonObject = Record<string, unknown>;

export type ProductSelectedRuntimeV2 = {
  readonly state: "selected";
  readonly engineId: string;
  readonly runtimeChoice: {
    readonly kind: "product-model";
    readonly runtimeModelId: string;
    readonly thinking: string | null;
  };
  readonly permissionPolicy: "approval-required" | "auto" | "full-access";
  readonly executionTarget: ProductExecutionTarget | null;
  readonly packageGeneration: string;
};

export class ProductSelectionMigrationError extends Error {
  readonly code = "PRODUCT_SELECTION_MIGRATION_INCONSISTENT";
}

const decodeJson = <A, I>(schema: Schema.Codec<A, I>, source: string): A =>
  Schema.decodeSync(Schema.fromJsonString(schema))(source);

const Schema1ExecutionTarget = Schema.NullOr(
  Schema.Struct({
    kind: Schema.Literals(["local", "remote"]),
    targetRef: Schema.String,
    observedAt: Schema.String,
  }),
);
const Schema1SelectedRuntime = Schema.Struct({
  state: Schema.Literal("selected"),
  engineId: Schema.String,
  runtimeModelId: Schema.String,
  thinking: Schema.NullOr(Schema.String),
  packageGeneration: Schema.String,
  permissionPolicy: Schema.Literals(["approval-required", "auto", "full-access"]),
  enforcement: Schema.Literals(["host-enforced", "engine-enforced", "mixed", "unverified"]),
  executionTarget: Schema1ExecutionTarget,
});
const Schema1ResolvedSelection = Schema.Struct({
  engineId: Schema.String,
  runtimeModelId: Schema.String,
  thinking: Schema.NullOr(Schema.String),
  permissionPolicy: Schema.Literals(["approval-required", "auto", "full-access"]),
  enforcement: Schema.Literals(["host-enforced", "engine-enforced", "mixed", "unverified"]),
  executionTarget: Schema1ExecutionTarget,
  packageGeneration: Schema.String,
});

const sameTarget = (
  left: ProductExecutionTarget | null,
  right: ProductExecutionTarget | null,
): boolean => JSON.stringify(left) === JSON.stringify(right);

/**
 * Startup-only schema-1 transform for authoritative historical Run selection bytes. It is kept
 * separate from normal Product reads so v1 never becomes a runtime compatibility path.
 */
export function migrateSchema1SelectedRun(input: {
  readonly selectedJson: string;
  readonly runPackageGeneration: string;
  readonly bindingEngineId?: string | null;
  readonly resolvedSelectionJson?: string | null;
}): { readonly value: ProductSelectedRuntimeV2; readonly canonicalJson: string } {
  const selected = decodeJson(Schema1SelectedRuntime, input.selectedJson);
  if (selected.packageGeneration !== input.runPackageGeneration) {
    throw new ProductSelectionMigrationError("Run Package generation contradicts selected intent.");
  }
  if (input.bindingEngineId != null && input.bindingEngineId !== selected.engineId) {
    throw new ProductSelectionMigrationError("Engine binding contradicts selected intent.");
  }
  if (input.resolvedSelectionJson != null) {
    const resolved = decodeJson(Schema1ResolvedSelection, input.resolvedSelectionJson);
    if (resolved.engineId !== selected.engineId) {
      throw new ProductSelectionMigrationError("Resolved Engine contradicts selected intent.");
    }
    if (resolved.runtimeModelId !== selected.runtimeModelId) {
      throw new ProductSelectionMigrationError("Resolved Model contradicts selected intent.");
    }
    if (resolved.thinking !== selected.thinking) {
      throw new ProductSelectionMigrationError("Resolved Thinking contradicts selected intent.");
    }
    if (resolved.permissionPolicy !== selected.permissionPolicy) {
      throw new ProductSelectionMigrationError(
        "Resolved permission policy contradicts selected intent.",
      );
    }
    if (resolved.enforcement !== selected.enforcement) {
      throw new ProductSelectionMigrationError("Resolved enforcement contradicts selected intent.");
    }
    if (!sameTarget(resolved.executionTarget, selected.executionTarget)) {
      throw new ProductSelectionMigrationError("Resolved target contradicts selected intent.");
    }
    if (resolved.packageGeneration !== selected.packageGeneration) {
      throw new ProductSelectionMigrationError(
        "Resolved Package generation contradicts selected intent.",
      );
    }
  }
  const value: ProductSelectedRuntimeV2 = {
    state: "selected",
    engineId: selected.engineId,
    runtimeChoice: {
      kind: "product-model",
      runtimeModelId: selected.runtimeModelId,
      thinking: selected.thinking,
    },
    permissionPolicy: selected.permissionPolicy,
    executionTarget: selected.executionTarget,
    packageGeneration: selected.packageGeneration,
  };
  return { value, canonicalJson: JSON.stringify(value) };
}

export function parseCanonicalJsonObject(source: string): JsonObject {
  const value: unknown = JSON.parse(source);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProductSelectionMigrationError("Migrated selection is not a JSON object.");
  }
  return value as JsonObject;
}
