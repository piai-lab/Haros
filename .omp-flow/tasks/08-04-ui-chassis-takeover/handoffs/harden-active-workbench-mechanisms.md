---
type: "Implementation Handoff"
title: "Harden active Workbench mechanisms"
work: "../work/harden-active-workbench-mechanisms.md"
status: "CANDIDATE"
revision: "handoff-harden-active-workbench-mechanisms-20260805-r2"
actor_id: "active_workbench_mechanisms_implementer_r2"
dispatch_receipt: "bfa41e76c98e4a4da2f0766db6f3a56f"
predecessor_receipt: "196f3b2e144844c58f97101d6a7d26e5"
predecessor: "../reviews/harden-active-workbench-mechanisms.md"
---

# Harden active Workbench mechanisms

## Outcome

`DONE_WITH_CONCERNS` as an implementation candidate for independent review, not self-accepted Work
completion.

The maintainer-approved Workbench hardening from source revision
`be6dcad3f63fa121fbe3180f257ba1ff128696c4` is expressed through the current post-retirement
OmniMind owners. Deferred Conversation mount is bounded and exact-once; current Host-catalog model
choices expose truthful provider provenance; browser annotation cards are opaque and renderer CSS
bounds are converted through live page zoom before Native API publication; inherited transcript
anchors and hydrated settled turns do not replay motion; Project recency follows real user activity;
and terminal selection/lifecycle behavior is routed by exact pane scope with non-destructive natural
exit and fresh Dock replacement.

The r1 review findings are repaired. The source-adoption record now names exact target files; the
retained-boundary integration is disclosed below; and the retired MCP/AgentGateway Electron fixture
has been replaced with a source-neutral proof that mounts the production `BrowserPanel`, drives its
real renderer-owned guest, observes an opaque annotation surface and records the exact native bounds
published across renderer zoom factors `0.8`, `1.25` and `1`. That proof exposed and repaired a real
attach-before-readiness race with a single-purpose host-to-guest `request-ready` handshake.

No deleted Provider/orchestration authority, donor identity, static capability catalog, global
last-active Composer callback, second browser/terminal runtime owner, compatibility alias or warning
suppression was added. The current tree has no favourite-model owner after the authority-retirement
Work, so this implementation does not recreate one: it hardens the actual Host-catalog picker and
proves equal-name options plus the selected trigger remain visually and accessibly distinguishable.

## Mechanism mapping and provenance

| Accepted mechanism                   | Source commit and material source                                                                                                                    | OmniMind expression                                                                                                                                                                                                                     | Reuse                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Bounded deferred Conversation mount  | `28ca8dcbd1c857c70e0ae0ea4af16d08c1d57b4d`, `apps/web/src/components/chat/{ChatThreadSurfacePrimitives,deferredChatMount}.ts*`                       | `deferredChatMount.ts` races two animation frames with a 500 ms fallback behind one settled bit; cleanup cancels both frame handles and timer before retained-boundary key changes can commit                                           | Directly adapted scheduler and cleanup failure model                                             |
| Truthful model provenance            | `8c032e0fa252822f7ddb66f9c80469c15e32dc5d`, `ProviderModelOptionGroupList.tsx` and `providerModelOptions.ts`                                         | Current `product/ProductRuntimePicker.tsx` renders `name — provider` from the live Host catalog, falling back only to a real model-id provider segment; equal-name DeepSeek/Xiaomi options have distinct accessible names               | Semantic port to the surviving Product runtime owner; no favourite group/static catalog imported |
| Opaque guest annotation presentation | `3da7736016c6e609e34c166509ec7b1156ce33b3`, `BrowserPanel.logic.ts`                                                                                  | Annotation theme uses `--color-background-control-opaque`; source-neutral Pointer glyph remains unchanged                                                                                                                               | Direct adaptation of the surface invariant                                                       |
| Zoom-correct browser geometry        | `bb0ebf577eeced72812629a0f31a051881f8e072`, `BrowserPanel.tsx`, `desktopZoom.ts`, `desktopChrome.ts`                                                 | BrowserPanel reads/subscribes the Desktop zoom bridge and converts measured CSS rectangles to Electron DIPs; invalid/zero/non-finite factors normalize to `1`                                                                           | Directly adapted geometry mechanism and invalid-data behavior                                    |
| Non-replaying transcript recovery    | `bb0ebf577eeced72812629a0f31a051881f8e072`, `MessagesTimeline.tsx`                                                                                   | An anchor present at mount lands at its settled coordinate without replay; only assistant rows observed streaming/live are eligible for a later settled-collapse transition                                                             | Direct adaptation with real-browser remount/hydration proofs                                     |
| User-activity Project ordering       | `bb0ebf577eeced72812629a0f31a051881f8e072`, `Sidebar*`, `projectShortcutTargets.ts`, `storeSelectors.ts`                                             | Memoized latest-user-message activity feeds Sidebar and both new-Conversation fallbacks; working-day user interaction outranks newer background output, with deterministic id ties and creation fallback                                | Direct/semantic adaptation to current Product selectors and route shortcut consumer              |
| Exact Composer capability routing    | `325bfdf42415b677c8b09288dfd25b788932dc65`, `ChatView.tsx`, `ThreadTerminalDrawer.tsx`, `DockTerminalPane.tsx`, `terminalContextComposerRegistry.ts` | ChatView registers a stable target only while its pane-scoped Composer is mounted; Dock subscribes the exact single-chat scope; terminal-only/no-target surfaces publish no menu item; stale cleanup cannot remove a replacement target | Direct adaptation; keyed registry is capability routing, not global-last-active state            |
| Natural terminal exit cleanup        | `92b77feab2a83762d0fdce282c3bba23490153f2`, terminal runtime/session/controllers                                                                     | Exit sets runtime status to `exited`, clears running activity, finalizes once without confirmation, placeholder deletion or duplicate fallback `exit` write                                                                             | Direct adaptation                                                                                |
| Atomic fresh Dock replacement        | `93545c979a0da74365e4134b361f4556f473d46f`, `useTerminalSurfaceController.ts`, `terminalStateStore.ts`                                               | Dock-only controller adds a fresh random terminal identity before removing the final exited/closed tab; multi-tab close removes only its target                                                                                         | Direct adaptation preserving the existing one-open-Dock contract                                 |

