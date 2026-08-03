---
type: "Work Map"
title: "Documentation and governance delivery work"
---

# Documentation and governance delivery work

This work map decomposes the human-approved [PRD](../prd.md) and
[Design](../design.md) after the accepted
[final QbD 1 calibration](../decisions/qbd-1-final-calibration.md). The accepted calibration closes
QbD 1 for this design round. A fourth QbD 1 audit is not work in this map and may not be created
without a genuinely new material finding.

The first QbD 2 [work-map audit](../qbd/work-map-audit.md) found only the fifth Concept
unexecutable: its commit/review order was cyclic and it lacked a clean-candidate route for the
shared dirty worktree. This revision changes only the authored integration/landing path needed to
close F-01 and F-02. The first four Work Concepts and their approved product scope are unchanged.

The delivery is documentation/governance infrastructure only. It must establish a reliable
construction boundary and formally land it; it does not map source domains, transplant UI,
implement an isolated Pi Native Host, alter Product/Engine runtime authority, or delete the old
Runtime/state concepts. Those are the explicit subject of a distinct next product-facing task.

## Work Concepts

- [Durable authority route](durable-authority-route.md) reconciles the owner graph, read route,
  topology/object ownership, current evidence route and current next action.
- [Complete Workbench contract](complete-workbench-contract.md) makes Workbench the sole complete
  UI owner, including the missing product-control surfaces and protected plugin/skill lineage.
- [Declared provenance governance](declared-provenance-governance.md) binds exact source zones to
  immutable adoption metadata and makes source, identity, structure and tool-root rules coexist.
- [Bounded document-contract validator](bounded-document-contract-validator.md) adds the read-only
  regression alarm and focused positive/negative fixtures for the approved owner/UI interfaces.
- [Frozen-candidate integration](frozen-candidate-integration.md) reconciles the four reviewed
  deliverables into one actual candidate commit, verifies that exact SHA in a disposable clean
  repository, obtains a SHA-bound handoff and independent review, then lets Finish land the same
  commit without minting a replacement SHA.

## Authored execution view

Before Execute, this map requires QbD 2 and the human work-map calibration required by the final
QbD 1 decision. Runtime receipts correlate operations; they do not add dependencies or change this
authored view.

The first two Concepts may run in parallel because their writable files are disjoint:

- Durable authority route owns the routing and non-Workbench durable owner files.
- Complete Workbench contract owns only `architecture/workbench.md`.

After the durable authority route is present, declared provenance governance may update only the
`source-adoptions` machine block in `README.md` and the bounded source/identity implementation.
This ordering avoids a same-file race with the root-authority prose repair. After both document
Concepts are present, the document-contract validator can encode their stable consequence
families. Provenance governance and the document validator may then run in parallel: the former
owns `test/quality.test.mjs`; the latter owns `test/document-contract.test.mjs`.

Frozen-candidate integration starts only after the first four handoffs exist and each has a current
independent Review Concept. It may reconcile an actual integration conflict only inside the union
of their allowed paths. A semantic change returns to the owning Work Concept and independent
review; integration must not silently redesign it.

Integration then follows one identity-preserving sequence. From the approved branch head `B`, it
uses a task-specific temporary index to create the final candidate commit `C` without moving the
shared branch or real index. The formal payload includes the reviewed implementation paths, the
three already-authored canonical `research/*.md` owners that the durable route and validator
actually require, deletion of the replaced `discovery-record.md`, and the accepted pre-freeze
Bundle Markdown. The root `test` script is bounded to OmniMind's root `test/*.test.mjs` so the
required total quality gate does not recursively execute the immutable donor evidence tree. It
does not absorb any other dirty path. A task-scoped temporary ref keeps that exact object
reachable while a disposable clean local repository checks out `C`, proves
cleanliness and runs the focused and total gates. The Work 5 handoff and its independent review
both bind to `C`. Only after that review is current may Finish atomically fast-forward the Campaign
branch from `B` to the already-reviewed `C`; Finish must not commit, amend, cherry-pick, squash or
otherwise create a second content SHA.

The shared worktree is not used as the clean verification environment. Its branch, real index and
pre-existing excluded dirty state are fingerprinted before candidate construction and must remain
unchanged through construction, verification, handoff and review. Landing may change only the
Campaign branch from `B` to `C` and synchronize candidate-allowed index entries to the already
matching candidate bytes. Index entries and worktree bytes outside the candidate allowlist remain
byte-for-byte unchanged. A failed fingerprint, moved branch or changed candidate invalidates the
attempt and requires a new candidate plus fresh Work 5 review; it is never repaired by stash,
reset, cleanup or inclusion of unrelated files.

### Known write-conflict guidance

- `README.md` is shared by durable authority route and declared provenance governance. The former
  owns prose and routing outside the fenced `source-adoptions` block; the latter owns only the
  existing adoption record's provenance metadata. Apply them in that order and review the final
  file as one constitution.
- The three existing `research/*.md` owners enter the formal payload byte-for-byte because the
  durable route and real-repository validator depend on them. `discovery-record.md` is deleted as
  the replaced parallel record. Integration may not rewrite either cognition surface.
- Root `package.json` may change only the existing `test` command from unbounded repository
  discovery to `test/*.test.mjs`; `quality` and the source/identity commands remain unchanged.
- Full-candidate whitespace verification uses
  `git -c core.whitespace=-blank-at-eof diff --check B C --`: it preserves the frozen research and
  Bundle bytes while disabling only blank lines at EOF; every other Git whitespace finding remains
  fatal.
- `test/quality.test.mjs` belongs only to declared provenance governance. Document-contract tests
  stay in their dedicated test file, so the two governance implementations remain merge-disjoint.
- Frozen-candidate integration is not an invitation to rewrite either shared surface. It resolves
  mechanical merge conflicts against the approved Design and sends semantic conflicts back.

## Requirement coverage

| Approved requirement / acceptance | Owning work |
| --- | --- |
| R1, R6, R7, R9; AC-01, AC-02, AC-08, AC-09, AC-11 | Durable authority route |
| R2, R3, R4, R5 and Workbench's R7 interface; AC-03 through AC-07 and the UI side of AC-09 | Complete Workbench contract |
| R8; source/identity portions of AC-10, AC-12 and AC-13 | Declared provenance governance |
| R10 and mechanical guards for R1-R7/R9; document portions of AC-01 through AC-09 and AC-12 | Bounded document-contract validator |
| R12; AC-10 real-tree proof, AC-13 immutable scope and AC-15 frozen green candidate | Frozen-candidate integration |

R11 and AC-14 are satisfied design/decomposition preconditions by the recorded independent audits
and accepted human calibration. Every implementation still receives its normal independent review,
but this map does not manufacture another QbD 1 audit. Each Work Concept below also states its own
reverse trace to approved requirements or design decisions; no item exists only for process
symmetry.

## Completion boundary

This work map is complete only when all five Concepts meet their done conditions, the first four
implementations have linked independent reviews, Work 5 has produced a handoff and independent
review bound to one clean green candidate SHA, and Finish has landed that exact commit by a
compare-and-swap fast-forward with the protected shared dirty state preserved. The candidate
commit contains the accepted delivery and every Bundle artifact intended for formal delivery
before the SHA is minted; Work 5 handoff/review are evidence about that immutable commit and never
cause a follow-up delivery commit. That outcome proves document/governance consistency only. It
neither promotes Campaign product claims nor authorizes a statement that OmniMind, M2, F-10,
F-12, F-13 or F-16 is complete.
