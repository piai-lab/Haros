---
type: "Implementation Review"
title: "Review: Direct-first public B1 repair candidate"
work: "../work/direct-first-public-b1.md"
handoff: "../handoffs/direct-first-public-b1.md"
verdict: "FAIL"
revision: "review-direct-first-public-b1-repair-r1"
actor_id: "direct_first_public_b1_repair_review"
dispatch_receipt: "ba57e0889569452989684aebddf12779"
predecessor_receipt: "3f690240ae57495293a232e7ea668341"
predecessor_output: "../handoffs/direct-first-public-b1.md"
reviewed_candidate: "452b587208287b3383eff8eeecc5a3fd0d1baecc"
reviewed_parent: "62a6f013361623ae56e9eb6cbacb30113457c14b"
reviewed_tree: "dd5561eff91cce87bc90c42732056da91ddb828d"
---

# Review: Direct-first public B1 repair candidate

## Verdict

`FAIL` / changes requested for immutable candidate
`452b587208287b3383eff8eeecc5a3fd0d1baecc`.

The predecessor operation is completed, resolves to the required linked handoff, and uses
implementer actor `direct_first_public_b1_repair_r1`, distinct from reviewer actor
`direct_first_public_b1_repair_review`. The handoff links back to this Work and freezes the same
candidate. The real parent-to-candidate diff contains exactly twelve authorized paths and no
out-of-scope path; the candidate tree is `dd5561eff91cce87bc90c42732056da91ddb828d`.

The retained packaged fresh/reopen/same-home restart chain, actual Product/Service SQL statement
mapping, static 1,263-case manifest, and reviewer-owned 69-path control-reference closure all
reproduce. They do not overcome three material findings: the required Scripts final gate fails, the
destructive sink can truncate content that no longer matches the sealed bytes, and successful apply
intentionally leaves database and Package retirement artifacts that the controlling Work and
Interface require to become absent.

No code repair, runtime/session record, Campaign status, Evidence ledger, commit, branch, worktree,
push, merge, publication, or maintainer canonical home was touched. No fix is approved by this
review.

## Findings

### P0 — the required Scripts final gate fails an exact profile-inspect fault case

The exact missing final command completed with exit `1`: 1 file failed, 2 passed; 1 test failed and
88 passed. The failed case was
`first-public-capability-verifier.test.ts > directly injects every before/after fault of the exact
profile-inspect owner`. For case
`profile-inspect.relstat-source-entry:before:2`, the test required the selected
`PORT_FAULT` to be the terminal error, but received an `ENOENT` while lstat-ing the verifier scratch
run directory. The assertion is at
`scripts/product-truth/first-public-capability-verifier.test.ts:376-381`.

This is not a cosmetic test-name mismatch. The Work makes every actual operation ordinal's
before/after fault and full terminal disposition part of the exact execution bijection. The static
manifest still generates 10 owners, 146 operations, 87 states and 1,263 unique cases, but the
required executable verifier does not preserve the selected fault disposition for this case. PASS
requires zero failed tests and a complete execution bijection, so this final-gate failure alone
rejects the candidate.

### P0 — the final destructive sink can erase unknown same-inode content

`removeDatabaseTarget` rehashes the retirement path and compares the full seal, then closes that
inspection descriptor before calling `shredSealedFile`
(`scripts/product-truth/direct-first-public.ts:1982-2001`). `shredSealedFile` opens the path again
and, immediately before `ftruncate(0)`, checks only `dev`, `ino`, and `size`
(`:1917-1946`). It does not compare the sealed SHA-256, mtime, mode, or link count on the descriptor
that performs the destructive write. The same helper is used for Package entries at
`removeSealedPackageEntry`.

Therefore a separate writer can change the already-renamed inode in place to different bytes of the
same length after the full-seal read closes and before the write descriptor truncates it. Those
bytes retain the accepted inode and size and are destroyed. The new no-hook tests cover path
replacement by renaming the sealed inode aside and creating a new inode; they do not cover this
same-inode content replacement. This violates the Interface requirement that any content change
stop before mutation and the assignment's requirement that unknown bytes are never deleted.

### P0 — successful apply leaves retirement artifacts instead of reaching exact absence

The repair changes deletion into permanent zero-byte receipts. Database members are renamed to
`<member>.retiring-<sha256>-<size>`, truncated, and deliberately retained
(`scripts/product-truth/direct-first-public.ts:1883-1914,1974-2011`). Fresh inspection treats a
zero-byte database receipt as neither resumable nor blocking. Package entries are likewise renamed
to `.retiring-*`, truncated, and classified as terminal `retired`; `classifyPackage` then omits the
retired directory from its target list (`:769-800,1170-1200`). The focused Package test explicitly
requires `.discarding/<generation.digest>/` and its two zero-byte files to remain
(`scripts/product-truth/direct-first-public.test.ts:2102-2115`).

That behavior directly contradicts the binding contracts:

- Work done condition requires the sealed Package graph
  `full -> manifest-only -> empty -> absent` and says there is no hidden copy or output artifact
  (`work/direct-first-public-b1.md:277-302`).
- The direct-rebuild Interface requires exact unlink/rmdir edges, removal of `.discarding` when
  empty, a final receipt only after the whole allowlisted set is absent, and clean absence after the
  final target disappears (`interfaces/direct-first-public-rebuild.md:167-190,202-209`).

Stable enumeration fixes the prior random hidden-tombstone bug only for the nonterminal interval; it
does not authorize a new persistent receipt state or redefine `absent`. The handoff cannot broaden
or replace the Work and Interface. A repaired candidate must either complete the authored graph to
absence without deleting unsealed bytes or obtain an authorized contract change before Product
acceptance.

## Independently accepted closures

