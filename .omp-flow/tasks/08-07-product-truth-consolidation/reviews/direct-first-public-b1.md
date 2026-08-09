---
type: "Implementation Review"
title: "Review: Direct first-public rebuild and immutable unsplit B1"
work: "../work/direct-first-public-b1.md"
handoff: "../handoffs/direct-first-public-b1.md"
verdict: "FAIL"
revision: "review-direct-first-public-b1-product-r2"
actor_id: "direct_first_public_b1_product_review"
dispatch_receipt: "4e09674cb24140dc9a552bb9e15c9bf5"
predecessor_receipt: "f457f4f3b7fa42d1b8e6174f680a2892"
predecessor_output: "../handoffs/direct-first-public-b1.md"
reviewed_candidate: "280976e44435d2331f589a9100397ba9d50446e3"
reviewed_parent: "cea92ba2ab2d99b20f138d45fe42c08ca95deb90"
reviewed_base: "f2a32c3abb84b6d76b6c3920fa139ffe6035bb5f"
---

# Review: Direct first-public rebuild and immutable unsplit B1

## Verdict

`FAIL` / changes requested for immutable Product SHA
`280976e44435d2331f589a9100397ba9d50446e3` (tree
`de03741a72a43908045d0559bc65310aa24c377e`).

The predecessor operation is completed, resolves to the linked handoff, and uses implementer actor
`direct_first_public_b1_alternate_impl`, distinct from reviewer
`direct_first_public_b1_product_review`. The handoff links back to the assigned Work and binds the
reviewed SHA. The real Git scope is exact: base-to-candidate contains 18 accepted paths, nine
production and nine verification, with zero out-of-scope paths. Product bytes at current `HEAD`
match the reviewed candidate.

The focused suites are green, but four material findings prevent acceptance. A real isolated
SIGKILL leaves deleted Package bytes in an unmodelled random tombstone and fresh inspection cannot
converge. The Service owner manufactures 62 schema-statement events around one opaque initializer,
so the claimed 1,263 real owner operations are not real at that owner. Production exposes verifier
control and raw paths to callers, including a global renderer hook. Finally, the packaged
fresh/reopen/restart claim has no retained artifact or executable transcript that this reviewer can
reproduce or bind to the reported hashes.

No product repair was made. No runtime/session record, Campaign status, Evidence ledger, commit,
branch, worktree, push, merge, publication, or maintainer home was touched.

## Findings

### P0 — SIGKILL inside the Package `rename -> hash/unlink` window leaves a hidden, non-convergent copy

`removeSealedPackageEntry` renames each sealed entry to a fresh random
`.NAME.discarding-${randomUUID()}`, hashes the renamed file, and only then unlinks it
(`scripts/product-truth/direct-first-public.ts:2047-2084`). Its `finally` restores the entry only
for a catchable in-process failure; SIGKILL cannot execute that restoration. The durable witnesses
surround the larger Package transition, not this internal rename-to-unlink interval. The existing
kill tests terminate after `apply.transition-package-node` or `package-entry-unlinked`, both after
the hidden file has already been removed.

An independent probe used a generated temporary HOME and a valid disposable Package with a 512 MiB
sparse entry, watched the Package root, and sent real SIGKILL as soon as the random entry tombstone
appeared. The child died by `SIGKILL`; the fresh process observed:

```text
sawDiscarding=true
stage=.discarding/<sealed-generation>/.entry.js.discarding-<uuid>, manifest.json
fresh inspect blockers=["PACKAGE_STATE_UNKNOWN"]
remove targets=[]
```

The temporary HOME was removed in `finally`. This is a direct counterexample to the Work's
requirements that abrupt kill at each Package graph edge converge by fresh inspect/apply, that
full/manifest-only/empty tombstones converge only through modelled digest rules, and that no hidden
copy exist (`work/direct-first-public-b1.md:281-285,292-302`). The same unobserved shape exists for
database removal at `direct-first-public.ts:1773-1821`, where a random same-directory tombstone is
also created and rehashed before unlink. The demonstrated Package path alone is sufficient for P0.

The repair must make the intermediate identity durable and enumerable/recoverable across process
death, or reduce the sink to a genuinely single identity-matched unlink, and add real kill coverage
inside every multi-step destructive interval. This requires a new candidate SHA and independent
review; no fix is authorized in this review.

### P0 — the Service schema fault matrix counts synthetic events, not 31 actual SQL statement operations

The frozen catalog declares `service.create-schema-statement` as
`G1Transaction+Ordinal -> SchemaStatementApplied` with atomicity `single-sql-statement`
(`interfaces/product-truth-complexity-v7.md:503`). Production instead emits all 31 `before` events
in a loop, invokes `initializeSystemCapabilitySchema` once as an opaque aggregate, then emits all 31
`after` events in another loop (`apps/service/src/persistence/Layers/Sqlite.ts:251-269`). No event
pair wraps an individual SQL statement.

