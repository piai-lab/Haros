---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r1"
actor_id: "product_truth_complexity_v8_review"
dispatch_receipt: "4432276ee4a043d58c2bfc40662ad6e2"
predecessor_receipt: "cfb3e18e709f46919791489a9fdf8c5c"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "17180c0c1def7b1ee70a898d91b58acbc35cc0af"
reviewed_handoff_commit: "e6db9ea10f93c57f55bc422626699a8917c55825"
reviewed_parent: "68b9fd1c4cb9fcc4798a65032d508e935892350a"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "8442b0dec5fdef95e6f2e9a97540637ec1454d9e4a84ca83b83c5380a09e942d"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter

## Verdict

`FAIL` / changes requested for immutable candidate
`17180c0c1def7b1ee70a898d91b58acbc35cc0af`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and candidate, and implementer `product_truth_complexity_v8_impl` differs from
reviewer `product_truth_complexity_v8_review`. The frozen 39-path scope, v1-v7 immutability, five
Work-fence digests, v8 authority digest, official evidence tuple, deterministic B0 output, authored
focused suite and typecheck are reproducible. They do not close the three material findings below.
Two independent hidden structural mutations unexpectedly pass, and one adjacent lexical positive
is falsely rejected.

No implementation, handoff, meter, production or user-state file was repaired in this review.

## Findings

### P0 — outside-Work measurement blobs are omitted from exact equality

The predecessor comparison builds `externalPaths` from only `production`, `direct-tool` and
`dependency` categories at `scripts/product-truth/measure-complexity-v8.mjs:1931-1932`.
`measurement` is excluded, even though the v8 authority requires every frozen member outside the
selected Work to preserve presence, mode and blob, and the Work map gives measurement paths their
own exact boundary.

An independent temp-repository fixture selected `native-host-package-root-binding` and appended one
comment to the B1-owned measurement member `scripts/check-source-closure.mjs`. The predecessor blob
was `f4935e4b83aab6d095cf6bec408845e25d79db1b`; the candidate report contained a different member
identity. The meter nevertheless exited 0 and emitted:

```text
comparison.enabled=true
comparison.exactOutsideEquality=true
measurement.path=scripts/check-source-closure.mjs
measurement.blobId=d89637bc97b8c6671486c283dcfbc19af3df0343
```

This lets a later Work change `scripts/check-source-closure.mjs`—and, by the same category filter,
other otherwise-unpinned measurement members—without the predecessor-delta gate noticing. The
candidate therefore does not enforce the exact allowed scope or outside equality promised by the
Work, Design and v8 interface.

### P0 — undeclared zero-raw path moves pass as unrelated deletion and materialization

At `scripts/product-truth/measure-complexity-v8.mjs:2025-2034`, a deleted/materialized Work-path pair
is rejected as an undeclared move only when both paths contain a matching raw terminal and class.
There is no path-lifecycle identity for a move whose content has no raw ingress.

An independent temp fixture normalized all B1 traced owners with the existing positive fixture,
then relocated the legacy release-policy object from the selected existing
`scripts/release-update-policy.json` to the selected pre-frozen absent
`scripts/product-truth/cli.ts` as an equivalent TypeScript export. The source was deleted, the target
was materialized, the move is not the sole Design-declared Product owner move, and neither side has
raw ingress. The official-shaped comparison nevertheless exited 0 with
`comparison.exactOutsideEquality=true`, reporting the source absent and target present.

This violates the v8 path-lifecycle rule that undeclared moves fail. Raw-effect identity cannot be
the only witness for a general frozen-path move.

### P1 — lexical shadowing of an imported raw binding is misclassified as a raw use

Raw import bindings are stored in a module-wide name map, and the identifier-use branch at
`scripts/product-truth/measure-complexity-v8.mjs:1703` checks only the spelling and declaration-node
set. It does not resolve whether the use is shadowed by a nearer parameter/local declaration, even
though the v8 lexical authority requires aliases and terminal uses to resolve lexically.

An adjacent temp positive kept one real `readFileSync` call inside the exact
`classifyLegacyDatabase` owner, then added a nested local callback whose parameter is also named
`readFileSync` and invokes the harmless supplied function. The meter treated the shadowed parameter
call as another filesystem ingress under an undeclared nested owner and exited 1 with:

```text
TRACED_OWNER_IDENTITY_INVALID:scripts/product-truth/sqlite-classifier.ts:1a5b3e5e1c4eb5a6eb1b200a27de57a58548035106847f4ff9fdf6bb49128a96
```