The root source-adoptions block now records this selective intake against the exact reviewed source
revision and `research/source-review.md`. `LICENSES/ui-mother-MIT.txt` now retains the additional
`Copyright (c) 2026 Emanuele Di Pietro` notice present in that source revision. No first-party assets,
release history or identity were adopted.

## Changed paths

Production and integration:

```text
README.md
LICENSES/ui-mother-MIT.txt
apps/web/src/components/BrowserPanel.logic.ts
apps/web/src/components/BrowserPanel.tsx
apps/web/src/components/ChatView.tsx
apps/web/src/components/Sidebar.tsx
apps/web/src/components/SidebarActivityView.logic.ts
apps/web/src/components/SidebarActivityView.tsx
apps/web/src/components/ThreadTerminalDrawer.tsx
apps/web/src/components/chat/DockTerminalPane.tsx
apps/web/src/components/chat/MessagesTimeline.tsx
apps/web/src/components/chat/deferredChatMount.ts
apps/web/src/components/chat/useChatTerminalController.ts
apps/web/src/components/chat/useRetainedConversationBoundary.ts
apps/web/src/components/product/ProductRuntimePicker.tsx
apps/web/src/components/terminal/terminalRuntime.ts
apps/web/src/components/terminal/terminalRuntimeTypes.ts
apps/web/src/components/terminal/terminalSelectionActions.ts
apps/web/src/components/terminal/terminalSession.ts
apps/web/src/hooks/useTerminalSurfaceController.ts
apps/web/src/lib/desktopZoom.ts
apps/web/src/lib/projectShortcutTargets.ts
apps/web/src/lib/terminalContextComposerRegistry.ts
apps/web/src/routes/_chat.tsx
apps/web/src/storeSelectors.ts
apps/web/src/terminalStateStore.ts
apps/desktop/src/browserAnnotations/coordinator.ts
apps/desktop/src/browserAnnotations/guestPreload.ts
apps/desktop/src/browserAnnotations/guestProtocol.ts
apps/desktop/src/browserAnnotations/protocol.ts
apps/desktop/src/browserManager.ts
packages/shared/src/desktopChrome.ts
```

Colocated proof:

```text
apps/web/src/components/BrowserPanel.annotations.browser.tsx
apps/web/src/components/BrowserPanel.geometry.browser.tsx
apps/web/src/components/ProductChatJourney.browser.tsx
apps/web/src/components/SidebarActivityView.logic.test.ts
apps/web/src/components/ThreadTerminalDrawer.test.ts
apps/web/src/components/chat/MessagesTimeline.remount.browser.tsx
apps/web/src/components/chat/MessagesTimeline.toolGroupCollapse.browser.tsx
apps/web/src/components/chat/deferredChatMount.test.ts
apps/web/src/components/chat/useChatTerminalController.test.ts
apps/web/src/components/terminal/terminalRuntime.exit.browser.tsx
apps/web/src/components/terminal/terminalSession.test.ts
apps/web/src/lib/desktopZoom.test.ts
apps/web/src/lib/projectShortcutTargets.test.ts
apps/web/src/lib/terminalContextComposerRegistry.test.ts
apps/web/src/storeSelectors.test.ts
apps/web/src/terminalStateStore.test.ts
apps/desktop/src/browserAnnotations/protocol.test.ts
apps/desktop/src/browserManager.test.ts
packages/shared/src/desktopChrome.test.ts
apps/web/e2e/browserAnnotations.e2e.ts
apps/web/e2e/fixtures/browserPanelPreload.ts
apps/web/e2e/fixtures/browserPanelRenderer.tsx
apps/web/e2e/fixtures/browserPanelShell.html
apps/web/e2e/fixtures/visibleBrowserMain.ts
apps/web/e2e/globalSetup.ts
apps/web/playwright.electron.config.ts
```

The obsolete proof paths `apps/web/e2e/visibleBrowserMcp.e2e.ts` and
`apps/web/e2e/fixtures/visibleBrowserShell.html` were deleted. They depended on the retired
AgentGateway/MCP execution surface and could not prove the current owner.

Five bounded exception groups sit outside the literal Work allowlist and must be reviewed:

- `apps/web/src/components/product/ProductRuntimePicker.tsx` is the surviving Host-catalog model
  owner after favourites/provider grouping were deleted; `ProductChatJourney.browser.tsx` proves
  selected and option accessible names against equal display names.
- `apps/web/src/components/ProductChatJourney.browser.tsx` is the existing real Product journey
  proof for that owner; it changes assertions/fixtures only.
- `apps/web/src/routes/_chat.tsx` owns the global new-Conversation shortcut fallback and must consume
  the same Project user-activity selector as Sidebar or the accepted ordering mechanism is false on
  that entry path.
- `apps/web/src/components/chat/useRetainedConversationBoundary.ts` is the required integration
  consumer of `deferredChatMount.ts`; `deferredChatMount.test.ts` plus the retained-boundary browser
  proof cover exact-once normal/fallback settlement and cleanup across mount-key changes.
- `apps/desktop/src/browserAnnotations/{protocol,guestProtocol,guestPreload,coordinator}.ts` and
  `apps/desktop/src/browserManager.ts` are the bounded native-boundary repair required by the real
  BrowserPanel proof. A renderer-owned guest can announce its document before `attachWebview`
  establishes runtime ownership, so the coordinator must request one re-announcement after attach.
  The command is single-purpose, carries no arbitrary payload or execution authority, remains
  subject to the existing guest command parser and main-frame admission, and does not create a
  generic bus. `protocol.test.ts`, `browserManager.test.ts` and the Electron journey prove it.

The `apps/web/e2e/**` and Electron Playwright config changes are proof-only boundary consumers. They
mount the actual production `BrowserPanel` and use the existing typed browser IPC plus explicit
manager-owned guest calls; they do not restore MCP, AgentGateway, Provider or generic command
authority.

All other dirty `.omp-flow`/`AGENTS.md` changes listed by `git status` predated this actor or belong to
concurrent work and were preserved untouched. This actor did not edit runtime/session records or
Harness configuration and did not commit, stage, push or merge.

## Verification

