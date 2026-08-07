---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r2)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r2"
actor_id: "product_truth_complexity_v8_review_r2"
dispatch_receipt: "2052508238264478b9b26f6cd079257a"
predecessor_receipt: "e9e8e6259fb14616b0a25c01d9c75b59"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "61df83885e0290fe199a58715101ba405358aec9"
reviewed_handoff_commit: "2fe8fe388e9ed76856a27f625d249bfaf9826c47"
reviewed_parent: "4b8804c4e173ec1292f03cdbb80336e565fe2b62"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "a15c7706575a8460cfccc3b8fadef21029c9fe86648ef23c190252cf1525d80b"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r2)

## Verdict

`FAIL` / changes requested for immutable r2 candidate
`61df83885e0290fe199a58715101ba405358aec9`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and r2 candidate, and implementer `product_truth_complexity_v8_impl_r2` differs from
reviewer `product_truth_complexity_v8_review_r2`. Candidate scope, v1-v7 immutability, five Work
fences, v8 authority, official input and evidence tuple, deterministic report, authored 56-case
suite, v7 regressions and typecheck reproduce. R2 also closes each r1 counterexample in its authored
form: outside measurement drift fails, the zero-raw deletion/materialization negative fails, and a
shadow of the imported binding passes.

Those results do not close the two material findings below. A fresh lexical variant unexpectedly
passes with a true raw use hidden under a named private helper, while the new lifecycle rule falsely
rejects any independent exact Work deletion and materialization that occur together. No
implementation, handoff, meter, Product or user-state file was repaired in this review.

## Findings

### P0 — repeated same-spelling lexical aliases can hide a true raw use in a private helper

R2 adds per-declaration raw identities and resolves uses against the nearest lexical declaration,
but alias discovery still uses the module-wide `bindings` name map as its uniqueness guard. At
`scripts/product-truth/measure-complexity-v8.mjs:1406-1417`, an alias declaration is bound only when
`!bindings.has(node.name.text)`. Once one declaration named `raw` has been seen anywhere in the
module, a distinct later declaration named `raw` in another lexical scope never receives an entry
in `bindingIdentityByDeclaration`. The use resolver at lines 1334-1341 correctly finds that nearer
declaration, but finds no identity and therefore treats the true raw call as harmless.

An independent temp fixture retained one allowed call inside
`classifyLegacyDatabase`, then declared a second `const raw = readFileSync` inside a named nested
`hiddenHelper` and invoked `raw("forbidden")`. Both aliases resolve directly from the imported raw
binding and are in distinct lexical scopes. The official-shaped comparison unexpectedly exited 0.
The private-helper raw call was absent from the classified ingress instead of producing the required
`TRACED_`/raw-ingress failure.

This is a false negative in the structural ownership gate, not a request for points-to or runtime
semantics. It violates the Work's per-declaration lexical alias-use rule and its mandatory negative
for a new named private raw helper.

### P0 — the lifecycle repair makes simultaneous exact deletion and materialization impossible

At `scripts/product-truth/measure-complexity-v8.mjs:2050-2063`, R2 forms the Cartesian product of
every selected-Work deleted path and every selected-Work materialized path, then rejects every pair
except the sole declared B1-to-C move. It performs no structural or content test that the two paths
are a relocation. Consequently two independent permitted lifecycle events are unconditionally
relabelled as an undeclared move merely because they coexist.

A fresh adjacent positive deleted selected exact Work path
`scripts/release-update-policy.json` and independently materialized selected pre-frozen path
`scripts/product-truth/cli.ts` with a new zero-raw CLI export. The two contents are unrelated. Each
lifecycle operation passes in the authored single-operation positives, but their composition
falsely exits 1 as:

```text
UNDECLARED_WORK_PATH_MOVE:scripts/release-update-policy.json:scripts/product-truth/cli.ts
```

This is not only a synthetic composition. The assigned B1 Work requires creating the absent
`scripts/product-truth/cli.ts` and deleting legacy production files such as
`apps/service/src/persistence/selectionSchemaCoordinator.ts`,
`apps/web/src/composerDraftV2Transcode.ts` and
`apps/desktop/src/desktopStorageUpgrade.ts`; Git confirms the CLI is absent and those deletion
targets are present at B0. After imports/callers are validly repaired, any such B1 candidate must
populate both arrays and therefore hits the unconditional Cartesian rejection. The meter cannot
both authorize the Work-required exact deletion/materialization lifecycle and enforce this rule.

The authored `undeclared-zero-raw-path-move` regression proves only that one chosen co-occurrence
fails; it does not establish that the paths are the same artifact. The implementation needs a
bounded structural definition of an undeclared move that does not make all independent lifecycle
composition impossible.

## Independent verification

### Assignment, immutable scope and authority

- Runtime operation `e9e8e6259fb14616b0a25c01d9c75b59` is completed, role `implement`, actor
  `product_truth_complexity_v8_impl_r2`, and outputs the required linked handoff. This Review is
  role `check`, actor `product_truth_complexity_v8_review_r2`, receipt
  `2052508238264478b9b26f6cd079257a`, and names that completed predecessor.
