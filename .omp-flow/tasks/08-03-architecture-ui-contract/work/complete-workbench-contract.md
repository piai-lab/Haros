---
type: "Work"
title: "Complete the sole Workbench contract"
---

# Complete the sole Workbench contract

## Objective

Make `architecture/workbench.md` the one complete normative UI contract: preserve every approved
mother-surface family and add the missing onboarding, provenance, Models, Agents, Packages,
permission-enforcement, external-Engine no-fallback and plugin/skill-lineage consequences without
copying Product State or Execution state machines.

## Linked inputs

- [PRD R2–R5, R7 and R12](../prd.md)
- [Design “Future Workbench contract” and UI source-domain flow](../design.md)
- [Accepted QbD 1 calibration and explicit non-completion boundary](../decisions/qbd-1-final-calibration.md)
- Current [Workbench owner](../../../../architecture/workbench.md)
- Fixed-source facts for the protected discovery domain:
  [Source Review](../../../../research/source-review.md)

## Requirement traceability

This Work directly realizes R2, R3, R4 and R5 and the visible Workbench side of R7; it preserves
R12. It is reviewed against AC-03 through AC-07 and the UI side of AC-09. The approved Design
decisions are sections 3.1–3.9, the UI source-domain adoption flow and the Package/unavailable
Engine presentation flows.

## In scope

- Preserve every existing approved family listed in PRD R3, including `Agent | Chat`, Projects
  above Groups, shared Conversation/Composer/Queue/Timeline/Activity, Questions/child UI,
  Workbench/Viewer/Diff/Terminal/Git/PR/Kanban/Automations, failure paths, visual lineage,
  performance, bilingual/CJK/IME and accessibility.
- Add a first-run journey that discloses independent `Powered by Pi` identity, default native
  Engine, Agent/Chat distinction, real Provider/Model or supported local setup, permission-policy
  versus enforcement truth, postponement and truthful cancel/expiry/offline/missing-runtime/
  no-model/version-mismatch re-entry.
- Define calm but complete provenance presentation in the Engine selector, Package and Agent
  detail, About, Licenses and diagnostics; unknown/unverified source/version is never invented.
- Define runtime-backed Settings › Models behavior and distinct auth, Provider, Model and Thinking
  availability/failure states without a product static mirror outranking runtime facts.
- Define Settings › Agents for bundled native and external Agents with source/version/protocol,
  positive and negative capabilities, session/Model limits, permission truth, diagnostics and
  recovery for missing/offline/mismatch/unsupported paths.
- Define the complete Settings › Packages lifecycle: Catalog/Curated/Verified,
  Native/Bridged UI/PTY/Unsupported, source/rights/trust/exact artifact, install review,
  activation generation, lease, staged update, current/LKG rollback, License, contained Skills and
  Extensions, failures and non-sandbox truth.
- Keep permission policy labels separate from `host-enforced`, `engine-enforced`, `mixed` and
  `unverified`; derive enforcement from real evidence and preserve denial/cancel/uncertainty
  semantics.
- Make external capability differences visible and prohibit pre-acceptance silent fallback while
  retaining input/resources/selection and accurate post-dispatch unknown outcomes.
- Name all three fixed `/plugins`/`PluginLibrary` source anchors and map browse/search,
  installed/enabled, capability, loading/empty/error, source failure and working-directory behavior
  into Packages, Agents and Composer. Protect behavior and lineage, not donor ontology.
- Extend the existing preservation/deletion/completion gate so unwired domains remain truthful
  unavailable destinations with re-entry paths, never deletion authority.

## Out of scope

- Implementing renderer, Product Control Plane, Package, Engine or persistence behavior.
- Editing Product State/Execution ownership, fixed source files, source metadata or research.
- Introducing a second UI ledger, parsed Markdown schema, exact heading order or screenshot set.
- Claiming a text-complete Workbench proves UI/product completion or Campaign acceptance.

## Allowed repository paths

Only this durable owner may be changed:

```text
architecture/workbench.md
```

Expected handoff:
[`handoffs/complete-workbench-contract.md`](../handoffs/complete-workbench-contract.md).

## Done conditions

- Every PRD R3 family remains affirmative and normative in Workbench.
- Every R4 surface includes normal behavior plus unavailable/failure/recovery or re-entry behavior.
- Permission policy/enforcement and external capability/no-fallback truth are explicit and cannot
  be read as parity or sandbox claims.
- The three R5 anchors and their preserve/adapt/delete mapping are present; donor provider tabs,
  branding and generic `Plugin` ontology remain replaceable only after proof.
- Queue wording agrees with Product State/Execution without duplicating their full state machine.
- Workbench completion language explicitly separates contract preservation from real product/UI
  completion.
- The handoff records the section-level coverage review and any residual semantic concern.

## Focused verification

1. Trace each bullet of R3 and each normal/failure/recovery cell of R4 to an affirmative Workbench
   passage; absence, deferral or a label-only Settings section fails.
2. Verify the three exact R5 paths against the repository and then remove each anchor or mapping in
   a temporary fixture; the later document validator must report the stable plugin/skill rule.
3. Counter-read permission wording using an unverified Engine and a Package process crash; no
   sentence may imply host containment without deny-side-effect evidence.
4. Counter-read an unavailable external Engine before acceptance and uncertain delivery after
   acceptance; no fallback or blind replay may occur.
5. Run `node --test test/document-contract.test.mjs` after the validator Work is present, then
   `git diff --check -- architecture/workbench.md`.

## Ordering and review

This Work may run in parallel with the durable authority route because it owns one disjoint file.
It must be present before the document validator is finalized. Independent review must read the
entire Workbench, not infer completeness from the new sections or sentinel terms.

