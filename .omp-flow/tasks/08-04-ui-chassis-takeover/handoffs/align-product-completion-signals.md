---
type: "Implementation Handoff"
title: "Align completion signals with Product facts"
work: "../work/align-product-completion-signals.md"
status: "CANDIDATE"
revision: "handoff-align-product-completion-signals-20260805-r4"
actor_id: "product_completion_signals_implementer_r4"
dispatch_receipt: "36a9071396d549f59d8794c8087fae51"
predecessor_receipt: "dec3fb0a0ec64df08306bcd314878dad"
predecessor: "../reviews/align-product-completion-signals.md"
---

# Align completion signals with Product facts

## Outcome

`DONE` as an implementation candidate for independent review, not self-accepted Work completion.

Product completion now has a dedicated observer whose only success proof is the exact latest
`ProductRun` receipt for a retained Product Conversation. Shell receipt state can acquire and hold an
observation lease, but cannot manufacture outcome truth. The accepted Product owner correction adds
`summary.latestRunId`, so shell and detail now correlate by exact Product identity rather than by
unrelated cursors, revision, clocks or display order. Stable `ConversationId + RunId` identity
deduplicates repeated settle, reconnect and resnapshot while preserving a later Run as a distinct
candidate. Failure, cancellation, rejection and both delivery/outcome uncertainty never produce
success.

This r3 candidate addresses the r1 completion review P1. A stale rejected, delivery-unknown,
outcome-unknown or temporarily absent shell cannot release a lease over a newer active detail Run
when detail contains the shell's exact prior Run and names a different latest Run. A non-success
shell for the same exact Run may release; a shell Run absent from detail is provably ahead and waits;
and an initial terminal baseline releases without replay once shell settles that same exact Run. The
former unbounded handled-Run set is replaced by one handled Run identity per potentially live
Conversation, overwritten by a later Run and deleted on true removal.

This r4 candidate addresses the r3 review's same-Run recovery finding. `delivery_unknown` and
`outcome_unknown` remain zero-success states and may release their observation lease, but they no
longer create a definitive handled identity. The currently supported Product-authoritative
`pending → delivery_unknown → accepted → running → settled/succeeded` journey therefore re-arms the
same exact Run and emits once. Its later same-Run active/settled wobble remains suppressed by the
definitive handled identity written only at settled outcome. Rejected and every settled outcome
remain definitive histories.

The runtime mounts in the real root composition, suppresses toasts from the route, split panes and
the actually open active sidechat dock pane, and leaves hidden persisted panes out of visibility.
Product Chat Open actions explicitly navigate with `surface=chat`; Product Agent actions omit the
surface and use the route default. System notifications are requested only while the renderer is in
the background, and Desktop Main independently rechecks its `BrowserWindow` before constructing an
OS notification. This includes focus held by a native browser guest because Main owns the containing
window truth.

The donor Thread/latestTurn completion heuristic and assistant-message summary extraction were
removed. Existing concrete approval/user-input and Terminal notices remain under their existing
owners. No Product visit/unread/attention fact is written, no blind replay action was introduced, and
the existing Product retain/release and projection refresh lifecycle remains the sole detail owner.

## Mechanism mapping and provenance

| Accepted source insight                      | Source revision / material mechanism                                                                                                             | Product-owned expression                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stable completion identity and wobble dedupe | `be6dcad3f63fa121fbe3180f257ba1ff128696c4`; completion logic from source commits `e2efe48`, `210d6df` and notification integration in `93545c97` | `ConversationId + RunId`; one handled Run per live Conversation survives same-Run wobble and is overwritten by a later Run                         |
| Outcome truth                                | Same reviewed completion mechanism, semantically translated rather than copying donor Session/Turn facts                                         | Only latest `ProductRun.receipt.receipt.state === "settled" && outcome === "succeeded"` emits success                                              |
| Stale shell/detail defense                   | Reviewed stale snapshot and repeated-settle cases plus accepted Product owner review `11826746689c462b95b7afd545a41f40`                          | Required shell/detail `latestRunId` correlation; detail proves shell stale only when it contains that shell Run and names another exact latest Run |
| Rendered visibility                          | Reviewed route/split visibility plus the accepted preceding Workbench dock owner                                                                 | Active route, split panes or the open active sidechat dock suppress; a hidden persisted dock does not                                              |
| Foreground defense in depth                  | Reviewed renderer and native-window foreground mechanism                                                                                         | Renderer suppresses the request; Desktop Main independently checks visible, non-minimized and focused `BrowserWindow` before `new Notification`    |
| Exact re-entry                               | Reviewed action routing, translated to current Product route                                                                                     | Chat uses `/$threadId?surface=chat`; Agent uses `/$threadId` with no manufactured surface; no retry/replay action exists                           |

The existing README source-adoptions entry now names the exact notification, visibility, Desktop and
IPC source/target files and records that Product Conversation/Run/receipt identity was adopted while
donor Thread/Turn authority was excluded. The applicable Emanuele Di Pietro MIT notice was already
present in `LICENSES/ui-mother-MIT.txt` from the accepted predecessor Work, so no duplicate legal edit
was necessary.

