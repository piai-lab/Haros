---
type: "Implementation Handoff"
title: "Repair and close the Agent and Chat workbench candidate"
work: "../work/take-over-agent-chat-workbench.md"
status: "DONE"
revision: "handoff-agent-chat-workbench-20260804-r3"
actor_id: "agent_chat_ui_repair"
dispatch_receipt: "94ccc8dcb1fb4d49a8bc482a9bd114d6"
predecessor_handoff: "./take-over-agent-chat-workbench.md"
predecessor_review: "../reviews/take-over-agent-chat-workbench.md"
---

# Repair and close the Agent and Chat workbench candidate

## Outcome

本 repair 已修复上一轮独立 review 的四个 P1、两个 P2，以及随后对 retained mother、Queue 动作语义和
同源性能证据提出的有界 finding。当前候选继续使用真实 Synara/U1 React 母体、tokens、routes 和组件，
没有用 storyboard、thin shell 或第二套 Chat UI 替代它；Agent 与 Chat 共享同一 `ChatView`、Composer、
Timeline、Queue、split/workbench 和 route recovery lineage。

Product Chat 现在只消费 typed Product facts。它不会调用 donor execution preflight，不会伪造 Pi/Engine
accepted operation，不会把 Product Queue 的 pre-dispatch reorder 标成 `Steer`，也不会从 donor provider、
model、permission 或 Search inventory 推断 Product truth。T3 presenter 仍是只读展示适配，明确由后续 T4
Pi-native Agent/Chat read model 删除；它不是 durable/live writer，也不复制 Engine state。

`DONE` 仅表示 repair implementer 已产出冻结候选与本 handoff。它不表示独立 review 已 PASS，不表示维护者
已接受 post-surgery 视觉结果，不表示已形成同源 commit，更不表示 T4、Pi-native execution 或 OmniMind V1
已经完成。

## Closed findings

| Finding                                  | Repair                                                                                                                                                                                      | Current proof                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Product Composer 仍走 donor preflight    | Product Chat 在 `ChatView` 内走 Product Queue put/CAS seam；Host unavailable 时仍可写本地 pre-dispatch intent，不调用 donor orchestration/automation                                        | 真实 `ChatView.browser.tsx` Product Queue put/edit/reorder/delete matrix            |
| invented provider/model/permission truth | Product presenter 保留 `requestedSelection`，无 typed selection 时显示 unresolved；Product Chat 隐藏 donor permission/provider controls，不把 `native-engine`、`pi`、`full-access` 写成事实 | focused presenter/unit/browser tests；真实候选截图无 donor selection/permission叙事 |
| real route performance 超预算            | 主单栏仅 retain previous/current 的真实 Chat mother；route activation 与 pane focus分离；Sidebar retain使用稳定 revision；preload异常路径删除                                               | 20×双向真实 TanStack route profile：Chat p95 51.0ms，Agent p95 55.5ms，0 long task  |
| post-surgery visual proof absent         | 基于当前 source、隔离 Product Service 和真实 Vite route重新生成 en/zh-CN clean截图；未绕过 Host trust boundary                                                                              | 本 handoff列出当前 r3截图；维护者接受仍是显式剩余门                                 |
| Chat Search仍消费 donor inventory        | Chat Search只接 Product Chat summaries和明确 local draft；Agent仍保留 donor Search lineage                                                                                                  | Search logic/unit与 Product surface inventory inspection                            |
| zh-CN Settings materially English        | 本轮触及的 Settings shell、搜索、分组、Models/Agents/Packages边界与 re-entry集中为 en/zh-CN copy；不伪称全仓库所有 donor feature已翻译                                                      | locale unit matrix与真实 zh-CN route截图                                            |
| hidden retained Conversation吞 unread    | `ChatConversationActivitySignal`由 retained Conversation boundary持有；visited effect只在真实 active时清除，重新激活才允许 mark visited                                                     | 真实 browser：hidden completion保留 unread，active后清除                            |
| frozen callback使 right dock只能打开     | toggle在调用时从 store读取 current open state，不依赖被 comparator冻结的闭包                                                                                                                | 真实 browser：open → close回归                                                      |
| composer DOM被误当 activity truth        | interaction activity不再锚定 composer；terminal-only active Conversation可接受 Desktop menu，hidden retained拒绝                                                                            | `RetainedConversationActivity.browser.tsx`真实 hook/signal/terminal-only proof      |
| Product reorder伪装为 Steer              | Product Queue primary action为 `Move next`，只做 typed reorder；donor Agent的真实 `Steer` lineage未删除                                                                                     | 真实 Product Queue browser matrix断言无 `Steer`、顺序改变且无 submit/orchestration  |

## Product truth and authority boundary

1. `surface=chat` 只接受 Product Chat ID或明确的 unsent local Chat draft；donor Agent ID、Product Agent ID
   和 mixed Agent/Chat split全部 fail closed。
2. canonical Chat landing在没有可恢复 Product Conversation时立即创建/打开一个 local draft；缺失深链
   仍不自动创建或探测 donor Thread。