- Candidate `61df838...` has parent `4b8804c...` and exactly five changed paths: the v8 meter and
  focused test plus the three r2 fixtures `outside-measurement-drift.json`,
  `traced-import-shadow-positive.json` and `undeclared-zero-raw-path-move.json`. No Product,
  dependency, Work, Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check 61df838...^ 61df838...` — PASS. Candidate meter/config/test blobs at handoff
  commit `2fe8fe3...` equal the reviewed candidate blobs.
- Candidate SHA-256 values reproduce the handoff: script
  `49ac968673167aee13d7ebfa1853bad2c0c032c848494ebfb21e5299a00b748a`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `5d7267097a43e6fa21a7eb39975dac8507ee2933bc4d5c76780754a0d63a89c2`; the 39-fixture manifest is
  `93d9e739...b3e`.
- Candidate scope and the 56-case immutable assertions preserve every v1-v7 instrument/config/test
  byte. Independent authority comparison retained the five accepted Work-fence digests in authored
  order (`0e1551...faae`, `c85e1d...6de5`, `dec2ee...ca4`, `2f3a86...5a36a`,
  `124e32...79d9`) and v8 predecessor authority `578d98...6d29`. No CFG/ICFG, SSA, points-to,
  branch/value, task, Effect, lifetime or runtime-verdict engine was added.

### Official report, handoff and authored gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Fresh outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `3cd0a2dda6a6660a08dca01182ecdc1a384b764f37231759892be8072e838746`; decoded JCS SHA-256
  `a15c7706575a8460cfccc3b8fadef21029c9fe86648ef23c190252cf1525d80b`.
  The handoff contains exactly one complete machine block, its decoded JCS equals both fresh reports,
  and frontmatter `report_sha256` matches.
- The report records the exact argv once, `fixtureMode=false`, `official=true`,
  `environmentFallbackUsed=false` and `identityAuthenticationClaimed=false`. Its ten-field selected
  tuple matches the trust-root Decision: Work id, B0 candidate, official evidence SHA, reviewed v7
  candidate, handoff/review blobs, predecessor report digest, distinct actors and receipt all occupy
  the correct slots.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts` — PASS, 56/56 in 185.21s.
  This includes input cardinality/fallback/override, alternative evidence SHA, tuple/blob/report/
  ancestry drift, declaration/site/outside/lifecycle fixtures, exact deletion/materialization,
  declared C move, historical B1 and immutable hashes.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts` — PASS, 67/67 in 131.65s,
  preserving v7 grammar/dependency/import/export/addon/raw-public-escape behavior.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).

### R1 reproductions, adjacent controls and fresh hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r2-review.qD2aRj/repo`; no additional
worktree was created.

- R1 reproduction: `outside-measurement-drift` now exits 1 with
  `OUTSIDE_WORK_BLOB_DRIFT:scripts/check-source-closure.mjs`; measurement outside-equality is closed.
- R1 reproduction: `undeclared-zero-raw-path-move` now exits 1 with the authored
  `UNDECLARED_WORK_PATH_MOVE`; the exact prior unexpected pass is closed.
- R1 reproduction: `traced-import-shadow-positive` exits 0; the exact prior lexical false reject is
  closed.
- Adjacent controls `exact-work-deletion-positive`, `traced-owner-positive` (exact pre-frozen
  materialization) and `product-owner-move-positive` each exit 0.
- Fresh official-input control with a duplicate full evidence argument exits 1 with
  `OFFICIAL_INVOCATION_INVALID`; the internally consistent alternative SHA `68b9fd1...` exits 1 with
  `OFFICIAL_EVIDENCE_SHA_NOT_ACCEPTED_V7_BOOTSTRAP`.
- Fresh dual actor/receipt tuple mutation exits 1 with `EVIDENCE_REVIEW_BLOB_MISMATCH`; a fresh
  nontraced alias relocation exits 1 with `NONTRACED_SITE_RELOCATED_REPLACED_OR_ADDED`; a fresh
  outside measurement materialization exits 1 with `UNLISTED_PATH`.
- `hidden-repeated-local-alias-private-helper` unexpectedly exits 0, proving finding 1.
- `hidden-independent-delete-materialize-positive` unexpectedly exits 1 with
  `UNDECLARED_WORK_PATH_MOVE`, proving finding 2.

The authored raw/import/dependency boundaries and no-CFG claim remain structural. This review does
not demand or claim runtime semantics or selector/reviewer/human identity authentication. No real
`~/.omnimind`, credential, provider, network or user-state resource was read or changed.

## Review boundary and required return

This verdict covers only candidate `61df83885e0290fe199a58715101ba405358aec9`, linked handoff
commit `2fe8fe388e9ed76856a27f625d249bfaf9826c47`, assigned Work and accepted authority. It does not
authorize B1 or any Product/destructive work.

No substantive fix is approved within this reviewer operation. Return the candidate to the owning
v8 measurement Work to close both findings, add focused regressions for the lexical unexpected pass
and lifecycle composition false reject, freeze a new immutable meter candidate, and obtain a new
different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r2`
- receipt: `2052508238264478b9b26f6cd079257a`
- predecessor: `e9e8e6259fb14616b0a25c01d9c75b59`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
- explicitly allowed fix: none
