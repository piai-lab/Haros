---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r13)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r13"
actor_id: "product_truth_complexity_v8_review_r13"
dispatch_receipt: "8c8ab032e78a434ab2ec1bb9ad0c628c"
predecessor_receipt: "30507ea905ae4185b1fc4f675846e9af"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "299b4c9862033e1cb1ec105ed829d483292ed5ba"
reviewed_handoff_commit: "5a868361569541cf7270853fcd06ecc67775557c"
reviewed_parent: "47af3534dd8b23b4e91126689998d0e9d8a1f69c"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "60c1501cfc9bf25ca93303e90b1091ab5670dbe54f1fe415d2200af9aaa1912c"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r13)

## Verdict

`FAIL` / changes requested for immutable r13 candidate
`299b4c9862033e1cb1ec105ed829d483292ed5ba`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and immutable r13 candidate, and implementer `product_truth_complexity_v8_impl_r13`
differs from reviewer `product_truth_complexity_v8_review_r13`. Candidate scope, v1-v7
immutability, five Work fences, v8 authority, official evidence tuple, deterministic B0, authored
122-case suite, v7 regressions, typecheck and syntax check all reproduce.

R13 closes the exact nested-assignment atom bypass reported in r12. One material gap remains in the
shared global-atom fallback: a direct reserved global expression with a selector after an already
recognized terminal is accepted as that terminal identity. Candidate-new alias initializers and
assignment RHS values such as `Bun.file.call` and `Bun.file["call"]` can therefore pass rather than
hard-failing the frozen selector grammar. No implementation, handoff, meter, Product or user-state
file was repaired in this review.

## Findings

### P0 — global atom fallback discards selectors after a terminal

`rawIdentityForGlobalAssignmentAtom` at
`scripts/product-truth/measure-complexity-v8.mjs:1683-1700` calls `classifyGlobal(normalized)` and
returns the resulting identity without rejecting `normalized.error` or
`normalized.extraMemberCount > 0`. For `Bun.file.call`, normalization retains root `Bun`, terminal
member `file` and one extra member; `classifyGlobal` still returns the `filesystem` class for
`Bun#file`, so the extra selector is silently discarded.

The scoped alias path appears to guard this at `:1993-2003`, but `identityForExpressionAtom` falls
back to the unguarded helper at `:2012-2017` after that guard returns null. The assignment path uses
the same unguarded helper directly at `:1702-1747`. In contrast, the ordinary call/new visitor at
`:2313-2320` explicitly emits `GLOBAL_ALIAS_INVALID` for the same selector-after-terminal shape.
The two routes therefore disagree about one syntax authority.

Four candidate-new variants unexpectedly exited 0:

```text
const raw = Bun.file.call;

let raw;
raw = Bun.file["call"];

const raw = ((Bun.file.call as typeof Bun.file)!);

let raw;
raw = flag ? Bun.file.call : Bun.file.call;
```

The first and third exercise alias initialization and the finite wrapper closure; the second
exercises the explicit top-level assignment visitor; the fourth exercises canonical-equal
conditional branches. A fresh report for the first case has `exactOutsideEquality=true`, records
the use as `Bun#file` under allowed owner `classifyLegacyDatabase`, and reports no target violation.

Adjacent controls isolate the defect. Direct `Bun.file.call("fixture")` correctly fails with
`GLOBAL_ALIAS_INVALID`; deriving the same extra selector through a declaration-scoped root alias
fails with `RAW_ALIAS_WRITE_UNKNOWN`; a local parameter named `Bun` remains a harmless lexical
shadow and passes. Object, array, comma and call RHS subtrees containing `Bun.file`, nested property
assignment, update expression and top-level property-target variants all fail closed. The authored
direct `Bun.file` assignment positive remains accepted.

The v8 interface lists `unknown-selector-or-global-alias` as a global hard failure, and the Design
allows reserved globals only through the exact static selector vocabulary. This finding asks only
for consistent finite syntax normalization before identity admission. It requires no CFG, SSA,
order, reachability, value or runtime semantics.

## Independent verification

### Assignment, immutable scope and authority

- Review operation `8c8ab032e78a434ab2ec1bb9ad0c628c` has role `check`, this exact Work/output
  and actor `product_truth_complexity_v8_review_r13`. Completed predecessor operation
  `30507ea905ae4185b1fc4f675846e9af` has actor
  `product_truth_complexity_v8_impl_r13` and the required linked handoff. The actors differ.
