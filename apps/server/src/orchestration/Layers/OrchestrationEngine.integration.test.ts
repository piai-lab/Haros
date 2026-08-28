import {
  CheckpointRef,
  CommandId,
  DEFAULT_ENGINE_INTERACTION_MODE,
  EventId,
  MessageId,
  ProjectId,
  ThreadId,
  TurnId,
  type OrchestrationCommand,
  type OrchestrationEvent,
} from "@harnessos/contracts";
import { Effect, Layer, ManagedRuntime, Option, Queue, Stream } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { PersistenceSqlError } from "../../persistence/Errors.ts";
import { OrchestrationCommandReceiptRepositoryLive } from "../../persistence/Layers/OrchestrationCommandReceipts.ts";
import { OrchestrationEventStoreLive } from "../../persistence/Layers/OrchestrationEventStore.ts";
import { SqlitePersistenceMemory } from "../../persistence/Layers/Sqlite.ts";
import {
  OrchestrationEventStore,
  type OrchestrationEventStoreShape,
} from "../../persistence/Services/OrchestrationEventStore.ts";
import { ManagedAttachmentRepository } from "../../persistence/Services/ManagedAttachments.ts";
import { OrchestrationEngineLive } from "./OrchestrationEngine.ts";
import {
  ORCHESTRATION_PROJECTOR_NAMES,
  OrchestrationProjectionPipelineLive,
} from "./ProjectionPipeline.ts";
import { OrchestrationProjectionSnapshotQueryLive } from "./ProjectionSnapshotQuery.ts";
import { OrchestrationEngineService } from "../Services/OrchestrationEngine.ts";
import {
  OrchestrationProjectionPipeline,
  type OrchestrationProjectionPipelineShape,
} from "../Services/ProjectionPipeline.ts";
import { ServerConfig } from "../../config.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";

/**
 * Command ids whose fingerprinting throws synchronously, standing in for any
 * synchronous defect raised while the worker builds a command's pipeline.
 */
const fingerprintPoison = vi.hoisted(() => new Set<string>());

vi.mock("../commandFingerprint.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../commandFingerprint.ts")>();
  return {
    ...actual,
    fingerprintOrchestrationCommand: (command: OrchestrationCommand) => {
      if (fingerprintPoison.has(command.commandId)) {
        throw new TypeError("poisoned command fingerprint");
      }
      return actual.fingerprintOrchestrationCommand(command);
    },
  };
});

const asProjectId = (value: string): ProjectId => ProjectId.makeUnsafe(value);
const asMessageId = (value: string): MessageId => MessageId.makeUnsafe(value);

const makeThreadEventReadMethods = (
  events: ReadonlyArray<OrchestrationEvent>,
): Pick<
  OrchestrationEventStoreShape,
  "getThreadHighWaterSequence" | "readThreadEvents" | "readThreadEventsFromSequence"
> => ({
  getThreadHighWaterSequence: (threadId) =>
    Effect.succeed(
      events
        .filter((event) => event.aggregateKind === "thread" && event.aggregateId === threadId)
        .at(-1)?.sequence ?? 0,
    ),
  readThreadEvents: (input) =>
    Effect.succeed(
      events
        .filter(
          (event) =>
            event.aggregateKind === "thread" &&
            event.aggregateId === input.threadId &&
            event.sequence <= input.throughSequenceInclusive &&
            event.sequence < (input.beforeSequenceExclusive ?? Number.MAX_SAFE_INTEGER) &&
            (input.eventTypes === undefined || input.eventTypes.includes(event.type)),
        )
        .toSorted((left, right) => right.sequence - left.sequence)
        .slice(0, input.limit),
    ),
  readThreadEventsFromSequence: (
    threadId,
    sequenceExclusive,
    limit = 1_000,
    throughSequenceInclusive = Number.MAX_SAFE_INTEGER,
    eventTypes,
  ) =>
    Stream.fromIterable(
      events
        .filter(
          (event) =>
            event.aggregateKind === "thread" &&
            event.aggregateId === threadId &&
            event.sequence > sequenceExclusive &&
            event.sequence <= throughSequenceInclusive &&
            (eventTypes === undefined || eventTypes.includes(event.type)),
        )
        .slice(0, limit),
    ),
});
const asTurnId = (value: string): TurnId => TurnId.makeUnsafe(value);
const asCheckpointRef = (value: string): CheckpointRef => CheckpointRef.makeUnsafe(value);

const TestServerConfigLayer = ServerConfig.layerTest(process.cwd(), {
  prefix: "harnessos-orchestration-engine-test-",
});

async function createOrchestrationSystem() {
  const ServerConfigLayer = TestServerConfigLayer;
  const orchestrationLayer = OrchestrationEngineLive.pipe(
    Layer.provide(OrchestrationProjectionPipelineLive),
    Layer.provide(OrchestrationProjectionSnapshotQueryLive),
    Layer.provide(OrchestrationEventStoreLive),
    Layer.provide(OrchestrationCommandReceiptRepositoryLive),
    Layer.provide(SqlitePersistenceMemory),
    Layer.provideMerge(ServerConfigLayer),
    Layer.provideMerge(NodeServices.layer),
  );
  const runtime = ManagedRuntime.make(orchestrationLayer);
  const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));
  const managedAttachmentRepository = await runtime.runPromise(
    Effect.service(ManagedAttachmentRepository),
  );
  const serverConfig = await runtime.runPromise(Effect.service(ServerConfig));
  return {
    engine,
    managedAttachmentRepository,
    serverConfig,
    run: <A, E>(effect: Effect.Effect<A, E>) => runtime.runPromise(effect),
    dispose: () => runtime.dispose(),
  };
}

function now() {
  return new Date().toISOString();
}

