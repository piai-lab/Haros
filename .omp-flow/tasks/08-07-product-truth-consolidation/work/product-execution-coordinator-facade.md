---
type: "Work"
title: "Product Execution Coordinator, thin facade and frozen C"
---

# Product Execution Coordinator, thin facade and frozen C

## Objective

Complete Wave 2 by extracting the single `ProductExecutionCoordinator`, reducing
`ProductControlPlane` to the sole 36-operation Web/RPC facade, separating diagnostics, and freezing
the integrated candidate C. Prove the complete B0/B1/C complexity, dependency, authority and live
journey gates. This Work realizes PRD A11, A12, the C half of A14 and integrated A15.

## Useful inputs

- [PRD R9 and R11](../prd.md)
- [Design Coordinator, facade, composition, gates and verification](../design.md)
- accepted [B1](../handoffs/direct-first-public-b1.md),
  [Native Host](../handoffs/native-host-package-root-binding.md),
  [execution leaf](../handoffs/product-execution-leaf.md) and
  [Store](../handoffs/product-state-store.md) handoffs

## Entry stop

All four handoffs above must be current and different-actor accepted. Their B1 chain must bind the
accepted immutable v9 meter Review receipt and SHA/digests. The accepted Store candidate/report is
this Work's immutable comparison predecessor. The frozen complexity instrument and immutable B1
SHA, Work/v9-authority/declaration/B1-verifier/dependency/import-universe digests plus accepted B1
case-manifest/trace/fault/race/kill and hidden-mutation/source-Review receipts must match the B1
handoff byte-for-byte; mismatch stops rather than
reconstructing or remeasuring with a revised universe.
Main/human orchestration supplies the full Store evidence commit through the official
`--predecessor-evidence` input. V9 loads only its unchanged table-named blobs and requires reviewed-
Store→evidence→this-candidate first-parent ancestry with exact report/digests and internally distinct
declared actors. Receipt/history cannot select or authenticate it; later Review verifies the invocation.

## Allowed code and output boundary

