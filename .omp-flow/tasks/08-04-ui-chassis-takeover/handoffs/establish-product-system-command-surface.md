---
type: "Implementation Handoff"
title: "Establish the Product and system command surface"
work: "../work/establish-product-system-command-surface.md"
status: "IMPLEMENTED_PENDING_REVIEW"
revision: "handoff-establish-product-system-command-surface-20260805-r5"
actor_id: "product_system_command_surface_implementer_r4"
dispatch_receipt: "1cb59479cc5b4efe9f9fe13888d11526"
predecessor_receipt: "13432f53ad0c4a4c89de6546f3862cc9"
predecessor: "../reviews/establish-product-system-command-surface.md"
---

# Establish the Product and system command surface

## Outcome

`IMPLEMENTED_PENDING_REVIEW`，不是独立 review PASS，也不是 T4 或 Campaign 完成声明。

当前 coherent dirty tree 已把生产 Web 的 donor orchestration transport/registry/facade 入口归零；
Conversation、Workspace、Product Group、Entry pin/marker 与 Queue intent 由 typed Product RPC 和
`ProductControlPlane` 承担，filesystem root 校验由 owner-only System RPC 承担，执行能力只从隔离 Native
Host 的 runtime-catalog observation 得出。没有 replacement owner 的 checkpoint generation、unblock、handoff、
fork/side/review、External MCP execution 与 Automation execution 显示明确 unavailable/re-entry，不报告成功，
不复制 transcript，不重放 prompt，也不回落到 donor Provider catalog。

本 r5 是对 predecessor r2 review 唯一 P1 的有界修复；r4 的三项 repair 与证据继续保留，不是新设计或
扩大后的 authority retirement。Kanban 两个 Product Queue 入口与 New Task 执行选择现已共同使用当前
`ProductRuntimeCatalog` 和显式 Product selection：

1. `KanbanRuntimePicker` 仅列出 Host catalog model，并以 `provider + id + modelId` 三重一致为 identity；
   `available && auth === configured` 才可选。catalog 消失、auth missing/unavailable、model/thinking 消失时保留
   显式 scratch/draft selection 并显示 unavailable，不静默选择 first/default，也不广告 donor/static option。
2. Board drag 使用 `useKanbanDraftDispatchAdmission` 在当前 Product store catalog 上检查当前显式 selection；
   New Task send-now 使用同一 exact availability resolver。两者都不调用 Provider status/refresh；fresh
   `getShellSnapshot` submit 边界仍二次校验。send-as-draft 可保存用户已有 selection，但不合成执行选择。
3. Product selection 暂存沿用现有 `provider: "pi"` renderer envelope，完整 Host id 存在 `model`；resolver 要求
   catalog candidate 的 `id === provider + "/" + modelId`。thinking 原样从 Host model levels 写入 draft，并在
   Product Queue requested selection 中原样提交，包括 Native Host 已观察到的 `max`。
4. `useProviderStatusesForLocalConfig`/refresh 在 Dialog 中仅为 Codex voice transcription 保留；Provider slash/
   skill discovery仍属于非 model/default/admission 的 donor composer affordance，其 searchable model options 和
   dynamic agents 被固定为空，不能改变执行选择或广告 execution option。

以下 r4 内容记录 predecessor review 三项 finding 的既有有界修复：

1. **Kanban receipt truth。** `kanbanDispatch` 不再在 Product round-trip 前建立 In Progress overlay。它按本次
   `runId + entryId + dispatchId + receiptId` 精确解析 `ProductSubmitResult`；只有 `accepted/running` 建立短暂
   projection-gap overlay，`settled/outcome_unknown` 不伪装 running，`pending/delivery_unknown/rejected/error`
   保留 Composer 和 Draft 真值。未决 transfer 的完整 Queue item/revision 与 transfer identity 由
   `product_submit_admissions` 同 outbox admission 原子记录；相同 input 可幂等重查/重试，identity mismatch 明确
   conflict，delivery-unknown 不会触发第二次 outbox send。未决期间若 Composer 已编辑，只读取 receipt 做
   reconciliation，不提交旧 identity，也不 put 新 Queue item。
2. **Product Composer/Host authority。** Product Conversation mount 明确禁用 capability/command/skill/plugin/model/
   agent provider discovery，且把共享 query cache 数据在 Product 输入边界归零。Product 不再用静态
   `getModelCapabilities` 决定 `/fast`，也不从静态 fallback 制造 app slash、model 或 provider-agent 菜单；当前
   Host catalog 未表达的 advanced capability 采用 closed-world absence，System-owned `@local` 仍保留。Kanban
   runtime model 要求 provider qualifier 与 exact `id/modelId` 同时匹配，重复 slug 不会跨 provider 选中。
   donor Agent 仍可通过共享 facade 使用其既有 Provider discovery；本 Work 没有物理删除全 Web 的
   `provider.*` facade，也不把 Product 断路扩大成 donor deletion 声明。
