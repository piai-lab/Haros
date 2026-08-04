---
type: "Implementation Handoff"
title: "Take over the Agent and Chat workbench"
work: "../work/take-over-agent-chat-workbench.md"
status: "DONE"
revision: "handoff-agent-chat-workbench-20260804-r2"
actor_id: "agent_chat_ui_implementer"
dispatch_receipt: "b00fd26d25354276a15e00c61f41c5c1"
---

# Take over the Agent and Chat workbench

## Outcome

本轮已把现有 Workbench 母体的一级入口收敛为固定顺序的 `Agent | Chat`，并把 Chat 的路由、Recent、
Conversation/Queue 状态和恢复边界接到 typed Product facts。Agent 仍是省略 `surface` 参数的 canonical default；
Chat 只接受 Product Chat Conversation 或尚未发送、尚未进入 Product 的本地 Chat 草稿。Product Chat ID 不再因
donor Thread 恰好同名而跨面打开，混合 Agent/Chat split 会在进入 Chat 时剥离，缺失 Product Chat 只显示可恢复的
Product unavailable，不探测、恢复或重放 donor runtime。

这次施工保留了原 `ChatView`、Composer、虚拟 Timeline、Queue、split/workbench、route recovery、滚动锚点和
非 Product feature surface；没有另画 thin shell，也没有新建 durable/live writer。`productReadModel.ts` 中
Thread/Project/Timeline/Queue adaptation 是无 writer 的 T3 display presenter，并在注释中写明删除点：T4 的原生
Agent/Chat component props 接管后删除，不得演化为第二状态层。

`DONE` 只表示本 implementer 已产出当前候选和 handoff，不表示独立 review 已 PASS，不表示 post-surgery 人类
视觉验收已完成，更不表示 Pi native execution、T4、完整 UI 或 OmniMind V1 已完成。

## Route and component ownership map

| Responsibility                     | Authoritative input                                                      | T3 presentation owner                                                   | Boundary                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 一级入口与 canonical URL           | authored TanStack routes + `surface` search                              | `SidebarSurfacePicker`, `diffRouteSearch.ts`, `_chat.index.tsx`         | Agent 省略 `surface`; Chat 仅序列化为 `surface=chat`; 没有第三个一级 world                                   |
| Chat durable inventory             | typed Product shell summaries                                            | `ProductChatRecentList`                                                 | 只额外接纳尚未发送的 local Chat draft；donor Thread 不进入 Recent                                            |
| Chat landing                       | Product shell hydration、Product Chat summaries、local draft、合法 split | `_chat.index.tsx` + `-productChatIndexRoute.logic.ts`                   | 已有 Product Chat 无需 Studio root；无可恢复项时只创建一个 local draft                                       |
| Conversation surface membership    | Product shell identity、donor identity、local-draft identity             | `_chat.$threadId.tsx` + `-chatThreadRoute.logic.ts`                     | cross-surface ID fail closed；Chat miss 不调用 donor route recovery                                          |
| split membership                   | persisted pane IDs + Product Chat/local draft inventory                  | `_chat.$threadId.tsx`                                                   | Chat split 必须全员属于 Chat；mixed split 被剥离为 single Conversation                                       |
| Product Conversation/Queue display | typed Product detail + typed Desktop health                              | `ChatView`, `productReadModel.ts`, `ProductConversationNotice`          | Product readable truth与 execution readiness 分离；无 replay callback、无 provider fallback                  |
| Product detail lifecycle           | Product Store retained IDs、cursor、projection issue                     | existing `ProductProjectionCoordinator` + root mount                    | 先 retain 再取 detail；首取失败后在 reconnect/open generation resnapshot；最后 consumer release              |
| Sidebar Product hierarchy          | Product facts + donor Agent project mother                               | `Sidebar.tsx`                                                           | Agent 保留 Projects above Groups；无 Group facts 时只显示 non-mutating unavailable；Chat 只显示 Recent       |
| Settings public IA                 | authored settings taxonomy                                               | `settingsNavigation.ts`, `_chat.settings.tsx`, `SettingsSidebarNav.tsx` | 一级顺序 `Models → Agents → Packages`; provider/skill controls只作为边界内 lineage，不冒充新 public ontology |
| locale                             | browser language                                                         | `i18n/workbenchCopy.ts`, root `html.lang` sync                          | 首条 en / zh-CN journey 使用集中稳定 copy；dynamic Engine/tool/process text不改写                            |
| IME command boundary               | native keyboard/composition event                                        | `ComposerPromptEditor.tsx`                                              | `isComposing` 或 legacy keyCode 229 时 Enter 永不进入 command handler                                        |

