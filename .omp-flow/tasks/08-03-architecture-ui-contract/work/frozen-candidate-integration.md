---
type: "Work"
title: "Freeze and land the documentation-governance candidate"
---

# Freeze and land the documentation-governance candidate

## Objective

Integrate the four independently reviewed deliverables into one actual candidate commit, verify
that exact SHA in a disposable clean repository while preserving the shared dirty worktree, bind
the Work 5 handoff and independent review to it, then have Finish land the same commit without
creating a replacement SHA.

## Linked inputs

- [PRD R12 and AC-10/AC-13/AC-15](../prd.md)
- [Design approved implementation scope, focused gates and candidate final gate](../design.md)
- [Accepted QbD 1 calibration and required committed delivery](../decisions/qbd-1-final-calibration.md)
- [QbD 2 work-map audit F-01 and F-02](../qbd/work-map-audit.md)
- The four preceding Work Concepts and their linked handoffs and independent reviews
- [Replay audit](../qbd/design-replay-audit.md) for the carried ancestry condition and immutable
  proof standard, not as authority to repeat QbD 1

## Requirement traceability

This Work enforces R12 and supplies AC-10's real-tree proof, AC-13's immutable changed-path/scope
proof and AC-15's clean frozen-candidate quality evidence. R11/AC-14 remain accepted preconditions;
this Work does not create another QbD 1 audit. It implements the Design's documentation/governance
repair flow and candidate-final-gate sections while closing QbD 2 F-01/F-02 with one immutable
commit identity.

## In scope

- Require current linked handoffs and independent Review Concepts for the four implementation
  Concepts before integration starts.
- Reconcile mechanical conflicts only inside the union of approved implementation paths and
  against the accepted PRD/Design. Send any semantic conflict or failed requirement back to its
  owning Concept and repeat that independent review.
- Resolve the approved committed branch head as a full 40-character base SHA `B`. Before touching
  candidate state, fingerprint the symbolic branch, `B`, real index bytes and entries, all refs
  except the one task-scoped candidate ref, and every pre-existing Git-visible dirty path outside
  the candidate payload, including file type, mode, absence and content digest. Record digests,
  never excluded source contents.
- Assemble the complete formal-delivery payload against `B` through a task-specific temporary Git
  index. Seed it from `B`, add only the approved delivery paths and intended pre-freeze Bundle
  Markdown, prove its diff is allowlisted, and create the final one-parent candidate commit `C`
  with its final commit message and metadata. This must not move the shared branch, write the real
  index or change worktree bytes.
- Include the already-authored `research/README.md`, `research/source-review.md` and
  `research/decision-record.md` byte-for-byte because the reviewed durable route and the
  real-repository document-contract fixture require those canonical evidence owners. Include the
  existing deletion of `discovery-record.md`, whose cognition has been replaced by the routed
  research owners. These are exact payload inputs, not an invitation for integration-time prose
  edits.
- Bound the existing root `test` script to `test/*.test.mjs` so `npm run quality` discovers the
  OmniMind governance suites and does not recursively execute tests and smoke scripts inside the
  immutable `vendor/ui` provenance zone. This is a test-discovery boundary only: do not add a
  second quality command, skip a root suite, install donor dependencies or alter donor bytes.
- Keep that exact commit reachable under one task-scoped temporary candidate ref. The ref is only
  a garbage-collection guard: `C` itself, not the ref or a later reconstruction, is the formal
  delivery object.
- Create one task-specific directory with `mktemp -d`, populate it as a disposable local Git
  repository from the candidate ref, detach at `C`, and prove its tracked/non-ignored status is
  clean before verification. It is not registered as a persistent Campaign worktree and is always
  removed on success or failure.
- In that clean repository, prove the exact changed-path allowlist, `vendor/ui` tree OID, focused
  suites, source check, identity check and
  `git -c core.whitespace=-blank-at-eof diff --check B C --`, then run one `npm run quality` on
  `C`. The explicit Git policy disables only blank lines at EOF so frozen research/Bundle bytes
  remain unchanged; every other whitespace finding remains fatal. Recheck cleanliness afterward.
  All output, exit codes and test counts bind to `C`.
- Recompute the shared-state fingerprints after candidate construction and verification. Any
  change to the shared branch, real index or protected dirty bytes aborts the attempt; do not
  stash, reset, clean, delete, overwrite or include excluded state.
- Write the expected Work 5 handoff against `C`, then obtain an independent Review Concept that
  checks the actual commit, clean-verification evidence and shared-state proof. Neither artifact
  may alter `C` or trigger a replacement delivery commit.
- After that review is current, Finish performs only an atomic compare-and-swap fast-forward from
  `B` to the existing `C`. Before landing, recheck `HEAD == B`, the candidate ref still resolves
  to `C`, candidate-allowed worktree bytes already match `C`, and protected state still matches.
  Finish must not run `git commit`, amend, cherry-pick, squash or recreate the candidate.
- After the branch moves, synchronize only candidate-allowed entries in the real index to `C` so
  the landed delivery is not represented as an inverse staged change. Prove index entries and
  worktree bytes outside the candidate allowlist are unchanged, the branch resolves to `C`, and
  remove only the task-scoped candidate ref and disposable repository.

## Out of scope

