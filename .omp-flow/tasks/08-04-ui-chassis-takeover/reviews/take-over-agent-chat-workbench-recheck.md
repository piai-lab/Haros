---
type: "Implementation Review"
title: "Recheck: Take over the Agent and Chat workbench"
work: "../work/take-over-agent-chat-workbench.md"
handoff: "../handoffs/take-over-agent-chat-workbench-repair.md"
verdict: "FAIL"
revision: "review-agent-chat-workbench-20260805-r2"
actor_id: "agent_chat_ui_reviewer_r2"
dispatch_receipt: "3ff471e5ca2a445c87eabd6cf313ec72"
predecessor_receipt: "94ccc8dcb1fb4d49a8bc482a9bd114d6"
predecessor_output: "../handoffs/take-over-agent-chat-workbench-repair.md"
---

# Recheck: Take over the Agent and Chat workbench

## Findings

### P1 — retained Conversation 在 render 阶段提前发布 active authority

`ChatThreadSurfacePrimitives` 在 render 内遍历 retained Conversation 并直接调用
`conversation.activity.setActive(...)`，随后才在 `useLayoutEffect` 调用 `flushActivation()`
（`apps/web/src/components/chat/ChatThreadSurfacePrimitives.tsx:181-197`）。但 signal 的
`setActive` 已经立即改写 `active` closure；`flushActivation` 只延迟 listener 通知，并不提交该值
（`apps/web/src/lib/chatPaneScope.ts:26-43`）。独立 probe 因而在 flush 前就得到
`isActive() === true`。

这不是纯展示状态。`ChatView` 的 visited receipt 和全局交互 gate 直接读取 `isActive()`
（`apps/web/src/components/ChatView.tsx:1660-1663`、`:2304-2328`），Terminal 全局快捷键也使用同一
gate。因此一次被 React 放弃或 suspend 的 Conversation 切换 render，可以在实际路由/DOM 尚未 commit
时把已显示 Conversation 标为 inactive、把 retained 隐藏 Conversation 标为 active；这段窗口内的菜单、
快捷键或 visited side effect 会落到错误 Conversation。当前 browser test 只覆盖显式
`setActive -> flushActivation` 和正常 commit 切换，没有覆盖 aborted/concurrent render，不能反证该泄漏。

修复需要将 desired activity 与 committed activity 分离，且只在 layout commit 发布 authority；不能在 render
中改写 `isActive()` 的可观察真相。

### P1 — Product Queue edit 没有可逆编辑态，重入时可把 durable item 隐藏

Product Queue 投影会过滤掉 `productQueueEdit.id`
（`apps/web/src/components/ChatView.tsx:3249-3254`）；点击 Edit 只设置本地 `{id, revision}` 并把内容恢复到
Composer（`:9229-9241`）。实现没有 `Editing` 标识、Cancel 动作或 edit-abandon/re-entry 处理；
`clearComposerInput` 也不清理该状态（`:6737-6757`）。全文件中只有成功 Queue put 和删除同一 item 会调用
`setProductQueueEdit(null)`（`:7195-7198`、`:7377-7390`）。

因此用户进入编辑后，原 durable item 从 Queue 消失；清空 Composer、切换 retained Conversation 后再进入，
仍可能看不到该 item，也没有 UI 能把它恢复为普通 Queue row。现有 real browser matrix 只验证
`Edit -> 立即提交` 的 happy path，没有验证 cancel、清空、失败或离开/重入。该行为不满足 Workbench
“每项支持查看、编辑、删除、排序”以及失败/重入时保留可编辑输入的核心 Queue 契约。

### P2 — 上一轮 Chat Search donor-inventory finding 仍未关闭

`SidebarSearchPaletteController` 没有当前 `Agent | Chat` surface 输入，并无条件组装 Product summaries 与
donor `sidebarDisplayThreads`，最后返回 `[...productThreads, ...donorThreads]`
（`apps/web/src/components/Sidebar.tsx:6686-6772`）。在 Chat 中选择 donor result 会走
`activateThreadFromSidebarIntent`，而不是 Product Chat 路由（`:6665-6679`）。

这与 repair handoff 声称的“Chat Search 只接 Product Chat summaries 和明确 local draft；Agent 保留 donor
Search lineage”直接矛盾，也保留了上一轮 P2 的核心问题。现有 Search logic tests 只测匹配/排序逻辑，
没有挂载 controller 来验证按 surface 隔离 inventory 与选择后的路由。

### P2 — 同一 health snapshot 会同时产生两套且可能冲突的 unavailable 叙事