Product durable writer 仍只有 Product Service 的 `ProductControlPlane`，Web live projection writer 仍只有 T2
`productStore` actions。上述 route、presenter 和 component 都不持久化另一份 Product/Engine truth。

## Protected mother and source-anchor disposition

| Source anchor / behavior                                          | Disposition                                            | Target and proof                                                                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `_chat` shell、Sidebar geometry、row tokens                       | **preserve/adapt**                                     | 同一 Sidebar/SidebarProvider 内把 donor picker改成 route-backed tabs；真实 clean reload 截图保持母体密度与 panel geometry                      |
| donor Studio top-level ontology                                   | **redirect, not duplicate**                            | `/studio` authored route只迁移到 `/?surface=chat`; private Studio container仅暂时承载一个 unsent draft，不成为用户一级 world                   |
| ChatView / Composer / Timeline / Queue                            | **preserve/adapt**                                     | Product typed presenter输入同一母体；没有第二套 component family；IME 与 tail-anchor browser proof通过                                         |
| split/workbench/pane lifecycle                                    | **preserve**                                           | 未替换 `SingleChatSurface` / `SplitChatSurface`; Chat mixed split在 route boundary拒绝，不破坏合法 Product-only split                          |
| cursor/retain/resnapshot                                          | **preserve/adapt**                                     | Product coordinator browser proof覆盖 retained detail 首取失败、transport open、成功 resnapshot 与 retain/release平衡                          |
| Projects above Groups                                             | **preserve + truthful unavailable**                    | Projects母体仍在 Agent；Groups没有 Product facts时渲染无 mutation callback 的 `ProductGroupsUnavailable`                                       |
| provider health/update narrative                                  | **remove from Product Chat only**                      | Product Chat隐藏 donor `ProviderHealthBanner`，并抑制 automatic provider-update prompt；用户主动更新与 Agent/Settings路径保留                  |
| Plugin/Skill discovery                                            | **preserve/re-enter**                                  | `Settings › Packages` 显示 rights/trust/activation facts未连接，并保留进入现有 `/plugins` discovery 的显式按钮；未删除 discovery route/library |
| Provider controls                                                 | **preserve inside Agents boundary**                    | `Settings › Agents` 先声明 typed Agent capability evidence未连接，再呈现既有 provider controls；不声明 parity                                  |
| Models                                                            | **rename public boundary, retain real provider facts** | `Settings › Models` 拥有真实 connection/model/thinking/auth/health描述；没有复制静态 capability truth                                          |
| Viewer/Diff/Terminal/Git/PR/Kanban/Automations/Browser            | **preserve**                                           | 本轮没有删除或重画这些 feature domains；其真实 runtime接管仍按各自后续 Work进行                                                                |
| first-party icon、颜色、Glyph corpus、Dock/Taskbar/favicon/splash | **protected unchanged by this Work**                   | Work4 scoped diff不含 brand source、asset、generation或platform-output路径；未引入 Orchestrated O、朱红或 evidence-only asset                  |

没有以“unavailable”为理由删除成熟域。唯一被收敛的 donor top-level语义是 Studio入口；其 draft/bootstrap lineage被明确
保留在 Product Chat landing 后，并有 T4 删除边界。

## Product truth and recovery behavior

1. Product shell未 hydration时 landing保持 splash，不从空 donor snapshot推断 Chat。
2. 已有 Product Chat优先恢复；它不依赖 private Studio root。
3. 没有可恢复 Product Chat时，使用同一个 in-flight guard最多准备一个 local unsent draft。
4. local draft进入 Product后由 Product summary接管，Sidebar不会同时绘制两行。
5. `surface=chat` 的深链只接受 Product Chat或明确 local draft；Product Agent、donor Agent Thread和普通 donor draft全部拒绝。
6. 省略 `surface` 访问 Product Chat/local Chat draft时会 canonicalize到 `surface=chat`；Product Agent保持 Agent。
7. Chat split只有每个 pane ID都在 Product Chat/local draft inventory里才恢复；mixed split去掉 `splitViewId`。
8. Product shell已确认不存在该 Chat ID时留在 Product unavailable screen；`Back to Chat recent`和`Start new conversation`
   是显式用户动作，不触发 donor replay。
