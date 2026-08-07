---
type: "QbD Audit"
title: "Product-truth complexity v7 mechanical-authority audit"
verdict: "FAIL"
---

# Product-truth complexity v7 mechanical-authority audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`interfaces/product-truth-complexity-v7.md`](../interfaces/product-truth-complexity-v7.md)
- Evaluated Work: [`work/product-truth-complexity-v7.md`](../work/product-truth-complexity-v7.md)
- Evaluated production Work: [`work/direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Immutable Design checkpoint: `13800933503c612fb7861392e3bf0aefd707255e`
- Actor ID: `product_truth_complexity_v7_qbd`
- Dispatch receipt: `3c6a699f8c594fee9aa6e4b34eeefbee`
- Predecessor receipt: `c0028b8a247e47d793570c33f7eeda5e`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v7.md`

## Verdict

**FAIL**

- Decision-critical blocking findings: **2**
- Advisory observations: **0**
- Total findings: **2**

The Occam move is directionally correct: v7 removes the unbounded runtime-semantic interpreter and
limits the meter to structural authority, while B1 retains same-SHA runtime evidence and independent
Review. Two authority gaps remain, however. The raw-effect vocabulary is not closed enough to make
the claimed complete ingress inventory mechanically decidable, and the supposedly exhaustive B1
fault/race/kill universe is still selected by the future B1 implementation because its port and
durability map is not frozen. Either gap lets a green candidate omit a raw path or a required
failure boundary while satisfying its own declared universe.

This verdict authorizes no v7 implementation, B1 work, dependency change, destructive execution,
real-user-state access or Campaign transition.

## Immutable inputs and facts that hold

1. Git inspection fixed the audited tree at the full SHA above; the worktree was clean at audit
   start. The checkpoint changes only linked PRD/Design/interface/Work-map documents and creates no
   meter, Product behavior, destructive execution or user-state effect.
2. The tree contains exactly one `omp-flow-effect-ingress-authority-v1` machine block. Its complete
   fenced digest is `3862383a391bbcba2b4f84390b9459b29b4f4e28c87ee1f92ec6fb265c105653`.
3. Direct comparison with the v7 checkpoint parent `82d79f141` proves the five
   `omp-flow-production-boundary-v1` fences byte-identical. Their fenced SHA-256 digests remain:
   `70a1f93d58685e3bd3bcff29cf4c91862f02038d1dd3b3c6186d4b40d367ce33`,
   `deec305e9745697210f300edc385c56fdfa654055e1506dbc99ec87518d10f2f`,
   `19ba724423af690adc2f3c9b5443839b058b7d8fba4418ff772f23c0f8d29550`,
   `6c637776d34b02d5c784a05e46783e94d0412be0fca7f013e8a9f12f6822c565` and
   `5f2e1127e2b9722ca276e8803b873875cbe463e8a146ee2876f82ba9ba545882` in Work-map order.
4. V7 expressly denies CFG/ICFG, points-to, scheduler, Effect, catch/finally and other runtime
   claims. B0/B1/C membership, dependency bytes, import graph, counts and report determinism remain
   separated from B1 behavior evidence. The B1-to-C Product owner move is exclusive and the accepted
   meter bytes must remain read-only.
5. B1's public capability boundary correctly forbids scratch/source paths usable for arbitrary I/O,
   database/Level handles, batches, lock tokens, release functions, process handles and raw adapters.
   Generated homes only, executed-case bijection, hidden mutations and same-SHA source Review are
   mandatory rather than optional prose.

## Blocking finding 1 — raw-effect ingress authority is neither finite nor mechanically complete

**Cause.** The interface claims a complete syntactic ingress inventory and a closed machine
authority (`interfaces/product-truth-complexity-v7.md:17-27,53-97`), but the prose and machine block
do not define the same finite vocabulary. The prose admits “equivalent” process and loader terminals
while the authoritative JSON omits concrete direct terminals such as `Bun.spawnSync`, Bun Shell
`$` and Node native loading through `process.dlopen`. A frozen member can
therefore introduce one of those direct globals/imports without matching any machine token. The
audited Bun `1.3.14` toolchain reports both `Bun.spawnSync` and the `$` export from `"bun"` as
functions, and the pinned Node type closure declares `process.dlopen`; these are not hypothetical
spellings. The
same section requires classification of “any dependency export that constructs or yields” a
SQLite/Level handle, while dependency analysis is explicitly limited to module/import facts and may
not infer handle/resource semantics (`:45-51,58-70`). No Design-bound dependency effect-surface
manifest or conservative structural rule says which export acquires which class. Config is forbidden
from adding that missing authority later.

**Concrete consequence.** A conforming meter has only two choices: follow the JSON and miss a real
filesystem/process/native-loader ingress, or invent terminal/export classifications in meter code.
The first permits a second raw-effect path outside every `b1TracedOwner`; the second makes the meter,
not the accepted Design, the authority and makes its result irreproducible from the frozen block.
For dependency wrappers, an implementation can also claim that an export is pure without any
allowed mechanical basis, or use forbidden body/return semantics to decide that it yields a handle.
In all cases the B1 claim that no alternate raw path exists (`work/direct-first-public-b1.md:250-254`)
is not mechanically established, so a raw operation can bypass the injected capability, trace,
fault and kill gates.

**Affected decision.** This defeats the central v7 replacement promise: a candidate-independent,
non-gameable structural ingress gate that is safe to freeze before destructive B1. It also prevents
the later source Review from enumerating “every raw ingress reference” from a complete frozen
inventory.

**Smallest remedy.** Replace every open-ended “equivalent” category with one finite Design-owned
terminal grammar/list, including all supported Bun/Deno/Node/Electron direct process, filesystem and
native-loader forms, and add one explicit default disposition for an unmatched global/builtin
terminal. Bind every accepted external dependency export used by a frozen member to a source-digest-
keyed effect-surface class, or state one conservative purely structural closure rule (for example,
all reachable exports from a dependency closure containing a class ingress) and prove it is viable
on B0. The meter may extract these facts but may not author them. Add one-negative fixtures for at
least `Bun.spawnSync`, Bun Shell and `process.dlopen`, plus a digest-bound dependency-wrapper export.

**Why safe degradation is insufficient.** B1 is explicitly allowed to perform irreversible local
deletion after acceptance. Hiding or reporting an unknown ingress does not close the bypass, and
disabling only one operation cannot prove that the remaining unenumerated terminal is absent.
Narrowing the claim to the current JSON spellings would abandon the required “no second raw path”
condition and must be an explicit Design change, not a meter implementation choice.

## Blocking finding 2 — B1's exhaustive verifier universe is future-candidate selected

**Cause.** The interface freezes event names but does not freeze the owner-private port operations,
their atomicity, the port-operation-to-event mapping, the finite race gaps, or which events are
durable kill boundaries (`interfaces/product-truth-complexity-v7.md:141-185`). Nevertheless the
Design and B1 Work define exhaustiveness as “every port operation failure,” “every durable event”
and a manifest product derived from those future sets
(`design.md:652-667`; `work/direct-first-public-b1.md:255-267,294-298`). The current event list also
has no distinct authority for source read/hash, no-follow open, copy/database close, exact removal/
absence verification or read-only/no-create SQLite open; a future implementation may group them
under `validate`/`cleanup-complete`, split them arbitrarily or omit them without contradicting any
frozen port schema. The future B1 generator therefore authors the dimensions against which its own
case bijection is judged.

**Concrete consequence.** A candidate can put several raw operations behind one coarse real-adapter
call, omit a failure-capable operation from the injected port, mark a durability-changing event as
non-durable, or leave a race gap out of the candidate-owned list. Its generator and executed cases
still form a perfect bijection and every declared fault/race/kill case passes, while cleanup,
refusal, lock release or crash convergence remains untested. Hidden mutation and source Review are
valuable backstops, but without a pre-B1 operation universe they cannot demonstrate the promised
exhaustive matrix; they can only make reviewer judgment reconstruct the missing authority after the
candidate exists.

**Affected decision.** The v7 calibration moved runtime assurance out of the meter only on the
condition that B1 ports/events and the full presence/fault/race/kill matrix were frozen,
candidate-independent and exhaustive. The present Design freezes event labels, not the proof
universe, so the trade is incomplete and B1 cannot yet be safely assigned even after a green v7
meter Review.

**Smallest remedy.** Before v7 implementation, add one Design-owned machine block that, per
`b1TracedOwner`, enumerates the exact injected port operations and result/error contract, maps each
operation to allowed trace stages/resource roles, identifies all failure sites, observation-to-use
race barriers and durability/kill boundaries, and defines any deliberately atomic adapter operation.
Derive the B1 manifest from that frozen block plus the existing fixture-state identities; B1 code,
tests and config may not add, merge, omit or downgrade an operation/site. Extend hidden mutations
with one removed port operation, one coarsened port, one omitted race barrier and one downgraded
durable event.

**Why safe degradation is insufficient.** A partial matrix cannot safely degrade an irreversible
destructor: returning “unavailable” for one uncovered branch does not prove other omitted raw
operations fail closed, and a source Review after implementation cannot make candidate-authored
coverage exhaustive. The bounded alternative is to freeze the small owner-local port universe, not
to restore the rejected general semantic interpreter.

## Non-blocking checks and residual risk

No additional advisory is recorded. The following requested boundaries are otherwise coherent:

- the five Work fences remain byte-identical and future exact paths can materialize only inside the
  frozen membership;
- dependency manifest/lock bytes, package entry/source closure, B0 determinism and B1/C hard-fail
  routing are explicit;
- v7 does not smuggle runtime behavior proof into structural counts or sentinel presence;
- public capability shapes prohibit the named raw path/handle/batch/token/release/process surfaces;
  and
- B1 still requires all presence states, operation faults, races, process kills, hidden mutations
  and a same-SHA different-actor source Review. The second finding concerns the missing frozen
  authority for that matrix, not removal of those obligations.

No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.

## Required transition

Repair the v7 Design/interface/PRD/Work map with the two smallest authority blocks above, preserve
the five production fences and all destructive/protected boundaries, then run a fresh different-
actor QbD. The unchanged v7 scope may not proceed to implementation under accepted risk because both
findings affect the core non-gameability and runtime-verification route.

## Dispatch identity

- role: `qbd`
- actorId: `product_truth_complexity_v7_qbd`
- receipt: `3c6a699f8c594fee9aa6e4b34eeefbee`
- predecessor: `c0028b8a247e47d793570c33f7eeda5e`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v7.md`
- verdict: `FAIL`
