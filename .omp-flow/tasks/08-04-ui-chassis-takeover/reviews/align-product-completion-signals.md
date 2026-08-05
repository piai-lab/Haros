---
type: "Implementation Review"
title: "Final review: Align completion signals with Product facts"
work: "../work/align-product-completion-signals.md"
handoff: "../handoffs/align-product-completion-signals.md"
verdict: "PASS"
revision: "review-align-product-completion-signals-20260805-r4"
actor_id: "product_completion_signals_reviewer_r4"
dispatch_receipt: "c8e3de64aeda4b3a87b45927af8590fe"
predecessor_receipt: "36a9071396d549f59d8794c8087fae51"
predecessor_output: "../handoffs/align-product-completion-signals.md"
product_owner_review_receipt: "11826746689c462b95b7afd545a41f40"
reviewed_revision: "handoff-align-product-completion-signals-20260805-r4"
---

# Final review: Align completion signals with Product facts

## Findings

No material findings.

The r3 P1 is closed. The tracker now records a handled identity only for definitive Product history:
`rejected` or a `settled` receipt, including failed and cancelled outcomes. `delivery_unknown` and
`outcome_unknown` still emit zero success and release their observation lease, but no longer create
the handled barrier that previously suppressed a later Product-authoritative success for the same
exact Run.

Independent counterexample execution over one `ConversationId + RunId` proved:

```text
pending → delivery_unknown → accepted → running → settled/succeeded
unknown: candidates=0, release=1, handled=null
accepted: re-armed=run-1
settled/succeeded: candidates=[run-1]
accepted → settled/succeeded replay after success: candidates=0, handled=run-1
```

The same pure-tracker matrix for `outcome_unknown` proves future-safe zero-success release and
same-Run re-arming, but this review does not claim that current Product Service supports an
`outcome_unknown → accepted` transition. Current Product owner evidence supports
`delivery_unknown → accepted` with one execution attempt and zero automatic replay. Separate
counterexamples for rejected, settled/failed and settled/cancelled each retained `handled=run-1`
and emitted zero after an artificial same-Run active/succeeded wobble.

The prior exact-identity correction also remains sound: stale rejected, either unknown state, or an
absent shell cannot release a newer active detail Run; shell-ahead/detail-old waits; initial
terminal history does not replay; repeated same-Run settle is deduplicated; a later Run remains
distinct; handled state is bounded to one Run per live Conversation and true removal clears it.

## Verdict

`PASS`.

The implementation satisfies the bounded Work and is eligible to proceed to its next workflow
gate. This verdict covers Product completion signaling only; it does not accept unrelated changes
in the shared dirty worktree or declare the repository/Campaign complete. Explicitly allowed fix:
none.

## Scope and contract review

- Success still requires the exact latest Product `ConversationId + RunId` detail receipt to be
  `settled/succeeded`; shell state, timestamps, cursors and display order cannot manufacture it.
- Failed, cancelled, rejected and both unknown states emit no success. Rejected and all settled
  outcomes are definitive handled history; unknown states remain provisional and recoverable.
- Route, split and actually open active sidechat dock Conversations suppress the toast, while a
  hidden persisted dock does not. Chat re-entry sets `surface=chat`; Agent uses the route default.
- The renderer requests an OS notification only in background, and Desktop Main independently
  checks visible, non-minimized and focused `BrowserWindow` truth before constructing it, covering
  native browser guest focus through the containing window.
- Completion paths do not write Product visit/unread/attention/board facts, invoke retry/replay,
  restore donor Thread/latestTurn completion authority or compare unrelated projection cursors.
  Existing concrete approval/user-input and Terminal notices remain separately owned.
- README selective-intake provenance names the adopted Synara source and target mechanisms; the
  retained Emanuele Di Pietro MIT notice and deterministic release metadata are valid.

I followed the Work links to the Product receipt/recovery owner, Workbench visibility owner,
Desktop process owner, source-update protocol and reviewed source evidence. No owner conflict,
security regression, second writer, public schema invention or unsupported transition claim was
found.

## Predecessor and review boundary