9. Product detail已读到时，即使后续 projection refresh失败，最后 typed detail仍可读；execution health单独显示 unavailable。
10. rejected、delivery unknown、outcome unknown只呈现 typed receipt truth，没有 generic retry或自动重放。

## Required T3 checklist proof

| ID  | Required proof                              | Evidence                                                                                                                                                                       |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | strict surface membership                   | `-chatThreadRoute.logic.test.ts`: Product Chat/local draft/Agent/donor矩阵；fresh browser用 Agent donor ID访问 `surface=chat`，只出现 Product missing，无 donor replay         |
| 2   | mixed split rejection                       | unit覆盖 mixed Agent/Product split；isolated browser注入 persisted mixed split后 URL剥离 `splitViewId`，保持 `surface=chat`，只剩一个 Chat panel                               |
| 3   | first detail fetch failure recovery         | `ProductProjectionCoordinator.browser.tsx`: retained ID首次 snapshot失败，transport open后成功 resnapshot，generation递增且 retain/release平衡                                 |
| 4   | real Settings top-level                     | clean real route `/settings?section=models` 在 en/zh均得到 `Models/模型 → Agents/Agent → Packages/Package`；top-level无 Providers/Skills；legacy query会 normalize到新 section |
| 5   | active unsent draft Recent + unique current | `AgentChatWorkbench.browser.tsx`在真实 Sidebar primitives渲染 local draft；恰好一个 `aria-current=page`；clean live route同样为 1                                              |
| 6   | one execution-health narrative              | Product Chat只渲染一个 `data-product-conversation-state=execution_unavailable`；donor provider banner和automatic provider prompt均为 0                                         |
| 7   | tab/tabpanel contract                       | Agent/Chat各有稳定 id、`aria-controls`; panel反向 `aria-labelledby`; Agent默认且tabIndex 0；Arrow/Home/End roving focus不隐式激活，Enter/Space经button激活                     |
| 8   | en / zh-CN route matrix                     | clean fresh browser分别证明 `html.lang`、tab、New Chat、Settings、Handoff、Composer placeholder、permission、thinking和Product unavailable copy；Settings同样双语              |

## Locale, accessibility and IME matrix

| Surface                                         |               en |            zh-CN | Accessibility / interaction proof                                                                             |
| ----------------------------------------------- | ---------------: | ---------------: | ------------------------------------------------------------------------------------------------------------- |
| Agent / Chat top tabs                           |             PASS |             PASS | `tablist/tab/tabpanel`, stable association, roving focus, Home/End/Arrow/Enter                                |
| Chat new/local draft + Recent                   |             PASS |             PASS | exactly one `aria-current`; draft row有可读的“new + unsent”name                                               |
| Product loading/unavailable/execution/uncertain |             PASS |             PASS | live region按 loading polite、error assertive；未知状态无 replay affordance                                   |
| Composer critical placeholders                  |             PASS |             PASS | 真实 empty Chat route可见 copy；CJK composition Enter不发送，普通 Enter仍执行                                 |
| permission / thinking                           |             PASS |             PASS | 稳定通用等级本地化；provider-specific option不被重写                                                          |
| Settings Models/Agents/Packages                 |             PASS |             PASS | 唯一 public section顺序；lineage边界文案可读且有 re-entry                                                     |
| reduced motion                                  | source-preserved | source-preserved | 新 tab transition使用 `motion-reduce:transition-none`；Product loading pulse使用 `motion-reduce:animate-none` |
| scroll anchor                                   |   locale-neutral |   locale-neutral | 现有 mother tail-anchor browser suite 4/4 PASS                                                                |

本轮没有宣称对仓库所有 Viewer、Diff、Terminal、结构化提问和菜单完成全量 screen-reader审计；这里只证明首条
Agent/Chat/Product Conversation critical path和本轮触及的控件。

## Visual evidence and human calibration

