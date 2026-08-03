---
type: "QbD Audit"
title: "QbD 2: documentation and governance delivery work map"
entry: "../work/index.md"
verdict: "FAIL"
actor_id: "architecture_ui_qbd_2_1"
dispatch_receipt: "ecf832adf66f456a9a4174eeb0807f66"
predecessor_receipt: "cccf77610b2249b39f35b2d56ad12d85"
---

# QbD 2: documentation and governance delivery work map

This is an independent challenge of the five-Concept [work map](../work/index.md) against the
approved [PRD](../prd.md), repaired [Design](../design.md), accepted
[final QbD 1 calibration](../decisions/qbd-1-final-calibration.md), current repository state and
the required formal commit. It does not reopen QbD 1, modify a Work Concept, implement any durable
owner/governance repair or enter Runtime/UI product work.

## Verdict

**FAIL.** The first four Work Concepts are bounded, requirement-traceable and implementable, and
the map correctly preserves the exact source tree, separates the two README writers, avoids a
test-file race and names the next product-facing task. However, the fifth Concept has no acyclic,
current-state-feasible path that can simultaneously produce:

1. an immutable candidate SHA;
2. a clean-worktree `npm run quality` result on that exact SHA;
3. a current independent review of the integration Work; and
4. the required formal commit containing only the accepted delivery.

Two blocking findings cause that failure. The first is an internal commit/review ordering cycle.
The second is the absence of a bounded clean-candidate mechanism for the already-dirty shared
worktree. Executing the unchanged map would require either approving an incomplete Work, moving
the commit identity after the green gate, touching or hiding unrelated user changes, or calling a
dirty-tree result clean. None is a safe degradation.

This verdict is advice for human calibration. It authorizes no Work repair, Execute transition,
fourth QbD 1 audit, durable file edit or product implementation.

## Audit identity and scope

- Entry: [documentation and governance delivery work](../work/index.md)
- Requirements and acceptance: [PRD](../prd.md)
- Approved construction and candidate gate: [Design](../design.md)
- Final design calibration: [QbD 1 final calibration](../decisions/qbd-1-final-calibration.md)
- Work under challenge: all five Concepts linked by the work-map entry
- Promised output: `qbd/work-map-audit.md`
- Actor: `architecture_ui_qbd_2_1`
- Dispatch receipt: `ecf832adf66f456a9a4174eeb0807f66`
- Completed predecessor receipt: `cccf77610b2249b39f35b2d56ad12d85`

The challenge covered requirement and acceptance coverage, Concept boundedness, allowed paths,
README and test ownership, implementation/review ordering, handoff evidence, exact-source
preservation, the current dirty repository, immutable-candidate and formal-commit feasibility,
and the boundary to the next product task.

## Blocking findings

### F-01 — FAIL: candidate verification, integration review and Finish commit form a cycle

