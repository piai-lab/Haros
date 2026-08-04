---
type: "Work"
title: "Establish the real isolated Host boundary"
---

# Establish the real isolated Host boundary

## Objective

Complete the process portion of T2 by creating the production-path, Pi-free Native Host executable,
the authenticated versioned bounded Product Service channel and independent Desktop supervision.
The Host must be a real killable process that T4 extends in place, while truthfully refusing all
Run/Engine execution before Pi is connected. Before that production path is created, this Work must
make the bounded physical-placement decision durable in the sole Execution owner.

## Linked inputs

- [Execution owner](../../../../architecture/execution.md)
- [Workbench health and recovery contract](../../../../architecture/workbench.md)
- [PRD R6, the T2 exit criteria and T4 continuity constraint](../prd.md)
- [Design target graph, §§5.5–5.6 and T2 gate](../design.md)
- [Desktop source-domain and H2 findings](../research/source-domain-audit.md)
- [QbD F-02 and its accepted repair](../qbd/design-audit.md)
- [Scoped QbD closure of the real-Host requirement](../qbd/design-audit-recheck.md)
- [QbD 2 WM-01 finding](../qbd/work-map-audit.md) and its
  [human calibration](../decisions/qbd-2-calibration.md)
- [Product facts and typed ingress](establish-product-facts-and-typed-ingress.md) and its accepted
  handoff

## Requirement traceability

This Work owns R6 and establishes the concrete process boundary consumed by R8. It implements the
T2 half of the calibrated F-02 repair: a real Pi-free executable, authenticated channel, independent
supervision, health, shutdown, restart budget and circuit breaker. It does not own Pi acceptance or
the T4 runtime journey.

## In scope

- As the first implementation step, update the sole
  [Execution owner](../../../../architecture/execution.md) to confirm `apps/native-host` as the
  physical executable workspace for its already approved isolated Native Host responsibility. The
  update may define only that placement, its build target, separate Desktop supervision and the
  direct Product Service client relationship; it must not add a product object, move execution
  authority, or introduce another topology direction.
- Only after that owner confirmation, create `apps/native-host` as the one production-path
  executable target. Its T2 build graph contains no Pi SDK/runtime, Package/Extension executable
  code, Session, Tool execution or Agent loop.
- Define responsibility-scoped Desktop IPC and Native Host ingress contracts for handshake,
  readiness, liveness, health snapshot, controlled shutdown and typed unsupported execution.
- Have Desktop create a scoped endpoint and one-time authentication material, independently provide
  it to Product Service and Host, and supervise Service and Host under separate readiness, restart
  budget, circuit-breaker and stderr attribution state.
- Authenticate both channel endpoints and validate protocol version, process instance, message type
  and size. Authentication/version/size failure is fail-closed; there is no unauthenticated fallback
  or second transport.
- Make Product Service communicate with Host directly over that channel. Electron Main establishes
  capability and supervision but does not proxy or interpret Engine command/fact payloads.
- Project independent `renderer`, `service`, `nativeHost` and `engineSelection` health through typed
  Product facts/read models. Service-down, Host-down and Engine-unavailable remain distinct.
- Keep existing Conversation/Workbench snapshots readable while Host restarts. When Service, Host
  or the selected Engine cannot dispatch, Composer may still persist an editable Product Queue
  intent but must not admit or submit a Run. Preserve draft/Queue and provide bounded
  retry/re-entry when the restart circuit opens.
- Add real child-process fault tests that separately terminate Renderer, Service and Host, exercise
  graceful shutdown and exceed/recover the Host restart budget. Reject in-process Hosts, fake
  heartbeat children and read-model-only simulations.
- Pin the executable target identity, endpoint family, authentication, supervisor state machine,
  health semantics and shutdown contract as the seam the later Pi Work must extend unchanged.

## Out of scope

- Importing Pi, loading a Provider catalog, accepting a Run, creating a Session, streaming output,
  executing a Tool/Package or fabricating accepted/indeterminate observations.
- Removing the moved Product Service Pi dependency or old execution source; both remain unreachable
  expected-red physical debt until T4 deletion.
- Claiming process isolation is a filesystem/network/system-call sandbox.
- Adding a general Engine API, a second Host transport or test-only production entry point.

## Allowed repository paths

Only the process seam, supervision, health projection and direct build/test closure may change:

```text
architecture/execution.md                       (approved Host placement/build/supervision/client relation only)
apps/native-host/**
packages/contracts/src/native-host/**
packages/contracts/src/desktop/**
packages/contracts/src/index.ts                 (scoped Host/Desktop exports only)
packages/contracts/package.json
apps/desktop/src/main.ts                        (separate supervisors/rendezvous/health only)
apps/desktop/src/preload.ts                     (typed health/re-entry bridge only)
apps/desktop/src/process/**
apps/desktop/tsdown.config.mts
apps/desktop/package.json
apps/service/src/native-host/**
apps/service/src/product/health/**
apps/service/src/index.ts
apps/service/src/serverLayers.ts                (Host client/health composition only)
apps/service/package.json
apps/web/src/routes/__root.tsx                  (typed independent health projection only)
apps/web/src/components/system-health/**
apps/web/src/store/**                           (health slice only)
apps/web/src/components/ChatView.tsx            (Product submit health gate only)
package.json                                    (workspace/build/test scripts only)
bun.lock
turbo.json
scripts/**                                      (Host build/dependency/packaged-path checks only)
```

