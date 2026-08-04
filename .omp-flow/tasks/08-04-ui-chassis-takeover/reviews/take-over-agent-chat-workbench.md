---
type: "Implementation Review"
title: "Review: Take over the Agent and Chat workbench"
work: "../work/take-over-agent-chat-workbench.md"
handoff: "../handoffs/take-over-agent-chat-workbench.md"
verdict: "FAIL"
revision: "review-agent-chat-workbench-20260804-r1"
actor_id: "agent_chat_ui_reviewer"
dispatch_receipt: "6d8b3453f29f4d319edd1775412fa85e"
predecessor_receipt: "b00fd26d25354276a15e00c61f41c5c1"
predecessor_output: "../handoffs/take-over-agent-chat-workbench.md"
---

# Review: Take over the Agent and Chat workbench

## Findings

### P1 — Product Queue submission is still gated by the donor send path

`ChatView.onSend` requires `readNativeApi()` and the donor late-send handlers before it decides that
the active Conversation is Product-owned. It then runs the donor slash-command handler,
`resolveComposerAutomationRequest` (including `api.server.generateAutomationIntent`), donor provider
availability refresh and browser-prompt attachment resolution. Only afterwards, at
`shouldUseProductConversation` / `PRODUCT_CONVERSATION_CUTOVER_START`, can it call Product
`putQueueItem`.

Consequently, a missing or unusable donor Provider returns at the provider gate before Product Queue
ownership transfer. That is exactly the T2 Pi-free / execution-unavailable state in which the UI says
the Conversation and Queue remain available and labels the send button `Add to Queue`. Some Product
prompts can also traverse donor automation intent handling before the claimed Product-only branch.
This violates the linked PRD/Design requirement that the first Product journey make the old execution
route unreachable, and it falsifies the Work's truthful queue-only failure/re-entry behavior.

The existing source-order tests start their assertion slice at
`PRODUCT_CONVERSATION_CUTOVER_START`, so they cannot detect any of these earlier returns. The focused
`AgentChatWorkbench.browser.tsx` case mounts a notice beside a synthetic `Add to Queue` button rather
than exercising the real route, Composer, provider state and Product Service seam.

### P1 — Chat shows and persists invented next-Run authority instead of typed selection truth

The Product presenter hard-codes every queued item and restored Product Conversation to donor
provider `pi`; a Conversation with no typed selection becomes model `unresolved-model` and runtime
mode `full-access`. The real Chat composer renders the donor extras, mutable permission control and
provider/model/thinking picker without a Product-surface guard. On submission it persists
`engineId: "native-engine"` regardless of the visible provider/Engine choice.

The post-surgery Chat evidence therefore displays `Execution unavailable` together with mutable
`Full access`, a concrete model and thinking level. For a workspace whose typed access is
`read-only-references`, this asserts unrestricted file/network authority and a concrete Engine/model
choice that Product facts do not establish. Queue edit also rehydrates the hard-coded `pi` provider
rather than preserving `requestedSelection.engineId`. This fails Product truth, the Chat
read-only/no-Primary-Folder boundary, and the Work's next-Run Engine/Model/Thinking done condition.

Relevant implementation points are `apps/web/src/productReadModel.ts:39`,
`apps/web/src/productReadModel.ts:76`, `apps/web/src/components/ChatView.tsx:10862` and
`apps/web/src/components/ChatView.tsx:11387`.

### P1 — The frozen real-route performance gate fails

The handoff's 17.3 ms `Conversation switch` result is a `WorkbenchHarness` local `setActiveView`
rerender measured to the next animation frame. It does not traverse TanStack routing, Product/local
Conversation membership or the real Agent/Chat content commit. The handoff itself records an
informal real-UI median of 279.3 ms and maximum of 468.6 ms, already inconsistent with the frozen
80 ms limit.