- New product/UI/runtime/source behavior, source-domain mapping, UI takeover, Native Host work,
  Product/Engine state implementation or Runtime/state deletion.
- A fourth QbD 1 audit, a new generic task graph, a second Campaign, or claim promotion.
- Re-running unchanged desktop smoke absent a Source Review trigger.
- Fixing unrelated working-tree changes, broad cleanup, force-push or history rewriting.
- Using stash, reset, clean, a persistent second worktree, an evidence-only tree/ref, or a later
  recreated commit as the formal delivery.

## Allowed repository paths

Integration may touch only the union below, and only to resolve a failed accepted gate or a
mechanical merge conflict:

```text
AGENTS.md
README.md
architecture/README.md
architecture/workbench.md
architecture/product-state.md
architecture/execution.md
discovery-record.md                 (deletion only)
execution-brief.md
missions/independent-omnimind-v1.md
package.json                        (root test discovery only)
research/README.md                  (existing bytes only)
research/source-review.md           (existing bytes only)
research/decision-record.md         (existing bytes only)
scripts/document-contract.mjs
scripts/identity.mjs
scripts/check-identity.mjs
scripts/sources.mjs
scripts/check-sources.mjs
test/document-contract.test.mjs
test/quality.test.mjs
```

The formal commit may additionally include authored Markdown under this exact Bundle root that is
part of the accepted task/design/QbD-2/work/handoff/review history:

```text
.omp-flow/tasks/08-03-architecture-ui-contract/**/*.md
```

Only Bundle Markdown that already exists when `C` is minted can enter its payload. The expected
Work 5 handoff and its independent review are post-`C` evidence about that immutable object; they
are not added to `C` and do not authorize a follow-up delivery commit. This Bundle allowance does
not authorize runtime records, a new QbD 1 audit, unrelated Concepts or tool configuration.
Expected integration handoff:
[`handoffs/frozen-candidate-integration.md`](../handoffs/frozen-candidate-integration.md).

## Handoff-ready conditions

- All four implementation handoffs and independent reviews are current; no material finding is
  unresolved.
- `B` and one-parent candidate commit `C` are immutable Git objects; the complete `B..C` path set
  is within the approved union and every change traces to a Work Concept or accepted pre-freeze
  Bundle artifact.
- The three canonical research owners in `C` are byte-identical to their pre-integration inputs,
  `discovery-record.md` is absent, and no other pre-existing excluded dirty path enters `C`.
- `npm test` and `npm run quality` discover both root governance suites and no path under
  `vendor/ui`; the total gate is the same command required by the Design, not a waived substitute.
- The clean disposable repository is detached at `C`, is clean before and after verification,
  resolves the exact declared `vendor/ui` tree, and passes focused checks plus one total quality
  gate.
- The shared branch and real index are unchanged from their initial fingerprints, and every
  protected pre-existing dirty byte/mode/absence remains identical after verification.
- The Work 5 handoff names `B`, `C`, the candidate ref, clean-repository lifecycle, changed paths,
  commands, exit codes, test counts and before/after protected-state digests. It contains no claim
  that Finish has already landed the commit.

These conditions complete implementation and make Work 5 independently reviewable. Landing is a
later identity-preserving action, not an implementation edit or a second candidate.

## Landing conditions

- An independent reviewer has accepted the handoff, exact commit `C`, complete diff, clean gate
  evidence and protected-state proof; a content change invalidates that review.
- Finish atomically advances the Campaign branch from unchanged `B` to the same `C` and creates no
  new commit. A moved branch or failed compare-and-swap stops landing.
- Candidate-allowed real-index entries are synchronized to `C`; every excluded index entry and
  worktree byte remains identical to its protected baseline; all other refs are unchanged except
  removal of the task-scoped candidate ref; no unrelated user change enters the commit.
- The final report names `C` as both reviewed candidate and landed commit, reports the green gates,
  and states this is documentation/governance completion only. It names the distinct next product
  task: source-domain map and real UI takeover, isolated Pi Native Host, Product/Engine authority
  implementation and old Runtime/state deletion as replacements land.

## Focused and final verification

After `C` exists, run in the disposable clean repository detached at that exact SHA:

```text
node --test test/document-contract.test.mjs test/quality.test.mjs
npm run check:sources
npm run check:identity
git -c core.whitespace=-blank-at-eof diff --check <B> <C> --
git diff --name-only --diff-filter=ACDMRT <B> <C> --
npm run quality
```

Before and after those commands, verify clean porcelain state and the candidate tree OID for
`vendor/ui`. Recheck the protected shared-state fingerprint from the original worktree without
normalizing or hiding it. The handoff and review bind these results to `C`. If any post-creation
content change is required, abandon `C`, return to the owning Work, mint a new candidate, rerun the
clean gates and obtain a new Work 5 review before landing.

## Ordering and review

This Work is last. It does not begin until Work 1–4 have independent reviews and the work-map/QbD 2
human gate has authorized Execute. Its implementer creates and verifies `C`, then writes the
SHA-bound handoff. The integration reviewer reviews that existing commit and evidence. Only then
does `omp-flow-finish` land `C` by compare-and-swap fast-forward. Finish reports the already-created
formal commit; it does not create one, hide unrelated dirt or alter the reviewed candidate.
