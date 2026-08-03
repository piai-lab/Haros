---
type: "Work"
title: "Reconcile the durable authority route"
---

# Reconcile the durable authority route

## Objective

Make the repository express one discoverable owner graph, one mandatory read route and one current
next action. Execution must be the sole detailed process/topology owner, Product State the sole
product-object owner, and routing/order/status files must link rather than compete.

## Linked inputs

- [PRD authority split and requirements R1, R6, R7, R9 and R12](../prd.md)
- [Design target-owner repair, authority interfaces and fresh-task route](../design.md)
- [Accepted QbD 1 calibration](../decisions/qbd-1-final-calibration.md)
- Current durable owners: [`README.md`](../../../../README.md),
  [`architecture/`](../../../../architecture/README.md),
  [`execution-brief.md`](../../../../execution-brief.md) and the
  [active Campaign](../../../../missions/independent-omnimind-v1.md)
- Existing evidence only where the next-action wording needs it:
  [Source Review](../../../../research/source-review.md)

## Requirement traceability

This Work directly realizes R1, R6, R7 and R9; it preserves the non-completion boundary in R12.
Its observable acceptance is AC-01, AC-02, AC-08, AC-09 and AC-11. The Design decisions behind it
are “Target owner repair” sections 1, 2 and 4–8, the authority-interface table and the fresh-task
route.

## In scope

- Reduce `AGENTS.md` to read/task routing, fail-closed ambiguity behavior and operational safety;
  remove duplicated product/UI/topology/object/order contracts while preserving necessary safety.
- Keep root doctrine and production adoption constitutional; route complete UI, product facts and
  detailed topology to architecture instead of retaining parallel ledgers.
- Make the architecture index a responsibility map, not a second physical tree or object catalog.
- Keep exactly seven durable product objects in Product State; describe Package generation as
  receipt/activation/lease data rather than a mandated aggregate.
- Make Execution the sole detailed owner of `apps/web`, `apps/desktop`, `apps/service`, isolated
  Native Host and External Engine responsibilities, without requiring empty directories.
- Reconcile the Queue boundary across Workbench references, Product State facts and Execution
  authority: editable intent becomes Run/receipt; accepted operations are Engine-owned;
  `delivery_unknown` is visible and never blindly replayed.
- Reduce the execution brief to order, entry/stop conditions and proof gates; remove its topology,
  object catalog and repeated source facts.
- Keep the Campaign to status/evidence references and align its authority/read route and next
  action without promoting any claim.
- Correct README, execution brief and Campaign wording to cite the already-recorded exact-tree,
  install/build/typecheck and unchanged macOS desktop-smoke evidence and its revalidation triggers.
  The route must proceed to evidence/rights review, source-domain mapping and isolated Native Host
  work rather than repeat the unchanged probe.

## Out of scope

- Editing the `source-adoptions` fenced block; that belongs to declared provenance governance.
- Adding the missing user-visible surface to Workbench; that belongs to the Workbench Concept.
- Changing research evidence, Campaign status, product code, runtime behavior or the exact source.
- Creating an alternate topology file, object manifest, read-order schema or product ledger.

## Allowed repository paths

Only these paths may be changed:

```text
AGENTS.md
README.md                         (prose only; source-adoptions block is excluded)
architecture/README.md
architecture/product-state.md
architecture/execution.md
execution-brief.md
missions/independent-omnimind-v1.md
```

Expected handoff:
[`handoffs/durable-authority-route.md`](../handoffs/durable-authority-route.md).

## Done conditions

- Each durable fact class names one owner and every other involved file only routes or summarizes.
- The mandatory route is identical wherever stated: README → involved architecture owners in full
  → execution brief → active Campaign for status → conditional research for evidence/falsifiers.
- Detailed topology exists only in Execution; the seven-object catalog exists only in Product
  State; AGENTS and the brief contain neither competing form.
- Queue admission/acceptance/unknown-delivery wording agrees at all three interfaces.
- README, brief and Campaign acknowledge completed baseline evidence and name the same current
  next work without asking for an unchanged smoke rerun.
- No Campaign claim changes state, no research file changes and no Workbench content is narrowed.
- The handoff records changed files, exact review points, commands/results and any concern.

## Focused verification

1. Read the final seven allowed files together and build a fact-class table showing one owner and
   only links/summaries elsewhere; specifically search for a second detailed process tree, product
   object list or `PackageGeneration` aggregate.
2. Resolve every repository-local Markdown link added or changed in those files.
3. Cross-read the Queue statements in Workbench, Product State and Execution for editable intent,
   Run/receipt conversion, Engine-owned accepted operations and no blind replay.
4. Compare the three next-action passages with Source Review section 5 and its revalidation
   triggers; fail if any requests the unchanged baseline smoke again.
5. Run the owner/read-route/topology/object/Queue/next-action cases in
   `node --test test/document-contract.test.mjs` once the validator Work is present, followed by
   `git diff --check --` on the seven allowed paths.

## Ordering and review

This Work may run in parallel with the Workbench Concept. It must precede the provenance edit to
the shared README and precede the document validator's real-repository fixture. Its independent
review must inspect semantics, not merely sentinel presence.