**Cause and evidence.** The approved Design's construction flow is explicit: `candidate commit ->
immutable changed-path/exact-tree proof -> clean candidate worktree -> npm run quality on that
candidate SHA -> independent review as required`. PRD AC-13 likewise requires base and candidate
to be Git objects, and AC-15 binds cleanliness and the green quality command to the same candidate
SHA.

The fifth Work instead says:

- integration starts after only the first four implementations have current reviews;
- its own done conditions include the clean-SHA quality proof **and** the formal Finish commit;
- an integration reviewer then checks the actual complete diff and evidence; and
- `omp-flow-finish` performs the formal commit only after every accepted Work has a current review.

Those statements admit no valid ordering. If Work 5 is reviewed before the formal commit, it has
not met its own done condition or the human's committed-delivery requirement. If Finish creates a
new commit after the green gate and review, the verified candidate SHA is not the delivered commit
SHA. If Work 5 receives no independent review, the map's statement that every implementation gets
normal independent review and Finish's every-Work review precondition are false. A post-review
content or commit-identity change also makes the reviewed diff stale.

**Concrete consequence.** The map can either deadlock before Finish or report completion with a
quality/review receipt bound to an object other than the formal delivery. In either case the
required proof cannot establish that the committed repository is the exact green, independently
reviewed candidate.

**Affected decisions.** Final QbD 1 delivery items 5 and 6; PRD AC-13 and AC-15; the Design's
documentation/governance repair flow and candidate-final gate; Work-map completion; Frozen
Candidate Integration's objective, done conditions and ordering/review section.

**Smallest remedy.** Define one acyclic identity-preserving landing path in the fifth Concept.
The actual candidate commit must exist before the clean-SHA quality gate, the Work 5 handoff and
its independent review must bind to that exact commit, and Finish must land/report that same
already-reviewed SHA without creating a replacement commit or changing its tree. If project Git
policy instead requires Finish to create the object, then the clean-SHA gate and final independent
review must occur after that creation and the approved Design would need an explicit scoped change;
the current map may not silently choose both orders.

**Why safe degradation is insufficient.** Independent review, one green quality gate on the
delivered SHA and a real formal commit are explicit delivery conditions. None can be hidden,
marked unavailable, replaced with a tree hash or waived as process ceremony.

### F-02 — FAIL: the dirty shared worktree has no authorized clean-candidate route

**Cause and evidence.** At audit time the Campaign branch is `codex/pi-native-v1` at
`2445acb987e443b44b7dc819de3de44c3d68b391`. The shared worktree already contains:

- tracked modifications to six future allowlisted paths;
- a tracked deletion of `discovery-record.md`, which is outside the candidate allowlist;
- untracked `architecture/`, `research/` and this Bundle;
- non-ignored untracked tool/configuration roots and `.DS_Store` paths outside the formal-commit
  allowance.

The imported `vendor/ui` subtree is clean and still resolves to
`630f17e61abc478114bf83c1d740977c9f68b910`, so exact-source preservation itself is not the gap.
The gap is that Frozen Candidate Integration simultaneously requires the worktree to be clean,
forbids fixing or hiding unrelated dirt, limits the formal commit to accepted paths, and does not
state where or how a clean checkout of the candidate is produced without disturbing the shared
branch, real index or user changes.

**Concrete consequence.** In the current repository an implementer following only this map must
either include excluded changes in the delivery, stash/reset/delete user state, use an unrecorded
second checkout, or run the candidate gate while the worktree remains dirty. The first three
violate scope and preservation; the fourth makes AC-15 false. The ambiguous base also risks
attributing pre-existing allowed-path content to an implementation without preserving the
excluded shared state around it.

**Affected decisions.** PRD constraint that unrelated working-tree changes belong to the user;
AC-13 and AC-15; Design's committed-base and clean-candidate requirements; Frozen Candidate
Integration's scope, cleanliness, formal-commit and unrelated-dirt clauses.

**Smallest remedy.** Add a bounded dirty-state protocol to Work 5 rather than another Work
Concept: identify the approved base; fingerprint the shared branch, real index and excluded dirty
state; construct the allowlisted candidate without staging or mutating excluded paths; verify the
candidate SHA in a disposable clean checkout or equivalent isolated repository; and prove the
shared state is byte-for-byte unchanged after verification and exact-SHA landing. The mechanism
must obey the repository's single persistent Campaign-worktree rule and must not turn an evidence
ref, temporary tree or later recreated commit into the formal delivery. Alternatively, execution
must wait for the maintainer to provide a clean committed base through a separately authorized
action.

**Why safe degradation is insufficient.** Cleanliness is the proof that the green gate and exact
diff belong to one candidate. Calling excluded dirt harmless, omitting it from status, or stashing
it without an authorized restoration proof does not establish that claim.

## Non-blocking observations

### A-01 — make the shared README review freshness explicit

The map correctly sequences Durable Authority Route's README prose edit before Declared
Provenance Governance's fenced machine-block edit, and the writers do not overlap semantically.
Nevertheless, the second edit changes a file already reviewed for Work 1. The final integration
review is capable of covering the complete constitution, so this is not blocking. The repaired
ordering should state whether that integrated review refreshes both README ownership slices or
whether the affected Work review is repeated; Finish must not call an earlier full-file review
current merely because the later edit was inside a fence.

### A-02 — future handoff links are intentionally unresolved at decomposition time

All 42 existing local links in the six work-map files resolve except the five promised future
handoff paths. That is consistent with pre-Execute decomposition, provided each implementer creates
the exact promised handoff and each reviewer rejects a missing or mismatched predecessor handoff.

## Adversarial coverage results

| Counter-case | Result | Reason |
| --- | --- | --- |
| Every PRD requirement and acceptance row has work ownership | PASS | R1-R10/R12 and AC-01 through AC-15 have explicit owners; R11/AC-14 are correctly carried as accepted QbD 1 preconditions |
| Every Work Concept reverses to approved requirements/design | PASS | No process-only placeholder Work was found among the first four deliverables; the fifth exists for mandatory integration evidence and commit delivery |
| Work 1/2 can run in parallel without writes colliding | PASS | Their allowed paths are disjoint; Workbench has a single writer |
| README writers can avoid a same-range race | PASS with A-01 | Prose and the existing `source-adoptions` fenced block are explicitly separated and ordered |
| Provenance and document-validator implementations can run in parallel | PASS | They own different scripts and `test/quality.test.mjs` versus `test/document-contract.test.mjs` |
| Exact U1 source can stay byte-identical while gates become green | PASS as a work path | Metadata-derived exemption, candidate-tree comparison, working-inventory checks, undeclared-vendor rejection, leakage tests and exact/tool-root disjointness are all assigned without editing `vendor/ui` |
| Handoffs and independent reviews are required before integration | PASS for Works 1-4 | Each has a bounded expected handoff and integration refuses missing/stale material reviews; F-01 prevents a valid Work 5 review/Finish sequence |
| One green clean quality result can bind to the formal commit | **FAIL** | F-01 changes or defers the formal commit identity; F-02 supplies no clean candidate environment for the current dirty tree |
| The map can complete without green tests or a real commit | Rejected in prose, but not mechanically closed | Done conditions name both; F-01 still makes their simultaneous satisfaction unrealizable and therefore invites a false completion workaround |
| Hidden Runtime/UI implementation is authorized | PASS | Product/runtime/source behavior is excluded from every Work; Workbench changes are contract text only |
| A fourth QbD 1 or process-only audit loop is introduced | PASS | The map expressly forbids it and carries accepted QbD 1 as a precondition |
| Completion is falsely expanded to M2/Campaign/product UI | PASS | The boundary is explicit in the index and Work 5, and the next product task names source-domain takeover, Native Host, Product/Engine authority and replacement-led deletion |

## Work-Concept judgment

| Work Concept | QbD 2 judgment | Reason |
| --- | --- | --- |
| Durable authority route | PASS as mapped work | Bounded seven-path repair; complete R1/R6/R7/R9 coverage; semantic review and next-action evidence are explicit |
| Complete Workbench contract | PASS as mapped work | One-file owner; full R3-R5 surface, failure/recovery, plugin lineage and non-completion boundary are preserved |
| Declared provenance governance | PASS as mapped work | Bounded machine-block/checker/test scope; exact source, tool-root disjointness and leakage counter-cases are explicit |
| Bounded document-contract validator | PASS as mapped work | Narrow read-only API and stable negative fixtures; no lifecycle parser or semantic-completion claim |
| Frozen-candidate integration | **FAIL** | F-01 makes review/quality/commit ordering cyclic; F-02 makes the required clean candidate unrealizable in the current shared tree as specified |

## Human calibration options

The unchanged work map should not proceed to Execute. The applicable options are:

1. repair only Frozen Candidate Integration and the work-map ordering/completion language to close
   F-01 and F-02, then request a scoped fresh QbD 2 audit of that changed map;
2. provide a separately authorized clean committed base and repair only the remaining
   candidate/review/Finish identity cycle, then re-audit that path;
3. defer or stop the task.

Neither repair reopens QbD 1 or authorizes product work unless it changes the approved Design or
product boundary. A re-audit should carry this verdict and inspect the exact work-map delta; it
should not repeat the already-closed substantive design audits.
