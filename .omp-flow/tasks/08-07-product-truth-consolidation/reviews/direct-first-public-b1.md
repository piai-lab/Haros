---
type: "Implementation Review"
title: "Review: Direct first-public rebuild and immutable unsplit B1"
work: "../work/direct-first-public-b1.md"
handoff: "../handoffs/direct-first-public-b1.md"
verdict: "FAIL"
revision: "review-direct-first-public-b1-r1"
actor_id: "direct_first_public_b1_r1"
dispatch_receipt: "77164ccecd874330880e8da1ca9ad7b4"
predecessor_receipt: "46e701675c3d4fb4b4ff4f9ecb1df1c0"
predecessor_output: "../handoffs/direct-first-public-b1.md"
reviewed_candidate: "50deefc1f8e904805c5c990756f3048de33c7ad5"
reviewed_parent: "d6bef1191b906d48f4312c6108318d9d467a086f"
---

# Review: Direct first-public rebuild and immutable unsplit B1

## Verdict

`FAIL` / changes requested for exact immutable candidate
`50deefc1f8e904805c5c990756f3048de33c7ad5`.

The predecessor operation is completed, resolves to the linked handoff, and uses implementer actor
`direct_first_public_b1_i6`, distinct from reviewer `direct_first_public_b1_r1`. The handoff links
back to the assigned Work and binds this exact candidate. The frozen meter, source-closure and
focused test claims are reproducible, but they do not cover four material defects below: the
production Product composition opens the wrong database path; ordinary runtime does not refuse
retired Product/Web state; apply can delete an unclassified replacement after its final
classification; and the required process-quiescence adapter is Unix-only.

No repair was made in this review. The candidate must return to implementation, and the runtime
legacy-refusal conflict must first return to the owning Design/work-map/meter authority rather than
being hidden from the frozen scan.

## Findings

### P0 — production Product composition opens `<lane>/product.sqlite`, outside the canonical store

The canonical Product path is `<lane>/stores/product.sqlite`, but the production native-host layer
constructs `path.join(input.stateDir, PRODUCT_DATABASE_FILENAME)` and
`path.join(stateDir, PRODUCT_DATABASE_FILENAME)` in
`apps/service/src/native-host/executionBoundary.ts:716` and `:724`. Those expressions resolve to
`<lane>/product.sqlite`. The latter value is also passed to Product Package lifecycle startup.
`NativeHostProductControlPlaneLive` is the layer composed by the running Service, so the correct
`resolveProductDatabasePath(stateDir)` implementation elsewhere does not save the production path.

The B1 focused test uses the resolver in a recovery fixture but does not assert the actual live-layer
composition. The frozen meter counts the filename and cannot distinguish its containing directory.
Thus the handoff's canonical-store claim and Work done conditions A7/A8 are false in the production
entry point: a first start can create a second root-level Product store while inspect/apply reasons
about `<lane>/stores/product.sqlite`.

Repair requires adding production `apps/service/src/native-host/executionBoundary.ts` to the
authorized Work/map boundary, using the canonical resolver for both Product control plane and
Package lifecycle, and testing the concrete composed path. It necessarily produces a new candidate
SHA and new B1 measurement.

### P0 — ordinary runtime neither refuses retired Product state nor checks old Web generations

The linked Design requires exact, presence-only refusal before opening/hydrating current state.
Production does not implement it:

- `openValidatedProductDatabase` in
  `apps/service/src/product/ProductControlPlane.ts:814-832` opens or creates the current file without
  first checking retired `product-state-v1.sqlite` main/WAL/SHM identities. The Service config check
  only covers the retired Service `state.sqlite` family.
- `readOrCreateComposerDraftEnvelope` in `apps/web/src/composerDraftStore.ts:101-108` reads only g1.
  When g1 is absent it immediately writes g1, without checking v1 or v2. The test named
  `does not probe or import an old draft key` at
  `apps/web/src/composerDraftStore.persistence.test.ts:206-214` explicitly locks in this behavior.

With an old Web key present, normal startup therefore creates g1 and continues. The direct-first
inspector subsequently sees legacy plus current state as contradictory and refuses apply. This is
not merely a missing diagnostic: ordinary startup has mutated the state that the one-time rebuild
needed to classify, contrary to PRD R6, the Design's Product/Web creation rules, and Work A7/A8.

There is also a real canonical-input conflict. The frozen B1 meter and Work require
`legacyRuntime = []` and describe all retired identities as tool-only, while the baseline/Design
require production runtime to detect those exact identities before current open/hydration. A correct
exact presence-only refusal probe is therefore reported as forbidden legacy runtime by the current
meter. String splitting, dynamic construction, aliases, or other scan obfuscation would preserve the
contradiction and is not an acceptable fix.

Before reimplementation, the owning flow must repair the Design/work map and meter contract to
distinguish an allowed existence-only refusal boundary from forbidden decoding, import, fallback or
migration behavior. Per the Design's measurement rules, that means a new immutable meter version
and recomputed B0/B1 rather than editing the frozen v1 script/config or inheriting its result. The
Work scan wording and affected production boundaries must be updated consistently.

### P0 — apply can unlink bytes that were never classified or allowlisted

