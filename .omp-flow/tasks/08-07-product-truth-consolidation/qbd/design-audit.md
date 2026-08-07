---
type: "QbD 1 Audit"
title: "Direct first-public Product truth — independent design audit"
---

# Direct first-public Product truth — QbD 1

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`design.md`](../design.md)
- Bounded objective: independently challenge the direct first-public destructive boundary,
  interruption convergence, complete first-public generations and compatibility inventory,
  authenticated Package-root handoff, Product responsibility split and B0/B1/C reduction proof.
- Actor ID: `product_truth_qbd1_a1`
- Dispatch receipt: `9e26f82cb62e413f874aee15d0ac2db0`
- Predecessor: none

## Verdict

**FAIL**

- Risk: **critical**
- Decision-critical blocking findings: **2**
- Advisory observations: **2**

The direct-first-public direction is justified for positively classified pre-baseline bytes, and
the maintainer has explicitly accepted their irreversible loss. The current Design nevertheless
cannot prove that the two retired SQLite files contain only that authorized class, and its proposed
Package-root field is described as authenticated without binding it to the existing handshake proof.
Either defect can cross an authorization boundary; neither may be relabelled as accepted risk while
the unchanged scope continues.

## Decision context and evidence separation

### Confirmed evidence

1. The sole Product State owner permits deletion only after a target is proved not to contain an
   excluded class; current canonical Package generation, attachments, external ResourceRefs and
   related protected state remain outside the one-time waiver
   ([`architecture/product-state.md`](../../../../architecture/product-state.md), Schema lifecycle).
2. The Execution owner additionally excludes current canonical generation and `lease/LKG` truth
   from destructive authority
   ([`architecture/execution.md`](../../../../architecture/execution.md), Product Control Plane).
3. Current production code says the Product database is the sole durable Run/Package-lease
   authority and derives active lease counts from `product_runs`, receipts and runtime activities
   ([`ProductControlPlane.ts`](../../../../apps/service/src/product/ProductControlPlane.ts),
   `readProductPackageLifecycleFacts`). The research map records the same physical fact
   ([`product-control-plane-map.md`](../research/product-control-plane-map.md), responsibility and
   state inventory).
4. The Design deletes the complete retired Product/service database bundles but deliberately
   rejects every Product/Automation business-table read; classification proves filename, marker,
   integrity and DDL shape only ([`design.md`](../design.md), Database classifier). The PRD repeats
   both the no-business-row rule and the excluded attachment/Package state boundary
   ([`prd.md`](../prd.md), R2 and R5).
5. The current Native Host handshake authenticates a proof payload made from service identity and a
   challenge. `NativeHostClientHello` has no Package binding today, and the current client/server
   proof payload does not commit to a lane or root
   ([`protocol.ts`](../../../../packages/contracts/src/native-host/protocol.ts),
   `NativeHostClientHello`; [`index.ts`](../../../../apps/native-host/src/index.ts), client-proof
   verification). The proposed interface adds `packageBinding` to that hello but does not require a
   proof-payload change, server echo/commitment or protocol-version transition
   ([`package-root-handoff.md`](../interfaces/package-root-handoff.md), Authenticated handoff).
6. The State Store/Execution Coordinator split retains one connection and names the compound
   Workspace/Conversation, membership, Queue-to-Run, mark-sent, first-fact/binding, settlement and
   recovery transactions. The research explains why the SQLite connection and complete Store
   commands—not source-file co-location—provide atomicity
   ([`product-control-plane-map.md`](../research/product-control-plane-map.md), Transaction ownership;
   [`design.md`](../design.md), Product responsibility split).
7. The first-public Product, service and Web owners have distinct exact generation-1 markers,
   transactionally complete creation rules and fail-closed partial-creation behavior. Remaining
   retired targets and Package tombstones block startup, so recomputing the fixed plan after an
   interruption can converge without a migration phase
   ([`direct-first-public-baseline.md`](../decisions/direct-first-public-baseline.md), First-public
   identities and Consequences; [`direct-first-public-rebuild.md`](../interfaces/direct-first-public-rebuild.md),
   Interruption and runtime behavior).

