import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  PRODUCT_MAX_FACTS_PER_BATCH,
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductDispatchId,
  ProductEngineBindingId,
  ProductEntryId,
  ProductOperationReceiptId,
  ProductQueueItemId,
  ProductResourceRefId,
  ProductRunId,
  ProductWorkspaceId,
  type ProductCreateConversationInput,
  type ProductExecutionObservation,
  type ProductRequestedSelection,
} from "@omnimind/contracts";
import { Effect, ManagedRuntime } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  PRODUCT_DATABASE_FILENAME,
  ProductControlPlane,
  ProductControlPlaneError,
  ProductExecutionUnavailable,
  makeProductControlPlaneLayer,
  makeProductExecutionFixture,
  type ProductExecutionBoundary,
} from "./ProductControlPlane";
import { assertLegacyConversationRouteAvailable } from "./legacyConversationGuard";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

async function makeSystem(
  filename = ":memory:",
  boundary: ProductExecutionBoundary = ProductExecutionUnavailable,
) {
  const runtime = ManagedRuntime.make(makeProductControlPlaneLayer(filename, boundary));
  const controlPlane = await runtime.runPromise(Effect.service(ProductControlPlane));
  return {
    controlPlane,
    run: <A, E>(effect: Effect.Effect<A, E>) => runtime.runPromise(effect),
    dispose: () => runtime.dispose(),
  };
}

function createInput(
  suffix: string,
  kind: "managed" | "folder-backed" | "chat" = "folder-backed",
): ProductCreateConversationInput {
  const observedAt = "2026-08-04T00:00:00.000Z";
  return {
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    conversationId: ProductConversationId.makeUnsafe(`conversation-${suffix}`),
    workspaceId: ProductWorkspaceId.makeUnsafe(`workspace-${suffix}`),
    title: `Conversation ${suffix}`,
    workspace:
      kind === "chat"
        ? {
            kind: "chat",
            managedDirectory: null,
            primaryFolder: null,
            executionTarget: null,
            writeAuthority: "read-only-references",
          }
        : kind === "managed"
          ? {
              kind: "managed",
              managedDirectory: `/managed/${suffix}`,
              primaryFolder: null,
              executionTarget: {
                kind: "local",
                targetRef: `/managed/${suffix}`,
                observedAt,
              },
              writeAuthority: "managed-directory",
            }
          : {
              kind: "folder-backed",
              managedDirectory: null,
              primaryFolder: `/workspace/${suffix}`,
              executionTarget: {
                kind: "local",
                targetRef: `/workspace/${suffix}`,
                observedAt,
              },
              writeAuthority: "primary-folder",
            },
  };
}

function requestedSelection(
  suffix: string,
  withoutExecutionTarget = false,
): ProductRequestedSelection {
  return {
    engineId: "native-engine",
    modelId: `model-${suffix}`,
    thinking: "high",
    permissionPolicy: "approval-required",
    enforcement: "unverified",
    executionTarget: withoutExecutionTarget
      ? null
      : {
          kind: "local",
          targetRef: `/workspace/${suffix}`,
          observedAt: "2026-08-04T00:00:00.000Z",
        },
    packageGeneration: "unresolved-not-activated",
  };
}

function acceptedObservation(suffix: string): ProductExecutionObservation {
  return {
    kind: "accepted",
    operationRef: `operation-${suffix}`,
    engineBinding: {
      id: ProductEngineBindingId.makeUnsafe(`binding-${suffix}`),
      engineId: "native-engine",
      lineageRef: `lineage-${suffix}`,
    },
    resolvedSelection: requestedSelection(suffix),
  };
}

async function putQueueItem(
  system: Awaited<ReturnType<typeof makeSystem>>,
  input: ProductCreateConversationInput,
  suffix: string,
  access: "read-only" | "read-write" = "read-only",
) {
  return system.run(
    system.controlPlane.putQueueItem({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId: input.conversationId,
      itemId: ProductQueueItemId.makeUnsafe(`queue-${suffix}`),
      text: `message ${suffix}`,
      requestedSelection: requestedSelection(suffix, input.workspace.kind === "chat"),
      resources: [
        {
          id: ProductResourceRefId.makeUnsafe(`resource-${suffix}`),
          kind: "file",
          uri: `file:///workspace/${suffix}/input.txt`,
          label: "input.txt",
          access,
          observedVersion: "v1",
        },
      ],
      expectedRevision: null,
    }),
  );
}

function submitInput(
  conversationId: ProductConversationId,
  itemId: ProductQueueItemId,
  revision: number,
  suffix: string,
) {
  return {
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    conversationId,
    itemId,
    expectedRevision: revision,
    entryId: ProductEntryId.makeUnsafe(`entry-${suffix}`),
    runId: ProductRunId.makeUnsafe(`run-${suffix}`),
    dispatchId: ProductDispatchId.makeUnsafe(`dispatch-${suffix}`),
    receiptId: ProductOperationReceiptId.makeUnsafe(`receipt-${suffix}`),
  } as const;
}