3. **Workspace deadline truth。** `WorkspacePaths` 拥有 10 秒 pre-admission 总 deadline。只读 `stat/realpath`
   可在 deadline/interrupt 下停止等待；只有 deadline 尚未耗尽才 admission `mkdir`。Node fs mutation 一旦开始即
   进入 uninterruptible mutation + postcondition 区并等待真实 mkdir/stat/realpath 结果，绝不在目录可能稍后创建时
   返回 timeout。typed `WorkspaceRootDeadlineExceededError` / `SYSTEM_WORKSPACE_ROOT_DEADLINE_EXCEEDED` 的含义
   明确是“creation admission 前超时，因此没有启动目录创建”，不是声称取消已开始的 fs mutation。

Product Groups 现在是与 Projects 分离的 Conversation 多对多 topic organization。Web 产品模型与生产 UI 已删除
Space/Void、`spaceId`、active-Space route、Space switcher 和 project assignment。测试支架也不再构造
`spaceId` 或 Space aggregate event；legacy contract 强制的空 `spaces` snapshot envelope 仍属于下述物理删除债。

最终 workbench repair 还把动态 thread surface 提升到稳定的 `/_chat` route host，并从 committed
`/_chat/$threadId` match 读取 identity/search。Agent 与 Chat 直接切换时保留两棵 Conversation DOM；cold Chat
在双 rAF gate 前只显示 loader，不 mount/retain 新树，旧树同步失去 active authority。Product summary 为空时，
Sidebar 直接选择最新 local Chat draft，不再先落 `/` 再恢复。missing-route recovery 与创建错误均按 thread episode
绑定，不会把 missing A 的 `done`/error 泄漏给 missing B。

## Protected consumer migration matrix

下表按调用责任而不是文件所有权分组。每一行中的生产 consumer 只归入一个 A–G group；同一文件若承担多个
独立调用，以具体 surface 分行。`Proof` 均来自本 handoff 的 current-source focused/browser/scan 记录。

