import {
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  EventId,
  ProjectId,
  SpaceId,
  ThreadId,
  type OrchestrationEvent,
} from "@synara/contracts";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { decideOrchestrationCommand } from "./decider.ts";
import { createEmptyReadModel, projectEvent } from "./projector.ts";

const PROJECT_ID = ProjectId.makeUnsafe("project-1");
const THREAD_ID = ThreadId.makeUnsafe("thread-1");
const GROUP_A = SpaceId.makeUnsafe("group-a");
const GROUP_B = SpaceId.makeUnsafe("group-b");

function event(input: {
  sequence: number;
  type: OrchestrationEvent["type"];
  aggregateKind: OrchestrationEvent["aggregateKind"];
  aggregateId: ProjectId | ThreadId | SpaceId;
  payload: unknown;
}): OrchestrationEvent {
  const occurredAt = `2026-08-10T00:00:0${input.sequence}.000Z`;
  return {
    sequence: input.sequence,
    eventId: EventId.makeUnsafe(`event-${input.sequence}`),
    type: input.type,
    aggregateKind: input.aggregateKind,
    aggregateId: input.aggregateId,
    occurredAt,
    commandId: CommandId.makeUnsafe(`command-${input.sequence}`),
    causationEventId: null,
    correlationId: null,
    metadata: {},
    payload: input.payload as never,
  } as OrchestrationEvent;
}

async function readModelWithGroups(projectKind: "project" | "chat" | "studio" = "project") {
  const createdAt = "2026-08-10T00:00:00.000Z";
  let model = createEmptyReadModel(createdAt);
  model = await Effect.runPromise(
    projectEvent(
      model,
      event({
        sequence: 1,
        type: "project.created",
        aggregateKind: "project",
        aggregateId: PROJECT_ID,
        payload: {
          projectId: PROJECT_ID,
          kind: projectKind,
          title: "Project",
          workspaceRoot: "/tmp/project",
          defaultModelSelection: null,
          scripts: [],
          createdAt,
          updatedAt: createdAt,
        },
      }),
    ),
  );
  model = await Effect.runPromise(
    projectEvent(
      model,
      event({
        sequence: 2,
        type: "thread.created",
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        payload: {
          threadId: THREAD_ID,
          projectId: PROJECT_ID,
          title: "Thread",
          modelSelection: { provider: "codex", model: "gpt-5-codex" },
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          runtimeMode: "full-access",
          envMode: "local",
          branch: null,
          worktreePath: null,
          createdAt,
          updatedAt: createdAt,
        },
      }),
    ),
  );
  for (const [index, groupId] of [GROUP_A, GROUP_B].entries()) {
    model = await Effect.runPromise(
      projectEvent(
        model,
        event({
          sequence: index + 3,
          type: "space.created",
          aggregateKind: "space",
          aggregateId: groupId,
          payload: {
            spaceId: groupId,
            name: index === 0 ? "Research" : "Launch",
            icon: "bag",
            sortOrder: index,
            createdAt,
            updatedAt: createdAt,
          },
        }),
      ),
    );
  }
  return model;
}

describe("conversation Groups", () => {
  it("stores ordered many-to-many membership on the existing Thread event", async () => {
    const model = await readModelWithGroups();
    const result = await Effect.runPromise(
      decideOrchestrationCommand({
        readModel: model,
        command: {
          type: "thread.meta.update",
          commandId: CommandId.makeUnsafe("command-membership"),
          threadId: THREAD_ID,
          groupIds: [GROUP_A, GROUP_B],
        },
      }),
    );
    const membershipEvent = Array.isArray(result) ? result[0] : result;
    expect(membershipEvent?.type).toBe("thread.meta-updated");
    if (!membershipEvent || membershipEvent.type !== "thread.meta-updated") return;
    expect(membershipEvent.payload.groupIds).toEqual([GROUP_A, GROUP_B]);

    const next = await Effect.runPromise(projectEvent(model, membershipEvent));
    expect(next.threads[0]?.groupIds).toEqual([GROUP_A, GROUP_B]);
    expect(next.projects[0]?.spaceId).toBeNull();
  });

  it("rejects duplicate or unknown Group identities", async () => {
    const model = await readModelWithGroups();
    await expect(
      Effect.runPromise(
        decideOrchestrationCommand({
          readModel: model,
          command: {
            type: "thread.meta.update",
            commandId: CommandId.makeUnsafe("command-duplicates"),
            threadId: THREAD_ID,
            groupIds: [GROUP_A, GROUP_A],
          },
        }),
      ),
    ).rejects.toThrow("must be unique");

    await expect(
      Effect.runPromise(
        decideOrchestrationCommand({
          readModel: model,
          command: {
            type: "thread.meta.update",
            commandId: CommandId.makeUnsafe("command-unknown"),
            threadId: THREAD_ID,
            groupIds: [SpaceId.makeUnsafe("missing")],
          },
        }),
      ),
    ).rejects.toThrow("does not exist");
  });

  it.each(["chat", "studio"] as const)(
    "rejects %s container conversations even when a Group exists",
    async (projectKind) => {
      const model = await readModelWithGroups(projectKind);
      await expect(
        Effect.runPromise(
          decideOrchestrationCommand({
            readModel: model,
            command: {
              type: "thread.meta.update",
              commandId: CommandId.makeUnsafe(`command-${projectKind}-membership`),
              threadId: THREAD_ID,
              groupIds: [GROUP_A],
            },
          }),
        ),
      ).rejects.toThrow("Only folder-backed Agent conversations");
    },
  );

  it("removes a deleted Group membership without deleting or moving the conversation", async () => {
    const model = await readModelWithGroups();
    const withMembership = await Effect.runPromise(
      projectEvent(
        model,
        event({
          sequence: 5,
          type: "thread.meta-updated",
          aggregateKind: "thread",
          aggregateId: THREAD_ID,
          payload: {
            threadId: THREAD_ID,
            groupIds: [GROUP_A, GROUP_B],
            updatedAt: "2026-08-10T00:00:05.000Z",
          },
        }),
      ),
    );
    const afterDelete = await Effect.runPromise(
      projectEvent(
        withMembership,
        event({
          sequence: 6,
          type: "space.deleted",
          aggregateKind: "space",
          aggregateId: GROUP_A,
          payload: {
            spaceId: GROUP_A,
            deletedAt: "2026-08-10T00:00:06.000Z",
          },
        }),
      ),
    );
    expect(afterDelete.threads).toHaveLength(1);
    expect(afterDelete.threads[0]?.projectId).toBe(PROJECT_ID);
    expect(afterDelete.threads[0]?.groupIds).toEqual([GROUP_B]);
  });
});
