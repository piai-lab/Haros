---
type: "QbD Audit"
title: "Product-truth complexity v9 Route B design audit"
verdict: "FAIL"
---

# Product-truth complexity v9 Route B design audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Bounded objective: fresh independent QbD 1/QbD 2 challenge of immutable Route B checkpoint
  `c7715ed0d85c7efdbb976a1a139960dc635d64b3`, its stop-loss Decision, v9 Interface,
  measurement Work, Work map and five downstream Product Works
- Entry Concept: [`design.md`](../design.md)
- Stop-loss Decision: [`decisions/product-truth-complexity-v9-stop-loss-calibration.md`](../decisions/product-truth-complexity-v9-stop-loss-calibration.md)
- Evaluated Interface: [`interfaces/product-truth-complexity-v9.md`](../interfaces/product-truth-complexity-v9.md)
- Evaluated measurement Work: [`work/product-truth-complexity-v9.md`](../work/product-truth-complexity-v9.md)
- Evaluated Product Works and order: [`work/index.md`](../work/index.md)
- Audit output Concept: `qbd/product-truth-complexity-v9-audit.md`
- Actor ID: `product_truth_complexity_v9_qbd`
- Dispatch receipt: `398ef6c312f04b24bb8da93cd3036cef`
- Predecessor receipt: `b42d83ede94b46199905808f863b3256`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation`

## Verdict

**FAIL**

- Risk: **high** — the measurement-only Work cannot implement two asserted hard gates from the
  frozen authority without choosing new type and graph semantics. That would make the candidate
  meter partly self-authoring and could admit a raw-capability leak or forbidden authority edge
  while reporting a hard v9 PASS.
- Decision-critical blocking findings: **2**
- Advisory observations: **1**
- Total findings: **3**

The stop-loss direction is sound: v9 removes raw/global/alias/callback/RHS/per-use expression
semantics, preserves v1-v8 as immutable evidence and makes B1 behavior fail closed behind private
ports, the fixed verifier and same-SHA different-actor Review. The current v9 authority nevertheless
does not yet fully define the two remaining static verdicts it calls exact. The bounded
measurement-only Work therefore must not start unchanged.

This model verdict authorizes no document repair, meter implementation, B1 assignment, destructive
execution, Product edit or Campaign transition. Human calibration remains required.

## Confirmed evidence and preserved boundaries

1. The audited repository object is exactly
   `c7715ed0d85c7efdbb976a1a139960dc635d64b3`. The v9 authority block parses as JSON and its
   sorted-key canonical SHA-256 is
   `fb3b5d5ec74a108d32c9676d5b2fef3b0df469db3a078450f3d472320520c286`.
2. All five `omp-flow-production-boundary-v1` blocks are byte-identical to `c7715ed0d^`; no
   production, measurement or dependency member changed in the Route B revision. Their canonical
   sorted-key SHA-256 values, in authored execution order, are:
   - `direct-first-public-b1`:
     `7e1bbabd4cceb43552deb6b9e0b1d57a06a81822fd92af94282aa842c16b640b`;
   - `native-host-package-root-binding`:
     `6e8e2b641e2956863313d760c66aeb890111a4f955f52912d6cf80d582b59528`;
   - `product-execution-leaf`:
     `951832ddfafc0b3291251c720b680313ac3cc0d19b1b80a17d85ebf69e58d91a`;
   - `product-state-store`:
     `fc7ee092c6aa6e0ccbedeb3a2abde2d438d1ea401a7f9c981b349fc316e90a58`;
   - `product-execution-coordinator-facade`:
     `980a51cc35f62bc4e2324cef6b21f2fcd5127e44edb4fda7e28f08d9fa96cafc`.
3. The Work map preserves the literal sequence `accepted v9 meter -> accepted B1 -> accepted Native
   Host -> accepted execution leaf -> accepted Product State Store -> Coordinator/facade C` and
   retains the indivisible B1 stop before responsibility extraction
   (`work/index.md:82-181`). The destructive allowlist, protected exclusions, direct-first-public
   behavior, Package-root ownership and the five production fences do not change in the Route B
   diff.
4. The inherited `omp-flow-b1-verifier-universe-v1` block at this tree parses and mechanically
   contains 10 owners, 146 globally listed operations, 34 barriers, 29 kill identities and 87
   states. Its race and kill catalogs are exact 34/29 bijections, and its frozen ordinal expansion
   declares 85 race and 65 kill cases with case-identity digest
   `d09aadf1e78994ad65a4804de4d791f79762066e9da864c435ec126cf860f892`.
   Candidate selection remains `none`.
5. Route B explicitly excludes raw/global terminals, wrapper/selector normalization, alias
   propagation, callback inheritance, RHS/subtree classification and per-use ownership from v9
   (`interfaces/product-truth-complexity-v9.md:142-151`; `design.md:690-695`). B1 must run the fixed
   manifest, every r1-r17 hidden-mutation family and adjacent positives, and a same-SHA raw-reference
   inventory/Review; a bypass without a reproducible failure returns to Design
   (`interfaces/product-truth-complexity-v9.md:184-202`; `design.md:697-737`). This is a real
   fail-closed transition, not permission to accept a meter-only safety claim.
6. The Decision, Interface, measurement Work and map retain the reuse-first rule: reuse accepted v7
   mechanical and v8 evidence/static-graph mechanisms; replace only for a named owner,
   reproducible falsifier and proof that wiring/local repair cannot close the gap. R1-r17 falsify
   only v8 expression-combination authority, not Product or Synara mechanisms
   (`decisions/product-truth-complexity-v9-stop-loss-calibration.md:42-49`;
   `interfaces/product-truth-complexity-v9.md:204-210`;
   `work/product-truth-complexity-v9.md:38-41`).
7. The pre-existing shared-tree changes in `README.md`, `execution-brief.md` and
   `missions/independent-omnimind-v1.md` were preserved and not treated as bytes of the immutable
   v9 Design object. No real `~/.omnimind`, credential, provider, network or user state was read or
   changed.

## Decision-critical findings

### B1 — The frozen authority does not contain the exact public signatures or a finite raw-type disposition, so public non-leak is not candidate-independent

**Cause.** The v9 machine block freezes declaration path, symbol and declaration kind, then names
semantic categories such as `raw-path-or-scratch-path-for-arbitrary-io`, `release-function` and
`process-handle-or-raw-adapter`. It does not contain an expected canonical signature/type-closure
payload or digest for any declaration, an export/private disposition, resolved type-symbol origins,
or a finite rule for aliases, generics, unions, structural interfaces, `any` and `unknown`
(`interfaces/product-truth-complexity-v9.md:32-69,79-91`). The prose nevertheless says those
signatures are frozen before implementation (`interfaces/product-truth-complexity-v9.md:175-182`).

Repository-object inspection makes the missing authority concrete. At `c7715ed0d`,
`scripts/product-truth/database-lock.ts#withProductTruthDatabaseLocks` does not exist, yet it is a
required B1 declaration with no authored move or exact future signature. The future Store target is
also absent, but only that one declaration has an explicit source-to-target move. Two required Web
declarations are module-private, while the rule is phrased as an exported public type/API closure.
The v9 Work cannot repair the authority: it owns only new meter/config/test/fixture/handoff paths,
and its config is expressly forbidden to add type dispositions
(`work/product-truth-complexity-v9.md:61-79`).

