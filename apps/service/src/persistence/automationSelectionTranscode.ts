import { AutomationPermissionSnapshot, type ProductExecutionTarget } from "@omnimind/contracts";
import { Schema } from "effect";

type ProductRuntimeChoiceV2 =
  | {
      readonly kind: "product-model";
      readonly runtimeModelId: string;
      readonly thinking: string | null;
    }
  | { readonly kind: "engine-session-current" };

export type ProductRequestedSelectionV2 =
  | {
      readonly state: "selected";
      readonly engineId: string;
      readonly runtimeChoice: ProductRuntimeChoiceV2;
      readonly permissionPolicy: "approval-required" | "auto" | "full-access";
      readonly executionTarget: ProductExecutionTarget | null;
      readonly packageGeneration: string | null;
    }
  | {
      readonly state: "unavailable";
      readonly requestedEngineId: string;
      readonly requestedRuntimeChoice: ProductRuntimeChoiceV2 | null;
      readonly reason:
        | "model-not-selected"
        | "model-unavailable"
        | "thinking-unsupported"
        | "auth-required";
      readonly permissionPolicy: "approval-required" | "auto" | "full-access";
      readonly executionTarget: ProductExecutionTarget | null;
      readonly packageGeneration: string | null;
    };

export type AutomationPermissionSnapshotV2 = Omit<
  typeof AutomationPermissionSnapshot.Type,
  "requestedSelection"
> & {
  readonly requestedSelection: ProductRequestedSelectionV2;
};

const decodeJson = <A, I>(schema: Schema.Codec<A, I>, source: string): A =>
  Schema.decodeSync(Schema.fromJsonString(schema))(source);

const Schema1SelectionPolicy = {
  permissionPolicy: Schema.Literals(["approval-required", "auto", "full-access"]),
  enforcement: Schema.Literals(["host-enforced", "engine-enforced", "mixed", "unverified"]),
  executionTarget: Schema.NullOr(
    Schema.Struct({
      kind: Schema.Literals(["local", "remote"]),
      targetRef: Schema.String,
      observedAt: Schema.String,
    }),
  ),
};
const Schema1RequestedSelection = Schema.Union([
  Schema.Struct({
    state: Schema.Literal("selected"),
    engineId: Schema.String,
    runtimeModelId: Schema.String,
    thinking: Schema.NullOr(Schema.String),
    packageGeneration: Schema.String,
    ...Schema1SelectionPolicy,
  }),
  Schema.Struct({
    state: Schema.Literal("unavailable"),
    reason: Schema.Literals([
      "catalog-unavailable",
      "model-not-selected",
      "model-unavailable",
      "auth-missing",
      "thinking-unsupported",
    ]),
    requestedRuntimeModelId: Schema.NullOr(Schema.String),
    ...Schema1SelectionPolicy,
  }),
]);
const Schema1AutomationPermissionSnapshot = Schema.Struct({
  settingsRevision: Schema.optional(Schema.Number),
  requestedSelection: Schema1RequestedSelection,
  completionPolicyVersion: Schema.optional(Schema.Number),
  iterationNumber: Schema.optional(Schema.Number),
  worktreeMode: Schema.Literals(["auto", "local", "worktree"]),
  allowedCapabilities: Schema.Array(
    Schema.Literals(["send-turn", "create-worktree", "full-access"]),
  ),
  createdAt: Schema.String,
});

/**
 * Schema-1-only transform for the two Automation persistence embeddings. Normal repository reads
 * must use the v2 contract after startup; this is deliberately not a dual-read adapter.
 */
export function migrateSchema1AutomationSelection(source: string): {
  readonly value: ProductRequestedSelectionV2;
  readonly canonicalJson: string;
} {
  const selection = decodeJson(Schema1RequestedSelection, source);
  const value: ProductRequestedSelectionV2 =
    selection.state === "selected"
      ? {
          state: "selected",
          engineId: selection.engineId,
          runtimeChoice: {
            kind: "product-model",
            runtimeModelId: selection.runtimeModelId,
            thinking: selection.thinking,
          },
          permissionPolicy: selection.permissionPolicy,
          executionTarget: selection.executionTarget,
          packageGeneration: selection.packageGeneration,
        }
      : {
          state: "unavailable",
          requestedEngineId: "pi",
          requestedRuntimeChoice:
            selection.requestedRuntimeModelId === null
              ? null
              : {
                  kind: "product-model",
                  runtimeModelId: selection.requestedRuntimeModelId,
                  thinking: null,
                },
          reason:
            selection.reason === "auth-missing"
              ? "auth-required"
              : selection.reason === "catalog-unavailable"
                ? "model-unavailable"
                : selection.reason,
          permissionPolicy: selection.permissionPolicy,
          executionTarget: selection.executionTarget,
          packageGeneration: null,
        };
  return { value, canonicalJson: JSON.stringify(value) };
}

export function migrateSchema1AutomationPermissionSnapshot(source: string): {
  readonly value: AutomationPermissionSnapshotV2;
  readonly canonicalJson: string;
} {
  const snapshot = decodeJson(Schema1AutomationPermissionSnapshot, source);
  const requestedSelection = migrateSchema1AutomationSelection(
    JSON.stringify(snapshot.requestedSelection),
  ).value;
  const value: AutomationPermissionSnapshotV2 = {
    ...snapshot,
    requestedSelection,
  };
  return { value, canonicalJson: JSON.stringify(value) };
}