describe("OrchestrationEngine", () => {
  it("quiesces normal admission while draining reserved lifecycle commands", async () => {
    const system = await createOrchestrationSystem();
    const createdAt = now();
    const threadId = ThreadId.makeUnsafe("thread-engine-quiesce");

    await system.run(
      system.engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-engine-quiesce-project"),
        projectId: asProjectId("project-engine-quiesce"),
        title: "Engine quiesce",
        workspaceRoot: "/tmp/engine-quiesce",
        defaultEngineSelection: null,
        createdAt,
      }),
    );
    await system.run(
      system.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-engine-quiesce-thread"),
        threadId,
        projectId: asProjectId("project-engine-quiesce"),
        title: "Engine quiesce thread",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );

    await system.run(system.engine.quiesce);
    await expect(
      system.run(
        system.engine.dispatch({
          type: "thread.meta.update",
          commandId: CommandId.makeUnsafe("cmd-engine-quiesce-normal"),
          threadId,
          title: "Rejected after quiesce",
        }),
      ),
    ).rejects.toMatchObject({
      _tag: "OrchestrationCommandAdmissionError",
      reason: "stopped",
    });

    await expect(
      system.run(
        system.engine.dispatch({
          type: "thread.activity.append",
          commandId: CommandId.makeUnsafe("cmd-engine-quiesce-runtime-fact"),
          threadId,
          activity: {
            id: EventId.makeUnsafe("evt-engine-quiesce-runtime-fact"),
            tone: "info",
            kind: "user-input.resolved",
            summary: "User input unavailable",
            payload: {
              requestId: "req-engine-quiesce-runtime-fact",
              settlement: { status: "unavailable" },
            },
            turnId: null,
            createdAt,
          },
          createdAt,
        }),
      ),
    ).rejects.toMatchObject({
      _tag: "OrchestrationCommandAdmissionError",
      reason: "stopped",
    });

    await expect(
      system.run(
        system.engine.dispatch(
          {
            type: "thread.activity.append",
            commandId: CommandId.makeUnsafe("cmd-engine-quiesce-trusted-runtime-fact"),
            threadId,
            activity: {
              id: EventId.makeUnsafe("evt-engine-quiesce-trusted-runtime-fact"),
              tone: "info",
              kind: "user-input.resolved",
              summary: "User input unavailable",
              payload: {
                requestId: "req-engine-quiesce-trusted-runtime-fact",
                settlement: { status: "unavailable" },
              },
              turnId: null,
              createdAt,
            },
            createdAt,
          },
          { admission: "in-flight-runtime-fact" },
        ),
      ),
    ).resolves.toMatchObject({ sequence: expect.any(Number) });

    // A turn start takes the priority `user` lane, but priority is not
    // admissibility: the WebSocket keeps serving while the engine quiesces, and
    // starting a engine turn here would spawn a session the shutdown fences
    // moments later, orphaning the turn.
    await expect(
      system.run(
        system.engine.dispatch({
          type: "thread.turn.start",
          commandId: CommandId.makeUnsafe("cmd-engine-quiesce-turn-start"),
          threadId,
          message: {
            messageId: MessageId.makeUnsafe("msg-engine-quiesce-turn-start"),
            role: "user",
            text: "Rejected after quiesce",
            attachments: [],
          },
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          runtimeMode: "approval-required",
          createdAt,
        }),
      ),
    ).rejects.toMatchObject({
      _tag: "OrchestrationCommandAdmissionError",
      reason: "stopped",
    });

    await expect(
      system.run(
        system.engine.dispatch({
          type: "thread.session.stop",
          commandId: CommandId.makeUnsafe("cmd-engine-quiesce-control"),
          threadId,
          createdAt,
        }),
      ),
    ).resolves.toMatchObject({ sequence: expect.any(Number) });
    await system.run(system.engine.drain);
    await system.run(system.engine.stop);

    await expect(
      system.run(
        system.engine.dispatch({
          type: "thread.turn.interrupt",
          commandId: CommandId.makeUnsafe("cmd-engine-stopped-control"),
          threadId,
          createdAt,
        }),
      ),
    ).rejects.toMatchObject({
      _tag: "OrchestrationCommandAdmissionError",
      reason: "stopped",
    });

    await system.dispose();
  });

  it("returns the original result for an equal retry and rejects unequal command-ID reuse", async () => {
    const system = await createOrchestrationSystem();
    const command = {
      type: "project.create" as const,
      commandId: CommandId.makeUnsafe("cmd-fingerprint-retry"),
      projectId: asProjectId("project-fingerprint-retry"),
      title: "Fingerprint project",
      workspaceRoot: "/tmp/project-fingerprint-retry",
      defaultEngineSelection: null,
      createdAt: "2026-07-14T00:00:00.000Z",
    };

    const first = await system.run(system.engine.dispatch(command));
    await expect(system.run(system.engine.dispatch({ ...command }))).resolves.toEqual(first);
    await expect(
      system.run(
        system.engine.dispatch({
          ...command,
          title: "Different command content",
        }),
      ),
    ).rejects.toMatchObject({
      _tag: "OrchestrationCommandIdentityCollisionError",
      commandId: command.commandId,
    });

    const events = await system.run(Stream.runCollect(system.engine.readEvents(0)));
    expect(
      Array.from(events).filter((event) => event.commandId === command.commandId),
    ).toHaveLength(1);
    await system.dispose();
  });

  it("returns deterministic read models for repeated reads", async () => {
    const createdAt = now();
    const system = await createOrchestrationSystem();
    const { engine } = system;

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-1-create"),
        projectId: asProjectId("project-1"),
        title: "Project 1",
        workspaceRoot: "/tmp/project-1",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-1-create"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Thread",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-1"),
          role: "user",
          text: "hello",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt,
      }),
    );

    const readModelA = await system.run(engine.getReadModel());
    const readModelB = await system.run(engine.getReadModel());
    expect(readModelB).toEqual(readModelA);
    await system.dispose();
  });

  it("returns the original sequence for equal retries and rejects unequal command-id reuse", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const command = {
      type: "project.create" as const,
      commandId: CommandId.makeUnsafe("cmd-project-command-identity"),
      projectId: asProjectId("project-command-identity"),
      title: "Original identity",
      workspaceRoot: "/tmp/project-command-identity",
      defaultEngineSelection: null,
      createdAt: now(),
    };

    const accepted = await system.run(engine.dispatch(command));
    await expect(system.run(engine.dispatch(command))).resolves.toEqual(accepted);
    await expect(
      system.run(engine.dispatch({ ...command, title: "Different identity" })),
    ).rejects.toThrow("Command identity collision");

    const events = await system.run(
      Stream.runCollect(engine.readEvents(0)).pipe(Effect.map((chunk) => Array.from(chunk))),
    );
    expect(events).toHaveLength(1);
    expect((await system.run(engine.getReadModel())).projects[0]?.title).toBe("Original identity");
    await system.dispose();
  });

  it("claims managed attachments atomically and rejects attachment changes on an accepted retry", async () => {
    const createdAt = now();
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const threadId = ThreadId.makeUnsafe("thread-managed-attachment");
    const commandId = CommandId.makeUnsafe("cmd-managed-attachment-turn");
    const messageId = asMessageId("msg-managed-attachment");
    const principal = { ownerKind: "session" as const, ownerId: "session-a" };

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-managed-attachment-project"),
        projectId: asProjectId("project-managed-attachment"),
        title: "Managed attachment project",
        workspaceRoot: "/tmp/project-managed-attachment",
        defaultEngineSelection: { engine: "codex", model: "gpt-5-codex" },
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-managed-attachment-thread"),
        threadId,
        projectId: asProjectId("project-managed-attachment"),
        title: "Managed attachment thread",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );

    await system.run(
      engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-managed-attachment-session-running"),
        threadId,
        session: {
          threadId,
          status: "running",
          engine: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-managed-attachment-active"),
          lastError: null,
          updatedAt: createdAt,
        },
        createdAt,
      }),
    );

    const repository = system.managedAttachmentRepository;
    const stage = async (attachmentId: string) => {
      const reserved = await system.run(
        repository.reserve({
          attachmentId,
          ownerThreadId: threadId,
          ownerKind: principal.ownerKind,
          ownerId: principal.ownerId,
          kind: "image",
          originalName: `${attachmentId}.png`,
          mimeType: "image/png",
          reservedBytes: 1,
          relativePath: `objects/aa/${attachmentId}.png`,
          now: createdAt,
        }),
      );
      expect(reserved.status).toBe("reserved");
      await system.run(
        repository.finalizeStaged({
          attachmentId,
          ownerThreadId: threadId,
          ownerKind: principal.ownerKind,
          ownerId: principal.ownerId,
          sizeBytes: 1,
          sha256: "a".repeat(64),
          stagingExpiresAt: new Date(Date.now() + 60_000).toISOString(),
          now: createdAt,
        }),
      );
    };
    const firstAttachmentId = "att_v2_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const secondAttachmentId = "att_v2_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    await stage(firstAttachmentId);
    await stage(secondAttachmentId);

    const command = {
      type: "thread.turn.start" as const,
      commandId,
      threadId,
      message: {
        messageId,
        role: "user" as const,
        text: "inspect",
        attachments: [
          {
            type: "image" as const,
            id: firstAttachmentId,
            name: "client-value-is-not-authoritative.png",
            mimeType: "image/png",
            sizeBytes: 1,
          },
        ],
      },
      dispatchMode: "steer" as const,
      interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      runtimeMode: "approval-required" as const,
      createdAt,
    };
    const accepted = await system.run(engine.dispatch(command, { attachmentPrincipal: principal }));
    expect(accepted.steeringDisposition).toBe("native");
    await expect(
      system.run(engine.dispatch(command, { attachmentPrincipal: principal })),
    ).resolves.toEqual(accepted);

    const editResendClaim = await system.run(
      repository.claimForAcceptedTurn({
        attachmentIds: [firstAttachmentId],
        ownerThreadId: threadId,
        ownerKind: principal.ownerKind,
        ownerId: principal.ownerId,
        commandId: "cmd-attachment-edit-resend",
        messageId,
        now: new Date().toISOString(),
      }),
    );
    expect(editResendClaim.status).toBe("claimed");
    await expect(
      system.run(engine.dispatch(command, { attachmentPrincipal: principal })),
    ).resolves.toEqual(accepted);

    await expect(
      system.run(
        engine.dispatch(
          {
            ...command,
            message: {
              ...command.message,
              attachments: [{ ...command.message.attachments[0]!, id: secondAttachmentId }],
            },
          },
          { attachmentPrincipal: principal },
        ),
      ),
    ).rejects.toThrow("Command identity collision");

    const claimed = await system.run(repository.findClaimedForCommand({ commandId }));
    expect(claimed.map((attachment) => attachment.attachmentId)).toEqual([firstAttachmentId]);
    await system.dispose();
  });

  it("restores the exact fallback steering disposition on an accepted retry", async () => {
    const createdAt = now();
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const projectId = asProjectId("project-fallback-steer-retry");
    const threadId = ThreadId.makeUnsafe("thread-fallback-steer-retry");

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-fallback-steer-project"),
        projectId,
        title: "Fallback steer retry",
        workspaceRoot: "/tmp/project-fallback-steer-retry",
        defaultEngineSelection: { engine: "cursor", model: "cursor-default" },
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-fallback-steer-thread"),
        threadId,
        projectId,
        title: "Fallback steer retry",
        engineSelection: { engine: "cursor", model: "cursor-default" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-fallback-steer-session"),
        threadId,
        session: {
          threadId,
          status: "running",
          engine: "cursor",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-fallback-steer-active"),
          lastError: null,
          updatedAt: createdAt,
        },
        createdAt,
      }),
    );

    const command = {
      type: "thread.turn.start" as const,
      commandId: CommandId.makeUnsafe("cmd-fallback-steer-turn"),
      threadId,
      message: {
        messageId: asMessageId("msg-fallback-steer"),
        role: "user" as const,
        text: "redirect",
        attachments: [],
      },
      dispatchMode: "steer" as const,
      interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      runtimeMode: "approval-required" as const,
      createdAt,
    };
    const accepted = await system.run(engine.dispatch(command));
    expect(accepted.steeringDisposition).toBe("queue-interrupt-redispatch");
    await expect(system.run(engine.dispatch(command))).resolves.toEqual(accepted);

    await system.dispose();
  });

  it("derives Chat-to-Agent history on the server and keeps attachment failures partial", async () => {
    const system = await createOrchestrationSystem();
    const { engine, managedAttachmentRepository: repository, serverConfig } = system;
    const createdAt = "2026-08-21T08:00:00.000Z";
    const sourceProjectId = asProjectId("project-chat-fork-source");
    const targetProjectId = asProjectId("project-chat-fork-target");
    const invalidTargetProjectId = asProjectId("project-chat-fork-invalid-target");
    const sourceThreadId = ThreadId.makeUnsafe("thread-chat-fork-source");
    const targetThreadId = ThreadId.makeUnsafe("thread-chat-fork-target");
    const sourceMessageId = asMessageId("msg-chat-fork-source-user");
    const principal = { ownerKind: "session" as const, ownerId: "chat-fork-session" };

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-chat-fork-source-project"),
        projectId: sourceProjectId,
        kind: "chat",
        title: "Chat",
        workspaceRoot: path.join(serverConfig.chatWorkspaceRoot, "fork-source"),
        defaultEngineSelection: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-chat-fork-invalid-target-project"),
        projectId: invalidTargetProjectId,
        kind: "chat",
        title: "Invalid target",
        workspaceRoot: path.join(serverConfig.chatWorkspaceRoot, "fork-invalid-target"),
        defaultEngineSelection: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-chat-fork-target-project"),
        projectId: targetProjectId,
        kind: "project",
        title: "Target",
        workspaceRoot: path.join(serverConfig.cwd, "fork-target"),
        defaultEngineSelection: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-chat-fork-source-thread"),
        threadId: sourceThreadId,
        projectId: sourceProjectId,
        title: "Canonical Chat title",
        engineSelection: { engine: "oa", model: "local/model" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );

    const stageSource = async (input: {
      readonly attachmentId: string;
      readonly name: string;
      readonly contents: string;
      readonly writeBytes: boolean;
    }) => {
      const relativePath = `objects/source/${input.attachmentId}.txt`;
      const reserved = await system.run(
        repository.reserve({
          attachmentId: input.attachmentId,
          ownerThreadId: sourceThreadId,
          ownerKind: principal.ownerKind,
          ownerId: principal.ownerId,
          kind: "file",
          originalName: input.name,
          mimeType: "text/plain",
          reservedBytes: Buffer.byteLength(input.contents),
          relativePath,
          now: createdAt,
        }),
      );
      expect(reserved.status).toBe("reserved");
      if (input.writeBytes) {
        const absolutePath = path.join(serverConfig.attachmentsDir, relativePath);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, input.contents);
      }
      const finalized = await system.run(
        repository.finalizeStaged({
          attachmentId: input.attachmentId,
          ownerThreadId: sourceThreadId,
          ownerKind: principal.ownerKind,
          ownerId: principal.ownerId,
          sizeBytes: Buffer.byteLength(input.contents),
          sha256: createHash("sha256").update(input.contents).digest("hex"),
          stagingExpiresAt: new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
          now: createdAt,
        }),
      );
      expect(finalized.status).toBe("staged");
      return {
        type: "file" as const,
        id: input.attachmentId,
        name: input.name,
        mimeType: "text/plain",
        sizeBytes: Buffer.byteLength(input.contents),
      };
    };
    const readable = await stageSource({
      attachmentId: "att_v2_11111111111111111111111111111111",
      name: "readable.txt",
      contents: "readable source",
      writeBytes: true,
    });
    const missing = await stageSource({
      attachmentId: "att_v2_22222222222222222222222222222222",
      name: "missing.txt",
      contents: "missing source",
      writeBytes: false,
    });
    const empty = await stageSource({
      attachmentId: "att_v2_33333333333333333333333333333333",
      name: "empty.txt",
      contents: "",
      writeBytes: true,
    });
    await system.run(
      engine.dispatch(
        {
          type: "thread.turn.start",
          commandId: CommandId.makeUnsafe("cmd-chat-fork-source-turn"),
          threadId: sourceThreadId,
          message: {
            messageId: sourceMessageId,
            role: "user",
            text: "Canonical user text",
            attachments: [
              {
                type: "assistant-selection",
                id: "selection-source-missing-assistant",
                assistantMessageId: asMessageId("msg-chat-fork-not-imported"),
                text: "Selection whose assistant message is unavailable",
              },
              readable,
              {
                type: "assistant-selection",
                id: "selection-source-assistant",
                assistantMessageId: asMessageId("msg-chat-fork-source-assistant"),
                text: "Selected assistant context",
              },
              missing,
              empty,
            ],
            mentions: [
              {
                name: "External folder",
                path: "/tmp/external-reference",
                resourceKind: "directory",
              },
            ],
          },
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          runtimeMode: "full-access",
          createdAt,
        },
        { attachmentPrincipal: principal },
      ),
    );
    await system.run(
      engine.dispatch({
        type: "thread.messages.import",
        commandId: CommandId.makeUnsafe("cmd-chat-fork-source-assistant"),
        threadId: sourceThreadId,
        messages: [
          {
            messageId: asMessageId("msg-chat-fork-source-assistant"),
            role: "assistant",
            text: "Canonical assistant text",
            createdAt: "2026-08-21T08:00:01.000Z",
            updatedAt: "2026-08-21T08:00:01.000Z",
          },
        ],
        createdAt: "2026-08-21T08:00:01.000Z",
      }),
    );

    const forkCommand = {
      type: "thread.fork.create" as const,
      commandId: CommandId.makeUnsafe("cmd-chat-to-agent-fork"),
      threadId: targetThreadId,
      sourceThreadId,
      projectId: targetProjectId,
      title: "Client supplied title must not win",
      engineSelection: { engine: "oa" as const, model: "local/model" },
      runtimeMode: "full-access" as const,
      interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      envMode: "local" as const,
      branch: null,
      worktreePath: null,
      workingDirectory: null,
      associatedWorktreePath: null,
      associatedWorktreeBranch: null,
      associatedWorktreeRef: null,
      createBranchFlowCompleted: false,
      sidechatSourceThreadId: null,
      forkScope: {
        kind: "chat-to-agent" as const,
        bootstrapStatus: "pending" as const,
      },
      importedMessages: [],
      createdAt: "2026-08-21T08:00:02.000Z",
    };
    const rejectedCommandId = CommandId.makeUnsafe("cmd-chat-to-agent-invalid-target");
    const rejectedTargetThreadId = ThreadId.makeUnsafe("thread-chat-fork-invalid-target");
    const findClaimedById = vi.spyOn(repository, "findClaimedById");
    await expect(
      system.run(
        engine.dispatch(
          {
            ...forkCommand,
            commandId: rejectedCommandId,
            threadId: rejectedTargetThreadId,
            projectId: invalidTargetProjectId,
          },
          { attachmentPrincipal: principal },
        ),
      ),
    ).rejects.toThrow(/requires a Chat source and a Project target/);
    expect(findClaimedById).not.toHaveBeenCalled();
    findClaimedById.mockRestore();
    const rejectedCloneId = `att_v2_${createHash("sha256")
      .update("harnessos:chat-to-agent:attachment:v1\0")
      .update(rejectedCommandId)
      .update("\0")
      .update(sourceMessageId)
      .update("\0")
      .update(readable.id)
      .digest("hex")
      .slice(0, 32)}`;
    expect(
      Option.isNone(await system.run(repository.findById({ attachmentId: rejectedCloneId }))),
    ).toBe(true);

    const accepted = await system.run(
      engine.dispatch(forkCommand, { attachmentPrincipal: principal }),
    );
    await expect(
      system.run(engine.dispatch(forkCommand, { attachmentPrincipal: principal })),
    ).resolves.toEqual(accepted);

    const target = (await system.run(engine.getReadModel())).threads.find(
      (thread) => thread.id === targetThreadId,
    );
    expect(target).toBeDefined();
    expect(target?.title).not.toBe(forkCommand.title);
    expect(target?.messages.map(({ text }) => text)).toEqual([
      "Canonical user text",
      "Canonical assistant text",
    ]);
    expect(target?.messages[0]?.mentions).toEqual([
      {
        name: "External folder",
        path: "/tmp/external-reference",
        resourceKind: "directory",
      },
    ]);
    expect(target?.messages[0]?.attachments).toHaveLength(3);
    expect(target?.messages[0]?.attachments?.[0]).toMatchObject({
      type: "file",
      name: "readable.txt",
    });
    expect(target?.messages[0]?.attachments?.[0]?.id).not.toBe(readable.id);
    expect(target?.messages[0]?.attachments?.[1]).toMatchObject({
      type: "assistant-selection",
      assistantMessageId: target?.messages[1]?.id,
    });
    expect(target?.messages[0]?.attachments?.[2]).toMatchObject({
      type: "file",
      name: "empty.txt",
      sizeBytes: 0,
    });
    const clonedId = target?.messages[0]?.attachments?.[0]?.id;
    expect(clonedId).toBeDefined();
    const cloned = await system.run(repository.findClaimedById({ attachmentId: clonedId! }));
    expect(Option.getOrNull(cloned)).toMatchObject({
      ownerThreadId: targetThreadId,
      claimMessageId: target?.messages[0]?.id,
      claimCommandId: forkCommand.commandId,
      state: "claimed",
    });
    expect(
      target?.activities.filter(
        (activity) => activity.kind === "chat-to-agent.attachments.partial",
      ),
    ).toEqual([
      expect.objectContaining({
        payload: {
          failures: [
            expect.objectContaining({
              name: "missing.txt",
              reason: "unreadable",
              attachmentIndex: 3,
            }),
          ],
        },
      }),
    ]);

    await expect(
      system.run(
        engine.dispatch(
          {
            ...forkCommand,
            commandId: CommandId.makeUnsafe("cmd-chat-to-agent-client-history"),
            threadId: ThreadId.makeUnsafe("thread-chat-fork-forged"),
            importedMessages: [
              {
                messageId: asMessageId("msg-forged"),
                role: "user",
                text: "Forged client history",
                createdAt,
                updatedAt: createdAt,
              },
            ],
          },
          { attachmentPrincipal: principal },
        ),
      ),
    ).rejects.toThrow(/server-owned/);

    await system.dispose();
  });

  it("keeps a large Chat-to-Agent command constant-size and imports canonical history within bounded time and memory", async () => {
    const system = await createOrchestrationSystem();
    const { engine, serverConfig } = system;
    const createdAt = "2026-08-21T09:00:00.000Z";
    const sourceProjectId = asProjectId("project-large-chat-source");
    const targetProjectId = asProjectId("project-large-chat-target");
    const sourceThreadId = ThreadId.makeUnsafe("thread-large-chat-source");
    const targetThreadId = ThreadId.makeUnsafe("thread-large-chat-target");
    const messageCount = 500;

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-large-chat-source-project"),
        projectId: sourceProjectId,
        kind: "chat",
        title: "Large Chat",
        workspaceRoot: path.join(serverConfig.chatWorkspaceRoot, "large-fork-source"),
        defaultEngineSelection: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-large-chat-target-project"),
        projectId: targetProjectId,
        kind: "project",
        title: "Large Agent Target",
        workspaceRoot: path.join(serverConfig.cwd, "large-fork-target"),
        defaultEngineSelection: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-large-chat-source-thread"),
        threadId: sourceThreadId,
        projectId: sourceProjectId,
        title: "Large canonical Chat",
        engineSelection: { engine: "oa", model: "local/model" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.messages.import",
        commandId: CommandId.makeUnsafe("cmd-large-chat-source-messages"),
        threadId: sourceThreadId,
        messages: Array.from({ length: messageCount }, (_, index) => ({
          messageId: asMessageId(`msg-large-chat-source-${index}`),
          role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
          text: `LARGE-CHAT-${index} ${"context ".repeat(120)}`,
          mentions:
            index % 25 === 0
              ? [
                  {
                    name: `reference-${index}`,
                    path: `/tmp/reference-${index}`,
                    resourceKind: "directory" as const,
                  },
                ]
              : undefined,
          createdAt: new Date(Date.parse(createdAt) + index).toISOString(),
          updatedAt: new Date(Date.parse(createdAt) + index).toISOString(),
        })),
        createdAt,
      }),
    );

    const forkCommand = {
      type: "thread.fork.create" as const,
      commandId: CommandId.makeUnsafe("cmd-large-chat-to-agent-fork"),
      threadId: targetThreadId,
      sourceThreadId,
      projectId: targetProjectId,
      title: "Client title",
      engineSelection: { engine: "oa" as const, model: "local/model" },
      runtimeMode: "full-access" as const,
      interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      envMode: "local" as const,
      branch: null,
      worktreePath: null,
      workingDirectory: null,
      associatedWorktreePath: null,
      associatedWorktreeBranch: null,
      associatedWorktreeRef: null,
      createBranchFlowCompleted: false,
      sidechatSourceThreadId: null,
      forkScope: {
        kind: "chat-to-agent" as const,
        bootstrapStatus: "pending" as const,
      },
      importedMessages: [],
      createdAt,
    };
    expect(JSON.stringify(forkCommand).length).toBeLessThan(2_000);

    const heapBefore = process.memoryUsage().heapUsed;
    const startedAt = performance.now();
    await system.run(engine.dispatch(forkCommand));
    const elapsedMs = performance.now() - startedAt;
    const heapGrowth = Math.max(0, process.memoryUsage().heapUsed - heapBefore);

    const target = (await system.run(engine.getReadModel())).threads.find(
      (thread) => thread.id === targetThreadId,
    );
    expect(target?.messages).toHaveLength(messageCount);
    expect(target?.messages.at(-1)?.text).toContain("LARGE-CHAT-499");
    expect(elapsedMs).toBeLessThan(8_000);
    expect(heapGrowth).toBeLessThan(192 * 1024 * 1024);

    await system.dispose();
  }, 15_000);

  it("replays append-only events from sequence", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const createdAt = now();

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-replay-create"),
        projectId: asProjectId("project-replay"),
        title: "Replay Project",
        workspaceRoot: "/tmp/project-replay",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-replay-create"),
        threadId: ThreadId.makeUnsafe("thread-replay"),
        projectId: asProjectId("project-replay"),
        title: "replay",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.delete",
        commandId: CommandId.makeUnsafe("cmd-thread-replay-delete"),
        threadId: ThreadId.makeUnsafe("thread-replay"),
      }),
    );

    const events = await system.run(
      Stream.runCollect(engine.readEvents(0)).pipe(
        Effect.map((chunk): OrchestrationEvent[] => Array.from(chunk)),
      ),
    );
    expect(events.map((event) => event.type)).toEqual([
      "project.created",
      "thread.created",
      "thread.deleted",
    ]);
    await system.dispose();
  });

  it("streams persisted domain events in order", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const createdAt = now();

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-stream-create"),
        projectId: asProjectId("project-stream"),
        title: "Stream Project",
        workspaceRoot: "/tmp/project-stream",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );

    const eventTypes: string[] = [];
    await system.run(
      Effect.gen(function* () {
        const eventQueue = yield* Queue.unbounded<OrchestrationEvent>();
        yield* Effect.forkScoped(
          Stream.take(engine.streamDomainEvents, 2).pipe(
            Stream.runForEach((event) => Queue.offer(eventQueue, event).pipe(Effect.asVoid)),
          ),
        );
        yield* Effect.sleep("10 millis");
        yield* engine.dispatch({
          type: "thread.create",
          commandId: CommandId.makeUnsafe("cmd-stream-thread-create"),
          threadId: ThreadId.makeUnsafe("thread-stream"),
          projectId: asProjectId("project-stream"),
          title: "domain-stream",
          engineSelection: {
            engine: "codex",
            model: "gpt-5-codex",
          },
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          runtimeMode: "approval-required",
          branch: null,
          worktreePath: null,
          createdAt,
        });
        yield* engine.dispatch({
          type: "thread.meta.update",
          commandId: CommandId.makeUnsafe("cmd-stream-thread-update"),
          threadId: ThreadId.makeUnsafe("thread-stream"),
          title: "domain-stream-updated",
        });
        eventTypes.push((yield* Queue.take(eventQueue)).type);
        eventTypes.push((yield* Queue.take(eventQueue)).type);
      }).pipe(Effect.scoped),
    );

    expect(eventTypes).toEqual(["thread.created", "thread.meta-updated"]);
    await system.dispose();
  });

  it("stores completed checkpoint summaries even when no files changed", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const createdAt = now();

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-turn-diff-create"),
        projectId: asProjectId("project-turn-diff"),
        title: "Turn Diff Project",
        workspaceRoot: "/tmp/project-turn-diff",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-turn-diff-create"),
        threadId: ThreadId.makeUnsafe("thread-turn-diff"),
        projectId: asProjectId("project-turn-diff"),
        title: "Turn diff thread",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.turn.diff.complete",
        commandId: CommandId.makeUnsafe("cmd-turn-diff-complete"),
        threadId: ThreadId.makeUnsafe("thread-turn-diff"),
        turnId: asTurnId("turn-1"),
        completedAt: createdAt,
        checkpointRef: asCheckpointRef("refs/harnessos/checkpoints/thread-turn-diff/turn/1"),
        status: "ready",
        files: [],
        checkpointTurnCount: 1,
        createdAt,
      }),
    );

    const thread = (await system.run(engine.getReadModel())).threads.find(
      (entry) => entry.id === "thread-turn-diff",
    );
    expect(thread?.checkpoints).toEqual([
      {
        turnId: asTurnId("turn-1"),
        checkpointTurnCount: 1,
        checkpointRef: asCheckpointRef("refs/harnessos/checkpoints/thread-turn-diff/turn/1"),
        status: "ready",
        files: [],
        assistantMessageId: null,
        completedAt: createdAt,
      },
    ]);
    await system.dispose();
  });

  it("keeps processing queued commands after a storage failure", async () => {
    type StoredEvent =
      ReturnType<OrchestrationEventStoreShape["append"]> extends Effect.Effect<infer A, any, any>
        ? A
        : never;
    const events: StoredEvent[] = [];
    let nextSequence = 1;
    let shouldFailFirstAppend = true;

    const flakyStore: OrchestrationEventStoreShape = {
      append(event) {
        if (shouldFailFirstAppend && event.commandId === CommandId.makeUnsafe("cmd-flaky-1")) {
          shouldFailFirstAppend = false;
          return Effect.fail(
            new PersistenceSqlError({
              operation: "test.append",
              detail: "append failed",
            }),
          );
        }
        const savedEvent = {
          ...event,
          sequence: nextSequence,
        } as StoredEvent;
        nextSequence += 1;
        events.push(savedEvent);
        return Effect.succeed(savedEvent);
      },
      getHighWaterSequence() {
        return Effect.succeed(events.at(-1)?.sequence ?? 0);
      },
      ...makeThreadEventReadMethods(events),
      readFromSequence(sequenceExclusive) {
        return Stream.fromIterable(events.filter((event) => event.sequence > sequenceExclusive));
      },
      readAll() {
        return Stream.fromIterable(events);
      },
    };

    const runtime = ManagedRuntime.make(
      OrchestrationEngineLive.pipe(
        Layer.provide(OrchestrationProjectionPipelineLive),
        Layer.provide(OrchestrationProjectionSnapshotQueryLive),
        Layer.provide(Layer.succeed(OrchestrationEventStore, flakyStore)),
        Layer.provide(OrchestrationCommandReceiptRepositoryLive),
        Layer.provide(SqlitePersistenceMemory),
        Layer.provideMerge(TestServerConfigLayer),
        Layer.provideMerge(NodeServices.layer),
      ),
    );
    const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));
    const createdAt = now();

    await runtime.runPromise(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-flaky-create"),
        projectId: asProjectId("project-flaky"),
        title: "Flaky Project",
        workspaceRoot: "/tmp/project-flaky",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );

    await expect(
      runtime.runPromise(
        engine.dispatch({
          type: "thread.create",
          commandId: CommandId.makeUnsafe("cmd-flaky-1"),
          threadId: ThreadId.makeUnsafe("thread-flaky-fail"),
          projectId: asProjectId("project-flaky"),
          title: "flaky-fail",
          engineSelection: {
            engine: "codex",
            model: "gpt-5-codex",
          },
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          runtimeMode: "approval-required",
          branch: null,
          worktreePath: null,
          createdAt,
        }),
      ),
    ).rejects.toThrow("failed unexpectedly");

    const result = await runtime.runPromise(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-flaky-2"),
        threadId: ThreadId.makeUnsafe("thread-flaky-ok"),
        projectId: asProjectId("project-flaky"),
        title: "flaky-ok",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );

    expect(result.sequence).toBe(2);
    expect((await runtime.runPromise(engine.getReadModel())).snapshotSequence).toBe(2);
    await runtime.dispose();
  });

  it("rolls back all events for a multi-event command when projection fails mid-dispatch", async () => {
    let shouldFailRequestedProjection = true;
    let shouldFailBindingProjection = true;
    const flakyProjectionPipeline: OrchestrationProjectionPipelineShape = {
      bootstrap: Effect.void,
      projectMetadataEvent: () => Effect.void,
      projectEvent: () => Effect.void,
      projectHotEventInCurrentTransaction: (event) => {
        if (
          shouldFailRequestedProjection &&
          event.commandId === CommandId.makeUnsafe("cmd-turn-start-atomic") &&
          event.type === "thread.turn-start-requested"
        ) {
          shouldFailRequestedProjection = false;
          return Effect.fail(
            new PersistenceSqlError({
              operation: "test.projection",
              detail: "projection failed",
            }),
          );
        }
        if (
          shouldFailBindingProjection &&
          event.commandId === CommandId.makeUnsafe("cmd-session-binding-atomic") &&
          event.type === "thread.runtime-mode-set"
        ) {
          shouldFailBindingProjection = false;
          return Effect.fail(
            new PersistenceSqlError({
              operation: "test.binding-projection",
              detail: "binding projection failed",
            }),
          );
        }
        return Effect.void;
      },
      projectDeferredEvent: () => Effect.void,
    };

    const runtime = ManagedRuntime.make(
      OrchestrationEngineLive.pipe(
        Layer.provide(Layer.succeed(OrchestrationProjectionPipeline, flakyProjectionPipeline)),
        Layer.provide(OrchestrationProjectionSnapshotQueryLive),
        Layer.provide(OrchestrationEventStoreLive),
        Layer.provide(OrchestrationCommandReceiptRepositoryLive),
        Layer.provide(SqlitePersistenceMemory),
        Layer.provideMerge(TestServerConfigLayer),
        Layer.provideMerge(NodeServices.layer),
      ),
    );
    const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));
    const createdAt = now();

    await runtime.runPromise(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-atomic-create"),
        projectId: asProjectId("project-atomic"),
        title: "Atomic Project",
        workspaceRoot: "/tmp/project-atomic",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );
    await runtime.runPromise(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-atomic-create"),
        threadId: ThreadId.makeUnsafe("thread-atomic"),
        projectId: asProjectId("project-atomic"),
        title: "atomic",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );

    const turnStartCommand = {
      type: "thread.turn.start" as const,
      commandId: CommandId.makeUnsafe("cmd-turn-start-atomic"),
      threadId: ThreadId.makeUnsafe("thread-atomic"),
      message: {
        messageId: asMessageId("msg-atomic-1"),
        role: "user" as const,
        text: "hello",
        attachments: [],
      },
      interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      runtimeMode: "approval-required" as const,
      createdAt,
    };

    await expect(runtime.runPromise(engine.dispatch(turnStartCommand))).rejects.toThrow(
      "failed unexpectedly",
    );

    const eventsAfterFailure = await runtime.runPromise(
      Stream.runCollect(engine.readEvents(0)).pipe(
        Effect.map((chunk): OrchestrationEvent[] => Array.from(chunk)),
      ),
    );
    expect(eventsAfterFailure.map((event) => event.type)).toEqual([
      "project.created",
      "thread.created",
    ]);
    expect((await runtime.runPromise(engine.getReadModel())).snapshotSequence).toBe(2);

    const retryResult = await runtime.runPromise(engine.dispatch(turnStartCommand));
    expect(retryResult.sequence).toBe(4);

    const eventsAfterRetry = await runtime.runPromise(
      Stream.runCollect(engine.readEvents(0)).pipe(
        Effect.map((chunk): OrchestrationEvent[] => Array.from(chunk)),
      ),
    );
    expect(eventsAfterRetry.map((event) => event.type)).toEqual([
      "project.created",
      "thread.created",
      "thread.message-sent",
      "thread.turn-start-requested",
    ]);
    expect(
      eventsAfterRetry.filter((event) => event.commandId === turnStartCommand.commandId),
    ).toHaveLength(2);

    const bindingCommand = {
      type: "thread.session.set" as const,
      commandId: CommandId.makeUnsafe("cmd-session-binding-atomic"),
      threadId: ThreadId.makeUnsafe("thread-atomic"),
      session: {
        threadId: ThreadId.makeUnsafe("thread-atomic"),
        status: "ready" as const,
        engine: "claude" as const,
        runtimeMode: "full-access" as const,
        activeTurnId: null,
        lastError: null,
        updatedAt: createdAt,
      },
      binding: {
        engineSelection: { engine: "claude" as const, model: "claude-opus-4-6" },
        runtimeMode: "full-access" as const,
        interactionMode: "plan" as const,
      },
      createdAt,
    };

    await expect(runtime.runPromise(engine.dispatch(bindingCommand))).rejects.toThrow(
      "failed unexpectedly",
    );
    expect(
      (
        await runtime.runPromise(
          Stream.runCollect(engine.readEvents(0)).pipe(
            Effect.map((chunk): OrchestrationEvent[] => Array.from(chunk)),
          ),
        )
      ).filter((event) => event.commandId === bindingCommand.commandId),
    ).toHaveLength(0);
    expect(
      (await runtime.runPromise(engine.getReadModel())).threads.find(
        (thread) => thread.id === bindingCommand.threadId,
      ),
    ).toMatchObject({
      engineSelection: { engine: "codex", model: "gpt-5-codex" },
      runtimeMode: "approval-required",
      interactionMode: "default",
    });

    expect((await runtime.runPromise(engine.dispatch(bindingCommand))).sequence).toBe(8);
    const bindingEvents = (
      await runtime.runPromise(
        Stream.runCollect(engine.readEvents(0)).pipe(
          Effect.map((chunk): OrchestrationEvent[] => Array.from(chunk)),
        ),
      )
    ).filter((event) => event.commandId === bindingCommand.commandId);
    expect(bindingEvents.map((event) => event.type)).toEqual([
      "thread.session-set",
      "thread.meta-updated",
      "thread.runtime-mode-set",
      "thread.interaction-mode-set",
    ]);
    expect(
      (await runtime.runPromise(engine.getReadModel())).threads.find(
        (thread) => thread.id === bindingCommand.threadId,
      ),
    ).toMatchObject({
      engineSelection: { engine: "claude", model: "claude-opus-4-6" },
      runtimeMode: "full-access",
      interactionMode: "plan",
      session: { engine: "claude", runtimeMode: "full-access" },
    });

    await runtime.dispose();
  });

  it("keeps processing later commands after an unexpected worker defect", async () => {
    type StoredEvent =
      ReturnType<OrchestrationEventStoreShape["append"]> extends Effect.Effect<infer A, any, any>
        ? A
        : never;
    const events: StoredEvent[] = [];
    let nextSequence = 1;

    const nonTransactionalStore: OrchestrationEventStoreShape = {
      append(event) {
        const savedEvent = {
          ...event,
          sequence: nextSequence,
        } as StoredEvent;
        nextSequence += 1;
        events.push(savedEvent);
        return Effect.succeed(savedEvent);
      },
      getHighWaterSequence() {
        return Effect.succeed(events.at(-1)?.sequence ?? 0);
      },
      ...makeThreadEventReadMethods(events),
      readFromSequence(sequenceExclusive) {
        return Stream.fromIterable(events.filter((event) => event.sequence > sequenceExclusive));
      },
      readAll() {
        return Stream.fromIterable(events);
      },
    };

    let shouldDieProjection = true;
    const defectiveProjectionPipeline: OrchestrationProjectionPipelineShape = {
      bootstrap: Effect.void,
      projectMetadataEvent: (event) => {
        if (
          shouldDieProjection &&
          event.commandId === CommandId.makeUnsafe("cmd-project-defect-1")
        ) {
          shouldDieProjection = false;
          return Effect.die("projection defect");
        }
        return Effect.void;
      },
      projectEvent: () => Effect.void,
      projectHotEventInCurrentTransaction: () => Effect.void,
      projectDeferredEvent: () => Effect.void,
    };

    const runtime = ManagedRuntime.make(
      OrchestrationEngineLive.pipe(
        Layer.provide(Layer.succeed(OrchestrationProjectionPipeline, defectiveProjectionPipeline)),
        Layer.provide(OrchestrationProjectionSnapshotQueryLive),
        Layer.provide(Layer.succeed(OrchestrationEventStore, nonTransactionalStore)),
        Layer.provide(OrchestrationCommandReceiptRepositoryLive),
        Layer.provide(SqlitePersistenceMemory),
        Layer.provideMerge(TestServerConfigLayer),
        Layer.provideMerge(NodeServices.layer),
      ),
    );
    const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));
    const createdAt = now();

    await expect(
      runtime.runPromise(
        engine.dispatch({
          type: "project.create",
          commandId: CommandId.makeUnsafe("cmd-project-defect-1"),
          projectId: asProjectId("project-defect-1"),
          title: "Defective Project",
          workspaceRoot: "/tmp/project-defect-1",
          defaultEngineSelection: {
            engine: "codex",
            model: "gpt-5-codex",
          },
          createdAt,
        }),
      ),
    ).rejects.toThrow("failed unexpectedly");

    await expect(
      runtime.runPromise(
        engine.dispatch({
          type: "project.create",
          commandId: CommandId.makeUnsafe("cmd-project-defect-2"),
          projectId: asProjectId("project-defect-2"),
          title: "Recovered Project",
          workspaceRoot: "/tmp/project-defect-2",
          defaultEngineSelection: {
            engine: "codex",
            model: "gpt-5-codex",
          },
          createdAt,
        }),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        sequence: expect.any(Number),
      }),
    );

    const eventsAfterRecovery = await runtime.runPromise(
      Stream.runCollect(engine.readEvents(0)).pipe(
        Effect.map((chunk): OrchestrationEvent[] => Array.from(chunk)),
      ),
    );
    expect(eventsAfterRecovery.map((event) => event.commandId)).toEqual([
      CommandId.makeUnsafe("cmd-project-defect-1"),
      CommandId.makeUnsafe("cmd-project-defect-2"),
    ]);
    expect(eventsAfterRecovery.every((event) => event.type === "project.created")).toBe(true);

    await runtime.dispose();
  });

  it("reconciles in-memory state when append persists but projection fails", async () => {
    type StoredEvent =
      ReturnType<OrchestrationEventStoreShape["append"]> extends Effect.Effect<infer A, any, any>
        ? A
        : never;
    const events: StoredEvent[] = [];
    let nextSequence = 1;

    const nonTransactionalStore: OrchestrationEventStoreShape = {
      append(event) {
        const savedEvent = {
          ...event,
          sequence: nextSequence,
        } as StoredEvent;
        nextSequence += 1;
        events.push(savedEvent);
        return Effect.succeed(savedEvent);
      },
      getHighWaterSequence() {
        return Effect.succeed(events.at(-1)?.sequence ?? 0);
      },
      ...makeThreadEventReadMethods(events),
      readFromSequence(sequenceExclusive) {
        return Stream.fromIterable(events.filter((event) => event.sequence > sequenceExclusive));
      },
      readAll() {
        return Stream.fromIterable(events);
      },
    };

    let shouldFailProjection = true;
    const flakyProjectionPipeline: OrchestrationProjectionPipelineShape = {
      bootstrap: Effect.void,
      projectMetadataEvent: () => Effect.void,
      projectEvent: () => Effect.void,
      projectHotEventInCurrentTransaction: (event) => {
        if (
          shouldFailProjection &&
          event.commandId === CommandId.makeUnsafe("cmd-thread-meta-sync-fail")
        ) {
          shouldFailProjection = false;
          return Effect.fail(
            new PersistenceSqlError({
              operation: "test.projection",
              detail: "projection failed",
            }),
          );
        }
        return Effect.void;
      },
      projectDeferredEvent: () => Effect.void,
    };

    const runtime = ManagedRuntime.make(
      OrchestrationEngineLive.pipe(
        Layer.provide(Layer.succeed(OrchestrationProjectionPipeline, flakyProjectionPipeline)),
        Layer.provide(OrchestrationProjectionSnapshotQueryLive),
        Layer.provide(Layer.succeed(OrchestrationEventStore, nonTransactionalStore)),
        Layer.provide(OrchestrationCommandReceiptRepositoryLive),
        Layer.provide(SqlitePersistenceMemory),
        Layer.provideMerge(TestServerConfigLayer),
        Layer.provideMerge(NodeServices.layer),
      ),
    );
    const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));
    const createdAt = now();

    await runtime.runPromise(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-sync-create"),
        projectId: asProjectId("project-sync"),
        title: "Sync Project",
        workspaceRoot: "/tmp/project-sync",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );
    await runtime.runPromise(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-sync-create"),
        threadId: ThreadId.makeUnsafe("thread-sync"),
        projectId: asProjectId("project-sync"),
        title: "sync-before",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );

    await expect(
      runtime.runPromise(
        engine.dispatch({
          type: "thread.meta.update",
          commandId: CommandId.makeUnsafe("cmd-thread-meta-sync-fail"),
          threadId: ThreadId.makeUnsafe("thread-sync"),
          title: "sync-after-failed-projection",
        }),
      ),
    ).rejects.toThrow("failed unexpectedly");

    const readModelAfterFailure = await runtime.runPromise(engine.getReadModel());
    const updatedThread = readModelAfterFailure.threads.find(
      (thread) => thread.id === "thread-sync",
    );
    expect(readModelAfterFailure.snapshotSequence).toBe(3);
    expect(updatedThread?.title).toBe("sync-after-failed-projection");

    await runtime.dispose();
  });

  it("fails command dispatch when command invariants are violated", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;

    await expect(
      system.run(
        engine.dispatch({
          type: "thread.turn.start",
          commandId: CommandId.makeUnsafe("cmd-invariant-missing-thread"),
          threadId: ThreadId.makeUnsafe("thread-missing"),
          message: {
            messageId: asMessageId("msg-missing"),
            role: "user",
            text: "hello",
            attachments: [],
          },
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          runtimeMode: "approval-required",
          createdAt: now(),
        }),
      ),
    ).rejects.toThrow("Thread 'thread-missing' does not exist");

    await system.dispose();
  });

  it("retries deferred projection catch-up while idle until it recovers", async () => {
    let bootstrapCalls = 0;
    let deferredCalls = 0;
    let resolveRecoveryBootstrap: (() => void) | null = null;
    const recoveryBootstrap = new Promise<void>((resolve) => {
      resolveRecoveryBootstrap = resolve;
    });

    const flakyProjectionPipelineLayer = Layer.effect(
      OrchestrationProjectionPipeline,
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return {
          bootstrap: Effect.suspend(() => {
            bootstrapCalls += 1;
            if (bootstrapCalls === 2 || bootstrapCalls === 3) {
              return Effect.fail(
                new PersistenceSqlError({
                  operation: "test.deferredProjectionBootstrap",
                  detail: "deferred projection bootstrap failed transiently",
                }),
              );
            }
            if (bootstrapCalls === 4) {
              return sql`
                INSERT INTO projection_state (projector, last_applied_sequence, updated_at)
                VALUES
                  (${ORCHESTRATION_PROJECTOR_NAMES.hot}, 4, '2026-08-16T00:00:00.000Z'),
                  (${ORCHESTRATION_PROJECTOR_NAMES.threadShellSummaries}, 4, '2026-08-16T00:00:00.000Z')
                ON CONFLICT(projector) DO UPDATE SET
                  last_applied_sequence = excluded.last_applied_sequence,
                  updated_at = excluded.updated_at
              `.pipe(
                Effect.asVoid,
                Effect.mapError(
                  () =>
                    new PersistenceSqlError({
                      operation: "test.deferredProjectionBootstrap.cursorRepair",
                      detail: "failed to repair test projection cursors",
                    }),
                ),
                Effect.tap(() => Effect.sync(() => resolveRecoveryBootstrap?.())),
              );
            }
            return Effect.void;
          }),
          projectMetadataEvent: () => Effect.void,
          projectEvent: () => Effect.void,
          projectHotEventInCurrentTransaction: () => Effect.void,
          projectDeferredEvent: () => {
            deferredCalls += 1;
            if (deferredCalls === 1) {
              return Effect.fail(
                new PersistenceSqlError({
                  operation: "test.deferredProjection",
                  detail: "deferred projection failed",
                }),
              );
            }
            return Effect.void;
          },
        } satisfies OrchestrationProjectionPipelineShape;
      }),
    );

    const runtime = ManagedRuntime.make(
      OrchestrationEngineLive.pipe(
        Layer.provide(flakyProjectionPipelineLayer),
        Layer.provide(OrchestrationProjectionSnapshotQueryLive),
        Layer.provide(OrchestrationEventStoreLive),
        Layer.provide(OrchestrationCommandReceiptRepositoryLive),
        Layer.provide(SqlitePersistenceMemory),
        Layer.provideMerge(TestServerConfigLayer),
        Layer.provideMerge(NodeServices.layer),
      ),
    );
    const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));
    const createdAt = now();

    await runtime.runPromise(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-deferred-recovery"),
        projectId: asProjectId("project-deferred-recovery"),
        title: "Deferred Recovery Project",
        workspaceRoot: "/tmp/project-deferred-recovery",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );
    await runtime.runPromise(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-deferred-recovery"),
        threadId: ThreadId.makeUnsafe("thread-deferred-recovery"),
        projectId: asProjectId("project-deferred-recovery"),
        title: "deferred-recovery",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );

    const result = await runtime.runPromise(
      engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-deferred-recovery"),
        threadId: ThreadId.makeUnsafe("thread-deferred-recovery"),
        message: {
          messageId: asMessageId("msg-deferred-recovery"),
          role: "user",
          text: "hello",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt,
      }),
    );

    await recoveryBootstrap;

    expect(result.sequence).toBe(4);
    expect(deferredCalls).toBeGreaterThanOrEqual(1);
    expect(bootstrapCalls).toBe(4);
    await vi.waitFor(async () => {
      expect(await runtime.runPromise(engine.getProjectionCatchUpStatus)).toEqual({
        state: "healthy",
        inFlight: false,
        retryAttempts: 0,
        lastFailure: null,
        highWaterSequence: 4,
        lagByProjector: {},
        missingProjectors: [],
      });
    });

    await runtime.dispose();
  });

  it("reports required projectors missing when durable events exist without cursors", async () => {
    const nonAdvancingProjectionPipeline: OrchestrationProjectionPipelineShape = {
      bootstrap: Effect.void,
      projectMetadataEvent: () => Effect.void,
      projectEvent: () => Effect.void,
      projectHotEventInCurrentTransaction: () => Effect.void,
      projectDeferredEvent: () => Effect.void,
    };
    const runtime = ManagedRuntime.make(
      OrchestrationEngineLive.pipe(
        Layer.provide(
          Layer.succeed(OrchestrationProjectionPipeline, nonAdvancingProjectionPipeline),
        ),
        Layer.provide(OrchestrationProjectionSnapshotQueryLive),
        Layer.provide(OrchestrationEventStoreLive),
        Layer.provide(OrchestrationCommandReceiptRepositoryLive),
        Layer.provide(SqlitePersistenceMemory),
        Layer.provideMerge(TestServerConfigLayer),
        Layer.provideMerge(NodeServices.layer),
      ),
    );
    const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));

    await runtime.runPromise(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-missing-cursors"),
        projectId: asProjectId("project-missing-cursors"),
        title: "Missing cursors",
        workspaceRoot: "/tmp/project-missing-cursors",
        defaultEngineSelection: null,
        createdAt: now(),
      }),
    );

    await expect(runtime.runPromise(engine.getProjectionCatchUpStatus)).resolves.toEqual({
      state: "degraded",
      inFlight: false,
      retryAttempts: 0,
      lastFailure: null,
      highWaterSequence: 1,
      lagByProjector: {},
      missingProjectors: [
        ORCHESTRATION_PROJECTOR_NAMES.hot,
        ORCHESTRATION_PROJECTOR_NAMES.threadShellSummaries,
      ],
    });

    await runtime.dispose();
  });

  it("restores the repair backup when rebuilt projectors do not reach the captured fence", async () => {
    const nonAdvancingProjectionPipeline: OrchestrationProjectionPipelineShape = {
      bootstrap: Effect.void,
      projectMetadataEvent: () => Effect.void,
      projectEvent: () => Effect.void,
      projectHotEventInCurrentTransaction: () => Effect.void,
      projectDeferredEvent: () => Effect.void,
    };
    const runtime = ManagedRuntime.make(
      OrchestrationEngineLive.pipe(
        Layer.provide(
          Layer.succeed(OrchestrationProjectionPipeline, nonAdvancingProjectionPipeline),
        ),
        Layer.provide(OrchestrationProjectionSnapshotQueryLive),
        Layer.provide(OrchestrationEventStoreLive),
        Layer.provide(OrchestrationCommandReceiptRepositoryLive),
        Layer.provide(SqlitePersistenceMemory),
        Layer.provideMerge(TestServerConfigLayer),
        Layer.provideMerge(NodeServices.layer),
      ),
    );
    const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));
    const createdAt = now();

    await runtime.runPromise(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-repair-fence"),
        projectId: asProjectId("project-repair-fence"),
        title: "Repair Fence Project",
        workspaceRoot: "/tmp/project-repair-fence",
        defaultEngineSelection: null,
        createdAt,
      }),
    );
    const beforeRepair = await runtime.runPromise(engine.getReadModel());

    await expect(runtime.runPromise(engine.repairState())).rejects.toThrow(
      "did not reach captured event fence 1",
    );
    await expect(runtime.runPromise(engine.getReadModel())).resolves.toEqual(beforeRepair);

    await runtime.dispose();
  });

  it("coalesces concurrent projection repairs and skips an immediate repeat", async () => {
    let bootstrapCalls = 0;
    let repairBootstrapCalls = 0;
    let resolveBootstrapStarted: (() => void) | undefined;
    let releaseBootstrap: (() => void) | undefined;
    const bootstrapStarted = new Promise<void>((resolve) => {
      resolveBootstrapStarted = resolve;
    });
    const bootstrapGate = new Promise<void>((resolve) => {
      releaseBootstrap = resolve;
    });
    const blockingProjectionPipeline: OrchestrationProjectionPipelineShape = {
      bootstrap: Effect.sync(() => (bootstrapCalls += 1)).pipe(
        Effect.flatMap((call) => {
          if (call === 1) {
            return Effect.void;
          }
          repairBootstrapCalls += 1;
          resolveBootstrapStarted?.();
          return Effect.promise(() => bootstrapGate);
        }),
      ),
      projectMetadataEvent: () => Effect.void,
      projectEvent: () => Effect.void,
      projectHotEventInCurrentTransaction: () => Effect.void,
      projectDeferredEvent: () => Effect.void,
    };
    const runtime = ManagedRuntime.make(
      OrchestrationEngineLive.pipe(
        Layer.provide(Layer.succeed(OrchestrationProjectionPipeline, blockingProjectionPipeline)),
        Layer.provide(OrchestrationProjectionSnapshotQueryLive),
        Layer.provide(OrchestrationEventStoreLive),
        Layer.provide(OrchestrationCommandReceiptRepositoryLive),
        Layer.provide(SqlitePersistenceMemory),
        Layer.provideMerge(TestServerConfigLayer),
        Layer.provideMerge(NodeServices.layer),
      ),
    );
    const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));

    const firstRepair = runtime.runPromise(engine.repairState());
    await bootstrapStarted;
    const secondRepair = runtime.runPromise(engine.repairState());
    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseBootstrap?.();

    const [firstSnapshot, secondSnapshot] = await Promise.all([firstRepair, secondRepair]);
    expect(secondSnapshot).toEqual(firstSnapshot);
    expect(repairBootstrapCalls).toBe(1);

    await runtime.runPromise(engine.repairState());
    expect(repairBootstrapCalls).toBe(1);

    await runtime.dispose();
  });

  it("retires an empty existing project when re-adding the same workspace root", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const createdAt = now();

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-stale-create"),
        projectId: asProjectId("project-stale"),
        title: "Stale Project",
        workspaceRoot: "/tmp/readd-project",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );

    await expect(
      system.run(
        engine.dispatch({
          type: "project.create",
          commandId: CommandId.makeUnsafe("cmd-project-readd-create"),
          projectId: asProjectId("project-readd"),
          title: "Readded Project",
          workspaceRoot: "/tmp/readd-project",
          defaultEngineSelection: {
            engine: "codex",
            model: "gpt-5-codex",
          },
          createdAt,
        }),
      ),
    ).resolves.toEqual({ sequence: 3 });

    const readModel = await system.run(engine.getReadModel());
    expect(
      readModel.projects.find((project) => project.id === asProjectId("project-stale"))?.deletedAt,
    ).toBe(createdAt);
    expect(
      readModel.projects.find((project) => project.id === asProjectId("project-readd"))?.deletedAt,
    ).toBeNull();

    await system.dispose();
  });

  it("keeps rejecting a duplicate workspace root when the existing project has threads", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const createdAt = now();

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-active-create"),
        projectId: asProjectId("project-active"),
        title: "Active Project",
        workspaceRoot: "/tmp/active-project",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-project-active-thread-create"),
        threadId: ThreadId.makeUnsafe("thread-active"),
        projectId: asProjectId("project-active"),
        title: "active",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );

    await expect(
      system.run(
        engine.dispatch({
          type: "project.create",
          commandId: CommandId.makeUnsafe("cmd-project-active-duplicate-create"),
          projectId: asProjectId("project-active-duplicate"),
          title: "Active Duplicate",
          workspaceRoot: "/tmp/active-project",
          defaultEngineSelection: {
            engine: "codex",
            model: "gpt-5-codex",
          },
          createdAt,
        }),
      ),
    ).rejects.toThrow("already uses workspace root");

    await system.dispose();
  });

  it("rejects duplicate Studio workspace containers", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const createdAt = now();

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-studio-project-create"),
        projectId: asProjectId("project-studio"),
        kind: "studio",
        title: "Studio",
        workspaceRoot: "/tmp/harnessos-studio",
        defaultEngineSelection: null,
        createdAt,
      }),
    );

    await expect(
      system.run(
        engine.dispatch({
          type: "project.create",
          commandId: CommandId.makeUnsafe("cmd-studio-project-duplicate-create"),
          projectId: asProjectId("project-studio-duplicate"),
          kind: "studio",
          title: "Studio",
          workspaceRoot: "/tmp/harnessos-studio",
          defaultEngineSelection: null,
          createdAt,
        }),
      ),
    ).rejects.toThrow("already uses workspace root");

    await system.dispose();
  });

  it("rejects Studio and regular projects claiming each other's workspace root", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const createdAt = now();

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-cross-kind-studio-create"),
        projectId: asProjectId("project-cross-kind-studio"),
        kind: "studio",
        title: "Studio",
        workspaceRoot: "/tmp/harnessos-cross-kind-studio",
        defaultEngineSelection: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-cross-kind-project-create"),
        projectId: asProjectId("project-cross-kind-app"),
        kind: "project",
        title: "App",
        workspaceRoot: "/tmp/harnessos-cross-kind-app",
        defaultEngineSelection: null,
        createdAt,
      }),
    );

    // Adding the Studio container's folder as a regular project must not create a second
    // active project on that root (the empty container would otherwise be silently retired).
    await expect(
      system.run(
        engine.dispatch({
          type: "project.create",
          commandId: CommandId.makeUnsafe("cmd-cross-kind-project-on-studio-root"),
          projectId: asProjectId("project-on-studio-root"),
          kind: "project",
          title: "Studio folder",
          workspaceRoot: "/tmp/harnessos-cross-kind-studio",
          defaultEngineSelection: null,
          createdAt,
        }),
      ),
    ).rejects.toThrow("already uses workspace root");

    // Creating a Studio container on a root an existing regular project owns must fail too.
    await expect(
      system.run(
        engine.dispatch({
          type: "project.create",
          commandId: CommandId.makeUnsafe("cmd-cross-kind-studio-on-project-root"),
          projectId: asProjectId("project-studio-on-project-root"),
          kind: "studio",
          title: "Studio",
          workspaceRoot: "/tmp/harnessos-cross-kind-app",
          defaultEngineSelection: null,
          createdAt,
        }),
      ),
    ).rejects.toThrow("already uses workspace root");

    // Root moves are covered by the same cross-kind ownership rule.
    await expect(
      system.run(
        engine.dispatch({
          type: "project.meta.update",
          commandId: CommandId.makeUnsafe("cmd-cross-kind-project-root-update"),
          projectId: asProjectId("project-cross-kind-app"),
          workspaceRoot: "/tmp/harnessos-cross-kind-studio",
        }),
      ),
    ).rejects.toThrow("already uses workspace root");

    // A kind-only update must not carry an existing pin onto a kind that can never be pinned.
    await system.run(
      engine.dispatch({
        type: "project.meta.update",
        commandId: CommandId.makeUnsafe("cmd-cross-kind-pin-app"),
        projectId: asProjectId("project-cross-kind-app"),
        isPinned: true,
      }),
    );
    await expect(
      system.run(
        engine.dispatch({
          type: "project.meta.update",
          commandId: CommandId.makeUnsafe("cmd-cross-kind-pinned-kind-change"),
          projectId: asProjectId("project-cross-kind-app"),
          kind: "studio",
          workspaceRoot: "/tmp/harnessos-cross-kind-pinned-studio",
        }),
      ),
    ).rejects.toThrow("Only projects can be pinned.");

    // A kind-only update must not bypass ownership either: a chat project sitting on an owned
    // root cannot become a workspace-owning kind without the root check running.
    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-cross-kind-chat-create"),
        projectId: asProjectId("project-cross-kind-chat"),
        kind: "chat",
        title: "Home",
        workspaceRoot: "/tmp/harnessos-cross-kind-studio",
        defaultEngineSelection: null,
        createdAt,
      }),
    );
    await expect(
      system.run(
        engine.dispatch({
          type: "project.meta.update",
          commandId: CommandId.makeUnsafe("cmd-cross-kind-chat-kind-only-update"),
          projectId: asProjectId("project-cross-kind-chat"),
          kind: "studio",
        }),
      ),
    ).rejects.toThrow("already uses workspace root");

    await system.dispose();
  });

  it("rejects moving a Studio container onto another Studio workspace root", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const createdAt = now();

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-studio-source-create"),
        projectId: asProjectId("project-studio-source"),
        kind: "studio",
        title: "Studio",
        workspaceRoot: "/tmp/harnessos-studio-source",
        defaultEngineSelection: null,
        createdAt,
      }),
    );
    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-studio-target-create"),
        projectId: asProjectId("project-studio-target"),
        kind: "studio",
        title: "Studio",
        workspaceRoot: "/tmp/harnessos-studio-target",
        defaultEngineSelection: null,
        createdAt,
      }),
    );

    await expect(
      system.run(
        engine.dispatch({
          type: "project.meta.update",
          commandId: CommandId.makeUnsafe("cmd-studio-target-root-update"),
          projectId: asProjectId("project-studio-target"),
          workspaceRoot: "/tmp/harnessos-studio-source",
        }),
      ),
    ).rejects.toThrow("already uses workspace root");

    await system.dispose();
  });

  it("rejects duplicate thread creation", async () => {
    const system = await createOrchestrationSystem();
    const { engine } = system;
    const createdAt = now();

    await system.run(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-duplicate-create"),
        projectId: asProjectId("project-duplicate"),
        title: "Duplicate Project",
        workspaceRoot: "/tmp/project-duplicate",
        defaultEngineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        createdAt,
      }),
    );

    await system.run(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-duplicate-1"),
        threadId: ThreadId.makeUnsafe("thread-duplicate"),
        projectId: asProjectId("project-duplicate"),
        title: "duplicate",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt,
      }),
    );

    await expect(
      system.run(
        engine.dispatch({
          type: "thread.create",
          commandId: CommandId.makeUnsafe("cmd-thread-duplicate-2"),
          threadId: ThreadId.makeUnsafe("thread-duplicate"),
          projectId: asProjectId("project-duplicate"),
          title: "duplicate",
          engineSelection: {
            engine: "codex",
            model: "gpt-5-codex",
          },
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          runtimeMode: "approval-required",
          branch: null,
          worktreePath: null,
          createdAt,
        }),
      ),
    ).rejects.toThrow("already exists");

    await system.dispose();
  });

  it("keeps the worker alive when a command throws while its pipeline is built", async () => {
    const system = await createOrchestrationSystem();
    const createdAt = now();
    const poisonedCommandId = CommandId.makeUnsafe("cmd-engine-poison");
    fingerprintPoison.add(poisonedCommandId);

    try {
      const poisonedOutcome = await system.run(
        Effect.result(
          system.engine.dispatch({
            type: "project.create",
            commandId: poisonedCommandId,
            projectId: asProjectId("project-engine-poison"),
            title: "Poisoned",
            workspaceRoot: "/tmp/engine-poison",
            defaultEngineSelection: null,
            createdAt,
          }),
        ).pipe(Effect.timeoutOption("5 seconds")),
      );

      // The defect fails this command immediately instead of leaving the caller to
      // wait out the dispatch timeout.
      expect(Option.isSome(poisonedOutcome)).toBe(true);
      const outcome = Option.getOrThrow(poisonedOutcome);
      expect(outcome._tag).toBe("Failure");
      if (outcome._tag === "Failure") {
        expect(outcome.failure).toMatchObject({ _tag: "OrchestrationCommandInternalError" });
      }

      // The worker survived: the next command still runs.
      await expect(
        system.run(
          system.engine.dispatch({
            type: "project.create",
            commandId: CommandId.makeUnsafe("cmd-engine-poison-next"),
            projectId: asProjectId("project-engine-poison-next"),
            title: "After poison",
            workspaceRoot: "/tmp/engine-poison-next",
            defaultEngineSelection: null,
            createdAt,
          }),
        ),
      ).resolves.toMatchObject({ sequence: expect.any(Number) });

      // The poisoned envelope was still finished, so `outstanding` did not leak.
      const drained = await system.run(
        Effect.timeoutOption(system.engine.drain, "5 seconds").pipe(Effect.map(Option.isSome)),
      );
      expect(drained).toBe(true);
    } finally {
      fingerprintPoison.delete(poisonedCommandId);
      await system.dispose();
    }
  });
});
