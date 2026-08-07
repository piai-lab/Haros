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
accepted immutable v6 meter Review receipt and SHA/digests. The frozen complexity instrument and
immutable B1 SHA, capability/owner-lock-authority, additive direct-tool classifier-copy
authority, unified Proof-IR/resource-flow and derived-inventory digests plus must-hold/completion
report must match the B1 handoff byte-for-byte; mismatch stops rather than
reconstructing or remeasuring with a revised universe.

## Allowed code and output boundary

- Create `apps/service/src/product/productExecutionCoordinator.ts` and focused tests.
- Create `apps/service/src/product/productStateDiagnostics.ts` only as explicit probe-only
  composition.
- Reduce `apps/service/src/product/ProductControlPlane.ts` and its tests to the facade/layer,
  delegating state to Store and submit/retry/control/effects to Coordinator.
- Update `apps/service/src/wsRpc.ts`, `effectServer.ts`, `serverLayers.ts`, `server/readiness.ts`,
  `main.ts`, their focused tests, and exactly `native-host/liveJourneyProbe.ts`,
  `native-host/packageCrashProbe.ts`, `opencode/liveJourneyProbe.ts` and
  `product/engineJourneyProof.ts` only for final composition, facade acquisition and diagnostic
  capability use.
- Update Product/Store/Coordinator test support only to partition existing proof without duplicating
  fixtures.
- Write [handoff](../handoffs/product-truth-candidate.md).

The Work may not modify the complexity script/config, B1 commit/evidence, Product schema/table
count, Native Host transcript/root contract, Engine wire/session behavior, Package lifecycle state,
Web behavior or compatibility deletion. It may not introduce a generic registry/manager,
per-Engine Product plane, raw transaction callback or fallback.
The machine block below is the sole production/measurement/dependency path classification; prose
does not authorize an unlisted production path.

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
- The frozen v6 instrument reports Design-pinned path membership, dynamic candidate edges/sinks,
  independently re-derived source/dependency database capability inventory, contextual opener/
  handle provenance across production and direct-tool members, additive classifier-copy
  authority/flow identity, reachable owner refusal cuts and
  same-binding/same-acquisition-token predecessor lock state, plus all
  conjunctive gates: changed-scope and steady-state production
  lines C<B0, responsibility slice C<B1, changed import edges C<B0, and every semantic counter at
  the approved value. Failure of any gate rejects C even when tests pass.

## Verification

- Focused Coordinator tests cover catalog commit failure, admission compensation, attempt/control,
  crash before handle retention, crash after `markSent`, selected-Engine rejection, late fact after
  abort and no fallback. Integrated tests retain Queue-to-Run, first observed fact+binding+cursor,
  settlement, startup recovery and concurrent dispatch claim.
- Run Product, Store, Coordinator, gateway, Pi boundary, OpenCode boundary, Automation, Web draft,
  Package lifecycle and Native Host v2 suites; typecheck/build affected workspaces; run exact API,
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

Write [`handoffs/product-truth-candidate.md`](../handoffs/product-truth-candidate.md). It must link
the measurement Work and all five product Works plus accepted reviews; record immutable B0, B1 and C full SHAs; include deterministic
B0/B1/C JSON metrics, exact facade/table/connection/writer/import/cycle counters, focused/final gate
commands, sanitized real-journey results and remaining limitations. The producer may submit affected
Campaign claims only as `candidate` and must request a different-actor review; this handoff cannot
self-verify the Campaign or authorize Remote work.