施工前的真实母体校准已由维护者在本执行会话于 2026-08-04 回复 `OK 确认！` 接受。校准输入与 taste记录：

- `/private/tmp/omnimind-work4-ui-evidence.AlHLNU/synara-native-calibration/proposed/`
- `/private/tmp/omnimind-work4-ui-evidence.AlHLNU/ui-taste.md`

当前 post-surgery clean browser evidence：

- en: `/private/tmp/omnimind-work4-ui-evidence.AlHLNU/production-after/chat-en-US-clean.png`
- zh-CN: `/private/tmp/omnimind-work4-ui-evidence.AlHLNU/production-after/chat-zh-CN-clean.png`

两张 clean候选均无 provider toast overlay；检查记录为一个 Product execution notice、一个 current Recent row、
Agent/Chat tabs和母体 Composer/Timeline geometry保持一致，browser error数组为空。implementer的视觉检查无
material finding，但维护者尚未对这两张 post-surgery clean候选作最终人类视觉接受；独立 reviewer/主线程不得把
施工前 `OK 确认！` 改写为施工后接受。

## Performance evidence

正式 T3 performance harness 由独立 `t3_performance_harness` worker持有，且只修改：

- `apps/web/src/components/chat/ConversationPerformance.browser.tsx`
- `apps/web/src/components/WorkbenchPerformance.browser.tsx`
- `apps/web/vitest.browser.performance.config.ts`

本 implementer未修改或运行这三条共享路径。独立 worker完成后，主线程只为 immutable T0 同字节执行移除了
测试对当前 package namespace 的依赖，并把 surface switch测量改为同一组件的受控 rerender；production没有因此
改动。当前候选和 T0 都在 Apple M4 Pro（14 logical CPU / 64 GiB）、Headless Chrome 145.0.7632.6、
1440×900 viewport、Vitest/Vite transformed browser build 下运行。

| Scenario                        | Frozen absolute budget                          | Immutable T0                                        | Current candidate                                   | Verdict |
| ------------------------------- | ----------------------------------------------- | --------------------------------------------------- | --------------------------------------------------- | ------- |
| 100k / 400k Conversation DOM    | each ≤ 1,200；growth ≤ 180 nodes / 1.35×        | 157 / 57                                            | 157 / 57                                            | PASS    |
| 400k visible update             | commit ≤ 2,500 ms                               | 9.50 ms                                             | 9.20 ms                                             | PASS    |
| long Conversation heap recovery | post-GC ≤ +32 MiB                               | +869,956 B                                          | +778,680 B                                          | PASS    |
| 240 synthetic publications      | root renders ≤ 4；0 long task                   | root 1；Timeline 6 / 2.50 ms；42.6 ms；0 long task  | root 1；Timeline 5 / 2.50 ms；36.1 ms；0 long task  | PASS    |
| Conversation switch             | p95 ≤ 80 ms；0 long task                        | 22.1 ms                                             | 17.3 ms                                             | PASS    |
| scroll                          | p95 ≤ 80 ms；0 long task                        | 23.6 ms                                             | 33.7 ms                                             | PASS    |
| top hover                       | p95 ≤ 80 ms；0 long task                        | 20.6 ms                                             | 16.4 ms                                             | PASS    |
| split resize                    | p95 ≤ 80 ms；0 long task                        | 17.3 ms                                             | 30.5 ms                                             | PASS    |
| Workbench burst isolation       | root ≤ 4；Sidebar/hidden xterm render/write = 0 | root 1；subtree 15 / 5.00 ms；Sidebar 0；hidden 0/0 | root 1；subtree 13 / 4.40 ms；Sidebar 0；hidden 0/0 | PASS    |
| Workbench burst heap recovery   | post-GC ≤ +24 MiB                               | +830,816 B                                          | +817,252 B                                          | PASS    |
| IME + 120 UI updates            | CJK完整；premature command = 0                  | preserved；0                                        | preserved；0                                        | PASS    |

exact command：

```text
bun run --cwd apps/web vitest run --config vitest.browser.performance.config.ts --reporter=verbose
```

当前候选最终结果为 exit 0，2 files / 5 tests PASS，11.15s。Web typecheck、三文件 oxfmt check、oxlint和
scoped diff-check均为 exit 0。

