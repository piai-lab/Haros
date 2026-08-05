import { createHash } from "node:crypto";
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
  ProductEntryMarkerId,
  ProductGroupId,
  ProductMutationId,
  ProductOperationReceiptId,
  ProductQueueItemId,
  ProductResourceRefId,
  ProductRunId,
  type ProductRuntimeCatalog,
  ProductWorkspaceId,
  type ProductCreateConversationInput,
  type ProductCreateWorkspaceInput,
  type ProductExecutionObservation,
  type ProductRequestedSelection,
} from "@omnimind/contracts";
import { Effect, ManagedRuntime } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PRODUCT_DATABASE_FILENAME,
  ProductControlPlane,
  ProductControlPlaneError,
  ProductExecutionUnavailable,
  makeProductControlPlaneLayer,
  makeProductExecutionFixture,
  type ProductExecutionBoundary,
} from "./ProductControlPlane";

const temporaryRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

async function makeSystem(
  filename = ":memory:",
  boundary: ProductExecutionBoundary = ProductExecutionUnavailable,
) {
  const runtime = ManagedRuntime.make(
    makeProductControlPlaneLayer(filename, boundary, runtimeCatalog),
  );
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
    state: "selected",
    engineId: "native-engine",
    runtimeModelId: "provider/model",
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

const runtimeCatalog: ProductRuntimeCatalog = {
  engineId: "native-engine",
  runtimeVersion: "test-runtime",
  packageGeneration: "unresolved-not-activated",
  models: [
    {
      id: "provider/model",
      provider: "provider",
      modelId: "model",
      name: "Test model",
      reasoning: true,
      available: true,
      thinkingLevels: ["high", "medium"],
      auth: "configured",
    },
  ],
  capabilities: {
    ingress: "typed-native-host",
    lineage: { continue: "available", rebuild: "available" },
    controls: {
      steer: "available",
      followUp: "available",
      abort: "available",
      cancel: "unavailable",
    },
    structuredQuestions: "available",
    packages: "available",
    filesRead: "unknown",
    filesWrite: "unknown",
    terminal: "unknown",
    enforcement: "unverified",
  },
  truncated: false,
};

function acceptedObservation(suffix: string): ProductExecutionObservation {
  return {
    kind: "accepted",
    operationRef: `operation-${suffix}`,
    engineBinding: {
      id: ProductEngineBindingId.makeUnsafe(`binding-${suffix}`),
      engineId: "native-engine",
      lineageRef: `lineage-${suffix}`,
    },
    resolvedSelection: {
      engineId: "native-engine",
      runtimeModelId: "provider/model",
      thinking: "high",
      permissionPolicy: "approval-required",
      enforcement: "unverified",
      executionTarget: null,
      packageGeneration: "unresolved-not-activated",
    },
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
  it("publishes throttled Host runtime catalog changes as shell facts and clears Host loss", async () => {
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    let observed: ProductRuntimeCatalog | null = runtimeCatalog;
    let catalogCalls = 0;
    const boundary: ProductExecutionBoundary = {
      ...ProductExecutionUnavailable,
      catalog: () => {
        catalogCalls += 1;
        return Effect.succeed(observed);
      },
    };
    const system = await makeSystem(":memory:", boundary);
    const read = (afterSequence: number) =>
      system.run(
        system.controlPlane.readFacts({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          scope: { kind: "shell" },
          afterSequence,
          limit: PRODUCT_MAX_FACTS_PER_BATCH,
        }),
      );
    try {
      expect((await read(0)).facts).toEqual([]);
      expect(catalogCalls).toBe(1);
      now += 1_500;
      expect((await read(0)).facts).toEqual([]);
      expect(catalogCalls).toBe(1);

      observed = {
        ...runtimeCatalog,
        packageGeneration: "package-next",
        models: runtimeCatalog.models.map((model) => ({
          ...model,
          id: "provider/model-next",
          modelId: "model-next",
          auth: "missing" as const,
          available: false,
        })),
      };
      now += 5_000;
      const changed = await read(0);
      expect(changed.facts).toHaveLength(1);
      expect(changed.facts[0]?.change).toEqual({ kind: "runtime-catalog", catalog: observed });

      now += 5_000;
      expect((await read(changed.highWaterSequence)).facts).toEqual([]);

      observed = {
        ...observed,
        models: observed.models.map((model) => ({ ...model, auth: "unavailable" as const })),
      };
      now += 5_000;
      const unavailable = await read(changed.highWaterSequence);
      expect(unavailable.facts[0]?.change).toEqual({
        kind: "runtime-catalog",
        catalog: observed,
      });

      observed = null;
      now += 5_000;
      const lost = await read(unavailable.highWaterSequence);
      expect(lost.facts[0]?.change).toEqual({ kind: "runtime-catalog", catalog: null });
      expect((await system.run(system.controlPlane.getShellSnapshot())).runtimeCatalog).toBeNull();
      expect(catalogCalls).toBe(5);
    } finally {
      await system.dispose();
    }
  });

  it("preserves Product tables but resets incompatible pre-release fact history on reopen", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-product-v1-facts-"));
    temporaryRoots.push(root);
    const filename = path.join(root, PRODUCT_DATABASE_FILENAME);
    const conversation = createInput("pre-release-facts");
    const first = await makeSystem(filename);
    await first.run(first.controlPlane.createConversation(conversation));
    await first.dispose();

    const database = new DatabaseSync(filename);
    database.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN IMMEDIATE;
      ALTER TABLE product_facts RENAME TO product_facts_current;
      CREATE TABLE product_facts (
        global_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        fact_id TEXT NOT NULL UNIQUE,
        conversation_id TEXT REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
        workspace_id TEXT REFERENCES product_workspaces(workspace_id) ON DELETE CASCADE,
        group_id TEXT REFERENCES product_groups(group_id) ON DELETE CASCADE,
        conversation_sequence INTEGER CHECK (conversation_sequence > 0),
        emitted_at TEXT NOT NULL,
        shell_change_json TEXT NOT NULL,
        detail_change_json TEXT,
        UNIQUE (conversation_id, conversation_sequence),
        CHECK (
          (conversation_id IS NOT NULL AND workspace_id IS NULL AND group_id IS NULL AND
           conversation_sequence IS NOT NULL AND detail_change_json IS NOT NULL) OR
          (conversation_id IS NULL AND workspace_id IS NOT NULL AND group_id IS NULL AND
           conversation_sequence IS NULL AND detail_change_json IS NULL) OR
          (conversation_id IS NULL AND workspace_id IS NULL AND group_id IS NOT NULL AND
           conversation_sequence IS NULL AND detail_change_json IS NULL)
        )
      );
      INSERT INTO product_facts
      SELECT * FROM product_facts_current;
      DROP TABLE product_facts_current;
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
    database.close();

    const reopened = await makeSystem(filename);
    try {
      const shell = await reopened.run(reopened.controlPlane.getShellSnapshot());
      expect(shell.conversations.map((candidate) => candidate.id)).toContain(
        conversation.conversationId,
      );
      const oldCursor = await reopened.run(
        reopened.controlPlane.readFacts({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          scope: { kind: "shell" },
          afterSequence: 1,
          limit: PRODUCT_MAX_FACTS_PER_BATCH,
        }),
      );
      expect(oldCursor).toMatchObject({
        highWaterSequence: 0,
        facts: [],
        resnapshotRequired: true,
        reason: "cursor-ahead",
      });
      const fresh = await reopened.run(
        reopened.controlPlane.readFacts({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          scope: { kind: "shell" },
          afterSequence: 0,
          limit: PRODUCT_MAX_FACTS_PER_BATCH,
        }),
      );
      expect(fresh).toMatchObject({ highWaterSequence: 0, facts: [], resnapshotRequired: false });
    } finally {
      await reopened.dispose();
    }
  });

  it("updates a Conversation title with durable CAS and mutation-id idempotency", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-product-title-"));
    temporaryRoots.push(root);
    const filename = path.join(root, PRODUCT_DATABASE_FILENAME);
    const conversation = createInput("title");
    const mutationId = ProductMutationId.makeUnsafe("mutation-title-1");
    const first = await makeSystem(filename);
    const created = await first.run(first.controlPlane.createConversation(conversation));
    expect(created.readModel.conversation.revision).toBe(1);

    const mutation = {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      mutationId,
      conversationId: conversation.conversationId,
      expectedRevision: 1,
      title: "Renamed conversation",
    } as const;
    const updated = await first.run(first.controlPlane.updateConversationTitle(mutation));
    expect(updated.readModel.conversation).toMatchObject({
      title: "Renamed conversation",
      revision: 2,
    });
    const secondMutation = await first.run(
      first.controlPlane.updateConversationTitle({
        ...mutation,
        mutationId: ProductMutationId.makeUnsafe("mutation-title-2"),
        expectedRevision: 2,
        title: "Renamed conversation twice",
      }),
    );
    expect(secondMutation.readModel.conversation).toMatchObject({
      title: "Renamed conversation twice",
      revision: 3,
    });
    await expect(first.run(first.controlPlane.updateConversationTitle(mutation))).resolves.toEqual(
      secondMutation,
    );

    const reusedIdentity = await first.run(
      first.controlPlane
        .updateConversationTitle({ ...mutation, title: "Conflicting retry" })
        .pipe(Effect.flip),
    );
    expect(reusedIdentity.code).toBe("PRODUCT_MUTATION_ID_CONFLICT");
    const stale = await first.run(
      first.controlPlane
        .updateConversationTitle({
          ...mutation,
          mutationId: ProductMutationId.makeUnsafe("mutation-title-stale"),
          title: "Stale update",
        })
        .pipe(Effect.flip),
    );
    expect(stale).toMatchObject({
      code: "PRODUCT_CONVERSATION_REVISION_CONFLICT",
      retryable: true,
    });
    await first.dispose();

    const reopened = await makeSystem(filename);
    try {
      const snapshot = await reopened.run(
        reopened.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      expect(snapshot.readModel.conversation).toMatchObject({
        title: "Renamed conversation twice",
        revision: 3,
      });
      const facts = await reopened.run(
        reopened.controlPlane.readFacts({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          scope: { kind: "conversation", conversationId: conversation.conversationId },
          afterSequence: 0,
          limit: PRODUCT_MAX_FACTS_PER_BATCH,
        }),
      );
      expect(facts.facts.map((fact) => fact.change.kind)).toContain("conversation-updated");
    } finally {
      await reopened.dispose();
    }
  });

  it("preserves an unavailable stale Model intent in Queue but never dispatches it", async () => {
    const system = await makeSystem();
    try {
      const conversation = createInput("stale-model-intent", "chat");
      await system.run(system.controlPlane.createConversation(conversation));
      const queued = await system.run(
        system.controlPlane.putQueueItem({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
          itemId: ProductQueueItemId.makeUnsafe("queue-stale-model-intent"),
          text: "Keep my stale selection visible",
          requestedSelection: {
            state: "unavailable",
            reason: "model-unavailable",
            requestedRuntimeModelId: "retired-provider/retired-model",
            permissionPolicy: "approval-required",
            enforcement: "unverified",
            executionTarget: null,
          },
          resources: [],
          expectedRevision: null,
        }),
      );
      expect(queued.requestedSelection).toMatchObject({
        state: "unavailable",
        requestedRuntimeModelId: "retired-provider/retired-model",
      });
      const failure = await system.run(
        system.controlPlane
          .submitQueueItem(
            submitInput(
              conversation.conversationId,
              queued.id,
              queued.revision,
              "stale-model-intent",
            ),
          )
          .pipe(Effect.flip),
      );
      expect(failure).toMatchObject({
        code: "PRODUCT_RUNTIME_SELECTION_UNAVAILABLE",
        retryable: true,
      });
    } finally {
      await system.dispose();
    }
  });

  it("persists the closed Conversation lifecycle and emits a durable tombstone", async () => {
    const system = await makeSystem();
    const conversation = createInput("lifecycle");
    try {
      await system.run(system.controlPlane.createConversation(conversation));
      const mutation = (suffix: string, expectedRevision: number) =>
        ({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe(`mutation-lifecycle-${suffix}`),
          conversationId: conversation.conversationId,
          expectedRevision,
        }) as const;

      const archived = await system.run(
        system.controlPlane.archiveConversation(mutation("archive", 1)),
      );
      expect(archived.readModel.conversation).toMatchObject({ revision: 2 });
      expect(archived.readModel.conversation.archivedAt).not.toBeNull();

      const restored = await system.run(
        system.controlPlane.restoreConversation(mutation("restore", 2)),
      );
      expect(restored.readModel.conversation).toMatchObject({ revision: 3, archivedAt: null });

      const pinned = await system.run(
        system.controlPlane.setConversationPinned({
          ...mutation("pin", 3),
          isPinned: true,
        }),
      );
      expect(pinned.readModel.conversation).toMatchObject({ revision: 4, isPinned: true });

      const noted = await system.run(
        system.controlPlane.updateConversationNotes({
          ...mutation("notes", 4),
          notes: "Preserve the Product-owned note.",
        }),
      );
      expect(noted.readModel.conversation).toMatchObject({
        revision: 5,
        notes: "Preserve the Product-owned note.",
      });

      const done = await system.run(
        system.controlPlane.setConversationBoardState({
          ...mutation("done", 5),
          boardState: "done",
        }),
      );
      expect(done.readModel.conversation).toMatchObject({ revision: 6, boardState: "done" });
      expect(done.readModel.conversation.boardStateChangedAt).not.toBeNull();

      const deleted = await system.run(
        system.controlPlane.deleteConversation(mutation("delete", 6)),
      );
      expect(deleted).toMatchObject({
        conversationId: conversation.conversationId,
        revision: 7,
      });
      await expect(
        system.run(system.controlPlane.deleteConversation(mutation("delete", 6))),
      ).resolves.toEqual(deleted);
      expect(
        await system.run(system.controlPlane.hasConversation(conversation.conversationId)),
      ).toBe(false);
      const shell = await system.run(system.controlPlane.getShellSnapshot());
      expect(shell.conversations).toEqual([]);
      const facts = await system.run(
        system.controlPlane.readFacts({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          scope: { kind: "conversation", conversationId: conversation.conversationId },
          afterSequence: 0,
          limit: PRODUCT_MAX_FACTS_PER_BATCH,
        }),
      );
      expect(facts.facts.at(-1)?.change).toEqual({
        kind: "conversation-tombstone",
        conversationId: conversation.conversationId,
      });
    } finally {
      await system.dispose();
    }
  });

  it("creates one durable Workspace fact and replays the same create identity without duplication", async () => {
    const system = await makeSystem();
    const input = {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      workspaceId: ProductWorkspaceId.makeUnsafe("workspace-create-proof"),
      title: "Create proof",
      access: {
        kind: "folder-backed",
        managedDirectory: null,
        primaryFolder: "/workspace/create-proof",
        executionTarget: {
          kind: "local",
          targetRef: "/workspace/create-proof",
          observedAt: "2026-08-05T00:00:00.000Z",
        },
        writeAuthority: "primary-folder",
      },
      visibleInSidebar: true,
    } satisfies ProductCreateWorkspaceInput;
    try {
      const created = await system.run(system.controlPlane.createWorkspace(input));
      const replayed = await system.run(system.controlPlane.createWorkspace(input));
      expect(replayed).toEqual(created);
      const recoveredByRoot = await system.run(
        system.controlPlane.createWorkspace({
          ...input,
          workspaceId: ProductWorkspaceId.makeUnsafe("workspace-create-proof-racing-id"),
          access: {
            ...input.access,
            primaryFolder: "/workspace//create-proof/",
            executionTarget: {
              ...input.access.executionTarget,
              targetRef: "/workspace/create-proof/",
            },
          },
        }),
      );
      expect(recoveredByRoot.id).toBe(input.workspaceId);
      expect(recoveredByRoot.access.primaryFolder).toBe("/workspace/create-proof");

      const shell = await system.run(system.controlPlane.getShellSnapshot());
      expect(shell.workspaces).toEqual([created]);
      expect(shell.sequence).toBe(1);
      const facts = await system.run(
        system.controlPlane.readFacts({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          scope: { kind: "shell" },
          afterSequence: 0,
          limit: PRODUCT_MAX_FACTS_PER_BATCH,
        }),
      );
      expect(facts.facts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            workspaceId: input.workspaceId,
            change: { kind: "workspace-summary", workspace: created },
          }),
        ]),
      );

      await expect(
        system.run(
          system.controlPlane.createWorkspace({
            ...input,
            access: {
              ...input.access,
              primaryFolder: "/workspace/other-root",
              executionTarget: {
                ...input.access.executionTarget,
                targetRef: "/workspace/other-root",
              },
            },
          }),
        ),
      ).rejects.toMatchObject({ code: "PRODUCT_WORKSPACE_ID_CONFLICT" });

      const renamed = await system.run(
        system.controlPlane.updateWorkspaceTitle({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("workspace-title-1"),
          workspaceId: input.workspaceId,
          expectedRevision: 1,
          title: "Renamed Workspace",
        }),
      );
      const pinned = await system.run(
        system.controlPlane.setWorkspacePinned({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("workspace-pin-1"),
          workspaceId: input.workspaceId,
          expectedRevision: renamed.revision,
          isPinned: true,
        }),
      );
      const withRunCommand = await system.run(
        system.controlPlane.updateWorkspaceRunCommand({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("workspace-run-command-1"),
          workspaceId: input.workspaceId,
          expectedRevision: pinned.revision,
          runCommand: "bun run dev",
        }),
      );
      expect(withRunCommand).toMatchObject({
        revision: 4,
        title: "Renamed Workspace",
        isPinned: true,
        runCommand: "bun run dev",
      });

      const replayedRename = await system.run(
        system.controlPlane.updateWorkspaceTitle({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("workspace-title-1"),
          workspaceId: input.workspaceId,
          expectedRevision: 1,
          title: "Renamed Workspace",
        }),
      );
      expect(replayedRename.revision).toBe(4);
      await expect(
        system.run(
          system.controlPlane.setWorkspacePinned({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            mutationId: ProductMutationId.makeUnsafe("workspace-pin-stale"),
            workspaceId: input.workspaceId,
            expectedRevision: 1,
            isPinned: false,
          }),
        ),
      ).rejects.toMatchObject({ code: "PRODUCT_WORKSPACE_REVISION_CONFLICT" });

      const deleteInput = {
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        mutationId: ProductMutationId.makeUnsafe("workspace-delete-1"),
        workspaceId: input.workspaceId,
        expectedRevision: 4,
      } as const;
      const deleted = await system.run(system.controlPlane.deleteWorkspace(deleteInput));
      expect(deleted).toMatchObject({ revision: 5, sequence: 5 });
      await expect(system.run(system.controlPlane.deleteWorkspace(deleteInput))).resolves.toEqual(
        deleted,
      );
      expect((await system.run(system.controlPlane.getShellSnapshot())).workspaces).toEqual([]);
    } finally {
      await system.dispose();
    }
  });

  it.skipIf(process.platform !== "darwin")(
    "recovers the same durable Workspace through the macOS private-var alias",
    async () => {
      const system = await makeSystem();
      const input = {
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        workspaceId: ProductWorkspaceId.makeUnsafe("workspace-darwin-alias"),
        title: "Darwin alias",
        access: {
          kind: "folder-backed",
          managedDirectory: null,
          primaryFolder: "/private/var/folders/omnimind-proof",
          executionTarget: {
            kind: "local",
            targetRef: "/private/var/folders/omnimind-proof",
            observedAt: "2026-08-05T00:00:00.000Z",
          },
          writeAuthority: "primary-folder",
        },
        visibleInSidebar: true,
      } satisfies ProductCreateWorkspaceInput;
      try {
        const created = await system.run(system.controlPlane.createWorkspace(input));
        const recovered = await system.run(
          system.controlPlane.createWorkspace({
            ...input,
            workspaceId: ProductWorkspaceId.makeUnsafe("workspace-darwin-alias-race"),
            access: {
              ...input.access,
              primaryFolder: "/var/folders/omnimind-proof",
              executionTarget: {
                ...input.access.executionTarget,
                targetRef: "/var/folders/omnimind-proof",
              },
            },
          }),
        );
        expect(recovered.id).toBe(created.id);
        expect(recovered.access.primaryFolder).toBe("/private/var/folders/omnimind-proof");
      } finally {
        await system.dispose();
      }
    },
  );

  it("shares one Workspace across Conversations only when access and canonical root agree", async () => {
    const system = await makeSystem();
    const first = createInput("shared-first");
    const second = {
      ...createInput("shared-second"),
      workspaceId: first.workspaceId,
      workspace: first.workspace,
    } satisfies ProductCreateConversationInput;
    try {
      await system.run(system.controlPlane.createConversation(first));
      await system.run(system.controlPlane.createConversation(second));

      const shell = await system.run(system.controlPlane.getShellSnapshot());
      expect(shell.conversations).toHaveLength(2);
      expect(shell.conversations.map((conversation) => conversation.id)).toEqual(
        expect.arrayContaining([first.conversationId, second.conversationId]),
      );
      expect(
        shell.conversations.every((conversation) => conversation.workspaceId === first.workspaceId),
      ).toBe(true);
      const secondSnapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: second.conversationId,
        }),
      );
      expect(secondSnapshot.readModel.workspace).toMatchObject({
        id: first.workspaceId,
        access: {
          kind: "folder-backed",
          primaryFolder: "/workspace/shared-first",
        },
      });

      const differentRoot = {
        ...createInput("shared-root-conflict"),
        workspaceId: first.workspaceId,
      };
      await expect(
        system.run(system.controlPlane.createConversation(differentRoot)),
      ).rejects.toMatchObject({ code: "PRODUCT_WORKSPACE_ACCESS_CONFLICT" });

      const differentAccess = {
        ...createInput("shared-access-conflict", "chat"),
        workspaceId: first.workspaceId,
      };
      await expect(
        system.run(system.controlPlane.createConversation(differentAccess)),
      ).rejects.toMatchObject({ code: "PRODUCT_WORKSPACE_ACCESS_CONFLICT" });
      await expect(
        system.run(
          system.controlPlane.deleteWorkspace({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            mutationId: ProductMutationId.makeUnsafe("workspace-delete-not-empty"),
            workspaceId: first.workspaceId,
            expectedRevision: 1,
          }),
        ),
      ).rejects.toMatchObject({ code: "PRODUCT_WORKSPACE_NOT_EMPTY" });
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
          submitInput(conversation.conversationId, first.id, first.revision, "unresolved-one"),
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
            submitInput(conversation.conversationId, second.id, second.revision, "unresolved-two"),
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
          runtimeModelId: "faux-native/faux-thinker",
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
      const rechecked = await reopened.run(reopened.controlPlane.submitQueueItem(submitted));
      expect(rechecked.snapshot.readModel.runs[0]?.receipt.receipt.state).toBe("delivery_unknown");
      expect(attemptCount).toBe(0);
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
      expect(shell.facts.some((fact) => fact.change.kind === "workspace-summary")).toBe(true);
      expect(
        shell.facts.every(
          (fact) =>
            fact.change.kind === "workspace-summary" || fact.change.kind === "conversation-summary",
        ),
      ).toBe(true);
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
      const input = submitInput(
        conversation.conversationId,
        item.id,
        item.revision,
        "same-process-unknown",
      );
      const result = await system.run(system.controlPlane.submitQueueItem(input));
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
      const rechecked = await system.run(system.controlPlane.submitQueueItem(input));
      expect(rechecked.snapshot.readModel.runs[0]?.receipt.receipt.state).toBe("delivery_unknown");
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
      const input = submitInput(conversation.conversationId, item.id, item.revision, "pre-send");
      const submitted = await system.run(system.controlPlane.submitQueueItem(input));
      expect(submitted.snapshot.readModel.runs[0]?.receipt.receipt).toEqual({
        state: "pending",
        lastConfirmedBoundary: "pre-send",
      });
      expect(await system.run(system.controlPlane.inspectOutbox())).toEqual([
        expect.objectContaining({ state: "pending", sendBoundary: "pre-send", attemptCount: 1 }),
      ]);
      const retried = await system.run(system.controlPlane.submitQueueItem(input));
      expect(retried.snapshot.readModel.runs[0]?.receipt.receipt).toMatchObject({
        state: "rejected",
        code: "ENGINE_UNAVAILABLE",
      });
      expect(fixture.attemptCount()).toBe(2);

      const conflict = await system.run(
        system.controlPlane
          .submitQueueItem({
            ...input,
            receiptId: ProductOperationReceiptId.makeUnsafe("receipt-pre-send-mismatch"),
          })
          .pipe(Effect.flip),
      );
      expect(conflict.code).toBe("PRODUCT_SUBMIT_IDENTITY_CONFLICT");
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
          submitInput(conversation.conversationId, first.id, first.revision, "single-owner-one"),
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
      const submit = submitInput(conversation.conversationId, item.id, item.revision, "controls");
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
          submitInput(conversation.conversationId, queued.id, queued.revision, "snapshot-recovery"),
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
      expect(snapshot.readModel.entries.find((entry) => entry.role === "assistant")?.text).toBe(
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

  it("keeps multi-Group membership through archive and returns current state on mutation replay", async () => {
    const system = await makeSystem();
    try {
      const conversation = createInput("groups-membership");
      await system.run(system.controlPlane.createConversation(conversation));
      const alphaId = ProductGroupId.makeUnsafe("group-alpha");
      const betaId = ProductGroupId.makeUnsafe("group-beta");
      await system.run(
        system.controlPlane.createGroup({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          groupId: alphaId,
          name: "Alpha",
          color: "blue",
        }),
      );
      await system.run(
        system.controlPlane.createGroup({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          groupId: betaId,
          name: "Beta",
          color: "green",
        }),
      );
      const setInput = {
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        mutationId: ProductMutationId.makeUnsafe("mutation-groups-set"),
        expectedMemberships: [{ conversationId: conversation.conversationId, groupIds: [] }],
        groupIds: [alphaId],
      } as const;
      await system.run(system.controlPlane.setConversationGroups(setInput));
      const added = await system.run(
        system.controlPlane.addConversationGroups({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("mutation-groups-add"),
          expectedMemberships: [
            { conversationId: conversation.conversationId, groupIds: [alphaId] },
          ],
          groupIds: [betaId],
        }),
      );
      expect(
        added.groups
          .filter((group) => group.conversationIds.includes(conversation.conversationId))
          .map((group) => group.id),
      ).toEqual([alphaId, betaId]);

      const replayedSet = await system.run(system.controlPlane.setConversationGroups(setInput));
      expect(
        replayedSet.groups
          .filter((group) => group.conversationIds.includes(conversation.conversationId))
          .map((group) => group.id),
      ).toEqual([alphaId, betaId]);

      const archived = await system.run(
        system.controlPlane.archiveConversation({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("mutation-groups-archive"),
          conversationId: conversation.conversationId,
          expectedRevision: 1,
        }),
      );
      expect(archived.readModel.conversation.archivedAt).not.toBeNull();
      let shell = await system.run(system.controlPlane.getShellSnapshot());
      expect(
        shell.groups.every((group) => group.conversationIds.includes(conversation.conversationId)),
      ).toBe(true);
      await system.run(
        system.controlPlane.restoreConversation({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("mutation-groups-restore"),
          conversationId: conversation.conversationId,
          expectedRevision: 2,
        }),
      );
      shell = await system.run(system.controlPlane.getShellSnapshot());
      expect(
        shell.groups.every((group) => group.conversationIds.includes(conversation.conversationId)),
      ).toBe(true);
    } finally {
      await system.dispose();
    }
  });

  it("uses the complete active Group set as reorder CAS and never replays a stale order", async () => {
    const system = await makeSystem();
    try {
      const createGroup = (suffix: string, name: string) =>
        system.run(
          system.controlPlane.createGroup({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            groupId: ProductGroupId.makeUnsafe(`group-order-${suffix}`),
            name,
            color: "gray",
          }),
        );
      await createGroup("a", "Order A");
      await createGroup("b", "Order B");
      const beforeCreate = (await system.run(system.controlPlane.getShellSnapshot())).groups;
      const createdC = await createGroup("c", "Order C");
      const createConflict = await system.run(
        system.controlPlane
          .reorderGroups({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            mutationId: ProductMutationId.makeUnsafe("mutation-order-create-conflict"),
            expectedGroups: beforeCreate.map((group) => ({
              groupId: group.id,
              revision: group.revision,
            })),
            orderedGroupIds: beforeCreate.map((group) => group.id).reverse(),
          })
          .pipe(Effect.flip),
      );
      expect(createConflict).toMatchObject({
        code: "PRODUCT_GROUP_ORDER_CONFLICT",
        retryable: true,
      });

      const beforeDelete = (await system.run(system.controlPlane.getShellSnapshot())).groups;
      await system.run(
        system.controlPlane.deleteGroup({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("mutation-order-delete-c"),
          groupId: createdC.id,
          expectedRevision: createdC.revision,
        }),
      );
      const deleteConflict = await system.run(
        system.controlPlane
          .reorderGroups({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            mutationId: ProductMutationId.makeUnsafe("mutation-order-delete-conflict"),
            expectedGroups: beforeDelete.map((group) => ({
              groupId: group.id,
              revision: group.revision,
            })),
            orderedGroupIds: beforeDelete.map((group) => group.id).reverse(),
          })
          .pipe(Effect.flip),
      );
      expect(deleteConflict).toMatchObject({
        code: "PRODUCT_GROUP_ORDER_CONFLICT",
        retryable: true,
      });

      const initial = (await system.run(system.controlPlane.getShellSnapshot())).groups;
      const firstInput = {
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        mutationId: ProductMutationId.makeUnsafe("mutation-order-first"),
        expectedGroups: initial.map((group) => ({ groupId: group.id, revision: group.revision })),
        orderedGroupIds: initial.map((group) => group.id).reverse(),
      } as const;
      const first = await system.run(system.controlPlane.reorderGroups(firstInput));
      const second = await system.run(
        system.controlPlane.reorderGroups({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("mutation-order-second"),
          expectedGroups: first.map((group) => ({ groupId: group.id, revision: group.revision })),
          orderedGroupIds: first.map((group) => group.id).reverse(),
        }),
      );
      const replayedFirst = await system.run(system.controlPlane.reorderGroups(firstInput));
      expect(replayedFirst.map((group) => group.id)).toEqual(second.map((group) => group.id));
    } finally {
      await system.dispose();
    }
  });

  it("persists concrete Entry pins and validates marker text, digest, and overlap replacement", async () => {
    const system = await makeSystem();
    try {
      const conversation = createInput("entry-annotations");
      await system.run(system.controlPlane.createConversation(conversation));
      const item = await putQueueItem(system, conversation, "entry-annotations");
      const admission = submitInput(
        conversation.conversationId,
        item.id,
        item.revision,
        "entry-annotations",
      );
      await system.run(system.controlPlane.admitQueueItem(admission));
      let snapshot = await system.run(
        system.controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: conversation.conversationId,
        }),
      );
      const entry = snapshot.readModel.entries[0]!;
      const pinInput = {
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        mutationId: ProductMutationId.makeUnsafe("mutation-entry-pin"),
        conversationId: conversation.conversationId,
        expectedRevision: snapshot.readModel.conversation.revision,
        entryId: entry.id,
      } as const;
      snapshot = await system.run(system.controlPlane.addEntryPin(pinInput));
      expect(snapshot.readModel.entryPins).toEqual([
        expect.objectContaining({ entryId: entry.id, done: false, label: null }),
      ]);

      const selectedText = entry.text.slice(0, 7);
      snapshot = await system.run(
        system.controlPlane.addEntryMarker({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("mutation-entry-marker-one"),
          conversationId: conversation.conversationId,
          expectedRevision: snapshot.readModel.conversation.revision,
          entryId: entry.id,
          markerId: ProductEntryMarkerId.makeUnsafe("marker-one"),
          startOffset: 0,
          endOffset: 7,
          selectedText,
          selectedTextDigest: `sha256:${createHash("sha256").update(selectedText).digest("hex")}`,
          style: "highlight",
          color: "yellow",
        }),
      );
      expect(snapshot.readModel.entryMarkers.map((marker) => marker.id)).toEqual(["marker-one"]);

      const overlappingText = entry.text.slice(4, 11);
      snapshot = await system.run(
        system.controlPlane.addEntryMarker({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          mutationId: ProductMutationId.makeUnsafe("mutation-entry-marker-two"),
          conversationId: conversation.conversationId,
          expectedRevision: snapshot.readModel.conversation.revision,
          entryId: entry.id,
          markerId: ProductEntryMarkerId.makeUnsafe("marker-two"),
          startOffset: 4,
          endOffset: 11,
          selectedText: overlappingText,
          selectedTextDigest: `sha256:${createHash("sha256").update(overlappingText).digest("hex")}`,
          style: "underline",
          color: "blue",
        }),
      );
      expect(snapshot.readModel.entryMarkers.map((marker) => marker.id)).toEqual(["marker-two"]);

      const digestFailure = await system.run(
        system.controlPlane
          .addEntryMarker({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            mutationId: ProductMutationId.makeUnsafe("mutation-entry-marker-invalid"),
            conversationId: conversation.conversationId,
            expectedRevision: snapshot.readModel.conversation.revision,
            entryId: entry.id,
            markerId: ProductEntryMarkerId.makeUnsafe("marker-invalid"),
            startOffset: 0,
            endOffset: 7,
            selectedText,
            selectedTextDigest: `sha256:${"0".repeat(64)}`,
            style: "highlight",
            color: "pink",
          })
          .pipe(Effect.flip),
      );
      expect(digestFailure.code).toBe("PRODUCT_ENTRY_MARKER_DIGEST_INVALID");

      const replayedPin = await system.run(system.controlPlane.addEntryPin(pinInput));
      expect(replayedPin.readModel.entryMarkers.map((marker) => marker.id)).toEqual(["marker-two"]);
    } finally {
      await system.dispose();
    }
  });
});
