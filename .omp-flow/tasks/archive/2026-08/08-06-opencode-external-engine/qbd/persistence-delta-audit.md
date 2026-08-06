---
type: "QbD Audit"
title: "Audit the r1.7 persistence delta"
role: "qbd"
actorId: "persistence_delta_qbd_g2"
receipt: "65f7b8b428e142c1921ebd1e12aa84b4"
verdict: "FAIL"
---

# Audit the r1.7 persistence delta

## Evaluated decision and scope

This independent delta audit evaluates only the r1.7 persistence change in the
[Design](../design.md), the bounded persistence additions in the
[Work](../work/deliver-truthful-opencode-next-run.md), and the human-selected two-authority boundary
in the [cross-store calibration](../decisions/cross-store-calibration.md). It challenges exhaustive
inventory, Product plus Automation SQLite atomicity, unchanged Automation semantics, Web recovery
and admission gating, and the corresponding fixtures. It does not reopen the repaired QbD 1/QbD 2
findings or unchanged OpenCode, Pi, and no-ACK decisions.

## Verdict

**FAIL** — risk **critical / decision-critical**; **2 blocking findings**.

The selected Product-plus-Automation all-or-nothing migration is not realizable from the documented
current persistence topology. The Design also gives contradictory authoritative v1 schemas for a
Run selection column, so its required canonical transcode is not uniquely specified. Both defects
affect durable authority; omission or per-store safe degradation cannot preserve the accepted r1.7
scope.

## Evidence assessment

### Confirmed evidence

- The Design requires one `BEGIN IMMEDIATE` transaction across Product and Automation tables and a
  single commit/rollback boundary (Design lines 759–789).
- Product is opened from `stateDir/product-state-v1.sqlite`
  (`apps/service/src/product/ProductControlPlane.ts:96,4261-4264`), while Automation is initialized
  through the general SQL layer at `stateDir/state.sqlite`
  (`apps/service/src/config.ts:141-144`; `apps/service/src/persistence/Layers/Sqlite.ts:132-134`).
- The general SQL layer owns `state.sqlite` for its runtime lifetime, requests exclusive locking,
  and uses WAL (`apps/service/src/persistence/Layers/Sqlite.ts:49-74`). The Design supplies no
  startup quiescence, connection ownership transfer, attach/detach, journal-mode, crash-atomicity,
  or recovery protocol that could turn these two independently opened database files into its one
  transaction.
- The Design table calls `product_runs.requested_selection_json` a v1
  `ProductRequestedSelection` (line 707), but its immediately following inventory conclusion calls
  the same bytes `ProductSelectedRuntime` (lines 721–724). Production confirms the latter:
  Product Run declares `ProductSelectedRuntime`, reads that schema, and writes that schema
  (`packages/contracts/src/product/state.ts:309-320`;
  `apps/service/src/product/ProductControlPlane.ts:1158-1171,3198-3209`).
- The two named Web embeddings match the current persisted schema:
  `draftsByThreadId[*].productQueueTransfer.requestedSelection` and
  `draftThreadsByThreadId[*].requestedSelection`. The Design preserves v1 bytes until a canonical
  v2 reread succeeds and independently gates stale dispatch at Web and Product admission (Design
  lines 791–826).
- The Work names Automation identity/schedule/enabled/permission/due-run preservation and the Web
  interruption, recovery-required, zero-Engine-call, and SQLite-independence fixture families.

### Assumptions

- No undocumented pre-start migration coordinator closes both existing owners and changes their
  database/journal topology; none is linked by the Design or Work.
- “One all-or-nothing Product+Automation migration” means crash-observable atomicity of both
  durable authorities, not merely two sequential transactions with compensating startup checks.
  That reading follows the binding calibration and explicit single-transaction language.

### Strongest counter-evidence considered

- SQLite can access attached databases from one connection in some configurations. That possibility
  does not satisfy this Design: the files currently have separate live owners, the Automation owner
  deliberately takes an exclusive lifetime lock and WAL mode, and no compatible migration-time
  ownership/journal/crash protocol or falsifying fixture is specified.
- The Work authorizes the Automation migration seam, so a topology repair may be possible without
  redesigning Automation behavior. Authorization to edit a seam is not an executable atomicity
  design and does not prove preservation across a two-file crash boundary.
- Web malformed-state handling safely refuses dispatch and preserves recoverable v1 bytes. Its lack
  of an in-scope user repair action can leave one draft surface unavailable, but safe degradation is
  sufficient and Product remains readable; this is residual availability risk, not a blocker.

### Accepted and residual risk