| Group | Protected production consumer | Old dependency | New owner / truthful result | Proof |
| --- | --- | --- | --- | --- |
| A | `chatRouteRecovery.ts`; `RestoreOrCreateChatRoute.tsx`; `_chat.$threadId.tsx`; `_chat.index.tsx`; `_chat.tsx`; `-chatIndexRoute.logic.ts`; `ChatThreadSurfacePrimitives.tsx` | donor shell snapshot, implicit missing-route creation and route-param remount | Product shell/detail snapshot only; thread-bound recovery/error episodes; committed-match stable host; deferred target is not retained before mount readiness | `chatRouteRecovery.test.ts`; `-chatThreadRoute.logic.test.ts`; selected `ChatView.browser.tsx`; Web typecheck |
| A | `useTemporaryThreadLifecycle.ts`; `useHandleNewThread.ts`; `threadCreatePromotion.ts`; `chatFirstSend` path in `ChatView.tsx` | donor `thread.create` / promotion dispatch | `product.conversation.create`; committed-response-loss recovery performs one create then exact authoritative resnapshot, never blind replay | `productConversationMutations.test.ts`; `chatFirstSend.test.ts`; Web focused gate |
| A | `useSidebarThreadActions.ts`; `activeThreadDelete.ts`; `archivedThreadDelete.ts`; `threadArchive.ts`; `threadRename.ts` | donor archive/delete/title commands and shell refresh | typed Product archive/restore/delete/title mutations plus Product snapshots | corresponding focused tests; Web typecheck |
| A | `pinnedMessages.ts`; `threadMarkers.ts` | donor metadata events/dispatch | typed Product Entry pin/marker RPCs; timeout/abort reconciles exact state once and preserves the original uncertainty if resnapshot also fails | `productEntryDecorationsRecovery.test.ts` |
| A | `useThreadUnblock.ts`; `useThreadHandoff.ts` | donor unblock/handoff aggregate operations | explicit unavailable/re-entry; no fake renderer mutation, transcript copy or replay | Web typecheck; production donor scan |
| B | `Sidebar.tsx`; `ProjectMenuPicker.tsx`; `chat/ProjectPicker.tsx`; `SidebarSearchPalette.tsx` and `.logic.ts` | donor Spaces/Void/project assignment and donor project shell | independent Product Projects and Product Groups disclosures; no location semantics for Groups | `ProductGroupsList.browser.tsx`; domain-symbol scan |
| B | `CreateProjectDialog.tsx`; `projectCreation.ts`; `chatProjects.ts`; `studioProjects.ts`; `useSidebarProjectRunController.ts` | renderer path assumptions and donor project create/update | `system.workspace.ensure-root` canonicalizes/creates the concrete root, then Product Workspace create/update mutations own durable location identity | `CreateProjectDialog.browser.tsx`; `projectCreation.test.ts`; `productWorkspaceMutations.test.ts`; `WorkspacePaths.test.ts`; `wsRpc.auth.test.ts` |
| B | `ProductGroupsList.tsx`; `useProductGroupsController.ts`; `productGroups.ts`; `productGroupsUiStore.ts` | unavailable placeholder and former Space grouping | Product Group create/update/delete/reorder plus exact-set/additive Conversation membership; Groups never own `aria-current` | `productGroups.test.ts`; `ProductGroupsList.browser.tsx` |
| B | deleted `SpaceEditorDialog.tsx`, `SpaceEmptyState.tsx`, `SpaceIcon.tsx`, `SpaceProjectPickerDialog.tsx`, `SpaceSwitcher.tsx`, `useRouteSpaceSync.ts`, `useSpacesController.ts`, `spaceGrouping.ts`, `spaceIconSuggestion.ts`, `spaceNavigation.ts`, `spaces.ts`, `spacesUiStore.ts`, `voidSpaceStore.ts` | Space/Void product ontology | deleted; Projects remain locations and Groups remain topics | production domain-symbol scan; Web typecheck |
| C | `BranchToolbar.tsx`; `GitActionsControl.tsx` | donor branch metadata/generation dispatch | existing concrete Git/System operations only; donor generation and metadata dispatch removed | Web typecheck; production donor scan |
| C | `DiffPanel.tsx`; `checkpointDiffQuery.ts` (renamed from `providerReactQuery.ts`) | donor checkpoint query/facade and Provider query key | bounded local display validation and stable presentation query; checkpoint generation is explicitly unavailable and no donor RPC is restored | `checkpointDiffQuery.test.ts`; Web focused gate |
| D | `kanban/useKanbanCardContextMenu.tsx`; `kanbanDispatch.ts` | donor Agent-work command dispatch | Product Conversation/Queue put and submit; card never claims accepted/running before an identity-exact Product Run receipt; unresolved retries reuse one durable admission identity | `kanbanDispatch.test.ts`; `kanban.logic.test.ts`; `ProductControlPlane.test.ts`; Product Queue browser test |
| D | `threadSettle.ts` | donor settle command | local optimistic presentation only; no durable-success claim and no execution admission | Web typecheck; production donor scan |
| E | `AdvancedSettingsPanel.tsx`; `ConversationStorageSettingsPanels.tsx` | donor repair/storage commands | retained concrete setting/storage owners where present; otherwise explicit repair unavailable/re-entry | Web typecheck; production donor scan |
| E | `ExternalMcpSettingsPanel.tsx` | deleted donor External MCP execution/management gateway | Product shell project facts plus explicit management unavailable; no Engine-side MCP gateway restored | Web typecheck; production donor scan |
| F | `useComposerSlashCommands.ts`; `useComposerCommandMenuItems.ts`; advanced-action branches in `ChatView.tsx` | donor fork/side/review/export/compact dispatch and static fallback menus | Product input uses closed-world typed Product/System/Host facts; unsupported app/provider actions are absent, `@local` remains System-owned, normal Composer draft remains intact | `useComposerCommandMenuItems.test.ts`; Product Queue browser no-provider-RPC assertion; Web typecheck |
| G | execution-facing runtime selection/status in `ChatView.tsx`, Product store/projection, `KanbanNewTaskDialog.tsx`, `useKanbanTaskSubmit.ts` and `KanbanProjectBoardView.tsx` | static Provider/model picker, Provider status/refresh gate and donor-discovered default | nullable Product `runtime-catalog` Host observation plus explicit Product selection; Kanban presenter and both send gates require provider-qualified exact model identity and configured Host auth; no first/static fallback | `kanbanRuntimeSelection.test.ts`; `KanbanRuntimePicker.browser.tsx`; `KanbanDispatchAdmission.browser.tsx`; `useKanbanTaskSubmit.browser.tsx`; `kanbanDispatch.test.ts`; scoped zero-legacy-gate scan |
| G | `AutomationModelPicker` in `-automations.shared.tsx`; `_chat.automations.$automationId.tsx` | static `ProviderModelPicker` and runnable saved Provider selection | view-only historical saved value plus “Automation execution unavailable”; Run/Approve & run disabled until Product Queue admission exists | `AutomationModelPicker.browser.tsx`; `AutomationService.test.ts` |

## Typed command and fact surface

