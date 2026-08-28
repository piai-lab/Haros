import { Effect, Exit, Layer, ManagedRuntime, Scope } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import { CheckpointReactor } from "../Services/CheckpointReactor.ts";
import { EngineCommandReactor } from "../Services/EngineCommandReactor.ts";
import { EngineRuntimeIngestionService } from "../Services/EngineRuntimeIngestion.ts";
import { StudioOutputReactor } from "../Services/StudioOutputReactor.ts";
import { ThreadGitMetadataReactor } from "../Services/ThreadGitMetadataReactor.ts";
import { OrchestrationReactor } from "../Services/OrchestrationReactor.ts";
import { makeOrchestrationReactor } from "./OrchestrationReactor.ts";

describe("OrchestrationReactor", () => {
  let runtime: ManagedRuntime.ManagedRuntime<OrchestrationReactor, never> | null = null;

  afterEach(async () => {
    if (runtime) {
      await runtime.dispose();
    }
    runtime = null;
  });

  it("starts runtime observers before engine command dispatch can begin", async () => {
    const started: string[] = [];
    const stopped: string[] = [];
    let reconciledOpenTurns = 0;

    runtime = ManagedRuntime.make(
      Layer.effect(OrchestrationReactor, makeOrchestrationReactor).pipe(
        Layer.provideMerge(
          Layer.succeed(EngineRuntimeIngestionService, {
            start: Effect.acquireRelease(
              Effect.sync(() => {
                started.push("engine-runtime-ingestion");
              }),
              () => Effect.sync(() => stopped.push("engine-runtime-ingestion")),
            ),
            drain: Effect.void,
            reconcileSettledOpenTurns: Effect.sync(() => {
              reconciledOpenTurns += 1;
            }),
          }),
        ),
        Layer.provideMerge(
          Layer.succeed(EngineCommandReactor, {
            start: Effect.acquireRelease(
              Effect.sync(() => {
                started.push("engine-command-reactor");
              }),
              () => Effect.sync(() => stopped.push("engine-command-reactor")),
            ),
            drain: Effect.void,
            reconcileQueuedTurns: Effect.void,
            listBlockingDeliveries: () => Effect.succeed([]),
            reconcileDelivery: () => Effect.succeed(null),
          }),
        ),
        Layer.provideMerge(
          Layer.succeed(CheckpointReactor, {
            start: Effect.acquireRelease(
              Effect.sync(() => {
                started.push("checkpoint-reactor");
              }),
              () => Effect.sync(() => stopped.push("checkpoint-reactor")),
            ),
            drain: Effect.void,
          }),
        ),
        Layer.provideMerge(
          Layer.succeed(StudioOutputReactor, {
            captureBaselineBeforeTurn: () => Effect.void,
            cancelPendingTurnBaseline: () => Effect.void,
            start: Effect.acquireRelease(
              Effect.sync(() => {
                started.push("studio-output-reactor");
              }),
              () => Effect.sync(() => stopped.push("studio-output-reactor")),
            ),
            drain: Effect.void,
          }),
        ),
        Layer.provideMerge(
          Layer.succeed(ThreadGitMetadataReactor, {
            start: Effect.acquireRelease(
              Effect.sync(() => {
                started.push("thread-git-metadata-reactor");
              }),
              () => Effect.sync(() => stopped.push("thread-git-metadata-reactor")),
            ),
            drain: Effect.void,
          }),
        ),
      ),
    );

    const reactor = await runtime.runPromise(Effect.service(OrchestrationReactor));
    const scope = await Effect.runPromise(Scope.make("sequential"));
    await Effect.runPromise(reactor.start.pipe(Scope.provide(scope)));
    await Effect.runPromise(reactor.reconcileSettledOpenTurns);

    expect(started).toEqual([
      "studio-output-reactor",
      "checkpoint-reactor",
      "thread-git-metadata-reactor",
      "engine-runtime-ingestion",
      "engine-command-reactor",
    ]);
    expect(reconciledOpenTurns).toBe(1);

    await Effect.runPromise(Scope.close(scope, Exit.void));
    expect(stopped).toEqual([
      "engine-command-reactor",
      "engine-runtime-ingestion",
      "thread-git-metadata-reactor",
      "checkpoint-reactor",
      "studio-output-reactor",
    ]);
  });
});
