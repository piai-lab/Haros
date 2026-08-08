---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r12)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r12"
actor_id: "product_truth_complexity_v8_review_r12"
dispatch_receipt: "2c1c67b42ffb4c8e9af8ade3f98c3566"
predecessor_receipt: "ff59ca1809ad488c9883412c59ed561a"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "2b200e1a7efa4fc68aa60b48d109a7929132c7e7"
reviewed_handoff_commit: "5008c21498bf98bd8498648508e6599c38928124"
reviewed_parent: "d22a52b46e088de30d8b4b41a6a971d674d47c38"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "f42776e4aee4cf709aedce9028b68ead346b2bb86724c165f80fbd66f5410add"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r12)

## Verdict

`FAIL` / changes requested for immutable r12 candidate
`2b200e1a7efa4fc68aa60b48d109a7929132c7e7`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and immutable r12 candidate, and implementer `product_truth_complexity_v8_impl_r12`
differs from reviewer `product_truth_complexity_v8_review_r12`. Candidate scope, v1-v7
immutability, five Work fences, v8 authority, official evidence tuple, deterministic B0, authored
116-case suite, v7 regressions, typecheck and syntax check all reproduce.

R12 closes the exact wrapped and conditional alias-initializer cases reported in r11. One material
gap remains in the new shared expression helper: an identifier-left nested `=` expression is
accepted as an identity atom before the helper checks whether the expression belongs to the closed
wrapper/conditional grammar. Candidate-new alias initializers and assignment RHS values containing
that unsupported raw subtree can therefore pass instead of failing closed. No implementation,
handoff, meter, Product or user-state file was repaired in this review.

## Findings

### P0 — shared finite-expression atom admits forbidden nested assignment RHS

`finiteRawExpressionResult` at `scripts/product-truth/measure-complexity-v8.mjs:1761-1784` invokes
its supplied `identityForAtom` before restricting syntax to transparent wrappers or conditional
expressions. The scoped atom at `:2001-2005` explicitly treats any identifier-left binary `=` as
the identity of its RHS. After r11/r12 connect that scoped resolver back into assignment atoms at
`:1731-1747`, the entire nested assignment is returned as a valid raw identity. The later explicit
`nested-raw-assignment-rhs` rejection at `:1919-1924` is gated on `!extensionsEnabled` and is not
reached for these candidate-new occurrences because an identity was already found.

Three candidate-new raw variants unexpectedly exited 0 with exact outside comparison and no
violation:

```text
let intermediate;
export function classifyLegacyDatabase() {
  const fileRead = (intermediate = Bun.file);
  return fileRead("fixture");
}

const fileRead = ((intermediate = Bun.file) as typeof Bun.file)!;

let raw;
raw = (intermediate = Bun.file);
return raw("fixture");
```

The first two exercise alias initialization, including a nested finite wrapper; the third exercises
the candidate-new assignment RHS path. Fresh reports record the resulting `Bun#file` ingress under
the allowed `classifyLegacyDatabase` owner, retain `exactOutsideEquality=true`, and emit no
`RAW_ALIAS_WRITE_UNKNOWN`. An otherwise identical raw-free nested assignment exits 0, while a raw
nested assignment with a property target fails. Those controls isolate the false acceptance to the
identifier-left `=` shortcut rather than wrapper recursion or general subtree detection.

The handoff explicitly says nested assignment RHS and all otherwise unsupported raw-containing
alias initializers fail closed, and limits the finite grammar to transparent wrappers plus one
canonical-equal conditional (`handoffs/product-truth-complexity-v8.md:261-281,289-299`). Accepting
this additional side-effecting expression also exceeds the interface's structural-only,
declaration/write-cardinality boundary. Rejecting it requires only syntax-kind gating before atom
resolution; this finding asks for no CFG, SSA, order, reachability or runtime-value semantics.

## Independent verification

### Assignment, immutable scope and authority