### Actual Product/Service SQL evidence

The synthetic production witness loops and public layer-factory ports are gone. The changed tests
intercept the real Node SQLite statement boundary: Service proxies each real `prepare(...).run/all`
and Product proxies each real schema `exec`. The focused two-file run passed 67/67 tests, including
31 Service schema statement ordinals at both fault sites, Product's 27 statement ordinals, rollback
to zero application objects, and real SIGKILL/reopen convergence. This closes the prior synthetic
SQL-event finding for the exercised Node path.

### Production-callable control removal and 69-path closure

Normal production exports accept no witness/test hook, raw target callback, barrier, mutation
closure, or renderer-global Symbol. The seven formerly affected files have zero matches for the
failed Review union, extended with `witness`, `__omnimind`, and `process.__`. Instrumentation types
remaining in the direct-tool modules are private and their production-local variables are
unassigned; verifier tests inject only by transforming runtime-generated copies in an OS temporary
directory.

The reviewer-owned enumerator parsed every `omp-flow-production-boundary-v1.production` row from
the five authored Works, without candidate/config filtering. Its literal inline source SHA-256 is
`5fe5314cef33aa9a5742645ffe1d0c70ff4b766ef4c67d0a2db4d5a640fae318`. Results:

- universe: 69 paths; 56 present and 13 authored-absent;
- newline-joined sorted universe SHA-256:
  `d6014dfcaf7f99050250f5a0b448a076771d250da27484bc88b66fd9c60399bf`;
- 562 canonical raw-adapter/control line records; JSON SHA-256:
  `3ede67a1101ed6d9f18ae0015212a13ab9f16d62fdc561d2ae5587ae0a38158c`;
- forbidden/unexplained control records: 0.

The fully expanded command was a Node `-e` program that parsed the five exact Work fences, sorted
and deduplicated `production[].path`, read all present files line-by-line, recorded
`{path,line,kind,spanSha256}` for filesystem adapter names and the control union
`TestHooks|WitnessPort|afterBoundary|Symbol.for(|globalThis[|witness|__omnimind|process.__`, and
hashed the universe and ordered records with Node `crypto`. Runtime versions were Node `v25.9.0`
and Bun `1.3.14`.

### Frozen universe identity

Direct generation from the unchanged catalog returned exactly 10 owners, 146 operations, 87
states, and 1,263 unique case IDs: 87 normal, 1,026 fault, 85 race, and 65 kill. Sorted case-ID JSON
SHA-256 was `0b04c0c18f62f213f9ea6f7479a2c5f0ab5e306541c8891aee2d857acdf7f61f`.
The catalog source remains the immutable v7 interface and was not expanded. The static
`assertExecutedCaseBijection` accepts the exact list and rejects missing/extra/duplicate lists, but
the executable final gate finding above prevents claiming the required behavioral bijection.

### Retained exact-provenance packaged replay

The retained ZIP, DMG and replay verifier match the handoff and `artifact-manifest.json` exactly:

- ZIP: 169,203,720 bytes,
  `6ecbbb17dd66e2facc9c46da05620242a0e320d1ca6bd82750dab01a9da7cf23`;
- DMG: 169,178,146 bytes,
  `fe0913ee51c001a6884dde2ca933f17417514e2c7c5e30ce53c54ec6454d6fe5`;
- replay verifier:
  `e7ef3469aca291ff9146a799869a6a9181f8487dd479356e95842a51165fd14d`;
- candidate `bun.lock`:
  `05960c3b0c2b51ca90ad5f2411ff6eb4c24356a028f72ed0fb2ca364347bed91`.

The reviewer replayed `prepare`, `fresh`, `reopen-fresh`, `restart`, and `reopen-restart` in order.
All exited 0. Both launches satisfied all five readiness predicates with exactly one Service, one
Native Host and one renderer, and stopped the complete process tree by SIGTERM. Both read-only
reopens observed Product/Service generation 1, mode `0600`, zero Product runs, Automation runs and
outbox rows, all six retired database bundle members absent, and unchanged database identities
across the same-home restart.

## Exact commands and results

- `git diff --name-status --no-renames 62a6f013... 452b5872...` — 12 paths, all authorized;
  default-reject comparison against the Work production fence plus 16 Design verification rows:
  12 accepted, 0 rejected.
- `git diff --check 62a6f013... 452b5872...` — exit 0.
- From `scripts`,
  `bun run test -- product-truth/direct-first-public.test.ts product-truth/first-public-capability-verifier.test.ts release-update-policy.test.ts`
  — exit 1; 1 failed file / 2 passed, 1 failed test / 88 passed.
- From repository root,
  `bun run vitest run apps/service/src/persistence/Layers/Sqlite.test.ts apps/service/src/product/ProductControlPlane.test.ts --maxWorkers=1 --no-file-parallelism`
  — exit 0; 2 files / 67 tests.
- From `apps/web`,
  `bun run vitest run src/composerDraftStore.persistence.test.ts --maxWorkers=1 --no-file-parallelism`
  — exit 0; 1 file / 45 tests.
- Static manifest generation plus `assertExecutedCaseBijection` — exit 0; exact
  10/146/87/1,263 and 87/1,026/85/65 counts.
- Retained packaged five-command replay — all five commands exit 0 with the facts recorded above.

## Return boundary

Review path: `.omp-flow/tasks/08-07-product-truth-consolidation/reviews/direct-first-public-b1.md`.
Verdict: `FAIL`. Reviewer actor: `direct_first_public_b1_repair_review`. Dispatch receipt:
`ba57e0889569452989684aebddf12779`. Completed predecessor:
`3f690240ae57495293a232e7ea668341`, output
`.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/direct-first-public-b1.md`.
Explicitly allowed fix by this review: none.