- SQLite and localStorage intentionally commit independently. The linked human decision accepts
  this only with truthful separate receipts, local recovery-required gating, and Product admission
  rejection. The specified fixtures adequately expose that boundary.
- Retaining malformed v1/v2 draft bytes may require later manual recovery UX. Until then, disabling
  only the affected stale draft is an observable, reversible safe degradation.

## Decision-critical findings

### B1 — The required Product-plus-Automation transaction crosses two separately owned database files

**Cause -> consequence -> decision.** Product authority is in `product-state-v1.sqlite`; Automation
authority is in `state.sqlite`, whose existing SQL owner holds an exclusive lifetime connection in
WAL mode. The Design nevertheless places both sets of tables inside one unexplained
`BEGIN IMMEDIATE`. An implementer therefore cannot meet the promised single commit/rollback and
original-byte preservation under failure or crash from the authorized route. A sequential or
best-effort migration can expose protocol-v2 Product with schema-v1 Automation (or the reverse),
making due-run admission decode stale selection semantics and violating the human-selected atomic
boundary. The unchanged r1.7 scope must not enter Execute.

**Minimum repair.** Amend the Design and Work with one concrete migration-time ownership and durable
commit protocol for the two actual files, including startup ordering/quiescence, connection and lock
ownership, journal-mode constraints, failure/crash recovery, version markers for both stores, and
fixtures that interrupt every commit boundary and prove no mixed-version observable state. If that
cannot be proved, choose a human-calibrated alternative: relocate the affected authority under one
SQLite owner with an explicit data-preserving migration, or remove/defer Automation Engine-choice
conversion and define safe retirement behavior.

**Why removal or safe degradation is insufficient.** Automation definitions and admitted Run
permission snapshots are authoritative and may execute later. Silently skipping, disabling only on
decode failure, or migrating one file first leaves valid-looking durable work with ambiguous
selection/enforcement semantics. Removal or deferral is viable only as an explicit changed product
decision with retirement/admission behavior, not as degradation inside the accepted atomic scope.

### B2 — The authoritative v1 Run-selection schema is contradictory

**Cause -> consequence -> decision.** The inventory table instructs migration of
`product_runs.requested_selection_json` as the request union, while the adjacent exhaustive-inventory
claim and production code identify the narrower selected runtime. Those schemas have different legal
states. A migration following the table can reject valid authoritative rows or derive fields using
the wrong transform; following the paragraph contradicts the binding inventory and its fixtures.
Because rollback tests cannot establish the intended canonical bytes without one source schema, the
Run transcode is not uniquely implementable or verifiable.

**Minimum repair.** Correct the inventory row to the exact v1 `ProductSelectedRuntime`, state the
field-by-field v2 transform (including the new Engine identity and nullable/not-applicable package
meaning), and seed at least one valid Run fixture that would distinguish selected-only decoding from
the request union. Keep the Queue and Automation definition rows explicitly on
`ProductRequestedSelection`.

**Why removal or safe degradation is insufficient.** Product Runs are authoritative history and
feed snapshots, receipts, retries, and recovery. Dropping or hiding them would violate the required
identity/history preservation; accepting both decoders would create the forbidden runtime ambiguity
and weaken corruption detection.

## Advisory observations

- After the blockers are repaired, the fixture inventory should name a true process-crash point for
  each durable commit boundary, not only injected decode/constraint failures. This becomes mandatory
  if the repaired topology still spans two files.
- For malformed canonical Web v2 with intact v1, the deterministic algorithm intentionally refuses
  to consult v1. The recovery-required copy should avoid implying that automatic retry alone can
  repair malformed v2.

## Exact next decision and options

Human calibration must choose exactly one direction:

1. **Repair and re-evidence:** specify a realizable, crash-safe migration topology for the two actual
   SQLite files; correct the Run schema contradiction; add the discriminating and crash-boundary
   fixtures; keep Execute paused pending the separately recorded human governance decision.
2. **Remove or safely narrow:** make a new product decision that removes/deactivates persisted
   Automation Engine-choice conversion with explicit due-run and historical-snapshot behavior, while
   retaining the separately recoverable Web migration.
3. **Defer** the entire r1.7 persistence-dependent execution slice.
4. **Stop** this Bundle.

The unchanged r1.7 scope cannot continue under an accepted-risk label.

## Mechanical handoff

- Verdict: `FAIL`
- Risk: `critical / decision-critical`
- Blocking count: `2`
- Actor ID: `persistence_delta_qbd_g2`
- Receipt: `65f7b8b428e142c1921ebd1e12aa84b4`
- Predecessor: none
- Audit output: `.omp-flow/tasks/08-06-opencode-external-engine/qbd/persistence-delta-audit.md`
