---
type: "QbD 2 Audit"
title: "Direct first-public Product truth — work-map audit"
---

# Direct first-public Product truth — QbD 2

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`work/index.md`](../work/index.md)
- Audit output: `qbd/work-map-audit.md`
- Bounded objective: independently challenge the approved five-Work map for complete PRD A1-A15
  coverage, immutable unsplit B1, Native Host ownership/ordering/process proof, minimal Product
  responsibility units, exact safe code boundaries, fail-closed verification and enforceability of
  the three accepted QbD 1 advisories.
- Actor ID: `product_truth_qbd2_a1`
- Dispatch receipt: `94b3ad249a5c49fdab96f02ece77f1d4`
- Predecessor receipt: `16e168edac2849f0b9699567e175e38c`
- Predecessor output/handoff: `.omp-flow/tasks/08-07-product-truth-consolidation/work`

## Verdict

**FAIL**

- Risk: **high — two declared code boundaries make required B1/A13 outcomes unrealizable without
  unauthorized path expansion or knowingly stale production consumers**
- Decision-critical blocking findings: **2**
- Advisory observations: **2**

The five-Work shape, hard B1 checkpoint, responsibility extraction order and final integrated gates
are otherwise coherent. B1 can be one reviewable atomic change despite its size: the map requires a
dedicated clean green commit, records its full SHA only in a later evidence commit, and mechanically
forbids Store/Coordinator/facade/leaf pre-scaffolding. The Store, Coordinator/facade and execution
leaf are also the smallest coherent authority cuts supported by the Design. The current map cannot
advance unchanged, however, because two Works prohibit edits to production consumers that their own
done conditions require to change.

## Decision context and evidence separation

### Confirmed evidence

1. The approved PRD assigns A1-A9 and the B1 half of A14 to the direct-first-public Work; A13 to the
   Native Host Work; A10-A12 to the three responsibility Works; and integrated A14/A15 to final C
   ([`work/index.md`](../work/index.md), Acceptance coverage). Every A1-A15 requirement therefore
   has a named realizing Work.
2. B1 is expressly indivisible, must remain structurally unsplit, must be a dedicated clean green
   commit, and must have its immutable 40-hex SHA plus clean metrics recorded by a distinct later
   evidence commit before any extraction assignment starts
   ([`direct-first-public-b1.md`](../work/direct-first-public-b1.md), Objective, Done conditions and
   Expected handoff). This is mechanically capable of producing an immutable comparison point; a
   handoff commit does not alter the measured B1 tree.
3. The B1 allowed boundary includes the current Product database owner and its startup/configuration
   path, but it does not include
   [`apps/service/src/opencode/liveJourneyProbe.ts`](../../../../apps/service/src/opencode/liveJourneyProbe.ts).
   That production probe contains a literal `product-state-v1.sqlite` path while B1 must retire that
   filename, establish `<lane>/stores/product.sqlite`, and prove zero compatibility path/string alias.
   The file appears only in the later final-C boundary, after B1 is already required to satisfy A9.
4. The Native Host Work lists
   `apps/service/src/native-host/health/nativeHostHealthMonitor.ts`; no such production file exists.
   The actual owner is
   [`apps/service/src/product/health/nativeHostHealthMonitor.ts`](../../../../apps/service/src/product/health/nativeHostHealthMonitor.ts),
   which emits and consumes protocol-1 readiness semantics and constructs a Native Host client.
   Protocol v2 cannot leave that normal runtime health connection on the old handshake.
5. Other non-test Native Host client consumers include
   [`apps/service/src/native-host/liveJourneyProbe.ts`](../../../../apps/service/src/native-host/liveJourneyProbe.ts)
   and
   [`apps/service/src/native-host/packageCrashProbe.ts`](../../../../apps/service/src/native-host/packageCrashProbe.ts).
   The Work boundary's phrase “focused/integration/probe tests” does not precisely authorize these
   production probe modules. A closed v2 client must receive the Service-selected binding on every
   health/catalog/validation/execution connection; optional or implicit v1-shaped construction would
   violate the interface.
6. Native Host shares `apps/service/src/native-host/executionBoundary.ts` with both the execution-leaf
   and Store Works. The index supplies a normal B1-then-Native-Host route and globally requires a
   different-actor-accepted handoff before the next overlapping Work, so serialization is possible.
   The final C Work additionally refuses entry until B1, Native Host, leaf and Store handoffs are all
   accepted ([`work/index.md`](../work/index.md), Hard ordering and Review; final-C Entry stop).
