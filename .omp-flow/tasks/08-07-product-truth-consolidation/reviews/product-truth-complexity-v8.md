---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r10)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r10"
actor_id: "product_truth_complexity_v8_review_r10"
dispatch_receipt: "126f2c689b774f67a10378c71fdabc07"
predecessor_receipt: "46b904b6b9914b8c81b47ef384269931"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "a94919c58385abb8a0d674408a63dca5c5f9a69a"
reviewed_handoff_commit: "6b8319aa38d3d33c431edebbf9de8c57fc41b7ee"
reviewed_parent: "7df1e2cd8a78a903df680dda437538d1528c38ce"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "90efcde430cdcdbc161e89127bdc60adc258ecb6dca6a3f455db27f119f92e83"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r10)

## Verdict

`FAIL` / changes requested for immutable r10 candidate
`a94919c58385abb8a0d674408a63dca5c5f9a69a`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and immutable r10 candidate, and implementer `product_truth_complexity_v8_impl_r10`
differs from reviewer `product_truth_complexity_v8_review_r10`. Candidate scope, v1-v7
immutability, five Work fences, v8 authority, official evidence tuple, deterministic B0, authored
100-case suite, v7 regressions, typecheck and syntax check all reproduce.

R10 closes the exact direct-global wrapper and conditional cases reported in r9. One material gap
remains at the composition boundary between the existing lexical global-alias grammar and the new
assignment-RHS classifier: a candidate may first alias a frozen global raw root or terminal, then
assign that alias through a wrapper or conditional to a second binding. The second binding is not
classified raw, so an undeclared private helper may use it without rejection. No implementation,
handoff, meter, Product or user-state file was repaired in this review.

## Findings

### P0 — assignment RHS classification runs before and cannot consume lexical global aliases

`rawIdentityForAssignmentAtom` at
`scripts/product-truth/measure-complexity-v8.mjs:1658-1706` recognizes imported declaration
identities, direct CommonJS syntax and direct frozen global syntax. Its assignment propagation loop
runs before `scopedAliases` is constructed at `:1902-2058`. Consequently, an identifier such as
`storageAlias` or `ambientAlias`, or a member rooted at that identifier, is absent from
`bindingIdentityByDeclaration`, cannot normalize through `normalizedGlobal`, and is reported by
`assignmentExpressionContainsRaw` as raw-free. The later scoped-alias pass can classify a direct
call of the original alias, but it does not revisit the missed second binding.

Five fresh candidate-new variants unexpectedly exited 0 with exact outside comparison:

```text
const storageAlias = localStorage;
raw = storageAlias.getItem as typeof storageAlias.getItem;

raw = flag ? storageAlias.getItem : storageAlias.getItem;

const ambientAlias = eval;
raw = ambientAlias as typeof ambientAlias;

// The same storageAlias declaration inside classifyLegacyDatabase also passes.

const storageRead = localStorage.getItem;
raw = storageRead as typeof storageRead;
```

In every negative, the assignment is under exact allowed `classifyLegacyDatabase`, while
`raw(...)` occurs under undeclared named `hiddenHelper`. As an adjacent control,
`storageRead("forbidden")` directly inside the same private helper fails with
`TRACED_OWNER_IDENTITY_INVALID`; this proves the existing scoped-alias grammar recognizes that raw
terminal and isolates the escape to alias-to-assignment propagation. A same-shape locally shadowed
`localStorage` alias remains a valid exit-0 positive.

This violates the interface's requirement that module/local raw aliases resolve lexically and
every terminal use be classified at its use owner, with unresolved escape failing closed
(`interfaces/product-truth-complexity-v8.md:194,218,294-298`). Feeding the already-bounded lexical
alias identity into assignment atom/subtree classification is structural syntax resolution only;
this finding requires no CFG, SSA, points-to, branch/order or runtime-value analysis.

## Independent verification

### Assignment, immutable scope and authority

- Review operation `126f2c689b774f67a10378c71fdabc07` is active with role `check`, this exact
  Work/output and actor `product_truth_complexity_v8_review_r10`. Predecessor operation
  `46b904b6b9914b8c81b47ef384269931` is completed with role `implement`, actor
  `product_truth_complexity_v8_impl_r10`, and the required linked handoff. The actors differ.
