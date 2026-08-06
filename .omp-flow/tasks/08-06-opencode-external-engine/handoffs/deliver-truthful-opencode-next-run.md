---
type: "Implementation Handoff"
title: "Deliver a truthful OpenCode next Run"
status: "PRE_CANDIDATE_READY"
work: "../work/deliver-truthful-opencode-next-run.md"
actorId: "opencode_external_implement_r1_9_g2"
receipt: "675842b6bd59433aa8007801f9c9822e"
---

# Deliver a truthful OpenCode next Run — pre-candidate handoff

## Result

`PRE_CANDIDATE_READY`. The authorized non-live implementation and focused proof are complete. It
is not yet a candidate and must not enter Review until the owner creates the candidate commit and
runs the candidate-SHA real journeys. No commit or live journey was run, as required by this
dispatch.

Implemented in this batch:

- retained and reverified the concrete OpenCode install/ACP/scratch/execution fragment;
- retained the literal two-boundary gateway and fixed observation-hook routing so a Run's
  post-observation hook returns only to the Engine that attempted that Run;
- added the startup-only schema-1 historical selected-Run transform anchored to the production
  `ProductSelectedRuntime` codec;
- preserved legacy Engine/model/Thinking/policy/target/Package values, omitted enforcement only
  from selected intent, and validated independently resolved truth;
- added the explicitly required isolated permission-policy and Thinking mismatch fixtures.
- added the source-named schema-1 Automation definition and permission-snapshot transforms;
- decoded both Automation embeddings with their production v1 codecs, emitted explicit v2
  selected/unavailable Engine intent, and replaced only the permission snapshot's nested selection
  while preserving its permission, capability, iteration and timestamp semantics.
- added a source-specific, startup-only two-store selection coordinator using the existing
  lifecycle locks and temporary file-backed SQLite connections;
- added matching `selection-schema-v2` Product/Automation markers, zero-write cross-store
  selection preflight, Product-first independent transactions, marker-last commits, validation of
  v2 recovery states, reverse-order handle/lock cleanup and deterministic fault hooks;
- proved file-backed preflight failure, transaction rollback, the durable Product-v2/Automation-v1
  recovery state, exactly-once resume/idempotent reopen and lifecycle-lock release.
- cut the closed Product contract to protocol v2: runtime choice, composed maximum-two Engine
  catalog, nullable external Package generation, resolved Engine mode, no-ACK execution evidence,
  abort evidence and requested control truth;
- cut ProductControlPlane and Pi/Automation/Service consumers to the v2 runtime contract without a
  v1 runtime decoder, including schema-v2 markers and Product lifecycle locking;
- persisted `engine_id` in every outbox admission and removed the gateway's process-memory
  Run-to-Engine map; post-attempt routing now consumes the authoritative Run selection Engine;
- extended the startup coordinator over Queue selections, Run selections, receipts, exact submit
  admissions, the closed 24 mutation-kind inventory, outbox Engine identity and reconstructible
  fact/cursor reset;
- connected the coordinator at the config-first outer `Layer.unwrap` seam before normal Product,
  Automation, SQLite or Web admission owners are constructed.
- added the explicit composer draft v2 key and synchronous pre-hydration migration for both
  inventoried selection paths, with write-reread-v2-validate-cleanup ordering, validated-v2 crash
  recovery, v1 preservation on failure and dispatch recovery gating;
- cut the Product runtime picker to the composed Engine catalog: Pi remains the initial default,
  while explicit OpenCode retains `engine-session-current`, no Package generation and truthful
  approval/enforcement copy.
- completed the Web v2 consumer cut across Chat send, Kanban dispatch/admission, Automation,
  read-model, Store and browser fixtures; the complete Web TypeScript project now has zero errors;
- replaced the generic 24-kind mutation envelope proof with an exhaustive production codec table,
  one legal schema-1 fixture per mutation family and file-backed reopen proof that preserves every
  mutation identity and canonical request/response byte without reapplication.
- implemented the binding two-phase execution seam: asynchronous Engine prepare completes before
  admission, SQLite then revalidates Queue CAS/identity and freezes Engine/resolved-selection
  truth, conflicts close the prepared handle, and post-commit dispatch consumes only that handle;
- added the OpenCode Product boundary adapter and literal Pi+OpenCode server composition. OpenCode
  preparation verifies installation and resolves Session model/mode in private Chat scratch;
  observed settlement/outcome-unknown uses observed-delivery evidence without an operationRef.

## Changed paths

