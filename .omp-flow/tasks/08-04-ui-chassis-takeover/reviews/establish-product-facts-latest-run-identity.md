---
type: "Implementation Review"
title: "Review: Product latest-Run identity correction"
work: "../work/establish-product-facts-and-typed-ingress.md"
handoff: "../handoffs/establish-product-facts-and-typed-ingress.md"
verdict: "PASS"
revision: "review-product-facts-latest-run-identity-20260805-r2"
actor_id: "product_latest_run_identity_reviewer_r2"
dispatch_receipt: "11826746689c462b95b7afd545a41f40"
predecessor_receipt: "883abd86f25c405aae28ace201c20b65"
predecessor_output: "../handoffs/establish-product-facts-and-typed-ingress.md"
reviewed_revision: "handoff-product-facts-latest-run-identity-20260805-r2"
---

# Review: Product latest-Run identity correction

## Findings

No blocking or advisory finding.

The r1 P1 is closed. [`productStore.ts`](../../../../apps/web/src/store/productStore.ts) now updates
`conversation.latestRunId` and `conversation.receiptState` from the admitted Run in the same
`entry-admitted` reducer result that appends its Entry and Run. The focused regression exercises
both required starting states: an empty detail with `null / null`, and a detail whose prior latest
Run is `settled`. Both advance atomically to the new admitted Run's `runId / pending` pair. Later
`dispatch-changed` facts continue to advance the same pair for that exact Run.

The independent direct counterexample from r1 was rerun without editing source. For both empty and
prior-terminal baselines, `applyProductFactBatch` returned `applied` at sequence 1 and produced:

```text
summary run-probe / pending
latest Run run-probe / pending
```

No cursor comparison, wall clock, notification-local identity, inference from display order, new
writer or donor authority was introduced.

## Verdict

`PASS`.

The bounded latest-Run Product fact correction now satisfies its Work and handoff scope:

- `ProductConversationSummary` requires `latestRunId` on the wire and rejects either non-null/null
  half-pair; nested shell and detail decoding therefore fails closed when an older producer omits
  the required field.
- `readSummary` selects one latest durable Run with the durable `(created_at, run_id)` ordering and
  joins its receipt by that exact `run_id`. Empty Conversations produce `null / null`; an impossible
  Run-without-receipt row reaches the schema as a rejected half-pair rather than a fabricated state.
- Service snapshots keep shell and detail aligned for empty, `pending`, `running`, `settled`,
  `rejected`, `delivery_unknown` and `outcome_unknown`; the SQLite close/reopen path preserves the
  latest Run pair.
- Web now preserves the pair across both Product producer paths: admission establishes the new
  pending Run identity, and subsequent dispatch changes keep that identity paired with its receipt
  transition.
- All 19 implementation/test paths named by the handoff are within the amended Work allowlist.
  Fixture-only edits add exact `null / null` values, except the Kanban submit fixture correctly uses
  its existing RunId with that Run's receipt state.
- The complete correction adds no persistence migration/table, schema version, public Product
  object, receipt enum, writer, clock, completion/notification state, Provider event, raw payload or
  donor Thread/Turn authority.

This PASS is limited to the Product summary fact and its live projection. It does not approve or
review the successor completion tracker, prove a notification or real Engine observation, compare
shell/detail cursors, close existing T2/T3/T4 checkpoint debt, or change a Campaign claim.

## Predecessor and review boundary

Reviewer receipt `11826746689c462b95b7afd545a41f40` resolves to active reviewer actor
`product_latest_run_identity_reviewer_r2`, outputting this Review Concept with predecessor
`883abd86f25c405aae28ace201c20b65`. The predecessor is completed, belongs to different actor
`product_latest_run_identity_implementer_r2`, and its promised output is the handoff reviewed here.
The handoff identifies the r2 actor, receipt and revision, links the same amended
[`Establish Product facts and typed ingress`](../work/establish-product-facts-and-typed-ingress.md)
Work, and records r1 reviewer receipt `5344669e60ee426faf2e75810c3c0c9b` as its predecessor.