### Durable Product mutations

The following responsibility-named methods are decoded by the closed Product RPC group and handled by the sole durable
writer, `apps/service/src/product/ProductControlPlane.ts`. They do not accept `{type,payload}`, aggregate names or arbitrary
events.

- Workspace: `product.workspace.create`, `product.workspace.title.update`, `product.workspace.pinned.set`,
  `product.workspace.run-command.update`, `product.workspace.delete`.
- Groups: `product.group.create`, `product.group.update`, `product.group.reorder`, `product.group.delete`,
  `product.group.conversations.set`, `product.group.conversations.add`.
- Conversation: `product.conversation.create`, `product.conversation.title.update`,
  `product.conversation.archive`, `product.conversation.restore`, `product.conversation.delete`,
  `product.conversation.pinned.set`, `product.conversation.notes.update`,
  `product.conversation.board-state.set`.
- Entry decoration: `product.entry.pin.add`, `product.entry.pin.remove`, `product.entry.pin.done.set`,
  `product.entry.pin.label.set`, `product.entry.marker.add`, `product.entry.marker.remove`,
  `product.entry.marker.done.set`, `product.entry.marker.label.set`.
- Existing Product read/admission surface remains scoped as `product.shell.snapshot`,
  `product.conversation.snapshot`, `product.queue.put`, `product.queue.reorder`, `product.queue.delete`,
  `product.queue.submit`, `product.run.control`, `product.facts.read`.

Workspace, Conversation and Group summary/tombstone facts project committed durable state. Product facts remain derived and
are rebuilt on the pre-release schema correction: authoritative Workspace/Conversation/Group/Entry/Queue/Run tables are
retained, the derived fact history/sequence is reset, and a client with an old cursor receives a resnapshot rather than a
false continuation.

### Scoped system capability

`system.workspace.ensure-root` accepts only `WorkspaceEnsureRootInput` and returns `WorkspaceEnsureRootResult` or stable
typed errors. `WorkspacePaths` expands an explicit `~`, rejects whitespace/relative input, applies an owned pre-mutation
deadline to inspection, admits mkdir only before that deadline, then waits uninterruptibly for any admitted mutation and its
postcondition. It resolves the filesystem realpath, rejects non-directories and preserves the display path separately from canonical identity.
Every System RPC now passes centralized owner-only admission; a Product client can still call Product RPC but receives
`SYSTEM_RPC_OWNER_REQUIRED` for any System method.

### Native Host observations

The Product shell fact change `{kind: "runtime-catalog", catalog: ProductRuntimeCatalog | null}` is observation, not a
Product capability writer. `ProductControlPlane` refreshes it from Host shell/snapshot observation, throttles probes for five
seconds, compares the encoded catalog, emits only changes, and publishes `null` on missing/unavailable observation. Runtime
facts carry no Workspace/Conversation owner IDs.

Pi credential observation is tri-state: `configured`, `missing`, `unavailable`. Missing credentials produce the stable
non-retryable `PI_CREDENTIAL_UNAVAILABLE`; broker disconnect/rejection/timeout produce retryable
`PI_CREDENTIAL_BROKER_UNAVAILABLE`. No credential material enters Product facts, fixtures or logs.

## Restored/relocated mechanisms and presenters

No pre-deletion donor orchestration, Provider Session, checkpoint generation, External MCP execution or generic command
mechanism was restored.

- `providerReactQuery.ts` was removed. Its checkpoint-diff presentation-only remainder is
  `checkpointDiffQuery.ts`: local bounded parsing, local stable query key, `retry: false`, no transport authority. Delete it
  when the mother Diff surface consumes a concrete scoped checkpoint read result directly or the unavailable surface is
  retired.
- `AutomationModelPicker` is a non-authoritative view-only presenter for an already-saved historical value. It does not
  discover options, choose an execution target or call `onChange`. Delete this presenter when Automation gains truthful
  Product Queue admission or the saved legacy display field is removed.
- `KanbanRuntimePicker.tsx` is a local non-authoritative presenter over `ProductRuntimeCatalog`; it cannot fetch Provider
  status/discovery, and it returns the selected catalog object plus a catalog-declared thinking level. Delete it when the
  Product composer runtime picker becomes a shared small component without importing donor Provider contracts.
- `kanbanRuntimeSelection.ts` is the local Product-selection adapter for the legacy scratch-draft envelope. It requires the
  full Host-qualified model id to agree with the catalog's provider/modelId and supplies no default. Delete it when Kanban
  drafts persist `ProductRequestedSelection` directly rather than the temporary `provider: "pi"` envelope.
- The existing `productReadModel.ts` remains a bounded mother-UI adapter, not a writer. Its previously documented deletion
  point remains direct native Product read-model consumption by Chat/workbench.

