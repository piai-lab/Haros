---
type: "Implementation Review"
title: "Review: Narrow Product-truth complexity v9 measurement"
work: "../work/product-truth-complexity-v9.md"
handoff: "../handoffs/product-truth-complexity-v9.md"
verdict: "FAIL"
actor_id: "product_truth_complexity_v9_review"
dispatch_receipt: "0bb1e2cc742d4572aef193be8c4fc23d"
predecessor_receipt: "5715f89dd0e34abc99410f90c72f4c0d"
predecessor_output: "../handoffs/product-truth-complexity-v9.md"
reviewed_candidate: "0b09b7441ae71cafe39eaabaaad4f2f0cbce9f00"
reviewed_handoff_commit: "50b0b3ce6faf75cc33c069178920a3f671fb1ff6"
reviewed_parent: "d74bffb673a7869272a6e243a8c8a329fce69092"
accepted_design: "f110fb66006768074ca192bb94024632d16c09dd"
report_sha256: "878feb3487231f3bf6afd9c03d1fcb4d7d7fc0eddf11c87d6f58f47d4b8c373d"
---

# Review: Narrow Product-truth complexity v9 measurement

## Verdict

`FAIL` for immutable candidate `0b09b7441ae71cafe39eaabaaad4f2f0cbce9f00`.

The candidate itself has the exact 37-path measurement-only scope, and its committed handoff,
official invocation, report tuple, deterministic B0, frozen authority, historical bytes and
authored gates reproduce. The implementation is materially smaller than v8 and contains none of
the forbidden v8 semantic grammar.

Three candidate-independent structural hard gates nevertheless have finite false accepts: the sole
mutable Work set does not cover blob changes to existing unlisted production files or production
extensions outside a narrow allowlist; a type-only re-export is treated as a value export; and an
evidence machine block with duplicate JSON keys is accepted and normalized last-key-wins. Each can
make a future Product candidate pass a fact that Design assigns to v9 as hard authority. No
implementation or handoff was repaired.

## Findings

### P1 — the selected-Work gate accepts changes outside the sole mutable production set

Design makes the selected Work's exact production members the sole mutable set and requires every
unlisted path, new glob match and outside lifecycle change to fail. The Interface likewise says
`unlistedOrNewMember: fail`. The implementation instead compares blobs only for
`frozenBoundaryUniverse` at `scripts/product-truth/measure-complexity-v9.mjs:1044-1060`. Its second
pass builds only presence sets, at `:1062-1073`, over `productionSourcePath`; that predicate accepts
only `.ts`, `.tsx`, `.mjs`, `.js` and `.cjs` at `:426` and `:955-968`. It never compares before/after
blobs for an existing production source outside the frozen union.

A fresh synthetic Product transition produced three unexpected PASS outcomes, all with exit 0 and
`comparison.exactOutsideEquality=true`:

```text
append to existing apps/desktop/src/appSnapIpc.ts (not in any of the five Work fences)
add apps/service/src/product/unlisted-v9.mts
add apps/service/src/product/unlisted-v9.json
```

The first case changes an ordinary existing TypeScript production blob outside the selected Work.
The latter two add an unlisted production module/config path that the extension filter never sees.
Adjacent controls isolate the defect: a selected existing member change passes, a new unlisted
`.ts` path fails `UNLISTED_PATH`, and a frozen outside-member blob mutation fails
`OUTSIDE_WORK_BLOB_DRIFT`.

Consequently B1 or a later Work can modify unrelated production, or introduce an unlisted
production/config member, while v9 certifies exact outside equality. Remedy: derive and compare the
candidate/predecessor changed-path set, rejecting every production change outside the selected
Work's exact members; bound exclusions explicitly to the authorized non-production measurement,
test, fixture and output categories rather than to a short source-extension list. This requires no
raw, graph or expression semantics.

### P1 — a type-only export falsely satisfies the value export disposition

`exportNames` at `scripts/product-truth/measure-complexity-v9.mjs:470-485` adds every named export
without checking `ExportDeclaration.isTypeOnly` or `ExportSpecifier.isTypeOnly`.
`observeDeclaration` then uses that set at `:498-526` to label the same-named runtime declaration
`exported`.

The following valid TypeScript materialization unexpectedly passed the exported declaration row:

```ts
function inspectDirectFirstPublic() {
  return null;
}
interface inspectDirectFirstPublic {
  readonly marker: true;
}
export type { inspectDirectFirstPublic };
export function applyDirectFirstPublic() {
  return null;
}
```

An independent TypeScript compiler program reported zero file diagnostics and emitted no runtime
export for `inspectDirectFirstPublic`; only `applyDirectFirstPublic` was emitted. A normal direct
value-export fixture passes, while the adjacent private/no-export form correctly fails. Thus a
module-private capability implementation can satisfy the hard exported disposition through an
unrelated type-only namespace export.

Remedy: exclude declaration-level and specifier-level type-only exports from the value-export set,
or use a bounded TypeScript value-export resolution for the exact declaration row. This is the
Interface's declaration kind/disposition fact, not semantic public-nonleak or type-signature
authority.

### P1 — duplicate-key predecessor evidence is accepted as canonical report input

The meter already has `assertNoDuplicateJsonKeys` at
`scripts/product-truth/measure-complexity-v9.mjs:44-64` and applies it to config/fixture input, but
`extractMachineBlock` parses evidence with bare `JSON.parse` at `:280-284`; the selected predecessor
report reaches it at `:875`.