Consequently, a fault at any `before` ordinal happens before every schema statement; a fault at any
`after` ordinal happens after every schema statement. The test at
`apps/service/src/persistence/Layers/Sqlite.test.ts:99-166` only selects each manifest case, throws
when its synthetic event is observed, and checks that the case ID was appended. It never proves
that the selected ordinal is the corresponding real SQL operation. The normal witness test likewise
compares emitted labels with manifest labels, not event-to-operation mediation.

This falsifies the handoff's statements that every count comes from real owner calls, that no
expected-ID loop was used to mark execution, and that all 1,263 cases have real owner witnesses
(`handoffs/direct-first-public-b1.md:93-126`). It also violates the Work's required actual-operation
ordinal bijection, complete prefix, fault terminal disposition, and hard rejection of coarsened
operations (`work/direct-first-public-b1.md:307-328`). Green 92/92 Service tests reproduce the
synthetic event surface; they do not close this source-level mismatch.

### P0 — production callers can inject/suppress verifier behavior and receive raw destructive paths

The Work requires owner-private verifier ports, typed intent/sanitized results, no raw path or
adapter escape, and no production caller ability to choose or suppress verifier events
(`work/direct-first-public-b1.md:67-72,307-314`). The candidate exposes the opposite:

- `scripts/product-truth/direct-first-public.ts:415-433` publicly exports
  `DirectFirstPublicTestHooks`, `DirectApplyWitnessPort`, an `afterBoundary` callback receiving a raw
  target string, and a barrier callback receiving a `replaceTarget` mutation closure. Public
  `applyDirectFirstPublic(..., hooks?)` accepts this control at `:2246-2249`.
- `scripts/product-truth/chromium-leveldb.ts:17-51,674,797-798` and
  `scripts/product-truth/database-lock.ts:45-63,136-562` export and accept equivalent witness ports;
  `apps/service/src/persistence/Layers/Sqlite.ts:28-42,352-355` and
  `apps/service/src/product/ProductControlPlane.ts:108-145,5094-5099` expose them on normal
  production layer factories.
- `apps/web/src/composerDraftStore.ts:63-80` reads a process-global
  `Symbol.for("omnimind.composer-draft-witness")` before and after store effects. Any renderer code
  that knows the stable symbol can install a callback, throw during ordinary production operations,
  or alter the observed prefix. The verification test uses that same global injection path.

This is not merely an exported test type: these callbacks execute inline at destructive/runtime
sinks and can throw or mutate between checks. It is a public raw-capability leak and unmediated
effect, which the Work classifies as a hard B1 rejection.

The reviewer-owned deterministic inventory parsed every
`omp-flow-production-boundary-v1.production` block across the five Works into a 69-path fixed
universe (56 present, 13 declared-but-absent; sorted-universe SHA-256
`d6014dfcaf7f99050250f5a0b448a076771d250da27484bc88b66fd9c60399bf`). It scanned the full
present universe without candidate/config filtering for filesystem adapters and verifier-control
references. It produced 377 canonical hits and 86 verifier-control records; their canonical JSON
SHA-256 is `3a13af789d3a5c06cee112ffc192f0b68202f3227d67f548ba1be12142670048`.
The complete unexplained set is the line-addressed set matching `TestHooks`, `WitnessPort`,
`afterBoundary`, `Symbol.for(`, or `globalThis[` in these seven files:

```text
apps/service/src/persistence/Layers/Sqlite.ts:28,38,80,204,238,289,354
apps/service/src/product/ProductControlPlane.ts:108,119,131,145,836,869,931,946,5098
apps/web/src/composerDraftStore.ts:63,64,72,74
scripts/product-truth/chromium-leveldb.ts:17,30,51,674,797,798,892,909
scripts/product-truth/database-lock.ts:45,63,75,93,136,234,304,327,379,435,470,535,562
scripts/product-truth/direct-first-public.ts:415,416,420,423,437,449,460,474,561,1121,1421,1433,
  1450,1554,1776,1791,1811,1827,1955,2053,2059,2078,2092,2119,2126,2137,2162,2170,2177,
  2188,2210,2224,2226,2237,2248,2310,2371,2451
scripts/product-truth/sqlite-classifier.ts:37,50,62,79,95,294,1124
```

The fully expanded enumeration command was a Node `-e` program that: globbed the five exact
`.omp-flow/tasks/08-07-product-truth-consolidation/work/*.md` files; parsed every fenced JSON
`omp-flow-production-boundary-v1` block; sorted/deduplicated each `production[].path`; read every
present file line-by-line; emitted canonical `{path,line,text}` records for the regex union
`TestHooks|WitnessPort|afterBoundary|Symbol\\.for\\(|globalThis\\[` and filesystem operation names
`readFile|writeFile|open|rename|unlink|rm|mkdir|readdir|stat|lstat|realpath|symlink|link`; and hashed
the sorted universe and canonical unexplained JSON with Node `crypto.createHash("sha256")`.
Runtime was Node `v25.9.0`; Bun was `1.3.14`. Because 86 references remain unexplained and several
are conclusively public, the required zero-unexplained raw-reference closure fails; no meter result
can substitute for it.