## Failure and recovery decisions

- Product Group create/membership mutations do not retry an unknown committed result. Timeout/abort causes one authoritative
  refresh; an exact server state is adopted, a mismatch remains uncertain/conflicted, and known typed failures do not probe.
- Conversation create sends exactly one create. Only timeout/abort triggers resnapshot, and recovery requires exact
  Conversation identity/title/Workspace access; there is no blind replay.
- Pin/marker mutation recovery similarly requires an exact authoritative decoration state. If the resnapshot itself fails,
  the original timeout/abort is preserved instead of being masked.
- Canonical Workspace identity compares normalized/real paths across repeated separators, trailing separators, Windows case
  and Darwin aliases while retaining the user-facing path.
- Runtime catalog absence clears the prior catalog; it never falls back to the static Provider list.
- A missing-route recovery/error episode is keyed by thread identity. Navigating from completed missing A to missing B
  derives `idle`/`null` immediately, invalidates A's run, and holds B's own fallback instead of navigating early to `/`.
- The retained Conversation layer commits a cold target only after its deferred mount gate opens. An A → cold B → A
  reversal never mounts B, preserves A's DOM identity, marks A inactive/inert during the deferred destination, then restores
  A's authority on return.

## Changed-file boundary

The implementation-relevant production paths are:

- `packages/contracts/src/product/{rpc,state}.ts`, `packages/contracts/src/{rpc,ws,ipc,filesystem,index}.ts`;
- `packages/shared/src/threadWorkspace.ts`;
- `apps/native-host/src/{credentialBroker,piRuntime}.ts`;
- `apps/service/src/product/ProductControlPlane.ts`, `apps/service/src/workspace/**`,
  `apps/service/src/wsRpc.ts`, and the retained Automation/native-host seams;
- `apps/web/src/wsNativeApi.ts`, Product mutation/recovery/store files, the A–G consumers enumerated above, and deleted
  Space/Void files; the stable thread route host, retained Conversation primitive, Sidebar route-target logic and Composer
  draft publication guard;
- colocated focused and browser tests, plus this handoff Concept.

The r4 repair changed only these direct paths (in addition to this handoff):

- `apps/web/src/lib/kanbanDispatch.ts` and new `kanbanDispatch.test.ts`;
- `apps/web/src/components/kanban/{KanbanProjectBoardView,useKanbanTaskSubmit}.tsx`;
- `apps/web/src/components/ChatView.tsx`, `ChatView.browser.tsx`;
- `apps/web/src/lib/providerDiscoveryReactQuery.ts`;
- `apps/web/src/hooks/useComposerCommandMenuItems.ts` and its test;
- `apps/service/src/product/ProductControlPlane.ts` and its test;
- `apps/service/src/workspace/{Services/WorkspacePaths,Layers/WorkspacePaths}.ts` and the Layer test;
- `apps/service/src/wsRpc.ts`.

The r5 repair changed only the sole P1's direct paths (plus this handoff):

- `apps/web/src/components/kanban/{KanbanNewTaskDialog,KanbanProjectBoardView,KanbanRuntimePicker,kanbanRuntimeSelection,useKanbanDraftDispatchAdmission,useKanbanTaskScratchDraft,useKanbanTaskSubmit,useKanbanTaskComposerDiscovery,useKanbanTaskComposerMenu,useKanbanTaskComposerEditor}.{ts,tsx}`;
- `apps/web/src/lib/kanbanDispatch.ts` and `apps/web/src/composerDraftModels.ts`;
- `packages/contracts/src/model.ts`, aligning the Pi draft envelope with the Host-observed `max` thinking level;
- four colocated focused/browser proof files for runtime selection, picker, Board admission and New Task send-now.

The worktree also contains the predecessor authority-retirement implementation and unrelated concurrent/owner changes,
including broad Service donor deletions and 08-03/architecture/research/desktop edits. This actor did not stage, commit,
revert or split them and did not edit runtime/session records or Harness configuration. The exact review target is the same
coherent tree, with this Work evaluated against its allowed code surface rather than treating all dirty paths as this actor's
authorship.

## Verification

### r5 sole-P1 repair gates

