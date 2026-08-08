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
exact B1 commit and v9 report as this Work's immutable comparison predecessor, and the B1 chain must
name the accepted immutable v9 meter Review receipt and SHA/digests, including Work/v9-authority/
declaration/B1-verifier/dependency/import-universe digests, plus the accepted reviewer-enumerator
tool/source and r1-r17 manifest digests and the accepted
B1 verifier case-manifest/trace/fault/race/kill and hidden-mutation/source-Review receipts. No
shared-tree overlap with B1 is inferred. Main/human orchestration supplies the accepted full B1
evidence commit through the official `--predecessor-evidence` input. V9 reads its table-named
immutable blobs, distinguishes reviewed B1 from evidence commit and requires reviewed-B1→evidence→
this-candidate first-parent ancestry with exact report/digests and internally distinct declared
actors. Receipt/history cannot select or authenticate it; later Review verifies the invocation.

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

- the 15 exact production paths in the machine block below plus the 17 exact
  `native-host-package-root-binding` rows in the Design-owned
  [verification-path table](../design.md#exact-per-work-verification-path-authority), under each
  row's authored presence/mode/lifecycle and purpose. Subsequent prose narrows purpose; a test,
  probe, process, fixture, extension or root label cannot add a Git path;
- `packages/contracts/src/native-host/protocol.ts` and exact
  `packages/contracts/src/native-host/protocol.test.ts`;
- `apps/service/src/native-host/client.ts`, `packageLifecycle.ts` and `executionBoundary.ts`, and
  only their exact Service verification rows in the Design table;
- `apps/service/src/product/health/nativeHostHealthMonitor.ts` for v2 client construction plus
  bounded authenticated readiness/error semantics, with the one exact new verification path
  `apps/service/src/product/health/nativeHostHealthMonitor.test.ts` first materialized at mode
  `100644`;
- `apps/service/src/native-host/liveJourneyProbe.ts` and
  `apps/service/src/native-host/packageCrashProbe.ts`, limited to v2 binding construction,
  bounded readiness/error semantics and the required live/restart/process evidence; only the exact
  probe/process verification rows in the Design table may change for that purpose;
- `apps/native-host/src/index.ts`, `piRuntime.ts` and `responseFrame.ts`; only exact
  `apps/native-host/src/piRuntime.test.ts` and `apps/native-host/src/responseFrame.test.ts` may
  change as the two checked-in tests for those production files;
- `apps/desktop/src/process/nativeHostEnvironment.ts`, `nativeHostRendezvous.ts`,
  `nativeHostAuthenticatedReadiness.ts` and `nativeHostSupervisor.ts`, plus only the exact Desktop
  verification rows in the Design table;
- `apps/desktop/src/main.ts` only for the launch-lane value passed into the existing Host supervision
  composition;
- [handoff](../handoffs/native-host-package-root-binding.md).

It may not change Product schema/transactions, Web drafts, compatibility deletion, the complexity
instrument, Store/Coordinator/facade responsibilities, Package lifecycle state shape, or add a
replay cache, protocol alias, v1 reader or second root selector. Because `apps/desktop/src/main.ts`
overlaps B1 compatibility cleanup, this Work does not run concurrently in the normal shared tree.
Runtime-generated isolated homes are not Git paths and receive no exemption.

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
- Every production path and all 17 exact verification rows follow their frozen v9 lifecycles.
  Candidate static edges are resolved afresh and pass only when both endpoints are frozen; an
  outside-set endpoint or unlisted changed Git path stops for map repair.

## Verification

- Run the exact checked-in verification rows in the Design table. Their unit/parser cases cover
  tampered protocol/lane/root/Service/Host/challenge/proof/echo, old hello,
  missing/extra/duplicate/wrong-typed fields, v1, linked ancestry, outside/nested stage paths and
  sibling-root no-fallback.
- Their exact real multi-process rows, not only in-memory sockets, cover replay across a new connection and Host
  restart, second-different binding, concurrent first bindings, same-pair concurrency, coalesced
  hello+request, lane/root/Desktop assertion mismatch and zero pre-ready read/dispatch.
- Run those real-process matrices in both dev and packaged lanes. Run sustained current per-request
  handshake/health traffic and prove challenge state returns to zero with bounded sockets/memory.
- Build contracts, Service, Native Host and Desktop; run all 17 exact verification rows plus focused
  typechecks and actual Desktop supervision in dev and packaged artifact lanes. Run exact
  `apps/service/src/native-host/liveJourneyProbe.ts` and
  `apps/service/src/native-host/packageCrashProbe.ts` through v2 in both required process lanes.
  Use isolated homes and sanitize all output.
- Run the read-only v9 membership/evidence/lifecycle/outside-blob/dependency-byte/declaration gates
  against the accepted B1 predecessor; do not edit the meter or accept outside-Work drift, unlisted
  membership, declaration disposition or dependency-byte drift. Record graph/SCC/count changes
  observationally; source/process Review owns semantic edges and lifecycle writes. This Work adds
  no B1 runtime-state capability, so the accepted B1 verifier manifest/digests and behavior Review
  must match byte-for-byte.

## Expected handoff

Write [`handoffs/native-host-package-root-binding.md`](../handoffs/native-host-package-root-binding.md)
with exactly one `omp-flow-product-truth-complexity-v9-report-v1` complete canonical JSON block,
the complete official invocation and deterministic evidence tuple,
changed paths, transcript vectors, all required real-process fault rows for both lanes,
challenge-state measurements, zero-read/zero-dispatch observations, packaged supervision evidence
and explicit confirmation that Desktop never selected the root and Host never wrote lifecycle
state. Link the immutable B1 handoff consumed by this Work.