An independently run real route-backed profile now fails with Chat p95 **111 ms**, Agent p95
**223 ms**, maxima 112.3/227.2 ms and **20 long tasks** (57–106 ms) against the frozen p95 ≤ 80 ms /
0-long-task budget. It also emits a TanStack preload `_nonReactive` TypeError. The threshold was not
renamed or relaxed. Synthetic renderer-mechanism results remain useful but cannot substitute for
the required route/store Conversation-switch proof.

### P1 — Required post-surgery human visual acceptance is absent

The handoff correctly says that the maintainer accepted only the pre-surgery real-mother calibration
and has not accepted the two post-surgery clean candidates. The Work, Design and QbD A-03 require a
renewed same-state human visual acceptance after surgery; implementer inspection cannot self-close
that gate. The current screenshots also expose the conflicting `Execution unavailable` and
`Full access` narratives described above, so this is not an administrative omission.

The handoff's residual section says the visual acceptance is the only remaining gate. It also omits
this independent review and the required same-source commit gate, and its `DONE` status must not be
read as satisfying the Work's done conditions.

### P2 — Chat Search is wired to donor Agent threads, not Product Chat inventory

The Search control remains visible on Chat, but `SidebarSearchPaletteController` derives its entire
thread collection from donor `selectSidebarDisplayThreads` / `useStore`; it never consumes Product
Conversation summaries. On Chat, a selected donor result is then activated with `surface=chat`, where
surface membership correctly rejects it as a missing Product Conversation. Product Chat recents are
not searchable at all. This is a dead/misdirected preserved affordance rather than truthful Product
normal/failure/re-entry behavior (`apps/web/src/components/Sidebar.tsx:6455` and
`apps/web/src/components/Sidebar.tsx:6517`).

### P2 — The claimed Chinese Settings boundary remains materially English

Only Models/Agents/Packages labels and their new boundary paragraphs are localized. In a `zh-CN`
Settings journey, `Back to app`, `Search settings`, no-result text, all group headings and most row
labels/descriptions remain hard-coded English (`SettingsSidebarNav.tsx:127-225` and the route-owned
panels). This does not satisfy the Work/Design requirement for a complete understandable Chinese
Settings boundary, despite the handoff's bilingual Settings PASS claim. The locale test enumerates a
curated key subset and therefore does not cover the visible untranslated boundary.

## Verdict

`FAIL`. Four P1 blockers and two P2 findings remain. Passing component, unit, build, CAS, IME,
scroll-anchor and synthetic performance checks do not override the broken Product queue boundary,
invented selection/permission truth, failed frozen real-route budget or missing human visual gate.

No implementation fix was applied. The independently reviewed T2 Round-3 Composer exact-transfer
CAS itself passed its focused race/control checks; that does not make the combined `ChatView` Product
journey acceptable.

## Predecessor and subject resolution

Predecessor operation `b00fd26d25354276a15e00c61f41c5c1` resolves to completed implementer
`agent_chat_ui_implementer`, the assigned `work/take-over-agent-chat-workbench.md` entry and output
`.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/take-over-agent-chat-workbench.md`. The handoff is
revision `handoff-agent-chat-workbench-20260804-r2`, carries the same receipt and links back to the
assigned Work. Reviewer actor `agent_chat_ui_reviewer` is distinct from the implementation actor.

The actual working-tree diff and changed Web files were inspected, including the combined
`ChatView.tsx` state containing the independently authorized T2 Round-3 Composer CAS. Unrelated
architecture, prior Flow task and brand-script changes in the shared dirty worktree were not
attributed to this implementation and were not modified.

## Independent verification

