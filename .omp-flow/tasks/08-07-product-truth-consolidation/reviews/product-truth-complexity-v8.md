---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r11)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r11"
actor_id: "product_truth_complexity_v8_review_r11"
dispatch_receipt: "93ef617867c841d89beb62c949f48519"
predecessor_receipt: "2d60e32403754f37a0f2e78058f27807"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "89bc90138277aa6673a4ca57f4219c979268346d"
reviewed_handoff_commit: "beb5a9649e5ddcd340f5d9052c720a76031518db"
reviewed_parent: "084c3308f18f4eb8b57a8909c329cc072542c7d4"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "6bbe6ab6fb0b5c5748042f2b8c08174d7ee9d82fab44bbdd09d401c40964cb72"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r11)

## Verdict

`FAIL` / changes requested for immutable r11 candidate
`89bc90138277aa6673a4ca57f4219c979268346d`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and immutable r11 candidate, and implementer `product_truth_complexity_v8_impl_r11`
differs from reviewer `product_truth_complexity_v8_review_r11`. Candidate scope, v1-v7
immutability, five Work fences, v8 authority, official evidence tuple, deterministic B0, authored
107-case suite, v7 regressions, typecheck and syntax check all reproduce.

R11 closes the exact unwrapped scoped-alias-to-assignment cases reported in r10. One material gap
remains one hop earlier: the scoped-alias fixed point does not apply the finite wrapper/conditional
normalization to an alias declaration's initializer. A raw global root or terminal hidden behind
`as`, `satisfies`, non-null/type-assertion nesting, or a same-identity conditional therefore never
becomes a scoped raw alias. Its later assignment or direct terminal use under an undeclared private
helper is invisible. No implementation, handoff, meter, Product or user-state file was repaired in
this review.

## Findings

### P0 — wrapped and conditional global alias declarations bypass scoped raw identity

`identityForExpression` at `scripts/product-truth/measure-complexity-v8.mjs:1973-1992` unwraps only
`ParenthesizedExpression` before the scoped-alias fixed point consumes declaration initializers at
`:2051-2082`. It does not use the existing `isFiniteTransparentExpressionWrapper` closure
(`:31-34`) and does not classify same-identity conditional initializers. When that function returns
null, the declaration is absent from `scopedAliases`; r11's later
`assignmentScopedIdentityForExpression` bridge and `propagateRawAssignments()` therefore have no
identity to propagate. The ordinary use visitor also does not treat a bare global member inside a
type-only wrapper as a call/new ingress, so a direct private-helper use of the missed alias is not a
fallback rejection.

Six fresh candidate-new variants unexpectedly exited 0 with exact outside comparison:

```text
const storageAlias = (localStorage as typeof localStorage)!;
raw = storageAlias.getItem as typeof storageAlias.getItem;

const storageRead = (localStorage.getItem satisfies typeof localStorage.getItem)!;
raw = storageRead as typeof storageRead;

const storageRead = flag ? localStorage.getItem : localStorage.getItem;
raw = storageRead as typeof storageRead;

const storageRead = localStorage.getItem as typeof localStorage.getItem;
function hiddenHelper() { return storageRead("forbidden"); }

const ambientAlias = eval as typeof eval;
raw = ambientAlias as typeof ambientAlias;

const root = localStorage;
const storageRead = (root.getItem as typeof root.getItem)!;
raw = storageRead as typeof storageRead;
```

For the assignment variants, the final assignment is under exact allowed
`classifyLegacyDatabase`, while `raw(...)` occurs under undeclared named `hiddenHelper`. The direct
variant calls the wrapped terminal alias itself under that helper. As adjacent controls, an
otherwise identical locally shadowed `localStorage` case exits 0, while a parentheses-only terminal
alias reaches `TRACED_OWNER_IDENTITY_INVALID`. This isolates the false acceptance to missing
finite-wrapper/conditional alias-declaration normalization rather than lexical shadowing or the
r11 assignment bridge.

