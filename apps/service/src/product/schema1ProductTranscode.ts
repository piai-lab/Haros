import {
  ProductAddConversationGroupsInput,
  ProductAddEntryMarkerInput,
  ProductAddEntryPinInput,
  ProductArchiveConversationInput,
  ProductConversationSnapshot,
  ProductDeleteConversationInput,
  ProductDeleteConversationResult,
  ProductDeleteGroupInput,
  ProductDeleteGroupResult,
  ProductDeleteWorkspaceInput,
  ProductDeleteWorkspaceResult,
  ProductDispatchReceipt,
  ProductGroupMembershipResult,
  ProductGroupSummary,
  ProductRemoveEntryMarkerInput,
  ProductRemoveEntryPinInput,
  ProductReorderGroupsInput,
  ProductRestoreConversationInput,
  ProductSetConversationBoardStateInput,
  ProductSetConversationGroupsInput,
  ProductSetConversationPinnedInput,
  ProductSetEntryMarkerDoneInput,
  ProductSetEntryMarkerLabelInput,
  ProductSetEntryPinDoneInput,
  ProductSetEntryPinLabelInput,
  ProductSetWorkspacePinnedInput,
  ProductUpdateConversationNotesInput,
  ProductUpdateConversationTitleInput,
  ProductUpdateGroupInput,
  ProductUpdateWorkspaceRunCommandInput,
  ProductUpdateWorkspaceTitleInput,
  ProductWorkspaceSummary,
} from "@omnimind/contracts";
import { Schema } from "effect";

import { migrateSchema1AutomationSelection } from "../persistence/automationSelectionTranscode";

export const PRODUCT_MUTATION_KINDS = [
  "workspace-title-update",
  "workspace-pinned-set",
  "workspace-run-command-update",
  "workspace-delete",
  "group-update",
  "groups-reorder",
  "group-delete",
  "conversation-groups-set",
  "conversation-groups-add",
  "conversation-title-update",
  "conversation-archive",
  "conversation-restore",
  "conversation-pinned-set",
  "conversation-notes-update",
  "conversation-board-state-set",
  "entry-pin-add",
  "entry-pin-remove",
  "entry-pin-done-set",
  "entry-pin-label-set",
  "entry-marker-add",
  "entry-marker-remove",
  "entry-marker-done-set",
  "entry-marker-label-set",
  "conversation-delete",
] as const;

const mutationKinds = new Set<string>(PRODUCT_MUTATION_KINDS);

const jsonCodec =
  <A, I>(schema: Schema.Codec<A, I>) =>
  (source: string): string =>
    Schema.encodeSync(Schema.fromJsonString(schema))(
      Schema.decodeSync(Schema.fromJsonString(schema))(source),
    );