- Review operation `2c1c67b42ffb4c8e9af8ade3f98c3566` has role `check`, this exact Work/output
  and actor `product_truth_complexity_v8_review_r12`. Completed predecessor operation
  `ff59ca1809ad488c9883412c59ed561a` has role `implement`, actor
  `product_truth_complexity_v8_impl_r12`, and the required linked handoff. The actors differ.
- Candidate `2b200e1...` has parent `d22a52b...` and exactly eleven allowed changed paths: the v8
  meter and focused test plus nine bounded fixture additions. No config, Product, dependency,
  direct-tool, Work/Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check d22a52b... 2b200e1...` — PASS. Candidate instruments are blob-identical at
  handoff commit `5008c21...`; that commit adds only the linked handoff.
- Candidate SHA-256 values reproduce the handoff: script
  `71a23d2f6c720d359c399fc1d5b3683760a8ea7c84c415b1806e932671bb6e4d`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `7f415a279f3074fda4f9c33ae675fc999d93b736a694f831af3547c1445b4e1c`; the sorted 99-fixture
  manifest is `dc74ef28b2cd5f2dcc37e2d931a4001cd4eb5cadfd01611bff3dfebcf63231b7`.
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
  `a89c2c622f9781c13f289bbd3210ef9e1e83d6df8c0ee946388d97be5ad80aa9`; decoded JCS SHA-256
  `f42776e4aee4cf709aedce9028b68ead346b2bb86724c165f80fbd66f5410add`.
  The handoff has exactly one complete machine block and it is byte-identical to both fresh reports.
- Exact argv/cardinality/fallback/identity-claim fields and the ten-field tuple match the trust-root
  Decision. B0 remains 812 ingress / 107 paths and 712 owner violations / 93 paths with accepted
  ingress digest `d1b60f...2d3a` and violation digest `a3f100...e43`. Duplicate official evidence,
  environment fallback and the internally consistent alternative SHA independently fail before
  measurement with their expected official-input/evidence diagnostics.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  116/116 in 537.33s after reviewer fixtures were removed.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 134.09s.
- `bun run --cwd scripts typecheck` and
  `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r12-review.Opnixw/repo`; no worktree was
created.

- The 116-case authored suite retains all 107 r11 cases, thereby reproducing the r1-r11 regression
  surface. Nested wrapped roots/terminals, canonical-equal conditionals, wrapped ambient aliases,
  direct wrapped use and multihop aliases now reach their intended gates; raw-free conditional and
  exact lexical-shadow controls pass, while value-different raw conditionals fail.
- Authored coverage retains declaration occurrence/cardinality/order, multiple/compound/update
  writes, other unsupported raw subtrees, predecessor occurrence matching, unified binding
  patterns, lifecycle/move witnesses, evidence tuple/blob/report/ancestry drift, outside
  equality/import/raw and the no-CFG boundary.
- The three identifier-left nested raw-assignment forms above are unexpected PASS outcomes. The
  property-target raw form fails and the raw-free form passes. No unexpected false rejection was
  observed.

This review does not demand or claim runtime semantics or selector/reviewer/human identity
authentication. No real `~/.omnimind`, credential, provider, network or user-state resource was
read or changed.

## Review boundary and required return

This verdict covers only candidate `2b200e1a7efa4fc68aa60b48d109a7929132c7e7`, handoff commit
`5008c21498bf98bd8498648508e6599c38928124`, assigned Work and accepted authority. It does not
authorize B1 or Product/destructive work.

No substantive fix is approved. Return the candidate to the v8 measurement Work to reject nested
assignment expressions before raw identity atom resolution in both alias-initializer and assignment
RHS paths, add raw/raw-free and identifier/property-target controls, freeze a new immutable
candidate, and obtain a new different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r12`
- receipt: `2c1c67b42ffb4c8e9af8ade3f98c3566`
- predecessor: `ff59ca1809ad488c9883412c59ed561a`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
