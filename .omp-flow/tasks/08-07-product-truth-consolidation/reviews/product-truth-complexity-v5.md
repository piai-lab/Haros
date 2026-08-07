---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v5 meter"
work: "../work/product-truth-complexity-v5.md"
handoff: "../handoffs/product-truth-complexity-v5.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v5-r1"
actor_id: "product_truth_meter_v5_review"
dispatch_receipt: "556d1bc2e4f441e184283cab99075713"
predecessor_receipt: "c226415c8c7a495ca561fab45d759fdf"
predecessor_output: "../handoffs/product-truth-complexity-v5.md"
reviewed_candidate: "82440682cdaf6099bf67b38d6ca4d366115f268e"
reviewed_parent: "9de81b30efaf56b722c6010b8bce236bce8c37cf"
accepted_design: "9d065923b8bd6a8d3748e1439d661ed217e36c5a"
---

# Review: Authoritative Product-truth complexity v5 meter

## Verdict

`FAIL` / changes requested for immutable meter candidate
`82440682cdaf6099bf67b38d6ca4d366115f268e`.

The predecessor handoff matches the assigned Work and receipt, binds the accepted Design and names
the immutable meter candidate. Reviewer actor `product_truth_meter_v5_review` is different from
implementer actor `product_truth_meter_v5`. The candidate is mechanically well formed: all 107
authored tests pass, B0 is byte-deterministic, scripts typecheck, the commit contains exactly 108
allowed additions, and v1-v4 instrument bytes remain immutable.

The semantic Review nevertheless produced **eight unexpected successful reports**. Four bypass the
classifier-copy proof, two bypass scheduled-release handling, one collapses a potentially repeated
lock acquisition to one token, and one converts the required typed reset into a normal return. Each
counterexample was derived from an authored positive by one bounded semantic change; adjacent
positive controls remained accepted. These failures permit the meter to certify precisely the
unsafe states that v5 is supposed to exclude, so no B1 receipt, destructive execution or Product
implementation is authorized by this Review.

No repair was made. V5 is immutable rejected evidence; correction requires a new meter version,
candidate, B0 handoff and different-actor Review.

## Findings

### P0 — classifier origin and copy validation are inferred from names and token presence

**Cause.** The analyzer verifies that the entry's three named locals directly call the three named
helpers (`measure-complexity-v5.mjs:2563-2583`), then checks the scratch creator and copier with
regular expressions and a list of identifier tokens (`:2608-2615`). It does not derive helper
return provenance, prove fresh allocation on each invocation, or place the identity/hash/manifest
comparisons on a reachable path that dominates the returned copy and SQLite open.

**Consequence.** Three independent hidden candidates exited `0` and retained the exact classifier
flow digest:

- the scratch creator cached and reused a module-level root after an initial private allocation;
- the copier returned a phi of the private copy path and the retired source path;
- the copier returned the copy path before all identity, byte-count, hash and repeated-manifest
  checks, leaving the checks unreachable.

The first violates invocation-owned freshness; the second permits source-in-place open through the
approved local; the third certifies validations that never execute. The report's `exact` status and
derived digest therefore do not establish the accepted classifier authority.

**Smallest repair.** Analyze the six exact helper declarations with the same bounded ICFG and
resolved dataflow used for capability proof. Require every scratch return to be the current
invocation's exclusive allocation, every copier return to be the strict descendant copy only, and
all conjunctive identity/hash/manifest checks to be reachable and to dominate both helper return and
SQLite open. Any merged return, cached allocation, unsupported helper edge or post-return check must
fail closed.

### P0 — classifier cleanup does not prove all-completion removal and absence

**Cause.** Cleanup analysis selects a `finally` containing the remover, collects remover/absence
calls, compares their source positions, and rejects only conditional or nested-function ancestors
(`measure-complexity-v5.mjs:2626-2657`). It does not propagate exceptions from cleanup calls through
`try`/`catch`, nor classify the completion that follows cleanup failure.

**Consequence.** A hidden candidate wrapped remove plus absence assertion in `try` and converted any
cleanup failure to a normal return in `catch`. It exited `0` with the exact classifier flow digest.
The scratch tree may therefore remain while the classifier reports a valid safe disposition—the
explicitly forbidden swallowed-cleanup path.

**Smallest repair.** Put database close, link-safe removal and exact absence assertion in the helper
completion graph. On every normal, return, throw, catch and finally completion after scratch
acquisition, require the ordered close → remove → absence path. Model throws from each cleanup call;
no catch, return or finally override may turn cleanup failure into a valid completion. A nested
unconditional cleanup block should remain accepted.

### P0 — Promise continuations can release the lock without poisoning later sinks

**Cause.** Detached-body discovery depends on resolving the immediate callback parent to one of a
small terminal-name list and resolving a release call directly to the authority declaration
(`measure-complexity-v5.mjs:3141-3179`). CFG poisoning repeats that terminal-name test and depends on
the previously populated detached-release list (`:3376-3381`). Promise/thenable scheduling and
callback alias flow are therefore not established by the actual call/return graph.

