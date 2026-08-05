import { assert, it } from "@effect/vitest";
import { ProjectId, ThreadId, type AutomationCreateInput } from "@omnimind/contracts";
import { Effect, Layer } from "effect";

import { AutomationRepositoryLive } from "../../persistence/Layers/AutomationRepository.ts";
import { SqlitePersistenceMemory } from "../../persistence/Layers/Sqlite.ts";
import { AutomationService } from "../Services/AutomationService.ts";
import {
  AUTOMATION_EXECUTION_UNAVAILABLE_MESSAGE,
  AutomationServiceLive,
} from "./AutomationService.ts";

const serviceLayer = AutomationServiceLive.pipe(
  Layer.provide(AutomationRepositoryLive),
  Layer.provideMerge(SqlitePersistenceMemory),
);
const layer = it.layer(serviceLayer);

const input = {
  projectId: ProjectId.makeUnsafe("automation-product-project"),
  name: "Nightly maintenance",
  prompt: "Check the workspace and report changes.",
  schedule: { type: "daily", timeOfDay: "09:30", timezone: "Asia/Shanghai" },
  enabled: true,
  requestedSelection: {
    state: "unavailable",
    reason: "catalog-unavailable",
    requestedRuntimeModelId: null,
    permissionPolicy: "approval-required",
    enforcement: "unverified",
    executionTarget: null,
  },
  notificationPolicy: "failed-runs-only",
} satisfies AutomationCreateInput;

layer("Product-owned Automation service", (it) => {
  it.effect("preserves definition, schedule and notification settings while execution is paused", () =>
    Effect.gen(function* () {
      const service = yield* AutomationService;
      const created = yield* service.create(input);
      const listed = yield* service.list();

      assert.isFalse(created.enabled);
      assert.isNull(created.nextRunAt);
      assert.deepStrictEqual(created.schedule, input.schedule);
      assert.strictEqual(created.notificationPolicy, "failed-runs-only");
      assert.strictEqual(listed.definitions.length, 1);
      assert.strictEqual(listed.definitions[0]?.id, created.id);
    }),
  );

  it.effect("persists accepted proposals as paused definitions and dismisses rejected proposals", () =>
    Effect.gen(function* () {
      const service = yield* AutomationService;
      const pending = yield* service.create({
        ...input,
        name: "Suggested maintenance",
        enabled: false,
        proposalState: "pending",
      });
      const accepted = yield* service.resolveProposal({
        automationId: pending.id,
        resolution: "accepted",
      });
      assert.strictEqual(accepted.definition.proposalState, "accepted");
      assert.isFalse(accepted.definition.enabled);
      assert.isNull(accepted.definition.nextRunAt);

      const dismissedPending = yield* service.create({
        ...input,
        name: "Dismissed suggestion",
        enabled: false,
        proposalState: "pending",
      });
      const dismissed = yield* service.resolveProposal({
        automationId: dismissedPending.id,
        resolution: "dismissed",
      });
      assert.strictEqual(dismissed.definition.proposalState, "dismissed");
      assert.isNotNull(dismissed.definition.archivedAt);
    }),
  );

  it.effect("keeps run-now truthful and never creates a donor execution Run", () =>
    Effect.gen(function* () {
      const service = yield* AutomationService;
      const created = yield* service.create(input);
      const failure = yield* Effect.flip(service.runNow({ automationId: created.id }));
      const listed = yield* service.list();

      assert.strictEqual(failure.message, AUTOMATION_EXECUTION_UNAVAILABLE_MESSAGE);
      assert.deepStrictEqual(listed.runs, []);
    }),
  );

  it.effect("retains memory and archive management without an execution dispatcher", () =>
    Effect.gen(function* () {
      const service = yield* AutomationService;
      const created = yield* service.create(input);
      const memory = yield* service.updateMemory({
        automationId: created.id,
        content: "Remember the last reviewed revision.",
        callerThreadId:
          created.sourceThreadId ?? ThreadId.makeUnsafe("automation-management"),
        callerTurnId: null,
      });
      assert.strictEqual((yield* service.getMemory(created.id))?.content, memory.content);

      yield* service.delete({ id: created.id });
      const listed = yield* service.list();
      assert.isFalse(listed.definitions.some((definition) => definition.id === created.id));
    }),
  );
});