T0 是主线程在 surgery 后从 immutable Git object
`2445acb987e443b44b7dc819de3de44c3d68b391:vendor/ui`（tree
`630f17e61abc478114bf83c1d740977c9f68b910`）解到 `/private/tmp` 后补跑的 retrospective profile，不伪称
“施工前已经执行”。三份复制输入与当前候选逐字节一致，SHA-256 分别为
`30ffab376db7e5ee9e4d99415c755d73ca4ca7a89a46e030d932283aa076a341`、
`2c82260b7c93628c8a823e8c42c99ffc7e1ccfe93f174966b27d3df0b7b7718a`、
`d1ac944f182f828435fde1ed9ec7b82750a533d4d9855c8fd27021c496406cbf`。T0 使用独立 browser API port
`51101`，同一命令 exit 0，2 files / 5 tests PASS，11.96s；临时目录不进入仓库。scroll/split 的单次 p95
比 T0 高，但仍低于预注册绝对预算、没有 long task；本表不把帧调度差异改写成“全面更快”。

这些 profile只证明 preserved UI mechanism与 Product presentation；synthetic stream不证明 Pi-native stream、
Session或Engine acceptance。

作为非正式诊断而非最终 gate，当前真实 UI的 20 次 Agent↔Chat switch测得 median 279.3 ms、max 468.6 ms、
post-GC heap增量 5,725,284 bytes。该数字没有替代独立 harness，也不证明 Pi execution latency。

## Verification

| Command / journey                                                                                                                                                                                                                                                                                                                                                                                                   | Current result                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `bun run --cwd apps/web test -- src/diffRouteSearch.test.ts src/components/Sidebar.logic.test.ts src/components/SettingsSidebarNav.test.tsx src/components/ChatView.logic.test.ts src/hooks/useThreadActivationController.test.ts src/productReadModel.test.ts src/productCutover.test.ts src/routes/-chatThreadRoute.logic.test.ts src/routes/-productChatIndexRoute.logic.test.ts src/i18n/workbenchCopy.test.ts` | PASS, exit 0; 10 files / 311 tests                                                      |
| `bun run --cwd apps/web test:browser -- src/components/AgentChatWorkbench.browser.tsx`                                                                                                                                                                                                                                                                                                                              | PASS, exit 0; 1 file / 5 tests                                                          |
| `bun run --cwd apps/web test:browser -- src/components/ProductProjectionCoordinator.browser.tsx`                                                                                                                                                                                                                                                                                                                    | PASS, exit 0; 1 file / 1 test                                                           |
| `bun run --cwd apps/web test:browser -- src/components/ComposerPromptEditor.browser.tsx`                                                                                                                                                                                                                                                                                                                            | PASS, exit 0; 1 file / 1 test                                                           |
| `bun run --cwd apps/web test:browser -- src/components/chat/MessagesTimeline.tailAnchor.browser.tsx`                                                                                                                                                                                                                                                                                                                | PASS, exit 0; 1 file / 4 tests                                                          |
| `bun run --cwd apps/web vitest run --config vitest.browser.performance.config.ts --reporter=verbose`                                                                                                                                                                                                                                                                                                                | PASS, exit 0; 2 files / 5 tests, 11.15s; current numbers listed above                   |
| immutable T0：同字节三文件，`VITEST_BROWSER_API_PORT=51101`，同一 performance命令                                                                                                                                                                                                                                                                                                                                   | PASS, exit 0; 2 files / 5 tests, 11.96s; T0 numbers and input SHA-256 listed above      |
| formatting后 `bun run --cwd apps/web test -- src/routes/-chatThreadRoute.logic.test.ts src/routes/-productChatIndexRoute.logic.test.ts src/i18n/workbenchCopy.test.ts src/productReadModel.test.ts`                                                                                                                                                                                                                 | PASS, exit 0; 4 files / 37 tests                                                        |
| `bun run --cwd apps/web typecheck`                                                                                                                                                                                                                                                                                                                                                                                  | PASS, exit 0                                                                            |
| `bunx oxfmt --check` over 18 Work4 core files                                                                                                                                                                                                                                                                                                                                                                       | PASS, exit 0                                                                            |
| `bun run --cwd apps/web build`                                                                                                                                                                                                                                                                                                                                                                                      | PASS, exit 0; Vite 8.1.5, 2615 modules, 45.60s, 2014 gzip/brotli sidecars               |
| `git diff --check -- apps/web`                                                                                                                                                                                                                                                                                                                                                                                      | PASS, exit 0                                                                            |
| clean fresh Chromium en/zh Chat + Settings route matrix                                                                                                                                                                                                                                                                                                                                                             | PASS; no executable override, no console/page errors, exact observations listed above   |
| real deep-link/mixed split/canonicalization browser journey                                                                                                                                                                                                                                                                                                                                                         | PASS; donor Agent ID rejected on Chat, omitted Chat canonicalized, mixed split stripped |