root 无条件挂载 `SystemHealthCoordinator`
（`apps/web/src/routes/__root.tsx:248-264`）；它对 non-ready Service/Host/Engine 渲染固定定位的
`role=status` notice（`apps/web/src/components/system-health/SystemHealthCoordinator.tsx:28-76`）。Product
Chat 又从同一 health truth 在 Conversation 内渲染 `ProductConversationNotice`
（`apps/web/src/components/ChatView.tsx:11945-11948`，无 active thread 分支也在 `:10885-10887`）。两者没有
互斥或 ownership 协调。

真实 bridge snapshot 非 null 且 unavailable 时，页面会同时播报两个 live region。Service degraded 时全局
notice 说 Conversation/Workbench `read-only`，而 Product notice 说 Conversation 与 Queue 仍可用
（`apps/web/src/productReadModel.ts:223-245`、`apps/web/src/i18n/workbenchCopy.ts:112-115`），形成重复且可能
相互冲突的 authority narrative。已接受截图使用 `snapshot = null` 的 bridge，只能证明该 fixture 下全局
notice 未出现，不能证明真实 unavailable state 只有一个 owner。这违反 Workbench 的“无重复反馈”完成条件。

### P2 — Product Queue 的动作视觉、中文和 screen-reader copy 仍沿用 donor/英文

Product Queue primary action 的按钮虽已改为 `Move next` 与上箭头，但每个 Queue row 的 leading glyph 仍
无条件是 `SteerIcon`（`apps/web/src/components/chat/ComposerQueuedHeader.tsx:84-108`）。同一组件的空预览、
code-block fallback，以及 `Move next`、Edit/Delete、menu 和 aria-label 都是硬编码英文
（`ComposerQueuedHeader.tsx:40-55`；`QueuedComposerActions.tsx:35-71`）。reorder/delete 错误 fallback 也仍为
英文（`ChatView.tsx:7183-7204`、`:9175-9196`），全局 System health notice 同样没有 locale owner。

因此 Product pre-dispatch reorder 视觉上仍带 `Steer` 语义，且 `zh-CN` 的 Queue/unavailable 关键旅程和
辅助技术名称并未完成。现有 browser assertion 只检查页面文本不含 `Steer`；locale unit test 只枚举已有
集中 key，都不会捕获这些硬编码字符串和 glyph。

## Verdict

`FAIL`。一个 retained authority 泄漏和一个不可逆的 Product Queue 编辑旅程构成 P1 blocker；Chat Search、
重复 health narrative 与 Queue bilingual/a11y/action truth 另有三个 P2 finding。它们是当前源码上的实质
缺口，不被通过的类型检查、构建、CAS、正常 retained 切换、视觉接受或性能门禁覆盖。

上一轮四个 P1 中，Product Queue donor preflight、可见的伪 provider/model/permission truth、真实路由性能
以及 post-surgery 人工视觉接受均已关闭；上一轮 zh-CN Settings boundary 在本轮触及范围内也已修复。
Chat Search finding 未关闭。T2 Round-3 exact-transfer CAS 及其 `ChatView` 调用点独立检查通过，但不改变本
T3 verdict。

未实施任何修复。

## Predecessor and subject resolution

predecessor operation `94ccc8dcb1fb4d49a8bc482a9bd114d6` 解析为 completed implementer
`agent_chat_ui_repair`，其 assigned work 是同一
`work/take-over-agent-chat-workbench.md`，output 为
`.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/take-over-agent-chat-workbench-repair.md`。该 handoff
revision 为 `handoff-agent-chat-workbench-20260804-r3`，链接回同一 Work 和上一轮 review/handoff。reviewer
actor `agent_chat_ui_reviewer_r2` 与 implementation actor 不同。

已检查实际 dirty working-tree diff 和全部相关 changed/untracked Web paths，而不只检查 handoff 新文件；
其中包括与 T3 同处 `ChatView.tsx` 的 T2 Round-3 Composer exact-transfer CAS callsite。共享工作树中的
08-03 task 文档、其他 operation 输出和 architecture/brand guard 改动没有被归为本 reviewer 的实现修改，
也未被编辑。受保护 brand source/platform asset path 未变化。

## Independent verification