A synthetic, otherwise valid predecessor evidence chain whose sole report block began with both
`"format":"forged-first-value"` and a later
`"format":"product-truth-complexity-v9"` unexpectedly exited 0. The selected predecessor report
digest was the same JCS digest as the last-key-wins object. A unique-key evidence block passes, and
handoff/review blob mutation controls reject with `EVIDENCE_HANDOFF_BLOB_MISMATCH` and
`EVIDENCE_REVIEW_BLOB_MISMATCH`, respectively.

JCS operates on I-JSON data with unique member names. Accepting an ambiguous source document lets
first-key and last-key consumers disagree while v9 binds only the collapsed last-key object, so the
official evidence report is not unambiguously canonical. Remedy: apply the existing strict
duplicate-key/I-JSON validation to every extracted machine block before parsing and hashing it.

## Independent verification

### Assignment, candidate scope and linked handoff

- Completed predecessor receipt `5715f89dd0e34abc99410f90c72f4c0d` resolves to the exact assigned
  handoff and Work. Implementer `product_truth_complexity_v9_impl` differs from reviewer
  `product_truth_complexity_v9_review`. Active review receipt
  `0bb1e2cc742d4572aef193be8c4fc23d` names this Review output and predecessor.
- Candidate `0b09b74...` has parent `d74bffb...` and exactly 37 added authorized paths: script,
  config, test and 34 bounded fixtures. Handoff commit `50b0b3c...` changes only the linked handoff.
  `git diff --check d74bffb... 0b09b74...` passes. No production, dependency, Product Work,
  existing handoff/Review, user document or v1-v8 path changed.
- Independent Git-object hashing reproduces the full 37-path manifest
  `bfe8c02d...a95a764`, fixture manifest `4d2605c4...e18ff`, meter
  `83a3c908...12da9`, config `b60120a4...0ccb`, test `37830d0d...ae25`, authority
  `b8ffbdb5...3920` and all five fence digests reported by the handoff. The v1-v8 manifest has 580
  unchanged records and digest `a23165cc...854eb`.

### Official report and authored gates

- The exact official command was run twice:

  ```text
  node scripts/product-truth/measure-complexity-v9.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  Both runs exit 0 and are byte-identical: 148,897 bytes, byte SHA-256
  `947965ab...dec64`, decoded-report JCS SHA-256 `878feb34...c373d`. The handoff contains exactly one
  complete report block, byte-identical to stdout, and its frontmatter report digest matches.
- The report reproduces the exact v7 bootstrap tuple: official evidence SHA, reviewed candidate
  `5c3e619...`, handoff blob `fd31a23...`, Review blob `fa047d2...`, predecessor-report digest
  `aa114ae...`, distinct declared actors and correlation receipt. Ancestry and post-evidence blob
  immutability pass.
- The B0 graph has 69 source-universe members, 56 parsed sources and 578 raw-JCS-byte-sorted literal
  records with digest `9594b2c2...66869`. All 11 declaration rows reproduce: two present and nine
  absent. Dependency closures reproduce as B0 `b3989b0c...10f6` and accepted-tree
  `23336380...e60`.
- `bunx vitest run scripts/product-truth/measure-complexity-v9.test.ts` — PASS, 53/53 in 74.20s.
- `(cd scripts && bun run typecheck)` — PASS (`tsc --noEmit`).
- `node --check scripts/product-truth/measure-complexity-v9.mjs` — PASS.

### Bounded adversarial matrix and narrowness

Review-owned synthetic Git documents were supplied through a read-only preload; each comparison
used the meter's exact baseline/evidence arguments plus `--work direct-first-public-b1` and a
fixture. Nothing was written to the repository or a real user home. Besides the three finding
families, adjacent controls reproduced the intended outcomes:

- extra config authority rejects `CONFIG_AUTHORITY_SURFACE_INVALID`;
- selected member content and executable-mode changes pass, while selected move, ordinary unlisted
  `.ts`, frozen outside presence/mode/blob drift and dependency manifest/lock/source-byte drift
  reject;
- value-exported declaration materialization passes, while kind, ordinary exported/private
  disposition and wrong first-materialization Work drift reject;
- exact evidence passes, while handoff/review mutation, forged selection, invalid ancestry and
  post-evidence mutation reject;
- repeated output is deterministic, and literal graph changes remain observational.

There was no unexpected false reject in this bounded matrix. Testing stopped at the three finite
candidate-independent structural seams and did not extend into v8-style expression grammar.

V9 is materially narrower than immutable v8 r17: 1,613 versus 2,836 meter lines, 481 versus 431 test
lines, and 34/218 versus 128/824 fixture files/lines. Exact source scans find no raw/global/alias,
callback, RHS/subtree, per-use-owner, CFG/ICFG, SSA, points-to, semantic public-nonleak,
lifecycle-write, Web/RPC or gateway classifier. Graph/SCC/count and domain interpretations remain
observational. No real `~/.omnimind`, credential, provider, network or user-state resource was read
or changed. The three pre-existing dirty user documents were preserved.

## Review boundary and return

This verdict covers only candidate `0b09b7441ae71cafe39eaabaaad4f2f0cbce9f00`, handoff commit
`50b0b3ce6faf75cc33c069178920a3f671fb1ff6`, assigned Work and accepted authority. It does not
authorize B1 or any Product mutation.

No substantive fix is approved. Return the three finite structural gaps to Main/Design for scope
disposition; do not broaden a follow-up into v8 expression or domain-semantic classification.

## Dispatch identity

- role: `reviewer`
- actorId: `product_truth_complexity_v9_review`
- receipt: `0bb1e2cc742d4572aef193be8c4fc23d`
- predecessor: `5715f89dd0e34abc99410f90c72f4c0d`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v9.md`
- verdict: `FAIL`
- explicitly allowed fix: none
