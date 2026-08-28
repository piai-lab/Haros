import {
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  EventId,
  MessageId,
  ProjectId,
  ThreadId,
  type ThreadHandoffImportedMessage,
  TurnId,
  type OrchestrationReadModel,
} from "@harnessos/contracts";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { decideOrchestrationCommand } from "./decider.ts";
import { createEmptyReadModel, projectEvent } from "./projector.ts";

const PROJECT_ID = ProjectId.makeUnsafe("project-1");
const SOURCE_THREAD_ID = ThreadId.makeUnsafe("thread-source");
const TARGET_THREAD_ID = ThreadId.makeUnsafe("thread-target");
const NOW = "2026-08-17T00:00:10.000Z";
const WORKTREE_PATH = "/tmp/worktrees/feature";
const BRANCH = "feature/fork-scope";

const message = (
  id: string,
  role: "user" | "assistant",
  createdAt: string,
  updatedAt: string,
  streaming = false,
) => ({
  id: MessageId.makeUnsafe(id),
  role,
  text: `${role}:${id}`,
  turnId: TurnId.makeUnsafe(`turn-${id}`),
  streaming,
  source: "native" as const,
  createdAt,
  updatedAt,
});

async function readModelWithSourceMessages(): Promise<OrchestrationReadModel> {
  const withProject = await Effect.runPromise(
    projectEvent(createEmptyReadModel(NOW), {
      sequence: 1,
      eventId: EventId.makeUnsafe("event-project"),
      aggregateKind: "project",
      aggregateId: PROJECT_ID,
      type: "project.created",
      occurredAt: NOW,
      commandId: CommandId.makeUnsafe("command-project"),
      causationEventId: null,
      correlationId: CommandId.makeUnsafe("command-project"),
      metadata: {},
      payload: {
        projectId: PROJECT_ID,
        kind: "project",
        title: "Project",
        workspaceRoot: "/tmp/project",
        defaultModelSelection: null,
        scripts: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
  );
  const withThread = await Effect.runPromise(
    projectEvent(withProject, {
      sequence: 2,
      eventId: EventId.makeUnsafe("event-thread"),
      aggregateKind: "thread",
      aggregateId: SOURCE_THREAD_ID,
      type: "thread.created",
      occurredAt: NOW,
      commandId: CommandId.makeUnsafe("command-thread"),
      causationEventId: null,
      correlationId: CommandId.makeUnsafe("command-thread"),
      metadata: {},
      payload: {
        threadId: SOURCE_THREAD_ID,
        projectId: PROJECT_ID,
        title: "Source",
        modelSelection: { provider: "codex", model: "gpt-5.4" },
        runtimeMode: "full-access",
        interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
        envMode: "worktree",
        branch: BRANCH,
        worktreePath: WORKTREE_PATH,
        workingDirectory: null,
        associatedWorktreePath: WORKTREE_PATH,
        associatedWorktreeBranch: BRANCH,
        associatedWorktreeRef: BRANCH,
        createBranchFlowCompleted: false,
        isPinned: false,
        parentThreadId: null,
        subagentAgentId: null,
        subagentNickname: null,
        subagentRole: null,
        forkSourceThreadId: null,
        forkScope: null,
        sidechatSourceThreadId: null,
        handoff: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
  );
  const sourceMessages = [
    message("message-user-1", "user", "2026-08-17T00:00:01.000Z", "2026-08-17T00:00:01.000Z"),
    message(
      "message-assistant-1",
      "assistant",
      "2026-08-17T00:00:02.000Z",
      "2026-08-17T00:00:03.000Z",
    ),
    message("message-user-2", "user", "2026-08-17T00:00:04.000Z", "2026-08-17T00:00:04.000Z"),
    message(
      "message-assistant-2",
      "assistant",
      "2026-08-17T00:00:05.000Z",
      "2026-08-17T00:00:06.000Z",
    ),
    message(
      "message-assistant-streaming",
      "assistant",
      "2026-08-17T00:00:07.000Z",
      "2026-08-17T00:00:07.000Z",
      true,
    ),
  ];
  return {
    ...withThread,
    threads: withThread.threads.map((thread) =>
      thread.id === SOURCE_THREAD_ID
        ? Object.assign({}, thread, { messages: sourceMessages })
        : thread,
    ),
  };
}

function exactPrefix(): ThreadHandoffImportedMessage[] {
  return [
    {
      messageId: MessageId.makeUnsafe("import-user-1"),
      sourceMessageId: MessageId.makeUnsafe("message-user-1"),
      sourceMessageUpdatedAt: "2026-08-17T00:00:01.000Z",
      role: "user" as const,
      text: "user:message-user-1",
      createdAt: "2026-08-17T00:00:01.000Z",
      updatedAt: "2026-08-17T00:00:01.000Z",
    },
    {
      messageId: MessageId.makeUnsafe("import-assistant-1"),
      sourceMessageId: MessageId.makeUnsafe("message-assistant-1"),
      sourceMessageUpdatedAt: "2026-08-17T00:00:03.000Z",
      role: "assistant" as const,
      text: "assistant:message-assistant-1",
      createdAt: "2026-08-17T00:00:02.000Z",
      updatedAt: "2026-08-17T00:00:03.000Z",
    },
  ];
}

function scopedForkCommand() {
  return {
    type: "thread.fork.create" as const,
    commandId: CommandId.makeUnsafe("command-fork"),
    threadId: TARGET_THREAD_ID,
    sourceThreadId: SOURCE_THREAD_ID,
    projectId: PROJECT_ID,
    title: "Fork",
    modelSelection: { provider: "codex" as const, model: "gpt-5.4" },
    runtimeMode: "full-access" as const,
    interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
    envMode: "worktree" as const,
    branch: BRANCH,
    worktreePath: WORKTREE_PATH,
    workingDirectory: null,
    associatedWorktreePath: WORKTREE_PATH,
    associatedWorktreeBranch: BRANCH,
    associatedWorktreeRef: BRANCH,
    createBranchFlowCompleted: false,
    sidechatSourceThreadId: null,
    forkScope: {
      kind: "history-only" as const,
      sourceMessageId: MessageId.makeUnsafe("message-assistant-1"),
      sourceMessageUpdatedAt: "2026-08-17T00:00:03.000Z",
      bootstrapStatus: "pending" as const,
    },
    importedMessages: exactPrefix(),
    createdAt: NOW,
  };
}

describe("history-only fork decider", () => {
  it("emits the exact scoped prefix and durable pending cutoff", async () => {
    const events = await Effect.runPromise(
      decideOrchestrationCommand({
        command: scopedForkCommand(),
        readModel: await readModelWithSourceMessages(),
      }),
    );
    const list = Array.isArray(events) ? events : [events];
    expect(list).toHaveLength(3);
    expect(list[0]).toMatchObject({
      type: "thread.created",
      payload: {
        forkSourceThreadId: SOURCE_THREAD_ID,
        forkScope: scopedForkCommand().forkScope,
      },
    });
    expect(list.slice(1).map((event) => event.type)).toEqual([
      "thread.message-sent",
      "thread.message-sent",
    ]);
  });

  it("allows only the internal exact-cutoff command to complete the bootstrap", async () => {
    let readModel = await readModelWithSourceMessages();
    const created = await Effect.runPromise(
      decideOrchestrationCommand({ command: scopedForkCommand(), readModel }),
    );
    const createdEvents = Array.isArray(created) ? created : [created];
    for (const [index, event] of createdEvents.entries()) {
      readModel = await Effect.runPromise(
        projectEvent(readModel, { ...event, sequence: 10 + index }),
      );
    }

    const completion = {
      type: "thread.fork.bootstrap.complete" as const,
      commandId: CommandId.makeUnsafe("command-fork-bootstrap-complete"),
      threadId: TARGET_THREAD_ID,
      sourceMessageId: MessageId.makeUnsafe("message-assistant-1"),
      sourceMessageUpdatedAt: "2026-08-17T00:00:03.000Z",
      completedAt: "2026-08-17T00:00:11.000Z",
    };
    await expect(
      Effect.runPromise(decideOrchestrationCommand({ command: completion, readModel })),
    ).resolves.toMatchObject({
      type: "thread.meta-updated",
      payload: {
        forkScope: {
          kind: "history-only",
          sourceMessageId: MessageId.makeUnsafe("message-assistant-1"),
          bootstrapStatus: "completed",
        },
      },
    });
    await expect(
      Effect.runPromise(
        decideOrchestrationCommand({
          command: {
            ...completion,
            commandId: CommandId.makeUnsafe("command-fork-bootstrap-stale"),
            sourceMessageUpdatedAt: "2026-08-17T00:00:02.000Z",
          },
          readModel,
        }),
      ),
    ).rejects.toThrow(/matching pending fork bootstrap/);
  });

  it("treats imported mention kind and path as part of the exact history", async () => {
    const source = await readModelWithSourceMessages();
    const mention = {
      name: "Reference folder",
      path: "/tmp/reference",
      resourceKind: "directory" as const,
    };
    const readModel = {
      ...source,
      threads: source.threads.map((thread) =>
        thread.id === SOURCE_THREAD_ID
          ? {
              ...thread,
              messages: thread.messages.map((entry, index) =>
                index === 0 ? { ...entry, mentions: [mention] } : entry,
              ),
            }
          : thread,
      ),
    };
    const matching = scopedForkCommand();
    matching.importedMessages[0] = {
      ...matching.importedMessages[0]!,
      mentions: [mention],
    };
    await expect(
      Effect.runPromise(decideOrchestrationCommand({ command: matching, readModel })),
    ).resolves.toBeDefined();

    const tampered = scopedForkCommand();
    tampered.importedMessages[0] = {
      ...tampered.importedMessages[0]!,
      mentions: [{ ...mention, resourceKind: "file" }],
    };
    await expect(
      Effect.runPromise(decideOrchestrationCommand({ command: tampered, readModel })),
    ).rejects.toThrow(/exact persisted prefix/);
  });

  it.each([
    [
      "missing cutoff",
      () => ({
        forkScope: {
          ...scopedForkCommand().forkScope,
          sourceMessageId: MessageId.makeUnsafe("missing"),
        },
      }),
    ],
    [
      "stale cutoff",
      () => ({
        forkScope: {
          ...scopedForkCommand().forkScope,
          sourceMessageUpdatedAt: "2026-08-17T00:00:02.000Z",
        },
      }),
    ],
    [
      "streaming cutoff",
      () => ({
        forkScope: {
          ...scopedForkCommand().forkScope,
          sourceMessageId: MessageId.makeUnsafe("message-assistant-streaming"),
          sourceMessageUpdatedAt: "2026-08-17T00:00:07.000Z",
        },
      }),
    ],
    ["reordered prefix", () => ({ importedMessages: exactPrefix().toReversed() })],
    [
      "tampered message content",
      () => ({
        importedMessages: [exactPrefix()[0]!, { ...exactPrefix()[1]!, text: "tampered" }],
      }),
    ],
    [
      "tampered attachment content",
      () => ({
        importedMessages: [
          {
            ...exactPrefix()[0]!,
            attachments: [
              {
                type: "file" as const,
                id: "attachment-1",
                name: "context.txt",
                mimeType: "text/plain",
                sizeBytes: 8,
              },
            ],
          },
          exactPrefix()[1]!,
        ],
      }),
    ],
    [
      "reused target message id",
      () => ({
        importedMessages: [
          exactPrefix()[0]!,
          { ...exactPrefix()[1]!, messageId: MessageId.makeUnsafe("message-assistant-1") },
        ],
      }),
    ],
    [
      "extra prefix member",
      () => ({
        importedMessages: [
          ...exactPrefix(),
          {
            ...exactPrefix()[0]!,
            messageId: MessageId.makeUnsafe("import-extra"),
            sourceMessageId: MessageId.makeUnsafe("message-user-2"),
            sourceMessageUpdatedAt: "2026-08-17T00:00:04.000Z",
            createdAt: "2026-08-17T00:00:04.000Z",
            updatedAt: "2026-08-17T00:00:04.000Z",
          },
        ],
      }),
    ],
    [
      "different cwd",
      () => ({
        worktreePath: "/tmp/worktrees/other",
        associatedWorktreePath: "/tmp/worktrees/other",
      }),
    ],
  ])("rejects %s without emitting a target event", async (_label, patch) => {
    await expect(
      Effect.runPromise(
        decideOrchestrationCommand({
          command: { ...scopedForkCommand(), ...patch() },
          readModel: await readModelWithSourceMessages(),
        }),
      ),
    ).rejects.toThrow();
  });

  it("rejects a prefix whose source attachments cannot be replayed exactly", async () => {
    const readModel = await readModelWithSourceMessages();
    const sourceWithAttachment = {
      ...readModel,
      threads: readModel.threads.map((thread) =>
        thread.id === SOURCE_THREAD_ID
          ? Object.assign({}, thread, {
              messages: thread.messages.map((sourceMessage, index) =>
                index === 0
                  ? Object.assign({}, sourceMessage, {
                      attachments: [
                        {
                          type: "file" as const,
                          id: "attachment-1",
                          name: "context.txt",
                          mimeType: "text/plain",
                          sizeBytes: 7,
                        },
                      ],
                    })
                  : sourceMessage,
              ),
            })
          : thread,
      ),
    };
    await expect(
      Effect.runPromise(
        decideOrchestrationCommand({
          command: {
            ...scopedForkCommand(),
            importedMessages: [
              {
                ...exactPrefix()[0]!,
                attachments: [
                  {
                    type: "file" as const,
                    id: "attachment-1",
                    name: "context.txt",
                    mimeType: "text/plain",
                    sizeBytes: 7,
                  },
                ],
              },
              exactPrefix()[1]!,
            ],
          },
          readModel: sourceWithAttachment,
        }),
      ),
    ).rejects.toThrow(/cannot replay source attachments/);
  });

  it("rejects the latest settled assistant cutoff", async () => {
    const readModel = await readModelWithSourceMessages();
    const importedMessages = [
      ...exactPrefix(),
      {
        messageId: MessageId.makeUnsafe("import-user-2"),
        sourceMessageId: MessageId.makeUnsafe("message-user-2"),
        sourceMessageUpdatedAt: "2026-08-17T00:00:04.000Z",
        role: "user" as const,
        text: "user:message-user-2",
        createdAt: "2026-08-17T00:00:04.000Z",
        updatedAt: "2026-08-17T00:00:04.000Z",
      },
      {
        messageId: MessageId.makeUnsafe("import-assistant-2"),
        sourceMessageId: MessageId.makeUnsafe("message-assistant-2"),
        sourceMessageUpdatedAt: "2026-08-17T00:00:06.000Z",
        role: "assistant" as const,
        text: "assistant:message-assistant-2",
        createdAt: "2026-08-17T00:00:05.000Z",
        updatedAt: "2026-08-17T00:00:06.000Z",
      },
    ];
    await expect(
      Effect.runPromise(
        decideOrchestrationCommand({
          command: {
            ...scopedForkCommand(),
            forkScope: {
              ...scopedForkCommand().forkScope,
              sourceMessageId: MessageId.makeUnsafe("message-assistant-2"),
              sourceMessageUpdatedAt: "2026-08-17T00:00:06.000Z",
            },
            importedMessages,
          },
          readModel,
        }),
      ),
    ).rejects.toThrow(/before the end/);
  });
});
