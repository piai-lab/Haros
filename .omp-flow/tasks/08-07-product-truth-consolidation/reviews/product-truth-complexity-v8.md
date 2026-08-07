---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r3)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r3"
actor_id: "product_truth_complexity_v8_review_r3"
dispatch_receipt: "22bd169bbcac46f98c7561b2467c67c6"
predecessor_receipt: "2198ec82eccb429eb0ca60b1be09760e"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "8cee02f09de917ba169770bebe8b348a32448807"
reviewed_handoff_commit: "6040677f01a1aa301952abedcad29b8c29eb2eca"
reviewed_parent: "0c23b4771a0aa5cf456f557061c7bbc5e959e17a"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "01edb3881a1b0a6186ffb12361d646bf3fb866043dac919187f31c786a2b7d25"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r3)

## Verdict

`FAIL` / changes requested for immutable r3 candidate
`8cee02f09de917ba169770bebe8b348a32448807`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and r3 candidate, and implementer `product_truth_complexity_v8_impl_r3` differs from
reviewer `product_truth_complexity_v8_review_r3`. Candidate scope, v1-v7 immutability, five Work
fences, v8 authority, official evidence tuple, deterministic B0, authored 58-case suite, v7
regressions and typecheck reproduce.

R3 closes the exact r2 examples: same-spelling aliases in two scopes are now independently bound,
the named private-helper use fails, and unrelated deletion/materialization can coexist. It also
retains the r1 measurement and import-shadow repairs. Two fresh structural variants nevertheless
expose one undeclared-move false negative and one lexical-export false rejection. No implementation,
handoff, meter, Product or user-state file was repaired in this review.

## Findings

### P0 — type-only wrappers evade the normalized structural move witness

R3 detects a deletion/materialization move when bytes are exact or when both files normalize to the
same bounded literal structure. `structuralLiteralValue` at
`scripts/product-truth/measure-complexity-v8.mjs:31-66` unwraps parentheses but does not unwrap
TypeScript's `AsExpression` or `SatisfiesExpression`. `normalizedStructuralLiteral` consequently
returns `null` for an exported const whose JSON-compatible literal is wrapped only by `as const` or
`satisfies`, and `moveWitness` at lines 2108-2124 treats the pair as unrelated.

Two independent temp fixtures deleted selected exact Work member
`scripts/release-update-policy.json` and materialized selected pre-frozen
`scripts/product-truth/cli.ts` with the same three-key literal and values, changing only property
order/export name plus one type-only wrapper:

```text
export const legacyReleaseUpdatePolicy = { ...same literal... } as const;
export const legacyReleaseUpdatePolicy = { ...same literal... } satisfies Record<string, string>;
```

Both official-shaped comparisons unexpectedly exited 0. The authored direct-literal form, with the
same value but no wrapper, correctly exits 1 as
`UNDECLARED_WORK_PATH_MOVE:...:normalized-literal-structure`; changing one literal value correctly
passes as an unrelated lifecycle pair.

This is a structural AST omission, not a request for value flow or runtime semantics. `as const` and
`satisfies` are finite type-only wrappers around the same literal node. A candidate can therefore
relocate the exact normalized artifact while bypassing the r3 witness with syntax that does not
alter the literal data. The Work requires undeclared moves to fail, so the current witness is not
closed over its own normalized-literal claim.

### P1 — a harmless exported declaration is rejected when an inner raw alias shares its spelling

R3 correctly stores raw alias identity per declaration node, but the raw-public-export check remains
module-wide by spelling. `bind` still inserts every raw binding— including function-local
aliases—into the global `bindings` map at lines 1381-1388. After exports are collected,
line 1686 reports `RAW_BINDING_EXPORTED` whenever `exportedNames` and `bindings` share a string,
without resolving the exported declaration's identity.

A fresh adjacent positive exported a harmless module-scope
`const raw = () => "safe"`, then declared a distinct block-local
`const raw = readFileSync` inside the authorized `classifyLegacyDatabase` owner and used that inner
alias there. The two declarations have different lexical identities; no raw binding is exported.
The comparison nevertheless falsely exited 1 with:

```text
RAW_EFFECT_INGRESS_INVALID:[{"code":"RAW_BINDING_EXPORTED","path":"scripts/product-truth/sqlite-classifier.ts","line":1,"detail":"raw"}]
```

Sibling-block raw aliases with the same spelling both pass inside the authorized owner, and the r3
private-helper negative fails, so terminal-use identity itself is repaired. The remaining name-only
export join violates the same per-declaration lexical rule and can reject a valid selected-Work
candidate.

## Independent verification

### Assignment, immutable scope and authority

- Runtime operation `2198ec82eccb429eb0ca60b1be09760e` is completed, role `implement`, actor
  `product_truth_complexity_v8_impl_r3`, and outputs the required linked handoff. This Review is
  role `check`, actor `product_truth_complexity_v8_review_r3`, receipt
  `22bd169bbcac46f98c7561b2467c67c6`, and names that completed predecessor.