### Assumptions used

- “Attachments” and “current Package lease/LKG truth” in the sole owners refer to the durable facts
  that make those resources usable, not merely to leaving detached files on disk.
- The existing Native Host HMAC handshake remains the mechanism meant by “authenticated hello”; no
  separately integrity-protected transport is specified in the Design.
- Exact B0/B1/C metrics will be produced by checked-in deterministic tooling against immutable
  revisions; the Design does not itself constitute those measurements.

### Strongest counter-evidence

- The maintainer explicitly accepted irreversible destruction of old Product, Automation/service
  and Web-draft state and rejected backup/migration. This resolves the value judgment about bytes
  inside the authorized class, but it does not expand that class to facts the synchronized sole
  owners expressly exclude.
- Exact DDL fingerprints, WAL-aware copies, stopped owners, no-follow path checks and full target
  allowlists make accidental path expansion unlikely. They establish file identity and quiescence;
  they do not establish the absence of protected rows inside a correctly identified file.
- Host-side root canonicalization confines a presented root to `dev` or `userdata`. It prevents
  arbitrary path escape, but without proof commitment it does not make the selected lane/root an
  authenticated assertion or establish the stated Service/Desktop lane agreement.

### Accepted risk

The accepted risk is irreversible loss of positively classified pre-baseline Product,
Automation/service and exact Web-draft bytes under the calibrated scope, with no backup, migration
or restore. It does **not** cover either blocking finding below.

## Decision-critical findings

### B1 — Whole-file classification cannot prove the protected-fact exclusion

**Cause → consequence → decision.** The destructive classifier proves only a retired filename and
exact schema/marker class and forbids reading business tables. The same Product database is the sole
durable authority for active Package leases, and the service database can contain attachment
records. Therefore a perfectly classified legacy-shaped file may still contain facts explicitly
excluded by the synchronized architecture. Unlinking the whole file irreversibly destroys those
facts even when Package stage bytes or attachment files remain untouched. This invalidates the
decision that exact classification alone makes the no-backup deletion stay within authorized scope.

**Minimum repair.** Add a closed, schema-fixture-specific, read-only protected-fact preflight to the
ephemeral inspection copy. At minimum it must prove zero active Package leases/uncertain Runs for
every schema that can encode them and zero attachment records whose metadata is protected; identify
any other excluded class physically co-resident in the two files. Queries return only presence/count
and a bounded blocker code—never row values. Unknown schema, undecodable receipt, nonzero protected
fact or contradictory closure must block all deletion. If the intent instead is to destroy those
facts too, that requires an explicit new human calibration and synchronized owner change; it cannot
be inferred from the existing acceptance of old Product/service history.

**Why removal or ordinary safe degradation is insufficient for the unchanged decision.** Omitting
optional Package-stage cleanup does not preserve lease facts already inside the Product database.
Leaving the retired database in place while creating generation 1 is also forbidden by the Design's
startup identity rules and would create competing Product truth. The only safe degradation without
repair is to defer/stop the rebuild whenever protected-fact absence cannot be proved; that removes
the current checkpoint outcome rather than allowing it to proceed.

**Evidence anchors.** [`architecture/product-state.md`](../../../../architecture/product-state.md),
Schema lifecycle; [`architecture/execution.md`](../../../../architecture/execution.md), Product
Control Plane; [`prd.md`](../prd.md), R2/R4/R5; [`design.md`](../design.md), Database classifier;
[`ProductControlPlane.ts`](../../../../apps/service/src/product/ProductControlPlane.ts),
`readProductPackageLifecycleFacts`.

### B2 — `packageBinding` is carried by an authenticated peer but is not itself authenticated

**Cause → consequence → decision.** The interface adds `{ lane, root }` to
`NativeHostClientHello` and calls the result authenticated, but it does not require those fields to
be included in the HMAC client proof, committed in the server proof/echo, or transitioned under a
new closed protocol version. It also requires rejection of a Service/Desktop lane mismatch without
defining what trusted Host-side fact represents Desktop's expected lane. Under the current proof
shape, authenticating the Service identity does not authenticate mutable authorization data added
beside that identity. A modified or ambiguously sourced binding can select the wrong canonical lane
and load a valid-but-wrong Package generation, violating current generation/lease/LKG truth and the
no-sibling/no-fallback claim. This invalidates the decision that the proposed hello establishes an
authenticated, unambiguous Service-owned root.