| Command | Result |
| --- | --- |
| `bun run --cwd packages/contracts typecheck && bun run --cwd packages/shared typecheck && bun run --cwd apps/web typecheck` | PASS; all exit 0. Contracts emitted only the two existing Effect JSON advisories. |
| `bun run --cwd apps/web test -- src/components/kanban/kanbanRuntimeSelection.test.ts src/lib/kanbanDispatch.test.ts src/components/kanban/KanbanNewTaskDialog.logic.test.ts src/composerDraftStore.test.ts` | PASS; 4 files / 52 tests. Covers qualified duplicate slug identity, malformed catalog identity, null/missing/unavailable/auth/thinking failure, explicit-selection precedence and draft persistence. |
| `bun run --cwd apps/web test:browser -- src/components/kanban/KanbanRuntimePicker.browser.tsx src/components/kanban/KanbanDispatchAdmission.browser.tsx src/components/kanban/useKanbanTaskSubmit.browser.tsx` | PASS; 3 files / 7 tests. Donor status unavailable + Host configured remains selectable/admitted/submitted at both real gates; donor-only option is not advertised; Host auth missing/null disables submit and Board draft prompt is preserved. |
| final affected rerun after enforcing active-draft selection precedence: Web typecheck; `kanbanRuntimeSelection.test.ts` + `kanbanDispatch.test.ts`; Board admission + New Task submit browser files | PASS; typecheck exit 0, unit 2 files / 19 tests, browser 2 files / 5 tests. An active donor draft now blocks rather than falling through to a Product thread/project selection. |
| `bun run --cwd packages/contracts test -- src/model.test.ts src/product/state.test.ts` | PASS; one existing collected file / 3 tests (`src/model.test.ts` does not exist and was not represented as evidence). |
| scoped execution-entry scan over `KanbanProjectBoardView.tsx`, `useKanbanDraftDispatchAdmission.ts`, `useKanbanTaskSubmit.ts` for `resolveProviderSendAvailabilityWithRefresh\|useProviderStatusesForLocalConfig\|useRefreshProviderStatusesNow\|useProviderModelCatalog\|ProviderModelPicker\|TraitsPicker` | PASS; zero matches. |
| scoped Dialog voice scan for `useProviderStatusesForLocalConfig\|useRefreshProviderStatusesNow\|providerStatuses\|refreshProviderStatuses\|findProviderStatus` | PASS; every match terminates at `findProviderStatus(..., "codex")` and `refreshVoiceStatus`; none feeds model/default/canCreate/handleCreate. |
| scoped composer discovery scan for `modelOptionsByProvider\|AVAILABLE_PROVIDER_OPTIONS\|buildSearchableModelOptions\|selectedRuntimeAgents` | PASS; zero matches; the only `dynamicAgents` value is `[]`, and `searchableModelOptions` is `[]`. |
| `git diff --check` and generated screenshot/attachment scan | PASS; no diff whitespace error and zero generated files after moving browser-generated images to Trash. |

The first picker-browser iteration passed its Host-selectable case but failed cleanup before the second assertion because
the test cleared `document.body` while React still owned a Select portal (`removeChild` NotFoundError; 1 pass / 1 fail).
Cleanup was changed to the renderer-owned async `cleanup()`; the final 3-file/7-test browser gate passed. The diagnostic
failure screenshot and a generated browser attachment were moved to macOS Trash and are recoverable; no screenshot is
retained as evidence.

### r4 current repair gates

| Command | Result |
| --- | --- |
| `bun run --cwd packages/contracts typecheck && bun run --cwd apps/service typecheck && bun run --cwd apps/web typecheck` | PASS; exit 0. Contracts emitted only the two pre-existing Effect JSON advisory messages in `orchestration.test.ts`. |
| `bun run --cwd apps/web test -- src/lib/kanbanDispatch.test.ts src/components/kanban/kanban.logic.test.ts src/hooks/useComposerCommandMenuItems.test.ts` | PASS; exit 0; 3 files / 62 tests. Covers all receipt states, identity mismatch, duplicate provider slugs, overlay reconciliation and Product closed-world menus. |
| `bun run --cwd apps/service test -- src/product/ProductControlPlane.test.ts src/workspace/Layers/WorkspacePaths.test.ts src/wsRpc.auth.test.ts` | PASS; exit 0; 3 files / 49 tests. Covers durable byte-identical submit retry, mismatch conflict, delivery-unknown/reopen zero replay, Service deadline before mkdir, admitted mutation postcondition and owner-only System admission. |
| `bun run --cwd packages/contracts test -- src/ws.test.ts src/product/state.test.ts src/native-host/protocol.test.ts` | PASS; exit 0; 3 files / 17 tests. |
| `bun run --cwd apps/web test -- src/components/chatHotPath.compiler.test.ts` | PASS; exit 0; 1 file / 12 tests. |
| `bun run --cwd apps/web test:browser -- src/components/ChatView.browser.tsx -t "persists a Product Chat message through Product Queue\|keeps real route-backed Agent and Chat Conversation switches inside the frozen budget"` | PASS; exit 0; 1 file / 2 tests, 86 skipped; 44.66 s. Product mount emitted no provider capability/command/skill/plugin/model/agent RPC; Queue authority and frozen route identity/performance assertions passed. |

