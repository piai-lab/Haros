---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r9)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r9"
actor_id: "product_truth_complexity_v8_review_r9"
dispatch_receipt: "47fa4a13b0524e428d6430401566e30b"
predecessor_receipt: "f93ac87a242747d6989faa53faa3db82"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "5796ea8906b3b5f2d3cf45de9638f7b5f1696cea"
reviewed_handoff_commit: "a722fdf71a043e097244f0f0247b24009dc4a754"
reviewed_parent: "88bc86ddc7a21ec34748ac862ccb9dadfedb457a"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "650254812966e0468c43b2dd88d39e183273485c3f657d0c8445164f9a678756"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r9)

## Verdict

`FAIL` / changes requested for immutable r9 candidate
`5796ea8906b3b5f2d3cf45de9638f7b5f1696cea`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and r9 candidate, and implementer `product_truth_complexity_v8_impl_r9` differs from
reviewer `product_truth_complexity_v8_review_r9`. Candidate scope, v1-v7 immutability, five Work
fences, v8 authority, official evidence tuple, deterministic B0, authored 94-case suite, v7
regressions and typecheck reproduce.

R9 closes the four exact r8 imported-binding RHS examples. Finite wrappers, same-identity
conditionals, mixed/unknown/raw-free branches and predecessor-occurrence controls reach their
authored outcomes. One material gap remains: the new raw-subtree classifier recognizes declaration-
resolved and CommonJS raw syntax but omits the frozen global raw grammar. Wrapped or conditional
global terminals can therefore seed an alias used by an undeclared private helper. No
implementation, handoff, meter, Product or user-state file was repaired in this review.

## Findings

### P0 — assignment raw-subtree detection omits global terminals and ambient loaders

`rawIdentityForAssignmentAtom` at
`scripts/product-truth/measure-complexity-v8.mjs:1658-1683` (candidate source; immediately after the
new assignment occurrence matcher) resolves `resolvedBindingAt` identities and direct CommonJS
forms only. `assignmentExpressionContainsRaw` and conditional classification are entirely based on
that atom resolver. They do not call the existing `normalizedGlobal`/`classifyGlobal` grammar used
later for `localStorage`, `process`, `eval`, `Function` and other frozen global raw forms.

Three fresh candidate-new variants unexpectedly exited 0 with exact outside comparison:

```text
raw = localStorage.getItem as typeof localStorage.getItem;
raw = true ? localStorage.getItem : localStorage.getItem;
raw = eval as typeof eval;
```

Each assignment occurs under exact allowed `classifyLegacyDatabase`, while `raw(...)` occurs under
undeclared named `hiddenHelper`. The global raw atoms are neither propagated nor reported as an
unsupported raw-containing RHS, so the private use is invisible. A same-shape parameter shadow for
`localStorage` exits 0, confirming that a lexical shadow can remain harmless without accepting the
true globals.

This violates the Work's requirement to preserve the complete v7 global/alias/raw grammar and the
interface rule that unresolved module/local raw aliases fail closed
(`interfaces/product-truth-complexity-v8.md:194,294-298`). Reusing the existing finite global
normalizer in the atom/subtree classifier, while honoring lexical shadowing, is structural syntax
analysis only. It requires no CFG, SSA, points-to or runtime semantics.

## Independent verification

### Assignment, immutable scope and authority

- Review operation `47fa4a13b0524e428d6430401566e30b` is active with role `check`, this exact
  Work/output and actor `product_truth_complexity_v8_review_r9`. Predecessor operation
  `f93ac87a242747d6989faa53faa3db82` is completed with role `implement`, actor
  `product_truth_complexity_v8_impl_r9`, and the required linked handoff. The actors differ.
- Candidate `5796ea8...` has parent `88bc86d...` and exactly twelve allowed changed paths: the v8
  meter and focused test plus ten bounded fixture additions. No config, Product, dependency,
  direct-tool, Work/Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check 88bc86d... 5796ea8...` — PASS. Candidate script/config/test/fixtures are
  unchanged at handoff commit `a722fdf...`.
- Candidate SHA-256 values reproduce the handoff: script
  `296c078c6c9281e1e52e71a05cf0b26df7849ab9dac65a303b3dcaff8a3aa31d`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `4d119a5570409492634f90d6431c90a3999abae3431a822016a61a1a5cf9fca4`; the sorted 77-fixture
  manifest is `ef125fb8...7db9`.
- Every v1-v7 instrument/config/test byte remains immutable. The report reproduces the five Work
  fences (`0e1551...faae`, `c85e1d...6de5`, `dec2ee...ca4`, `2f3a86...5a36`,
  `124e32...79d9`) and v8 predecessor authority `578d98...6d29`. Source inspection finds no CFG,
  ICFG, SSA, points-to, task/lifetime or runtime-verdict engine.

### Official report and authored gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `677a8585ea7adee90f649d6a94f5ea68681819c8a3fa952777bc7d75dc962783`; decoded JCS SHA-256
  `650254812966e0468c43b2dd88d39e183273485c3f657d0c8445164f9a678756`.
  The handoff has exactly one complete machine block and its decoded JCS equals both fresh reports.
- Exact argv/cardinality/fallback/identity-claim fields and the ten-field tuple match the trust-root
  Decision. B0 remains 812 ingress / 107 paths and 712 owner violations / 93 paths with accepted
  ingress digest `d1b60f...2d3a` and violation digest `a3f100...e43`.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  94/94 in 422.91s after reviewer fixtures were removed.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 139.28s.
- `bun run --cwd scripts typecheck` and
  `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r9-review.giA1FQ/repo`; no worktree was
created.

- R1-R8 authored negatives/positives retain their intended outcomes. The four imported-binding r8
  wrapper/conditional cases now fail; raw-free wrapper and conditional controls pass.
- Fresh global wrapper/conditional/eval cases produced the three unexpected PASS outcomes above;
  the global-name parameter shadow positive passed. No unexpected false rejection was observed.
- Independent controls confirmed outside measurement drift, nested wrapper move, nontraced reorder,
  tuple drift and alternative evidence fail; combined lifecycle passes.
- The 94-case suite additionally covers unified binding patterns, assignment declaration order and
  scopes, single/multiple/compound/update writes, mixed/unknown conditionals, predecessor occurrence
  cardinality, harmless old-site/raw-free cases, evidence ancestry/blob/actor/receipt drift,
  lifecycle, outside equality/import/raw and no-CFG boundaries.

This review does not demand or claim runtime semantics or selector/reviewer/human identity
authentication. No real `~/.omnimind`, credential, provider, network or user-state resource was
read or changed.

## Review boundary and required return

This verdict covers only candidate `5796ea8906b3b5f2d3cf45de9638f7b5f1696cea`, handoff commit
`a722fdf71a043e097244f0f0247b24009dc4a754`, assigned Work and accepted authority. It does not
authorize B1 or Product/destructive work.

No substantive fix is approved. Return the candidate to the v8 measurement Work to include the
frozen lexical global raw grammar in assignment atom/subtree classification, add wrapper/
conditional/private-helper and harmless-shadow controls, freeze a new immutable candidate, and
obtain a new different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r9`
- receipt: `47fa4a13b0524e428d6430401566e30b`
- predecessor: `f93ac87a242747d6989faa53faa3db82`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