## Candidate and lease matrix

| Observed state                                                                                                | Candidate                        | Lease result                                                         |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| Initial hydrated rejected or settled history                                                                  | none                             | none; remember only its latest definitive exact Run identity         |
| Initial stale non-success shell whose exact Run is contained in detail, while detail names a newer active Run | none                             | acquire once and arm the newer detail Run                            |
| Initial missing shell Conversation with no exact shell identity                                               | none                             | do not resurrect detail or acquire a lease                           |
| Shell pending/accepted/running                                                                                | none                             | acquire once and arm its exact `latestRunId`                         |
| Stale rejected/delivery-unknown/outcome-unknown or absent shell over a proven newer active detail Run         | none                             | retain and arm the newer exact Run                                   |
| Same-Run rejected/delivery-unknown/outcome-unknown shell                                                      | none                             | release without success, even if matching detail is still active     |
| Shell names a Run that detail does not contain                                                                | none                             | retain and wait for that exact Run detail                            |
| Exact terminal baseline and settled shell name the same Run                                                   | none                             | release without replay                                               |
| Exact armed latest Run settled/succeeded                                                                      | one per `ConversationId + RunId` | release and overwrite the Conversation's handled identity            |
| Exact latest Run failed/cancelled or rejected                                                                 | none                             | release and overwrite the Conversation's definitive handled identity |
| Exact latest Run delivery-unknown or outcome-unknown                                                          | none                             | release without creating a definitive handled identity               |
| Same exact Run later returns to accepted/running under Product authority                                      | none                             | reacquire and re-arm that Run                                        |
| Recovered same exact Run later settles succeeded                                                              | one per `ConversationId + RunId` | release and write definitive handled identity                        |
| Reconnect/resnapshot of the handled Run                                                                       | none                             | no replay; a later exact Run remains distinct                        |
| True Conversation removal, settings disable or component unmount                                              | none                             | release owned leases; true removal deletes tracker identity          |

The observer never uses timestamps, board state, revision, shell/detail cursor comparison or display
order to establish success. Its handled state is a component-local single Run identity per
potentially live Conversation; it is not persisted and is not a second Product writer.

## Changed paths

Production and integration:

```text
README.md
apps/desktop/src/main.ts
apps/web/src/components/ui/toastRouteVisibility.ts
apps/web/src/notifications/productCompletion.logic.ts
apps/web/src/notifications/productCompletion.tsx
apps/web/src/notifications/taskCompletion.logic.ts
apps/web/src/notifications/taskCompletion.tsx
apps/web/src/routes/__root.tsx
packages/contracts/src/ipc.ts
```

Colocated proof:

```text
apps/desktop/src/desktopNotificationBoundary.test.ts
apps/web/src/components/ui/toastRouteVisibility.browser.tsx
apps/web/src/components/ui/toastRouteVisibility.test.ts
apps/web/src/notifications/productCompletion.logic.test.ts
apps/web/src/notifications/taskCompletion.logic.test.ts
```

All paths are inside the Work allowlist. Existing dirty `AGENTS.md`, the 08-03 QbD file, unrelated
08-03 handoff/review files and Harness/wiki configuration were preserved untouched. The Product
contract/Service/Store and broad fixture changes that establish `latestRunId` belong to the accepted
predecessor receipt `11826746689c462b95b7afd545a41f40`; this r3 actor changed only
`productCompletion.logic.ts`, its pure test, the completion-owned browser fixture and this handoff
beyond the existing r1 candidate. The r4 increment changes only `productCompletion.logic.ts`, its
pure test and this handoff. This actor did not edit review or runtime/session records, stage, commit,
push or merge.

## Verification

