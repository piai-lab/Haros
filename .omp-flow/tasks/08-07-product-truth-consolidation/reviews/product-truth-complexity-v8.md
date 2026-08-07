---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r4)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r4"
actor_id: "product_truth_complexity_v8_review_r4"
dispatch_receipt: "2e2090f1980c4b6a902ea18fd5b72686"
predecessor_receipt: "47eeda5671af4eb09bb3d9cf99bff89a"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "7c6107f2b9d5ffccacdde515d943ff6a5cb7992f"
reviewed_handoff_commit: "9aa5ba14152f8d1800680813a0f6d1e518a510b2"
reviewed_parent: "8289941aa084fdccf7a3e95d10a0ad6d250e3a3a"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "bd370246d4e3f90b114f9781607ad17200312e2eafbe3e15cfc38b7c7916b8bc"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r4)

## Verdict

`FAIL` / changes requested for immutable r4 candidate
`7c6107f2b9d5ffccacdde515d943ff6a5cb7992f`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and r4 candidate, and implementer `product_truth_complexity_v8_impl_r4` differs from
reviewer `product_truth_complexity_v8_review_r4`. Candidate scope, v1-v7 immutability, five Work
fences, v8 authority, official evidence tuple, deterministic B0, authored 64-case suite, v7
regressions and typecheck reproduce.

R4 closes the exact r3 examples: parenthesized/nested `as`, `satisfies` and angle-bracket assertion
forms are normalized; value-different lifecycle composition passes; safe same-name module exports
pass; direct raw exports and export specifier aliases fail. It also retains all r1/r2 repairs. Two
fresh structural forms still bypass mandatory hard failures: one finite type-only wrapper evades the
move witness, and one direct destructuring export evades raw-public-export detection. No
implementation, handoff, meter, Product or user-state file was repaired in this review.

## Findings

### P0 — a non-null assertion still bypasses the normalized move witness

`structuralLiteralValue` at `scripts/product-truth/measure-complexity-v8.mjs:31-69` now recursively
unwraps parentheses, `as`, `satisfies` and angle-bracket type assertions, but omits TypeScript's
`NonNullExpression`. A non-null assertion is another finite type-only wrapper; it neither evaluates
nor changes the enclosed object literal. Because it returns `INVALID_STRUCTURAL_LITERAL`,
`moveWitness` at lines 2121-2137 sees no normalized equality.

A fresh temp fixture deleted selected exact Work member
`scripts/release-update-policy.json` and materialized selected pre-frozen
`scripts/product-truth/cli.ts` with the same three-key value, reordered and wrapped only as:

```text
export const legacyReleaseUpdatePolicy = ({ ...same literal... })!;
```

The official-shaped comparison unexpectedly exited 0. In adjacent controls, deeply nested
parentheses plus `as const` plus `satisfies` correctly exit 1 as
`UNDECLARED_WORK_PATH_MOVE:...:normalized-literal-structure`, and the same nested structure with one
different value correctly exits 0.

This is a finite AST omission, not a request for CFG, value flow or runtime interpretation. It lets
the same normalized artifact move between exact Work paths while bypassing the r4 witness through
one erased TypeScript assertion form.

### P0 — a direct exported object-binding pattern can expose a raw binding undetected

The raw binding collector recognizes CommonJS object destructuring: at
`scripts/product-truth/measure-complexity-v8.mjs:1442-1450`, each identifier in an object binding
pattern receives a declaration-scoped raw identity. The repaired direct-export check at lines
1681-1687, however, examines a variable declaration only when `declaration.name` is an identifier;
it skips object binding patterns entirely.

A fresh fixture materialized the traced module with:

```text
export const { readFileSync: raw } = require("node:fs");
export function classifyLegacyDatabase() {
  return "safe";
}
```

The collector binds `raw` to the frozen `node:fs#readFileSync` classes, the declaration itself is
public, and there is no later use needed to expose it. The official-shaped comparison nevertheless
unexpectedly exited 0. By contrast, the authored direct identifier export and a fresh
`export { raw as publicReader }` specifier alias both fail.

This is a raw public binding escape explicitly covered by the Work's preserved global hard failures.
It requires only walking the already-supported binding pattern declarations, not runtime semantics.

## Independent verification

### Assignment, immutable scope and authority

- Runtime operation `47eeda5671af4eb09bb3d9cf99bff89a` is completed, role `implement`, actor
  `product_truth_complexity_v8_impl_r4`, and outputs the required linked handoff. This Review is
  role `check`, actor `product_truth_complexity_v8_review_r4`, receipt
  `2e2090f1980c4b6a902ea18fd5b72686`, and names that completed predecessor.
