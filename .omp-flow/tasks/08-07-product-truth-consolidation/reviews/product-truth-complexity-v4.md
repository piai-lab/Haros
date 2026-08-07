---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v4 meter"
work: "../work/product-truth-complexity-v4.md"
handoff: "../handoffs/product-truth-complexity-v4.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v4-r1"
actor_id: "product_truth_meter_v4_review"
dispatch_receipt: "f975a58d3de146238d72cab2bdd85f61"
predecessor_receipt: "5e9c3d3ebce44c5bb6a159c7163c8c9e"
predecessor_output: "../handoffs/product-truth-complexity-v4.md"
reviewed_candidate: "70eb77da3512f5aa91b420302623bc91efa56f0b"
reviewed_parent: "defc7accd499ebc78ccc7df445f267f4ab18fd53"
accepted_design: "2d8fc8c9fcfff6fec33b433bbb449099bd8826dd"
---

# Review: Authoritative Product-truth complexity v4 meter

## Verdict

`FAIL` / changes requested for immutable meter candidate
`70eb77da3512f5aa91b420302623bc91efa56f0b`.

The predecessor handoff links to the assigned Work, identifies implementer actor
`product_truth_meter_v4` and receipt `5e9c3d3ebce44c5bb6a159c7163c8c9e`, and binds the accepted
Design plus immutable meter commit. Reviewer actor `product_truth_meter_v4_review` is different.
The implementation commit is correctly limited to 91 allowed v4 paths, all 90 authored tests pass,
the scripts typecheck passes, both B0 reports are byte-identical, the 125-entry inventory and strict
authority digests reproduce, and v1/v2/v3 bytes remain immutable.

Those mechanical results do not establish the Work's semantic claims. Independent hidden
counterexamples produced five unexpected successful reports: the candidate excludes an allowed
direct-rebuild path from persistence-capability analysis, and its refusal/lock proof substitutes
AST source order and token-name equality for the required interprocedural CFG and linear capability.
No B1 receipt, destructive execution or Product implementation is authorized by this Review.

No repair was made. The candidate is immutable, so correction requires a new meter version,
candidate, B0 handoff and different-actor Review.

## Findings

### P0 — the complete persistence-capability gate omits the Work-authorized direct rebuild tool

The v4 interface requires capability derivation over every frozen production member before Product
classification, and permits excluding the retired direct-tool lock only from ordinary-runtime lock
proof. The Work likewise requires a complete candidate-time primitive/opener/wrapper/receiver graph.
The implementation instead creates `productionText` by retaining only paths classified exactly as
`production` (`measure-complexity-v4.mjs:1317`), while the direct-rebuild root is classified
`direct-tool`. Every candidate capability scan then iterates this reduced collection
(`:2198`, `:2228`, `:2263`, `:2276`, `:2312`, `:2359`). The direct tool is counted as production
LOC and is inside frozen Work membership, but its database capabilities cannot enter Product sink,
unknown-capability or derived-consumer results.

An isolated fixture materialized the already-frozen exact path
`scripts/product-truth/direct-first-public.ts` with `node:sqlite#DatabaseSync`, a raw
`userdata/stores/product.sqlite` path and an `exec("DELETE ...")` receiver. The meter exited `0`.
Its Work report showed the file as materialized, covered and inside the 39-member direct-B1 set,
while both focused `productDatabaseSinks` and `unresolvedPersistenceCapabilities` were empty. Thus
the very B1 tool authorized to inspect/delete retired bytes can add an unclassified persistent
handle without the promised capability failure. Authority-first tests do not cover this because the
future exact member is allowed to materialize and the semantic analyzer silently drops its category.

### P0 — same-binding lock state is inferred from the last textual acquire, not every CFG predecessor

The interface says `held(binding, handle)` survives a join only if every predecessor holds the same
binding and the same acquired handle. The implementation records flat acquire/release arrays, chooses
the last textual acquire before a sink (`measure-complexity-v4.mjs:3126`) and compares releases only
by positions and variable names (`:3134-3145`). It has no CFG predecessor state or per-acquisition
token identity.