**Minimum repair.** Define one canonical proof payload and versioned parser that commit to protocol
version, service instance, challenge and the exact canonical `packageBinding` (or a canonical digest
of it); make the Host proof commit to the accepted binding as well; reject old/missing/duplicate
fields before any catalog or Package read. Either remove the undefined Service/Desktop mismatch
claim or define a lane-scoped rendezvous capability/expected-lane assertion supplied by Desktop that
attests launch context without transferring root selection away from Service. Add tamper, replay,
old-version, second-binding and concurrent-first-binding process tests, not only path mismatch tests.

**Why removal or ordinary safe degradation is insufficient for the unchanged decision.** Path
canonicalization, logging, or reporting `unavailable` after catalog access cannot authenticate the
root used to select executable Package code. Completely disabling Native Package validation and
execution until the binding is authenticated would be safe, but it removes the Package handoff and
real Package journey that this checkpoint explicitly promises; that narrowing requires human
calibration and cannot count as completion of the unchanged scope.

**Evidence anchors.** [`package-root-handoff.md`](../interfaces/package-root-handoff.md),
Authenticated handoff; [`design.md`](../design.md), Package-root flow;
[`protocol.ts`](../../../../packages/contracts/src/native-host/protocol.ts), client/server hello;
[`index.ts`](../../../../apps/native-host/src/index.ts), HMAC proof construction and verification.

## Advisory observations and residual risk

1. **Complexity proof needs a frozen measurement universe.** The conjunctive B0/B1/C gates are
   materially stronger than a maximum-file-size claim and adequately reject cycles, second writers,
   split boilerplate hidden by compatibility deletion and broadened facade authority. Before
   implementation handoff, the metrics artifact should nevertheless bind B1 to an immutable SHA and
   record the script revision/config plus a fixed path/import universe shared by B0, B1 and C.
   Otherwise candidate-defined “changed scope” and semantic counts such as durable state-machine or
   literal-gateway count remain reproducible only by author judgment. This is advisory because an
   undefined or non-reproducible metric can fail the candidate closed; it does not authorize a false
   destructive action.
2. **`inspect` lock behavior needs one truthful contract.** The interface calls `inspect`
   source-read-only while also requiring lifecycle-lock acquisition and permitting token-safe stale
   owner reaping. If the existing lock algorithm creates/removes a lock directory, the implementation
   must either use a genuinely non-mutating observation path for `inspect` or disclose narrowly
   scoped tool-owned lock mutation. This is advisory provided no user state is mutated and `apply`
   still repeats the complete inspection under exclusive locks.

Residual implementation risks after the two blockers are repaired are bounded but real: platform
path/reparse behavior, WAL bundle stability, profile-helper exclusivity, kill-point convergence,
complete removal of renamed compatibility callers, and preservation of every named Store/Engine
transaction still require the planned fixture, process and live-journey evidence. They do not block
the design decision independently because every failure is specified to fail closed.

## Exact next human decision

The human must select one of these directions; the unchanged Design cannot advance to decomposition:

1. **Repair while retaining scope:** require protected-fact absence proof for whole-file deletion and
   cryptographically bind/uniquely source the Package lane/root, then record the repaired design
   decision.
2. **Remove or safely degrade:** defer the rebuild whenever protected-fact absence is unproved and
   disable all Native Package reads/execution until a bound handshake exists; explicitly narrow this
   checkpoint and its acceptance claims.
3. **Change the risk boundary:** explicitly authorize destruction/migration of the co-resident
   protected facts and synchronize the sole owners, after confronting the irreversible consequence.
4. **Defer or stop** the checkpoint.

No option treats these unresolved blockers as ordinary accepted risk, and this model verdict alone
authorizes no repair or forward transition.
