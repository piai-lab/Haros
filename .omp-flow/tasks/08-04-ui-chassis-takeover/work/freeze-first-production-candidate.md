---
type: "Work"
title: "Freeze the first production candidate"
---

# Freeze the first production candidate

## Objective

Freeze the fully reviewed T1–T4 implementation as one immutable first production-candidate SHA,
verify every current-candidate acceptance gate against that exact code and generated artifact in a
disposable clean repository, obtain an independent SHA-bound review and hand the same commit to
Finish without widening claims or repeating unchanged T0 evidence.

## Linked inputs

- [PRD R12 and every current-candidate acceptance condition](../prd.md)
- [Design §9 frozen-candidate gate and stop conditions](../design.md)
- [Execution Brief proof gates](../../../../execution-brief.md)
- [Active Campaign status and producer boundary](../../../../missions/independent-omnimind-v1.md)
- [Maintainer-initiated source update intake protocol](../../../../research/source-update-intake.md),
  when an adopted-source review is active
- Accepted source-intake Works:
  [active Workbench mechanisms](harden-active-workbench-mechanisms.md) and
  [Product completion signals](align-product-completion-signals.md)
- [QbD A-04 evidence-SHA distinction](../qbd/design-audit.md)
- [Final QbD 1 approval conditions](../decisions/qbd-1-approval.md)
- All preceding Work Concepts, accepted implementation handoffs, current independent reviews and
  required maintainer visual calibrations

## Requirement traceability

This Work owns R12 and verifies, without reimplementing, the combined acceptance of R1–R11. It
directly carries A-04 by binding historical T0 evidence to its source SHA and current product,
artifact, journey, fault and UI evidence to the frozen candidate SHA. It does not grant a producer
authority to mark Campaign claims verified.

## Entry gate

Before selecting candidate SHA `C`, determine whether the maintainer has initiated an adopted-source
update review under the linked intake protocol. If no such review is active, this gate adds no work.
If one is active, Freeze is blocked until the maintainer has explicitly accepted, deferred or
declined the exact proposed intake set. Every accepted source change must be implemented through an
owning bounded Work and have a current handoff and independent review before it can enter `C`;
explicitly deferred changes belong to a later candidate and do not block this one.

This conditional gate does not authorize upstream merge, Product mutation, a speculative update
Work, a new public ontology or another Converge/QbD round. Gate A remains read-only, and Freeze must
not absorb or repair source-update work itself.

**Current status (2026-08-05): blocked on accepted intake implementation.** The maintainer approved
the exact Synara `v0.6.7` intake recorded in `research/source-review.md`. Complete the already active
authority-retirement Work at its coherent reviewed commit boundary, then implement and independently
review the two linked intake Works in authored order. Explicitly deferred source changes do not block
this candidate and must not be pulled into either Work without a new maintainer decision.

## In scope

- Require a current handoff and independent review for every preceding implementation Work, with no
  unresolved material finding and with every human same-state visual calibration recorded.
- Assemble or confirm the reviewed implementation commits in the authored order. Mechanical
  integration conflict may be resolved only inside the union of the owning Work path allowances;
  semantic change returns to that Work and repeats its focused review.
- Resolve the candidate as a full commit SHA `C` whose tree contains the reviewed production code,
  root source-adoption/legal changes and all intended production tests. Bundle workflow evidence may
  remain task-local; it does not alter product bytes or justify a later replacement candidate.
- Before freezing, record the base/candidate range and changed-path allowlist, root lock/legal/source
  disclosures and protected pre-existing dirty/untracked state. Do not stash, reset, clean, delete or
  absorb unrelated tool/user files to manufacture cleanliness.
- Verify `C` in a task-scoped disposable local repository detached at that exact commit. The
  disposable repository must be clean before and after checks and be removed on success or failure;
  it is not a persistent reviewer worktree.
- From that clean tree, run one relevant root install/build/typecheck/quality gate, the focused and
  integration/e2e suites carried by the Works, and the real Desktop→Service→Host→Pi Chat and Agent
  journey plus complete process/dispatch/uncertainty fault matrix.
- Build the actual macOS first-slice artifact from `C` and run source, identity, structure,
  generated, source-adoption, Host-external dependency, second-Host/transport, secret, artifact,
  SBOM and notices checks against it.
- Run the T3 dual-locale, accessibility, CJK/IME, performance and renewed same-state visual proof
  against `C`. Reuse the accepted human visual decision; do not turn final verification into another
  design round.
- Verify the immutable T0 commit/tree, fixed revision, legal copy and historical baseline references
  are still resolvable. Do not rerun the unchanged T0 probe unless an explicit Source Review trigger
  changed; current path/topology/artifact checks are new candidate evidence.
- Obtain one independent implementation review that checks the actual commit/tree, complete diff,
  evidence bundle, final artifact and claim boundaries. A content change invalidates that review and
  requires a new `C` plus affected gates.
- Let Finish land/report the same accepted `C`. Finish must not amend, squash, cherry-pick or create a
  semantically different candidate after review.

## Out of scope

