---
type: "Work"
title: "Harden active Workbench mechanisms"
---

# Harden active Workbench mechanisms

## Objective

Absorb the maintainer-approved, currently relevant interaction and lifecycle improvements reviewed
through Synara `v0.6.7` (`be6dcad3f63fa121fbe3180f257ba1ff128696c4`) into OmniMind's existing
Workbench after competing execution authority has been retired. Preserve the upstream problem,
mechanism, failure model and interaction taste while expressing each behavior through current
OmniMind UI, Product and system owners. Do not merge the upstream range, restore donor execution
authority or treat similar-looking output as equivalent proof.

## Linked inputs

- [Maintainer-approved source-update evidence](../../../../research/source-review.md#8-maintainer-initiated-synara-v067-intake)
- [Durable source-update and taste protocol](../../../../research/source-update-intake.md)
- [Workbench behavior, lineage and proof owner](../../../../architecture/workbench.md)
- [Execution responsibility and system-capability boundary](../../../../architecture/execution.md)
- [Product State authority boundary](../../../../architecture/product-state.md)
- Accepted handoff and independent review from
  [Retire competing execution authority](retire-competing-execution-authority.md)
- [Frozen-candidate gate](freeze-first-production-candidate.md)

## Requirement traceability

This Work carries R7 and R11 by preserving and hardening active mature Workbench behavior after the
T4 authority deletion. It also contributes current UI, recovery, accessibility and performance
evidence required by R12. It does not change T0-T4 architecture, add a new product checkpoint or
claim that deferred Synara capabilities are implemented.

## Accepted mechanism set

### Deferred Conversation mount

- Replace the unbounded double-`requestAnimationFrame` wait with an exact-once scheduler that still
  waits for two frames in the normal path and commits through a bounded fallback when Electron
  startup or background throttling suppresses frames.
- Cleanup must cancel both frame and timer paths and prevent a stale mount key from committing.
- Preserve the current retained-Conversation activity/visibility contract; do not use this repair to
  change retention count, route authority or performance thresholds.

### Model identity and accessibility

- When favourite models are detached from their ordinary grouping, show and announce enough
  provider provenance to distinguish equal display names.
- Prefer live catalog provenance, then a safe humanization of a real provider segment; never invent
  a static capability catalog or infer wire semantics from a label.
- Preserve model-cost accessibility when adding provenance. Visual secondary text must not erase the
  complete accessible name or cost description.

### Browser presentation and desktop geometry

- Use an opaque control surface for browser annotation cards that render inside guest pages without
  the composer's backdrop-blur assumption.
- Preserve OmniMind's source-neutral Pointer glyph; do not reintroduce donor icon identity.
- Convert renderer CSS rectangles to Electron DIPs using the current page zoom before positioning
  native browser surfaces. Invalid zoom data must degrade to factor `1`, not zero or `NaN`.
- This Work does not activate or redesign Agent browser automation. Persistent background Agent
  runtimes, budgets and human-takeover epochs remain deferred to their recorded trigger.

### Transcript and activity recovery

- A tail anchor or settled-collapse animation that already completed before remount/hydration must
  not replay when reopening a Conversation or hydrating historical tools.
- Only a row actually observed live may animate its transition into settled collapsed history. A
  newer Run, reconnect or thread-wide working flag must not animate an unrelated historical row.
- Rank Project activity using current-working-day user interaction and choose the latest Project by
  actual user activity where available, not merely creation/rename timestamps or newer background
  Agent output. Preserve stable ordering and existing Product visibility rules.

### Terminal capability routing and lifecycle

- Publish `Add to chat` only when the terminal surface has a real Composer target. Route the selected
  context to the Composer owning the exact pane scope; no current/stale global callback may receive
  it, and a dock terminal must never expose a no-op action.
- A terminal-only surface with no Composer hides the action truthfully.
- Natural shell exit clears running activity and closes only the exited tab without destructive
  confirmation, placeholder deletion or a duplicate fallback `exit` write.
- If a dock terminal contract requires one open terminal, closing the final exited tab creates one
  fresh replacement identity atomically; it must not reuse or resurrect the exited runtime.

## In scope

- Implement the accepted mechanisms above against the post-retirement production tree.
- Translate upstream tests to OmniMind nouns and current route/Product/system boundaries.
- Preserve existing Agent/Chat, split, dock, terminal, browser, model-picker and accessibility
  behavior not contradicted by the accepted mechanisms.
- Record exact upstream commit/file provenance for materially copied or translated code and update
  the existing root adoption disclosure/legal notice only as required by actual adopted bytes.
- Run focused normal, failure and cleanup checks plus real browser geometry/accessibility tests and
  the affected route-switch/performance gate on the resulting candidate.

## Out of scope

- Persistent background Agent browser execution; Pi browser tool wiring; browser runtime budgets.
- Voice/Mic activation or optimization; Sidechat Product ownership; GitHub Project import;
  out-of-root file relocation; Claude/OpenCode discovery, permissions or updates.
- Restoring Provider, Session, orchestration, accepted-queue or Package authority deleted by T4.
- Changing Product objects, Native Host topology, brand assets, palette or the accepted Agent/Chat
  information architecture.
- Importing Synara release notes, first-party identity, version numbers or generated history.

## Allowed repository paths

Only the active mechanisms and their colocated tests may change:

```text
apps/web/src/components/BrowserPanel.tsx
apps/web/src/components/BrowserPanel.logic.ts
apps/web/src/components/BrowserPanel*.test.*
apps/web/src/components/ChatView.tsx                 (integration wiring/tests only)
apps/web/src/components/ChatView.browser.tsx
apps/web/src/components/Sidebar.tsx                  (activity/Project target wiring only)
apps/web/src/components/SidebarActivityView.*
apps/web/src/components/ThreadTerminalDrawer.*
apps/web/src/components/chat/ChatThreadSurfacePrimitives.tsx
apps/web/src/components/chat/deferredChatMount.*
apps/web/src/components/chat/MessagesTimeline.*
apps/web/src/components/chat/ProviderModelOptionGroupList.tsx
apps/web/src/components/chat/ProviderModelPicker.browser.tsx
apps/web/src/components/chat/DockTerminalPane.tsx
apps/web/src/components/chat/useChatTerminalController.*
apps/web/src/components/terminal/**                  (terminal lifecycle/selection only)
apps/web/src/hooks/useTerminalSurfaceController.ts
apps/web/src/lib/desktopZoom.*
apps/web/src/lib/projectShortcutTargets.*
apps/web/src/lib/terminalContextComposerRegistry.*
apps/web/src/providerModelOptions.*
apps/web/src/rightDockStore.logic.*                  (terminal visibility/target truth only)
apps/web/src/storeSelectors.*                        (Project interaction selector only)
apps/web/src/terminalStateStore.*
packages/shared/src/desktopChrome.*
packages/contracts/src/ipc.ts                        (existing scoped terminal/browser shape only)
README.md                                            (existing source-adoptions block only, if required)
LICENSES/**                                          (actual attribution correction only)
```

A direct consumer outside this list may change only when it cannot compile or prove the accepted
mechanism without a bounded wiring edit. The handoff must name the file, dependency and proof. This
does not authorize adjacent cleanup or a compatibility facade.

The implementation handoff may be written only to
[`handoffs/harden-active-workbench-mechanisms.md`](../handoffs/harden-active-workbench-mechanisms.md).

## Done conditions

- Deferred mount settles once through normal frames or the bounded fallback and never after cleanup.
- Favourite equal-name models are visually and accessibly distinguishable without a static catalog.
- Annotation surfaces are opaque in the guest page and native browser bounds remain aligned across
  the existing zoom matrix.
- Reopen/hydration does not replay settled motion; a genuinely live row still performs the intended
  transition once.
- Project ordering and new-Conversation fallback reflect user activity with stable deterministic
  ties.
- Terminal selection reaches exactly the owning Composer, unavailable targets expose no action, and
  natural exit performs one non-destructive cleanup with correct dock replacement.
- Existing Agent/Chat, split/dock, CJK/IME, keyboard, a11y and route performance gates remain green.
- Negative scans and review find no restored donor identity, Runtime, generic command bus, global
  Composer target or second UI state owner.
- Exact upstream provenance and any required MIT attribution match the bytes actually adopted.

## Falsifiers and stop conditions

- Stop if implementation requires the deleted orchestration/Provider APIs, raw Engine state in
  React, a global last-active Composer callback or a second terminal/browser runtime owner.
- Stop if a supposed semantic port can prove only visual resemblance and cannot name the preserved
  source invariant or failure behavior.
- Stop if route/performance proof regresses the accepted Workbench budgets or retention correctness;
  do not weaken thresholds to land the update.
- Stop if source/license provenance cannot be bound to the actual copied or translated change.

## Focused verification

At minimum, run the colocated unit/browser tests for deferred mount, model provenance, annotation
theme/geometry, transcript recovery, activity/Project ranking, terminal target routing and natural
exit; then run Web typecheck and the affected route-switch/background/heap performance harness. Use
an Electron/browser proof for native bounds and terminal lifecycle where pure functions cannot
observe the real boundary. Record exact commands, exits and test counts in the handoff.

## Expected handoff and review

The handoff identifies each accepted upstream mechanism, its OmniMind expression, exact changed
paths, direct versus semantic reuse, source revision, legal consequence, focused results and proof
limits. A different actor independently reviews behavior, authority boundaries, visual/accessibility
truth, performance and provenance. Acceptance authorizes the completion-signal Work; it does not
activate any deferred intake.

## Ordering

Begin only after authority retirement has a coherent accepted commit. Finish and independently
review this Work before Product completion signals change, because notification visibility consumes
the resulting route/dock truth. No QbD or visual-direction round is reopened; a material architecture
conflict stops and returns to the maintainer instead of expanding this Work.