The first closed-world menu unit iteration expected no mention items and failed because the intentionally retained
System-owned `@local` item was present (1 failed / 16 passed). The assertion was corrected to require exactly `local-root`;
the final 17-test hook + Kanban command and the 62-test combined gate both passed. This diagnostic red is not hidden or
counted as product evidence.

Current r4 negative checks: `git diff --check` passed with no output; `.vitest-attachments` and Web test image scans found
zero files; source inspection confirms every Product provider query has an `!isProductConversationThread` gate, cached
Provider data is cleared at the Product input boundary, and the only Kanban `markOptimisticDispatch` call occurs after the
identity-exact accepted/running resolver. Focused `oxlint` over the 15 repaired code/test paths completed with 0 errors and
43 warnings; warnings are existing broad-file style diagnostics and are not treated as a clean lint gate.

### Inherited r2 focused gates (not rerun by r3 unless duplicated above)

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test -- productGroups.test.ts productConversationMutations.test.ts productWorkspaceMutations.test.ts productEntryDecorationsRecovery.test.ts checkpointDiffQuery.test.ts wsNativeApi.test.ts projectCreation.test.ts chatRouteRecovery.test.ts productStore.test.ts src/routes/-chatThreadRoute.logic.test.ts src/components/Sidebar.logic.test.ts src/composerDraftStore.test.ts src/components/chatHotPath.compiler.test.ts` | PASS; exit 0; 13 files / 241 tests |
| `bun run --cwd apps/web test -- src/components/chatHotPath.compiler.test.ts` | PASS; exit 0; 1 file / 12 tests; all protected hot modules compile |
| isolated `bunx vitest run src/store.test.ts`, `src/storeProjection.test.ts`, `src/storeEventReducer.test.ts` with `--maxWorkers=1 --no-file-parallelism` | PASS; each exit 0; respectively 1 file / 15, 69 and 46 tests; proves the final test-support Space cleanup |
| `bun run --cwd apps/service test -- ProductControlPlane.test.ts WorkspacePaths.test.ts wsRpc.auth.test.ts AutomationService.test.ts` | PASS; exit 0; 4 files / 51 tests |
| `bun run --cwd apps/native-host test -- piRuntime.test.ts` | PASS; exit 0; 1 file / 20 tests |
| `bun run --cwd packages/shared test -- threadWorkspace.test.ts` | PASS; exit 0; 1 file / 17 tests |
| `bun run --cwd packages/contracts test -- ws.test.ts` | PASS; exit 0; 1 file / 10 tests |
| `bun run --cwd packages/contracts typecheck` | PASS; exit 0; two existing Effect schema advisory messages in `orchestration.test.ts` |
| `bun run --cwd packages/shared typecheck` | PASS; exit 0 |
| `bun run --cwd apps/service typecheck` | PASS; exit 0 |
| `bun run --cwd apps/native-host typecheck` | PASS; exit 0 |
| `bun run --cwd apps/web typecheck` | PASS; exit 0 |

### Inherited r2 browser/performance matrix (not rerun by r3 except the two selected tests above)

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test:browser -- src/components/ChatView.browser.tsx -t 'gives real Chat health state one Product notice\|defaults the authenticated Pi picker\|shows branch tools on a fresh top-level thread\|keeps real route-backed Agent and Chat Conversation switches'` | PASS; exit 0; 1 file / 4 tests, 84 skipped. Covers truthful execution-unavailable state, authenticated Pi default/dispatch, System Git tags only, stable committed-match route host, cold-defer abort, retained DOM identity, five non-thread Outlet routes and the frozen route performance assertions. |
| `bun run --cwd apps/web test:browser -- src/components/ProductConversationLifecycle.browser.tsx src/components/CreateProjectDialog.browser.tsx src/components/product/ProductGroupsList.browser.tsx src/components/chat/MessagesTimeline.toolDetails.browser.tsx src/components/AutomationModelPicker.browser.tsx src/components/AgentChatWorkbench.browser.tsx` | PASS; exit 0; 6 files / 17 tests. Covers lifecycle failure/recovery, Workspace root request, Groups/membership, activity-only diff, Automation unavailable and Agent/Chat re-entry. |
| `bunx vitest run --config vitest.browser.performance.config.ts src/components/WorkbenchPerformance.browser.tsx src/components/chat/ConversationPerformance.browser.tsx --reporter=verbose` | PASS; exit 0; 2 files / 5 tests. Workbench p95: switch 26.4 ms, scroll 26.2 ms, hover 31.5 ms, split resize 17.9 ms; 0 interaction long tasks. Conversation DOM/burst/IME budgets passed; post-recovery heap growth stayed within the encoded limits. |

