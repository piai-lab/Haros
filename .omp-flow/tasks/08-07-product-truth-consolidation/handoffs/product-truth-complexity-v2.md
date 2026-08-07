---
type: "Handoff"
title: "Coverage-complete Product-truth v2 meter candidate"
work: "../work/product-truth-complexity-v2.md"
status: "DONE"
actor_id: "product_truth_complexity_v2_i1"
dispatch_receipt: "5c61036ebd874543a0c2fd0e1e046bec"
predecessor_receipt: "4f85828a384f4176a497673e73bb667b"
predecessor_output: "../qbd/b1-failed-review-repair-final-audit.md"
---

# Coverage-complete Product-truth v2 meter candidate

## Result

`DONE` — the bounded meter/config/tests/fixtures are implemented, frozen in one dedicated commit and
focused verification is green. The candidate contains no measured production, destructive runtime,
dependency, user-state, Campaign or v1 change. Main created the required meter-only commit and reran
the deterministic B0 proof without changing any meter byte. A different-actor review is still the
next mandatory stop before any B1 production receipt.

## Identity and boundary

- Work: [Freeze the coverage-complete Product-truth v2 meter](../work/product-truth-complexity-v2.md)
- Actor ID: `product_truth_complexity_v2_i1`
- Dispatch receipt: `5c61036ebd874543a0c2fd0e1e046bec`
- Predecessor receipt: `4f85828a384f4176a497673e73bb667b`
- Predecessor: [final QbD audit](../qbd/b1-failed-review-repair-final-audit.md), verdict `PASS`
- B0: `7582170a277477ba0d71cf70f53e4e0836874a72`
- Immutable meter commit: `b5bffb804c893a093f8ea76f0be878e3ef957731`

## Changed paths

- `scripts/product-truth/measure-complexity-v2.mjs`
- `scripts/product-truth/complexity-universe-v2.json`
- `scripts/product-truth/measure-complexity-v2.test.ts`
- `scripts/product-truth/fixtures/complexity-v2/computed-import.json`
- `scripts/product-truth/fixtures/complexity-v2/newly-externalized-import.json`
- `scripts/product-truth/fixtures/complexity-v2/newly-materialized-bounded-path.json`
- `scripts/product-truth/fixtures/complexity-v2/omitted-allowed-path.json`
- `scripts/product-truth/fixtures/complexity-v2/out-of-universe-responsibility-move.json`
- `scripts/product-truth/fixtures/complexity-v2/unresolved-import.json`
- this handoff

No other path changed. In particular, the v1 script/config, `apps/**`, `packages/**`, manifests,
lockfiles, direct-rebuild runtime and user state are unchanged.

## Measurement decisions

- Production seeds are the frozen materialized historical production set plus each of the five
  Work's materialized exact/bounded production paths. Test, browser-test, `testSupport`, fixture,
  generated and measurement files are not seeds.
- `package.json` is universe-required metadata, `scripts/package.json` is resolver metadata, and
  neither is a production seed. `bun.lock` is explicitly excluded.
- Closure iterates to stability in both directions: seed/import-closure sources add resolved
  internal targets, and any repository production importer of a closure target is added.
- The five Work manifests are independent of working-tree diffs and candidate-selected lists.
  New glob-only materialization must already appear in the frozen materialized allowlist; otherwise
  it fails. Missing future exact leaf/Store/Coordinator paths are reported and become covered when
  materialized.
- Computed imports, unresolved internal/workspace imports, newly externalized imports, omitted
  allowed paths and responsibility markers outside the universe fail mechanically.
- Broad `apps/service/src/product/**` ownership is not used. First-public schema/fingerprint private
  files have bounded patterns plus filename/export rejection for Store/Coordinator responsibility;
  Store private SQL is bounded to `apps/service/src/product/state/**` and any new materialization
  stops until frozen explicitly.
- Existing v1 semantic counters remain reported. V2 additionally reports canonical/noncanonical
  Product database resolution sites and disjoint destructive-tool occurrence, required runtime
  sentinel and forbidden-compatibility classes.

## Deterministic B0 report

Two direct runs produced byte-identical stdout with no excluded field.

```text
format: product-truth-complexity-v2
commit: 7582170a277477ba0d71cf70f53e4e0836874a72
candidateSelectedPathsUsed: false
workingTreeUsed: false
dependencyManifestSeedsUsed: false
excludedLockfiles: bun.lock
historical production seeds: 51
all production seeds: 73
resolved production closure files: 1060
universe files: 1060
production lines: 265736
steady-state runtime lines: 265736
direct-rebuild tool lines: 0
test/browser/fixture/measurement lines: 0/0/0/0
production import edges: 4276
multi-node strongly connected components: 3
computed imports: 0
unresolved imports: 0
non-allowlisted external imports: 0
out-of-universe responsibility sites: 0
```

Per-Work coverage:

| Work | Materialized | Missing future exact paths | Closure count | Closure SHA-256 | Uncovered | New bounded |
| --- | ---: | --- | ---: | --- | ---: | ---: |
| B1 | 36 | none | 1060 | `956d4c3c66405d79a55bae6daa384e6878f66b1278d3c3c3b7a1862bc9cba556` | 0 | 0 |
| Native Host binding | 15 | none | 1059 | `33f25eac66b71e98d766ceeabf8d16e4f24f578ee57df62e7d63fa06434fbad2` | 0 | 0 |
| execution leaf | 6 | `productExecutionBoundary.ts` | 1059 | `33f25eac66b71e98d766ceeabf8d16e4f24f578ee57df62e7d63fa06434fbad2` | 0 | 0 |
| State Store | 6 | `productStateStore.ts` | 1059 | `33f25eac66b71e98d766ceeabf8d16e4f24f578ee57df62e7d63fa06434fbad2` | 0 | 0 |
| Coordinator/facade | 10 | `productExecutionCoordinator.ts`, `productStateDiagnostics.ts` | 1059 | `33f25eac66b71e98d766ceeabf8d16e4f24f578ee57df62e7d63fa06434fbad2` | 0 | 0 |

Historical anchors remain exact: `ProductControlPlane.ts=5036`, literal gateway `=115`, facade
shape methods `=42`, unique RPC methods `=36`, Product tables `=21`, transaction wrapper calls
`=44`, volatile variables `=3`, production monolith importers `=10`.

Semantic B0 totals: Product database construction modules/sites `2/3`; SQL writer modules/sites
`2/72`; unknown writer sites `2`; writers outside Store are the historical
`selectionSchemaCoordinator.ts` and `ProductControlPlane.ts`; Product tables `21`; durable state
machines `1`; Native Host filesystem mutation sites `18`; Native Host Package lifecycle writes
`0`; raw transaction exports `0`; Product database count `1`; literal gateway count `1`;
canonical Product database consumers `0`; noncanonical resolution sites `6`. These B0 values are
historical observations, not passing B1/C gates.

The immutable-commit B0 report bytes have SHA-256
`901f5547f0115f0387f4286dcdd152ad7462b7e048ca11c85262c477b5025ddb` and size `1,007,052`
bytes. Two post-commit runs were byte-identical and their embedded instrument digests bind the
immutable bytes above.

## Candidate instrument digests

```text
measure-complexity-v2.mjs  4e64f425e60051155c722769133894919fe82944a79e236ed5ff59ba0b47217f
complexity-universe-v2.json  1c4864cb3096d3d4d3fea090feecea06db3ff6d095bb01ef3c4fe8e5e6d5ddfc
```

These exact digests are present in the dedicated commit. Any later byte change invalidates this B0
output and requires a new version, QbD and three-point remeasurement.

## Negative fixtures

The focused test runs each fixture independently and requires non-zero exit with the matching
diagnostic:

- omitted allowed path;
- newly materialized bounded path;
- computed import;
- unresolved import;
- newly externalized import;
- out-of-universe responsibility move.

Result: `1` test file, `7` tests passed.

## V1 byte proof

Both files compare byte-for-byte equal to commit
`45df49a6afde882d32c1dcd00457c7787d227e4a`:

```text
scripts/product-truth/measure-complexity.mjs
  cf5e096cb69e584573bde307cf8677de9bca9ed7705b2f31fa3fb5783a18fd4f
scripts/product-truth/complexity-universe-v1.json
  2bcbf41aa0a5f56be2da892caf4af4be583c45ece18fe3d1e627fdda86c9d79f
```

## Verification

- `bun run --cwd scripts test -- product-truth/measure-complexity-v2.test.ts` — exit `0`, 1 file / 7 tests.
- `bun run --cwd scripts typecheck` — exit `0`.
- Two executions of `node scripts/product-truth/measure-complexity-v2.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72`, followed by `cmp -s` — exit `0`, byte-identical.
- `cmp -s` for each v1 file against `git show 45df49a6...:<path>` — exit `0` for both.
- `git diff --check` plus `git diff --no-index --check /dev/null <new-file>` for every untracked
  candidate file — no whitespace findings.
- Final path audit — only the allowed measurement/test/fixture/handoff paths above are present.

No destructive tool, Desktop, Service, Native Host, Provider, live store or canonical user state was
read or run.

## Immutable proof and next stop

- Dedicated meter-only commit full SHA: `b5bffb804c893a093f8ea76f0be878e3ef957731`.
- `git show --stat` contains only the nine allowed meter/config/test/fixture paths above.
- Post-commit B0 runs remain byte-identical with report SHA-256
  `901f5547f0115f0387f4286dcdd152ad7462b7e048ca11c85262c477b5025ddb`.
- Script/config digests remain exactly
  `4e64f425e60051155c722769133894919fe82944a79e236ed5ff59ba0b47217f` and
  `1c4864cb3096d3d4d3fea090feecea06db3ff6d095bb01ef3c4fe8e5e6d5ddfc`.
- After this handoff is committed, the worktree is clean and the meter commit remains unchanged.
- Different-actor review at `reviews/product-truth-complexity-v2.md`: **not yet performed**.

No B1 production assignment is authorized until those four conditions are complete and the
different-actor review verdict is `PASS`.
