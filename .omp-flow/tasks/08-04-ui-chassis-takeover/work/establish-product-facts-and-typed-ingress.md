---
type: "Work"
title: "Establish Product facts and typed ingress"
---

# Establish Product facts and typed ingress

## Objective

Make Product Service the sole durable and live writer for the first visible Conversation journey,
with a fresh minimal Product Store, atomic admission/outbox, truthful dispatch receipts and
versioned typed facts consumed by Web. The donor execution route becomes unreachable for this
journey without pretending the later Pi-free Host shell has accepted a Run.

## Linked inputs

- [Product State owner](../../../../architecture/product-state.md)
- [Execution owner](../../../../architecture/execution.md)
- [PRD R5, R9, R11 and the Product portion of T2](../prd.md)
- [Design §§5.1–5.5, §8 and Product-focused verification](../design.md)
- [Source-domain H1 and Product-control mechanisms](../research/source-domain-audit.md)
- [QbD closed single-writer/typed-uncertainty findings and A-02](../qbd/design-audit.md)
- [Approved T2 real-path limitation](../qbd/design-audit-recheck.md)
- Accepted handoff for the authorized runnable source closure

## Requirement traceability

This Work owns R5's Product persistence, command, outbox, ingress and projection contract; it
establishes the Product side of R9 and preserves the projection/transport/recovery mechanisms in
R11. It implements the single-writer and raw-payload invariants from the Design. Real Pi acceptance
and crash-window settlement remain explicitly assigned to the later Pi-native execution Work.

## In scope

- Create the minimum fresh Product persistence needed for the existing seven Product State objects.
  Do not map the 88 donor migrations, import donor data or introduce an eighth public aggregate.
- Implement Product commands for Conversation creation/opening, draft and editable Queue changes,
  Entry submission with next-Run selection, pre-dispatch reorder/edit/delete, scoped controls and
  ResourceRef/system-capability invocation where the first journey consumes them.
- Represent the approved workspace distinction needed by both first journeys: an Agent Conversation
  references a managed directory or Primary Folder plus its observed ExecutionTarget, while Chat has
  no Primary Folder and keeps user file/folder references read-only. Do not create an invisible
  scratch until the selected Engine actually needs cwd, and do not model `Agent`/`Chat` as competing
  runtime types.
- Implement an atomic admission transaction that stores the user Entry, requested choices,
  workspace observation, ResourceRefs, package generation, Run identity and pending dispatch under
  a stable dispatch id.
- Represent accepted, rejected, `delivery_unknown`, running, settled and `outcome_unknown` with
  closed discriminated state. Product owns the durable receipt; renderer and Host observations do
  not become competing states.
- Implement dispatcher rules for pre-send safe retry, explicit rejection, explicit acceptance and
  uncertain send boundaries. In this Work, runtime acceptance variants are exercised only by
  closed schema/recovery fixtures; no fixture may be presented as real Engine evidence.
- Add responsibility-scoped Product command/fact/read-model exports. Raw Provider/Pi/ACP types and
  generic `payload: unknown` cannot cross into Product core or React.
- Retain and rewrite useful lease/cursor/buffer/resnapshot, tombstone, sequence, overflow and
  hot-path batching mechanisms around Product facts. Unknown protocol versions fail closed to a
  diagnostic/resnapshot path.
- Cut the first Web journey in one bounded change from donor Thread/orchestration writers to Product
  commands and read models. Remove that journey's old writer/reducer reachability; do not dual-write
  for migration convenience.
- Keep the moved donor execution code as unreachable physical T2 debt for the later deletion Work.
  Unavailable Engine state preserves draft/Queue and readable Conversation rather than invoking the
  old route or silently selecting another Engine.

## Out of scope

- Creating or supervising `apps/native-host`, importing Pi, proving Engine acceptance, stream/tool
  capability or real dispatch crash windows.
- `Agent | Chat` information-architecture surgery, material visual changes or full Workbench
  activation.
- Preserving donor migrations/data, copying Engine transcript/Session/queue, or adding a generic
  event-sourcing/runtime framework.
- Physically deleting every old Provider/orchestration module before the real replacement proof.

## Allowed repository paths

Only the Product command/fact/store/projection seam and its direct composition may change:

```text
packages/contracts/src/product/**
packages/contracts/src/index.ts                 (responsibility-scoped Product exports only)
packages/contracts/package.json
apps/service/src/product/**
apps/service/src/persistence/**                 (fresh Product schema/composition; no donor migration edits)
apps/service/src/index.ts
apps/service/src/serverLayers.ts                (Product writer composition only)
apps/service/src/wsRpc.ts                       (Product command/read-model endpoints only)
apps/service/package.json
apps/service/src/main.test.ts                    (Product shell fixture only)
apps/web/src/routes/__root.tsx
apps/web/src/routes/_chat*.tsx
apps/web/src/components/ChatView.tsx
apps/web/src/components/AgentChatWorkbench.browser.tsx              (Product summary fixture only)
apps/web/src/components/product/ProductGroupsList.browser.tsx       (Product summary fixture only)
apps/web/src/components/ProductChatJourney.browser.tsx              (Product summary fixture only)
apps/web/src/components/ProductConversationLifecycle.browser.tsx    (Product summary fixture only)
apps/web/src/components/ProductRoutePerformance.browser.tsx         (Product summary fixture only)
apps/web/src/components/ProductProjectionCoordinator.browser.tsx    (Product summary fixture only)
apps/web/src/chatRouteRecovery.test.ts                               (Product summary fixture only)
apps/web/src/composerDraft*.ts                    (durable ownership-transfer association only)
apps/web/src/lib/kanbanDispatch.test.ts            (Product summary fixture only)
apps/web/src/storeState.ts
apps/web/src/storeSelectors.ts
apps/web/src/store/**
apps/web/src/wsNativeApi.ts
apps/web/src/**/product*.ts
apps/web/package.json
package.json                                    (affected scripts only)
bun.lock                                        (only if an approved concrete persistence dependency changes)
```

Focused tests colocated under those paths may change. The handoff may be written only to
[`handoffs/establish-product-facts-and-typed-ingress.md`](../handoffs/establish-product-facts-and-typed-ingress.md).
If the first journey needs a Product fact outside these paths, update this Concept before editing;
do not smuggle Product state into Desktop, renderer-local storage or a catch-all shared package.

## Done conditions

- A fresh-start Product Store persists the minimum seven-object responsibilities and reopens a
  visible Conversation without reading donor migrations or Engine transcript.
- Product facts can reopen both a managed/folder-backed Agent Conversation and a no-Primary-Folder
  Chat with their ResourceRef/write-authority distinction intact; this is consumed by T3 rather than
  reimplemented in UI state.
- Entry, requested choices, Run and pending outbox become durable in one transaction. A crash cannot
  leave an invisible admitted input or a dispatch without its visible user Entry.
- Queue ownership transfers exactly once: editable before Product admission, never returned to the
  editable Queue after accepted or uncertain delivery.
- Contract and recovery tests distinguish validation rejection, pending pre-send, explicit
  rejection, explicit acceptance, `delivery_unknown` and `outcome_unknown`; uncertain automatic
  replay count is zero.
- The first Product journey has one durable writer and one live projection writer. Negative tests
  prove the donor Thread command/reducer/dispatcher cannot accept or project the same command.
- Web consumes only typed Product read models. Compile-time and runtime fixtures reject raw
  Provider/Pi/ACP facts, unknown protocol versions, oversized messages and generic payload renderers.
- Sequence gap, duplicate, stale snapshot, overflow, reconnect and resnapshot behavior is preserved
  under Product facts, with active detail and background summary subscriptions separated.
- With no real Engine execution available, the first journey retains input and reports truthful
  unavailable/unsupported state without accepted, indeterminate or fallback evidence.
- The handoff names the exact fresh schema, writers, command/fact boundary, removed reachability and
  residual physical debt without claiming T2 or T4 complete.

## Falsifiers and stop conditions

- Stop if old and new durable writers must accept the same command during the cutover, or if the
  visible projection requires a permanent compatibility translator.
- Stop if Product correctness requires copying Pi transcript, compaction, native queue or Package
  private state.
- Stop if React can only preserve the approved mother by consuming a generic/raw Provider event.
- Stop if uncertain delivery can only recover by blind replay or by moving the item back into the
  editable Queue. Keep it unknown and return the missing acceptance evidence to the T4 Work.

## Focused verification

Run focused contract/schema and Product tests for:

```text
atomic admission and rollback
Queue-to-Run ownership invariants
single durable/live writer negative reachability
receipt state transitions and zero uncertain replay
protocol version/size/redaction rejection
sequence gap/duplicate/stale snapshot/overflow/resnapshot
raw-payload and forbidden-import compile failures
fresh-start and restart recovery
```

Then run affected package typechecks and
`git diff --check --` over the allowed paths. Test doubles may inject Host observations only at the
typed boundary and must be labeled fixtures, never real acceptance evidence.

## Checkpoint verification

For this portion of T2, launch the Web and Product Service with the real moved transport but no Pi
execution. Create/reopen a Conversation, edit/reorder/delete Queue items, submit once and observe
truthful unsupported/unavailable behavior with the user Entry preserved. Kill Product Service at
the admission/outbox boundaries and verify the durable result. Independent review must inspect the
writer graph and actively attempt to reach the old execution route.

## Expected handoff

The handoff includes schema and command/fact diagrams, exact writer locations, atomicity and recovery
results, raw-payload/dependency failures, old-route negative proof, focused commands/results and
residual risks reserved for real Host acceptance. It states that typed variants and fixtures do not
prove Pi execution, UI completion or Campaign claims.

## Ordering and review

This Work follows the authorized source/identity closure and precedes Host process work. It may not run concurrently with
the Host Work because both update Service/contracts composition. Its independent reviewer focuses on
authority, atomicity, uncertainty and raw ingress, not UI taste or Pi feature completeness.