### P1 — the packaged fresh/reopen/restart proof is not independently reproducible from the handoff

The Work requires an isolated generated-home packaged Electron→Service→Host fresh/open/reopen and
restart proof with exact g1 state and recorded commands, exit codes, and sanitized results
(`work/direct-first-public-b1.md:414-420`). The handoff reports ZIP/DMG SHA-256 values and prose
readiness outcomes (`handoffs/direct-first-public-b1.md:217-232`), but provides no artifact path,
build command, launch command, captured readiness transcript, generated-home layout, or retained
read-only reopen observation. Neither reported artifact is present in the repository; the only ZIPs
found are unrelated cached OpenCode brand assets.

A hash with no available byte source cannot bind the claimed journey to the reviewed SHA, and prose
cannot be replayed as independent verification. Because the candidate already has three P0 product
failures, this review did not create a replacement distributable and does not convert a new local
build into evidence for the unavailable producer artifact. A future candidate handoff must retain a
sanitized, replayable artifact/command/transcript chain and the independent reviewer must rerun the
fresh, reopen, shutdown, and same-home restart journey.

## Independent verification

### Operation, authority, and scope

- Read-only resolution of `.omp-flow/.runtime/operations/f457f4f3b7fa42d1b8e6174f680a2892.json`
  confirmed a completed implementer operation, correct Bundle/Work/output, and actor distinct from
  this reviewer. Read-only resolution of this review receipt confirmed the assigned reviewer role,
  output boundary, and predecessor. The CLI `operation show` could not be used because this shell had
  no active task; selecting one would have modified forbidden session state.
- `git log --format='%H %P' -3 280976e...` confirmed candidate → `cea92ba...` → base
  `f2a32c...`; `git rev-parse 280976e...^{tree}` returned the handoff tree
  `de03741a72a43908045d0559bc65310aa24c377e`.
- `git diff --name-status --no-renames f2a32c... 280976e...` returned exactly the 18 paths recorded
  by the handoff. Parsing them against the Work production fence and the Design's exact B1
  verification rows produced nine production, nine verification, zero rejected, zero deletion,
  rename, mode, lifecycle, dependency, lockfile, meter, runtime, or Harness changes.
- `git diff --check f2a32c... 280976e...` — PASS. Initial and final pre-Review
  `git status --short` were clean.

### Focused executable gates

- From `scripts`,
  `bun run test -- product-truth/direct-first-public.test.ts product-truth/first-public-capability-verifier.test.ts release-update-policy.test.ts`
  — PASS, 3 files / 87 tests.
- From repository root,
  `bun run vitest run apps/service/src/config.permissions.test.ts apps/service/src/native-host/executionBoundary.test.ts apps/service/src/opencode/liveJourneyProbe.test.ts apps/service/src/persistence/Layers/Sqlite.test.ts apps/service/src/product/ProductControlPlane.test.ts --maxWorkers=1 --no-file-parallelism`
  — PASS, 5 files / 92 tests.
- From `apps/web`,
  `bun run vitest run src/appSettings.test.ts src/bootstrap.test.ts src/components/chat/ComposerImageAttachmentChip.test.tsx src/composerDraftStore.attachments.test.ts src/composerDraftStore.persistence.test.ts src/lib/composerImageSource.test.ts --maxWorkers=1 --no-file-parallelism`
  — PASS, 6 files / 85 tests.
- The isolated 512 MiB sparse-Package SIGKILL probe described under finding 1 — FAILS candidate
  convergence exactly as recorded; child signal `SIGKILL`, hidden random tombstone retained, fresh
  inspect `PACKAGE_STATE_UNKNOWN`. The probe used only a just-created temporary HOME, restored
  process environment, and recursively removed that exact temporary directory in `finally`.
- The deterministic 69-path raw-reference inventory described under finding 3 — FAILS the required
  zero-unexplained closure with 86 verifier-control records. A first exploratory parser incorrectly
  treated the fenced JSON as Markdown list rows and returned an empty universe; it was discarded,
  corrected to parse the authoritative JSON, and is not evidence.

These green tests establish that the submitted test surface is reproducible. They do not override
the destructive counterexample, synthetic operation mapping, public capability leakage, or missing
packaged evidence.

## Review boundary and required return

This review covers only immutable Product SHA
`280976e44435d2331f589a9100397ba9d50446e3` against the linked Work, handoff, PRD, Design,
decisions, interface, destructive safety boundary, frozen verifier universe, and exact B1 path
authority. It does not approve any repair. The owner must create a new immutable candidate that
closes all findings, regenerate truthful owner evidence, retain replayable packaged proof, and send
it to a different reviewer.