- Candidate Git mutability is exactly the 12 production rows in the machine block below plus the
  17 exact `product-execution-coordinator-facade` rows in the Design-owned
  [verification-path table](../design.md#exact-per-work-verification-path-authority), under each
  row's presence/mode/lifecycle and purpose. No test, support, probe, process, extension or root
  label adds a path.
- Create `apps/service/src/product/productExecutionCoordinator.ts` and exact
  `apps/service/src/product/productExecutionCoordinator.test.ts`.
- Create `apps/service/src/product/productStateDiagnostics.ts` only as explicit probe-only
  composition.
- Reduce `apps/service/src/product/ProductControlPlane.ts` and exact
  `apps/service/src/product/ProductControlPlane.test.ts` to the facade/layer,
  delegating state to Store and submit/retry/control/effects to Coordinator.
- Update `apps/service/src/wsRpc.ts`, `effectServer.ts`, `serverLayers.ts`, `server/readiness.ts`,
  `main.ts`, and exactly `native-host/liveJourneyProbe.ts`,
  `native-host/packageCrashProbe.ts`, `opencode/liveJourneyProbe.ts` and
  `product/engineJourneyProof.ts` only for final composition, facade acquisition and diagnostic
  capability use. The only mutable checked-in verification paths for that composition are the exact
  rows in the Design table, including new `apps/service/src/wsRpc.product.test.ts` and the existing
  `apps/service/src/main.test.ts`, `apps/service/src/http.test.ts`, exact probe/process tests and
  `apps/service/src/product/engineJourneyProof.test.ts`.
- Update only exact `apps/service/src/product/productStateStore.test.ts`,
  `apps/service/src/product/testSupport/productExecutionFixture.ts` and
  `apps/service/src/product/testSupport/productStateFixture.ts` to partition existing Store/
  Coordinator proof without duplicating fixtures. These three approved-absent rows may change here
  only after their required prior Store/leaf materializations remain present at mode `100644`.
- Write [handoff](../handoffs/product-truth-candidate.md).

The Work may not modify the complexity script/config, B1 commit/evidence, Product schema/table
count, Native Host transcript/root contract, Engine wire/session behavior, Package lifecycle state,
Web behavior or compatibility deletion. It may not introduce a generic registry/manager,
per-Engine Product plane, raw transaction callback or fallback.
The machine block below is the sole production/measurement/dependency path classification; prose
does not authorize an unlisted production path. The Design verification table is the sole
verification-path classification. Runtime-generated temporary homes are not Git paths and receive
no exemption.

```omp-flow-production-boundary-v1
{
  "work": "product-execution-coordinator-facade",
  "production": [
    { "kind": "exact", "path": "apps/service/src/product/productExecutionCoordinator.ts" },
    { "kind": "exact", "path": "apps/service/src/product/productStateDiagnostics.ts" },
    { "kind": "exact", "path": "apps/service/src/product/ProductControlPlane.ts" },
    { "kind": "exact", "path": "apps/service/src/wsRpc.ts" },
    { "kind": "exact", "path": "apps/service/src/effectServer.ts" },
    { "kind": "exact", "path": "apps/service/src/serverLayers.ts" },
    { "kind": "exact", "path": "apps/service/src/server/readiness.ts" },
    { "kind": "exact", "path": "apps/service/src/main.ts" },
    { "kind": "exact", "path": "apps/service/src/native-host/liveJourneyProbe.ts" },
    { "kind": "exact", "path": "apps/service/src/native-host/packageCrashProbe.ts" },
    { "kind": "exact", "path": "apps/service/src/opencode/liveJourneyProbe.ts" },
    { "kind": "exact", "path": "apps/service/src/product/engineJourneyProof.ts" }
  ],
  "measurement": [],
  "dependency": []
}
```

## Done conditions

- Coordinator alone owns the injected execution boundary, literal gateway use, committed catalog
  memory/throttle, prepared handles, subscriptions and prepare/attempt/control/close/startup order;
  it contains no SQL/schema/table logic and opens no database.
- Catalog memory changes only after Store fact commit. Preparation stays outside SQLite; admission
  failure closes the handle; crash after admission before retention remains selected-engine
  unavailable with attempt zero; typed Retry preserves the frozen Engine/selection; no automatic
  prepare/send/replay/fallback occurs.
- `ProductControlPlane` has exactly the 36 existing RPC operations and one error translation.
  `wsRpc` imports only the facade. Whole-tree scans justify deletion of test-only `hasConversation`
  and `observeRun`; admission/recovery/dispatch are Coordinator internals; outbox inspection is
  reachable only through `ProductStateDiagnostics` in probe targets.
- Final static gates report one Product connection/database/durable state machine, 21 tables, zero
  SQL writers outside Store, zero raw transaction exports, zero core cycle, zero Engine import of
  Store/facade, zero Host lifecycle write, zero legacy caller/import and one literal two-Engine
  gateway. Allowed core directions are only facade→Store, facade→Coordinator,
  Coordinator→Store and Coordinator→execution leaf.
- The frozen v9 instrument reports Design-pinned production membership and all 17 exact verification
  row lifecycles, accepted predecessor binding and
  exact evidence tuple, selected-Work lifecycle, exact outside presence/mode/blob equality,
  declaration identity/export-private disposition and dependency bytes, plus observational literal
  graph/SCC/structural counts and separately reviewed conjunctive Product gates:
  changed-scope and steady-state production
  lines C<B0, responsibility slice C<B1, changed import edges C<B0, and every semantic counter at
  the approved value. The Store is the sole C Product ingress owner and the unsplit B1 owner is
  absent. Runtime cleanup/refusal/lock behavior remains separately proved by rerunning the frozen
  owner-local verifier matrix, every r1-r17 hidden mutation and deterministic raw-reference/source
  Review after the owner move. Failure of
  any structural or behavior gate rejects C even when other tests pass.

## Verification

- Exact `apps/service/src/product/productExecutionCoordinator.test.ts` covers catalog commit failure,
  admission compensation, attempt/control,
  crash before handle retention, crash after `markSent`, selected-Engine rejection, late fact after
  abort and no fallback. The remaining exact Design verification rows retain integrated Queue-to-
  Run, first observed fact+binding+cursor, settlement, startup recovery and concurrent dispatch
  claim cases.
- Run only this Work's exact 17 checked-in verification rows for Product, Store, Coordinator,
  gateway, Pi boundary, OpenCode boundary, Package lifecycle and Native Host v2 proof;
  typecheck/build affected workspaces; run exact API,
  import/no-cycle/writer/connection/table/state-machine, five-Work coverage and B0/B1/C gates.
- On isolated first-public fixture homes, run packaged Electron→Service→Host restart/reopen and the
  smallest complete live journeys: MiMo Pi Chat plus continuation and Package generation, DeepSeek
  Pi Chat plus continuation and Package generation, and one OpenCode next-Run with Pi calls zero.
  Record exact selected Engine/model/generation, sibling Engine call count zero, attempt one and
  replay/fallback zero. Include the accepted Native Host dev+packaged transcript matrix rather than
  substituting mocks.
- Obtain live credentials only through the authorized local secret inventory and inject them in
  process; never write or report keys, full endpoints, raw responses or correlatable identifiers.
  Use hard timeouts, bounded requests and sanitized evidence. Never use the maintainer's canonical
  Product store.
- Freeze one clean C SHA, run `git diff --check` and relevant final area gates once on that SHA, and
  record failures without rerunning unchanged probes merely to seek green output.

## Expected handoff

Write [`handoffs/product-truth-candidate.md`](../handoffs/product-truth-candidate.md) with exactly one
`omp-flow-product-truth-complexity-v9-report-v1` complete canonical JSON block. It must record the
complete official invocation and deterministic evidence tuple, link the measurement Work and all
five product Works plus accepted reviews, record immutable B0, B1 and C full SHAs, and include deterministic
B0/B1/C JSON metrics, exact facade/table/connection/writer/import/cycle counters, focused/final gate
commands, sanitized real-journey results and remaining limitations. The producer may submit affected
Campaign claims only as `candidate` and must request a different-actor review; this handoff cannot
self-verify the Campaign or authorize Remote work.