7. The Store boundary prohibits a second Product connection, raw database/statement/transaction
   export, table CRUD surface, new state machine and Coordinator scaffold. Its done conditions and
   per-command fault injection cover every named PRD R8 atomic unit. The leaf owns only source-neutral
   contracts/errors, and final C confines volatile handles/effects to one Coordinator and Web/RPC to
   one 36-operation facade.
8. Every destructive action is confined to generated temporary homes and isolated profiles; path,
   link, lock, write-trace, exclusion-hash and kill-point failures stop closed. No Work authorizes the
   maintainer's canonical store, a broader primitive, backup/migration/restore, a second connection or
   compatibility track.
9. The three accepted QbD 1 advisories are enforceable B1 done conditions: exact fixture/registry
   bijection including negative/unknown cases, whole-profile apply write tracing, and zero extraction
   surface at immutable B1 with a separate evidence commit
   ([`qbd1-pass-approval.md`](../decisions/qbd1-pass-approval.md), Advisory calibration;
   [`direct-first-public-b1.md`](../work/direct-first-public-b1.md), Done conditions).

### Assumptions used

- Files under `apps/service/src/**` that are not test/fixture modules are production scope for the
  Work's structural and typecheck gates even when invoked only as a probe. This matches the frozen
  complexity universe and the Work's own production-path terminology.
- “Allowed code and output boundary” is an authorization boundary, not an illustrative list. The
  explicit instruction that an outside-path need stops for map repair confirms that reading.
- The Native Host v2 client API will require a concrete Service-selected `{ lane, root }` binding;
  allowing old call sites to omit it would contradict the closed v2 interface and pre-read gate.

### Strongest counter-evidence

- The stale OpenCode path occurs in a live-journey probe rather than the normal Web/RPC startup
  path. That reduces immediate user exposure, but A9 and the B1 done condition deliberately require
  zero production compatibility path/string residue before the immutable checkpoint. Deferring the
  repair to C makes the recorded B1 fail its own claim.
- The intended Native Host health file is recognizable despite the path typo, and “probe tests” may
  have been meant colloquially to include probe implementations. Mechanical ownership cannot depend
  on that inference: the Work says only listed paths may change and stops on any discovered outside
  path.
- Final C re-runs broad type, process and live gates. It can catch either omission later, but it
  cannot retroactively make B1 A9-complete or make a different Work's unowned v2 call-site edits
  independently reviewable.

### Accepted risk

The carried accepted risk remains the intentional, unrecoverable loss of positively classified
pre-baseline Product, Automation/service and exact legacy Web-draft bytes under canonical default
`~/.omnimind`, with all protected facts and excluded targets failing closed. Implementation remains
sensitive to path/reparse semantics, WAL stability, profile side effects, process races and live
Provider behavior. Neither blocking finding below is part of that accepted destructive risk.

## Acceptance coverage judgment

| PRD acceptance | QbD 2 judgment |
| --- | --- |
| A1-A8 | Covered by B1 with exact destructive, creation, exclusion and interruption proofs. |
| A9 | **Blocked:** the B1 boundary excludes a production old-filename consumer while requiring zero residue. |
| A10 | Covered by the Store Work and retained/finally gated at C. |
| A11-A12 | Covered by Coordinator/facade Work with preserved effect ordering and exact API/static gates. |
| A13 | **Blocked:** the Native Host boundary misnames one normal runtime consumer and does not precisely own the other production probe call sites. |
| A14 | The immutable B1/C mechanism is coherent, but B1 cannot currently satisfy its prerequisite A9 gate. |
| A15 | Focused preservation plus final integrated live journeys is adequate once the A13 ownership gap is repaired. |

## Decision-critical findings

### B1 — The immutable B1 boundary excludes an old Product-database production consumer

**Cause → consequence → decision.** The B1 Work changes the canonical Product file to
`stores/product.sqlite`, deletes the retired filename contract and requires a structural scan with
zero production compatibility caller/import/string alias. Its exact allowed paths omit the OpenCode
live-journey probe, which directly joins `product-state-v1.sqlite`; that file is not a test fixture
and is inside the frozen production universe. The implementer must therefore either leave a stale
production consumer and falsely certify A9/first-public-capable B1, or edit an unauthorized path.
Because B1's immutable SHA is the later split baseline, C cannot repair this contradiction
retroactively. The decision to treat this Work as a realizable A1-A9-complete checkpoint is invalid.

**Minimum repair.** Add the exact path
`apps/service/src/opencode/liveJourneyProbe.ts` to the B1 boundary, limited to consuming the new
canonical Product database resolver/path, and require its focused type/probe check before the B1
commit. Remove any implication that this first-public path correction may wait for final C.

