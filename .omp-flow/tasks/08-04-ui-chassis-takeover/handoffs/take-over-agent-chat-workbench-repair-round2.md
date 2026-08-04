---
type: "Implementation Handoff"
title: "Repair round 2: close the Agent and Chat workbench findings"
work: "../work/take-over-agent-chat-workbench.md"
status: "DONE"
revision: "handoff-agent-chat-workbench-20260805-r4"
actor_id: "agent_chat_ui_repair_round2"
dispatch_receipt: "f39d0800cad84700a2f0d2d96cb790f7"
predecessor_receipt: "3ff471e5ca2a445c87eabd6cf313ec72"
predecessor_review: "../reviews/take-over-agent-chat-workbench-recheck.md"
---

# Repair round 2: close the Agent and Chat workbench findings

## Outcome

本轮只修复 predecessor recheck 中的五个 material finding：commit-only retained activity、Product Queue
可逆可见的 edit/cancel、Agent/Chat Search inventory 与 activation 严格分离、Product/global health notice
单一 ownership，以及 Product Queue glyph/action/a11y/error copy 的 truthful localization。

实现继续保留已接受的视觉方向、真实 Synara/U1 Agent mother、donor Agent `Steer`、Product Service 单 writer、
T2 exact-transfer CAS、真实 route 性能门和 non-Engine mother。未修改 architecture owner、T4/Pi native execution、
Desktop/Service contract、品牌资产或 Harness 配置。

`DONE` 仅表示 implementer 已完成有界实现和本 handoff；不表示独立 review 已 PASS，也不表示 T4 或 OmniMind
V1 已完成。

## Closed findings

| Finding                                                    | Implemented closure                                                                                                                                                                                            | Regression proof                                                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| retained activity 可由 aborted render 发布                 | activity signal 分离 staged `desiredActive` 与 committed `active`；只有 layout-effect flush 才提交并在 false→true 时通知 activation listener                                                                   | `RetainedConversationActivity.browser.tsx` 覆盖 pre-flush activate/deactivate 与 menu rejection；真实 hidden unread route 用例通过 |
| Product Queue edit 行消失、无 cancel                       | edited durable row 保持可见并标记 `Editing`；Cancel 只清除 edit marker，保留已恢复到 Composer 的 draft；跨 Agent→Chat 返回仍可继续或取消                                                                       | 真实 `ChatView.browser.tsx` 覆盖 edit→switch→return→cancel→re-edit→submit，以及 reorder/delete/CAS                                 |
| Search 混用 donor/Product inventory 或 ID sniff activation | Chat 只消费 Product summaries 与明确 local drafts并走 Product route；Agent 只消费 donor Agent threads并走 donor activation controller                                                                          | Search logic/unit 覆盖 strict inventory/activation；真实 Sidebar Search route 覆盖双 surface 互斥与激活                            |
| Product 与 global health 同时通知                          | `surface=chat` 时 health owner 是 Product Conversation，global coordinator 保持订阅但不渲染；非 Chat surface 恢复 global owner                                                                                 | non-null typed unavailable snapshot 的 Chat→Agent→Chat browser 回归断言每次恰好一个 owner                                          |
| Product Queue glyph/copy 不 truthful 或未本地化            | Product primary glyph/action 是 `ListTodo`/`Move next`；editing primary 是 `X`/Cancel；Queue label、fallback、menu、aria、error 和 health copy 统一来自 `workbenchCopy`；donor Agent `Steer` 行为与 glyph 保留 | en/zh copy key matrix、preview tests、zh-CN browser a11y/action regression、真实 Product Queue route matrix                        |

## Decisions and boundaries

- activity authority 是 committed layout effect，不是 render-time DOM intent；pre-flush deactivation也不会提前撤销已提交的 active truth。
- Product Queue cancel 只退出 edit mode，不删除 durable item，也不清空恢复到 Composer 的内容；用户仍可重新编辑并用 current revision 提交。
- Search surface 由当前 Agent/Chat presentation 显式决定，不从 thread ID 反推 owner；Chat local draft 是唯一显式的非 Product-summary例外。
- health coordinator 始终订阅同一 typed Desktop snapshot；只切换 notice presentation owner，不创建第二套 health state。
- 动态 Engine/provider/process文本仍保留 source facts；本轮只本地化稳定的 Workbench UI copy与可恢复错误 fallback。
- Product Queue `Move next`仍只是 Engine acceptance 前的 typed reorder；live `Steer` authority 不在本 Work模拟。

## Files edited by this repair actor

Runtime/presentation：

- `apps/web/src/lib/chatPaneScope.ts`
- `apps/web/src/components/chat/ChatThreadSurfacePrimitives.tsx`
- `apps/web/src/components/chat/ComposerQueuedHeader.tsx`
- `apps/web/src/components/chat/QueuedComposerActions.tsx`
- `apps/web/src/components/ChatView.tsx`
- `apps/web/src/components/Sidebar.tsx`
- `apps/web/src/components/SidebarSearchPalette.logic.ts`
- `apps/web/src/components/system-health/SystemHealthCoordinator.tsx`
- `apps/web/src/i18n/workbenchCopy.ts`

