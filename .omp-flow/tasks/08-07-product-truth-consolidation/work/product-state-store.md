---
type: "Work"
title: "Establish the sole Product State Store"
---

# Establish the sole Product State Store

## Objective

Extract one `ProductStateStore` capability that owns the only Product SQLite connection, lifecycle
lock, exact 21-table schema, decoding, Product facts and every Product write/transaction, while
preserving each approved compound atomic unit. This Work realizes PRD A10 and prepares, but does not
perform, the Coordinator/facade extraction.

## Useful inputs

- [PRD R8](../prd.md)
- [Design Product State Store and transaction verification](../design.md)
- [Control-plane atomic-unit map](../research/product-control-plane-map.md)
- accepted [execution-leaf handoff](../handoffs/product-execution-leaf.md)

## Entry stop

This Work begins only after immutable B1, Native Host v2 and the execution-leaf Work have
different-actor accepted handoffs. It must use the exact B1 recorded by the first handoff for later
B0/B1/C comparison.

## Allowed code and output boundary

- Create `apps/service/src/product/productStateStore.ts` and, only when needed for readability,
  private SQL files under `apps/service/src/product/state/` importable solely by the Store.
- Create Store-focused tests and one shared test fixture builder under the existing Product test
  support; do not duplicate the old 4k test setup.
- Change `apps/service/src/product/ProductControlPlane.ts` and its focused tests to delegate all
  durable reads/writes to complete Store commands while temporarily retaining existing Engine
  effects until the next Work.
- Change `apps/service/src/native-host/executionBoundary.ts`,
  `apps/service/src/native-host/liveJourneyProbe.ts`,
  `apps/service/src/native-host/packageCrashProbe.ts` and
  `apps/service/src/opencode/liveJourneyProbe.ts` only to construct/pass the single Store or consume
  its typed Package lifecycle projection/outbox diagnostics through that same connection.
- Change `apps/service/src/serverLayers.ts` only where necessary to compose and pass that single
  Store. The exact existing focused/integration proof paths that may change for this composition are
  `apps/service/src/native-host/executionBoundary.test.ts`,
  `apps/service/src/native-host/liveJourneyProbe.test.ts`,
  `apps/service/src/native-host/serviceProcess.integration.test.ts` and
  `apps/service/src/opencode/liveJourneyProbe.test.ts`.
- Write [handoff](../handoffs/product-state-store.md).

No table repository, second Product connection, raw database/statement/SQL fragment/transaction
callback export, Coordinator scaffold, new durable state machine, migration platform or per-Engine
plane is allowed. If implementation proves that any other composition, probe or test path must
change, stop and return for Work-map repair; the listed paths do not imply broader directory or
caller ownership.

## Done conditions

- Static gates report exactly one Product database construction site/connection and zero Product SQL
  writer outside Store. All 21 tables and exact g1 open/create validation remain Store-owned.
- Store commands retain complete atomic transactions for Workspace/Conversation creation, Group
  membership, annotations/mutations/facts, Queue edit/admission, claim/`markSent`, accepted delivery,
  observed delivery plus first fact/binding/selection, execution projection, settlement, abort
  request and startup recovery.
- Mutation revision/CAS, idempotency and Product fact append remain in the same transaction.
  Package replay/outbox diagnostics are read projections over the same connection.
- Store exposes typed commands/results only. Existing facade/RPC behavior remains unchanged at this
  intermediate checkpoint; Engine attempts, subscriptions and volatile catalog/handles remain in
  the still-unsplit control-plane orchestration until the next Work.

## Verification

- Transaction fault injection for every named compound unit proves full rollback and no partial
  Product fact/object state.
- Reopen/concurrency tests prove one lifecycle lock/connection, deterministic schema validation,
  concurrent dispatch claim, first-fact sequence atomicity and startup unknown recovery.
- Run Store/Product focused tests, Package projection/replay tests and Service typecheck. Static
  gates reject a second connection, writer, raw transaction export, table CRUD API or core cycle.
- Read the frozen complexity instrument without editing it; report the intermediate metrics only.
- Run the frozen v2 per-Work coverage gate over every allowed/materialized production path and its
  resolved internal import closure; any uncovered/computed/unresolved path stops for map repair.

## Expected handoff

Write [`handoffs/product-state-store.md`](../handoffs/product-state-store.md) with the immutable B1
SHA, exact Store API, SQL writer/connection inventory, per-command transaction fault results,
Package projection and outbox-diagnostic proof, exact composition/probe paths changed, imports and
focused checks. A different actor must accept it before Coordinator/facade extraction starts.
