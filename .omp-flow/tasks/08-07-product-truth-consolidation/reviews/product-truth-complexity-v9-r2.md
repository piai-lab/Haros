---
type: "Implementation Review"
title: "Review r2: Narrow Product-truth complexity v9 measurement"
work: "../work/product-truth-complexity-v9.md"
handoff: "../handoffs/product-truth-complexity-v9.md"
verdict: "FAIL"
actor_id: "product_truth_complexity_v9_review_r2"
dispatch_receipt: "e2df1132541e4e408f05c7b30e213232"
predecessor_receipt: "b37ff42180f742a5b909ce16fbab558a"
predecessor_output: "../handoffs/product-truth-complexity-v9.md"
reviewed_candidate: "ec416f7fe6eeea908fb80bbd6c716bc01e9860bd"
reviewed_handoff_commit: "afb47bd5944b81ad7a3e9a99e6ede30edbc5034b"
reviewed_parent: "f12d654c5447c1c2192bdd3e43bcbd41a33f2769"
accepted_design: "f110fb66006768074ca192bb94024632d16c09dd"
report_sha256: "4d02b9c880331e70cc9440e8461d3bfea280fa8b1a784c4df838f16491c4ff46"
---

# Review r2: Narrow Product-truth complexity v9 measurement

## Verdict

`FAIL` for immutable candidate `ec416f7fe6eeea908fb80bbd6c716bc01e9860bd` and linked handoff
commit `afb47bd5944b81ad7a3e9a99e6ede30edbc5034b`.

The candidate closes the three exact examples returned by the first Review: existing unlisted
`apps/**` blob drift plus new `.mts`/`.json` members, type-only export disposition, and recursively
duplicate JSON keys in predecessor handoff/Review report blocks. All authored gates and the adjacent
finite controls below pass. One candidate-independent member family remains a hard false accept,
however: changed production/adopted-source paths outside `apps/**`, `packages/**`, `scripts/**` and
root `package.json` are silently skipped. That unresolved P1 prevents acceptance and B1 entry.

## Findings

### P1 — the changed-path gate still allows unlisted adopted production and dependency bytes

The [Work](../work/product-truth-complexity-v9.md) makes the selected Work's exact production
members the sole mutable set, requires an unlisted path to fail, and makes adopted-source byte
closure hard. The [Interface](../interfaces/product-truth-complexity-v9.md) repeats
`unlistedOrNewMember: fail` and defines dependency inputs as exact manifests, `bun.lock`, and pinned
adopted-source digests. Root [`README.md`](../../../../README.md) identifies
`assets/packages/pi-todo-0.81.1/todo.ts` as an exact transplanted production adoption.

The repair computes the complete candidate/predecessor changed-path set, but then skips every path
for which `productionOrDirectToolPath` is false. In
[`measure-complexity-v9.mjs`](../../../../scripts/product-truth/measure-complexity-v9.mjs), lines
974–993 define that predicate as only root `package.json` or paths below `apps/`, `packages/`, and
`scripts/`, after exclusions; lines 1095–1113 use `!productionOrDirectToolPath(path)` as an
unconditional `continue`. `assets/**`, `patches/**`, and root build inputs are therefore allowed by
default rather than being classified as selected production or an explicitly bounded
non-production output.

A read-only reviewer fixture appended one newline to the exact adopted Package source while keeping
the selected Work, baseline and evidence arguments unchanged:

```sh
PROBE_FIXTURE='{"extends":"exact-predecessor-positive","appendToFiles":{"assets/packages/pi-todo-0.81.1/todo.ts":"\n"}}' \
node --input-type=module -e '
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
const original = fs.readFileSync;
fs.readFileSync = function (path, options) {
  if (String(path).endsWith("/reviewer-probe.json"))
    return options === "utf8" ? process.env.PROBE_FIXTURE : Buffer.from(process.env.PROBE_FIXTURE);
  return original.apply(this, arguments);
};
syncBuiltinESMExports();
const args = process.argv.slice(1);
process.argv = [process.execPath, "scripts/product-truth/measure-complexity-v9.mjs", ...args];
await import("./scripts/product-truth/measure-complexity-v9.mjs");
' -- --fixture reviewer-probe --work direct-first-public-b1 \
  --ref 7582170a277477ba0d71cf70f53e4e0836874a72 \
  --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
```

The meter exited `0` and emitted:

```json
{
  "comparison": {
    "enabled": true,
    "candidateWorkId": "direct-first-public-b1",
    "exactOutsideEquality": true
  },
  "dependencyPhase": "baseline",
  "dependencyClosure": "b3989b0c513f830a18b6803c85455acada90b287702370207aaa3e3427f710f6"
}
```