- Fixing a failed implementation gate inside this Work; return the failure to the owning Concept.
- Reopening Converge/QbD 1 without a genuinely new material falsifier, adding a fourth evidence
  audit, or broadening Package/Remote/external Engine/release scope.
- Claiming Windows/Linux/install/update/full Package coverage, full UI completion, OmniMind V1 or
  Campaign completion.
- Marking any Campaign claim `verified`, hiding a red gate through exclusions, or reinterpreting T0
  smoke as if it ran on `C`.

## Allowed repository paths

This Work does not redesign production code. A failed content gate returns to the owning Work. It
may create only its task-local handoff:

```text
.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/freeze-first-production-candidate.md
```

Git refs/objects, a task-specific temporary directory and generated test/artifact output may be
created transiently for verification, but no persistent worktree, source mirror, secret file or
committed generated output is authorized. The final production commit range must be wholly covered
by the preceding Works' allowed paths.

## Done conditions

- Every implementation handoff/review is current, every deletion row is closed and every required
  human visual calibration is linked before `C` is selected.
- `C` is an immutable commit with a fully allowlisted diff and complete source/legal/lock changes.
  No unrelated pre-existing dirty path or task/tool configuration enters its tree.
- A disposable repository detached at `C` is clean before and after verification and all reported
  commands, artifacts and evidence resolve to `C`.
- The affected root quality/build/typecheck, Product/Host/unit/integration/e2e, real Chat+Agent
  journey, dispatch/process fault matrix and post-delete behavior checks pass once on `C`.
- Source/identity/structure/generated/adoption/dependency/second-path/secret/artifact/SBOM/notices
  checks pass without the T1/T2 expected-red exception.
- Dual-locale/a11y/CJK/IME/performance and renewed same-state visual proof pass with the approved
  budgets and maintainer calibration.
- Historical T0 object/evidence remains explicitly tied to its source SHA; no unchanged baseline
  probe is relabeled or repeated without a trigger.
- The independent reviewer accepts the exact `C` and finds no material issue. The handoff identifies
  `C`, artifacts, commands/results, proof limits and preserved shared state.
- Finish uses that same commit identity. Any post-freeze content change has instead produced a new
  candidate and repeated the affected verification/review.

## Falsifiers and stop conditions

- Stop before selecting `C` while a maintainer-initiated source update review has no explicit
  accepted, deferred or declined intake decision, or while an accepted intake lacks its owning
  handoff and independent review.
- Stop if any implementation review is stale, a human visual gate is missing, the branch/tree differs
  from reviewed bytes or a changed path has no owning Work.
- Stop on any red source/right/dependency/identity/secret/fault/UI gate. Do not add an exclusion or
  weaken a threshold in the candidate Work.
- Stop if real Pi acceptance/uncertainty can no longer be proven after deletion or if an old execution
  path/second Host remains in source, lock, runtime or artifact.
- Stop if protected user/tool dirty state changes during candidate assembly or verification. Do not
  repair it with stash/reset/clean.

## Focused verification

Resolve the real commands from the final root workspace. The final set must include, at minimum:

```text
git diff --check <base> <C> --
git diff --name-status <base> <C> --
root frozen install
root build
root typecheck
root quality/test gate
source + identity + structure + generated + source-adoption scans
Host-external Pi dependency + second Host/transport scans
secret leakage + final artifact + SBOM/notices scans
Product admission/single-writer/projection/recovery suites
real Pi Chat + folder-backed Agent journey
complete process/dispatch/uncertainty fault matrix
post-delete mature-mechanism regressions
zh-CN/en + a11y + CJK/IME + performance + same-state visual proof
```

The handoff records exact executable commands, exit codes, test counts, hardware/build mode, artifact
digests and proof boundaries. It must distinguish any scoped macOS evidence from untested platforms.

## Checkpoint verification

The checkpoint is the immutable commit `C`, not the mutable shared worktree. In the clean detached
repository, prove the allowlisted diff and run the complete current-candidate gate once; then verify
the repository remains clean and every artifact/evidence digest still resolves to `C`. Independent
review receives that commit, the full base-to-`C` diff and all gate results. Any content correction
returns to the owning Work, creates a new candidate and repeats affected checks plus the independent
review; the failed `C` is never relabeled or repaired in place.

## Expected handoff

Write
[`handoffs/freeze-first-production-candidate.md`](../handoffs/freeze-first-production-candidate.md)
with base SHA, `C`, complete changed-path summary, clean-repository lifecycle, exact gate results,
artifact/SBOM/notice digests, real journey/fault/UI evidence, historical T0 references, independent
review pointer and protected-state before/after digests. It may submit affected Campaign claims for
later consideration as `candidate` only if separately authorized; it cannot self-mark them verified.

## Ordering and review

This Work is last and begins only after all implementation/deletion reviews are accepted. It is a
freeze and verification responsibility, not a place for fixes. The independent reviewer receives
the immutable commit and evidence without an implementation role. After acceptance, load
`omp-flow-finish` to land/report that same candidate and archive the Bundle; do not manufacture a
new delivery SHA during Finish. A currently active maintainer-initiated source update review must
first satisfy the Entry gate above; it is not bypassed merely because the preceding Works are green.