- Candidate `8cee02f...` has parent `0c23b47...` and exactly five allowed changed paths: the v8 meter
  and focused test; modified `undeclared-zero-raw-path-move.json`; and added
  `combined-lifecycle-positive.json` plus `traced-repeated-alias-private-helper.json`. No config,
  Product, dependency, direct-tool, Work, Design/decision, Harness/schema, v1-v7 or user-state path
  changed.
- `git diff --check 8cee02f...^ 8cee02f...` — PASS. Candidate meter/config/test blobs at handoff
  commit `6040677...` equal the reviewed candidate blobs.
- Candidate SHA-256 values reproduce the handoff: script
  `dbb7ca43f7319c3dcfec913bdaac2687481167ca93878c7383c0e51feefe5956`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `a3ba73df3efc90082bcb7e075640d7122ad892c6fd609cef83c0e6d76dedf17e`; the 41-fixture manifest is
  `ff3fbb47...13e1`.
- Candidate scope and the authored immutable-byte assertions preserve every v1-v7
  instrument/config/test byte. The official report independently reproduces the five accepted
  Work-fence digests in authored order (`0e1551...faae`, `c85e1d...6de5`, `dec2ee...ca4`,
  `2f3a86...5a36a`, `124e32...79d9`) and v8 predecessor authority `578d98...6d29`.
- Source inspection and the focused no-semantic-engine assertion find no CFG/ICFG, SSA, points-to,
  branch/value, task, Effect, lifetime or runtime-verdict engine.

### Official report, handoff and authored gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Fresh outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `d02572a9bf16f4e16c1ecf4072b396752781cc73021af4eabf68f6aaf7dbd16e`; decoded JCS SHA-256
  `01edb3881a1b0a6186ffb12361d646bf3fb866043dac919187f31c786a2b7d25`.
  The handoff contains exactly one complete machine block, its decoded JCS equals both fresh reports,
  and frontmatter `report_sha256` matches.
- The report records the exact argv once, `fixtureMode=false`, `official=true`,
  `environmentFallbackUsed=false` and `identityAuthenticationClaimed=false`. Its ten-field tuple
  matches the trust-root Decision: Work id, B0 candidate, official evidence SHA, reviewed v7
  candidate, handoff/review blobs, predecessor report digest, distinct declared actors and receipt
  occupy the correct slots.
- The fresh report reproduces B0's 812 ingress / 107 paths and 712 owner violations / 93 paths with
  accepted ingress digest `d1b60f...2d3a` and violation digest `a3f100...e43`.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  58/58 in 206.62s.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 143.87s.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).

### Prior reproductions, adjacent controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r3-review.J76ojz/repo`; no additional
worktree was created.

- R1 controls: `outside-measurement-drift` exits 1 with
  `OUTSIDE_WORK_BLOB_DRIFT:scripts/check-source-closure.mjs`; `traced-import-shadow-positive` exits
  0. Outside raw drift and nontraced reorder also fail at their exact structural gates.
- R2 controls: `traced-repeated-alias-private-helper` exits 1 with
  `TRACED_OWNER_IDENTITY_INVALID`; `combined-lifecycle-positive` exits 0. Exact Work deletion,
  pre-frozen traced materialization and the sole B1-to-C move each exit 0.
- The updated normalized literal move exits 1 with witness `normalized-literal-structure`; a fresh
  one-value near miss exits 0. Fresh sibling same-spelling aliases inside the allowed owner exit 0.
- Fresh `as const` and `satisfies` normalized-move variants unexpectedly exit 0, proving finding 1.
- Fresh safe-export/name-collision variant unexpectedly exits 1 with `RAW_BINDING_EXPORTED`, proving
  finding 2.
- A duplicate official evidence argument exits 1 with `OFFICIAL_INVOCATION_INVALID`; internally
  consistent alternative SHA `68b9fd1...` exits 1 with
  `OFFICIAL_EVIDENCE_SHA_NOT_ACCEPTED_V7_BOOTSTRAP`; a candidate tuple mutation exits 1 with
  `EVIDENCE_REVIEW_BLOB_MISMATCH`.
- The 58-case suite additionally covers missing/abbreviated/malformed/nonexistent evidence,
  override/fallback, report/actor/receipt/ancestry drift, lexical owner/default/class/overload/
  re-export cases, site relocation/replacement/order, outside equality/deletion/materialization/
  import/raw and dependency/no-CFG boundaries.

This review does not demand or claim runtime semantics or selector/reviewer/human identity
authentication. No real `~/.omnimind`, credential, provider, network or user-state resource was
read or changed.

## Review boundary and required return

This verdict covers only candidate `8cee02f09de917ba169770bebe8b348a32448807`, linked handoff
commit `6040677f01a1aa301952abedcad29b8c29eb2eca`, assigned Work and accepted authority. It does not
authorize B1 or any Product/destructive work.

No substantive fix is approved within this reviewer operation. Return the candidate to the owning
v8 measurement Work to close both findings, add focused regressions for the type-only normalized
move bypass and lexical export-name false reject, freeze a new immutable meter candidate, and obtain
a new different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r3`
- receipt: `22bd169bbcac46f98c7561b2467c67c6`
- predecessor: `2198ec82eccb429eb0ca60b1be09760e`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
- explicitly allowed fix: none