const snapshot = jsonCodec(ProductConversationSnapshot);
const receiptCodec = jsonCodec(ProductDispatchReceipt);
const mutationCodecs = {
  "workspace-title-update": {
    request: jsonCodec(ProductUpdateWorkspaceTitleInput),
    response: jsonCodec(ProductWorkspaceSummary),
  },
  "workspace-pinned-set": {
    request: jsonCodec(ProductSetWorkspacePinnedInput),
    response: jsonCodec(ProductWorkspaceSummary),
  },
  "workspace-run-command-update": {
    request: jsonCodec(ProductUpdateWorkspaceRunCommandInput),
    response: jsonCodec(ProductWorkspaceSummary),
  },
  "workspace-delete": {
    request: jsonCodec(ProductDeleteWorkspaceInput),
    response: jsonCodec(ProductDeleteWorkspaceResult),
  },
  "group-update": {
    request: jsonCodec(ProductUpdateGroupInput),
    response: jsonCodec(ProductGroupSummary),
  },
  "groups-reorder": {
    request: jsonCodec(ProductReorderGroupsInput),
    response: jsonCodec(Schema.Array(ProductGroupSummary)),
  },
  "group-delete": {
    request: jsonCodec(ProductDeleteGroupInput),
    response: jsonCodec(ProductDeleteGroupResult),
  },
  "conversation-groups-set": {
    request: jsonCodec(ProductSetConversationGroupsInput),
    response: jsonCodec(ProductGroupMembershipResult),
  },
  "conversation-groups-add": {
    request: jsonCodec(ProductAddConversationGroupsInput),
    response: jsonCodec(ProductGroupMembershipResult),
  },
  "conversation-title-update": {
    request: jsonCodec(ProductUpdateConversationTitleInput),
    response: snapshot,
  },
  "conversation-archive": {
    request: jsonCodec(ProductArchiveConversationInput),
    response: snapshot,
  },
  "conversation-restore": {
    request: jsonCodec(ProductRestoreConversationInput),
    response: snapshot,
  },
  "conversation-pinned-set": {
    request: jsonCodec(ProductSetConversationPinnedInput),
    response: snapshot,
  },
  "conversation-notes-update": {
    request: jsonCodec(ProductUpdateConversationNotesInput),
    response: snapshot,
  },
  "conversation-board-state-set": {
    request: jsonCodec(ProductSetConversationBoardStateInput),
    response: snapshot,
  },
  "entry-pin-add": { request: jsonCodec(ProductAddEntryPinInput), response: snapshot },
  "entry-pin-remove": { request: jsonCodec(ProductRemoveEntryPinInput), response: snapshot },
  "entry-pin-done-set": { request: jsonCodec(ProductSetEntryPinDoneInput), response: snapshot },
  "entry-pin-label-set": { request: jsonCodec(ProductSetEntryPinLabelInput), response: snapshot },
  "entry-marker-add": { request: jsonCodec(ProductAddEntryMarkerInput), response: snapshot },
  "entry-marker-remove": { request: jsonCodec(ProductRemoveEntryMarkerInput), response: snapshot },
  "entry-marker-done-set": {
    request: jsonCodec(ProductSetEntryMarkerDoneInput),
    response: snapshot,
  },
  "entry-marker-label-set": {
    request: jsonCodec(ProductSetEntryMarkerLabelInput),
    response: snapshot,
  },
  "conversation-delete": {
    request: jsonCodec(ProductDeleteConversationInput),
    response: jsonCodec(ProductDeleteConversationResult),
  },
} satisfies Record<
  (typeof PRODUCT_MUTATION_KINDS)[number],
  { readonly request: (source: string) => string; readonly response: (source: string) => string }
>;

export class Schema1ProductMigrationError extends Error {
  readonly code = "PRODUCT_SCHEMA1_MIGRATION_INVALID";
}

const object = (source: string): Record<string, unknown> => {
  const value: unknown = JSON.parse(source);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Schema1ProductMigrationError("Expected a JSON object.");
  }
  return value as Record<string, unknown>;
};

const json = (source: string): unknown => JSON.parse(source);

function transcodeNested(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(transcodeNested);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if (record.protocolVersion === 1) record.protocolVersion = 2;
  for (const [key, child] of Object.entries(record)) {
    if (key === "requestedSelection" && child && typeof child === "object") {
      record[key] = migrateSchema1AutomationSelection(JSON.stringify(child)).value;
    } else {
      record[key] = transcodeNested(child);
    }
  }
  return record;
}

export const migrateSchema1RequestedSelectionJson = (source: string): string =>
  migrateSchema1AutomationSelection(source).canonicalJson;

