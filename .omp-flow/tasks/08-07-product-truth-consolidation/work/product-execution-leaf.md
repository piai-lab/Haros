---
type: "Work"
title: "Extract the Product execution dependency leaf"
---

# Extract the Product execution dependency leaf

## Objective

After immutable B1 is accepted, move the source-neutral execution contract and shared typed error
out of `ProductControlPlane.ts`, and move the production-exported execution fixture into test
support. Gateways and concrete Pi/OpenCode boundaries must depend on the leaf without creating a new
authority. This is the smallest independently reviewable first step of PRD R9/R11.

## Useful inputs

- [Design execution boundary leaf](../design.md)
- [Control-plane responsibility map](../research/product-control-plane-map.md)
- [Immutable B1 Work and handoff](direct-first-public-b1.md)

## Entry stop

Do not assign or start this Work until [`handoffs/direct-first-public-b1.md`](../handoffs/direct-first-public-b1.md)
records a different-actor-accepted clean immutable B1 and zero production Store/Coordinator/leaf
extraction surface, and the Native Host Work must have a different-actor-accepted handoff whose
candidate/report is this Work's immutable comparison predecessor. The chain must name the accepted
immutable v9 meter Review receipt and SHA/digests, including Work/v9-authority/public-shape/
B1-verifier/dependency/import/universe digests, and its accepted
verifier case-manifest/trace/fault/race/kill plus hidden-mutation/source-Review receipts. The
implementation base must contain that exact B1 commit. Main/human orchestration supplies the full
Native Host evidence commit through the official `--predecessor-evidence` input. V9 loads its
unchanged table-named blobs and requires reviewed-Native-Host→evidence→this-candidate first-parent
ancestry with exact report/digests and internally distinct declared actors. Receipt/history cannot
select or authenticate it; later Review verifies the invocation.

## Allowed code and output boundary

- Create `apps/service/src/product/productExecutionBoundary.ts` and a focused test.
- Create one clearly test-only fixture module under `apps/service/src/product/testSupport/`.
- Change `apps/service/src/product/ProductControlPlane.ts` and its test only to remove the moved
  contract/error/fixture and import the leaf/test support.
- Change `apps/service/src/product/productExecutionGateway.ts` and its test,
  `apps/service/src/native-host/executionBoundary.ts` and focused tests/probes, and
  `apps/service/src/opencode/productBoundary.ts` and focused tests/probes only to replace imports.
- Write [handoff](../handoffs/product-execution-leaf.md).

No Product SQL, schema, Store, Coordinator, facade method, runtime behavior, Package root or wire
behavior may change. The leaf may import Product contracts and generic libraries only.

```omp-flow-production-boundary-v1
{
  "work": "product-execution-leaf",
  "production": [
    { "kind": "exact", "path": "apps/service/src/product/productExecutionBoundary.ts" },
    { "kind": "exact", "path": "apps/service/src/product/ProductControlPlane.ts" },
    { "kind": "exact", "path": "apps/service/src/product/productExecutionGateway.ts" },
    { "kind": "exact", "path": "apps/service/src/native-host/executionBoundary.ts" },
    { "kind": "exact", "path": "apps/service/src/opencode/productBoundary.ts" }
  ],
  "measurement": [],
  "dependency": []
}
```

## Done conditions and verification

- `productExecutionBoundary.ts` owns only closed types, prepared-handle contract, unavailable
  boundary and common typed execution error; it holds no state and imports no Store/facade/concrete
  Engine.
- Literal gateway, Pi and OpenCode boundaries import the leaf and never the monolith for execution
  types. Production imports of the execution fixture are zero; it exists only under test support.
- Focused boundary/gateway/Product tests and Service typecheck pass. Structural import checks show
  no new cycle, no SQL/schema/table token in the leaf and no behavior/API snapshot drift.
- The frozen complexity instrument is read-only and reports the intermediate result without
  treating it as C or changing B1.
- The frozen v9 gate accounts for every production path; newly materialized static edges pass only
  between frozen members, while outside-set, unresolved/nonliteral or forbidden static edges stop.
  Its accepted predecessor/evidence tuple, outside presence/mode/blob equality, selected-Work
  lifecycle, exact capability declaration/public non-leak shape, dependency/static-import closure
  and counts remain green; the
  accepted B1 runtime behavior evidence remains an immutable predecessor rather than a static meter
  claim.

## Expected handoff

Write [`handoffs/product-execution-leaf.md`](../handoffs/product-execution-leaf.md) with exactly one
`omp-flow-product-truth-complexity-v9-report-v1` complete canonical JSON block, the consumed B1 SHA,
complete official invocation and deterministic evidence tuple,
changed import edges, zero-authority static results and focused tests. A different actor must
accept it before the next overlapping `ProductControlPlane.ts` Work begins.