**Consequence.** Two hidden Product candidates scheduled a release in an unjoined Promise
continuation, awaited an unrelated continuation and then opened current Product state. One called
the release declaration directly; the other called it through a captured object property. Both
exited `0` and certified the later sink as held. This is a real release-capable predecessor, not a
cosmetic alias variation.

**Smallest repair.** Recognize Promise continuations by resolved library/protocol semantics rather
than terminal spelling, link callback capture/parameter/property aliases to the linear token, and
require an exact join proving callback completion before a later sink. Any unjoined or unresolved
release-capable continuation must set the token state to unknown. Preserve the ordinary no-schedule
positive.

### P0 — `do...while` has no back edge, so repeated acquisitions share one static token

**Cause.** The bounded executor evaluates a `do` body once and then evaluates its condition, but it
never feeds a true/unknown successor back into the body (`measure-complexity-v5.mjs:3448-3452`). The
one static acquire call therefore produces one static token even when runtime execution can acquire
again.

**Consequence.** A hidden Product candidate acquired the same binding inside a `do...while` with a
nonconstant continuation and used the resulting handle at a later sink. It exited `0`; the adjacent
`do...while(false)` exact-once control also passed. On a repeated iteration the acquisition event and
token are new, so the accepted report violates the required loop-carried same-token invariant.

**Smallest repair.** Add real loop back edges and a bounded fixed point for `do`, `while`, `for` and
`for...of`. Each reachable acquisition iteration must create a distinct abstract event. Accept the
join only when exact reachability proves one acquisition; otherwise a repeated/unsupported
acquisition must fail `OWNER_LOCK_FLOW_UNKNOWN`.

### P0 — a `finally` return may replace the typed reset with normal completion

**Cause.** The executor does calculate finally replacement of prior completion
(`measure-complexity-v5.mjs:3454-3470`), but refusal failure is driven by present-reachable sinks
(`:3486-3494`) plus later source-position guard checks (`:3535-3644`). It does not require each
legacy-present completion itself to retain the exact typed reset.

**Consequence.** A hidden Web candidate placed the exact reset guard in `try` and returned normally
from `finally`. It exited `0`; an adjacent empty-finally control also passed. The legacy-present path
therefore reaches a normal owner exit with the reset replaced, contrary to the interface even though
it reaches no current-generation sink.

**Smallest repair.** Give every present-run completion a disposition and require all reachable
legacy-present completions to end in the configured typed reset after catch/finally processing.
Normal return/exit, replacement throw or swallowed reset must fail independently of sink
reachability. Keep empty/non-overriding finally paths valid.

## Independent checks

The hidden review ran in a disposable clone fixed at the reviewed candidate. It also checked two
cross-category persistence flows—direct-tool handle returned to production and production handle
returned to direct-tool—and both correctly failed `PRODUCT_DATABASE_PROVENANCE_INVALID`. This
confirms that the FAIL is not based on the already repaired production/direct-tool membership gap.

Positive controls were run beside the hidden negatives: unconditional cleanup in a nested block,
an exact-once `do...while(false)` acquisition and a reset guard under an empty `finally` all exited
`0`. The unexpected passes therefore cannot be explained as a blanket rejection/acceptance of those
syntax families.

## Mechanical verification

- `bun x vitest run product-truth/measure-complexity-v5.test.ts --maxConcurrency=4` from `scripts`
  — PASS, 1 file / 107 tests in 168.88 s. The eight hidden successes show the matrix is incomplete.
- Two runs of `node scripts/product-truth/measure-complexity-v5.mjs --ref 7582170a...` plus byte
  comparison — PASS; 1,187,795 bytes, SHA-256
  `962a629c448d2b3e1b741f9447cdee1b0de83ed7a8267d7d582689800c6ffbbe`.
- `bun run --cwd scripts typecheck` — PASS.
- Candidate script/config/test SHA-256 reproduce the handoff: `d71bbd7a...`, `e6839d02...`,
  `01b697bf...`. The focused test independently verifies all v1-v4 instrument hashes.
- Candidate scope — PASS mechanically: parent `9de81b30...`, exactly 108 additions, zero
  modification/deletion, every path under the Work's four allowed v5 outputs.
- `git diff --check 82440682^ 82440682` — PASS.
- Shared repository was clean before this Review file. Hidden fixtures and reports remained only in
  the disposable `/tmp` clone. No real `~/.omnimind`, user state, runtime, provider or network
  resource was read or changed.

## Required return

Return the Work to implementation and replace the five unsound proof shortcuts above with one
bounded, completion-aware helper/runtime ICFG: resolved return provenance and dominating classifier
checks, all-completion cleanup, joined scheduling semantics, loop fixed points with dynamic acquire
events, and typed-reset completion disposition. Add all eight unexpected passes plus their adjacent
positive controls to the next version's independent matrix. Freeze a new meter candidate and repeat
deterministic B0 plus different-actor Review; do not edit or relabel v5.

## Dispatch identity

- role: `reviewer`
- actorId: `product_truth_meter_v5_review`
- receipt: `556d1bc2e4f441e184283cab99075713`
- predecessor: `c226415c8c7a495ca561fab45d759fdf`
- predecessor output: `../handoffs/product-truth-complexity-v5.md`
- verdict: `FAIL`
- explicitly allowed fix: none
