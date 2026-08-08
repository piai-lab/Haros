---
type: "Implementation Review"
title: "Final-authority Review: Narrow Product-truth complexity v9 measurement"
work: "../work/product-truth-complexity-v9.md"
handoff: "../handoffs/product-truth-complexity-v9.md"
verdict: "FAIL"
actor_id: "product_truth_complexity_v9_final_authority_review"
dispatch_receipt: "458b3ed4dd774137bdfd38fe1e5ff554"
predecessor_receipt: "ecb72ae80a9e46f4ba39b858fa003c4f"
predecessor_output: "../handoffs/product-truth-complexity-v9.md"
reviewed_candidate: "558de08f897e2131c9159d118944272191f48359"
reviewed_handoff_commit: "14dfdf5cfec1cc221986f3501161d6d0118725aa"
reviewed_parent: "81dcb40357084cee0bf1aa45f35ded9e4f830229"
accepted_design: "d2e7bab77405f32fed81f6c29247eca9cad6702c"
approved_state: "f110fb66006768074ca192bb94024632d16c09dd"
report_sha256: "74188c2f581b90f3eb5e5fbaa1883251bc649a2415f98fbc18a6974bfd4c6815"
---

# Final-authority Review: Narrow Product-truth complexity v9 measurement

## Verdict

`FAIL` for immutable meter candidate
`558de08f897e2131c9159d118944272191f48359` and linked handoff commit
`14dfdf5cfec1cc221986f3501161d6d0118725aa`.

The candidate reproduces the frozen 24-path scope, exact authority/state/accepted-tree facts,
83 authored tests, deterministic B0 report, declarations, dependency tuples, v1-v8 history and
explicit semantic non-authority. Independent official-path controls nevertheless found one hard
changed-path false reject: every non-empty real `git diff --name-status -z` result is rejected
before its records can be classified. A separate authority-routing conflict means this assigned
Review path cannot satisfy the predecessor row or B1 entry stop, which still consume the immutable
earlier `reviews/product-truth-complexity-v9.md` `FAIL`.

Decision-critical blocking findings: **2**. Advisory findings: **0**. No implementation repair was
made or proposed.

## Findings

### P1 — the official all-Git changed-path gate rejects every non-empty valid `-z` result

The selected authority requires an exact real Git comparison and adjacent positives for selected
blob changes and authored first materializations. The implementation correctly invokes
`git diff --name-status -z --no-renames` at
`scripts/product-truth/measure-complexity-v9.mjs:1473-1482`, but immediately passes its binary
NUL-delimited output to `decodeUtf8` at `:1483`. That helper rejects any NUL at `:48-51`. Every
non-empty valid `-z` output necessarily contains NUL separators and a terminal NUL, so execution
always throws `TEXT_AUTHORITY_INVALID:git-diff-name-status`; the intended `split("\0")` parser at
`:1485-1497` is unreachable for a real changed candidate.

This escaped the authored 83-test suite because Product-transition fixtures set `fixtureName` and
therefore use `changedStatusRecordsForSnapshots`; only a fixture-free official invocation calls
`changedStatusRecordsFromGit` at `:1499-1502`.

I constructed an unreferenced first-parent Git-object chain without changing a branch or working
tree: candidate `558de08f...`, handoff `14dfdf5...`, a synthetic internally consistent accepted
Review/evidence commit `4c47955280d5809cb72b1bd0d1e4e30d873e87e6`, and direct-first candidate
`129667d37ad1d7282f113778c11461352d899496` changing only the approved-present selected
`apps/service/src/persistence/Layers/Sqlite.ts` blob while preserving mode. The exact invocation

```text
node scripts/product-truth/measure-complexity-v9.mjs \
  --work direct-first-public-b1 \
  --ref 129667d37ad1d7282f113778c11461352d899496 \
  --predecessor-evidence 4c47955280d5809cb72b1bd0d1e4e30d873e87e6
```

exited `1` with `TEXT_AUTHORITY_INVALID:git-diff-name-status`. An exact selected verification
first-materialization control failed at the same point. Thus the hard gate cannot accept any real
Product candidate with a changed path, including both required positive lifecycle families. This
is a material changed-path/lifecycle failure; `PASS` requires zero failed gates.

### P1 — the assigned Review output is not the Review path owned by the predecessor authority

The current Work requires the fresh acceptance Review at
`reviews/product-truth-complexity-v9.md` (`work/product-truth-complexity-v9.md:146-156`). The
Interface's first authored predecessor row consumes that same path
(`interfaces/product-truth-complexity-v9.md:277-285`), the B1 Work stops until that exact path is a
zero-finding `PASS` (`work/direct-first-public-b1.md:45-52`), and the handoff again binds the same
path (`handoffs/product-truth-complexity-v9.md:127-131`). That path currently and immutably records
the earlier candidate `0b09b744...` `FAIL` (`reviews/product-truth-complexity-v9.md:1-15`).

The active runtime assignment instead permits only
`reviews/product-truth-complexity-v9-final-authority.md`. The meter never reads this assigned path.
Using the actual handoff commit as official evidence in the same hidden candidate chain:

```text
node scripts/product-truth/measure-complexity-v9.mjs \
  --work direct-first-public-b1 \
  --ref 129667d37ad1d7282f113778c11461352d899496 \
  --predecessor-evidence 14dfdf5cfec1cc221986f3501161d6d0118725aa
```