The hidden Product fixture replaced one acquire with two mutually exclusive branches, each acquiring
a fresh handle into the same variable `lock`, then joined before the post-lock guard and database
constructor. The meter exited `0` with `violations: []`; it reported two acquisitions at lines 16/18
but declared the constructor `held` under handle string `lock`. The two runtime handles are distinct,
so this is the exact forbidden H7 branch-phi witness.

A second hidden Product fixture scheduled
`queueMicrotask(() => releaseDatabaseLifecycleLock(lock))`, awaited a continuation and then opened
the database. It also exited `0`. Nested callback traversal returns early unless callback text
contains a current-path spelling (`:2853-2877`); a release-only callback is therefore invisible,
and the later sink is reported held. This is H8: scheduling is unresolved and must fail closed, but
the meter certifies a lock that can already be released.

### P0 — refusal dominance is source-position checking and accepts unreachable or swallowed guards

For each probe, `completeBefore` requires only an earlier decision position plus boolean flags
(`measure-complexity-v4.mjs:3110-3115`). Loop handling runs only when no decision was found and knows
only `while`/`do` (`:3073-3085`). Catch handling treats any `throw` token anywhere in the catch text
as proof that the reset was not swallowed (`:3055-3056`). Neither establishes the required
present-successor cut on every ICFG path.

Two independent Web fixtures were unexpectedly accepted:

- a complete v1/v2 typed reset guard inside `for (const never of [])`, followed by g1 read/write,
  exited `0` with no violation even though the guard executes zero times;
- the same guard inside `try`, followed by `catch (error) { if (false) throw error; }` and g1 I/O,
  also exited `0`; on legacy presence the typed reset is always swallowed and current I/O remains
  reachable.

The authored reversed-null, negated-exists and zero-iteration `while` fixtures do reject their exact
shapes, but these two semantically equivalent counterexamples demonstrate that the gate recognizes
selected syntax, not the Work's complete CFG/dominance property.

## Independent authority and inventory reconstruction

The accepted Design tree was read directly at
`2d8fc8c9fcfff6fec33b433bbb449099bd8826dd`, not from the candidate report. Independent extraction
and canonical hashing reproduced the strict blocks:

- database capability authority `adfe8f30c33747fb071328e1ce275975af5029d987b4260020e54202323dd85a`;
- owner-lock authority `858c1546f4b790a52b8ad14ab9498fa9589bfa8326b5d2c36978b278bfd070d4`.

The five normalized Work blocks reproduce production/measurement/dependency counts `44/1/1`,
`15/0/0`, `5/0/0`, `7/0/0` and `12/0/0`, their handoff digests, boundary digest
`9f49e4ba...`, 1,081-member digest `653f8954...`, and no overlap/uncovered member. Independent locked
package resolution and byte hashing reproduce source/JS/d.ts/package digests `da19c2b...`,
`d2e9cc0...`, `3c935cf...`, `eeac5072...`.

The configured inventory has 125 unique entries with the reported distribution: 2 primitives,
5 terminal invocations, 22 callables, 18 callable flows, 10 closure flows, 2 dynamic loaders and 66
receivers; canonical hashing reproduces `0a6e53f7...`. Direct accepted-tree inspection reproduced the
five ordinary-runtime/dependency primitive sites. The first finding above shows that this exact
Design-time inventory does not close candidate-time capability discovery for a future exact
`direct-tool` member, so digest integrity cannot rescue semantic completeness.

## Adversarial matrix

The required H1-H10 challenges were separated into authority-first production mutations and focused
semantic fixtures in an isolated clone:

| Case | Result |
| --- | --- |
| H1 custom Effect tag/layer/Promise/spread raw Product receiver | authored fixture rejects `PRODUCT_DATABASE_PROVENANCE_INVALID` |
| H2 computed dynamic namespace factory | rejects fail-closed as `CURRENT_GENERATION_IO_UNCLASSIFIED` |
| H3 approved spread followed by raw last write | authored fixture rejects `PRODUCT_DATABASE_PROVENANCE_INVALID` |
| H4 unapproved exact `:memory:` origin | hidden fixture rejects `PRODUCT_DATABASE_PROVENANCE_INVALID` |
| H5 canonical Service path through JSON stringify/parse | hidden fixture rejects `PRODUCT_DATABASE_PROVENANCE_INVALID` |
| H6 release/reacquire same path under new handle | authored fixture rejects `OWNER_LOCK_FLOW_UNKNOWN` |
| H7 branch phi, same binding/different acquired handles | **unexpected PASS**, zero violations |
| H8 detached microtask release before awaited sink | **unexpected PASS**, sink reported held |
| H9 nested Effect finalizer LIFO uncertainty | authored fixture rejects `OWNER_LOCK_FLOW_UNKNOWN` |
| H10 constructed but uninterpreted refusal Effect | authored fixture rejects `CONTROL_FLOW_UNKNOWN` |

Reversed-null Web and negated Product/Service truth fixtures reject as intended. The authored
zero-iteration `while` rejects, while the hidden zero-iteration `for` unexpectedly passes. The H2
diagnostic is not the interface's requested `PERSISTENCE_CAPABILITY_UNRESOLVED`, but it remains a
hard fail; it is not the basis of this FAIL verdict.

## Mechanical verification

- `git show --name-status 70eb77da...` — PASS scope: exactly 91 added v4 code paths (script,
  config, focused test and 88 fixtures), no production/dependency/direct-tool/history path.
- `git show --stat 18abb58e...` — predecessor handoff is a separate one-file documentation commit.
- `bun x vitest run product-truth/measure-complexity-v4.test.ts --maxConcurrency=4` from `scripts`
  — PASS, 1 file / 90 tests in 194.36 s. The hidden witnesses prove this matrix incomplete.
- `bun run --cwd scripts typecheck` — PASS.
- Two runs of `node scripts/product-truth/measure-complexity-v4.mjs --ref 7582170a...` plus
  `cmp -s` — PASS, byte-identical; 1,178,725 bytes, SHA-256 `fa5d8a01437ce5e3...`.
- Script/config/test SHA-256 reproduce the handoff: `40a37ed7...`, `a45907fa...`, `a9362a73...`.
- Historical byte checks reproduce v1 `cf5e096c...` / `2bcbf41a...`; v2 `4e64f425...` /
  `1c4864c...` / `c5d12cff...`; v3 `670f8a0e...` / `973d18b1...` / `78f022b9...`.
- `git diff --check 2d8fc8c9...70eb77da...` — PASS.
- Shared repository was clean before this Review file. Hidden fixtures existed only in a disposable
  `/tmp` clone. No real `~/.omnimind`, user state, runtime, dependency or provider resource was read
  or changed.

## Required return

Return capability analysis to implementation so every frozen Work production member, including the
separately reported direct-rebuild tool, participates in candidate-time primitive/opener/wrapper/
receiver discovery; keep its lock authority excluded only where the interface expressly excludes it.

Replace flat source-position refusal/lock checks with the bounded ICFG and linear state the Design
requires: unique acquire tokens, predecessor joins, async/callback scheduling as unknown, actual
present-successor reachability, loop reachability and catch/finally edges. Add the five unexpected
PASS witnesses above as independent negatives. Freeze the correction as a new meter candidate and
repeat deterministic B0 plus different-actor Review; do not edit or relabel v4.

## Dispatch identity

- role: `reviewer`
- actorId: `product_truth_meter_v4_review`
- receipt: `f975a58d3de146238d72cab2bdd85f61`
- predecessor: `5e9c3d3ebce44c5bb6a159c7163c8c9e`
- predecessor output: `../handoffs/product-truth-complexity-v4.md`
- verdict: `FAIL`
- explicitly allowed fix: none