- Candidate `a94919c...` has parent `7df1e2c...` and exactly eight allowed changed paths: the v8
  meter and focused test plus six bounded fixture additions. No config, Product, dependency,
  direct-tool, Work/Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check 7df1e2c... a94919c...` — PASS. Candidate instruments are blob-identical at
  handoff commit `6b8319a...`; that commit adds only the linked handoff.
- Candidate SHA-256 values reproduce the handoff: script
  `22145c2642db7ae42b2ae4f7305669c8b90994a6a9ca2d3a7fd3837e9f936b58`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `aecd3f2f4c0a81328249763c32ee406db353ec04b93174ddd2db6a1a2facfdbc`; the sorted 83-fixture
  manifest is `26c5e3a26ac3f565dce544c94308ed2d15e56d939bee50b4980df08e250d3d30`.
- Every v1-v7 instrument/config/test byte remains immutable. The report reproduces the five Work
  fences (`0e1551...faae`, `c85e1d...6de5`, `dec2ee...ca4`, `2f3a86...5a36`,
  `124e32...79d9`) and v8 predecessor authority `578d98...6d29`. The explicit forbidden-token
  scan finds no CFG/ICFG, SSA, points-to, scheduler or semantic-verdict engine.

### Official report and authored gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `36d11c38dacde7f268ff5492e82304155d61f1dd80bbf88138651da4f2d6442f`; decoded JCS SHA-256
  `90efcde430cdcdbc161e89127bdc60adc258ecb6dca6a3f455db27f119f92e83`.
  The handoff has exactly one complete machine block and it is byte-identical to both fresh reports.
- Exact argv/cardinality/fallback/identity-claim fields and the ten-field tuple match the trust-root
  Decision. B0 remains 812 ingress / 107 paths and 712 owner violations / 93 paths with accepted
  ingress digest `d1b60f...2d3a` and violation digest `a3f100...e43`. Duplicate official evidence,
  environment fallback and the internally consistent alternative SHA independently fail before
  measurement with their expected official-input/evidence diagnostics.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  100/100 in 435.96s after reviewer fixtures were removed.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 131.71s.
- `bun run --cwd scripts typecheck` and
  `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r10-review.VI8ZDL/repo`; no worktree was
created.

- The 100-case authored suite retains all 94 r9 cases, thereby reproducing the r1-r9 regression
  surface. Direct r9 `localStorage`, `eval` and `Function` wrapper/conditional negatives now fail;
  their exact lexical-shadow positives pass.
- An independent representative matrix reproduced repeated/scoped aliases, namespace binding,
  nested wrapper/conditional raw subtrees, unsupported arrays, nested-wrapper move witnesses,
  outside measurement drift and nontraced reorder as failures. Import shadow, raw-free conditional,
  unrelated lifecycle composition, value-different materialization and the sole Product move pass.
- The five lexical-global-alias-to-assignment negatives above are unexpected PASS outcomes. The
  direct terminal-alias private-helper control fails and the harmless shadow control passes. No
  unexpected false rejection was observed.
- Authored coverage additionally exercises declaration order/scope, single/multiple/compound/update
  writes, predecessor-occurrence cardinality, unified binding patterns, official input and evidence
  tuple/blob/report/ancestry drift, lifecycle, outside equality/import/raw and the no-CFG boundary.

This review does not demand or claim runtime semantics or selector/reviewer/human identity
authentication. No real `~/.omnimind`, credential, provider, network or user-state resource was
read or changed.

## Review boundary and required return

This verdict covers only candidate `a94919c58385abb8a0d674408a63dca5c5f9a69a`, handoff commit
`6b8319aa38d3d33c431edebbf9de8c57fc41b7ee`, assigned Work and accepted authority. It does not
authorize B1 or Product/destructive work.

No substantive fix is approved. Return the candidate to the v8 measurement Work to compose the
existing declaration-scoped global alias grammar with assignment RHS atom/subtree classification,
add alias-to-assignment private-helper negatives and harmless-shadow/direct-use controls, freeze a
new immutable candidate, and obtain a new different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r10`
- receipt: `126f2c689b774f67a10378c71fdabc07`
- predecessor: `46b904b6b9914b8c81b47ef384269931`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