**Why removal or safe degradation is insufficient.** Excluding the probe from structural scans or
calling it test-only would redefine the frozen production universe and weaken A9. Disabling or
deleting the OpenCode proof would remove required A15 evidence and still alter an unowned path. Only
repairing the declared B1 owner, or explicitly narrowing the approved A9/B1 product claim, resolves
the contradiction.

**Evidence anchors.** [`direct-first-public-b1.md`](../work/direct-first-public-b1.md), Allowed
boundary and Done conditions; [`prd.md`](../prd.md), R6/R7, A9 and A14;
[`design.md`](../design.md), Compatibility deletion and frozen measurement universe;
[`apps/service/src/opencode/liveJourneyProbe.ts`](../../../../apps/service/src/opencode/liveJourneyProbe.ts).

### B2 — The Native Host Work does not own the existing production clients that must speak v2

**Cause → consequence → decision.** A closed Host-first v2 handshake requires every Native Host
health/catalog/Package/execution connection to present the Service-selected binding before any
request. The Work names a nonexistent health-monitor path instead of the actual normal-runtime
owner, and does not unambiguously enumerate the two production probe clients. Staying inside the
boundary therefore leaves protocol-1 readiness/client construction or makes required process probes
fail; updating them crosses the Work's explicit ownership stop. Making the binding optional to keep
those callers compiling would reintroduce exactly the unbound compatibility path A13 forbids. The
decision that this Work can independently realize and prove A13 is invalid.

**Minimum repair.** Replace the nonexistent health path with
`apps/service/src/product/health/nativeHostHealthMonitor.ts` and explicitly add the existing
`apps/service/src/native-host/liveJourneyProbe.ts` and
`apps/service/src/native-host/packageCrashProbe.ts`, each limited to v2 binding construction,
bounded readiness/error semantics and required process evidence. Enumerate any corresponding package
script caller only if implementation proves it must change; otherwise keep it out.

**Why removal or safe degradation is insufficient.** Leaving health unavailable, omitting the
binding, or accepting a v1/optional client would remove normal authenticated readiness or violate the
pre-read A13 boundary. Dropping the probes would remove the real-process restart/recovery evidence
that makes this executable-code handoff reviewable. A precise ownership repair is smaller and does
not change the approved protocol or product direction.

**Evidence anchors.** [`native-host-package-root-binding.md`](../work/native-host-package-root-binding.md),
Allowed boundary, Done conditions and Verification; [`package-root-handoff.md`](../interfaces/package-root-handoff.md),
Authenticated handoff and verification; actual
[`nativeHostHealthMonitor.ts`](../../../../apps/service/src/product/health/nativeHostHealthMonitor.ts),
[`liveJourneyProbe.ts`](../../../../apps/service/src/native-host/liveJourneyProbe.ts) and
[`packageCrashProbe.ts`](../../../../apps/service/src/native-host/packageCrashProbe.ts).

## Advisory observations and residual risk

1. **Make the Host/extraction edge literal.** The index's default route plus global overlap rule can
   safely serialize `executionBoundary.ts`, but a hard dependency `B1 accepted -> Native Host
   accepted -> execution leaf -> Store -> final C` would remove orchestrator ambiguity. This is
   advisory because the existing “next overlapping Work” stop already forbids concurrent edits.
2. **Tighten the Store's composition wording.** “Service composition/tests only where necessary” and
   “Package/live probes” are less precise than the other Work boundaries. The implementer should
   resolve and record the exact existing composition/probe files before assignment. This is not an
   independent blocker because the Work explicitly stops for map repair on an outside-path need and
   final C already names the stable composition owners.

Residual risk after the two boundary repairs remains medium and implementation-sensitive. The leaf
and Store Works appropriately rely on focused static/transaction proofs; any behavior/API drift,
second connection, raw transaction exposure, unexpected live-process impact or frozen-metric change
must stop the next handoff and be carried into final C rather than treated as a locally green result.

## Exact next human decision

The human must calibrate one of these directions; the unchanged Work map must not enter execution:

1. **Repair while retaining scope:** add the exact B1 OpenCode probe path; correct and enumerate the
   Native Host health/probe owners; optionally make the safe default Host-before-leaf order literal;
   keep all PRD, destructive and protocol decisions unchanged.
2. **Remove or safely degrade:** explicitly narrow B1/A9 by removing the affected production probe
   claim, and keep Native Host/Package execution plus authenticated readiness unavailable until all
   v2 consumers have an owned binding path. This removes corresponding A13/A15 completion claims.
3. **Defer** the affected B1/Native Host checkpoint and do not start responsibility extraction.
4. **Stop** this checkpoint.

This model verdict authorizes no repair or forward transition. The human decision must be linked;
the closed QbD 1 destructive direction and g50 observation remain untouched.