**Consequence.** An implementer must decide what the missing signature is, whether a declaration is
public, and whether a structural TypeScript type represents a raw path, release function or
adapter. That either reintroduces an unbounded semantic vocabulary under `public-shape`, or lets the
candidate/meter author select the expected shape. A leaked `string` path, structurally disguised
handle or release closure can therefore pass declaration identity and static imports while v9
reports a hard B1/C non-leak gate. This invalidates the Route B condition that raw capabilities do
not cross owner boundaries and directly affects PRD A9/A14 and the decision to authorize B1.

**Decision.** Blocking. The measurement-only v9 Work is not realizable from the frozen authority as
written.

**Minimum repair.** Choose one bounded route in the authority itself:

1. freeze, for every phase-relevant declaration, exact presence/export disposition plus a canonical
   resolved signature/type-closure representation and digest, including an exact future signature
   for `withProductTruthDatabaseLocks` and the authored Store move; define finite, symbol-origin-
   based dispositions for every allowed/forbidden type and fail closed on unsupported type forms; or
2. safely degrade v9 to exact declaration identity and byte-pinned signature equality only, remove
   its semantic `raw capability` verdict, and bind the complete non-leak decision to the mandatory
   same-SHA B1 source Review with an exact evidence contract.

Simply hiding, disabling or renaming the present gate is insufficient: A9/A14 still require a
decision-critical non-leak proof before B1 acceptance. Safe degradation works only if that proof is
explicitly reassigned rather than silently dropped.

### B2 — Several asserted static-graph verdicts are labels, not an exact finite edge authority

**Cause.** The v9 block precisely defines how to resolve literal static import/export declarations,
but its hard verdict list supplies only labels for `web-or-rpc-import-other-than-facade`,
`engine-gateway-import-of-facade-or-store`, `native-host-package-lifecycle-write-edge` and
`forbidden-compatibility-module-edge` (`interfaces/product-truth-complexity-v9.md:93-110`). It does
not freeze the source module set, target module set, allowed/forbidden edge kind or phase
disposition for those labels. `write-edge` is not itself a property of an import/export edge. The
config cannot provide the missing table because edges and expected verdicts are forbidden config
authority (`design.md:648-654`; `work/product-truth-complexity-v9.md:76-84`).

