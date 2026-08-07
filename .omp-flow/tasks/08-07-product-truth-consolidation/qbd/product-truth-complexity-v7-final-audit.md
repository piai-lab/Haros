---
type: "QbD Audit"
title: "Product-truth complexity v7 repaired-authority final audit"
verdict: "FAIL"
---

# Product-truth complexity v7 repaired-authority final audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`qbd/product-truth-complexity-v7-audit.md`](product-truth-complexity-v7-audit.md)
- Evaluated interface: [`interfaces/product-truth-complexity-v7.md`](../interfaces/product-truth-complexity-v7.md)
- Evaluated Work: [`work/product-truth-complexity-v7.md`](../work/product-truth-complexity-v7.md)
- Evaluated production Work: [`work/direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Immutable repaired Design checkpoint: `41436bb148dde3f4df838a672cc36b91a7808a7f`
- Actor ID: `product_truth_complexity_v7_qbd_final`
- Dispatch receipt: `0f993193eca7412887dabb9fe6eaa77b`
- Predecessor receipt: `fc01b8764dac44419215f9495954e75d`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v7.md`

## Verdict

**FAIL**

- Decision-critical blocking findings: **2**
- Advisory observations: **0**
- Total findings: **2**

The repair materially improves both rejected areas. The three machine blocks parse, the accepted
dependency digests reproduce, all 146 operation IDs are unique, and every declared barrier and
kill point references a real operation. Two candidate-selection gaps remain, however. The raw
terminal grammar does not close standard global-object aliases and contains a source-form identity
contradiction, while the B1 case matrix still refers to an unbound set of “accepted fixture-state
identities.” A green meter or verifier can therefore omit a raw ingress form or a state/ordinal
case while satisfying the frozen bytes.

This verdict authorizes no v7 implementation, B1 work, destructive execution, real-user-state
access or Campaign transition.

## Immutable checks that hold

1. Git inspection fixed the audited tree at the full SHA above and the worktree was clean at audit
   start. The checkpoint changes linked design documents only; it contains no v7 meter, Product
   implementation or destructive execution.
2. The interface contains exactly one parseable block of each required kind. Their complete fenced
   SHA-256 digests are:
   - `omp-flow-raw-effect-universe-v1`: `97441b7a3d4424cd09f2d9ca1a1da9c50c080d3e0e6d0aff4bca59a90ea1836f`;
   - `omp-flow-effect-ingress-authority-v1`: `9f2a9883de7b9013fe75c97bd534092bae791c9698d8cea2a8bb06a4ca61091c`;
   - `omp-flow-b1-verifier-universe-v1`: `bc96767cd2fe7e3624a1bcf684a462d5578f5ff94067e46072cc50bd8c9b59f2`.
3. The three accepted dependency identities reproduce from the installed exact lock closure. The
   ordered `SHA-256  ./relative-path` manifests contain 193, 9 and 18 regular files and reproduce,
   respectively, `6152fe031584d50f0ce8be548aed98912b178c4562e964c2a17f45268ea0f440`,
   `2f1603b1dd14138092c809949988dcb0606b73f642b435f4530043ca3a06f41d` and
   `deba2c06f44ae9015cd07d0149d3a341e17913bd35fc3edadcfa35262e501036`.
   The `classic-level` and `node-gyp-build` integrity values and the Effect locked revision also
   match `bun.lock`.
4. The owner allocation contains ten B1 traced owners, one exclusive C move and twelve closed
   unrelated owners. Every path is an exact production member of at least one of the five Work
   blocks; the B1/C Product owner paths do not coexist as traced declarations.
5. The verifier block contains ten owners, 146 unique operations, 34 unique barriers and 29 kill
   identities. Every barrier endpoint and kill identity names an operation in the same owner.
   Operations bind signatures, atomicity, stage, resource role and two fault sites; outcomes,
   exclusions, candidate-change prohibition and required hidden mutations are present.
6. Direct comparison with the original v7 Design checkpoint `13800933503c612fb7861392e3bf0aefd707255e`
   proves the five `omp-flow-production-boundary-v1` fences byte-identical. Their complete fenced
   digests in Work-map order are
   `c75f003f964fb7c89850d73f2ca9b713fd2056336dc8eaa999387ae6a2b839b0`,
   `40827e3445fd95c5811724d81aa37e7bbcf9203dcde3eb7de4a5b8bdd7b9e0e4`,
   `ce8c08665a0bf49ffca61f6ef3bf463d6d8266382fa3dafab65c4c864538dea5`,
   `43328ab91939511c232e5b25509f125b9f4b8cd87553a37791cfdea13d8503ac` and
   `bf90deed11d2c780ff7b228549a434fb3d4f1950e68d426d77be5ea701310f03`.
7. V7 still explicitly denies CFG/ICFG, SSA, points-to, scheduler, Effect, catch/finally and other
   runtime-semantic claims. The repair does not smuggle those claims back into structural counts.

## Blocking finding 1 — the raw-effect grammar does not close its own source forms or global aliases

**Cause.** The interface says every ingress is one exact member of `sourceForms` and that meter or
config code cannot add a spelling (`interfaces/product-truth-complexity-v7.md:58-63,149-150`). The
block nevertheless declares `computed-literal-member` in `sourceForms` while its only computed
terminal uses the different, undeclared form `computed-member` (`:69,107-110`). An implementation
must either ignore the latter or invent a normalization that the Design does not own. More
materially, the global authority names only bare roots such as `Bun` and `process` (`:91-105,
113-120`). It defines no source form, root canonicalization or fail-closed disposition for the
standard aliases `globalThis.Bun` and `globalThis.process`. The audited Bun runtime confirms those
objects are identity-equal to the bare globals. Thus `globalThis.Bun.spawnSync(...)` and
`globalThis.process.dlopen(...)` are direct process/native-loader terminals but match neither a
listed root nor a declared unmatched-global default. `namespace-member` cannot repair this without
an explicit alias rule; treating it as one would again let meter code author the missing mapping.

**Concrete consequence.** A frozen member can add one of those direct forms without entering the
raw-effect inventory or any `b1TracedOwner`. The B1 capability, injected port, trace, fault and kill
matrix then do not observe the effect. Alternatively the future meter can silently add its own
alias/form normalization, making the meter rather than the accepted Design the terminal authority.
Either outcome defeats the required complete, candidate-independent ingress closure.

**Affected decision.** This keeps the first prior QbD blocker open: v7 cannot yet replace the
rejected semantic meter with a complete finite structural ingress gate before destructive B1.

**Smallest remedy.** Make the source-form enum internally exact and add a finite Design-owned
global-object alias grammar for every supported wrapper (`globalThis` and any deliberately
supported `global`/`window`/`self` spelling), with literal and computed member dispositions. Add
single-change negatives for `globalThis.Bun.spawnSync`, `globalThis.process.dlopen` and the two
computed forms. Unsupported wrapper/member chains must have one explicit fail-closed disposition;
the meter may extract but not invent the normalization.

**Why safe degradation is insufficient.** Reporting an unrecognized form does not prevent a raw
effect that the grammar never recognizes. Narrowing the claim to bare globals abandons the central
“no second raw path” premise and is a Design change, not a safe runtime degradation.

## Blocking finding 2 — the B1 fixture/state and ordinal universe is still candidate-selected

**Cause.** The new block freezes owners, operations, barriers and kill points, but not the fixture
states that select and instantiate their cases. Its `fixtureAxes` is a list of broad labels and its
manifest is the product of axes “selected-by-executionRule” (`interfaces/product-truth-complexity-v7.md:
530-548`). Neither the block nor another linked immutable authority enumerates per-owner fixture
IDs, initial resource identities/cardinalities, owner-to-axis selection, ordered-entry/chunk counts
or the digest/path of an existing fixture registry. The prose instead says the future checked-in
generator consumes unspecified “accepted fixture-state identities,” and explicitly says the
generated fixture fixes each ordinal count (`:553-576`). `caseBoundOperationIds` closes only four
Product/service/Web case families; it does not define the classifier-table layouts, Chromium
profile states, live/dead/unknown lock records, sealed target combinations or Package
full/manifest-only/empty states needed by the first six owners.

**Concrete consequence.** B1 can choose a smaller checked-in fixture set or fewer repeated
entries/chunks, omit one owner-specific presence/lifecycle state, and generate a perfect
manifest/execution bijection for that self-selected universe. Every one of the 146 declared
operations can still have a before/after case and every declared barrier/kill can execute once,
while a real schema-table ordinal, LevelDB entry, target combination, lock disposition or Package
transition state is absent. The hidden “remove operation/coarsen port” mutations do not detect an
omitted input state that never entered the manifest.

**Affected decision.** This keeps the second prior QbD blocker open in a narrower form. Port
operations are now frozen, but the promise that the B1 behavior matrix is candidate-independent
and exhaustive is still not mechanically true. That proof is the only runtime assurance path after
v7 deliberately removes semantic analysis.

**Smallest remedy.** Extend the Design-owned verifier block with a closed `fixtureStates` authority:
per owner, enumerate exact state IDs, initial opaque resource kinds/cardinalities, applicable axes,
ordered ordinal counts or a deterministic immutable derivation from named B0 fixture paths and
digests. Bind each state to expected operation-prefix rules, outcomes and exclusions. The generator
may materialize those states but may not add, omit or resize them. Add a hidden mutation that drops
one state and one terminal ordinal while leaving all operation IDs intact; both must fail manifest
derivation.

**Why safe degradation is insufficient.** B1 is authorized to delete local state. A green matrix
over a candidate-chosen state domain cannot prove behavior for the omitted state, and source Review
after implementation cannot retroactively make that manifest exhaustive. The bounded repair is a
small owner-local fixture authority, not a return to CFG or points-to analysis.

## Non-blocking checks and residual risk

No advisory is recorded. Apart from the two blockers, the repair closes the concrete dependency
digest, terminal selector/default, owner allocation, operation identity, barrier/kill reference and
five-fence immutability checks requested by the prior audit. Those valid pieces should be preserved
verbatim in the next repair.

No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.

## Required transition

Repair only the two closed authorities above, preserve the accepted dependency identities, all ten
owner operation tables, five production fences and destructive/protected boundaries, then run a
fresh different-actor QbD. The unchanged v7 scope may not proceed to implementation under accepted
risk because both findings affect the core non-gameability and only runtime-verification route.

## Dispatch identity

- role: `qbd`
- actorId: `product_truth_complexity_v7_qbd_final`
- receipt: `0f993193eca7412887dabb9fe6eaa77b`
- predecessor: `fc01b8764dac44419215f9495954e75d`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v7.md`
- verdict: `FAIL`