rejected with `EVIDENCE_REVIEW_BINDING_MISMATCH`. Therefore this Review cannot become the exact
accepted predecessor evidence or release the authored B1 entry stop. Overwriting the old Review is
also outside this assignment and conflicts with its immutable failed-evidence role.

## Confirmed candidate facts

- Predecessor operation `ecb72ae80a9e46f4ba39b858fa003c4f` is `completed`, role
  `implementer`, actor `product_truth_complexity_v9_impl_authority`, same Work entry, and output
  `handoffs/product-truth-complexity-v9.md`. Its actor differs from this reviewer. The handoff links
  back to the Work and names candidate `558de08f...`.
- Candidate `558de08f...` is a commit with sole parent `81dcb403...`. Its diff is exactly 24 allowed
  paths, `8 M + 16 A`; production, dependencies, five Work documents, v1-v8 artifacts and the three
  concurrent user-document edits are outside that diff. Handoff commit `14dfdf5...` changes only
  the handoff.
- Independent path-sorted JCS manifests reproduce the handoff: 24 changed rows
  `d035bb1801fcf0ec56c3177852ad222ddf3f73e552fb5ae20bc40142a3f1655c`, 60 fixtures
  `593a5b942b229abe78d4fb9a3f331446c17ea915f6dc9a11863c57e1ad0658a7`, and 63 v9 artifacts
  `b01bf3ae4318d9d852e1140f4e714f02f0af48c4ec593f0aca46a7c4cd6de500`.
- The complete authority reproduces
  `f3fdbbcd7547c6bbf4d5990358d7a3a2cffac7497c16f725c73aaa57b794f95d`.
  The report reproduces verification `70/45/9` and digest `c291688e...`; production `69/4` and
  state digest `c7790b3d...`; union `110/88/22` and digest `2d189676...`; accepted-tree 6,321
  records and digest `6687319b...`; literal graph 56 parsed files/578 records and digest
  `9594b2c2...`; and 580 immutable v1-v8 records with digest `a23165cc...`.
- The handoff contains exactly one complete report block. Its JCS digest is `74188c2f...`, its
  instrument hashes equal the candidate meter/config, and its official B0 evidence tuple is the
  accepted v7 bootstrap. Eleven declaration rows reproduce nine absent/two present exported B0
  declarations, with no pinned emitted signatures.
- Config is data-only and contains no path, category, lifecycle, declaration, counter, delta,
  predecessor or verdict authority. Source/tests expose the required explicit non-authority for
  semantic raw/global/alias/wrapper/callback/RHS/subtree/per-use and graph/count interpretation.
  B1 was not run.

## Commands and results

- `bunx vitest run scripts/product-truth/measure-complexity-v9.test.ts --reporter=verbose` —
  `PASS`, 1 file and **83/83** tests in 147.18 s. These authored fixtures do not exercise the failed
  fixture-free Git parser.
- The exact B0 command from the handoff was run twice and piped independently to
  `shasum -a 256` — both outputs were 2,060,726 bytes with raw SHA-256
  `036c57828949c2d69c771cb92cf9a066864fcf1eaa7cf904fc94f0bcd946e3fe`; parsed JCS SHA-256 was
  `74188c2f581b90f3eb5e5fbaa1883251bc649a2415f98fbc18a6974bfd4c6815`.
- `node --check scripts/product-truth/measure-complexity-v9.mjs` — `PASS`.
- `bun run --cwd scripts typecheck` — `PASS` (`tsc --noEmit`).
- `bunx oxfmt --check` over meter, config, test and all fixtures — `PASS`, 63 files.
- Strict `JSON.parse` over config and all 60 fixtures — `PASS`, 61 files.
- `git diff --check 81dcb403... 558de08f... --` and
  `git diff --check 558de08f... 14dfdf5... --` — `PASS`.
- Local Markdown-link scan over Work, Interface, final-authority QbD, human approval and handoff —
  25 links checked, 0 missing.
- Candidate-independent Git-object controls covered real official evidence, selected existing blob,
  selected verification first materialization, arbitrary root addition, adopted source/manifest,
  patch, root build input, lockfile, package manifest, mode, delete, move, unowned materialization,
  config drift and later evidence-blob mutation. There were **0 unexpected PASS** and at least
  **2 false rejects**; the universal NUL-parser failure prevents the negative cases from reaching
  their intended family-specific classifiers, so they are not claimed as independent proof of
  those downstream diagnostics.

## Stop-loss disposition

This Review does not authorize B1. The first finding is in the changed-path/lifecycle hard family,
and the second requires authority routing to be reconsidered. Under the binding post-r2 stop-loss,
Main must not dispatch another v9 implementation repair. Return to Design/stop and obtain a new
human decision. Explicitly allowed implementation fix: **none**.

## Handoff

- Review path:
  `.omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-truth-complexity-v9-final-authority.md`
- Verdict: `FAIL`
- Tests: authored `83/83 PASS`; double B0 deterministic; independent official selected positives
  `FAIL` with `TEXT_AUTHORITY_INVALID:git-diff-name-status`
- Actor ID: `product_truth_complexity_v9_final_authority_review`
- Receipt: `458b3ed4dd774137bdfd38fe1e5ff554`
- Predecessor: `ecb72ae80a9e46f4ba39b858fa003c4f`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v9.md`
- Explicitly allowed fix: none; Design/stop under the post-r2 stop-loss
