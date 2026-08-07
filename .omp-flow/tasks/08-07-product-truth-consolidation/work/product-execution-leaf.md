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
extraction surface. That B1 must itself name the accepted immutable v4 meter Review receipt and
SHA/digests. The implementation base must contain that exact B1 commit.

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
- The frozen v4 gate accounts for every production path; newly materialized edges pass only between
  frozen members, while outside-set, computed/unresolved or moved-responsibility cases stop.

## Expected handoff

Write [`handoffs/product-execution-leaf.md`](../handoffs/product-execution-leaf.md) with the consumed
B1 SHA, changed import edges, zero-authority static results and focused tests. A different actor must
accept it before the next overlapping `ProductControlPlane.ts` Work begins.
