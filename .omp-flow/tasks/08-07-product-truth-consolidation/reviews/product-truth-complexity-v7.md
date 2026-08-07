---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v7 meter"
work: "../work/product-truth-complexity-v7.md"
handoff: "../handoffs/product-truth-complexity-v7.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v7-r1"
actor_id: "product_truth_meter_v7_review"
dispatch_receipt: "73111f8bee7241e19912909c070af9b1"
predecessor_receipt: "f6532bf3144844ed90eb911a18ace845"
predecessor_output: "../handoffs/product-truth-complexity-v7.md"
reviewed_candidate: "8f43c62d91092b90a8d1e323e25592a0b3f875fd"
reviewed_parent: "8f43c62d91092b90a8d1e323e25592a0b3f875fd^"
accepted_design: "1e6d80a2cf0edd67084a1f5dc20e996acc326bd6"
---

# Review: Authoritative Product-truth complexity v7 meter

## Verdict

`FAIL` — the immutable v7 candidate has one confirmed independent P0 scope/correctness failure.
The completed predecessor handoff names this Work, the immutable candidate and implementer actor
`product_truth_meter_v7`; reviewer `product_truth_meter_v7_review` is distinct. No repair was
made. B1 consumption is not authorized.

## Findings

### P0 — raw-effect inventory omits frozen closure members

**Cause.** `measure-complexity-v7.mjs:691` builds `rawInventoryPaths` only from
`declaredProductionPaths`. It then scans only graph paths in that subset. The v7 Work and interface
instead require enumeration of every frozen production/direct-tool member in the accepted
bidirectional static-import closure.

**Consequence.** At least 61 frozen production members with explicit raw `fs`, `child_process`,
worker, SQLite or Level imports are absent from the raw inventory. Independently verified
closure-only examples include `apps/service/src/atomicWrite.ts`,
`apps/service/src/attachmentStore.ts`, and `apps/desktop/src/browserUsePipeServer.ts`. Their ingress bindings
and owner containment are never checked, so the reported complete raw-effect/owner proof is
incomplete even when all authored fixtures pass.

**Smallest repair.** Inventory every present frozen production/direct-tool member, not merely a
declared-path subset. Add a closure-only raw negative and an adjacent closure-only positive, plus
internal CommonJS `require`, `module.require`, and `createRequire` closure cases. Preserve the
measurement-only boundary: this needs no runtime semantic interpreter.

Potential additional hidden clone cases could not be evaluated because required TypeScript support
was unavailable; they are not findings or outcomes of this review.

## Independent verification

- Read the assigned Work, v7 interface/repair decision, predecessor handoff, and immutable diff.
  The handoff links back to the assigned Work and records the same implementation receipt.
- `nl -ba scripts/product-truth/measure-complexity-v7.mjs | sed -n '650,735p'` — confirmed the
  declared-production-only filter at line 691.
- Static cross-check of frozen members against explicit raw imports found at least 61 omitted
  production members. The listed examples are each frozen members and not declared production
  paths; they contain matching Node imports.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=verbose` —
  authored suite passed (36/36); it does not exercise a raw ingress reachable only through frozen
  closure membership.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).
- `git diff --check 8f43c62d91092b90a8d1e323e25592a0b3f875fd^ 8f43c62d91092b90a8d1e323e25592a0b3f875fd` — PASS.
- Candidate scope/diff — PASS: exactly 36 allowed additions, no modified/deleted paths.

## Required return

Return this Work for a new immutable meter candidate with the P0 repair and focused closure
coverage. Do not alter the rejected v7 candidate or treat green authored tests as acceptance.

## Dispatch identity

- role: `reviewer`
- actorId: `product_truth_meter_v7_review`
- receipt: `73111f8bee7241e19912909c070af9b1`
- predecessor: `f6532bf3144844ed90eb911a18ace845`
- predecessor output: `../handoffs/product-truth-complexity-v7.md`
- verdict: `FAIL`
- explicitly allowed fix: none
