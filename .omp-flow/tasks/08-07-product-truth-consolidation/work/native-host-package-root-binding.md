---
type: "Work"
title: "Native Host v2 Package-root binding"
---

# Native Host v2 Package-root binding

## Objective

Make Product Service the sole Package-root selector and bind its exact dev or packaged root to
Native Host through the Host-first, bidirectionally authenticated v2 transcript before any catalog,
Package or execution request. Remove v1, Host discovery, hard-coded userdata and sibling fallback.
This Work realizes PRD A13 and its A15 process/recovery slice.

## Useful inputs

- [PRD R10](../prd.md)
- [Design Package-root flow, fault matrix and process verification](../design.md)
- [Package-root handoff interface](../interfaces/package-root-handoff.md)
- [Direct first-public baseline Package authority](../decisions/direct-first-public-baseline.md)
- [QbD 2 path-boundary repair calibration](../decisions/qbd2-path-repair-calibration.md)

## Entry stop

Do not assign or start this Work until [`handoffs/direct-first-public-b1.md`](../handoffs/direct-first-public-b1.md)
records a different-actor-accepted clean immutable B1. The implementation base must contain that
exact B1 commit, and the B1 chain must name the accepted immutable v4 meter Review receipt and
SHA/digests, including the capability/owner-lock-authority and derived-inventory digests plus must-hold
report. No shared-tree overlap with B1 is inferred.

## In scope

- One pure Service resolver for `<canonical home>/dev/packages` and
  `<canonical home>/userdata/packages`, selected only by the Service lane.
- Closed protocol v2 with duplicate-key rejection and one byte-exact length-prefixed transcript
  encoder covering domain, version, direction, both instances, fresh socket-bound Host challenge,
  lane and canonical root.
- Host-first challenge consumption, constant-time Service/Host HMAC proof, exact echoes, immutable
  process-global compare-and-set binding and buffering of coalesced request bytes until ready.
- Desktop launch-lane assertion and canonical product-home/secret transport without Desktop
  selecting, parsing or proxying the Package root.
- Native runtime receives the bound root directly and accepts only the exact direct generation child
  under `<root>/stage`; no `state.json` read, sibling lookup or lifecycle write in Host.

## Allowed code and output boundary

The implementer may change only:

- `packages/contracts/src/native-host/protocol.ts` and its tests;
- `apps/service/src/native-host/client.ts`, `packageLifecycle.ts` and `executionBoundary.ts`, and
  their focused/integration tests;
- `apps/service/src/product/health/nativeHostHealthMonitor.ts` for v2 client construction plus
  bounded authenticated readiness/error semantics;
- `apps/service/src/native-host/liveJourneyProbe.ts` and
  `apps/service/src/native-host/packageCrashProbe.ts`, limited to v2 binding construction,
  bounded readiness/error semantics and the required live/restart/process evidence; their existing
  focused probe tests may change only for that same purpose;
- `apps/native-host/src/index.ts`, `piRuntime.ts`, `responseFrame.ts` and their tests;
- `apps/desktop/src/process/nativeHostEnvironment.ts`, `nativeHostRendezvous.ts`,
  `nativeHostAuthenticatedReadiness.ts`, `nativeHostSupervisor.ts` and their focused/process tests;
- `apps/desktop/src/main.ts` only for the launch-lane value passed into the existing Host supervision
  composition;
- [handoff](../handoffs/native-host-package-root-binding.md).

It may not change Product schema/transactions, Web drafts, compatibility deletion, the complexity
instrument, Store/Coordinator/facade responsibilities, Package lifecycle state shape, or add a
replay cache, protocol alias, v1 reader or second root selector. Because `apps/desktop/src/main.ts`
overlaps B1 compatibility cleanup, this Work does not run concurrently in the normal shared tree.