- `apps/service/src/opencode/**`
- `apps/service/src/product/productExecutionGateway.ts`
- `apps/service/src/product/productExecutionGateway.test.ts`
- `apps/service/src/product/schema1SelectionMigration.ts`
- `apps/service/src/product/schema1SelectionMigration.test.ts`
- `apps/service/src/persistence/automationSelectionMigration.ts`
- `apps/service/src/persistence/automationSelectionMigration.test.ts`
- `apps/service/src/persistence/selectionSchemaCoordinator.ts`
- `apps/service/src/persistence/selectionSchemaCoordinator.test.ts`
- `packages/contracts/src/product/state.ts`
- `packages/contracts/src/product/state.test.ts`
- `apps/service/src/product/ProductControlPlane.ts`
- `apps/service/src/product/ProductControlPlane.test.ts`
- `apps/service/src/product/schema1ProductMigration.ts`
- `apps/service/src/product/schema1ProductMigration.test.ts`
- `apps/service/src/product/schema1ProductMutationFixtures.ts`
- `apps/service/src/persistence/AutomationSchema.ts`
- `apps/service/src/main.ts`
- necessary Pi probe, Native boundary and Automation consumer/test adjustments
- `apps/web/src/composerDraftV2Migration.ts`
- `apps/web/src/composerDraftV2Migration.test.ts`
- `apps/web/src/composerDraftDomain.ts`
- `apps/web/src/bootstrap.ts`
- `apps/web/src/components/product/ProductRuntimePicker.tsx`
- `apps/web/src/components/product/ProductRuntimePicker.test.ts`
- `apps/web/src/components/ChatView.tsx` (v2 selection state and recovery gate; remaining send-path
  and fresh-catalog send reconciliation)
- the bounded Web Product/Kanban/Automation consumers and focused fixtures named in the Work diff
- `apps/web/src/testProductRuntimeCatalog.ts` (shared closed-v2 test fixture)

Pre-existing unrelated edits to `architecture/execution.md` and `architecture/product-state.md`
remain preserved.

## Exact verification

```text
bun run --cwd apps/service test -- src/opencode src/product/productExecutionGateway.test.ts --reporter=dot
PASS: 4 files, 9 tests

bun run --cwd apps/service test -- src/product/schema1SelectionMigration.test.ts --reporter=dot
PASS: 1 file, 3 tests

bun run --cwd apps/service typecheck
PASS

bun run --cwd packages/contracts typecheck
PASS

bun run --cwd apps/service test -- src/persistence/automationSelectionMigration.test.ts src/product/schema1SelectionMigration.test.ts --reporter=dot
PASS: 2 files, 7 tests

bun run --cwd apps/service typecheck
PASS

git diff --check
PASS

bun run --cwd apps/web test -- src/composerDraftV2Migration.test.ts src/components/product/ProductRuntimePicker.test.ts --reporter=dot
PASS: 2 files, 5 tests

bun run --cwd apps/service test -- src/product/ProductControlPlane.test.ts src/product/productExecutionGateway.test.ts src/product/schema1ProductMigration.test.ts src/product/schema1SelectionMigration.test.ts src/persistence/automationSelectionMigration.test.ts src/persistence/selectionSchemaCoordinator.test.ts src/native-host/executionBoundary.test.ts src/persistence/Layers/AutomationRepository.test.ts src/main.test.ts --reporter=dot
PASS: 9 files, 123 tests

bun run --cwd packages/contracts test -- src/product/state.test.ts --reporter=dot
PASS: 1 file, 4 tests

bun run --cwd apps/service test -- src/product/schema1ProductMigration.test.ts src/persistence/selectionSchemaCoordinator.test.ts
PASS: 2 files, 6 tests

bun run --cwd apps/web typecheck
PASS: 0 TypeScript errors

bun run --cwd apps/web test -- src/composerDraftV2Migration.test.ts src/components/product/ProductRuntimePicker.test.ts src/productQueueReconciliation.test.ts src/productReadModel.test.ts src/lib/kanbanDispatch.test.ts src/components/kanban/kanbanRuntimeSelection.test.ts src/store/productStore.test.ts src/routes/-automations.shared.test.tsx src/notifications/productCompletion.logic.test.ts src/lib/composerAutomation.test.ts --reporter=dot
PASS: 10 files, 149 tests

bun run --cwd apps/web test:browser -- src/components/ProductChatJourney.browser.tsx src/components/AutomationModelPicker.browser.tsx src/components/chat/environment/EnvironmentAutomationsSection.browser.tsx src/components/kanban/KanbanDispatchAdmission.browser.tsx src/components/kanban/KanbanRuntimePicker.browser.tsx src/components/kanban/useKanbanTaskSubmit.browser.tsx --reporter=dot
PASS: 6 files, 18 Chromium tests

bun run --cwd apps/service test -- src/product/ProductControlPlane.test.ts src/product/productExecutionGateway.test.ts src/product/schema1ProductMigration.test.ts src/product/schema1SelectionMigration.test.ts src/persistence/automationSelectionMigration.test.ts src/persistence/selectionSchemaCoordinator.test.ts src/native-host/executionBoundary.test.ts src/persistence/Layers/AutomationRepository.test.ts src/main.test.ts src/opencode --reporter=dot
PASS: 12 files, 130 tests

Latest integrated rerun after async prepare/server composition:
PASS: 12 files, 138 tests (including prepare/CAS race cleanup and five-point crash convergence)

bun run --cwd apps/service test -- src/product/productExecutionGateway.test.ts --reporter=dot
PASS: 1 file, 3 tests (including selected-Engine-only async prepare routing)

bun run --cwd apps/web test -- [12 focused Product/health files] --reporter=dot
PASS: 12 files, 164 tests

bun run --cwd apps/web test:browser -- [6 focused Product/Kanban browser files] --reporter=dot
PASS: 6 files, 18 Chromium tests

bun run --cwd apps/service typecheck
PASS

bun run --cwd packages/contracts typecheck
PASS

git diff --check
PASS

bun run --cwd apps/service test -- src/persistence/selectionSchemaCoordinator.test.ts --reporter=dot
PASS: 1 file, 3 tests

bun run --cwd apps/service test -- src/persistence/selectionSchemaCoordinator.test.ts src/persistence/automationSelectionMigration.test.ts src/product/schema1SelectionMigration.test.ts src/product/productExecutionGateway.test.ts src/opencode --reporter=dot
PASS: 7 files, 19 tests

bun run --cwd apps/service typecheck
PASS

bun run --cwd packages/contracts typecheck
PASS

git diff --check
PASS
```