describe("ProductControlPlane", () => {
  it("authoritatively guards every explicit legacy Conversation writer reference", async () => {
    const system = await makeSystem();
    try {
      const conversation = createInput("legacy-guard");
      await system.run(system.controlPlane.createConversation(conversation));
      expect(
        await system.run(system.controlPlane.hasConversation(conversation.conversationId)),
      ).toBe(true);
      for (const reference of [
        { threadId: conversation.conversationId },
        { sourceThreadId: conversation.conversationId },
        { parentThreadId: conversation.conversationId },
        { sidechatSourceThreadId: conversation.conversationId },
      ]) {
        const failure = await system.run(
          assertLegacyConversationRouteAvailable(reference, system.controlPlane).pipe(Effect.flip),
        );
        expect(failure.code).toBe("PRODUCT_CONVERSATION_LEGACY_ROUTE_FORBIDDEN");
      }
      const importFailure = await system.run(
        assertLegacyConversationRouteAvailable(
          { threadId: conversation.conversationId, externalId: "provider-session" },
          system.controlPlane,
        ).pipe(Effect.flip),
      );
      expect(importFailure.code).toBe("PRODUCT_CONVERSATION_LEGACY_ROUTE_FORBIDDEN");
      await system.run(
        assertLegacyConversationRouteAvailable(
          { threadId: "legacy-conversation", sourceThreadId: "legacy-source" },
          system.controlPlane,
        ),
      );
    } finally {
      await system.dispose();
    }
  });

  it("reopens the seven Product responsibilities without donor migrations", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-product-store-"));
    temporaryRoots.push(root);
    const filename = path.join(root, PRODUCT_DATABASE_FILENAME);
    const fixture = makeProductExecutionFixture([
      { crossesSendBoundary: true, observation: acceptedObservation("folder") },
    ]);
    const first = await makeSystem(filename, fixture);
    const folder = createInput("folder");
    const managed = createInput("managed", "managed");
    const chat = createInput("chat", "chat");
    await first.run(first.controlPlane.createConversation(folder));
    await first.run(first.controlPlane.createConversation(managed));
    await first.run(first.controlPlane.createConversation(chat));
    const folderQueue = await putQueueItem(first, folder, "folder", "read-write");
    await first.run(
      first.controlPlane.submitQueueItem(
        submitInput(folder.conversationId, folderQueue.id, folderQueue.revision, "folder"),
      ),
    );
    await putQueueItem(first, chat, "chat", "read-only");
    await first.dispose();

    const reopened = await makeSystem(filename);
    const folderSnapshot = await reopened.run(
      reopened.controlPlane.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: folder.conversationId,
      }),
    );
    expect(folderSnapshot.readModel.workspace.access).toMatchObject({
      kind: "folder-backed",
      primaryFolder: "/workspace/folder",
      writeAuthority: "primary-folder",
    });
    expect(folderSnapshot.readModel.entries).toHaveLength(1);
    expect(folderSnapshot.readModel.runs[0]).toMatchObject({
      resources: [{ access: "read-write", observedVersion: "v1" }],
      receipt: {
        receipt: {
          state: "accepted",
          engineBinding: { engineId: "native-engine", lineageRef: "lineage-folder" },
        },
      },
    });
    const managedSnapshot = await reopened.run(
      reopened.controlPlane.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: managed.conversationId,
      }),
    );
    expect(managedSnapshot.readModel.workspace.access).toMatchObject({
      kind: "managed",
      managedDirectory: "/managed/managed",
      primaryFolder: null,
      writeAuthority: "managed-directory",
    });
    const chatSnapshot = await reopened.run(
      reopened.controlPlane.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: chat.conversationId,
      }),
    );
    expect(chatSnapshot.readModel.workspace.access).toEqual({
      kind: "chat",
      managedDirectory: null,
      primaryFolder: null,
      executionTarget: null,
      writeAuthority: "read-only-references",
    });
    expect(chatSnapshot.readModel.queue[0]?.resources[0]?.access).toBe("read-only");
    await reopened.dispose();

    const database = new DatabaseSync(filename, { readOnly: true });
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => String(row.name));
    database.close();
    expect(tables).toContain("product_conversations");
    expect(
      tables
        .filter((name) => name !== "sqlite_sequence")
        .every((name) => name.startsWith("product_")),
    ).toBe(true);
    expect(tables).not.toContain("migrations");
  });

  it("rejects a second active admission atomically and keeps the Queue item editable", async () => {
    const system = await makeSystem();
    try {
      const conversation = createInput("atomic");
      await system.run(system.controlPlane.createConversation(conversation));
      const first = await putQueueItem(system, conversation, "atomic-one");
      const second = await putQueueItem(system, conversation, "atomic-two");
      const firstSubmit = submitInput(
        conversation.conversationId,
        first.id,
        first.revision,
        "atomic-one",
      );
      await system.run(system.controlPlane.admitQueueItem(firstSubmit));
      const conflicting = {
        ...submitInput(conversation.conversationId, second.id, second.revision, "atomic-two"),
        dispatchId: firstSubmit.dispatchId,
      };
      const failure = await system.run(
        system.controlPlane.admitQueueItem(conflicting).pipe(Effect.flip),
      );
      expect(failure.code).toBe("PRODUCT_RUN_ACTIVE");

      const snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.entries.map((entry) => entry.id)).toEqual([firstSubmit.entryId]);
      expect(snapshot.readModel.runs.map((run) => run.id)).toEqual([firstSubmit.runId]);
      expect(snapshot.readModel.queue.map((item) => item.id)).toEqual([second.id]);
    } finally {
      await system.dispose();
    }
  });

  it("blocks a new admission while delivery is unresolved and never replays either Run", async () => {
    const boundary = makeProductExecutionFixture([
      {
        crossesSendBoundary: true,
        observation: {
          kind: "indeterminate",
          lastConfirmedBoundary: "sent",
          reconciliationHint: "pi-pending:unresolved-one",
        },
      },
    ]);
    const system = await makeSystem(":memory:", boundary);
    try {
      const conversation = createInput("unresolved-admission");
      await system.run(system.controlPlane.createConversation(conversation));
      const first = await putQueueItem(system, conversation, "unresolved-one");
      const firstResult = await system.run(
        system.controlPlane.submitQueueItem(
          submitInput(
            conversation.conversationId,
            first.id,
            first.revision,
            "unresolved-one",
          ),
        ),
      );
      expect(firstResult.automaticReplayCount).toBe(0);
      expect(firstResult.snapshot.readModel.runs[0]?.receipt.receipt).toMatchObject({
        state: "delivery_unknown",
        reconciliationHint: "pi-pending:unresolved-one",
      });

      const second = await putQueueItem(system, conversation, "unresolved-two");
      const failure = await system.run(
        system.controlPlane
          .submitQueueItem(
            submitInput(
              conversation.conversationId,
              second.id,
              second.revision,
              "unresolved-two",
            ),
          )
          .pipe(Effect.flip),
      );
      expect(failure.code).toBe("PRODUCT_RUN_UNRESOLVED");
      expect(boundary.attemptCount()).toBe(1);
      const snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.queue.map((item) => item.id)).toEqual([second.id]);
      expect(snapshot.readModel.runs).toHaveLength(1);
      expect(await system.run(system.controlPlane.inspectOutbox())).toEqual([
        expect.objectContaining({ automaticReplayCount: 0, attemptCount: 1 }),
      ]);
    } finally {
      await system.dispose();
    }
  });

  it("reconciles delivery_unknown to accepted and then outcome_unknown without replay", async () => {
    let listener:
      | Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]
      | undefined;
    const fixture = makeProductExecutionFixture([
      {
        crossesSendBoundary: true,
        observation: {
          kind: "indeterminate",
          lastConfirmedBoundary: "sent",
          reconciliationHint: "pi-pending:late-accepted",
        },
      },
    ]);
    const boundary: ProductExecutionBoundary = {
      ...fixture,
      subscribeFacts: (next) => {
        listener = next;
        return () => {
          listener = undefined;
        };
      },
    };
    const system = await makeSystem(":memory:", boundary);
    try {
      const conversation = createInput("late-accepted");
      await system.run(system.controlPlane.createConversation(conversation));
      const queued = await putQueueItem(system, conversation, "late-accepted");
      const submitted = submitInput(
        conversation.conversationId,
        queued.id,
        queued.revision,
        "late-accepted",
      );
      const result = await system.run(system.controlPlane.submitQueueItem(submitted));
      expect(result.snapshot.readModel.runs[0]?.receipt.receipt).toMatchObject({
        state: "delivery_unknown",
        reconciliationHint: "pi-pending:late-accepted",
      });

      listener?.(submitted.runId, {
        kind: "delivery-accepted",
        operationRef: "pi-op:late-session:late-entry",
        lineageRef: "pi-session:late-session",
        resolvedSelection: {
          engineId: "pi",
          modelId: "faux-native/faux-thinker",
          thinking: "medium",
          permissionPolicy: "approval-required",
          enforcement: "unverified",
          packageGeneration: "package-proof",
        },
      });
      let snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.runs[0]?.receipt.receipt).toMatchObject({
        state: "accepted",
        operationRef: "pi-op:late-session:late-entry",
        engineBinding: { engineId: "pi", lineageRef: "pi-session:late-session" },
      });

      listener?.(submitted.runId, { kind: "outcome-unknown" });
      snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.runs[0]?.receipt.receipt).toMatchObject({
        state: "outcome_unknown",
        operationRef: "pi-op:late-session:late-entry",
        lastConfirmedBoundary: "accepted",
      });
      expect(fixture.attemptCount()).toBe(1);
      expect(await system.run(system.controlPlane.inspectOutbox())).toEqual([
        expect.objectContaining({ attemptCount: 1, automaticReplayCount: 0 }),
      ]);
    } finally {
      await system.dispose();
    }
  });

  it("rejects an accepted-outcome observation while delivery remains unknown", async () => {
    let listener:
      | Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]
      | undefined;
    const fixture = makeProductExecutionFixture([
      {
        crossesSendBoundary: true,
        observation: {
          kind: "indeterminate",
          lastConfirmedBoundary: "sent",
          reconciliationHint: "pi-pending:orphaned-product",
        },
      },
    ]);
    const system = await makeSystem(":memory:", {
      ...fixture,
      subscribeFacts: (next) => {
        listener = next;
        return () => {
          listener = undefined;
        };
      },
    });
    try {
      const conversation = createInput("orphaned-product");
      await system.run(system.controlPlane.createConversation(conversation));
      const queued = await putQueueItem(system, conversation, "orphaned-product");
      const submitted = submitInput(
        conversation.conversationId,
        queued.id,
        queued.revision,
        "orphaned-product",
      );
      await system.run(system.controlPlane.submitQueueItem(submitted));
      listener?.(submitted.runId, { kind: "outcome-unknown" });
      const snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.runs[0]?.receipt.receipt).toEqual({
        state: "delivery_unknown",
        lastConfirmedBoundary: "sent",
        reconciliationHint: "pi-pending:orphaned-product",
      });
      expect(fixture.attemptCount()).toBe(1);
      expect(await system.run(system.controlPlane.inspectOutbox())).toEqual([
        expect.objectContaining({ attemptCount: 1, automaticReplayCount: 0 }),
      ]);
    } finally {
      await system.dispose();
    }
  });

  it("resumes a persisted pending hint on startup and applies a late rejection without replay", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-pending-reconcile-"));
    temporaryRoots.push(root);
    const filename = path.join(root, PRODUCT_DATABASE_FILENAME);
    const firstBoundary = makeProductExecutionFixture([
      {
        crossesSendBoundary: true,
        observation: {
          kind: "indeterminate",
          lastConfirmedBoundary: "sent",
          reconciliationHint: "pi-pending:startup-rejected",
        },
      },
    ]);
    const first = await makeSystem(filename, firstBoundary);
    const conversation = createInput("startup-rejected");
    await first.run(first.controlPlane.createConversation(conversation));
    const queued = await putQueueItem(first, conversation, "startup-rejected");
    const submitted = submitInput(
      conversation.conversationId,
      queued.id,
      queued.revision,
      "startup-rejected",
    );
    await first.run(first.controlPlane.submitQueueItem(submitted));
    await first.dispose();

    let listener:
      | Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]
      | undefined;
    const resumed: Array<{ readonly runId: ProductRunId; readonly operationRef: string }> = [];
    let attemptCount = 0;
    const recoveryBoundary: ProductExecutionBoundary = {
      attempt: () => {
        attemptCount += 1;
        return Effect.die("startup reconciliation must not replay execution");
      },
      subscribeFacts: (next) => {
        listener = next;
        return () => {
          listener = undefined;
        };
      },
      resumeFacts: (runId, operationRef) => resumed.push({ runId, operationRef }),
    };
    const reopened = await makeSystem(filename, recoveryBoundary);
    try {
      expect(resumed).toEqual([
        { runId: submitted.runId, operationRef: "pi-pending:startup-rejected" },
      ]);
      listener?.(submitted.runId, {
        kind: "delivery-rejected",
        code: "PI_DISPATCH_NOT_ACCEPTED",
        message: "Pi did not persist a user entry.",
        retryable: false,
      });
      const snapshot = await reopened.run(
        reopened.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.runs[0]?.receipt.receipt).toEqual({
        state: "rejected",
        code: "PI_DISPATCH_NOT_ACCEPTED",
        message: "Pi did not persist a user entry.",
        retryable: false,
      });
      expect(attemptCount).toBe(0);
      expect(await reopened.run(reopened.controlPlane.inspectOutbox())).toEqual([
        expect.objectContaining({ attemptCount: 1, automaticReplayCount: 0 }),
      ]);
    } finally {
      await reopened.dispose();
    }
  });

  it("rejects Chat write-capable ResourceRefs before Queue ownership changes", async () => {
    const system = await makeSystem();
    try {
      const chat = createInput("chat-authority", "chat");
      await system.run(system.controlPlane.createConversation(chat));
      const failure = await system.run(
        system.controlPlane
          .putQueueItem({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId: chat.conversationId,
            itemId: ProductQueueItemId.makeUnsafe("queue-chat-write"),
            text: "write request",
            requestedSelection: requestedSelection("chat-write", true),
            resources: [
              {
                id: ProductResourceRefId.makeUnsafe("resource-chat-write"),
                kind: "file",
                uri: "file:///workspace/chat-write/input.txt",
                access: "read-write",
              },
            ],
            expectedRevision: null,
          })
          .pipe(Effect.flip),
      );
      expect(failure.code).toBe("PRODUCT_CHAT_RESOURCE_WRITE_FORBIDDEN");
      const snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: chat.conversationId,
        }),
      );
      expect(snapshot.readModel.queue).toEqual([]);
    } finally {
      await system.dispose();
    }
  });

  it("edits, reorders, and deletes only the current Queue revision", async () => {
    const system = await makeSystem();
    try {
      const conversation = createInput("queue-controls");
      await system.run(system.controlPlane.createConversation(conversation));
      const first = await putQueueItem(system, conversation, "queue-controls-one");
      const second = await putQueueItem(system, conversation, "queue-controls-two");
      const edited = await system.run(
        system.controlPlane.putQueueItem({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
          itemId: first.id,
          text: "edited message",
          requestedSelection: first.requestedSelection,
          resources: first.resources,
          expectedRevision: first.revision,
        }),
      );
      expect(edited).toMatchObject({ text: "edited message", revision: 2 });
      const conflict = await system.run(
        system.controlPlane
          .putQueueItem({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId: conversation.conversationId,
            itemId: first.id,
            text: "stale overwrite",
            requestedSelection: first.requestedSelection,
            resources: first.resources,
            expectedRevision: first.revision,
          })
          .pipe(Effect.flip),
      );
      expect(conflict.code).toBe("PRODUCT_QUEUE_REVISION_CONFLICT");

      const reordered = await system.run(
        system.controlPlane.reorderQueue({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
          orderedItemIds: [second.id, first.id],
        }),
      );
      expect(reordered.readModel.queue.map((item) => item.id)).toEqual([second.id, first.id]);
      expect(reordered.readModel.queue[1]?.text).toBe("edited message");
      const currentSecond = reordered.readModel.queue[0]!;
      const afterDelete = await system.run(
        system.controlPlane.deleteQueueItem({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
          itemId: currentSecond.id,
          expectedRevision: currentSecond.revision,
        }),
      );
      expect(afterDelete.readModel.queue.map((item) => item.id)).toEqual([first.id]);
    } finally {
      await system.dispose();
    }
  });

  it("records unsupported execution truthfully and separates shell/detail facts", async () => {
    const system = await makeSystem();
    try {
      const conversation = createInput("unsupported");
      await system.run(system.controlPlane.createConversation(conversation));
      const item = await putQueueItem(system, conversation, "unsupported");
      const result = await system.run(
        system.controlPlane.submitQueueItem(
          submitInput(conversation.conversationId, item.id, item.revision, "unsupported"),
        ),
      );
      expect(result.automaticReplayCount).toBe(0);
      expect(result.snapshot.readModel.queue).toEqual([]);
      expect(result.snapshot.readModel.entries).toHaveLength(1);
      expect(result.snapshot.readModel.runs[0]?.receipt.receipt).toMatchObject({
        state: "rejected",
        code: "NATIVE_HOST_EXECUTION_UNSUPPORTED",
      });
      expect(await system.run(system.controlPlane.inspectOutbox())).toEqual([
        expect.objectContaining({
          state: "terminal",
          attemptCount: 1,
          automaticReplayCount: 0,
        }),
      ]);

      const shell = await system.run(
        system.controlPlane.readFacts({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          scope: { kind: "shell" },
          afterSequence: 0,
          limit: PRODUCT_MAX_FACTS_PER_BATCH,
        }),
      );
      expect(shell.scope.kind).toBe("shell");
      expect(shell.facts.every((fact) => fact.change.kind === "conversation-summary")).toBe(true);
      expect(
        shell.facts.every(
          (fact) =>
            !("entry" in fact.change) && !("run" in fact.change) && !("receipt" in fact.change),
        ),
      ).toBe(true);
      const detail = await system.run(
        system.controlPlane.readFacts({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          scope: { kind: "conversation", conversationId: conversation.conversationId },
          afterSequence: 0,
          limit: PRODUCT_MAX_FACTS_PER_BATCH,
        }),
      );
      expect(detail.facts.some((fact) => fact.change.kind === "entry-admitted")).toBe(true);
      expect(detail.facts.some((fact) => fact.change.kind === "dispatch-changed")).toBe(true);
    } finally {
      await system.dispose();
    }
  });

  it("turns an Effect failure after markSent into immediate delivery_unknown with zero replay", async () => {
    const fixture = makeProductExecutionFixture([
      { crossesSendBoundary: true, failAfterBoundary: true },
    ]);
    const system = await makeSystem(":memory:", fixture);
    try {
      const conversation = createInput("same-process-unknown");
      await system.run(system.controlPlane.createConversation(conversation));
      const item = await putQueueItem(system, conversation, "same-process-unknown");
      const result = await system.run(
        system.controlPlane.submitQueueItem(
          submitInput(conversation.conversationId, item.id, item.revision, "same-process-unknown"),
        ),
      );
      expect(result.snapshot.readModel.runs[0]?.receipt.receipt).toEqual({
        state: "delivery_unknown",
        lastConfirmedBoundary: "sent",
      });
      expect(fixture.attemptCount()).toBe(1);
      expect(await system.run(system.controlPlane.inspectOutbox())).toEqual([
        expect.objectContaining({
          state: "terminal",
          sendBoundary: "sent",
          attemptCount: 1,
          automaticReplayCount: 0,
        }),
      ]);
      await system.run(system.controlPlane.dispatchPending());
      expect(fixture.attemptCount()).toBe(1);
    } finally {
      await system.dispose();
    }
  });

  it("keeps a typed pre-send failure pending and permits only a pre-send retry", async () => {
    const fixture = makeProductExecutionFixture([
      {
        crossesSendBoundary: false,
        observation: {
          kind: "pre-send-failure",
          code: "TEMPORARY_UNAVAILABLE",
          message: "Not sent.",
          retryable: true,
        },
      },
      {
        crossesSendBoundary: false,
        observation: {
          kind: "rejected",
          code: "ENGINE_UNAVAILABLE",
          message: "Engine unavailable.",
          retryable: false,
        },
      },
    ]);
    const system = await makeSystem(":memory:", fixture);
    try {
      const conversation = createInput("pre-send");
      await system.run(system.controlPlane.createConversation(conversation));
      const item = await putQueueItem(system, conversation, "pre-send");
      const submitted = await system.run(
        system.controlPlane.submitQueueItem(
          submitInput(conversation.conversationId, item.id, item.revision, "pre-send"),
        ),
      );
      expect(submitted.snapshot.readModel.runs[0]?.receipt.receipt).toEqual({
        state: "pending",
        lastConfirmedBoundary: "pre-send",
      });
      expect(await system.run(system.controlPlane.inspectOutbox())).toEqual([
        expect.objectContaining({ state: "pending", sendBoundary: "pre-send", attemptCount: 1 }),
      ]);
      await system.run(system.controlPlane.dispatchPending());
      const retried = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(retried.readModel.runs[0]?.receipt.receipt).toMatchObject({
        state: "rejected",
        code: "ENGINE_UNAVAILABLE",
      });
      expect(fixture.attemptCount()).toBe(2);
    } finally {
      await system.dispose();
    }
  });

  it("claims one pending dispatch once across concurrent dispatchers", async () => {
    let attemptCount = 0;
    let signalEntered!: () => void;
    let releaseAttempt!: () => void;
    const entered = new Promise<void>((resolve) => {
      signalEntered = resolve;
    });
    const released = new Promise<void>((resolve) => {
      releaseAttempt = resolve;
    });
    const boundary: ProductExecutionBoundary = {
      attempt: () =>
        Effect.promise(async () => {
          attemptCount += 1;
          signalEntered();
          await released;
          return {
            kind: "rejected",
            code: "ENGINE_UNAVAILABLE",
            message: "Engine unavailable.",
            retryable: false,
          } satisfies ProductExecutionObservation;
        }),
    };
    const system = await makeSystem(":memory:", boundary);
    try {
      const conversation = createInput("concurrent-claim");
      await system.run(system.controlPlane.createConversation(conversation));
      const item = await putQueueItem(system, conversation, "concurrent-claim");
      const input = submitInput(
        conversation.conversationId,
        item.id,
        item.revision,
        "concurrent-claim",
      );
      await system.run(system.controlPlane.admitQueueItem(input));

      const concurrentDispatches = Promise.all([
        system.run(system.controlPlane.dispatchPending(input.dispatchId)),
        system.run(system.controlPlane.dispatchPending(input.dispatchId)),
      ]);
      await entered;
      releaseAttempt();
      await concurrentDispatches;

      expect(attemptCount).toBe(1);
      const snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.runs[0]?.receipt.receipt).toMatchObject({
        state: "rejected",
        code: "ENGINE_UNAVAILABLE",
      });
      expect(await system.run(system.controlPlane.inspectOutbox())).toEqual([
        expect.objectContaining({
          state: "terminal",
          attemptCount: 1,
          automaticReplayCount: 0,
        }),
      ]);
    } finally {
      releaseAttempt();
      await system.dispose();
    }
  });

  it("atomically preserves a second submit in Queue while one Conversation dispatch is active", async () => {
    let attemptCount = 0;
    let signalEntered!: () => void;
    let releaseAttempt!: () => void;
    const entered = new Promise<void>((resolve) => {
      signalEntered = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseAttempt = resolve;
    });
    const boundary: ProductExecutionBoundary = {
      attempt: ({ markSent }) =>
        Effect.gen(function* () {
          attemptCount += 1;
          yield* markSent();
          signalEntered();
          yield* Effect.promise(() => release);
          return acceptedObservation("single-owner");
        }),
    };
    const system = await makeSystem(":memory:", boundary);
    try {
      const conversation = createInput("single-owner");
      await system.run(system.controlPlane.createConversation(conversation));
      const first = await putQueueItem(system, conversation, "single-owner-one");
      const second = await putQueueItem(system, conversation, "single-owner-two");
      const firstTask = system.run(
        system.controlPlane.submitQueueItem(
          submitInput(
            conversation.conversationId,
            first.id,
            first.revision,
            "single-owner-one",
          ),
        ),
      );
      await entered;
      const secondFailure = await system.run(
        system.controlPlane
          .submitQueueItem(
            submitInput(
              conversation.conversationId,
              second.id,
              second.revision,
              "single-owner-two",
            ),
          )
          .pipe(Effect.flip),
      );
      expect(secondFailure.code).toBe("PRODUCT_RUN_ACTIVE");
      releaseAttempt();
      await firstTask;

      const snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(attemptCount).toBe(1);
      expect(snapshot.readModel.runs).toHaveLength(1);
      expect(snapshot.readModel.queue.map((item) => item.id)).toEqual([second.id]);
    } finally {
      releaseAttempt?.();
      await system.dispose();
    }
  });

  it("rejects an oversized native request before admission and preserves the editable Queue item", async () => {
    let attemptCount = 0;
    const boundary: ProductExecutionBoundary = {
      preflight: () => {
        throw new ProductControlPlaneError({
          code: "NATIVE_HOST_REQUEST_OVERSIZED",
          message: "Edit the Queue item before sending.",
          retryable: false,
        });
      },
      attempt: () => {
        attemptCount += 1;
        return Effect.succeed(acceptedObservation("must-not-send"));
      },
    };
    const system = await makeSystem(":memory:", boundary);
    try {
      const conversation = createInput("oversized-preflight");
      await system.run(system.controlPlane.createConversation(conversation));
      const queued = await putQueueItem(system, conversation, "oversized-preflight");
      const failure = await system.run(
        system.controlPlane
          .submitQueueItem(
            submitInput(
              conversation.conversationId,
              queued.id,
              queued.revision,
              "oversized-preflight",
            ),
          )
          .pipe(Effect.flip),
      );
      expect(failure.code).toBe("NATIVE_HOST_REQUEST_OVERSIZED");
      expect(attemptCount).toBe(0);
      const snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.queue.map((item) => item.id)).toEqual([queued.id]);
      expect(snapshot.readModel.runs).toEqual([]);
      expect(await system.run(system.controlPlane.inspectOutbox())).toEqual([]);
    } finally {
      await system.dispose();
    }
  });

  it("routes typed native controls only to the accepted operation and preserves distinct results", async () => {
    const controls: string[] = [];
    const boundary: ProductExecutionBoundary = {
      ...makeProductExecutionFixture([
        { crossesSendBoundary: true, observation: acceptedObservation("controls") },
      ]),
      control: (input) => {
        controls.push(`${input.operationRef}:${input.control}:${input.text ?? ""}`);
        return Effect.succeed({
          operationRef: input.operationRef,
          control: input.control,
          result: input.control === "cancel" ? "unsupported" : "applied",
          code: input.control === "cancel" ? "control-unsupported" : "control-applied",
          message: input.control === "cancel" ? "Pi has no distinct cancel." : "Applied.",
        });
      },
    };
    const system = await makeSystem(":memory:", boundary);
    try {
      const conversation = createInput("controls");
      await system.run(system.controlPlane.createConversation(conversation));
      const item = await putQueueItem(system, conversation, "controls");
      const submit = submitInput(
        conversation.conversationId,
        item.id,
        item.revision,
        "controls",
      );
      await system.run(system.controlPlane.submitQueueItem(submit));
      await expect(
        system.run(
          system.controlPlane.controlRun({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId: conversation.conversationId,
            runId: submit.runId,
            control: "steer",
            text: "new direction",
          }),
        ),
      ).resolves.toMatchObject({ result: "applied", control: "steer" });
      await expect(
        system.run(
          system.controlPlane.controlRun({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId: conversation.conversationId,
            runId: submit.runId,
            control: "cancel",
            text: null,
          }),
        ),
      ).resolves.toMatchObject({ result: "unsupported", control: "cancel" });
      expect(controls).toEqual([
        "operation-controls:steer:new direction",
        "operation-controls:cancel:",
      ]);
    } finally {
      await system.dispose();
    }
  });

  it("idempotently replaces a partial assistant from a native Session snapshot", async () => {
    let listener:
      | Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]
      | undefined;
    const boundary: ProductExecutionBoundary = {
      ...makeProductExecutionFixture([
        { crossesSendBoundary: true, observation: acceptedObservation("snapshot-recovery") },
      ]),
      subscribeFacts: (next) => {
        listener = next;
        return () => {
          listener = undefined;
        };
      },
    };
    const system = await makeSystem(":memory:", boundary);
    try {
      const conversation = createInput("snapshot-recovery");
      await system.run(system.controlPlane.createConversation(conversation));
      const queued = await putQueueItem(system, conversation, "snapshot-recovery");
      await system.run(
        system.controlPlane.submitQueueItem(
          submitInput(
            conversation.conversationId,
            queued.id,
            queued.revision,
            "snapshot-recovery",
          ),
        ),
      );
      const runId = ProductRunId.makeUnsafe("run-snapshot-recovery");
      listener?.(runId, {
        kind: "facts",
        facts: [
          {
            operationRef: "operation-snapshot-recovery",
            sequence: 1,
            emittedAt: "2026-08-05T00:00:00.000Z",
            kind: "assistant.delta",
            text: "partial tail",
          },
        ],
      });
      const snapshotObservation = {
        kind: "snapshot" as const,
        snapshot: {
          version: 1 as const,
          operationRef: "operation-snapshot-recovery",
          source: "pi-session-reopen" as const,
          acceptanceEntryId: "accepted-entry",
          assistant: "Complete answer from before Service returned.",
          settlement: {
            outcome: "succeeded" as const,
            message: "Completed.",
            settledAt: "2026-08-05T00:00:01.000Z",
          },
        },
      };
      listener?.(runId, snapshotObservation);
      listener?.(runId, snapshotObservation);

      const snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.entries.at(-1)?.text).toBe(
        "Complete answer from before Service returned.",
      );
      expect(snapshot.readModel.streamingEntryIds).toEqual([]);
      expect(snapshot.readModel.recoveries).toEqual([
        expect.objectContaining({
          runId,
          snapshotVersion: 1,
          kind: "visible-result",
        }),
      ]);
      expect(snapshot.readModel.runs[0]?.receipt.receipt).toMatchObject({
        state: "settled",
        outcome: "succeeded",
      });
    } finally {
      await system.dispose();
    }
  });

  it.each([
    ["accepted", acceptedObservation("boundary-bypass")],
    [
      "indeterminate",
      {
        kind: "indeterminate",
        lastConfirmedBoundary: "sent",
      } satisfies ProductExecutionObservation,
    ],
  ] as const)(
    "rejects a pre-send %s observation without manufacturing receipt evidence",
    async (_kind, observation) => {
      const fixture = makeProductExecutionFixture([{ crossesSendBoundary: false, observation }]);
      const system = await makeSystem(":memory:", fixture);
      try {
        const conversation = createInput(`boundary-${observation.kind}`);
        await system.run(system.controlPlane.createConversation(conversation));
        const item = await putQueueItem(system, conversation, `boundary-${observation.kind}`);
        const failure = await system.run(
          system.controlPlane
            .submitQueueItem(
              submitInput(
                conversation.conversationId,
                item.id,
                item.revision,
                `boundary-${observation.kind}`,
              ),
            )
            .pipe(Effect.flip),
        );
        expect(failure.code).toBe("PRODUCT_SEND_BOUNDARY_CONTRADICTION");
        const snapshot = await system.run(
          system.controlPlane.getConversationSnapshot({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId: conversation.conversationId,
          }),
        );
        expect(snapshot.readModel.runs[0]?.receipt.receipt).toEqual({
          state: "pending",
          lastConfirmedBoundary: "pre-send",
        });
        expect(snapshot.readModel.queue).toEqual([]);
        expect(await system.run(system.controlPlane.inspectOutbox())).toEqual([
          expect.objectContaining({
            state: "pending",
            sendBoundary: "pre-send",
            attemptCount: 1,
            automaticReplayCount: 0,
          }),
        ]);
      } finally {
        await system.dispose();
      }
    },
  );

  it("recovers a hard crash after markSent as delivery_unknown without replay", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-product-crash-"));
    temporaryRoots.push(root);
    const filename = path.join(root, PRODUCT_DATABASE_FILENAME);
    const crash = makeProductExecutionFixture([
      { crossesSendBoundary: true, dieAfterBoundary: true },
    ]);
    const first = await makeSystem(filename, crash);
    const conversation = createInput("process-loss");
    await first.run(first.controlPlane.createConversation(conversation));
    const item = await putQueueItem(first, conversation, "process-loss");
    const input = submitInput(conversation.conversationId, item.id, item.revision, "process-loss");
    await first.run(first.controlPlane.admitQueueItem(input));
    await expect(first.run(first.controlPlane.dispatchPending(input.dispatchId))).rejects.toThrow();
    await first.dispose();

    const shouldNotRun = makeProductExecutionFixture([
      {
        crossesSendBoundary: false,
        observation: {
          kind: "rejected",
          code: "SHOULD_NOT_RUN",
          message: "Recovery replayed unexpectedly.",
          retryable: false,
        },
      },
    ]);
    const reopened = await makeSystem(filename, shouldNotRun);
    const snapshot = await reopened.run(
      reopened.controlPlane.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: conversation.conversationId,
      }),
    );
    expect(snapshot.readModel.runs[0]?.receipt.receipt).toEqual({
      state: "delivery_unknown",
      lastConfirmedBoundary: "sent",
    });
    expect(shouldNotRun.attemptCount()).toBe(0);
    expect(await reopened.run(reopened.controlPlane.inspectOutbox())).toEqual([
      expect.objectContaining({ automaticReplayCount: 0, attemptCount: 1, state: "terminal" }),
    ]);
    await reopened.dispose();
  });

  it("retains accepted context through running, settled, and outcome_unknown", async () => {
    const fixture = makeProductExecutionFixture([
      { crossesSendBoundary: true, observation: acceptedObservation("settled") },
      { crossesSendBoundary: true, observation: acceptedObservation("outcome-unknown") },
    ]);
    const system = await makeSystem(":memory:", fixture);
    try {
      const conversation = createInput("accepted-context");
      await system.run(system.controlPlane.createConversation(conversation));
      const settledItem = await putQueueItem(system, conversation, "settled");
      await system.run(
        system.controlPlane.submitQueueItem(
          submitInput(conversation.conversationId, settledItem.id, settledItem.revision, "settled"),
        ),
      );
      await system.run(
        system.controlPlane.observeRun(ProductRunId.makeUnsafe("run-settled"), { kind: "running" }),
      );
      await system.run(
        system.controlPlane.observeRun(ProductRunId.makeUnsafe("run-settled"), {
          kind: "settled",
          outcome: "succeeded",
          settledAt: "2026-08-04T00:00:02.000Z",
        }),
      );

      const unknownItem = await putQueueItem(system, conversation, "outcome-unknown");
      await system.run(
        system.controlPlane.submitQueueItem(
          submitInput(
            conversation.conversationId,
            unknownItem.id,
            unknownItem.revision,
            "outcome-unknown",
          ),
        ),
      );
      await system.run(
        system.controlPlane.observeRun(ProductRunId.makeUnsafe("run-outcome-unknown"), {
          kind: "outcome_unknown",
        }),
      );
      const snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.runs[0]?.receipt.receipt).toMatchObject({
        state: "settled",
        operationRef: "operation-settled",
        engineBinding: { id: "binding-settled" },
        resolvedSelection: { engineId: "native-engine" },
      });
      expect(snapshot.readModel.runs[1]?.receipt.receipt).toMatchObject({
        state: "outcome_unknown",
        operationRef: "operation-outcome-unknown",
        engineBinding: { id: "binding-outcome-unknown" },
        resolvedSelection: { engineId: "native-engine" },
      });
    } finally {
      await system.dispose();
    }
  });
});
