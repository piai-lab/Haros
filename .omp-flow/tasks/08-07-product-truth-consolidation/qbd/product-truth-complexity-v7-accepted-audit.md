---
type: "QbD Audit"
title: "Product-truth complexity v7 final acceptance audit"
verdict: "FAIL"
---

# Product-truth complexity v7 final acceptance audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`qbd/product-truth-complexity-v7-final-audit.md`](product-truth-complexity-v7-final-audit.md)
- Evaluated interface: [`interfaces/product-truth-complexity-v7.md`](../interfaces/product-truth-complexity-v7.md)
- Evaluated Work: [`work/product-truth-complexity-v7.md`](../work/product-truth-complexity-v7.md)
- Evaluated production Work: [`work/direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Immutable repaired Design checkpoint: `cc356f616eaea60ccfa007eebfec67f1aa69903c`
- Actor ID: `product_truth_complexity_v7_qbd_accept`
- Dispatch receipt: `5b54a00602ba477188dfd266fe47bd21`
- Predecessor receipt: `9d6ead96d3ee499199e7fbfbceb959d1`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v7.md`

## Verdict

**FAIL**

- Decision-critical blocking findings: **2**
- Advisory observations: **0**
- Total findings: **2**

The final repair closes the previous raw-effect source-form/global-alias contradiction and makes the
listed fixture catalog mechanically self-authenticating. It does not yet close the selected runtime
case universe. The catalog omits the already-required Package `empty` starting state, and the
manifest multiplies faults but not race or kill cases by the actual ordinal of repeated operations.
A verifier can therefore prove a perfect generated/executed bijection while never exercising one
required fresh-convergence state or later Package/lock/fsync boundaries.

This verdict authorizes no v7 implementation, B1 work, destructive execution, real-user-state
access or Campaign transition.

## Immutable checks that hold

1. Git inspection fixed the audited tree at the full SHA above and the worktree was clean at audit
   start. The checkpoint changes linked Design documents only; it contains no v7 meter, Product
   implementation or destructive execution.
2. The interface contains exactly one parseable block of each required kind. Independently hashing
   the complete fenced bytes reproduces:
   - `omp-flow-raw-effect-universe-v1`: `77d74864e1621d8df41b53340732ce2a8e9b4539e334429d1354dea7c4c578c0`;
   - `omp-flow-effect-ingress-authority-v1`: `9f2a9883de7b9013fe75c97bd534092bae791c9698d8cea2a8bb06a4ca61091c`;
   - `omp-flow-b1-verifier-universe-v1`: `b2701439774470a0c58a7c49e7ed772379d79e7144e27025e54891d9042f063d`.
3. The repaired raw grammar is internally exact. Both computed identities are members of
   `sourceForms`; every syntax terminal names a declared form; dot, literal-computed and
   nonliteral-computed dispositions are disjoint; and unshadowed `globalThis`, `global`, `self`
   and `window` normalize through one finite longest-root rule. Repeated/shadowed/unresolved
   wrappers and nonliteral selectors fail. The exact required witnesses cover bare, aliased,
   literal-computed and nonliteral-computed Bun/process terminals. Neither the meter nor config
   needs to invent a spelling or alias rule.
4. The effect ingress block contains ten ordered B1 owners, one exclusive C move and twelve closed
   unrelated owners. The B1 owner order exactly equals both the verifier owner order and fixture
   owner order. Every owner path is frozen by the accepted Work universe, and the B1/C Product
   owner declarations remain mutually exclusive.
5. The verifier block parses with ten owners, 146 globally unique operation IDs, 34 globally unique
   barrier IDs and 29 globally unique kill operation IDs. Every barrier endpoint, race entry and
   kill entry resolves to the same owner; all kill convergence references resolve to one of 24
   unique convergence-state definitions; and operation signatures, atomicity, stages, roles,
   outcomes and exclusions are present.
6. The fixture catalog lists 86 globally unique state IDs and ten owner-local applicability maps.
   Each `normalStateIds` list is an exact ordered bijection with its owner states; every fault,
   race and kill state resolves inside that owner. RFC 8785 canonicalization of every complete
   owner entry with `definitionSha256` omitted reproduces all ten owner digests. Hashing the ordered
   `owner<TAB>definitionSha256<LF>` lines reproduces
   `fixtureCatalogSha256 = 0d83a019c51638f4f94e65ab443705b57d8baa37146a63e2cce9709a87fa5909`.
   All iteration-binding operation references resolve to the same owner and the declared resource,
   key, entry, chunk and terminal-EOF cardinalities are finite.
7. The race catalog is a 34-entry bijection with the declared barriers and the kill catalog is a
   29-entry bijection with the declared kill operation IDs. The normal and fault manifest rules
   use Design-owned states/cardinalities, generated/executed identity is exact, and
   `candidateSelection` is literally `none`. The two findings below concern missing members of that
   frozen derivation, not parse or digest drift.
8. Direct comparison with original v7 Design checkpoint
   `13800933503c612fb7861392e3bf0aefd707255e` proves the five
   `omp-flow-production-boundary-v1` fences byte-identical. Their complete fenced digests in Work-map
   order are `c75f003f964fb7c89850d73f2ca9b713fd2056336dc8eaa999387ae6a2b839b0`,
   `40827e3445fd95c5811724d81aa37e7bbcf9203dcde3eb7de4a5b8bdd7b9e0e4`,
   `ce8c08665a0bf49ffca61f6ef3bf463d6d8266382fa3dafab65c4c864538dea5`,
   `43328ab91939511c232e5b25509f125b9f4b8cd87553a37791cfdea13d8503ac` and
   `bf90deed11d2c780ff7b228549a434fb3d4f1950e68d426d77be5ea701310f03`.
9. The Occam boundary remains intact. V7 still explicitly denies CFG/ICFG, SSA, points-to,
   scheduler, Promise, Effect, catch/finally and runtime-lifetime authority. Runtime behavior stays
   in the separately generated B1 verifier and different-actor source Review. No destructive
   target, protected exclusion, dependency or Product behavior changed in this repair.

## Blocking finding 1 — the frozen fixture catalog omits the required Package `empty` start

**Cause.** The selected Product contract freezes the only Package cleanup graph as
`full -> manifest-only -> empty -> absent` and requires fresh convergence from
full/manifest-only/empty tombstones (`design.md:338-346,795-798`;
`work/direct-first-public-b1.md:235-240`). The repaired apply-owner catalog nevertheless lists only
`apply.package-full` and `apply.package-manifest-only` before `apply.all-target-kinds`
(`interfaces/product-truth-complexity-v7.md:664-673`). There is no `apply.package-empty` normal
state with the single remaining `empty -> absent` transition. This is the exact lifecycle state
the predecessor audit identified; a valid digest over 86 listed states authenticates the omission
rather than closing it.

**Concrete consequence.** B1 can generate and execute every currently frozen case while fresh
`inspect`/`apply` mishandles an empty tombstone left by interruption. It may refuse forever, choose
a non-sealed path, remove the wrong directory identity or fail to reach absence, yet the manifest
and executed-case bijection stay green because that starting state never exists in the authority.
This is a destructive recovery path, not optional representational coverage.

**Affected decision.** The repaired 86-state catalog cannot yet be the candidate-independent B1
runtime authority that replaces v5/v6 semantic analysis. The direct first-public Work cannot start
from the unchanged v7 authority.

**Smallest remedy.** Add one exact apply-owner `package-empty` state derived from the already-frozen
graph, including its one-edge resource/cardinality definition and expected sealed-empty-to-absent
result. Add it to the owner's applicability lists where required, recompute the owner/catalog and
complete verifier-block digests, and update every linked exact state-count assertion. Do not add a
generic lifecycle model or alter the graph.

**Why safe degradation is insufficient.** A permanent typed refusal on empty would be safe but
would remove the selected fresh-convergence behavior and leave an inert tombstone that the rebuild
tool can never complete. That is a Product/Work narrowing requiring an explicit Design decision;
it is not evidence that the current full-convergence claim is true.

## Blocking finding 2 — repeated-operation ordinals are absent from race and kill generation

**Cause.** `iterationBindings` gives several race/kill operations more than one actual ordinal. In
the apply kill/race state, `apply.transition-package-node` runs three times and
`apply.fsync-target-parent` eight times; database-lock publish/fsync/remove operations run six
times. The fault rule correctly takes the Cartesian product over every derived ordinal
(`interfaces/product-truth-complexity-v7.md:909-911`). The race and kill rules instead emit exactly
one case per barrier ID or kill operation ID (`:912-913`), while their catalog entries contain no
ordinal and no deterministic ordinal derivation (`:844-880`). The `caseId` merely reserves an
`ordinal-or-single` slot; it does not select all actual ordinals. This contradicts the selected
proof that terminates after every lock publish, each Package graph edge and each fsync boundary
(`design.md:795-798`; `work/direct-first-public-b1.md:236-240`).

**Concrete consequence.** A candidate can behave correctly at the one generated occurrence but
fail at a later occurrence and still satisfy the complete block digest and generated/executed-case
bijection. For example, the first Package edge can converge while the second edge leaves an
unsealed or unrecoverable `empty` node, or the first lock publication can survive abrupt process
termination while the sixth leaves a foreign or unreclaimable record. The same omission affects
replacement races between later observation/use pairs. Faulting each ordinal does not substitute
for abrupt termination or a separate-writer race at that ordinal.

**Affected decision.** The verifier is still candidate-independent only over an underspecified
race/kill universe. Because v7 intentionally makes no runtime-semantic claim, this gap removes the
only exhaustive assurance route for selected destructive concurrency and convergence behavior.

**Smallest remedy.** Make race and kill manifest derivation an exact product over every applicable
actual ordinal from the owner state and `iterationBindings`. Bind each barrier's paired from/to
occurrence and each kill operation occurrence to an explicit or deterministically derived ordinal,
carry that ordinal in the case ID, and require the catalog/generated/executed bijection over the
expanded set. Recompute all affected digests and exact race/kill case counts. Preserve the existing
operations, convergence assertions and Occam split.

**Why safe degradation is insufficient.** An omitted test case does not make the later production
effect unavailable or fail closed. Restricting each repeated operation to one occurrence would
change the six-lock, multi-target and sealed Package graph behavior. Source Review cannot turn a
non-generated abrupt-kill/race case into an exhaustive manifest after implementation.

## Non-blocking checks and residual risk

No advisory is recorded. Apart from the two blockers above, the final repair closes the prior
source-form/global-alias vocabulary finding and makes every listed owner/state definition,
cardinality reference, race/kill reference, convergence assertion and five production fence
mechanically immutable. Those accepted pieces should be preserved verbatim in the bounded repair.

No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.

## Required transition

Repair only the missing `package-empty` state and race/kill ordinal Cartesian authority, recompute
the affected exact counts/digests, preserve the raw grammar, owner operation tables, convergence
assertions, five production fences and destructive/protected boundaries, then run a fresh
different-actor QbD. The unchanged v7 authority may not proceed to implementation under accepted
risk because both findings affect the only runtime-verification path for destructive B1.

## Dispatch identity

- role: `qbd`
- actorId: `product_truth_complexity_v7_qbd_accept`
- receipt: `5b54a00602ba477188dfd266fe47bd21`
- predecessor: `9d6ead96d3ee499199e7fbfbceb959d1`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v7.md`
- verdict: `FAIL`