## Decisions and caveats

- The r1.9 Automation/Web inventory matches the repository; no new durable owner or topology
  contradiction was found.
- The two-store coordinator must acquire at the config-first outer composition seam, not as a
  sibling layer.
- A diagnostic Product-v2 contract edit proved the cutover must be atomic across current Product,
  Native, Automation and Web consumers. Those temporary edits were fully withdrawn; Contracts
  remain v1 and green.
- Gateway Run-to-Engine routing is currently process-memory state because the retained v1 boundary
  has no Engine-addressed recovery interface yet. Product v2 must replace this with frozen durable
  Run/outbox Engine identity.
- Web draft authority, Chat/Kanban/Automation production consumers and the focused browser/unit
  fixtures now all consume the closed v2 contract; full Web typecheck is green.
- Every mutation family now uses its real production input/result codec. The file-backed startup
  proof closes and reopens the database, reruns the coordinator and compares all 24 durable rows
  byte-for-byte while retaining each original mutation ID.
- The server now composes the literal Pi and OpenCode boundaries. Prepare is asynchronous and
  outside SQLite; admission rechecks the Queue under `BEGIN IMMEDIATE`, persists the prepared
  resolved selection and closes the child/session handle on CAS conflict. The focused race proof
  observes one close, no Run/outbox row and zero dispatch.
- Durable attempt count now increments only with the persisted send boundary, so pre-send failures
  remain zero-attempt while sent/unknown Runs remain one-attempt and zero-replay.
- The startup crash matrix now covers every coordinator hook: after preflight, inside Product,
  after Product commit, inside Automation and after Automation commit. Each crash state converges
  on reopen and a second reopen is a no-op.
- Dispatch health is selection-aware: Pi still requires Native Host readiness, while explicit
  OpenCode is governed by Service/selected-Engine truth and is not masked by Pi health.
- OpenCode focused process proof covers scratch/session release, both disconnect windows,
  abort-requested truth, duplicate/too-late cancel and consumption of a correlated late final.
- The two exact untracked failure screenshots generated during browser iteration were verified as
  non-baseline/nontracked and removed; no directory or other artifact was deleted.

## Unproven Work conditions

candidate commit/SHA, both candidate-SHA real journeys and independent Review remain unproven.

The implementation checkpoint is ready for candidate creation, candidate-SHA real journeys and
independent Review. This handoff does not self-approve the Work.