`applyDirectFirstPublic` freezes its plan at
`scripts/product-truth/direct-first-public.ts:1298`, exposes the mutation-preflight boundary, and
then checks only cooperative lock identity before database removal. `removeDatabaseTarget` at
`:1111-1124` rechecks regular-file/non-link/link-count shape, but it does not compare the target's
inode, size, mtime, digest, or an open-handle identity with the file that inspection classified.

An independent race probe replaced the classified retired Product database after
`mutation-preflight` with a new regular, mode-safe single-link file at the same path. Apply returned
success and deleted the replacement:

```text
{"replacementWritten":true,"replacementSurvived":false}
```

This violates the Work's explicit “changing inode blocks mutation” condition, the Design race
matrix, and the core destructive boundary that only positively classified unchanged bytes may be
deleted. Cooperative locks prevent participating writers, not replacement by another local
process. The fix must bind every destructive target to the inspected identity/content and fail
closed on replacement, including the database main/sidecar set and corresponding Web/profile
targets, with focused adversarial tests.

### P1 — process quiescence has no Windows adapter

`stoppedProcesses` unconditionally executes
`ps -axo uid=,pid=,command=` at `scripts/product-truth/direct-first-public.ts:128-136`. On Windows,
`ps` is not a platform facility; inspect/apply consequently fails before it can prove quiescence or
perform the required rebuild. This falls short of the interface's platform-adapter boundary and the
Design's Windows path/reparse validation scope.

The tool needs a bounded Windows process-enumeration adapter that preserves current-account
filtering, sanitized output and fail-closed behavior, plus focused adapter tests. This finding is
inside the current tool boundary, but its change still requires a new candidate and measurement.

## Independent verification

The review inspected the complete `d6bef119..50deefc1` diff and all 65 changed paths. `HEAD` was the
assigned immutable candidate. The working tree contained only the expected untracked handoff
Concept before this Review Concept was added; no candidate file was modified.

Commands and results:

- `bunx vitest run scripts/product-truth/direct-first-public.test.ts` — PASS, 38/38.
- `bunx vitest run apps/service/src/product/ProductControlPlane.test.ts apps/service/src/persistence/Layers/Sqlite.test.ts apps/service/src/config.permissions.test.ts --maxWorkers=1 --no-file-parallelism` — PASS, 62/62.
- From `apps/web`, `bunx vitest run src/composerDraftStore.persistence.test.ts src/composerDraftStore.attachments.test.ts src/appSettings.test.ts src/lib/composerImageSource.test.ts src/components/chat/ComposerImageAttachmentChip.test.tsx` — PASS, 76/76.
- From `apps/web`, `bunx vitest run src/composerDraftStore.persistence.test.ts -t 'does not probe or import an old draft key'` — PASS, 1 selected / 37 skipped; this independently confirms the P0 behavior rather than refuting it.
- `bunx vitest run scripts/release-update-policy.test.ts apps/service/src/native-host/executionBoundary.test.ts --maxWorkers=1 --no-file-parallelism` — PASS, 21/21.
- `bun run typecheck` in `apps/service`, `apps/web`, `apps/desktop`, and `scripts` — PASS in all four workspaces.
- `bun run check:identity` — hard-green, zero findings.
- `bun run check:sources` — PASS.
- `bun run check:closure` — PASS; total 6,425 files, expected tree counts, digest `3d6a...` as reported by the gate.
- `git diff --check 50deefc1^ 50deefc1` — PASS.
- `bun install --frozen-lockfile` — PASS with no lock change; lock SHA-256 remained `05960c3b...`.
- Independent B0/B1 meter runs reproduced the handoff: B0 production/steady/tool
  `33941/33941/0`, edge count `439`, legacy runtime `27`; B1
  `34159/31320/2839`, edge count `414`, extraction sets empty, Product DB filename
  `product.sqlite`, and reported legacy runtime empty. The v1 meter/config hashes also match the
  freeze. These are faithful measurements of the current meter, not proof that its contradictory
  runtime-refusal contract is correct.
- The destructive race probe seeded a schema-valid historical Product v1 database in an isolated
  temporary HOME, replaced it at `mutation-preflight`, ran `applyDirectFirstPublic`, observed the
  successful deletion quoted above, and removed the temporary root in `finally`.

An initial Web command invoked from repository root also discovered cached adopted-source tests
under `.omp-flow/cache/repos` and exited 1 for their missing dependencies, while the six current
repository files it selected passed 81 tests. Re-running the correctly scoped command from
`apps/web` produced the 76/76 PASS recorded above; the cache-discovery artifact is not treated as a
candidate finding.

The desktop smoke claim was also checked and is not a finding: the B1 script contains the semantic
main-process/`--type=` filter inherited from its parent, and the isolated smoke run passed.

## Review boundary and required return

This verdict covers only candidate `50deefc1f8e904805c5c990756f3048de33c7ad5` against the linked
Work, handoff, PRD, Design, decisions, interface, destructive boundary and frozen measurement
evidence. It does not edit the frozen meter, runtime/session records, Campaign status, Evidence
ledger, or candidate code; it does not commit, push, merge, publish, or authorize destructive use.

No substantive fix is approved within this reviewer operation. The owning flow may authorize a
new implementation only after the production path boundary and the runtime-refusal/meter conflict
are repaired in the authoritative Work/map/Design inputs. The replacement-safe deletion and
Windows adapter findings can then be closed in the same newly measured candidate.