Reviewer receipt `c8e3de64aeda4b3a87b45927af8590fe` resolves to active reviewer actor
`product_completion_signals_reviewer_r4`, required output this Review Concept, and completed
predecessor `36a9071396d549f59d8794c8087fae51`. That predecessor resolves to implementer actor
`product_completion_signals_implementer_r4`, whose exact output is the r4 handoff reviewed here.
The actors differ; the handoff links back to this Work and identifies its r3 review predecessor.

The r4 increment is confined to
[`productCompletion.logic.ts`](../../../../apps/web/src/notifications/productCompletion.logic.ts),
its colocated pure test and the implementation handoff. I inspected the complete current logic,
test matrix and integration paths rather than accepting the handoff's claims. The shared worktree
contains unrelated changes from other actors; they were preserved and are outside this verdict.
This reviewer changed only this Review Concept and did not edit production code, handoff,
runtime/session records or an Evidence ledger, and did not stage, commit, push or merge.

## Independent verification

| Command / inspection | Result |
| --- | --- |
| Receipt JSON for `c8e3de64aeda4b3a87b45927af8590fe` and `36a9071396d549f59d8794c8087fae51`; Work and r4 handoff | PASS; task, role, actor separation, completed predecessor, exact output, revision and mutual Work/handoff links match |
| `bunx vitest run src/notifications/productCompletion.logic.test.ts --reporter=verbose` in `apps/web` | PASS, exit 0; 1 file / 30 tests, including both unknown re-arm cases, full delivery recovery, post-success replay, definitive histories, r3 stale/order/bounds/removal matrix |
| Direct `bun -e` matrix against `advanceProductCompletionTracker` for both unknown states and rejected/failed/cancelled controls | PASS, exit 0; each unknown emitted 0 and left handled unset, re-armed `run-1`, then emitted exactly 1 success and 0 post-success replay; all three definitive controls emitted 0 and preserved handled across replay |
| `bunx vitest run src/notifications/productCompletion.logic.test.ts src/notifications/taskCompletion.logic.test.ts src/components/ui/toastRouteVisibility.test.ts src/store/productStore.test.ts` in `apps/web` | PASS, exit 0; 4 files / 52 tests |
| `bunx vitest run src/product/ProductControlPlane.test.ts -t "reconciles delivery_unknown to accepted and then outcome_unknown without replay" --maxWorkers=1 --no-file-parallelism` in `apps/service` | PASS, exit 0; 1 passed / 31 skipped; confirms current Product-authoritative delivery reconciliation and zero replay |
| `bunx vitest run --config vitest.browser.config.ts src/components/ui/toastRouteVisibility.browser.tsx` in `apps/web` | PASS, exit 0; 1 file / 5 tests over the real component, route/split/open-hidden dock, re-entry, renderer suppression and lease cleanup |
| `bunx vitest run src/desktopNotificationBoundary.test.ts` in `apps/desktop` | PASS, exit 0; 1 file / 3 tests; focused/native-guest-containing window suppresses before OS notification construction and background cases show |
| `bun run typecheck` in each of `apps/web`, `apps/desktop`, `packages/contracts` | PASS; all three exit 0 |
| `bun run check:sources && bun run licenses:check` at repository root | PASS, exit 0; 1 adopted source and deterministic legal metadata for 230 components |
| `bunx oxfmt --check apps/web/src/notifications/productCompletion.logic.ts apps/web/src/notifications/productCompletion.logic.test.ts apps/web/src/components/ui/toastRouteVisibility.browser.tsx` | PASS, exit 0; all 3 files formatted |
| Scoped donor/cursor and Product mutation/replay scans; current notification/IPC/Main integration inspection | PASS; no completion-owner authority or writer violation; unrelated legacy `latestTurnState` composition and CSS `cursor` text are not Product completion logic |
| `git diff --check` and generated browser-artifact scan | PASS, exit 0; no diff errors and no `.vitest-attachments` remain |

## Dispatch identity

- role: `reviewer`
- actorId: `product_completion_signals_reviewer_r4`
- receipt: `c8e3de64aeda4b3a87b45927af8590fe`
- predecessor receipt: `36a9071396d549f59d8794c8087fae51`
- predecessor output: `../handoffs/align-product-completion-signals.md`
- verdict: `PASS`
- explicitly allowed fix: none
