import { ProductDispatchReceipt } from "@omnimind/contracts";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  PRODUCT_MUTATION_KINDS,
  migrateSchema1MutationJson,
  migrateSchema1ReceiptJson,
  migrateSchema1SubmitAdmissionJson,
} from "./schema1ProductTranscode";
import { schema1ProductMutationFixtures } from "./schema1ProductMutationFixtures";

describe("schema-1 Product exhaustive JSON migration", () => {
  it("transcodes every closed mutation family and rejects an unsupported kind", () => {
    expect(PRODUCT_MUTATION_KINDS).toHaveLength(24);
    for (const kind of PRODUCT_MUTATION_KINDS) {
      const fixture = schema1ProductMutationFixtures[kind];
      const migrated = migrateSchema1MutationJson({
        kind,
        requestJson: JSON.stringify(fixture.request),
        responseJson: JSON.stringify(fixture.response),
      });
      expect(JSON.parse(migrated.requestJson)).toMatchObject({
        protocolVersion: 2,
        mutationId: "mutation-fixture",
      });
      const response = JSON.parse(migrated.responseJson) as unknown;
      if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        "protocolVersion" in response
      ) {
        expect(response).toMatchObject({ protocolVersion: 2 });
      }
    }
    expect(() =>
      migrateSchema1MutationJson({
        kind: "unsupported-kind",
        requestJson: '{"protocolVersion":1}',
        responseJson: '{"protocolVersion":1}',
      }),
    ).toThrow("Unknown schema-1 mutation kind");
  });

  it("decodes every legal v1 receipt state as the exact v2 receipt schema", () => {
    const engineBinding = { id: "binding", engineId: "pi", lineageRef: "lineage" };
    const resolvedSelection = {
      engineId: "pi",
      runtimeModelId: "provider/model",
      thinking: "high",
      permissionPolicy: "approval-required",
      enforcement: "host-enforced",
      executionTarget: null,
      packageGeneration: "package-1",
    };
    const cases = [
      { state: "pending", lastConfirmedBoundary: "pre-send" },
      { state: "rejected", code: "REJECTED", message: "Rejected.", retryable: false },
      {
        state: "delivery_unknown",
        lastConfirmedBoundary: "sent",
        reconciliationHint: "private-old-hint",
      },
      { state: "accepted", operationRef: "pi-operation", engineBinding, resolvedSelection },
      { state: "running", operationRef: "pi-operation", engineBinding, resolvedSelection },
      {
        state: "settled",
        operationRef: "pi-operation",
        engineBinding,
        resolvedSelection,
        outcome: "succeeded",
        settledAt: "2026-08-06T00:00:01.000Z",
      },
      {
        state: "outcome_unknown",
        operationRef: "pi-operation",
        engineBinding,
        resolvedSelection,
        lastConfirmedBoundary: "accepted",
      },
    ];
    const migrated = cases.map((value) => {
      const json = migrateSchema1ReceiptJson(JSON.stringify(value));
      return Schema.decodeSync(Schema.fromJsonString(ProductDispatchReceipt))(json);
    });
    expect(migrated[0]).toEqual({
      state: "pending",
      lastConfirmedBoundary: "pre-send",
      blocked: null,
    });
    expect(migrated[2]).toEqual({
      state: "delivery_unknown",
      lastConfirmedBoundary: "local-write",
      abort: null,
    });
    for (const receipt of migrated.slice(3)) {
      if ("resolvedSelection" in receipt) {
        expect(receipt.resolvedSelection.engineModeId).toBeNull();
      }
    }
    expect(migrated[4]).toMatchObject({
      state: "running",
      evidence: { kind: "accepted-operation", operationRef: "pi-operation" },
      abort: null,
    });
  });

  it("rejects malformed v1-only receipt facts instead of normalizing them", () => {
    expect(() =>
      migrateSchema1ReceiptJson(
        JSON.stringify({ state: "delivery_unknown", lastConfirmedBoundary: "corrupt" }),
      ),
    ).toThrow("invalid boundary");
    expect(() =>
      migrateSchema1ReceiptJson(
        JSON.stringify({
          state: "outcome_unknown",
          operationRef: "operation",
          engineBinding: { id: "binding", engineId: "pi", lineageRef: "lineage" },
          resolvedSelection: {
            engineId: "pi",
            runtimeModelId: "provider/model",
            thinking: null,
            permissionPolicy: "approval-required",
            enforcement: "host-enforced",
            executionTarget: null,
            packageGeneration: "package-1",
          },
          lastConfirmedBoundary: "sent",
        }),
      ),
    ).toThrow("invalid boundary");
    expect(() =>
      migrateSchema1ReceiptJson(
        JSON.stringify({
          state: "accepted",
          operationRef: "operation",
          engineBinding: { id: "binding", engineId: "pi", lineageRef: "lineage" },
          resolvedSelection: {
            engineId: "pi",
            runtimeModelId: "provider/model",
            engineModeId: "not-a-schema-1-field",
            thinking: null,
            permissionPolicy: "approval-required",
            enforcement: "host-enforced",
            executionTarget: null,
            packageGeneration: "package-1",
          },
        }),
      ),
    ).toThrow("unexpectedly contains an Engine mode");
  });

  it("bumps exact submit admission identity only once", () => {
    const migrated = migrateSchema1SubmitAdmissionJson(
      JSON.stringify({ protocolVersion: 1, dispatchId: "dispatch", itemId: "item" }),
    );
    expect(migrated).toBe('{"protocolVersion":2,"dispatchId":"dispatch","itemId":"item"}');
    expect(() => migrateSchema1SubmitAdmissionJson(migrated)).toThrow("not protocol v1");
  });
});
