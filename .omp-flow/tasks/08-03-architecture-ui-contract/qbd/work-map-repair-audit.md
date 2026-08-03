---
type: "QbD Audit"
title: "Scoped QbD 2: repaired frozen-candidate landing path"
entry: "../work/index.md"
verdict: "PASS"
actor_id: "architecture_ui_qbd_2_1"
dispatch_receipt: "da446889f6214b51870e7d57dd703e8c"
predecessor_receipt: "c672dcd25d474be18d657520df14ebb0"
---

# Scoped QbD 2: repaired frozen-candidate landing path

This is the requested closure check of the revised
[work-map entry](../work/index.md) and
[Frozen Candidate Integration](../work/frozen-candidate-integration.md). It carries the first
QbD 2 audit's [`FAIL`](work-map-audit.md) and is limited to whether the revision closes F-01 and
F-02 without changing the first four Work Concepts, the accepted product boundary or QbD 1.

## Verdict

**PASS.** No unresolved blocking finding remains in this scoped repair.

The revised map now uses one commit identity throughout the core path:

```text
approved branch head B
  -> temporary-index one-parent candidate commit C
  -> clean disposable repository detached at C
  -> focused checks + one npm run quality on C
  -> Work 5 handoff bound to C
  -> independent Work 5 review bound to C
  -> Finish compare-and-swap fast-forward B -> C
```

Finish does not mint, amend, cherry-pick, squash or reconstruct a replacement commit. A content,
branch, candidate-ref or protected-state change invalidates the attempt and requires a new
candidate plus a fresh Work 5 review. This closes the prior identity/review cycle.

The clean gate no longer depends on making the shared dirty worktree clean. Candidate construction
uses a temporary index, verification uses a disposable local repository, and the shared branch,
real index and excluded dirty state are fingerprinted and preserved. Landing changes only the
Campaign branch from `B` to the already-reviewed `C` and synchronizes candidate-allowed index
entries to bytes already present in the worktree. Stash, reset, clean, unrelated inclusion and a
persistent second worktree are expressly rejected. This closes the prior dirty-state gap.

This verdict remains advice for human calibration. It authorizes no Execute transition, Work
implementation, durable repair, QbD 1 reopening or product implementation by itself.

## Audit identity and exact scope

- Entry: [documentation and governance delivery work](../work/index.md)
- Repaired Work: [Frozen Candidate Integration](../work/frozen-candidate-integration.md)
- Prior findings: [QbD 2 work-map audit F-01/F-02](work-map-audit.md)
- Approved requirements and construction path: [PRD](../prd.md) and [Design](../design.md)
- Final design calibration: [QbD 1 final calibration](../decisions/qbd-1-final-calibration.md)
- Promised output: `qbd/work-map-repair-audit.md`
- Actor: `architecture_ui_qbd_2_1`
- Dispatch receipt: `da446889f6214b51870e7d57dd703e8c`
- Completed predecessor receipt: `c672dcd25d474be18d657520df14ebb0`

The audit did not re-read the first four Works for substantive quality, reopen their prior PASS
judgments, add product requirements or turn later engineering preferences into acceptance rules.

## Prior finding closure

### F-01 — closed: candidate verification, review and landing are now acyclic

The first audit required the actual candidate commit to exist before the clean-SHA gate, required
the Work 5 handoff and independent review to bind to that exact commit, and prohibited Finish from
creating a replacement identity.

The revision implements that remedy directly:

1. `C` is a final one-parent commit from approved branch head `B`, with final payload, message and
   metadata, created without moving the shared branch.
2. The clean repository is detached at `C`; focused checks, exact-tree proof, cleanliness and the
   one total quality gate all bind to `C`.
3. The Work 5 handoff and independent reviewer inspect the existing `C`; any content change makes
   the review stale and forces a replacement candidate.
4. Finish performs only an atomic compare-and-swap fast-forward from unchanged `B` to existing
   `C`, then reports `C` as both reviewed candidate and landed commit.

There is no longer a requirement for Work 5 to claim post-Finish completion before it can be
reviewed. The repaired file separates handoff-ready conditions from landing conditions, so Finish's
every-Work review precondition and the Design's candidate-commit-before-quality order can both be
satisfied.