The same bounded changed-path probe also exited `0` for mutation of
`assets/packages/pi-todo-0.81.1/manifest.json`, the adopted dependency patch under `patches/**`,
`turbo.json`, `tsconfig.base.json`, and addition of
`assets/packages/reviewer-unlisted.ts`. These are not expression, alias, callback, control-flow or
domain-semantic cases; they are the same finite path/mode/blob membership family as the prior P1.

**Consequence.** A later Product candidate can modify shipped adopted Package source, its manifest,
an adopted dependency patch or root build authority outside the selected Work while v9 certifies
both `exactOutsideEquality=true` and the unchanged hard dependency closure. The selected Work is
therefore not the sole mutable production set, and the report can bind an incorrect hard fact.

**Required remedy.** Make changed-path handling fail closed: every changed path not in the selected
production members must reject unless it belongs to an explicit, candidate-independent permitted
test, measurement, fixture or current-output category. Bind the existing adopted-source closure to
the actual accepted-authority target bytes, rather than only to authority metadata whose digest is
unchanged when those target bytes change. Add negative fixtures for an existing adopted production
blob, a new unlisted adopted/root asset, and an adopted dependency patch, with the existing
non-production controls remaining green. This is a repair to the existing membership/dependency
hard facts and must not introduce raw/global/alias/callback/RHS/CFG grammar.

No other material finding was found in the assigned finite families.

## Assignment and immutable boundary

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`.
- Entry: `work/product-truth-complexity-v9.md`; output:
  `reviews/product-truth-complexity-v9-r2.md`; role: reviewer.
- Reviewer actor/receipt: `product_truth_complexity_v9_review_r2` /
  `e2df1132541e4e408f05c7b30e213232`.
- Completed predecessor receipt `b37ff42180f742a5b909ce16fbab558a` resolves read-only to role
  `implementer`, state `completed`, actor `product_truth_complexity_v9_impl_r2`, the same Work entry,
  and output `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v9.md`.
  The implementer and reviewer actors differ.
- The handoff frontmatter links back to this Work, declares candidate `ec416f7f...`, actor
  `product_truth_complexity_v9_impl_r2` and the completed receipt. At handoff commit `afb47bd59...`,
  the Work blob is `44258f2a34d66731ed5819ff644cf121b83109d3` and the handoff blob is
  `48789c48b8fcd6483e534dd3b5cec8b00bb1325f`.
- Candidate parent is exactly failed-Review commit `f12d654c5447c1c2192bdd3e43bcbd41a33f2769`.
  Its repair diff has exactly 12 paths: ten new v9 fixtures plus the v9 meter and focused test.
  `git diff --name-status ec416f7f... afb47bd59...` contains only the assigned handoff.
- The pre-existing working-tree edits remain only `README.md`, `execution-brief.md`, and
  `missions/independent-omnimind-v1.md`; this Review did not modify them.

## Independent verification

### Authored tests, typecheck, syntax, formatting and diff

```text
bunx vitest run scripts/product-truth/measure-complexity-v9.test.ts
  PASS — 1 file, 63/63 tests; duration 94.87s

(cd scripts && bun run typecheck)
  PASS — tsc --noEmit

node --check scripts/product-truth/measure-complexity-v9.mjs
  PASS

git diff --name-only -z f12d654c5447c1c2192bdd3e43bcbd41a33f2769 ec416f7fe6eeea908fb80bbd6c716bc01e9860bd | xargs -0 bunx oxfmt --check
  PASS — 12/12 files

git diff --check f12d654c5447c1c2192bdd3e43bcbd41a33f2769 ec416f7fe6eeea908fb80bbd6c716bc01e9860bd
git diff --check d74bffb673a7869272a6e243a8c8a329fce69092 ec416f7fe6eeea908fb80bbd6c716bc01e9860bd
  PASS — no output
