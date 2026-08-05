---
type: "Work"
title: "Align completion signals with Product facts"
---

# Align completion signals with Product facts

## Objective

Translate the maintainer-approved completion-notification insights reviewed through Synara
`v0.6.7` into OmniMind's Product-owned Conversation/Run/receipt model. Deliver one truthful,
deduplicated completion signal across in-app toasts and Desktop notifications without restoring
donor Thread/Turn/Provider execution authority or treating timestamps and foreground heuristics as
outcome truth.

## Linked inputs

- [Maintainer-approved source-update evidence](../../../../research/source-review.md#8-maintainer-initiated-synara-v067-intake)
- [Durable source-update and taste protocol](../../../../research/source-update-intake.md)
- [Product Run, receipt, recovery and uncertainty owner](../../../../architecture/product-state.md)
- [Desktop notification and process responsibility](../../../../architecture/execution.md)
- [Workbench route, dock and visibility behavior](../../../../architecture/workbench.md)
- Accepted handoff and independent review from
  [Harden active Workbench mechanisms](harden-active-workbench-mechanisms.md)
- [Frozen-candidate gate](freeze-first-production-candidate.md)

## Requirement traceability

This Work carries R9 and R11 by making visible completion/recovery behavior agree with Product
receipt truth after donor execution authority is gone. It contributes current fault, foreground and
UI evidence to R12. It does not add a new Product object, Engine lifecycle or public notification
ontology.

## Product completion contract

- A candidate is identified by stable Product identity, normally `ConversationId + RunId`; mutable
  timestamps, display order and later projection refreshes are never part of deduplication identity.
- Notify success only from a Product-owned terminal outcome that actually means successful
  completion. Interrupted, cancelled, failed, rejected, delivery-unknown and outcome-unknown states
  must not be rewritten as success.
- Projection wobble, reconnect, resnapshot and equivalent repeated terminal facts produce at most one
  completion signal for the same Run. A genuinely new Run in the same Conversation remains
  independently notifiable.
- Stale shell/detail snapshots cannot settle or notify over a newer active Run. Existing Product
  sequence, receipt and recovery facts remain authoritative; do not reconstruct Session truth.
- In-app toast suppression uses the Conversations actually rendered in the current route, split and
  active dock. Persisted-but-hidden dock state is not visibility.
- Desktop notification suppression must be enforced at both the renderer request site and Desktop
  Host boundary. A focused OmniMind window or focused native browser surface already holding the
  user's attention must not produce a redundant system notification.
- Foreground suppression is presentation policy, not loss of completion history. Sidebar unread/
  attention state continues to follow Product visit and outcome facts.
- No notification action may blindly replay an unknown Run. Any retry/re-entry action must use the
  existing typed Product policy for the exact failure state.

## In scope

- Replace donor Thread/latestTurn-based Product completion candidates with selectors derived from
  current typed Product facts.
- Keep a view-only adapter local if a mature toast component requires it; it cannot become durable
  state or a compatibility contract.
- Apply route/split/dock rendered truth established by the preceding Work.
- Add the minimum scoped Desktop IPC field/handler needed for defense-in-depth foreground
  suppression, including the native browser pane.
- Translate upstream identity, wobble, stale-snapshot, visibility and foreground tests to Product
  Run/receipt semantics.
- Preserve truthful notification behavior for any non-Product system event only through its existing
  concrete owner; do not funnel unrelated notices through Product Run completion.
- Record source provenance and legal consequences for adopted logic.

## Out of scope

- Structured approval/question notifications whose Product contract is not yet implemented.
- Provider update notifications, voice status, Package updates or External Engine maintenance.
- Sidechat creation/fork ownership, Browser Agent runtime activation or any retry/replay redesign.
- New notification preferences, channels, schedules, public state enums or a general notification
  service.
- Restoring donor Session, Turn, Provider status or orchestration event projection.

## Allowed repository paths

```text
apps/web/src/notifications/**
apps/web/src/components/ui/toast.tsx
apps/web/src/components/ui/toastRouteVisibility.*
apps/web/src/routes/__root.tsx                      (coordinator composition only)
apps/web/src/productReadModel.*                    (selector/presentation only)
apps/web/src/store/productStore.*                  (read selector only; no second writer)
apps/web/src/rightDockStore.logic.*                (rendered visibility only)
apps/web/src/wsTransportEvents.ts                  (existing lifecycle observation only, if needed)
apps/desktop/src/main.ts                           (notification boundary only)
apps/desktop/src/preload.ts                        (existing notification bridge only, if needed)
apps/desktop/src/**/*.test.ts                      (colocated notification/foreground proof only)
packages/contracts/src/ipc.ts                      (bounded notification request only)
packages/contracts/src/product/state.ts            (existing fact use only; schema change requires stop)
README.md                                          (existing source-adoptions block only, if required)
LICENSES/**                                        (actual attribution correction only)
```

The implementation handoff may be written only to
[`handoffs/align-product-completion-signals.md`](../handoffs/align-product-completion-signals.md).

## Done conditions

- Each successful Product Run generates at most one logical completion signal across projection
  wobble, reconnect and resnapshot; a later Run remains distinct.
- Failed, interrupted, cancelled, rejected and unknown states never render a success completion.
- A stale snapshot cannot settle or notify over a newer active Run.
- Current route, split and rendered dock Conversations suppress redundant toasts; hidden persisted
  panes do not.
- Focused renderer and focused native browser states both suppress system notifications at the
  Desktop boundary, while background completion remains visible.
- Foreground suppression does not mark unseen work visited or remove Sidebar attention.
- No Product notification path imports donor execution contracts, calls a retired route, creates a
  second writer or offers blind replay.
- Provenance and required MIT attribution match the adopted bytes and mechanism.

## Falsifiers and stop conditions

- Stop if existing Product facts cannot distinguish successful terminal outcome from cancellation,
  failure or unknown. Do not invent a public enum inside this Work; return the missing fact to its
  owner and maintainer.
- Stop if Desktop cannot enforce foreground truth without trusting a renderer-only claim or exposing
  raw native handles.
- Stop if deduplication needs wall-clock coincidence instead of stable Product identity/sequence.
- Stop if supporting an old notification path would restore donor Session/Turn authority.

## Focused verification

Run pure candidate/deduplication tests, Product store selector tests, real browser route/split/dock
visibility tests and Desktop IPC/foreground boundary tests. Include failure, cancel, unknown,
reconnect/resnapshot, repeated settle, new-Run, focused-window, native-browser-focus and background
cases. Then run affected Web/Desktop typechecks and the narrow source/authority scans. Record exact
commands, exits and test counts in the handoff.

## Expected handoff and review

The handoff maps every source insight to Product facts, lists changed paths and provenance, and
records the candidate matrix plus Desktop/browser evidence. A different actor independently reviews
outcome truth, deduplication, visibility, unread preservation, authority and legal closure. Only a
current accepted review permits Freeze to begin.

## Ordering

Begin after the active-Workbench Work is accepted so notification visibility consumes its final
route/dock semantics. Finish before frozen-candidate selection. This is a bounded post-QbD source
intake authorized by the maintainer; it does not reopen Converge, QbD or visual direction.