The callback does not reference the imported raw capability. This false rejection means the
claimed lexical declaration/use model is not implemented completely and can block an otherwise
valid selected-Work candidate.

## Independent verification

### Assignment, scope and authority

- Read-only runtime records show predecessor `cfb3e18e709f46919791489a9fdf8c5c` is `completed`, role
  `implement`, actor `product_truth_complexity_v8_impl`, and output
  `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`.
  This Review operation is receipt `4432276ee4a043d58c2bfc40662ad6e2`, role `check`, actor
  `product_truth_complexity_v8_review`, and names that completed predecessor.
- `git diff-tree --no-commit-id --name-status -r 17180c0c...` — exactly 39 additions: the v8 meter,
  config, focused test and 36 bounded JSON fixtures. No modification or deletion; no Product,
  dependency, Work, decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check 17180c0c^ 17180c0c` — PASS. The three instrument blobs at current handoff HEAD
  equal the reviewed candidate blobs.
- Independent extraction at accepted Design `23b309b0...` reproduced the five Work-fence canonical
  digests in authored order:
  `0e1551...faae`, `c85e1d...6de5`, `dec2ee...ca4`, `2f3a86...5a36a`,
  `124e32...79d9`; the v8 predecessor authority digest is `578d98...6d29` and has the exact five
  transition rows.
- Candidate SHA-256 values reproduce the handoff: script `b0139975...3698c`, config
  `8b80d4eb...4796`, focused test `7e7d5831...7a7c`. Candidate scope plus the focused immutable-byte
  assertion preserves every v1-v7 instrument/config/test digest.

### Official invocation, handoff and authored checks

- Exact command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS. Two fresh runs are byte-identical: 4,273,664 bytes, byte SHA-256
  `4406576ce94060be03a7527a6fabcf70b4e6d75c174092f366381eaf1aa859c4`; decoded JCS SHA-256
  `8442b0dec5fdef95e6f2e9a97540637ec1454d9e4a84ca83b83c5380a09e942d`.
  The handoff contains exactly one machine block, byte-for-byte decodes to the fresh report, and its
  frontmatter digest matches. The ten-field tuple and argv exactly match the Main/human invocation
  and trust-root Decision; `identityAuthenticationClaimed=false`.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  53/53 in 162.42s. This covers official argv cardinality/fallback/override, alternative SHA,
  tuple/blob/report drift, authored declaration/site/outside/lifecycle fixtures and historical B1.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 131.66s, preserving the v7 grammar/dependency/import/export/addon/raw regression suite.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).

### Hidden counterexamples

All hidden files existed only in `/tmp/omnimind-v8-review.8wpPIn/repo`; no extra worktree or
workspace fixture was created.

- `node ... --fixture hidden-outside-measurement-drift --work
  native-host-package-root-binding --ref 7582170a... --predecessor-evidence 5632f636...` — unexpected
  PASS; this proves finding 1.
- `node ... --fixture hidden-undeclared-lifecycle-pair --work direct-first-public-b1 --ref
  7582170a... --predecessor-evidence 5632f636...` — unexpected PASS; this proves finding 2.
- `node ... --fixture hidden-import-shadow-positive --work direct-first-public-b1 --ref
  7582170a... --predecessor-evidence 5632f636...` — unexpected false reject with the exact diagnostic
  above; this proves finding 3.
- The authored hidden families for missing/duplicate/abbreviated/malformed/nonexistent evidence,
  config/repository/report override, internally consistent alternative SHA, handoff/Review/report/
  actor/receipt drift, nested/default/class/constructor/overload/re-export/private-helper/alias-use,
  site relocation/replacement/reorder, outside blob/mode/import/raw/deletion/materialization/move,
  raw/import/dependency and no-CFG boundaries all produced their expected result in the 53-case
  v8 and 67-case v7 suites. No fixture or review claim extends to runtime behavior or identity
  authentication.

No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.

## Review boundary and required return

This verdict covers only candidate `17180c0c1def7b1ee70a898d91b58acbc35cc0af`, linked handoff
commit `e6db9ea10f93c57f55bc422626699a8917c55825`, assigned Work and accepted authority. It does not
authorize B1 or any production/destructive work.

No substantive fix is approved within this reviewer operation. Return the candidate to the owning
v8 measurement Work to close all three findings, add focused regressions for the two unexpected
passes and lexical false reject, freeze a new immutable meter candidate, and obtain a new
different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review`
- receipt: `4432276ee4a043d58c2bfc40662ad6e2`
- predecessor: `cfb3e18e709f46919791489a9fdf8c5c`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
- explicitly allowed fix: none