### F-02 — closed: the candidate has an explicit clean environment while user dirt is preserved

The revision identifies the current shared worktree as protected state rather than as the clean
verification environment. It requires:

- a full base SHA `B` and candidate commit `C`;
- pre/post fingerprints for the symbolic branch, real index, non-candidate refs and pre-existing
  excluded Git-visible state, including type, mode, absence and content digests;
- temporary-index construction seeded from `B` with only allowlisted delivery paths;
- a task-specific `mktemp -d` disposable repository, detached at `C`, clean before and after the
  gates and removed on success or failure;
- abort on any shared branch/index/protected-byte change, with no stash/reset/clean/delete escape;
- targeted post-fast-forward index synchronization, while excluded index entries and worktree
  bytes remain unchanged.

This is sufficient to prove AC-13/AC-15 without committing the existing excluded deletion,
research/tool/configuration paths or `.DS_Store` files and without weakening the single persistent
Campaign-worktree rule. The candidate ref is only a reachability guard; the map explicitly makes
`C`, not that ref or a recreated object, the formal delivery.

## Revision boundary

The substantive change is confined to the authored landing path in `work/index.md` and
`work/frozen-candidate-integration.md`. The first four Work Concepts remain byte-for-byte at the
revisions evaluated by the first audit. Their current Git blob IDs are:

| Work Concept | Blob ID |
| --- | --- |
| Durable authority route | `6f9795de859107b7aea46705a209118d4d983091` |
| Complete Workbench contract | `ddb79ee2b17e17eea92363597445e06cfeed0de3` |
| Declared provenance governance | `17b2cf6cc5301c86d055f3497305be6d9ad08817` |
| Bounded document-contract validator | `650dc41c7ff97bcb5bc84f50c4a8e76929d3c05d` |

Their requirement ownership, allowed paths, README/test write separation and product scope are
therefore carried forward rather than re-audited. The repaired files still exclude source-domain
mapping, UI takeover, Native Host work, Product/Engine runtime implementation, old Runtime/state
deletion, a fourth QbD 1 audit and Campaign claim promotion.

## Material-finding check

No new material defect was found in the repaired landing path.

The following are deliberately **not** frozen by this PASS:

- the exact shell commands, fingerprint serialization, temporary-ref name or disposable-repository
  transport, provided the stated identity and preservation invariants are proved;
- the first audit's advisory suggestion about how a final integrated README review refreshes the
  two disjoint writer scopes;
- whether post-`C` handoff/review evidence is later harvested elsewhere. The map correctly forbids
  changing `C` or creating a follow-up delivery commit merely to include those evidence files.

These are implementation or knowledge-harvest choices, not evidence of an authorization, data or
unrealizable-core-path failure in this scoped map.

## Closure counter-cases

| Counter-case | Result | Reason |
| --- | --- | --- |
| Finish creates a different SHA after the green gate | PASS | Expressly forbidden; CAS lands existing `C` only |
| Work 5 is reviewed before its implementation is reviewable | PASS | Handoff-ready conditions complete implementation before independent review; landing is separate |
| A post-creation edit inherits old quality/review evidence | PASS | Any content change abandons `C` and requires fresh gates and review |
| Existing unrelated dirt must be hidden or committed | PASS | Shared dirt is fingerprinted; clean verification occurs in a disposable repository |
| Candidate ref is mistaken for formal delivery | PASS | Ref is only a reachability guard; exact commit `C` is landed |
| Shared index synchronization overwrites unrelated state | PASS as mapped | Only candidate-allowed entries may change; excluded entries/bytes are checked against their protected baseline |
| First four Work scopes are revised implicitly | PASS | Their files and blob identities are unchanged |
| Product/UI/Runtime work is smuggled into integration | PASS | Existing out-of-scope boundary remains explicit |
| Optional later engineering suggestions become QbD requirements | PASS | Repair states invariants and leaves equivalent implementation details open |

## Human calibration options

The scoped QbD 2 repair is ready for human calibration. A recorded human `PASS` may authorize the
normal Execute transition. The human may instead request another repair, defer or stop. This audit
does not itself advance the workflow, and no further QbD audit is warranted without a new material
finding or substantive change.