export function migrateSchema1ReceiptJson(source: string): string {
  const legacy = object(source);
  const abort = null;
  const canonicalReceipt = (value: Record<string, unknown>): string => {
    try {
      return receiptCodec(JSON.stringify(value));
    } catch (cause) {
      throw new Schema1ProductMigrationError(
        cause instanceof Error
          ? `Invalid schema-1 receipt: ${cause.message}`
          : "Invalid schema-1 receipt.",
      );
    }
  };
  const resolvedSelection = (): Record<string, unknown> => {
    const value = legacy.resolvedSelection;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Schema1ProductMigrationError("Accepted receipt has no resolved selection.");
    }
    if ("engineModeId" in value) {
      throw new Schema1ProductMigrationError(
        "Schema-1 resolved selection unexpectedly contains an Engine mode.",
      );
    }
    return { ...(value as Record<string, unknown>), engineModeId: null };
  };
  switch (legacy.state) {
    case "pending": {
      if (legacy.lastConfirmedBoundary !== "pre-send") {
        throw new Schema1ProductMigrationError("Pending receipt has an invalid boundary.");
      }
      return canonicalReceipt({ ...legacy, blocked: null });
    }
    case "rejected":
      return canonicalReceipt(legacy);
    case "delivery_unknown": {
      if (
        legacy.lastConfirmedBoundary !== "sent" &&
        legacy.lastConfirmedBoundary !== "acceptance-ack"
      ) {
        throw new Schema1ProductMigrationError("Delivery-unknown receipt has an invalid boundary.");
      }
      if (
        legacy.reconciliationHint !== undefined &&
        (typeof legacy.reconciliationHint !== "string" ||
          legacy.reconciliationHint.trim().length === 0 ||
          legacy.reconciliationHint.length > 512)
      ) {
        throw new Schema1ProductMigrationError(
          "Delivery-unknown receipt has an invalid reconciliation hint.",
        );
      }
      return canonicalReceipt({
        state: "delivery_unknown",
        lastConfirmedBoundary:
          legacy.lastConfirmedBoundary === "sent" ? "local-write" : "acceptance-ack",
        abort,
      });
    }
    case "accepted":
      return canonicalReceipt({
        state: "accepted",
        operationRef: legacy.operationRef,
        engineBinding: legacy.engineBinding,
        resolvedSelection: resolvedSelection(),
        abort,
      });
    case "running":
    case "settled":
    case "outcome_unknown": {
      if (typeof legacy.operationRef !== "string")
        throw new Schema1ProductMigrationError("Accepted receipt has no operation reference.");
      if (legacy.state === "outcome_unknown" && legacy.lastConfirmedBoundary !== "accepted") {
        throw new Schema1ProductMigrationError("Outcome-unknown receipt has an invalid boundary.");
      }
      if (legacy.state !== "outcome_unknown" && "lastConfirmedBoundary" in legacy) {
        throw new Schema1ProductMigrationError(
          "Accepted receipt state unexpectedly contains a confirmed boundary.",
        );
      }
      const { operationRef, resolvedSelection: _resolvedSelection, ...legacyRest } = legacy;
      const { lastConfirmedBoundary: _lastConfirmedBoundary, ...rest } = legacyRest;
      const migrated = {
        ...rest,
        evidence: { kind: "accepted-operation", operationRef },
        resolvedSelection: resolvedSelection(),
        abort,
      };
      return canonicalReceipt(migrated);
    }
    default:
      throw new Schema1ProductMigrationError("Unknown schema-1 receipt state.");
  }
}

export function migrateSchema1SubmitAdmissionJson(source: string): string {
  const request = object(source);
  if (request.protocolVersion !== 1)
    throw new Schema1ProductMigrationError("Submit admission is not protocol v1.");
  request.protocolVersion = 2;
  return JSON.stringify(request);
}

export function migrateSchema1MutationJson(input: {
  readonly kind: string;
  readonly requestJson: string;
  readonly responseJson: string;
}): { readonly requestJson: string; readonly responseJson: string } {
  if (!mutationKinds.has(input.kind))
    throw new Schema1ProductMigrationError("Unknown schema-1 mutation kind.");
  const request = object(input.requestJson);
  if (request.protocolVersion !== 1)
    throw new Schema1ProductMigrationError("Mutation request is not protocol v1.");
  const codecs = mutationCodecs[input.kind as keyof typeof mutationCodecs];
  try {
    return {
      requestJson: codecs.request(JSON.stringify(transcodeNested(request))),
      responseJson: codecs.response(JSON.stringify(transcodeNested(json(input.responseJson)))),
    };
  } catch (cause) {
    throw new Schema1ProductMigrationError(
      cause instanceof Error
        ? `Invalid ${input.kind} mutation payload: ${cause.message}`
        : `Invalid ${input.kind} mutation payload.`,
    );
  }
}
