---
type: "QbD Audit"
title: "Scoped QbD 1: repaired authority and UI contract"
entry: "../design.md"
verdict: "NEEDS_EVIDENCE"
actor_id: "architecture_doc_qbd_2"
dispatch_receipt: "956d3412cbca4b1bb6ed13d44b5d462f"
predecessor_receipt: "5ecdc4b0a4a14dfb8f51b8d35e297782"
---

# Scoped QbD 1: repaired authority and UI contract

This is an independent re-audit of the repaired [Design](../design.md) and
[PRD](../prd.md). It carries the earlier [`FAIL`](design-audit.md), the human
[full-repair decision](../decisions/qbd-1-repair.md), and the claimed immutable
[repair-scope evidence](../decisions/repair-scope-evidence.md). The audit also cross-read the
current durable owners and fixed-source evidence linked by the Design. It changed no product,
architecture, research, execution, Campaign, governance, source, legal or tool-configuration
file.

## Verdict

**NEEDS_EVIDENCE.** The repaired PRD and Design close the three earlier blocking design findings:
they specify the previously missing complete Workbench surface, remove detailed topology and
product objects from routing/order documents, and define a realizable exact-provenance versus
production-author quality boundary. No unresolved blocking product or architecture design finding
was found in that repaired scope.

However, the linked repair-scope record does not close the earlier actor-attribution gap. The
repository base was already dirty, only predecessor **Bundle** contents were captured, and no
repository-readable actor patch or pre/post snapshot excludes edits to the already-dirty durable
and governance paths. The opaque receipt identifies the assignment but supplies no changed-path
evidence in the repository. Consequently this audit cannot judge whether the repaired author also
made a hidden out-of-scope mutation, which is an explicit acceptance condition.

This is `NEEDS_EVIDENCE`, not `FAIL`: the audit found no evidence that an unauthorized mutation
actually occurred and no unrealizable core design path. Missing evidence prevents that material
question from being judged. The verdict is advice to the human calibrator and authorizes no
implementation, decomposition, repair, re-audit or Campaign transition.

## Audit identity and carried scope

- Entry: [repaired authority graph and UI-contract design](../design.md)
- Requirements: [repaired document authority and UI-contract PRD](../prd.md)
- Prior challenge: [first QbD 1 audit](design-audit.md)
- Human decision: [full repair followed by a scoped fresh audit](../decisions/qbd-1-repair.md)
- Repair evidence under challenge: [QbD 1 repair scope evidence](../decisions/repair-scope-evidence.md)
- Fixed evidence: [source review](../../../../research/source-review.md) and
  [decision record](../../../../research/decision-record.md)
- Promised output: `qbd/design-repair-audit.md`
- Actor: `architecture_doc_qbd_2`
- Dispatch receipt: `956d3412cbca4b1bb6ed13d44b5d462f`
- Completed predecessor receipt: `5ecdc4b0a4a14dfb8f51b8d35e297782`

The challenge covered every earlier finding, complete Workbench preservation, owner singularity,
plugin/skill lineage, exact-source and tool-root partitioning, read order, current next action,
executable gates and hidden mutation. Current durable files were read as the input that the later
approved repair would change; this design-stage audit does not mistake their intentionally
unimplemented state for a design defect.

## Prior finding disposition

| Prior item | Re-audit result | Evidence |
| --- | --- | --- |
| F-01 — incomplete complete-UI owner | Closed at design level | PRD R3-R5 and Design 3.1-3.9 preserve every existing Workbench family and add onboarding, provenance, full Models/Agents/Packages behavior, separate policy/enforcement truth, external capability/no-fallback behavior and the fixed plugin/skill lineage with normal, failure and recovery consequences |
| F-02 — competing routing/order authorities | Closed at design level | PRD R1/R6 and Design owner repairs make Execution the only detailed topology owner and Product State the only product-object owner; AGENTS is reduced to routing/safety and the execution brief to order/gates, with no mandated `PackageGeneration` aggregate |
| F-03 — impossible total gate | Closed at design level | PRD R8/AC-10/AC-15 and the Design exact-zone interface bind `vendor/ui` to immutable commit/tree objects, preserve rights/exactness, exempt only the exact zone from production identity/structure, reject undeclared vendor/leakage and run the total gate only on a frozen candidate |
| E-01 — actor scope attribution | **Open: material evidence gap** | Immutable Bundle preimages prove the repaired Bundle delta, but do not prove that no already-dirty non-Bundle path was edited by the repair actor |
| A-01 — stale repeated smoke instruction | Closed at design level | PRD R9/AC-11 and Design root/brief/Campaign repair cite the recorded bounded smoke and its revalidation triggers, then route to evidence review, source-domain mapping and Native Host work |
| A-02 — inconsistent read order | Closed at design level | PRD R9 and the Design fresh-task route consistently use README -> involved architecture -> execution -> active Campaign -> conditional research and state that order grants no authority |

