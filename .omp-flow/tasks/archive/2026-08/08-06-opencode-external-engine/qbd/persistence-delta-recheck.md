---
type: "QbD Audit"
title: "Recheck the repaired r1.8 persistence delta"
role: "qbd"
actorId: "persistence_delta_recheck_g2"
receipt: "e3227d89db2c4667a0dab40bb8a9ea23"
predecessor: "65f7b8b428e142c1921ebd1e12aa84b4"
verdict: "FAIL"
---

# Recheck the repaired r1.8 persistence delta

## Evaluated decision and scope

This independent recheck preserves the prior [FAIL](persistence-delta-audit.md) and evaluates only
its two repaired blockers in the r1.8 [Design](../design.md), bounded
[Work](../work/deliver-truthful-opencode-next-run.md), and human
[cross-store calibration](../decisions/cross-store-calibration.md): the exact
`ProductSelectedRuntime` Run codec/fixture and the startup-exclusive crash-recoverable coordinator
for `product-state-v1.sqlite` plus `state.sqlite`. It also checks only their interaction with the
already accepted independent Web draft authority. Unchanged Product/OpenCode/Pi, no-ACK, migration
inventory, and Web-algorithm areas are not re-audited.

## Verdict

**FAIL** — risk **high / decision-critical**; **1 blocking finding**.

The two-SQLite topology blocker is repaired: r1.8 no longer claims cross-file atomicity and defines
a realizable startup-exclusive, per-file atomic, marker-driven recovery protocol. The Run codec is
now named correctly and has a discriminating fixture requirement, but its canonical v1-to-v2
transcode remains ambiguous. Consequently the persistence-dependent execution slice still cannot
proceed unchanged.

## Evidence assessment

### Confirmed evidence

- Production v1 defines `ProductSelectedRuntime` with `state`, `engineId`, `runtimeModelId`,
  `thinking`, non-null `packageGeneration`, permission policy, enforcement and execution target
  (`packages/contracts/src/product/state.ts:146-160`). Product Run reads and writes this exact codec
  (`apps/service/src/product/ProductControlPlane.ts:1158-1171,3201-3209`). Queue remains the wider
  `ProductRequestedSelection` union.
- The repaired inventory now names `product_runs.requested_selection_json` as v1
  `ProductSelectedRuntime`, while Queue and Automation definition rows remain
  `ProductRequestedSelection` (Design, v1-to-v2 inventory). It also requires fixture bytes that are
  valid selected-Run bytes but fail or materially differ under the request-union decoder (Design,
  startup coordinator migration proof; Work, closed Product migration and verification inventory).
- Product and Automation are separate files under the current topology:
  `product-state-v1.sqlite` and `state.sqlite`. The current general SQL owner takes a lifecycle lock,
  exclusive SQLite locking mode and WAL before normal use
  (`apps/service/src/persistence/Layers/Sqlite.ts:45-124`; `apps/service/src/config.ts:141-144`).
- r1.8 places one coordinator at an outer config-first `Layer.unwrap`, before either normal owner,
  HTTP/Web admission or handler construction. It temporarily owns both lifecycle locks and
  connections, closes statements, completes cleanup, and only then returns normal layers. It
  explicitly forbids reliance on sibling `Layer.mergeAll` acquisition order.
- The coordinator performs a zero-write two-file preflight, followed by fixed-order independent
  `BEGIN IMMEDIATE` transactions. Each store commits its own data and marker together. Every marker
  pair has a fail-closed startup action; mixed v1/v2 is a recoverable durable state but is never
  runtime-visible. WAL/SHM handling, lock release and real file-backed process-crash fixtures are
  required (Design, startup-only two-store coordinator and verification strategy).
- The accepted Web authority remains independent: canonical v2 localStorage is write-reread-
  validated before v1 cleanup; Web failure gates only the affected draft and stale Product
  admission invokes neither Engine. SQLite success remains valid and is not described as atomic
  with Web (Design, Web draft persistence authority; cross-store calibration).

### Assumptions

- The stable composed Pi Engine identifier and the intended treatment of an arbitrary valid v1
  `engineId` must come from an explicit migration rule; it cannot be inferred from fixture naming or
  current test literals such as `native-engine` and `pi`.
- “Canonical” means one deterministic v2 object for every legal v1 selected Run, not merely that a
  future implementation chooses one mapping and round-trips its own output.

### Strongest counter-evidence

- The inventory prose says it will preserve runtime model, thinking, permission, enforcement,
  target and Package generation and will add the v2 selected-runtime shape. A reasonable
  implementer could infer `runtimeModelId`/`thinking` should become a `product-model`
  `runtimeChoice` and old Runs are Pi Runs.
- The Work explicitly binds the source decoder and requires discriminating bytes, so using the
  request-union decoder is no longer a plausible compliant implementation.

These points repair decoder identity and test discrimination, but inference is insufficient for
the predecessor's required exact field-by-field canonical transform.

### Accepted risk