| Command / inspection                                                                                                                                                   | Result                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bunx vitest run src/browserManager.test.ts src/browserAnnotations/coordinator.test.ts src/browserAnnotations/protocol.test.ts` in `apps/desktop`                      | PASS, exit 0; 3 files / 28 tests, including attach-after-ready re-announcement                                                                                                                                                                                                                                                                                                                  |
| `bunx playwright test --config playwright.electron.config.ts e2e/browserAnnotations.e2e.ts` in `apps/web`                                                              | PASS, exit 0; 1/1 real Electron journey. Production BrowserPanel starts the real guest picker; opaque guest theme, spoof rejection, unanchorable/stale/collapsed/fallback selection paths, redaction, navigation recovery, marker reprojection and cancellation all pass. The main process observes BrowserPanel-published bounds matching the live CSS viewport at zoom `0.8`, `1.25` and `1`. |
| `bunx vitest run --config vitest.browser.config.ts src/components/BrowserPanel.annotations.browser.tsx src/components/BrowserPanel.geometry.browser.tsx` in `apps/web` | PASS, exit 0; 2 files / 8 tests                                                                                                                                                                                                                                                                                                                                                                 |
| `bunx vitest run src/components/BrowserPanel.logic.test.ts src/lib/desktopZoom.test.ts` in `apps/web`                                                                  | PASS, exit 0; 2 files / 25 tests                                                                                                                                                                                                                                                                                                                                                                |
| `bunx vitest run src/desktopChrome.test.ts` in `packages/shared`                                                                                                       | PASS, exit 0; 1 file / 10 tests                                                                                                                                                                                                                                                                                                                                                                 |
| `bun run typecheck` in `apps/web`                                                                                                                                      | PASS, exit 0                                                                                                                                                                                                                                                                                                                                                                                    |
| `bun run typecheck` in `apps/desktop`                                                                                                                                  | PASS, exit 0                                                                                                                                                                                                                                                                                                                                                                                    |
| `bun run check:sources`                                                                                                                                                | PASS, exit 0; one adopted source and exact target files validate                                                                                                                                                                                                                                                                                                                                |
| `bun run licenses:check`                                                                                                                                               | PASS, exit 0; deterministic legal metadata for 230 components                                                                                                                                                                                                                                                                                                                                   |
| Scoped changed production/proof scan for donor identity, AgentGateway, BrowserUsePipeServer and the deleted MCP harness                                                | PASS; zero hits                                                                                                                                                                                                                                                                                                                                                                                 |
| Targeted `oxfmt --check` over all r2 production/proof/handoff paths                                                                                                    | PASS, exit 0; 17 files                                                                                                                                                                                                                                                                                                                                                                          |
| `git diff --check` plus exact `apps/web/test-results` / `.playwright` artifact scan                                                                                    | PASS; no diff errors and no generated artifact directories remain                                                                                                                                                                                                                                                                                                                               |

The broader r1 mechanism matrices and route/performance gates are recorded in predecessor handoff
revision r1 and were independently reproduced by review receipt
`196f3b2e144844c58f97101d6a7d26e5`; this bounded repair did not rerun or overclaim them. Failed
diagnostic screenshots/traces were generated only under `apps/web/test-results`, not accepted as
baselines, and are removed before handoff.

## Concerns and unproven conditions

- The r1 implementation run observed one order-dependent 356 px sample in
  `MessagesTimeline.tailAnchor.browser.tsx`; the isolated case passed, and the predecessor reviewer
  subsequently ran the full file green at the unchanged 2 px threshold (4/4). This repair did not
  touch or rerun that area, so the historical timing/isolation flake remains recorded without being
  presented as a current product failure.
- The pre-existing `MessagesTimeline.test.tsx` case “renders trailing user subagent mentions…” fails
  alone: current parsing renders `spark(check` instead of the asserted `@spark` pill. This Work did
  not change mention parsing or that test; 49 sibling tests were skipped in the attribution run.
- The former MCP-dependent Electron fixture was intentionally deleted rather than repaired. The
  replacement current-owner Electron proof is green, but independent review remains required; this
  implementer does not self-accept the native boundary.
- The predecessor review's repository `check:identity` run remained red before application scanning
  completed: 28 hard findings from already-present task/research/AGENTS source-name records and
  legacy forbidden-name structure debt. This bounded repair did not rerun or weaken that global
  checker; `check:sources`, legal metadata and the scoped changed-production negative scan are
  green.
- Product `ProductRuntimeModel` currently contains no cost field, so there was no cost description
  to copy or erase. Provider provenance is included in the visible and accessible names without
  inventing a cost or capability projection.
- No live Provider request was needed: these changes affect renderer scheduling, catalog
  presentation, geometry, local activity ordering and terminal UI/session cleanup rather than
  Provider/Model/Thinking wire semantics. No release, package, publish or external mutation was
  performed.

## Reviewer focus

Independently verify exact-once stale cleanup, current model-owner truth, CSS-to-DIP direction,
inherited/live transcript distinction, current-working-day user activity ordering, exact pane scope
and atomic fresh Dock identity. Inspect all five exception groups, especially that `request-ready`
is one-way, bounded and emitted only after renderer-owned runtime attachment. Re-run the real
Electron journey and inspect that the source-neutral BrowserPanel fixture crosses the actual typed
IPC/native manager boundary. Also verify the narrowed selective-intake target files and legal notice
against the cited source commits. Do not accept the repository identity gate or overall Work as
green from this implementer handoff.

## Dispatch identity

- role: `implementer`
- actorId: `active_workbench_mechanisms_implementer_r2`
- receipt: `bfa41e76c98e4a4da2f0766db6f3a56f`
- predecessor receipt: `196f3b2e144844c58f97101d6a7d26e5`
- predecessor review: `../reviews/harden-active-workbench-mechanisms.md`
- promised output: `../handoffs/harden-active-workbench-mechanisms.md`
- operation conclusion: `DONE_WITH_CONCERNS`; implementation candidate ready for independent review