3. shell-known detail在 fetch前 retain；首次 snapshot失败后由 transport open/resnapshot重试，retain/release
   可平衡，不会永久停在 Loading。
4. Product detail存在而 execution health不可用时，Conversation仍可读、draft与Queue仍可编辑；唯一失败叙事是
   `execution_unavailable`，没有 donor `ProviderHealthBanner`。
5. rejected、delivery unknown、outcome unknown没有 generic retry或自动重放；Queue只拥有 Engine接受前的
   put/edit/reorder/delete intent。
6. Product Queue的 `Move next`只更改 `orderedItemIds`；Engine接受后的 live steer仍属于后续 T4，T3不模拟。
7. Product durable writer仍只有 Product Service；Web live projection writer仍只有已接受的 Product store actions。
8. Settings一级顺序为 `Models → Agents → Packages`；现有 provider/skill controls在相应边界内保留 lineage和
   re-entry，不被标签重命名成已经完成的 Product capability。

## Mother preservation and retained activity

- 保留 `ChatView`、Composer、virtual Timeline、Queue、Sidebar row grammar、split/editor/dock、Terminal、Viewer、
  Diff、Git、PR、Kanban、Automations、Browser及其非 Engine行为；本 Work没有授权删除这些域。
- retention只作用于主单栏 Agent↔Chat Conversation槽位；split、editor和dock side-chat不额外复制 retained mother。
- retained wrapper用 `aria-hidden` 与 `inert`隔离 hidden Conversation，但 React effect也必须读取同一 active signal；
  DOM inert不被误当成 effect authority。
- activity signal锚在始终存在的 Conversation boundary，不依赖 composer，所以 active terminal-only仍能响应合法菜单；
  hidden retained Conversation拒绝 menu、visited和交互写入。
- `RetainedChatView`不靠 stale callback closure切换 right dock；调用时读取 store truth，open和close均成立。
- current local draft在 Recent中有真实 row且恰好一个 `aria-current=page`；Product summary接管后不重复绘制。

## Product Queue action matrix

真实 browser fixture通过同一 `ChatView` Product RPC seam证明：

| Action             | Observable                                                                       |
| ------------------ | -------------------------------------------------------------------------------- |
| put                | 创建稳定 Product Queue item；不调用 donor submit、automation或provider preflight |
| second put         | 第二条 intent进入同一 ordered queue；第一条不被标成正在 Run                      |
| reorder            | Product行显示 `Move next`，不显示 `Steer`；`orderedItemIds`准确改变              |
| edit               | 使用 current expected revision更新同一 item，不产生新的 orchestration command    |
| delete             | 删除指定 pre-dispatch item，剩余顺序稳定                                         |
| unavailable health | Conversation/draft/Queue仍可读写；不得把 Queue intent宣称为 Engine accepted      |

donor Agent的真实 `Steer` 文案与行为保持原 lineage；本 repair只改变 Product Queue action contract。

## Accessibility, locale and visual evidence

- Agent/Chat route switcher保持完整 `tablist/tab/tabpanel`关联、roving focus、Home/End/Arrow/Enter/Space语义。
- Product status live region区分 loading、readable-but-execution-unavailable和uncertain；unknown无 replay affordance。
- CJK IME composition期间 Enter不发送，普通 Enter命令路径保持。
- 本轮新增/改写的 Agent/Chat、Composer、Queue、unavailable/recovery、Search和Settings边界均有 en/zh-CN copy；
  动态 Engine/tool/process文本仍按 source facts原样显示。
- 当前锁定的一方 icon、palette、12个 source/platform assets、digest map与生成链未改变；T3没有品牌替换义务。

当前 source的 post-surgery clean browser evidence：

- en-US: `/private/tmp/omnimind-work4-ui-evidence.AlHLNU/production-repair-r4/chat-en-US-clean.png`
- zh-CN: `/private/tmp/omnimind-work4-ui-evidence.AlHLNU/production-repair-r4/chat-zh-CN-clean.png`

两张图均由真实 production React route、当前 Vite source和隔离 Product Service生成。隔离 Service把
`VITE_DEV_SERVER_URL`明确锁到截图 origin；没有修改或关闭 Host CORS/handshake trust policy。两页均自动进入
route-backed local Chat draft，`aria-current=page`恰好为1，Product state为 `execution_unavailable`，donor provider
banner为0，browser error数组为空。维护者于 2026-08-05 在当前执行会话查看这两张 r3候选后明确回复
`接受`；该回复是本 Work要求的 post-surgery人类视觉接受，不替代独立代码review或同源commit gate。

## Performance evidence

### Required real route-backed gate

当前候选在 Headless Chrome 145.0.7632.6、1512/1440级桌面 viewport、Apple M4 Pro本机上，按
`Sidebar tab click → TanStack route/search → Product/local-draft membership → idle route → two animation frames`
进行3次 warmup后每方向20个样本：