Focused tests colocated with those paths may change. The handoff may be written only to
[`handoffs/establish-isolated-host-boundary.md`](../handoffs/establish-isolated-host-boundary.md).
An execution feature request outside handshake/health/unsupported must be deferred to the Pi Work,
not added to this path allowance.

## Done conditions

- The implementation history and handoff show `architecture/execution.md` naming
  `apps/native-host` as the executable workspace for the existing isolated Native Host
  responsibility before production-path creation begins. Its responsibility, authority and process
  direction remain otherwise unchanged.
- Desktop starts Product Service and Native Host as distinct real child processes and reports their
  readiness/failure/restart/circuit state independently from Renderer and Engine availability.
- Product Service and Host complete a mutually authenticated, versioned, size-bounded handshake over
  the endpoint family intended for T4. Invalid auth/version/type/size cannot downgrade or connect.
- The Host handles readiness, liveness and controlled shutdown and returns typed unsupported for
  every execution request. No real-path test can obtain accepted or indeterminate runtime evidence.
- Dependency and artifact scans find zero Pi SDK/runtime/Package executable code in the T2 Host.
- Killing Host does not kill Window or Product Store; existing Conversation and Workbench snapshots
  remain readable. Restart budget and `circuitOpen` produce accurate re-entry and log attribution.
- Killing Service does not get reported as an Engine or Host crash; Service recovery respects the
  durable Product outbox and does not invoke the old execution route.
- Tests prove there is one Host executable, one endpoint family and one supervisor path; fake child,
  in-process implementation and alternate transport scans are zero.
- The actual development and packaged process trees agree with the Execution owner: Desktop
  supervises Service and the `apps/native-host` executable separately, while Product Service is the
  direct Host protocol client. There is no undocumented intermediary or sibling Host target.
- One-time authentication material and endpoint details are absent from argv, ordinary logs,
  Product DB, renderer state and built artifacts.
- The handoff freezes the Host target/endpoint/supervisor/health identity T4 must consume and records
  that Product Service Pi debt remains expected red and non-candidate.

## Falsifiers and stop conditions

- Stop if the production-path process cannot be killed/restarted independently or requires Pi code
  merely to establish health/protocol behavior.
- Stop if credentials/authentication must be placed in argv, persistent Product state or renderer,
  or if failure can only be handled through an unauthenticated fallback.
- Stop if Host loss corrupts Product Store, closes the Window or makes existing Conversation
  read-only recovery impossible.
- Stop if implementation creates a T2-only executable/transport that T4 would replace. Repair the
  one seam rather than adding another.

## Focused verification

Run focused process and protocol tests for:

```text
real Host spawn/readiness/liveness/controlled shutdown
auth/version/instance/type/size rejection
separate Service and Host readiness
Host restart budget and circuit open/re-entry
Service kill/restart with durable Product facts
Renderer crash recovery independent of both children
zero Pi/Package dependency in Host
zero fake/in-process/alternate Host entry
secret/endpoint leakage negatives
```

Run affected package typechecks/builds and `git diff --check --` over allowed paths. Process tests
must launch the production entry, not a sibling fixture executable.

## Checkpoint verification

At the combined T2 checkpoint, launch the real Desktop→Service+Host topology and separately kill
Renderer, Service and Host. Verify health attribution, restart/circuit behavior, readable Product
snapshot, preserved draft/Queue and truthful unsupported execution. Run source/lock/artifact scans
showing the new Host is Pi-free while the old Product Service debt remains exactly the approved
expected-red set. Independent review must verify target continuity is concrete enough for T4 to
extend without a second path, and must compare the durable Execution owner with the actual
development and packaged process trees.

## Expected handoff

The handoff includes the executable identity, endpoint family, protocol versions/messages, auth
material lifecycle, supervisor state machine, restart budgets, process tree, fault commands/results,
dependency/artifact scans, secret-leak checks and remaining expected-red debt. It explicitly states
that the Host is real but execution-unsupported and supplies no Pi acceptance or runtime evidence.
It also links the exact Execution-owner change and proves that the documented target, built and
packaged process trees, Desktop supervision, Product Service client, and T2-to-T4 in-place extension
seam all describe the same Host.

## Ordering and review

This Work follows the Product command/fact seam and completes T2 with it. It does not run in parallel
with that Work because Service/contracts composition overlaps. An independent reviewer kills real
processes, attempts protocol bypass, compares the sole Execution owner to both observed process
trees and confirms that T4 can only extend this exact boundary in place. Creation of
`apps/native-host` is unauthorized until the bounded owner confirmation is present in the same Work
change.