| Command / inspection                                                                                                                                                                                           | Result                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bunx vitest run src/notifications/productCompletion.logic.test.ts --reporter=verbose` in `apps/web`                                                                                                           | PASS, exit 0; 1 file / 30 tests; includes complete same-Run `pending → delivery_unknown → accepted → running → settled/succeeded`, definitive-history and post-success replay controls                       |
| `bunx vitest run src/notifications/productCompletion.logic.test.ts src/notifications/taskCompletion.logic.test.ts src/components/ui/toastRouteVisibility.test.ts src/store/productStore.test.ts` in `apps/web` | PASS, exit 0; 4 files / 52 tests. Preserves the full r3 exact-identity, stale projection, visibility helper, bounded state, removal and Product Store matrix                                                 |
| `bunx vitest run --config vitest.browser.config.ts src/components/ui/toastRouteVisibility.browser.tsx` in `apps/web`                                                                                           | PASS, exit 0; 1 file / 5 tests. Mounts the actual `ProductCompletionNotifications`; proves route, split, active/hidden dock, exact Chat Open route, renderer request suppression and unmount release         |
| `bunx vitest run src/desktopNotificationBoundary.test.ts` in `apps/desktop`                                                                                                                                    | PASS, exit 0; 1 file / 3 tests. Executes the real `main.ts` foreground and show functions; focused/native-guest window constructs zero notifications, while hidden/minimized/unfocused windows call `show()` |
| `bun run typecheck` in `apps/web`                                                                                                                                                                              | PASS, exit 0                                                                                                                                                                                                 |
| `bun run typecheck` in `apps/desktop`                                                                                                                                                                          | PASS, exit 0                                                                                                                                                                                                 |
| `bun run typecheck` in `packages/contracts`                                                                                                                                                                    | PASS, exit 0                                                                                                                                                                                                 |
| `bun run check:sources`                                                                                                                                                                                        | PASS, exit 0; 1 adopted source                                                                                                                                                                               |
| `bun run licenses:check`                                                                                                                                                                                       | PASS, exit 0; deterministic release legal metadata for 230 components                                                                                                                                        |
| Scoped Product production scan for donor completion/retired authority plus `shellSequence` and `detailSequenceByConversation`                                                                                  | PASS; zero hits; no cursor comparison                                                                                                                                                                        |
| Scoped Product production scan for Conversation/receipt/board/unread mutation and retry/replay actions                                                                                                         | PASS; zero hits                                                                                                                                                                                              |
| Both completion-owned decoded fixtures require `latestRunId`                                                                                                                                                   | PASS; pure tracker and real-browser fixtures both updated                                                                                                                                                    |
| `bunx oxfmt --check` over the two r4 code/proof paths                                                                                                                                                          | PASS, exit 0; both matched files formatted                                                                                                                                                                   |
| `git diff --check` and generated browser screenshot/`.vitest-attachments` scan                                                                                                                                 | PASS; no diff errors and no generated artifacts remain                                                                                                                                                       |

The first browser attempt failed before entering Product logic because its typed fixture lacked the
current `packageGeneration`, enforcement and execution-target fields. The fixture was corrected;
diagnostic screenshots/attachments were removed rather than accepted as baselines, and the final
real-browser command above is green.

## Decisions and caveats

- The accepted Product owner now provides a required `latestRunId / receiptState` pair in both shell
  and detail summaries. Completion correlates that stable identity with the exact detail Run
  receipt. Shell has no outcome and still cannot manufacture success.
- Detail proves a shell projection stale only when its Run collection contains the shell's exact
  `latestRunId` and its own summary names a different latest Run. Conversely, a shell Run absent
  from detail is treated as newer and retains the lease until detail catches up. Initial hydration
  without a shell Conversation identity does not resurrect an otherwise retained detail.
- The component-local handled map holds at most one Run per potentially live Conversation. A later
  Run overwrites it; true Conversation removal deletes handled, armed and remembered shell identity.
  Same-Run resnapshot wobble remains deduplicated without an unbounded history set.
- Only rejected and settled receipts create definitive handled identity. Delivery-unknown and
  outcome-unknown release without success and without creating that barrier. Current Product
  Service explicitly supports delivery-unknown recovery to accepted with zero automatic replay;
  outcome-unknown has no current reverse transition, so r4 merely avoids blocking a future
  Product-authoritative transition and does not claim that journey is currently supported.
- No live Provider request was needed because this Work changes Product projection presentation,
  browser routing and Desktop notification focus policy, not Provider/Model/Thinking wire behavior.
- No independent review has occurred for this candidate. This handoff does not claim Work
  acceptance, frozen-candidate eligibility or repository-wide quality.

## Reviewer focus

Independently challenge same-Run recovery first: unknown must emit zero and release, accepted/running
must re-arm the same identity, final succeeded must emit once, and every later same-Run wobble must
emit zero while a later Run remains distinct. Verify rejected/settled hydration and failed/cancelled
remain definitive, and that outcome-unknown is described only as future-safe tracker behavior, not
current Product Service support. Then challenge exact `latestRunId` correlation: the four stale non-success/absent shell
cases with newer active RUN2, the same-Run non-success release, initial hydration in both stale-shell
and no-shell forms, shell-newer/detail-old wait, same-Run terminal baseline release, terminal outcome
matrix, same-Run wobble and later-Run distinction. Inspect the multi-Conversation/multi-Run bound and
true-removal cleanup. Then recheck route/split/open-dock suppression, Chat/Agent Open routing,
renderer plus Desktop Main foreground defense, and the absence of cursor comparison, Product
mutation, donor authority and blind replay. Verify source/legal closure remains unchanged.

## Dispatch identity

- role: `implementer`
- actorId: `product_completion_signals_implementer_r4`
- receipt: `36a9071396d549f59d8794c8087fae51`
- predecessor receipt: `dec3fb0a0ec64df08306bcd314878dad`
- predecessor review: `../reviews/align-product-completion-signals.md`
- promised output: `../handoffs/align-product-completion-signals.md`
- operation conclusion: `DONE`; implementation candidate ready for independent review