**Consequence.** Candidate graph enumeration can be deterministic while the verdict is not. Two
conforming meter implementations can choose different meanings for `web-or-rpc`, `engine-gateway`,
`Package lifecycle write` or `forbidden compatibility module`; one may miss a second authority
edge, while another rejects a permitted static dependency. This undermines the claimed hard
mechanical gates for the one Store, one facade, literal gateway and Service-owned Package root, and
therefore affects A10-A14 and all five downstream transitions.

**Decision.** Blocking. A list of domain labels is not the exact static graph authority the Design
and measurement Work promise.

**Minimum repair.** Replace each label with a finite, Design-owned table of exact source selectors,
target selectors, import/export edge kinds, phase applicability and allow/fail disposition. Generate
all adjacent positive/negative fixtures from that table. For `native-host-package-lifecycle-write`,
either define the exact conservative forbidden import endpoints that constitute the static gate, or
remove the behavioral word `write` from v9 and bind zero lifecycle writes to the existing
same-SHA source/process Review while retaining only exact import edges in v9.

Dropping these checks without replacement is insufficient because the Product/Package single-
authority decisions still require a finite static boundary or an explicitly bound behavioral
proof. Narrowing is safe only when the removed semantic part is reassigned to that proof owner.

## Advisory observation

### A1 — Raw-reference output canonicalization is exact, but enumeration-method provenance is not yet frozen

The B1 Review record shape, source-span digest, sorted count/JCS digest, zero-unexplained condition
and exact r1-r17 mutation obligations are materially stronger than prose assurance
(`interfaces/product-truth-complexity-v9.md:190-202`). The remaining reproducibility risk is that the
Design freezes output canonicalization but not the reviewer-owned enumeration command/tool/version
or a canonical mutation manifest. A deterministic digest of an incomplete record set is still
deterministic, and r17 demonstrated exactly that kind of omitted traversal.

This is advisory rather than a third blocker because the current transition is fail closed: every
r1-r17 mutation and adjacent positive must produce a concrete verifier/static/Review outcome, and
any bypass lacking one falsifies Route B before B1 acceptance. Retaining the exact inventory
generator/method and mutation manifest with the same-SHA Review would make that later evidence
independently replayable without moving expression semantics back into v9.

## Assumptions, counter-evidence and accepted risk

- **Confirmed evidence:** the five fences and Work order are unchanged; the fixed verifier counts,
  ordinal expansion and case digest reproduce; official evidence selection, strict ancestry/blob
  immutability and non-authenticating receipt boundary are exact; v9 expressly rejects expression
  semantics.
- **Assumption rejected:** words such as `raw adapter`, `sanitized`, `write edge` or `gateway` are
  not self-executing machine predicates. Their intent is clear to a human, but clarity does not
  supply the candidate-independent expected value required by a hard meter gate.
- **Strongest counter-evidence:** the accepted v7 verifier universe is finite and the v9 transition
  is aggressively fail closed. That is sufficient to preserve the Route B direction and to keep
  raw/runtime behavior outside the meter, but it cannot manufacture the missing v9 signature and
  edge authorities because the v9 Work is forbidden from defining them.
- **Accepted risk:** Main/human selects the official evidence SHA, and actor/receipt/Git metadata do
  not authenticate the reviewer or human. The Interface states this limitation and requires a
  later different-actor invocation check, so it is not a hidden authority claim.
- **Not accepted as risk:** the two blocking gaps cannot be labeled residual risk while the current
  scope continues. They are hard B1/C gates and must be repaired, safely degraded with explicit
  reassignment, deferred or stopped.

## Exact next decision and options

Human calibration must choose one direction:

1. **Repair:** freeze the missing per-declaration signature/type dispositions and exact static-edge
   table, preserving Route B's expression-semantic non-authority and all five Work fences/order.
2. **Remove or safely degrade:** reduce v9 to exact declaration/signature and literal static-edge
   facts, and explicitly assign public non-leak plus behavioral `write` decisions to the mandatory
   same-SHA B1 Review/process evidence. Do not let the original semantic labels remain hard meter
   verdicts.
3. **Defer:** preserve `c7715ed0d` and this audit as evidence without assigning v9 or B1.
4. **Stop:** abandon Route B or the Product-truth Work sequence.

The unchanged risky scope cannot proceed under an accepted-risk label. This audit does not command
a new audit or authorize any repair.

## Dispatch identity

- role: `qbd`
- actorId: `product_truth_complexity_v9_qbd`
- receipt: `398ef6c312f04b24bb8da93cd3036cef`
- predecessor: `b42d83ede94b46199905808f863b3256`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation`
- verdict: `FAIL`