- The human deliberately accepts independently committed SQLite files and Web localStorage. A
  Product-v2/Automation-v1 marker pair may survive a crash, but startup remains blocked until the
  second deterministic migration completes. This is a recoverable intermediate state, not an
  unresolved cross-authority runtime state.
- Existing WAL `synchronous = NORMAL` durability tradeoffs remain outside this delta. The repaired
  protocol preserves current durability rather than claiming power-loss atomicity across files.

## Closed predecessor finding

### Two-SQLite transaction/topology blocker — closed

The former Design required one impossible transaction across independently owned files. r1.8 now
states the actual topology, gives the coordinator exclusive startup ownership, uses a zero-write
preflight and one atomic transaction plus marker per file, enumerates every reachable marker pair,
blocks all runtime owners during mixed versions, and requires real crash/WAL/lock-release evidence.
This is implementable without a distributed transaction or third ledger. The independent Web
authority neither weakens nor contradicts the gate because its failure is separately surfaced and
cannot admit stale Engine work.

Residual verification risk is appropriately deferred to implementation: the promised crash points,
WAL reopen, connection release, marker validation and no-owner-observes-mixed fixtures must pass.
They are not missing design evidence that prevents judging the chosen protocol.

## Blocking finding

### B1 — The selected-Run codec is named exactly, but its canonical transform is still not exact

**Cause -> consequence -> decision.** The v1 codec already contains `engineId`, flat
`runtimeModelId` and flat `thinking`, while the proposed v2 selected shape contains a separate
`engineId` plus discriminated `runtimeChoice`. The repaired inventory says to “add the truthful v2
Pi Engine identity/selected-runtime shape” while preserving other fields, but it does not say:

- whether the existing v1 `engineId` is preserved, validated against, or replaced by the composed
  Pi identifier;
- that flat `runtimeModelId` and `thinking` map exactly to
  `runtimeChoice = { kind: "product-model", runtimeModelId, thinking }`;
- that all migrated Runs retain `state = "selected"`, nor the exact nullability rule for their
  existing Package generation versus only new OpenCode Runs.

Calling Engine identity “new” is also factually inconsistent with the production v1 codec. Two
implementers can therefore produce different valid-looking v2 bytes from the same authoritative
Run, and a discriminating decoder fixture would not distinguish those transforms. That ambiguity
can rewrite historical routing/selection truth and prevents the migration and exact-byte retry
proof from establishing the intended authority. The decision whether r1.8 is safe to Execute is
therefore still blocked.

**Minimum repair.** Add one normative v1-field-to-v2-field mapping for
`product_runs.requested_selection_json`: define the stable migrated Pi `engineId` rule, map the
flat model/thinking fields into the exact `product-model` runtime-choice variant, copy policy,
enforcement and target fields, preserve every existing non-null Pi Package generation, and state
that nullable/not-applicable generation is only legal for newly admitted OpenCode Runs. Make the
discriminating fixture assert the complete expected canonical v2 bytes, including an input whose
v1 Engine identifier exposes preserve-versus-replace behavior.

**Why removal or safe degradation is insufficient.** These rows are authoritative Run history and
feed snapshots, receipts, idempotent retry and recovery routing. Hiding or dropping them loses
required history; accepting several mappings/decoders recreates the forbidden ambiguous authority.
Removal or deferral is possible only as an explicit changed product decision for the whole affected
persistence scope.

## Advisory observation

- The coordinator text promises “byte-for-byte v1” preservation on preflight failure. Fixtures
  should compare logical database content plus pre-existing sidecars deliberately, because opening
  and validating a WAL database can legitimately alter private sidecar/checkpoint bytes without a
  schema/data write. This does not block the specified fail-closed content invariant.

## Exact next decision and options

Human calibration must choose exactly one direction:

1. **Repair and re-evidence:** add the normative selected-Run field mapping and exact canonical
   fixture described above; retain the accepted coordinator and Web authority. Execute remains
   paused pending a linked human decision.
2. **Remove or safely narrow:** explicitly remove/deactivate migration of affected persisted Run
   history with a product-level retirement/history decision; this is not an in-place degradation.
3. **Defer** the r1.8 persistence-dependent external-Engine slice.
4. **Stop** this Bundle.

The unresolved codec authority cannot continue under an accepted-risk label. This audit does not
authorize repair or a fresh audit.

## Mechanical handoff

- Verdict: `FAIL`
- Risk: `high / decision-critical`
- Blocking count: `1`
- Actor ID: `persistence_delta_recheck_g2`
- Receipt: `e3227d89db2c4667a0dab40bb8a9ea23`
- Predecessor receipt: `65f7b8b428e142c1921ebd1e12aa84b4`
- Predecessor output: `.omp-flow/tasks/08-06-opencode-external-engine/qbd/persistence-delta-audit.md`
- Audit output: `.omp-flow/tasks/08-06-opencode-external-engine/qbd/persistence-delta-recheck.md`