This is a bounded remediation dispatch: the implementer entry is the r1 Review Concept, while the
completed output updates the same Product handoff and keeps the linked amended Work as semantic and
path owner. The review inspected the actual complete correction diff and the r2 increment in the
Store reducer/test rather than trusting the handoff narrative.

The repository instructions, README, Architecture index, Product State, Execution, Workbench,
Execution Brief, active Campaign, linked PRD/Design sections, Work, r2 handoff and r1 finding remain
the applicable reviewed context. Shared AGENTS, 08-03, completion-signal and Harness/wiki changes
were preserved. This Review Concept is the only file overwritten; no production code,
runtime/session record, Evidence ledger, staging, commit, push or merge was performed.

## Independent verification

| Command / inspection | Result |
| --- | --- |
| Runtime records for `11826746689c462b95b7afd545a41f40` and `883abd86f25c405aae28ace201c20b65`, Work and r2 handoff | PASS; reviewer identity/output/predecessor are exact, predecessor is completed, actors differ, promised output is the reviewed handoff, and the handoff links the amended Product Work. |
| Complete correction diff plus r2 Store reducer/test increment | PASS; the correction remains confined to the 19 declared code/test paths. R2 adds only atomic admission-pair projection and its two-baseline regression, plus the handoff update. |
| `bunx vitest run packages/contracts/src/product/state.test.ts apps/service/src/product/ProductControlPlane.test.ts apps/web/src/store/productStore.test.ts apps/web/src/productReadModel.test.ts apps/web/src/productConversationMutations.test.ts apps/web/src/productQueueReconciliation.test.ts apps/web/src/productEntryDecorationsRecovery.test.ts --maxWorkers=1 --no-file-parallelism` | PASS, exit 0; 7 files / 79 tests. |
| `bunx vitest run apps/web/src/store/productStore.test.ts --maxWorkers=1 --no-file-parallelism` | PASS, exit 0; 1 file / 11 tests, including empty and prior-settled `entry-admitted` baselines. |
| `bun run --cwd packages/contracts typecheck && bun run --cwd apps/service typecheck` and `bun run --cwd apps/web typecheck` | PASS, exit 0; all three affected packages. |
| Direct `bun -e` counterexample over `applyProductFactBatch` | PASS; empty and prior-terminal baselines both returned `applied`, sequence 1, summary `run-probe / pending`, latest Run `run-probe / pending`. |
| `bunx vitest run apps/service/src/main.test.ts -t "records a startup heartbeat with Product conversation counts" --maxWorkers=1 --no-file-parallelism` | PASS, exit 0; 1 selected test / 32 skipped. |
| `bunx vitest run apps/web/src/chatRouteRecovery.test.ts apps/web/src/lib/kanbanDispatch.test.ts --maxWorkers=1 --no-file-parallelism` | PASS, exit 0; 2 files / 10 tests. |
| `bunx oxlint apps/web/src/store/productStore.ts apps/web/src/store/productStore.test.ts` | PASS, exit 0; 0 errors and one pre-existing `no-array-reverse` warning outside the r2 lines. |
| Scoped `git diff --check --` over all correction code/test files, amended Work and r2 handoff | PASS, exit 0; no output. |
| Scoped added-import, writer/schema/clock/enum and donor-authority inspection | PASS; r2 introduces no import and the complete correction adds only the Product summary field, exact Service read join, paired Web projection and allowlisted fixtures/tests. |

The unrelated full `apps/service/src/main.test.ts` suite was not rerun in r2. Its two environment/CLI
failures were reproduced and scoped during r1, the correction still changes only the Product shell
fixture line in that file, and its exact affected startup-heartbeat test passes above.

## Dispatch identity

- role: `reviewer`
- actorId: `product_latest_run_identity_reviewer_r2`
- receipt: `11826746689c462b95b7afd545a41f40`
- predecessor receipt: `883abd86f25c405aae28ace201c20b65`
- predecessor output: `../handoffs/establish-product-facts-and-typed-ingress.md`
- verdict: `PASS`
- explicitly allowed fix: none