The selected route-backed performance test executes 20 samples per direction and asserts Chat/Agent painted, route and
content p95 against 80 ms, hidden-background p95 against 80 ms, heap growth against 24 MiB and long tasks equal to zero.
All hard assertions passed. Vitest's final PASS output did not print that test's `console.info` metrics, so this handoff does
not invent per-direction numbers. The dedicated performance command above did print its exact metrics.

The stable-host browser coverage additionally freezes `requestAnimationFrame` for A → cold B → A: B has no Conversation
DOM or mount side effects, A keeps object identity, becomes inactive/`inert` while B is deferred and regains active authority
on return. Settings, Plugins, Automations, Pull Requests and Kanban each activate their generated child routeId through the
parent `Outlet` with no active Conversation.

Earlier red iterations were diagnosed as missing `SidebarProvider`, dialog timing/backdrop and cleanup cascade. All generated
failure attachments from those iterations were removed; none is retained as evidence.

One final diagnostic command added the broad filters `store.test.ts storeProjection.test.ts storeEventReducer.test.ts` to the
9-file Web command. Vitest substring matching collected 26 files, and shared-process `localStorage` mock pollution caused 35
unrelated `storage.setItem is not a function` failures (22 files / 324 tests still passed). It exited 1. The three intended
files were then run as the exact isolated paths recorded above and all 130 tests passed; the original 9-file/67-test command
also passed independently. This diagnostic red is retained here rather than hidden or counted as product proof.

### Negative scans and diagnostics

| Check | Result |
| --- | --- |
| `rg -n 'api\.orchestration|\.orchestration\.|ORCHESTRATION_WS_METHODS|ORCHESTRATION_WS_CHANNELS|dispatchCommand' apps/web/src --glob '*.{ts,tsx}' --glob '!**/*.test.*' --glob '!**/*.browser.*'` | PASS; zero production Web matches |
| `rg -n 'orchestration:|ORCHESTRATION_WS_METHODS|ORCHESTRATION_WS_CHANNELS' apps/web/src/wsNativeApi.ts packages/contracts/src/{ws,ipc}.ts` | PASS; zero matches; Web registry/facade and public Web transport tags/channels removed |
| domain-symbol scan for `activeSpace`, `SpaceSwitcher`, `useSpaces`, `Void`, `spaceId` in production Web | PASS; zero domain matches; lowercase English “spaces” hits are path/composer prose only |
| `rg -n '\bspaceId\b|"space"' apps/web/src/storeTestFixtures.ts apps/web/src/test/effectRpcWebSocketMock.ts` | PASS; exit 1 means zero matches; no Web test-support Space aggregate branch or project `spaceId` fixture remains |
| `git diff --check` | PASS; exit 0; no output |
| attribution/debug probe scan (`OMNIMIND_ROUTE`, `OMNIMIND_STATE_PROBE`, `useLabeledChatState`, `route-backed-state-setters`) | PASS; zero matches |
| generated browser attachment scan under `.vitest-attachments` and source screenshot/artifact folders | PASS after exact cleanup; zero files |

No live provider/API probe was run for this Work. Pi credential and runtime failure claims above are simulated focused tests,
not live-provider evidence.

## Residuals and unproven done conditions

Authority retirement is explicitly **not complete**. After an independent review accepts this Work, the resumed
[`retire-competing-execution-authority.md`](../work/retire-competing-execution-authority.md) owns:

1. Physical removal of the now-unreachable legacy donor projection/store reducers, test fixtures and retained contract
   declarations. `packages/contracts/src/orchestration.ts` is still barrel/type reachable because historical static
   Provider/Model/settings contracts import it; its Space/Void/snapshot/event members have no production Web RPC/transport
   consumer but remain physical contract debt. The required empty `spaces` fields in Web legacy snapshot test envelopes are
   coupled to that debt; no `spaceId` or Space aggregate compatibility branch remains in Web test support.
2. Physical deletion of remaining static Provider/Model historical contracts after their non-execution settings, voice and
   donor Agent composer consumers are migrated. Product Chat, Automation and both Kanban Queue entry gates no longer use
   those contracts as execution capability truth; Kanban's retained Provider RPCs supply slash/skill presentation only,
   receive empty model/agent inputs and do not participate in default, picker or admission.
3. Repository-wide full test/build gates were not run. The exact focused gates, browser matrices and five typechecks above must not be
   generalized beyond their collected scope.

Implementation success is not independent review. Reviewer should inspect every matrix row, rerun a bounded
normal/failure/recovery/browser sample from current source, and reject any hidden donor fallback, fake success, static
capability mirror or Product/System/Host authority mixing.
