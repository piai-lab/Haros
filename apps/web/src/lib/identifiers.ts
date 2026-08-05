import { CommandId, MessageId, ProjectId, ThreadId } from "@omnimind/contracts";
import * as Effect from "effect/Effect";
import * as Random from "effect/Random";

export function randomUUID(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Effect.runSync(Random.nextUUIDv4);
}

export const createCommandId = (): CommandId => CommandId.makeUnsafe(randomUUID());

export const createProjectId = (): ProjectId => ProjectId.makeUnsafe(randomUUID());

export const createThreadId = (): ThreadId => ThreadId.makeUnsafe(randomUUID());

export const createMessageId = (): MessageId => MessageId.makeUnsafe(randomUUID());