## Material missing evidence

### E-01 — NEEDS_EVIDENCE: the claimed actor-scoped negative proof is not reconstructable

**Cause and evidence.** The repair record correctly pins actor-start `HEAD` to
`2445acb987e443b44b7dc819de3de44c3d68b391`, records predecessor blobs for all eight pre-repair
Bundle files, and records the repaired PRD, Design and index blobs. Those objects exist, current
content matches the recorded repaired/unchanged blobs, and `HEAD:vendor/ui` resolves to the stated
`630f17e61abc478114bf83c1d740977c9f68b910` tree.

But the same record says the worktree was already dirty. It did not capture pre-repair content
objects or an inventory for the dirty non-Bundle paths, and the repository contains no runtime
changed-path/patch receipt for `architecture_doc_repair_architect`. Its statement that the actor
did not edit product, architecture, research, execution, Campaign, governance, source, legal or
tool paths is therefore an assertion, not a result reconstructable from the listed Git objects.
The successful `vendor/ui` diff proves only the source subtree. In addition, the Bundle is wholly
untracked at this base, so `git diff --check -- <Bundle paths>` returns success without inspecting
those files and cannot supply the missing actor boundary.

**Concrete consequence.** The repaired PRD/Design blobs could remain exactly as recorded even if
the same actor also changed an already-dirty `README.md`, `AGENTS.md`, execution/Campaign file or
governance script. A repository-only reviewer could not distinguish that hidden mutation from the
pre-existing user change. Such a mutation could alter durable product authority, topology or the
future gate while AC-13 and the Design exit still claim a Bundle-only architect repair.

**Affected decisions.** Prior E-01; PRD R11, the architect-assignment constraints, AC-13 and
AC-14; Design sections “Architect repair evidence,” “State ownership” and “Design exit.”

**Smallest evidence remedy.** Supply one immutable, independently generated actor changed-path and
patch record anchored to pre/post content objects for the whole worktree, if the native runtime
actually retained one. If no such record exists, reproduce the same repaired PRD/Design/index
content from a clean committed predecessor (or an independently captured complete workspace
snapshot), commit the bounded result, and prove the allowlisted diff and unchanged `vendor/ui`
tree. A new prose assertion or after-the-fact list is not actor-scope evidence.

**Why safe degradation is insufficient.** This is not a product feature that can be hidden,
disabled or labelled unavailable. The evidence exists to prove that a documentation-only actor did
not silently change durable truth. Omitting that proof leaves the acceptance question itself
unanswered.

## Adversarial coverage results