Regression/source guards：

- `apps/web/src/components/chat/RetainedConversationActivity.browser.tsx`
- `apps/web/src/components/chat/ComposerQueuedHeader.test.ts`
- `apps/web/src/components/AgentChatWorkbench.browser.tsx`
- `apps/web/src/components/ChatView.browser.tsx`
- `apps/web/src/components/SidebarSearchPalette.logic.test.ts`
- `apps/web/src/i18n/workbenchCopy.test.ts`
- `apps/web/src/productCutover.test.ts`

共享工作树在 dispatch 前已有大量 T3/并行修改。本 actor 未覆盖或清理这些修改，也未修改 runtime/session records、
Harness configuration、architecture、mission、design、PRD 或 work Concept。

## Verification

所有最终同源命令都在最后一次 production source 变更后运行，除下方明确标出的补充历史矩阵外。

| Command / inspection                                                                                                                                                                       | Result                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `bun run --cwd apps/web test -- ComposerQueuedHeader.test.ts workbenchCopy.test.ts productCutover.test.ts`                                                                                 | PASS；3 files / 17 tests                                                                      |
| `bunx vitest run apps/web/src/productQueueReconciliation.test.ts --maxWorkers=1 --no-file-parallelism`                                                                                     | PASS；1 file / 10 tests；保留 T2 exact-transfer CAS race/control                              |
| Product Queue zh-CN + real route performance + hidden unread + right dock + health owner + strict Search + Product Queue browser matrix                                                    | 最终源码 7项全部得到 PASS 证据；组合运行 6/7通过，right-dock一次时序失败后同源码隔离运行 PASS |
| `bunx vitest run --config vitest.browser.performance.config.ts src/components/WorkbenchPerformance.browser.tsx src/components/chat/ConversationPerformance.browser.tsx --reporter=verbose` | PASS；2 files / 5 tests                                                                       |
| `bun run --cwd apps/web typecheck`                                                                                                                                                         | PASS                                                                                          |
| `bun run --cwd apps/web build`                                                                                                                                                             | PASS；Vite 8.1.5，2614 modules，12.86s，2014 gzip/brotli sidecars                             |
| `bun run brand:check`                                                                                                                                                                      | PASS；12 locked source/platform assets verified                                               |
| actor-owned 16 paths `oxfmt --check`                                                                                                                                                       | PASS；16/16                                                                                   |
| `git diff --check`                                                                                                                                                                         | PASS                                                                                          |

同源码真实 route profile：Chat p95 47.1ms、Agent p95 54.4ms、Chat/Agent route-content p95
23.1/27.3ms、hidden background p95 42.2ms、max 51.8/55.7/43.3ms、0 long task、heap
+1,697,600 B，均在 80ms / 25,165,824 B预算内。

专用 performance harness：interaction p95 switch/scroll/hover/split为 18.2/27.6/18.4/12.7ms，0 long task；
Workbench burst root render 1、subtree commits 10/4.0ms、Sidebar commit 0、hidden terminal render/write 0、heap
+529,988 B；100k/400k Conversation DOM 157/17 nodes、update 4.6ms、heap +737,280 B；Timeline burst
5 commits/2.2ms、elapsed 30.5ms、0 long task；CJK composition command count 0。

在最后一处 Queue fallback copy 收紧前还运行过更广的 unit matrix（13 files / 339 tests PASS）、browser mother
matrix（5 files / 13 tests PASS）与 T2 CAS（10/10 PASS）；最终同源 focused unit、真实 route browser、typecheck、
build和专用 performance门覆盖了该局部收紧。

## Diagnostics and caveats

- 最终 7项组合 browser run 中，right-dock在前置 route tests之后有一次 store-state时序断言失败；该路径未被本轮生产源码修改，随后同一源码单例隔离运行通过。此结果按实记录，独立 reviewer可决定是否需要把串扰稳定性列为独立非本 Work finding。
- performance files若误用通用 `vitest.browser.config.ts`，不会注册 `readPerformanceHost`；使用仓库专用 `vitest.browser.performance.config.ts` 后5/5通过。前者是 runner配置错误，不是性能预算失败。
- 未运行 repository-root全量 tests，也未运行 Desktop/Service IPC进程套件；本轮没有修改这些路径，non-null typed Desktop snapshot通过 Web root store注入进行验证。
- 未重开视觉接受门：修复只增加局部状态/动作/文案真实性，不改变已接受的 material geometry或品牌方向。
- 没有 commit、stage、push或merge；当前仍是共享 dirty worktree。独立 review尚未发生，因此不存在 implementer 自证 PASS。

## Independent review request

reviewer应按 predecessor五项 finding检查本 handoff与完整实际 diff，并特别确认：render未提交时 activity不泄漏；
Product Queue cancel可逆且不丢 draft；两种 Search inventory/activation fail closed；每个 surface恰好一个 health owner；
Product Queue无 donor `Steer`伪装且 en/zh/a11y/error copy完整。不要把本轮 `DONE`扩张为 T4 或 V1结论。