The result violates the Work's requirement to preserve the complete lexical alias-use grammar and
the interface rule that every module/local raw alias terminal use is classified at its lexical use
owner, with unresolved escape failing closed
(`interfaces/product-truth-complexity-v8.md:194,218,294-298`). Applying the same bounded wrapper and
canonical-equal conditional grammar to alias declaration initializers remains syntax/declaration
resolution only; the finding requires no CFG, SSA, points-to, branch order or runtime-value claim.

## Independent verification

### Assignment, immutable scope and authority

- Review operation `93ef617867c841d89beb62c949f48519` has role `check`, this exact Work/output
  and actor `product_truth_complexity_v8_review_r11`. Completed predecessor operation
  `2d60e32403754f37a0f2e78058f27807` has role `implement`, actor
  `product_truth_complexity_v8_impl_r11`, and the required linked handoff. The actors differ.
- Candidate `89bc901...` has parent `084c330...` and exactly nine allowed changed paths: the v8
  meter and focused test plus seven bounded fixture additions. No config, Product, dependency,
  direct-tool, Work/Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check 084c330... 89bc901...` — PASS. Candidate instruments are blob-identical at
  handoff commit `beb5a96...`; that commit adds only the linked handoff.
- Candidate SHA-256 values reproduce the handoff: script
  `13c3805ba05058c7e46bb5c73c51f643c6bb78f730b18092e5d663055c7083ec`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `0ac4f654895fd70e18f8d5f76ce77ad6e0ffdfefb9e7e87c0bb18afcf60a0512`; the sorted 90-fixture
  manifest is `43ef5f25c97ce729c75f31f9b6628c85d4e754b8dc4dfb5a50e808b180a1d61c`.
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
  `c1d4e816544f8abc270b185d8999fc9f6ba6d3c88085658b095b82ce42746659`; decoded JCS SHA-256
  `6bbe6ab6fb0b5c5748042f2b8c08174d7ee9d82fab44bbdd09d401c40964cb72`.
  The handoff has exactly one complete machine block and it is byte-identical to both fresh reports.
- Exact argv/cardinality/fallback/identity-claim fields and the ten-field tuple match the trust-root
  Decision. B0 remains 812 ingress / 107 paths and 712 owner violations / 93 paths with accepted
  ingress digest `d1b60f...2d3a` and violation digest `a3f100...e43`. Duplicate official evidence,
  environment fallback and the internally consistent alternative SHA independently fail before
  measurement with their expected official-input/evidence diagnostics.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  107/107 in 476.06s after reviewer fixtures were removed.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 132.03s.
- `bun run --cwd scripts typecheck` and
  `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r11-review.toXqAk/repo`; no worktree was
created.

- The 107-case authored suite retains all 100 r10 cases, thereby reproducing the r1-r10 regression
  surface. R10's module/function-local root aliases, terminal alias, ambient alias and same-identity
  conditional now reach the private-helper gate; scoped shadow and allowed direct-use controls pass.
- Authored coverage also retains declaration order/scope, single/multiple/compound/update writes,
  unsupported raw subtrees, predecessor-occurrence cardinality, unified binding patterns,
  lifecycle/move witnesses, evidence tuple/blob/report/ancestry drift, outside equality/import/raw
  and the no-CFG boundary.
- The six wrapped/conditional alias-declaration negatives above are unexpected PASS outcomes. The
  parentheses-only raw control fails and the harmless shadow control passes. No unexpected false
  rejection was observed.

This review does not demand or claim runtime semantics or selector/reviewer/human identity
authentication. No real `~/.omnimind`, credential, provider, network or user-state resource was
read or changed.

## Review boundary and required return

This verdict covers only candidate `89bc90138277aa6673a4ca57f4219c979268346d`, handoff commit
`beb5a9649e5ddcd340f5d9052c720a76031518db`, assigned Work and accepted authority. It does not
authorize B1 or Product/destructive work.

No substantive fix is approved. Return the candidate to the v8 measurement Work to normalize raw
global alias declaration initializers through the same finite wrapper and same-identity conditional
closure, add private-helper/direct-use and harmless-shadow/parentheses controls, freeze a new
immutable candidate, and obtain a new different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r11`
- receipt: `93ef617867c841d89beb62c949f48519`
- predecessor: `2d60e32403754f37a0f2e78058f27807`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