| Observable                            |              Current |            Frozen budget | Verdict  |
| ------------------------------------- | -------------------: | -----------------------: | -------- |
| Chat route-backed switch p95          |               51.0ms |                    ≤80ms | PASS     |
| Agent route-backed switch p95         |               55.5ms |                    ≤80ms | PASS     |
| Chat route/content p95                |               29.7ms |               diagnostic | recorded |
| Agent route/content p95               |               26.6ms |               diagnostic | recorded |
| hidden retained background update p95 |               43.1ms | ≤80ms interaction budget | PASS     |
| max Chat / Agent / background         | 55.6 / 57.6 / 44.0ms |                    ≤80ms | PASS     |
| long tasks                            |                    0 |                        0 | PASS     |
| post-GC heap growth                   |         +2,321,588 B |            ≤25,165,824 B | PASS     |

这才是T3 `Conversation switch`的正式证据。旧 handoff中的17.3ms local rerender和旧 reviewer记录的红色
route profile均被当前 source supersede，不能继续代表本候选。

### Preserved renderer mechanisms

独立 performance harness仍只证明当前 renderer mechanisms，不冒充 route或Pi execution：

- local component switch/scroll/hover/split p95：27.3 / 27.7 / 26.9 / 16.5ms，0 long task；
- 240 synthetic publications：root render 1，Workbench subtree commit 14 / 5.0ms，Sidebar commit 0，
  hidden terminal render/write均0，heap +859,020 B；
- 100k/400k Conversation DOM：157 / 57 nodes，400k update 9.5ms，heap recovery +849,184 B；
- synthetic Timeline burst：root render 1，Timeline commits 6 / 3.0ms，36.6ms，0 long task；
- CJK composition：120 synthetic publications期间0 command，输入完整保留。

这些结果的 proof boundary是 preserved Product presentation/UI机制；Pi transport、acceptance和真实 stream仍属于T4。

## Final candidate verification

所有命令均在当前同一工作树、最后一次 production source变更之后运行；没有设置
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`或其他 browser executable override。

| Command / inspection                                                                                                 | Result                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| changed-path `oxfmt --check` + scoped `git diff --check`                                                             | PASS；62个changed/untracked Web files格式正确，task/Web/owner/brand scoped diff无 whitespace error。全 `apps/web/src`另有16个既有未触及格式问题，不归本候选修改。 |
| focused T3 unit matrix                                                                                               | PASS，exit 0；12 files / 334 tests。                                                                                                                              |
| AgentChatWorkbench + ProductProjectionCoordinator + Composer IME + Timeline tail anchor + retained terminal activity | PASS，exit 0；5 files / 12 tests。                                                                                                                                |
| real ChatView route performance + hidden unread + right dock + Product Queue matrix                                  | PASS，exit 0；1 file / 4 tests，81 skipped。                                                                                                                      |
| `productQueueReconciliation.test.ts`                                                                                 | PASS，exit 0；1 file / 10 tests，包括 exact-transfer CAS race/control。                                                                                           |
| full performance harness                                                                                             | PASS，exit 0；2 files / 5 tests；绝对数见上。                                                                                                                     |
| `bun run --cwd apps/web typecheck`                                                                                   | PASS，exit 0。                                                                                                                                                    |
| `bun run --cwd apps/web build`                                                                                       | PASS，exit 0；Vite 8.1.5，2614 modules，13.48s，2014 gzip/brotli sidecars。                                                                                       |
| `bun run brand:check`                                                                                                | PASS，exit 0；12个 locked source/platform assets byte guard通过。                                                                                                 |
| current en-US / zh-CN real route inspection                                                                          | PASS：两页0 browser error、一个 current row、一个 truthful Product notice、0 provider banner；维护者于 2026-08-05 明确回复 `接受`。                               |

未运行 repository root全量 test；本 handoff不把 focused Web与build结果扩张为未覆盖的仓库级结论。

## Final review and commit scope

独立 reviewer必须检查本 Work实际将要 stage的完整 diff，而不是只看新文件或挑选 hunk。特别包括：

- `ChatView.tsx`中与T3同文件存在的、已独立授权T2 Round-3 Composer exact-transfer CAS调用点；
- Product Queue put/edit/reorder/delete、selection/permission truth、Search inventory、strict route/split membership；
- retained activity/unread/menu/right-dock correctness与真实 route-backed performance gate；
- Settings/locale/a11y/visual boundary；
- 当前task owner/brand guard术语一致性。

不要覆盖历史FAIL review；repair需要新的独立 review输出。不要把T3 PASS包装为T4或OmniMind完成。

## Remaining gates and residual work

post-surgery人类视觉接受已于 2026-08-05 完成。当前候选只剩两个接受门，顺序为：

1. 不同actor对本 handoff与完整实际 staged diff作一次有界独立 re-review并给出PASS；
2. 在reviewed source不再变化的前提下精确stage本Work路径，排除既有08-03与`.omp-flow`工具杂项，形成一个
   原子T3 implementation commit。

收口后立即进入后续 `Adopt Pi native execution` Work：真实Pi acceptance/stream/controls、Engine-owned live steer、
Product/Engine状态边界以及竞争 execution authority退休。T3只证明UI母体接管与truthful unavailable/re-entry，
绝不证明Pi-native execution已经存在。