Browser命令使用标准 Playwright cache，没有 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 或其他 executable override。
测试产生的 `.vitest-attachments`、`__screenshots__`、`test-artifacts` 已移到 `/private/tmp` 或清除，仓库内无回流。

## Changed production paths by responsibility

- Route/public navigation: `diffRouteSearch.ts`, `useDiffRouteSearch.ts`, `_chat.index.tsx`,
  `_chat.$threadId.tsx`, `_chat.studio.index.tsx`, `-chatThreadRoute.logic.ts`,
  `-productChatIndexRoute.logic.ts`, `useThreadActivationController.ts`, `useHandleNewStudioChat.ts`.
- Sidebar/IA: `Sidebar.tsx`, `Sidebar.logic.ts`, `ProductChatRecentList.tsx`,
  `ProductGroupsUnavailable.tsx`.
- Product display/recovery: `ChatView.tsx`, `ChatView.logic.ts`, `BranchToolbar.tsx`,
  `productReadModel.ts`, `ProductConversationNotice.tsx`, `ProductConversationRouteState.tsx`,
  `productStore.ts`, root `__root.tsx`.
- Settings: `settingsNavigation.ts`, `settingsSearchIndex.ts`, `SettingsSidebarNav.tsx`,
  `_chat.settings.tsx`.
- Locale/a11y/IME: `i18n/workbenchCopy.ts`, `ChatHeader.tsx`, `TraitsPicker.tsx`,
  `ComposerPromptEditor.tsx`.
- Focused tests: matching colocated logic tests plus `AgentChatWorkbench.browser.tsx`,
  `ProductProjectionCoordinator.browser.tsx`, `ComposerPromptEditor.browser.tsx`.

`ChatView.tsx` 同时包含另一已授权 T2 Round-3 的 Composer CAS修复；本 actor没有接管或声称拥有那部分 diff。
共享 working tree里的 `.omp-flow`旧任务、architecture、brand scripts和独立 performance harness同样不是本 actor
的修改，不应因本 handoff被错误 stage为 Work4专属变更。

## Residual debt and claims explicitly not made

- T4尚未把 Pi runtime、Session、Package lifecycle或真实 Engine dispatch接入 isolated Native Host；当前生产 truth
  仍可能是 execution unavailable，不能称 Pi-native execution完成。
- `productReadModel.ts` 中 Thread/Project-shaped presenter是明确临时的 display adapter；T4 native Agent/Chat props
  接管后必须删除，不能成为永久 compatibility layer。
- local Chat draft仍借 private Studio container bootstrap；它不是 durable Product writer，也不在 UI暴露 Primary
  Folder，但 T4/后续 Product-native draft创建接管后应删除这条临时依赖。
- Settings Packages/Agents保留了 Plugin/Skill/provider lineage和 re-entry，但 typed Package/Agent capability事实尚未
  全接；unavailable boundary不是这些领域完成的证据。
- Groups没有 Product facts，故没有 fake create/reorder/membership controls；真正 Groups UI必须等唯一 Product owner。
- Viewer/Diff/Terminal/Git/PR/Kanban/Automations/Browser等成熟母体被保留，但本 slice未证明各自 Product/Host authority
  已完成切换。
- 正式 performance absolute budget与 immutable T0 same-byte retrospective comparison已通过；唯一仍需维护者完成的
  接受门是 post-surgery人类 visual acceptance。
- 未运行 repository root全量测试；局部绿色不得扩张为 repository-wide green或 Campaign完成。
- 本 handoff未 stage、未 commit、未 publish Flow Status，也未改变 Campaign claim。