```omp-flow-production-boundary-v1
{
  "work": "native-host-package-root-binding",
  "production": [
    { "kind": "exact", "path": "packages/contracts/src/native-host/protocol.ts" },
    { "kind": "exact", "path": "apps/service/src/native-host/client.ts" },
    { "kind": "exact", "path": "apps/service/src/native-host/packageLifecycle.ts" },
    { "kind": "exact", "path": "apps/service/src/native-host/executionBoundary.ts" },
    { "kind": "exact", "path": "apps/service/src/product/health/nativeHostHealthMonitor.ts" },
    { "kind": "exact", "path": "apps/service/src/native-host/liveJourneyProbe.ts" },
    { "kind": "exact", "path": "apps/service/src/native-host/packageCrashProbe.ts" },
    { "kind": "exact", "path": "apps/native-host/src/index.ts" },
    { "kind": "exact", "path": "apps/native-host/src/piRuntime.ts" },
    { "kind": "exact", "path": "apps/native-host/src/responseFrame.ts" },
    { "kind": "exact", "path": "apps/desktop/src/process/nativeHostEnvironment.ts" },
    { "kind": "exact", "path": "apps/desktop/src/process/nativeHostRendezvous.ts" },
    { "kind": "exact", "path": "apps/desktop/src/process/nativeHostAuthenticatedReadiness.ts" },
    { "kind": "exact", "path": "apps/desktop/src/process/nativeHostSupervisor.ts" },
    { "kind": "exact", "path": "apps/desktop/src/main.ts" }
  ],
  "measurement": [],
  "dependency": []
}
```

## Done conditions

- Static gates find exactly one transcript encoder, protocol version 2, exact-field and duplicate-key
  rejection, zero v1 branch, zero Host `userdata/packages/stage` derivation, zero Native Host
  Package lifecycle write and no Product/renderer root input.
- Unit byte vectors prove both directions commit the same canonical fields with distinct direction.
  Error output is bounded and never contains the full home path or secret.
- The Host consumes a challenge once, installs only one immutable lane/root pair, allows same-pair
  connections, rejects a different pair and retains zero challenge state after close.
- Package/catalog/request bytes never dispatch before the binding is ready. A selected generation
  missing from the bound lane is unavailable even when present in the sibling lane.
- Every production path is a frozen v4 member. Candidate edges are resolved afresh and pass only
  when both endpoints are frozen; an outside-set endpoint stops for map repair.

## Verification

- Unit/parser tests cover tampered protocol/lane/root/Service/Host/challenge/proof/echo, old hello,
  missing/extra/duplicate/wrong-typed fields, v1, linked ancestry, outside/nested stage paths and
  sibling-root no-fallback.
- Real multi-process tests, not only in-memory sockets, cover replay across a new connection and Host
  restart, second-different binding, concurrent first bindings, same-pair concurrency, coalesced
  hello+request, lane/root/Desktop assertion mismatch and zero pre-ready read/dispatch.
- Run those real-process matrices in both dev and packaged lanes. Run sustained current per-request
  handshake/health traffic and prove challenge state returns to zero with bounded sockets/memory.
- Build contracts, Service, Native Host and Desktop; run focused typechecks/tests plus actual Desktop
  supervision in dev and packaged artifact lanes. Run the existing Native Host live-journey and
  Package-crash probes through v2 in both required process lanes. Use isolated homes and sanitize
  all output.
- Run the read-only v4 membership/edge gate; do not edit the meter or accept outside-set,
  computed or unresolved edges. Its accepted capability and lock authority remains conjunctive even
  though this Work adds no database capability or owner-lock behavior.

## Expected handoff

Write [`handoffs/native-host-package-root-binding.md`](../handoffs/native-host-package-root-binding.md)
with changed paths, transcript vectors, all required real-process fault rows for both lanes,
challenge-state measurements, zero-read/zero-dispatch observations, packaged supervision evidence
and explicit confirmation that Desktop never selected the root and Host never wrote lifecycle
state. Link the immutable B1 handoff consumed by this Work.
