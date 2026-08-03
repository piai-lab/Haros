---
type: "Review"
title: "Complete Workbench contract review"
verdict: "PASS"
work: "../work/complete-workbench-contract.md"
handoff: "../handoffs/complete-workbench-contract.md"
actor_id: "architecture_doc_qbd_3"
dispatch_receipt: "4d9fc0758f0c45fa99c85274daa72c90"
predecessor_receipt: "174cb03c0cec47b5a3e1dfd1ff0a8a9b"
---

# Complete Workbench contract review

## Verdict and findings

**PASS.** No blocking or substantive finding was found. The complete 376-line
[Workbench](../../../../architecture/workbench.md) satisfies the linked
[Work](../work/complete-workbench-contract.md), and the predecessor
[handoff](../handoffs/complete-workbench-contract.md) identifies the same Work, actor output and
receipt. The contract preserves the approved mother surface, adds every R4 normal/failure/re-entry
surface, binds the fixed discovery lineage, and keeps persistent facts and process authority out
of the UI owner.

The handoff's concern remains a non-blocking integration dependency: the document-contract test
does not yet exist, so no automated sentinel/negative-fixture result is claimed. The Work
explicitly orders that suite after the validator Work lands. All focused checks currently
applicable passed, and no test failed.

This review changes no durable owner or implementation file and authorizes no Campaign claim.

## Review identity and scope

- Work: [Complete the sole Workbench contract](../work/complete-workbench-contract.md)
- Handoff: [Complete Workbench contract implementation](../handoffs/complete-workbench-contract.md)
- Implementer: `architecture_ui_work_planner`
- Implementation receipt: `174cb03c0cec47b5a3e1dfd1ff0a8a9b`
- Reviewer: `architecture_doc_qbd_3`
- Review receipt: `4d9fc0758f0c45fa99c85274daa72c90`
- Review output: `reviews/complete-workbench-contract.md`

The repository base does not track `architecture/workbench.md`, so the real Git-visible
implementation is the full added file rather than an incremental tracked patch. The review read
that complete file, not only new headings or handoff claims. Path-specific status shows the Work,
handoff and Workbench as untracked Bundle/durable artifacts; the fixed `vendor/ui` subtree has no
worktree diff from `HEAD`. No Product State, Execution, research, source, legal, runtime or
Campaign repair was performed by this review.

## Requirement and acceptance review

| Requirement | Result | Exact evidence |
| --- | --- | --- |
| R2 / sole complete owner | PASS | Workbench line 3 declares the sole complete UI contract; the file remains ordinary readable Markdown and does not define a persistence schema or process topology |
| R3 / approved mother surface | PASS | Lines 7-58 preserve physical mother lineage, `Agent \| Chat`, Projects above Groups, Agent location/write authority and folderless/read-only Chat; lines 83-203 preserve shared interaction, row grammar, Composer, Queue, Timeline, Question, child/Team/Workflow, Workbench, Viewer, Diff, Changes and real PTY; lines 303-353 preserve visual, performance, bilingual/accessibility and deletion gates |
| R4 / onboarding and provenance | PASS | Lines 60-81 cover independent `Powered by Pi`, real runtime-backed setup, Agent/Chat, permission timing, cancel/expiry/offline/missing-runtime/no-model/version-mismatch progress and re-entry, real source surfaces and unknown/unverified behavior |
| R4 / Models and Agents | PASS | Lines 205-232 provide full Models/Agents surfaces, requested-versus-actual Run choices, distinct auth/availability states, positive and negative capabilities, protocol/offline/version failures and recovery paths |
| R4 / Packages | PASS | Lines 234-248 cover discovery tiers, compatibility classes, source/rights/exact artifact, permission/install review, activation/lease/update/LKG/rollback, contained capabilities and fault recovery without hot swap or sandbox claims |
| R4 / permission truth | PASS | Lines 250-267 visibly separate user policy from all four enforcement sources and require call-path plus deny-side-effect evidence |
| R4 / external Engine | PASS | Lines 269-279 require real capability data, prohibit pre-acceptance fallback, preserve input/resources/selection and prohibit cross-Engine replay after uncertain dispatch |
| R5 / fixed discovery lineage | PASS | Lines 281-301 name all three exact paths, preserved behaviors, Packages/Agents/Composer mapping, replaceable donor ontology and truthful-unavailable re-entry; lines 335-353 apply proof-before-deletion |
| R7 / visible Queue boundary | PASS | Lines 131-148 distinguish editable intent, Product admission to Run/receipt, Engine-owned accepted operations and visible `delivery_unknown`; this agrees with Product State/Execution without copying their state machines |
| R12 / non-completion | PASS | Lines 355-376 require real source, behavior, failure/recovery, visual, performance, locale and accessibility evidence and explicitly state that text completeness proves only contract freeze, not UI/product/Campaign completion |