- Candidate `7c6107f...` has parent `8289941...` and exactly eight allowed changed paths: the v8
  meter and focused test plus six bounded fixture additions. No config, Product, dependency,
  direct-tool, Work, Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check 7c6107f...^ 7c6107f...` — PASS. Candidate meter/config/test blobs at handoff
  commit `9aa5ba1...` equal the reviewed candidate blobs.
- Candidate SHA-256 values reproduce the handoff: script
  `4640d14fed49e68bf7f963056a0d17b68279b6dfa603f7a2c593f72d12fa1ad4`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `ab888b71f26f22a26bbe588a04a6ae303863e984b71cd79eb00c9ffb2ad8f18e`; the 47-fixture manifest is
  `54cf7c03...f843`.
- Candidate scope and authored immutable-byte assertions preserve every v1-v7
  instrument/config/test byte. The official report independently reproduces the five accepted
  Work-fence digests in authored order (`0e1551...faae`, `c85e1d...6de5`, `dec2ee...ca4`,
  `2f3a86...5a36a`, `124e32...79d9`) and v8 predecessor authority `578d98...6d29`.
- Source inspection and the focused assertion find no CFG/ICFG, SSA, points-to, branch/value, task,
  Effect, lifetime or runtime-verdict engine.

### Official report, handoff and authored gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Fresh outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `132790c15da293f55c9f48c6dfd122187b3c6361fbf0aba5ebf3b1e23e69d70b`; decoded JCS SHA-256
  `bd370246d4e3f90b114f9781607ad17200312e2eafbe3e15cfc38b7c7916b8bc`.
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
  64/64 in 241.52s.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 146.92s.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).

### Prior reproductions, adjacent controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r4-review.ao5Urv/repo`; no additional
worktree was created.

- R1 controls: outside measurement drift exits 1 with
  `OUTSIDE_WORK_BLOB_DRIFT:scripts/check-source-closure.mjs`; imported-binding shadow exits 0.
- R2 controls: repeated same-spelling alias in a private helper exits 1 with
  `TRACED_OWNER_IDENTITY_INVALID`; independent combined lifecycle exits 0. Exact Work deletion,
  traced materialization and the sole B1-to-C move remain positive in the 64-case suite.
- R3 controls: authored `as const`, `satisfies` and angle-bracket assertion moves each exit 1 with
  `normalized-literal-structure`; value-different composition and safe same-name export each exit 0;
  direct raw identifier export exits 1 with `RAW_BINDING_EXPORTED`.
- Fresh nested parentheses/`as const`/`satisfies` move exits 1; the nested value-different positive
  exits 0. Fresh non-null move unexpectedly exits 0, proving finding 1.
- Fresh raw export specifier alias exits 1, and a harmless `export { safe as raw }` plus inner raw
  alias exits 0. Fresh direct exported raw object destructuring unexpectedly exits 0, proving
  finding 2.
- A duplicate official evidence argument exits 1 with `OFFICIAL_INVOCATION_INVALID`; internally
  consistent alternative SHA `68b9fd1...` exits 1 with
  `OFFICIAL_EVIDENCE_SHA_NOT_ACCEPTED_V7_BOOTSTRAP`; a tuple mutation exits 1 with
  `EVIDENCE_REVIEW_BLOB_MISMATCH`. Nontraced reorder and outside raw drift fail at their exact gates.
- The authored suite additionally covers missing/abbreviated/malformed/nonexistent evidence,
  override/fallback, report/actor/receipt/ancestry drift, lexical owner/default/class/overload/
  re-export cases, site relocation/replacement/order, outside equality/deletion/materialization/
  import/raw and dependency/no-CFG boundaries.

This review does not demand or claim runtime semantics or selector/reviewer/human identity
authentication. No real `~/.omnimind`, credential, provider, network or user-state resource was
read or changed.

## Review boundary and required return

This verdict covers only candidate `7c6107f2b9d5ffccacdde515d943ff6a5cb7992f`, linked handoff
commit `9aa5ba14152f8d1800680813a0f6d1e518a510b2`, assigned Work and accepted authority. It does not
authorize B1 or any Product/destructive work.

No substantive fix is approved within this reviewer operation. Return the candidate to the owning
v8 measurement Work to close both findings, add focused regressions for the non-null normalized move
bypass and direct exported binding-pattern escape, freeze a new immutable meter candidate, and
obtain a new different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r4`
- receipt: `2e2090f1980c4b6a902ea18fd5b72686`
- predecessor: `47eeda5671af4eb09bb3d9cf99bff89a`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
- explicitly allowed fix: none