```

The working-tree blobs for the meter, config and focused test exactly equal their candidate blobs:
`a750cf4d3656f32eed61c519c699a266d33c768f`,
`b086411f652443a9c112a9da67a4ffa0b1790e26`, and
`318cfdcb97d4e168c8fbe47c6d63598eca7aa748`, respectively.

### Exact double B0 and handoff/report tuple

The exact official command was run twice:

```text
node scripts/product-truth/measure-complexity-v9.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
```

Both invocations exited `0`; `cmp` exited `0`. Each output is 148,897 bytes, with byte SHA-256
`b997bdd3142b5c669e98e76f41ba4d7588004127f3b0d1ca9dff17a1b290f66c` and decoded-report JCS
SHA-256 `4d02b9c880331e70cc9440e8461d3bfea280fa8b1a784c4df838f16491c4ff46`.
The handoff has exactly one v9 report block; its bytes plus final newline equal stdout, and its
frontmatter digest equals the JCS digest.

The tuple reproduces official evidence `5632f636...`, reviewed candidate `5c3e6199...`, handoff blob
`fd31a236...`, Review blob `fa047d2b...`, predecessor report digest `aa114aeb...`, implementer
`product_truth_meter_v7_r5`, reviewer `product_truth_meter_v7_review_r5`, and correlation receipt
`ac877c8dbc3a425b91129f153deb61f9`. It makes no identity-authentication claim. The report also
reproduces 69 production source members, 71 total frozen boundary members, 56 parsed sources, 578
literal records, and 11 declaration rows with exactly two present.

### Manifests and immutability

A read-only Node verifier over `git ls-tree`, `git cat-file` and path-sorted canonical records
reproduced:

- full v9 candidate artifacts: 47 records,
  `15e30df5191c9134e275cdd76da9349afe8b45e3ad66f63d49a46facbc8efa04`;
- v9 fixtures: 44 records,
  `4bd1dc794b3af56c98ed9313aff3cb62c044001320e952ffaa1d0b02ecef7f98`;
- r2 repair: 12 records,
  `f3415c4da21af4f29c7bdafacbc3515b28bd31177ec5e19992c09659961070d9`;
- v1–v8 accepted-tree history: 580 records,
  `a23165cc1330a12e69003a7f29177a229ce56a451cd3db20341bdd6f745854eb`, with every candidate
  mode/blob equal to the accepted Design tree.

The five production fence blocks are byte-identical between accepted Design and candidate. Their
independently reproduced JCS digests are, in authored order:

- `0e1551ebcdb8a47310e3ef56f9f7558ada452f5590d166551296eb359dd8faae`;
- `c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5`;
- `dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4`;
- `2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a`;
- `124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9`.

Strict Git-object validation found five local handoff links with zero missing targets, 45 unique-key
v9 JSON files, and exactly one complete unique-key report block. The 12-path repair and 47-path v9
artifact set contain no Product source, dependency, Work/Design/Decision/QbD/Review, or user-document
edit; the later handoff commit changes only the assigned handoff.

### Prior P1 reproductions and adjacent controls

- **Membership:** the authored existing unlisted blob, `.mts`, `.json`, frozen outside blob/mode and
  lifecycle negatives reject. Fresh `.cts`, `.yaml`, extensionless, existing-unlisted mode and
  deletion probes also reject. Selected-member mode/content changes and an unlisted test artifact
  pass as adjacent controls. The only unexpected passes are the outside-root production/adoption
  cases in the finding.
- **Value/type export disposition:** declaration-level and specifier-level type-only exports reject.
  Direct value export, alias, default, mixed type+value, value export whose public name is `type`,
  type-only plus separate value export, exported value with a local type namespace, and default
  alias with a merged type namespace pass. A type-only exported namespace and a runtime namespace
  without a value export reject. No unexpected false reject was observed.
- **Duplicate JSON keys:** authored top-level, nested handoff and Review report-block duplicates
  reject. Fresh Unicode-escaped equivalent keys reject at handoff top level, nested object, an
  object inside an array, and an appended Review report block. Unique evidence passes. No nested or
  escaping bypass and no adjacent false reject was observed.

The data-only config has exactly its eight approved digest/commit keys and contains no candidate
paths, declaration rows, counters, deltas, verdicts or predecessor selection. Source scans found no
v8 expression or semantic classifier and no `homedir`, `HOME`, `~/.omnimind` or absolute user-home
access. Every adversarial probe used in-memory Git snapshots; no real user home, destructive target,
provider, network or remote resource was read or changed.

## Review boundary and return

This verdict covers only the assigned Work, candidate `ec416f7fe...`, handoff `afb47bd59...`,
accepted Design/Interface and finite structural hard families. It does not request raw/global/alias/
callback/RHS/CFG authority, does not approve B1, and makes no Product behavior claim.

Return the membership/dependency false accept to the owning Work. No implementation or handoff was
repaired, and no substantive fix is approved by this reviewer.

## Dispatch identity

- review path: `.omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-truth-complexity-v9-r2.md`
- verdict: `FAIL`
- tests: authored 63/63, typecheck, syntax, formatting, double B0, tuple, manifests, historical/fence
  immutability and link/JSON gates all pass; one review-owned membership family fails
- actorId: `product_truth_complexity_v9_review_r2`
- receipt: `e2df1132541e4e408f05c7b30e213232`
- predecessor: `b37ff42180f742a5b909ce16fbab558a`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v9.md`
- explicitly allowed fix: none
