---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r5)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r5"
actor_id: "product_truth_complexity_v8_review_r5"
dispatch_receipt: "7a440728819142e79347b1b496f8a7a4"
predecessor_receipt: "3ce076bb899e448aa230344f1b823f4f"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "6134f3115b8023c1603c705cff55ba6833ca06c2"
reviewed_handoff_commit: "6292b8c6b4f139282b499d873676a3b131a707d9"
reviewed_parent: "3585a87601743fcc95fd7bc7aec84bc116c98692"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "4b71ab359df15c240a2ce78d7521453c8c5b1f5ac6c093374bf0fb747ce927a4"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r5)

## Verdict

`FAIL` / changes requested for immutable r5 candidate
`6134f3115b8023c1603c705cff55ba6833ca06c2`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and r5 candidate, and implementer `product_truth_complexity_v8_impl_r5` differs from
reviewer `product_truth_complexity_v8_review_r5`. Candidate scope, v1-v7 immutability, five Work
fences, v8 authority, official evidence tuple, deterministic B0, authored 69-case suite, v7
regressions and typecheck reproduce.

R5 closes both exact r4 examples: non-null and arbitrarily nested finite type-only wrappers are
normalized, direct raw object destructuring is rejected, and harmless nested object/array binding
exports pass. All earlier r1-r3 controls also retain their intended outcomes. One material lexical
binding gap remains: destructuring from an already-bound raw module namespace never receives the
declaration-scoped raw identity, so both true raw uses and public exports can pass. No
implementation, handoff, meter, Product or user-state file was repaired in this review.

## Findings

### P0 — namespace-derived destructuring loses raw identity, allowing raw use and export escapes

The collector binds a namespace import or `require` result to its declaration, and it binds a
top-level object pattern only when that pattern's initializer is itself a direct recognized loader
call. At `scripts/product-truth/measure-complexity-v8.mjs:1431-1449`, there is no corresponding path
for an object binding pattern whose initializer is an identifier already resolved as a namespace.
The later alias pass handles identifier declarations and namespace property expressions, but not
binding patterns. Consequently the introduced identifiers never enter
`bindingIdentityByDeclaration`.

R5's export walker at lines 1670-1696 recursively enumerates every object/array binding identifier,
but it can reject only identities already present in that map. Local export specifiers use the same
map. Terminal-use resolution likewise finds the nearest declaration but no identity.

Three fresh temp variants all unexpectedly exited 0:

```text
import * as fs from "node:fs";
export const { readFileSync: raw } = fs;
```

```text
import * as fs from "node:fs";
const { readFileSync: raw } = fs;
export { raw as publicReader };
```

```text
import * as fs from "node:fs";
function hiddenHelper() {
  const { readFileSync: raw } = fs;
  return raw("forbidden");
}
```

The first two expose the frozen `node:fs#readFileSync` raw binding; the third makes a true raw call
under an undeclared named private helper. Direct `require("node:fs")` object destructuring with
plain, default and rest binding elements correctly fails, proving that export traversal itself is
active. The gap is specifically the missing lexical identity propagation from an already-resolved
namespace through a binding pattern.

This violates the Work's lexical alias-use, private-helper and raw-public-export hard failures. It
requires only finite binding-pattern resolution already used elsewhere in the meter, not CFG,
points-to or runtime semantics.

## Independent verification

### Assignment, immutable scope and authority

- Runtime operation `3ce076bb899e448aa230344f1b823f4f` is completed, role `implement`, actor
  `product_truth_complexity_v8_impl_r5`, and outputs the required linked handoff. This Review is
  role `check`, actor `product_truth_complexity_v8_review_r5`, receipt
  `7a440728819142e79347b1b496f8a7a4`, and names that completed predecessor.
- Candidate `6134f31...` has parent `3585a87...` and exactly seven allowed changed paths: the v8
  meter and focused test plus five bounded fixture additions. No config, Product, dependency,
  direct-tool, Work, Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check 6134f31...^ 6134f31...` — PASS. Candidate meter/config/test blobs at handoff
  commit `6292b8c...` equal the reviewed candidate blobs.
- Candidate SHA-256 values reproduce the handoff: script
  `0b7a7ce734ed96c570b39e2e26afe25cd539d23a0b71e11b74ee54d8da997b45`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `e11ea99c152ec7a75d5526cf38b9c17eaef1675f405af7825e99adfb11f40932`; the 52-fixture manifest is
  `bdff569f...f51d`.
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
  `b921173e94cbda9ce9383e22fc60e720045d9141b80f4a70674f5e83418260af`; decoded JCS SHA-256
  `4b71ab359df15c240a2ce78d7521453c8c5b1f5ac6c093374bf0fb747ce927a4`.
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
  69/69 in 260.56s.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 138.82s.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).

### Prior reproductions, adjacent controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r5-review.xNp76i/repo`; no additional
worktree was created.

- R1 controls: outside measurement drift exits 1 with
  `OUTSIDE_WORK_BLOB_DRIFT:scripts/check-source-closure.mjs`; imported-binding shadow exits 0.
- R2 controls: repeated same-spelling alias in a private helper exits 1 with
  `TRACED_OWNER_IDENTITY_INVALID`; independent combined lifecycle exits 0. Exact Work deletion,
  traced materialization and the sole B1-to-C move remain positive in the 69-case suite.
- R3/R4 controls: `as`, `satisfies`, type assertion, non-null and nested wrapper moves exit 1 with
  `normalized-literal-structure`; nested value-different composition exits 0. Safe same-name export
  and harmless destructuring pass; direct raw identifier and direct raw destructuring exports fail.
- A deeper fresh combination of parentheses, non-null, `as const`, `satisfies` and angle-bracket
  assertion exits 1; the same shape with one changed value exits 0.
- Direct `require` destructuring with default/rest forms exits 1. Namespace-derived direct export,
  export specifier alias and private-helper raw call unexpectedly exit 0, proving the finding.
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

This verdict covers only candidate `6134f3115b8023c1603c705cff55ba6833ca06c2`, linked handoff
commit `6292b8c6b4f139282b499d873676a3b131a707d9`, assigned Work and accepted authority. It does not
authorize B1 or any Product/destructive work.

No substantive fix is approved within this reviewer operation. Return the candidate to the owning
v8 measurement Work to propagate declaration-scoped raw identity through namespace-derived binding
patterns, add focused regressions for use/direct-export/export-specifier variants, freeze a new
immutable meter candidate, and obtain a new different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r5`
- receipt: `7a440728819142e79347b1b496f8a7a4`
- predecessor: `3ce076bb899e448aa230344f1b823f4f`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
- explicitly allowed fix: none