- Candidate `299b4c9...` has parent `47af353...` and exactly eight allowed changed paths: the v8
  meter and focused test plus six bounded fixture additions. No config, Product, dependency,
  direct-tool, Work/Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check 47af353... 299b4c9...` — PASS. Handoff commit `5a86836...` has the candidate as
  its exact parent, changes only the linked handoff, and retains the candidate instrument blob.
- Candidate SHA-256 values reproduce the handoff: script
  `5e64e550df9d426e651b1aaebd66755fc95878b113c4707611ef819aa206d7e5`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `0396462e610ef56fc798f86f3b82bfb73eb93e59f78cbc522404608428d3f51d`; the sorted 105-fixture
  manifest is `30ee82cebc00319061a90c62f23761d13941a88ad5f7fcf0c777471379d6d868`.
- Every v1-v7 instrument/config/test byte remains immutable. The fresh report reproduces the five
  Work fences (`0e1551...faae`, `c85e1d...6de5`, `dec2ee...ca4`, `2f3a86...5a36a`,
  `124e32...79d9`) and v8 predecessor authority `578d98...6d29`. A focused source scan finds no
  CFG/ICFG, SSA, points-to, dataflow, scheduler or semantic-verdict engine.

### Official report and authored gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `e4efc018ece9e61177d659d8acd8301e08892c6f84764d8561547ce12d1701c8`; decoded JCS SHA-256
  `60c1501cfc9bf25ca93303e90b1091ab5670dbe54f1fe415d2200af9aaa1912c`.
  The handoff has exactly one complete machine block and it is byte-identical to both fresh reports.
- Exact argv/cardinality/fallback/identity-claim fields and the ten-field tuple match the trust-root
  Decision. B0 remains 812 ingress / 107 paths and 712 owner violations / 93 paths with accepted
  ingress digest `d1b60f...2d3a` and violation digest `a3f100...e43`. Authored gates retain missing,
  duplicate, malformed, abbreviated and nonexistent evidence, environment/override attempts,
  internally consistent alternative SHA, tuple/blob/report/actor/receipt/ancestry drift and later
  evidence mutation negatives.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  122/122 in 576.09s.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 138.07s.
- `bun run --cwd scripts typecheck` and
  `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r13-review.ejzHlw/repo`; no worktree was
created.

- The 122-case authored suite retains all 116 r12 cases, thereby reproducing the r1-r12 regression
  surface. R13's plain/wrapped alias initializer, nested assignment RHS and compound nested
  assignment cases now fail closed; its raw-free nested assignment and supported property atom
  controls pass.
- Authored coverage retains official input/evidence, qualified lexical owners, wrapper/conditional
  closures, declaration occurrence/cardinality/order, multiple/compound/update writes, unified
  binding patterns, predecessor occurrence matching, outside blob/import/raw/violation equality,
  lifecycle/deletion/materialization/move witnesses and the no-CFG boundary.
- Fresh object/array/comma/call, nested property assignment, update, property-target and scoped-root
  variants reached their intended fail-closed gates. The four direct-global selector-after-terminal
  forms above are unexpected PASS outcomes. The direct ordinary-use and lexical-shadow controls
  behave as expected. No unexpected false rejection was observed.

This review does not demand or claim runtime semantics or selector/reviewer/human identity
authentication. No real `~/.omnimind`, credential, provider, network or user-state resource was
read or changed.

## Review boundary and required return

This verdict covers only candidate `299b4c9862033e1cb1ec105ed829d483292ed5ba`, handoff commit
`5a868361569541cf7270853fcd06ecc67775557c`, assigned Work and accepted authority. It does not
authorize B1 or Product/destructive work.

No substantive fix is approved. Return the candidate to the v8 measurement Work so both scoped
alias and assignment atom resolution reject normalized global errors and terminal-following
selectors before classification/fallback, add direct/wrapped/conditional and lexical-shadow
controls, freeze a new immutable candidate, and obtain a new different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r13`
- receipt: `8c8ab032e78a434ab2ec1bb9ad0c628c`
- predecessor: `30507ea905ae4185b1fc4f675846e9af`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