| Counter-case | Result | Reason |
| --- | --- | --- |
| Every approved UI family is owned by future Workbench | PASS at design level | The Design preserves the whole existing Workbench and adds the missing README/Campaign consequences rather than replacing them with this Bundle |
| Package/provenance/permission/external-Engine normal, failure and recovery are complete | PASS at design level | Onboarding cancellation/expiry/offline/runtime/model recovery, Package install/load/update/fault/LKG behavior, enforcement uncertainty and external no-fallback paths are explicit |
| Plugin/skill mother behavior can be deleted while sentinels stay green | PASS at design level | All three physical anchors exist; PRD R5 and Design 3.8 require mapped replacement, normal/failure proof and the visual/product gate before deletion; unavailable preserves lineage and re-entry |
| Topology and product objects have one owner | PASS at design level | Execution owns detailed process/target layout; Product State owns the seven-object catalog and Package generation remains receipt data unless later evidence changes that owner |
| Exact provenance is broader than the declared adopted root | PASS for the current candidate design | Exemption is derived from complete per-adoption commit/tree metadata, candidate equality and working-inventory exactness, not from the word `vendor`, mode or URL |
| Tool roots become production or adoption authority | PASS with advisory qualification | The requirements say tool roots receive no adoption/product authority and fixture 7 tests this; the validation rules should explicitly reject exact-zone/tool-root ancestry overlap, as noted below |
| Read order grants authority or routes to stale work | PASS at design level | One route is specified, authority is independent of sequence, recorded smoke is not repeated without a Source Review trigger and next work is coherent |
| Focused and total gates can execute on one frozen candidate | PASS as a proof path | The allowed implementation surface can add the document validator and exact-zone partition; focused negative fixtures precede a clean-SHA `npm run quality` |
| Repair contains no hidden out-of-scope mutation | **NEEDS_EVIDENCE** | The Bundle content transition is reconstructable; the dirty-worktree actor boundary is not |

## Mechanical evidence sampled

- Twenty routed Bundle/owner/evidence files were checked for repository-local Markdown targets;
  `missing_links=0`.
- All predecessor and repaired blob IDs listed by the repair record exist as Git blobs; current
  PRD, Design, index and unchanged Bundle contents hash to their stated objects.
- Base commit `2445acb987e443b44b7dc819de3de44c3d68b391` exists and its `vendor/ui` tree is
  `630f17e61abc478114bf83c1d740977c9f68b910`; the working subtree has no diff from that base.
- The three fixed plugin/skill anchors exist, the generated route registers `/plugins`, and
  `PluginLibrary.tsx` contains plugin/skill capability, browse/search, loading, empty, source-error
  and working-directory behavior.
- No unresolved placeholder or product-choice token was found in PRD/Design; the only placeholder
  words describe the validator that rejects placeholders and the Design's exit assertion.

These checks support design feasibility. They do not manufacture the missing actor-scope evidence
or claim that the future documentation/governance implementation already exists.

## Acceptance-criterion judgment

| Criterion | QbD judgment | Reason |
| --- | --- | --- |
| AC-01 through AC-11 | PASS as repaired design/proof paths | The requirements specify singular owners, complete visible consequences, exact lineage, coherent transfer, read route and next action; implementation remains future work |
| AC-12 | PASS as a bounded design path | Stable rule/path findings and seeded negative families are defined without parsing Markdown as workflow state |
| AC-13 | **NEEDS_EVIDENCE for this architect repair** | The later committed-base method is sound, but the current dirty-base architect attribution is not complete |
| AC-14 | **NEEDS_EVIDENCE** | This re-audit carries every required predecessor and closes the design blockers, but cannot report no unresolved material finding while E-01 remains |
| AC-15 | PASS as a realizable future gate | The provenance/identity partition removes the known contradiction and requires one clean-candidate total gate; no current green result is claimed |

## Advisory observation

### A-01 — make exact-zone/tool-root disjointness an explicit validation rule

The Design says repository scanning is a non-overlapping partition and that tool roots confer no
adoption privilege. Its enumerated exact-zone validation rules reject overlap/nesting among exact
zones, but do not expressly reject an exact provenance root equal to, inside, or containing a
configured `toolRoot`. The intended result is recoverable from the table and focused fixture 7, and
the current `vendor/ui` adoption is disjoint, so this is not blocking. The implementation should
make the cross-partition ancestry rejection explicit instead of relying on precedence between two
classifications.

## Human calibration options

The repaired design should not advance to decomposition under an accepted-risk label while E-01
is unanswered. The applicable choices are:

1. provide the immutable actor-wide change record described above and request a narrowly scoped
   audit of that evidence;
2. reproduce the bounded repair from a clean committed predecessor/candidate, then request the
   same narrow evidence audit;
3. defer or stop the task.

Once the evidence gap is closed, no design repair is presently indicated; the remaining advisory
partition wording can be made explicit during the already-scoped governance implementation if the
human later authorizes forward transition.