Every PRD R3 family remains affirmative. Every R4 row has a normal path plus a specific
unavailable/failure/recovery or re-entry path; none is reduced to a Settings label.

## Adversarial counter-cases

| Counter-case | Result | Evidence |
| --- | --- | --- |
| An unverified Engine is displayed as contained | PASS | Workbench lines 260-267 define `unverified` as inability to prove enforcement and forbid deriving containment from protocol or process isolation |
| A Package process crashes after effects | PASS | Lines 246-248 preserve current/LKG, stop new leases and show recovery while expressly refusing to claim filesystem/network containment |
| Selected external Engine becomes unavailable before acceptance | PASS | Lines 273-277 retain input, attachments, resources and explicit selection, dispatch no Run under Pi/another source, and require an in-place reason plus retry/manual change |
| Delivery becomes uncertain after acceptance | PASS | Line 279 keeps `delivery_unknown`/`outcome_unknown`, does not return the item to editable Queue and prohibits replay through Pi or any other Engine |
| Plugin/Skill wiring is absent | PASS | Lines 291-301 and 349 require a truthful unavailable destination, source failure and re-entry; keywords, empty Settings labels or permanent unavailable placeholders cannot authorize deletion |
| Donor Provider ontology becomes permanent | PASS | Line 301 makes provider tabs, branding, generic `Plugin` category and provider-specific APIs replaceable only after mapped behavior and proof |

## Fixed-source verification

All three named anchors exist in the unchanged fixed tree and resolve at `HEAD` to these blobs:

| Anchor | Blob | Observed behavior |
| --- | --- | --- |
| [`_chat.plugins.tsx`](../../../../vendor/ui/apps/web/src/routes/_chat.plugins.tsx) | `5f412aac2e7be64ab5ceeaecd249bb0b37fb8bf1` | Registers `PluginLibrary` below the shared chat shell |
| [`routeTree.gen.ts`](../../../../vendor/ui/apps/web/src/routeTree.gen.ts) | `217d906a174d30f939d72ec5fafa1a1b6a1c6a2a` | Registers `/plugins` and its `/_chat/plugins` route identity |
| [`PluginLibrary.tsx`](../../../../vendor/ui/apps/web/src/components/PluginLibrary.tsx) | `aef53e1e21f0a4ce61728592f00d6ba5d9e9ce94` | Contains plugin/skill tabs, search, installed/enabled presentation, provider capability gating, loading/empty/unavailable states, marketplace/source warnings and working-directory warning |

The source code still contains donor provider tabs and an internal discovery-provider fallback.
Workbench correctly protects the user behavior and lineage rather than freezing those donor APIs
or treating that discovery fallback as permission to fall back an actual Run.

## Independent checks

| Check | Result |
| --- | --- |
| Handoff/Work receipt and bidirectional identity | pass |
| Local Markdown links in Work, handoff and Workbench | 8 checked, 0 missing |
| Fixed source anchor existence and `HEAD` blob binding | 3/3 pass |
| `git diff --quiet HEAD -- vendor/ui` | pass |
| Independent semantic coverage groups | 11/11 pass: mother, quality, onboarding, provenance, Models, Agents, Packages, permission, external no-fallback, lineage and non-completion |
| `test/document-contract.test.mjs` | not present; conditional check skipped, no green result claimed |
| Full-file `git diff --no-index --check /dev/null architecture/workbench.md` | pass |
| Explicit final-newline check | pass |

An initial scratch keyword probe used four incorrect reviewer literals (`default` word order,
`stable scroll`, an over-tight Thinking phrase and `.tsx` for the real `.ts` route tree). It was
discarded as an invalid harness, not treated as an implementation failure. The corrected
exact-language probe passed 11/11; the semantic verdict rests on the full-file cross-read and
counter-cases above, not sentinel presence.

## Residual integration dependency

When the bounded document validator lands, integration must run its positive repository fixture
and negative fixtures that remove each R4 family, each of the three source anchors and their
mapping. A failure then would be new evidence for this Work. Until that suite exists, this PASS
means the authored contract is complete and independently reviewed; it does not mean the real UI
or Campaign claim is complete.