| Command / inspection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Result                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| predecessor/reviewer operation records，以及完整 Work、repair handoff、上一轮 FAIL review、PRD、Design、QbD、Workbench、Product State、Public Surface、Execution、execution brief 与 active Campaign 阅读                                                                                                                                                                                                                                                                                                                   | PASS：receipt、output、同一 Work 与 actor separation 均成立。                                                                                                                                 |
| `bun run --cwd apps/web test -- src/diffRouteSearch.test.ts src/components/Sidebar.logic.test.ts src/components/SidebarSearchPalette.logic.test.ts src/components/SettingsSidebarNav.test.tsx src/components/ChatView.logic.test.ts src/components/chat/useChatTerminalController.test.ts src/hooks/useThreadActivationController.test.ts src/productReadModel.test.ts src/productCutover.test.ts src/routes/-chatThreadRoute.logic.test.ts src/routes/-productChatIndexRoute.logic.test.ts src/i18n/workbenchCopy.test.ts` | PASS，exit 0；12 files / 334 tests。                                                                                                                                                          |
| `bunx vitest run apps/web/src/productQueueReconciliation.test.ts --maxWorkers=1 --no-file-parallelism`                                                                                                                                                                                                                                                                                                                                                                                                                      | PASS，exit 0；1 file / 10 tests，含 exact-transfer CAS race/control。                                                                                                                         |
| `bun run --cwd apps/web test:browser -- src/components/AgentChatWorkbench.browser.tsx src/components/ProductProjectionCoordinator.browser.tsx src/components/ComposerPromptEditor.browser.tsx src/components/chat/MessagesTimeline.tailAnchor.browser.tsx src/components/chat/RetainedConversationActivity.browser.tsx --reporter=verbose`                                                                                                                                                                                  | PASS，exit 0；5 files / 12 tests。Retained test 不覆盖 React aborted render。                                                                                                                 |
| `bun run --cwd apps/web test:browser -- src/components/ChatView.browser.tsx -t 'keeps real route-backed Agent and Chat Conversation switches inside the frozen budget\|keeps hidden retained completion unread until the Conversation is active again\|opens and closes the right dock after the Agent Chat mother is retained\|persists a Product Chat message through Product Queue without donor execution preflight' --reporter=verbose`                                                                                | PASS，exit 0；1 file / 4 tests，81 skipped。Chat/Agent switch p95 60.9/65.2 ms，content p95 32.4/29.6 ms，0 long task；hidden background p95 51.6 ms，heap growth 1,197,980 B。               |
| `bun run --cwd apps/web vitest run --config vitest.browser.performance.config.ts --reporter=verbose`                                                                                                                                                                                                                                                                                                                                                                                                                        | PASS，exit 0；2 files / 5 tests。switch/scroll/hover/split p95 28.2/26.5/26.9/17.4 ms，0 long task；100k/400k DOM 157/57 nodes，400k update 9.8 ms；CJK composition 0 command。               |
| `bun -e '...createChatConversationActivitySignal(false)...setActive(true)...'`                                                                                                                                                                                                                                                                                                                                                                                                                                              | Probe exit 0，但在 flush 前已输出 `{"beforeFlushActive":true,"beforeFlushNotifications":0}`；flush 后才通知一次，证实 active authority 并未被延迟到 commit。                                  |
| Product Queue edit/cancel、Search controller inventory、root/Product health notice、Queue locale/glyph source inspection                                                                                                                                                                                                                                                                                                                                                                                                    | **FAIL**：分别对应上述四个 P1/P2 finding；现有 focused tests 没有覆盖这些边界。                                                                                                               |
| current en-US / zh-CN clean screenshot inspection与 repair handoff 的 maintainer response                                                                                                                                                                                                                                                                                                                                                                                                                                   | PASS for visual gate：两张 1512×982 real-route clean candidates 可读且 handoff 记录 2026-08-05 明确 `接受`；该 fixture 的 health snapshot 为 null，不能作为 duplicate-health behavior proof。 |
| `bun run --cwd apps/web typecheck`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | PASS，exit 0。                                                                                                                                                                                |
| `bun run --cwd apps/web build`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | PASS，exit 0；Vite 8.1.5，2614 modules，14.11 s，2014 gzip/brotli sidecars。                                                                                                                  |
| `bun run brand:check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | PASS，exit 0；12 个 locked source/platform assets verified。                                                                                                                                  |
| changed/untracked Web paths `oxfmt --check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | PASS，exit 0；62 files。                                                                                                                                                                      |
| scoped `git diff --check` over Web/task/architecture/brand-owner paths                                                                                                                                                                                                                                                                                                                                                                                                                                                      | PASS，exit 0，无输出。                                                                                                                                                                        |

没有运行 repository-root 全量 test；以上结果不外推为未覆盖的仓库级结论。

## Scope and boundary

- 没有修改实现、architecture、Campaign、runtime/session record 或 Evidence ledger；本 reviewer 唯一写入是本
  Review Concept。
- 没有 commit、push、merge、stage 或执行实质 repair。
- verdict 只覆盖 assigned T3 Agent/Chat Work，不重开已通过的 T2 Composer CAS，也不声称 T4、V1 或
  Campaign 完成。
- 后续 repair 需要新的 completed implementation handoff 和独立 re-review；本 review 不授权 reviewer
  自修后自批。

## Dispatch identity

- actorId: `agent_chat_ui_reviewer_r2`
- receipt: `3ff471e5ca2a445c87eabd6cf313ec72`
- predecessor receipt: `94ccc8dcb1fb4d49a8bc482a9bd114d6`
- predecessor output: `../handoffs/take-over-agent-chat-workbench-repair.md`