| Command / inspection | Result |
| --- | --- |
| Operation records plus complete linked Work/handoff/PRD/Design/QbD/Workbench/Product State/Execution reads | PASS for provenance and actor separation; handoff links back to the assigned Work. |
| `bun run --cwd apps/web test -- src/diffRouteSearch.test.ts src/components/Sidebar.logic.test.ts src/components/SettingsSidebarNav.test.tsx src/components/ChatView.logic.test.ts src/hooks/useThreadActivationController.test.ts src/productReadModel.test.ts src/productCutover.test.ts src/routes/-chatThreadRoute.logic.test.ts src/routes/-productChatIndexRoute.logic.test.ts src/i18n/workbenchCopy.test.ts` | PASS, exit 0; 10 files / 311 tests. |
| `bun run --cwd apps/web test:browser -- src/components/AgentChatWorkbench.browser.tsx` | PASS, exit 0; 1 file / 5 tests. Its Queue case is isolated component assembly, not the required real route/store submission. |
| `bun run --cwd apps/web test:browser -- src/components/ProductProjectionCoordinator.browser.tsx` | PASS, exit 0; 1 file / 1 test. |
| `bun run --cwd apps/web test:browser -- src/components/ComposerPromptEditor.browser.tsx` | PASS, exit 0; 1 file / 1 IME test. |
| `bun run --cwd apps/web test:browser -- src/components/chat/MessagesTimeline.tailAnchor.browser.tsx` | PASS, exit 0; 1 file / 4 tests. |
| `bunx vitest run apps/web/src/productQueueReconciliation.test.ts -t 'preserves a draft mutated away and back\|clears draft and marker through CAS' --maxWorkers=1 --no-file-parallelism` | PASS, exit 0; 1 file, 2 passed / 8 skipped. |
| `bun run --cwd apps/web vitest run --config vitest.browser.performance.config.ts --reporter=verbose` | PASS, exit 0; 2 files / 5 tests. Synthetic/local-state switch p95 26.3 ms, scroll 27.8 ms, hover 25.9 ms, split 18.7 ms; 0 synthetic long tasks. This does not cover real routing. |
| `bun run --cwd apps/web test:browser -- src/components/ChatView.browser.tsx -t 'keeps real route-backed Agent and Chat Conversation switches inside the frozen budget' --reporter=verbose` | **FAIL**, exit 1; Chat/Agent p95 111/223 ms, content p95 79.7/194.8 ms, maxima 112.3/227.2 ms, 20 long tasks; frozen budget 80 ms / 0. TanStack preload also logged `_nonReactive` TypeError. |
| `bun run --cwd apps/web typecheck` | PASS, exit 0. |
| `bun run --cwd apps/web build` | PASS, exit 0; Vite 8.1.5, 2615 modules, 14.20 s, 2014 gzip/brotli sidecars. |
| `bun run brand:check` plus changed-path inspection | PASS: 12 locked source/platform assets verified; no protected brand asset/output path is changed by the Web diff. |
| `git diff --check -- apps/web` | PASS, exit 0 with no output. |
| Manual source-order inspection of `ChatView.onSend`, Product presenters and focused source tests | FAIL for the claimed Product-only Queue journey and typed next-Run truth; details are the first two P1 findings. |
| Post-surgery screenshot inspection against the linked real-mother calibration | BLOCKED/FAIL gate: clean images exist, but maintainer acceptance is absent and the permission/readiness narratives conflict. |

The failed browser profile generated Vitest attachment/screenshot files under `apps/web`; they are
test artifacts, not authored review output, and must not enter any same-source implementation commit.

## Scope and boundary

- No implementation, architecture, Campaign, runtime/session record or Evidence ledger was edited.
  The only repository write by this reviewer is this Review Concept.
- No commit, push, merge, staging operation or substantive repair was performed.
- This verdict is limited to the assigned T3 Agent/Chat Work. It does not reopen the independently
  passed T2 Composer CAS review and does not claim repository-wide or Campaign completion.
- A future repair requires a new completed implementation handoff and independent review. This
  review authorizes no fix by the reviewer.

## Dispatch identity

- actorId: `agent_chat_ui_reviewer`
- receipt: `6d8b3453f29f4d319edd1775412fa85e`
- predecessor receipt: `b00fd26d25354276a15e00c61f41c5c1`
- predecessor output: `../handoffs/take-over-agent-chat-workbench.md`
