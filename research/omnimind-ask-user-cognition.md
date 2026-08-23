# OmniMind Ask User：一级公民、成熟母体与长期产品认知

> 观察与收口日期：2026-08-22
>
> OmniMind source 基线：`main@d5bd737d96008733d6ba854c6bbce2ad880f1bc1`
>
> 首选母体 exact source：[`mrclrchtr/supi@ce8af5f57304ad114319aa75c00920f029ceb8e7/packages/supi-ask-user`](https://github.com/mrclrchtr/supi/tree/ce8af5f57304ad114319aa75c00920f029ceb8e7/packages/supi-ask-user)
>
> 首选母体 exact artifact：[`@mrclrchtr/supi-ask-user@5.0.0`](https://www.npmjs.com/package/@mrclrchtr/supi-ask-user/v/5.0.0)
>
> 文档性质：fixed-source fact + current OmniMind source observation + maintainer-confirmed product decision + bounded implementation reference。
>
> 权威边界：本文是 **OmniMind Ask User 产品认知与 package-specific source decision** 的唯一 research owner。稳定 UI、状态与 runtime 责任仍分别由 [`architecture/workbench.md`](../architecture/workbench.md)、[`architecture/product-state.md`](../architecture/product-state.md) 与 [`architecture/execution.md`](../architecture/execution.md) 拥有；当前施工顺序只看 [`execution-brief.md`](../execution-brief.md)；production adoption 只有进入根 [`README.md`](../README.md) 的 source-adoptions 并得到对应 packaged evidence 后才成立。未来上游更新程序只由 [`pi-ask-user-intake.md`](pi-ask-user-intake.md) 拥有。

> [!IMPORTANT]
> **当前 disposition：`Fork narrowly`，不是直接安装，也不是从零重写。** 产品名为 **OmniMind Ask User**，fork package 预定为 `@omnimind/om-ask`，Pi tool 名固定为 `ask_user`。它只作为 bundled OmniMind Agent 的 Pi-native Session Extension 注册；canonical User Input contract 与 Composer UI projection 则是跨 Codex、Claude、OpenCode、Grok、Pi 与未来 Engine 的独立产品面。

> [!WARNING]
> 当前证据成熟度仅为 `source-matched / decision-complete / double-checked`。这里的“成熟”特指行为、状态机、测试和发布谱系较成熟，不等于市场份额、长期稳定性或已经 production-proven。本文不证明 fork 已创建、Extension 已注册、UI 已补齐、真实 Provider 已调用、安装包已包含或用户已经获得该功能。任何“已支持 Preview / Notes / Review / 多选 / 重启恢复”的声明都必须以结果链和 packaged journey 的真实证据为准。

## 0. 零记忆接手先读这里

### 0.1 一句话结论

OmniMind 应以 `@mrclrchtr/supi-ask-user@5.0.0` 为长期代码母体，保留其 choice/text 正交模型、stable IDs/values、多问题、Preview/details、多层补充说明、Review、structured result、sequential/abort/lock/no-UI 基线与作者测试，fork 成产品内置的 `@omnimind/om-ask`。`@geoqiao/pi-ask@1.3.0` 降为首要 UX donor，贡献每题自由回答出口、single replacement、multi coexistence、响应式 Preview 与交互测试。最终显示与交互投影到既有 canonical Composer Question UI，并补齐 Ask-first/答案后重规划屏障、无损文本、合成 sentinel、Abort/Cancel/late-answer fencing、同名 provenance 与重启 stale 语义。

### 0.2 已确认的产品裁决

| 事项 | 最终裁决 |
| --- | --- |
| 产品地位 | OmniMind 一级公民，重要性与 Todo 同级；不是临时弹窗、插件附属 UI 或 Provider 私有能力 |
| 产品名 | `OmniMind Ask User` |
| fork package | `@omnimind/om-ask` |
| Pi tool 名 | `ask_user`；不靠改名回避同名冲突 |
| 成熟母体 | `@mrclrchtr/supi-ask-user@5.0.0` exact source `ce8af5f…` |
| 来源模式 | 保留 ancestry、LICENSE、作者测试与主要目录形状的有界 fork |
| donor | `@geoqiao/pi-ask@1.3.0` 是首要 UX/test donor；`@pi9/ask@0.4.2` 贡献 deadline/no-UI/selected-only context 思路；`pi-ask-user@0.14.0` 贡献 signal/provider-schema 防御 |
| 明确拒绝 | 不直接原装 supi 或 geoqiao；不采用 RPIV/zhushanwen/pix/tian/大型 extension bundle 作 runtime；不从截图自造最小问答工具 |
| 支持宿主 | bundled OmniMind Agent 的 `agent` 与 `chat` work surface |
| stock Pi | 不安装、不注册、不测试、不承诺兼容；stock Pi 用户继续使用上游 package |
| Engine 工具范围 | `ask_user` Extension 仅 OmniMind Agent；不经 AgentGateway 向其他 Engine 分发同名工具 |
| UI 范围 | canonical User Input UI 属于 Workbench，所有能投影该合同的 Engine 共享 |
| activation | Agent / Chat Session 创建时 eager、initial-active；可用不等于必须调用 |
| 产品能力上限 | 不由当前 UI、Provider、package 或 TUI 决定；不硬编码最多 4 题或 4 个选项 |
| 自由表达 | 每道 choice question 永远有 Host 合成的最后一项“其他 / 自行输入……” |
| 语义边界 | Ask 澄清事实、偏好与选择；Approval 授权副作用。两者合同、结果、语言和生命周期分离 |
| 运行时安全 | sequential、同轮兄弟副作用屏障、terminal fencing、同名 provenance、no-UI fail-closed、restart stale |
| 上游同步 | 固定版本、人工 exact-source intake、按 patch inventory rebase；不追 `latest` |
| 当前状态 | 决策与 source review 完成；产品实现、依赖、发行物、live 与 packaged proof 均未完成 |

### 0.3 不可退让的维护者 taste

1. **成熟和好用优先。** package 小、diff 小、接口漂亮都不是主目标；水下生命周期、用户体验和作者长期维护质量才是。
2. **不拿当前实现倒推产品上限。** 题目数、选项数、Preview、Review、Notes、推荐项、补充说明都可演进；只有异常 payload 的性能与安全保护，不允许把保护写成产品能力限制。
3. **永远给用户自由表达出口。** “其他 / 自行输入……”由合同与 UI 自动补齐，模型不 author 该 sentinel；单选可被自由文本完全替代，多选可与自由文本并存，选定预设项后仍能写说明。
4. **用户原文无损。** 自由回答、问题备注和选项备注按用户提交的原始文本回给模型；可以验证空白或长度风险，但不得擅自 trim 后改写、归并、总结或解释。
5. **UI 是独立产品 owner。** 选中哪个 Pi package 都不能获得私有 UI；Composer Question 是起点，不是天花板。
6. **不公开假能力。** schema 一旦接受字段，UI、结果、恢复、日志与模型上下文必须真实兑现；这条是完整交付要求，不是拒绝能力的理由。
7. **安全边界不能被“好用”冲掉。** Ask/Approval 分离、同轮副作用屏障、Abort fencing、provenance、no-UI 与 restart 语义是硬正确性，不是可选优化。
8. **允许今天动大刀，拒绝未来重复付账。** 大改只要能消除平行 owner、保存成熟上游并降低长期维护成本，就是合理投入；为了本次 diff 小而留下双轨则不可接受。

### 0.4 Owner 图

```text
LLM decides clarification is needed
                 │
                 ▼
bundled OmniMind Agent / Pi AgentSession
                 │
                 ├─ Pi Tool Registry winner + sourceInfo
                 │      └─ @omnimind/om-ask / ask_user
                 │             ├─ request validation
                 │             ├─ lifecycle fencing
                 │             └─ truthful tool result
                 │
                 ▼
canonical User Input request/event contract
                 │
                 ├─ Product State: pending/resolved/stale projection
                 │
                 └─ Workbench Composer Question UI
                        ├─ choice / text / multi-question
                        ├─ other/freeform / notes
                        ├─ preview / recommendation
                        └─ review / edit / submit / cancel

Other engines ── native question mechanism ──► same canonical contract/UI

不经过：AgentGateway Host tool distribution
不建立：第二 Question store、Extension 私有 UI、TUI recovery control plane
```

### 0.5 判断这件事是否完成的最短标准

只有同时满足以下结果，才可称为 OmniMind Ask User 已交付：

- OmniMind Agent 与 Chat 的真实模型能调用 product-owned `ask_user`；
- 当前 Thread 在 Composer 中出现完整、可编辑、无损的共享 UI；
- 多题、单选、多选、文本、Preview、推荐、问题备注、选项备注、Review 都有 end-to-end 证据；
- 每道 choice question 都有合成 sentinel，且模型 schema 不重复携带它；
- Ask 未回答前，同一 assistant turn 的兄弟副作用不会偷偷执行；
- Cancel、Abort、timeout、late answer、无 UI、重启、reload、branch/resume、同名冲突均 fail closed；
- Codex / Claude 等现有 User Input journey 不因 UI 升级退化；
- MiMo 与 DeepSeek 的真实请求以及 exact pushed SHA 的隔离 packaged App journey 均通过。

## 1. 产品本质：不是一个“提问弹窗”，而是 Agent 的认知刹车

### 1.1 用户价值

Agent 的高质量并不只来自会做事，也来自知道什么时候不该猜。Ask User 解决的是三类高价值不确定性：

- 用户掌握而模型无法可靠推断的事实；
- 多条合理路径之间的偏好与取舍；
- 继续行动前必须明确的范围、格式、对象或成功标准。

它的用户结果不是“让模型问一句话”，而是：在不打断任务连续性的前提下，把不确定性结构化呈现，让用户能快速选择、补充、修正，并让模型收到真实、完整、可继续行动的答案。

### 1.2 为什么是一级公民

Todo 让用户知道 Agent 正在做什么；Ask User 让用户决定 Agent 应该做什么。两者都横跨模型工具、Session 生命周期、Product Timeline 与 Workbench 投影，都需要 provenance、恢复与真实结果，因此不能被处理成普通第三方 Extension 的偶然 UI。

“一级公民”具体意味着：

- 进入 OmniMind Agent 的产品 composition，而不是用户自行安装才有；
- 有稳定 canonical contract，不以某个 Provider wire schema 为产品 schema；
- 在 Timeline / Composer / pending attention 中有可观察状态；
- 有中英文产品文案、键盘与可访问性合同；
- 有 fail-closed 生命周期和 packaged release gate；
- 有独立 source/update owner，但不建立独立 UI/store/registry。

### 1.3 什么情况下不该调用

Ask User 不是礼貌性确认器，也不是把 Agent 的调查工作甩给用户：

- 能从 Workspace、上下文、代码、公开信息安全发现的事实，先调查；
- 小型、可逆、意图唯一的实现，直接做；
- 仅需权限授权的动作，走 Approval，不伪装成 Ask；
- 模型已有明确答案时，不为“显得谨慎”重复提问；
- 一连串可合并的问题应批量呈现，避免一次一问造成对话税；
- 不能因为没有 UI 就让模型“自行决定”高影响分叉。

## 2. 当前 OmniMind 真实基线：不是从零开始

### 2.1 已经存在

| 层 | 当前事实 | 结论 |
| --- | --- | --- |
| canonical contract | `packages/contracts/src/providerRuntime.ts` 已有多问题 `UserInputQuestion[]`、option、`multiSelect` 与通用 answers | 有共享骨架，不应另建 Ask 私有协议 |
| Product events | 已有 `user-input.requested` / `user-input.resolved` 与 pending Thread signal | Ask 应进入现有事件链 |
| Workbench | `ComposerPendingUserInputPanel.tsx` 已有分页、选择、Composer 自由输入 | UI 投影已经存在，但能力不完整 |
| Provider adapters | Codex、Claude、OpenCode、Grok、ACP、Pi 已有不同程度的 User Input bridge | 升级必须保护跨 Engine journey |
| Pi composition | `omnimindSessionExtensions.ts` 已有 product-bundled Todo / Host composition | Ask 应复用同一 composition owner |
| provenance precedent | Todo 已有同名 winner、product-owned result projection 的设计经验 | 不应只凭 tool name 信任结果 |

### 2.2 部分存在但不能冒充完成

- 当前 Composer 支持自由文本，但“选择预设后补充说明”“多选与自由文本共存”“问题/选项 Notes”“Preview”“Review”没有完整合同与结果链。
- 当前 `pendingUserInput.ts` 的行为与目标直接相反：非空 custom answer 会清空 selections，multi toggle 会清空 custom answer，resolve 时 custom 优先并忽略 selections。这不是“尚未展示”，而是数据模型不支持 coexistence，必须替换为正交 draft/result state。
- 当前 normalization/resolve 会对用户文本 `.trim()`。新合同不能复用该行为：可以用 trimmed 副本判断“是否全空白”，但提交和模型结果必须保存 raw string。
- 当前单选在点击后约 200ms 自动前进/提交，用户来不及补充说明，也不适合作为成熟 Review 流程。
- Cancel 的可见性依问题形态不一致，choice question 不应把退出藏掉。
- Pi 的 `ctx.ui.select / confirm / input` bridge 只处理 primitive 单问题交互，不足以承载丰富 Ask User。
- Product pending state 能跨渲染与进程观察，但原始 Pi Tool Promise 在进程重启后已经消失，不能伪造“恢复并完成原调用”。
- 现有 schema 的 `multiSelect` 和 string record 不是最终长期合同；它们可演进，但迁移必须一次兑现生产者与消费者。

### 2.3 真正缺失

- product-bundled `ask_user` Extension 与明确 source provenance；
- richer canonical request/result/status contract；
- Host 结构化 bridge，而不是把 rich Ask 降级成三个 primitive UI 方法；
- 完整 Composer Question UX；
- same-turn sibling side-effect barrier；
- request identity / opaque attempt fencing；
- restart stale 处理；
- exact collision、reload、branch/resume 与 packaged evidence；
- upstream fork 与长期 intake 机制。

### 2.4 不允许新增的平行系统

- Ask 专用数据库或第二 pending store；
- `@omnimind/om-ask` 自己的 React UI、TUI UI 与 Host UI 三套并行实现；
- AgentGateway 通用 `ask_user` Host tool；
- 为 stock Pi 维护另一套 OmniMind profile；
- Ask 专用 Extension Manager、配置页面、slash command 或自动恢复 daemon；
- 用模型输出文本解析来绕过 canonical structured contract。

## 3. 成熟生态结论

### 3.1 候选决策矩阵

| 候选 | 观察版本 / exact source | 成熟 UX | 生命周期 | 与 taste 的关键冲突 | 裁决 |
| --- | --- | --- | --- | --- | --- |
| `@mrclrchtr/supi-ask-user` | `5.0.0` / `ce8af5f…` | 多题、choice/text、single/multi、details、recommendation、form/question/option comments、Review/edit/unanswered | sequential、signal、cancel/abort 内部区分、one-form lock、no-UI fail-closed、structured result、公开 headless API | 推荐项被预选/文本被预填；无每道 choice sentinel；全文 trim；1–10/2–12 上限；TUI-only；依赖 `supi-core` | **代码母体，fork narrowly** |
| `@geoqiao/pi-ask` | `1.3.0` / `26496c8…` | 最厚 UX：多题、Preview、推荐、single custom replacement、multi custom coexistence、question/option notes、Review、响应式预览 | 有取消/RPC/恢复，但无 sequential，TUI signal 不完整，RPC 主动丢能力 | schema 与 TUI 耦合；stable value/ID 弱；`preview` 混成 type；commands/config/remote/recovery 生命周期过多 | **首要 UX/test donor** |
| `@pi9/ask` | `0.4.2` / `9cf2ee3…` | 单题 multi/freeform/comments/preview 扎实 | sequential、abort/deadline、no-UI、selected-only context rewrite 较强 | 无多题/Review/question notes | **correctness donor** |
| `pi-ask-user` | `0.14.0` / `2de7e14…` | 专注单题 | sequential、signal/timeout、proxy/provider schema 防御 | 能力面显著低于目标 | **安全 donor** |
| `@zhushanwen/pi-ask-user` | `7.0.11` / artifact-only | 多题、Review、split preview、自动 Other；附 18 个 tests | signal race guard、TUI/RPC、subagent channel | 无 repository/provenance 绑定；1–4/2–4 硬上限；无 sequential；headless 鼓励模型自行决定；global handshake；README 假称现实不存在的 comments | **拒绝 runtime；仅行为/test 反例** |
| `@xynogen/pix-ask` | `0.2.21` / `1efce1a…` | questionnaire、Preview、freeform | sequential、abort、RPC | 1–4/2–4 硬上限；multi 明确禁用 freeform；依赖 pix runtime/pretty 家族 | **拒绝 runtime** |
| `pi-tian-ask-user` | `1.0.0` / `6e2b293…` | 合成 Other、模型重复 sentinel 校验、多题 TUI | sequential、signal、no-UI 显式结果 | 1–5/2–5 硬上限；choice-only；primitive fallback 只能单选；自由文本 trim | **sentinel validator/test donor** |
| `@alexleekt/pi-ask-user-glimpse` | `0.7.0` / `988bac8…` | WebView 很丰富：search、context Markdown、comments、questionnaire、freeform | abort/timeout、TUI fallback | 建立独立 WebView/UI owner，5 个 direct deps，commands/subprocess/env surface，artifact 不含 tests，结果会 trim | **只借交互思路** |
| `pi-agent-extensions` | `0.5.3` / `ffcbaa1…` | ask 有 Other 与 text，但作者标 Beta | 多问题仅顺序 primitive dialogs | 17-extension 大包，Ask 不是成熟独立 owner，直装会带入大量无关生命周期 | **拒绝 runtime** |
| `@juicesharp/rpiv-ask-user-question` | `2.7.0` / `f595bb7…` | 功能多 | active-set reconciler、prewarm timer、RPC | 1–4/2–4 硬上限；无 sequential；忽略 signal；新控制面 | **拒绝 runtime** |
| `@eko24ive/pi-ask` | `1.2.0` / `49482b…` | geoqiao 直接谱系前身 | 较完整 | 已有明确 continuation | **保留 lineage** |

候选池是 2026-08-22 对 npm registry、package artifact、repository metadata 与 exact source 的快照，不是永久榜单。包名命中 `ask_user`、版本号高、README 截图漂亮或发布频繁只决定先看谁，不决定谁获得 runtime authority。

本文把“成熟”拆成四个维度，避免管理者被一个词误导：

| 成熟维度 | 真正要看什么 | 当前领先者 | 不能代替什么 |
| --- | --- | --- | --- |
| 行为成熟 | 多题、freeform、Preview、supplements、Review、窄屏、dirty state 等水下 UX | geoqiao | 不能代替 lifecycle/provenance |
| domain/contract 成熟 | stable IDs、正交类型、可测 controller、structured result | supi | 不能代替用户自由出口 |
| runtime 成熟 | sequential、signal、lock、terminal 区分、no-UI、reload cleanup | supi/pi9 局部领先 | 不能代替 exact Pi sibling barrier |
| 治理/分发成熟 | exact source、provenance、license、tests、发布存续、依赖与 artifact 完整性 | 没有候选全绿 | 不能因为 UX 强就忽略 legal/supply-chain 缺口 |

最终方案不是宣称 supi 在所有维度获胜，而是让一个最适合长期代码与合同维护的母体承担 runtime lineage，再有边界地吸收 geoqiao 的成熟交互。这是一个 runtime，不是两个包拼装后同时运行。

### 3.2 为什么 double-check 后改选 supi 为代码母体

首版只对比 geoqiao、pi9、pi-ask-user 与 RPIV，候选池不完整，因此“geoqiao 母体”不该被当成不可更改的结论。补搜并对 exact artifact/source 反证后，supi 更适合长期代码母体：

- 它的 tool schema 用 stable question ID 和 option value，choice/text、single/multiple、details 是分开的语义，不需要从 label 或 UI type 反推答案。
- Review、form/question/option comments、未回答状态、structured result 与可测 controller 已经是清晰 domain model，映射 canonical Host UI 时不需要把 TUI 当业务真相。
- 它已声明 sequential，有 signal、one-form lock、cancel/abort 内部区分、no-UI/custom-UI fail-closed，虽不够完整，但比从无开始更接近正确运行时骨架。
- package 从 2026-04 持续发布至 5.0.0，exact artifact 有 npm SLSA provenance 绑定 exact Git commit；source 内有 9 个 test files，artifact 不伪装已携带 tests。
- `/api` 与 `/extension` 是分开出口，这是将 domain/controller 保留、将 TUI/config/session 家族责任切掉的真实 seam。

这不是因为 supi “更小”；它并不小，还依赖 `@mrclrchtr/supi-core@5.0.0`。改选的理由是：在保留成熟 UX 的同时，它更少迫使 OmniMind 长期围绕 UI label、TUI state 和隐式结果维护兼容。

但不得粉饰风险：上游 README 明确称 SuPi 整体仍是 pre-release，四个月内有大量快速发布与多次 major 跳转，5.0.0 的市场存续期很短。因此这是“当前 exact-source 中结构和行为最适合的母体”，不是“可以无脑追更的稳定依赖”。所有更新必须 exact-source intake；fork 存在的意义正是把产品语义与上游快速变化隔开。

### 3.3 supi 的硬缺口：不 fork 就不可用

| 上游默认 | 为什么不可接受 | fork 必须改什么 |
| --- | --- | --- |
| recommendation 预选 choice，无推荐的 single 还预选第一项 | 模型推荐不是用户答案 | 推荐只是 badge/说明，初始 selection 恒空 |
| text recommendation 预填为答案 | 用户可能在未编辑时误提交模型文本 | 推荐与 draft/value 分离 |
| choice 没有固定 Other/freeform | 违反每题自由表达出口 | Host 合成 sentinel，single replacement，multi coexistence |
| `setTextAnswer` 和三层 comment setter 都 `.trim()` | 用户原文被改写 | 用 trim 副本判空，保存 exact raw string |
| 1–10 questions / 2–12 options 硬 cap | 把交互策略写成产品能力上限 | 移除 product maxItems，只保留异常 bytes/depth/render-cost guard |
| 所有问题默认要求回答，未答变 `needs_discussion` | optional/required 没有真实正交合同 | 只在全链 enforce 后公开 required/optional/skip |
| Cancel 与 Abort 最终都 `ctx.abort()` + 同一 error | 产品和模型无法辨别用户取消与 Run 中止 | 保留不同 terminal，并作废同轮 siblings |
| TUI-only，依赖 `supi-core` prompt/session/terminal helpers | 会形成第二 UI/config/session owner | 产品 profile 改用 structured Host seam；逐项证明保留还是删除 core dependency |
| `tool_result` listener + deferred label writer、session_start 重注册 | 是 ambient lifecycle，不能随母体默认进产品 | 由 OmniMind composition/provenance owner 接管，禁止隐式 listener/writer |

### 3.4 为什么 geoqiao 是首要 donor，而不再是母体

geoqiao 仍然拥有候选中最厚的交互冰山：single custom replacement、multi custom coexistence、question/option notes、Review/Elaborate、响应式 Preview、dirty-dismiss、输入与窄屏测试。这些不能从零重建，必须作为 UX 与 regression donor 吸收。

但它的业务状态更深绑定 Pi TUI，结果较多依赖 label/index，`single | multi | preview` 混合回答类型与展示模式，默认 Extension 还带 commands、settings、skill、notifications、remote bus、replay 和伪恢复生命周期。对 canonical Host UI 为主的 OmniMind，它作为代码母体会让 P1/P2/P3/P7 长期更重。

另一个必须说清的管理风险：`@geoqiao/pi-ask` 命名空间与 1.3.0 发布本身很新，其成熟主要来自对 `eko24ive/pi-ask` 的 Git 谱系、连续 UX 演化和 27 个 source-only test files，不应被误写成“市场上长期验证的成熟包”。

### 3.5 其他候选为何不翻盘

- zhushanwen 的自动 Other 和 18 个 artifact tests 很有价值，但发布物无 repository/exact-source provenance，README 还公开了当前 schema/code 并不存在的 `allowComment`；这是一级公共工具不能接受的假能力和治理缺口。
- pix 和 tian 都有 sequential 与不错的交互点，但同样把 4/5 个问题或选项写进 public schema；pix 更直接在 multi 下关掉 freeform。
- Glimpse 把产品体验放进独立 WebView，这与 shared Composer owner 直接冲突；它的价值是搜索、context panel、窄屏和 comments 的交互参考。
- `pi-agent-extensions` 中 Ask 仍标 Beta，且安装单位包含 17 个 extensions；为 Ask 引入整套 runtime 是明确的 owner 失控。
- RPIV 的 active-set reconciler/prewarm timer 把问答扩张成第二控制面；功能多不能抵消错误的 authority 形状。

## 4. Exact source、artifact、权利与证据成熟度

### 4.1 首选母体固定身份

| 字段 | Exact value |
| --- | --- |
| upstream package | `@mrclrchtr/supi-ask-user@5.0.0` |
| repository | `https://github.com/mrclrchtr/supi.git` |
| exact source | `ce8af5f57304ad114319aa75c00920f029ceb8e7` |
| package path | `packages/supi-ask-user` |
| license | exact source 根 `LICENSE` 为 MIT，Copyright (c) 2026 Marcel Richter；package manifest 标 MIT |
| artifact legal-file caveat | npm tgz 未包含 `LICENSE` / `NOTICE`，却同时 bundled 了 `supi-core` source；直装/原样再分发不达到 OmniMind 的 attribution 标准，fork artifact 必须补入 exact MIT 文本和来源说明 |
| npm integrity | `sha512-uBlvlXTvSrdvTvvdbpapwVwA4I3DMcIaHSGe18mtd4KdWAhd36yY1UwGvAbFXcS2NvJ18VIkaJpi112CSoabJQ==` |
| npm shasum | `cabb06df40ab95be1a67b4f3b32c83bc257ea38a` |
| downloaded tgz SHA-256 | `d687d4d448cc115a67ceb473b8e9ceeb56dddb047901b1f2daa05d6ae0cb300e` |
| npm provenance | SLSA provenance 指向 exact commit `ce8af5f…`、`main` 与 `.github/workflows/ci.yml` |
| package files | 54 |
| TypeScript size | 约 6,045 lines（artifact，含被包入的 `supi-core` source） |
| direct dependencies | `@mrclrchtr/supi-core@5.0.0`，且 artifact 作为 bundled dependency 直接包入其 source；不默认继承，Gate B 逐 module 证明 |
| peer dependencies | Pi Coding Agent / Pi TUI / TypeBox wildcard optional；OmniMind 不继承 wildcard 为支持合同 |
| author tests | exact source 内 9 个 `.test.ts` files；npm artifact 明确排除 tests |
| evidence maturity | `source-matched`；未达到 fork-runtime、live-provider 或 packaged-product proof |

### 4.2 Donor 固定身份

| Donor | exact source | artifact SHA-256 | 只允许吸收 |
| --- | --- | --- | --- |
| `@geoqiao/pi-ask@1.3.0` | `26496c809870e349429bc2cae72d61b46d0e2bc3` | `28b7b6733c4cc9f428c809b99e5dacb09c58334b01c6780b47d8bf551198fa92` | sentinel/freeform、single replacement、multi coexistence、responsive Preview、notes/Review 行为与 27 个 source tests |
| `@pi9/ask@0.4.2` | `9cf2ee3df248ebc5a4dc5b535aef21d377115bc9` | `4b966e15bbdb0921ff21706b7ec750b4052625ac80becede615949f820728b32` | deadline、no-UI、selected-only context rewrite、对应测试 |
| `pi-ask-user@0.14.0` | `2de7e145227f7a527e995e323a50e7ee9bf88b0e` | `5225ddb691916cc60d7623de5b2762f11c0c97ea2a41a3d4596159c8c9e50887` | provider/proxy-friendly schema、signal/timeout 防御思想与测试 |
| `pi-tian-ask-user@1.0.0` | `6e2b293d722fdce6803b33432919e3216cd6a845` | `5136fc76382b1985ecb5f2cc0822f3e845b916f2b66f9124f6853e4668c5f55f` | 模型重复 sentinel 识别与拒绝测试思路 |

吸收 donor 源码时必须保留来源与许可证声明，且只复制明确、可回归的最小机制；不得把第二 package 的 settings、commands、active-set 或 UI 一并带进来。

### 4.3 证据等级不能混用

| 等级 | 能证明 | 不能证明 |
| --- | --- | --- |
| `source-matched` | exact source、artifact、许可证、结构与作者测试存在 | OmniMind 能运行 |
| `fork-conformant` | patch inventory 与作者/fork tests 通过 | 真实 Provider 会正确调用 |
| `isolated-runtime-observed` | 真实 Pi Session 中注册、调用、取消、冲突正确 | 安装 App 已包含 |
| `live-provider-proven` | MiMo / DeepSeek 等真实 wire 与模型行为正确 | Workbench packaged journey |
| `packaged-product-proven` | exact pushed SHA 构建、隔离 profile、完整用户 journey | 公开 Release 已发布 |
| `released` | 签名/更新 authority 真正发布 | 后续版本仍自动正确 |

## 5. 产品 owner 与发行边界

### 5.1 Source / maintenance / registration / execution / state / distribution

| 责任 | 唯一 owner |
| --- | --- |
| fork source 与 ancestry | `@omnimind/om-ask` repository/package owner |
| 上游同步程序 | [`pi-ask-user-intake.md`](pi-ask-user-intake.md) |
| 产品 contract | `packages/contracts` 的 canonical User Input owner |
| Session composition | `omnimindSessionExtensions.ts` 所在 Pi composition owner |
| tool registration / winner | Pi ResourceLoader / Tool Registry / sourceInfo |
| tool execute 与 settlement | `@omnimind/om-ask` 当前 Extension instance |
| pending product projection | 既有 Product State / Thread pending interaction owner |
| 用户可见 UI | Workbench Composer Question owner |
| result projection | PiAdapter 的窄 canonical event bridge |
| cross-engine UI reuse | 各 Provider adapter → canonical User Input contract |
| bundled distribution | OmniMind official package/build/release chain |
| stock Pi | upstream package 自己；OmniMind 不承担 |

### 5.2 支持矩阵

| Surface | `@omnimind/om-ask` tool | canonical Question UI |
| --- | --- | --- |
| OmniMind Agent | bundled、initial-active | 是 |
| OmniMind Chat | bundled、initial-active | 是 |
| Codex | 不分发 OmniMind tool；使用 Codex native mechanism | 是 |
| Claude | 不分发 OmniMind tool；使用 Claude native mechanism | 是 |
| OpenCode / Grok / ACP | 不分发 OmniMind tool；各自 adapter | 是 |
| stock Pi | 不注册、不支持 | 不承诺 OmniMind Host UI |
| future Engine | 先做 adapter capability review | 可投影同一 canonical contract |

### 5.3 注册原则

- Ask User 与 Todo 一样由 product composition 显式装配，不靠目录扫描或用户 package discovery 偶然出现。
- Agent 与 Chat 都 initial-active；这只表示模型可以调用，不表示 system prompt 强制先问。
- 不新增 Settings 总开关。能力不可用时准确显示原因，不让用户管理内部 Extension 开关。
- 不注册 `/answer`、`/answer:again`、`/ask:replay`、`/ask-settings` 或 TUI shortcut。
- 不注册 package skill、notifications、remote bus、payload entries、auto recovery daemon。
- Extension reload 必须销毁旧 instance listener 和 pending promise；新 Session 重新组成，不保留 ambient singleton。

## 6. Canonical contract：能力不设限，语义必须正交

### 6.1 目标形状

以下是认知级合同，不是要求逐字采用的 TypeScript；最终字段名由 contracts owner 一次性收口，但语义不可降级：

```ts
type AskUserRequest = {
  requestId: string;
  title?: string;
  questions: AskUserQuestion[];
};

type AskUserRichText = {
  format: "plain_text" | "markdown";
  content: string;
};

type AskUserQuestionBase = {
  id: string;
  header?: string;
  prompt: string;
  context?: AskUserRichText;
  required?: boolean;
};

type AskUserQuestion =
  | (AskUserQuestionBase & {
      kind: "choice";
      selectionMode: "single" | "multiple";
      options: AskUserOption[];
    })
  | (AskUserQuestionBase & {
      kind: "text";
      placeholder?: string;
    });

type AskUserOption = {
  id: string;
  label: string;
  description?: string;
  details?: AskUserRichText;
  recommended?: boolean;
};

type AskUserAnswerBase = {
  questionId: string;
  state: "answered" | "skipped";
  supplement?: string;
};

type AskUserAnswer =
  | (AskUserAnswerBase & {
      kind: "choice";
      selectedOptions: Array<{
        optionId: string;
        supplement?: string;
      }>;
      freeform?: string;
    })
  | (AskUserAnswerBase & {
      kind: "text";
      text?: string;
    });

type AskUserResolution = {
  requestId: string;
  status:
    | "submitted"
    | "cancelled"
    | "aborted"
    | "timed_out"
    | "ui_unavailable"
    | "stale";
  answers?: AskUserAnswer[];
};
```

`requestId` 是产品请求身份。为防旧窗口、reload 或旧 Extension instance 误提交，transport/runtime 还需要一个不可伪造的 opaque attempt/fence token，但它是内部 lifecycle 证明，不应为了方便直接变成模型可写的 `generation: number`。请求 schema 校验失败发生在 pending 之前，应返回带路径的 validation diagnostic，不伪装成一次用户 terminal `invalid`。`timed_out` 只在 exact caller 真正拥有显式 deadline 时存在，不是 Ask 的默认倒计时。

### 6.2 为什么不用上游 `single | multi | preview`

`single / multiple` 是选择 cardinality，`preview` 是 presentation capability。把 Preview 做成第三种题型会导致“多选 + Preview”“文本 + 参考资料”等组合无端被禁止。canonical contract 必须正交表达：

- `kind` 决定回答是 choice 还是 text；
- `selectionMode` 决定单选或多选；
- `context` 是整题决策依据，`details` 是选项的权衡/预览；两者是受限 rich text，不是可执行 HTML；
- `recommended` 是提示，不是默认授权或自动选择；
- Review 是 UI 提交流程，不是模型 author 的 question type；
- `supplement` 是用户答案的一部分，不是模型输入能力开关。UI 可显示为“备注 / Notes”，但合同不用模糊的 `note` 承担多种语义。

geoqiao 的 `Elaborate` 是“请 Agent 先解释再回来决定”，不等于用户对已选答案的补充说明。如果未来要这个动作，它必须是明确的交互 transition，产生新 turn/request，不得复用 `supplement` 或暗中往当前 Tool result 塞一段解释。

### 6.3 “其他 / 自行输入……”硬合同

每道 `kind: choice` 的题目在 UI 中都必须合成固定最后一项：

- 中文：`其他 / 自行输入……`
- 英文：`Other / Write your own…`

它有以下不变量：

1. 不由 LLM 写入 `options`；prompt 明确要求模型不要生成等价 sentinel。
2. 不占用 model-authored option ID，不进入 selected option ID 列表。
3. 单选选择它并输入文字时，preset selection 被替代。
4. 多选时，自由文字与 preset selections 同时提交。
5. 即使选择 preset，用户仍可写 question supplement 或 selected-option supplement。
6. sentinel 只是打开自由输入的 UI affordance；真正结果是 `freeform` 原文。
7. 若模型仍重复 author “其他”，validator/UI 去重可报告 diagnostic，但不得把模型 option 当 canonical sentinel。
8. choice schema 不提供 `allowFreeform: false`；自由表达是产品不变量，不是模型可关闭权限。

### 6.4 无损原则

- 用户输入的 `freeform`、question `supplement` 与 selected-option `supplement` 按提交时 exact string 返回模型。
- UI 可以用“不允许全空白”做 validation，但不能为方便而 trim 后覆盖原值。
- Unicode、换行、Markdown-like 文本、中文标点、emoji 与代码片段均保持。
- 不把自由回答自动映射成最相似 preset，也不让模型看到伪造的 option ID。
- 不把多个 supplements 合成摘要；展示层可分区，结果层保留字段与关联。
- 为安全实施的最大字节、嵌套深度和渲染预算属于异常 payload guard；触发时在展示 pending 前返回明确 validation diagnostic，不能静默截断。

### 6.5 数量与 payload 边界

产品不规定“最多 N 题 / N 选项”。实现必须区分：

- **能力**：任意合理数量的问题与选项；
- **易用性建议**：prompt 鼓励合并相关问题、避免无意义长表；
- **性能保护**：对异常总字节、极深对象、极长单字段、恶意 Markdown 与超大 DOM 做明确拒绝或安全降级；
- **展示策略**：超过可视区域滚动、搜索或虚拟化，不删题、不截选项；
- **快捷键**：数字 1–9 只是 convenience，不是第 10 个选项不可选。

阈值必须由测量与安全证据决定，并以 payload bytes / render cost 表达；不得把 `maxItems: 4` 写进公共产品 schema。

### 6.6 `required` 的诚实性

只有当 schema validation、UI、Review、result 与 adapter 全链都真实 enforce 时才公开 `required`：

- required question 未答时 Review 明确指出并阻止 Submit；
- optional question 可显式 Skip；
- skipped 的序列化方式统一，不因 Provider 改变；
- 自由输入只有空白时按 validation 处理，但保留原始 draft；
- 不得像上游一样只在 prompt 里说 required、UI 却仍可无答案提交。

在全链完成前，宁可暂不接受字段，也不能接受后假支持。

### 6.7 结果给模型时只传真实决定

`ask_user` Tool result 应包含：

- 已选择 option 的稳定 ID、label，以及必要的 description / preview；
- exact freeform；
- exact question supplement；
- 仅 selected options 对应的 option supplements；
- 每题明确 answered/skipped 状态；
- terminal status 与 request identity。

不得把未选择 alternatives 重放到后续模型上下文，好像用户也认可它们。Product Timeline 可保留完整题目与答案作为 provenance，但模型 continuation 的 decision context 只应突出真实选择。

## 7. UI projection：Composer Question 是起点，不是天花板

### 7.1 信息架构

Ask User 继续使用当前 Thread 底部 Composer 的 blocking intervention surface：

- 不做全屏 route；
- 不做脱离 Thread 的 modal；
- 不在 Right Dock 建第二问答面；
- 不把 Extension 自己的 TUI component 嵌入 Web；
- 不与 Approval 共用语义卡片，视觉 primitives 可以复用。

### 7.2 标准 journey

```text
Agent 发起 Ask
  → Composer 进入 pending Question 状态
  → 用户逐题选择 / 输入 / 预览 / 写备注
  → Next（不会因单击选项自动跳走）
  → Review 汇总全部题目
  → Edit 任一题，draft 完整保留
  → Submit
  → canonical resolved event
  → exact product-owned Tool Promise settlement
  → 模型 continuation
```

### 7.3 多问题导航

- 顶部显示当前题序、总数和可访问的 previous/next；总数是实际数量，不假定 3 或 4。
- 桌面宽屏可用 tabs / stepper；窄屏使用 compact progress，不让 tab 挤成不可读。
- 已回答、未回答、required missing、含 notes 的状态可见但不制造颜色唯一语义。
- Previous / Next 不丢 draft；跳转 Review 再回来也不丢。
- 选择 preset 后不自动 200ms advance；用户可能要预览、补充、修改或多选。
- Enter 的行为考虑 IME composition，不能在中文候选确认时误提交整份问卷。

### 7.4 选项、推荐与 Preview

- option row 显示 label 与 description；recommended 以克制的 badge/说明呈现，不自动勾选。
- 单选和多选有明确 control 语义，不能只靠背景色。
- Preview 在宽屏使用同一 surface 内的 side pane，在窄屏堆叠到选项下；切换选项保持滚动与焦点可预测。
- Preview 是模型提供的非执行内容，按受限 Markdown 渲染；禁 raw HTML、script、iframe、远程主动内容和不受控资源加载。
- 长路径、长 URL、无空格 token、代码块与中文长文必须 wrap/scroll，不撑破 Composer。
- “其他 / 自行输入……”永远最后显示，但不因 options 较多而被虚拟列表吞掉。

### 7.5 自由输入与备注

- choice sentinel 打开自由输入；text question 直接显示输入区。
- question note 是对整道回答的补充。
- option note 与 selected option 绑定，适合“选 B，但需保留条件 X”。
- 取消选择一个已有 note 的 option 时，不能静默丢失文字：保留 draft 或明确确认清除。
- 多选的 freeform 与 preset 并排进入 Review，不呈现为二选一。
- 输入框显示剩余风险而非武断字符上限；异常超大输入由明确 guard 处理。

### 7.6 Review 是成熟体验的核心

Review 至少展示：

- 每道题的 prompt/header；
- selected options；
- freeform；
- question / option notes；
- required missing 与 skipped；
- Preview 摘要或可展开引用；
- 每题 Edit；
- `Submit answers`、`Back`、`Cancel request`。

Review 不是额外模型调用，也不让模型看到未提交 draft。只有用户显式 Submit 才 settlement。可提供“继续补充”入口，但它仍编辑同一 request，不创建另一个隐形 request。

### 7.7 Cancel、后台 Thread 与注意力

- Cancel 在所有 question type、所有步骤都可见；不能只在 text-only 题显示。
- Cancel 明确说明 Agent 将收到“用户取消”，而不是默认选择或空答案。
- 非当前 Thread 收到 Ask 时，进入既有 pending attention / unread surface，不自动抢 route、焦点或打开窗口。
- 用户切换 Thread、关闭/重开 Right Dock 或窗口 resize，draft 与 pending 状态按既有 Product State 保持；进程真正重启则见 §9.6 stale 规则。
- 同一 Thread 同时只能有一个可交互的当前 Ask；若 runtime 产生第二个，按 sequential/queue 规则处理，不能覆盖第一份 draft。

### 7.8 键盘与可访问性

- Tab 顺序：导航 → question → options → freeform/notes → actions；焦点环清晰。
- radio / checkbox / tab / progress 使用正确语义与 accessible name。
- 数字键 1–9 可选择当前可见对应项，但输入框聚焦、IME、modifier 或 screen reader 场景不劫持。
- Escape 不直接破坏性 Cancel；应聚焦/打开明确取消确认或遵循 Composer 既有安全模式。
- 新 question、validation error、Review 与 settlement 用适量 live-region announcement。
- reduced motion 下取消滑动/弹跳，仅保留状态变化。
- 200% zoom、键盘-only、VoiceOver、中文/英文、480px 最窄支持宽度、典型宽度与 stress 宽度均验证。

### 7.9 国际化

新增或修改的产品文案必须同一变更完整交付 `zh-CN` 与 `en`：

- sentinel；
- Next / Previous / Review / Edit / Submit / Cancel / Skip；
- required、validation error、stale、ui unavailable、timed out；
- recommended / preview / notes；
- background pending attention；
- restart interruption 与 re-ask recovery。

模型原始 question/option/preview 不翻译；产品 chrome 必须翻译。不得用硬编码 English 混入中文 UI。

## 8. Ask 与 Approval 必须语义分离

| 维度 | Ask User | Approval |
| --- | --- | --- |
| 目的 | 获取事实、偏好、取舍、补充 | 授权一个已知副作用 |
| 结果 | 答案内容 | allow / deny / scope |
| 对后续动作的权限 | 不授予权限 | 明确授予或拒绝 |
| 可否用自由文本替代 | 可以 | 备注不能替代 allow/deny |
| 取消 | 用户不回答 | 用户不授权；语义更接近 deny/abstain |
| UI | Question/Review | Action/impact/authority |
| 事件 | user-input lifecycle | approval lifecycle |

可以复用 card、button、focus trap、pending indicator 等视觉/工程 primitives，但不得：

- 用“你想让我删除吗？”的 choice answer 代替删除 Approval；
- 把推荐项当默认授权；
- 将 Ask 的 selected option 解释成提升权限；
- 让 Approval notes 进入 Ask result；
- 用同一个 terminal enum 混淆 cancelled 与 denied。

## 9. 生命周期、并发与失败语义

### 9.1 Sequential 是最低门，不是全部保证

`ask_user` 必须声明 `executionMode: "sequential"`，但 exact Pi `0.84.2` 已经证明这只是必要条件：agent loop 一旦发现 batch 内任一 sequential tool，就把整批 calls 按模型输出的原顺序一个个执行。它不会把 Ask 提到最前，不会为答案后的旧 siblings 强制新模型 turn，也不会在 Ask 成功后自动终止 batch。

因此产品不变量必须更强：**同一 assistant turn 只要出现 `ask_user`，该 Ask 前后所有尚未执行的兄弟副作用都不得执行；Ask 提交答案后必须让模型基于答案重新规划。** 这需要最窄 scheduler/dispatch seam 的 Ask-first + batch-terminate barrier，不能靠 prompt，也不能把 `sequential` 这个字当成证据。

### 9.2 Tool batch 行为

- Ask 前在早于该 assistant turn 的已完成 turn 中取得的纯读结果可保留；同 batch 内的 read siblings 也不得依赖原顺序抢在 Ask 前运行。
- scheduler 先识别 product-owned Ask，将它作为该 batch 唯一允许进入交互的 call；其余 siblings 标记为 not-executed/superseded，不要伪造成功结果。
- 用户 submitted 后终止原 batch，将 Ask result 交给模型开启新 continuation；绝不自动执行答案出现前已生成的旧工具参数。
- Cancel / Abort / timeout 后，同 batch siblings 不执行。
- 重复 Ask 按 request identity 去重，不出现两个 UI settlement 同一 promise。

### 9.3 Terminal 状态

每个 request 只能从 pending 进入一个 terminal 状态：

```text
pending ─┬─ submitted
         ├─ cancelled
         ├─ aborted
         ├─ timed_out
         ├─ ui_unavailable
         └─ stale
```

所有 settlement 幂等；第二次 resolve/reject 只记脱敏 diagnostic，不改变产品事实。格式/能力校验失败在请求进入 pending 前以 request rejection 结束，不创造“用户回答 invalid”的虚假事实。

### 9.4 Abort / Cancel / timeout

- **Cancel**：用户主动不回答；模型收到明确 cancellation result，不收到空 selections 伪答案。
- **Abort**：Run/Session signal 终止；UI 立刻不可提交，promise 以 aborted settlement 结束。
- **timeout**：仅在有明确产品 timeout 时使用；不从上游 settings 偷继承隐藏 timer。
- 三者不能统一成 `undefined`，否则模型会把“不回答”误当“没有内容”。
- Abort signal 进入 TUI-free Host structured path，不只进入 RPC fallback。

### 9.5 Late-answer fencing

每次请求需要 `requestId + opaque attempt/fence token + Session instance provenance`：

- 用户提交时必须与当前 pending fence token 匹配；
- Abort、Cancel、timeout、reload、Session replacement 后旧 token 失效；
- 延迟 IPC、重复点击、旧窗口消息、网络重试不能解决新 request；
- result handler 验证 exact Extension instance / trusted token，不只比较 tool name；
- UI 收到 stale submission 时保留可解释提示，不把答案偷偷附到后续问题。

### 9.6 进程重启与恢复

Product State 可在重启后知道“这个 Thread 曾等待用户输入”，但原 Pi process 的 Tool Promise 已经不存在。正确行为：

1. 原 pending interaction 标记为 `stale / interrupted`；
2. Timeline 保留发生过的 request 与未提交 draft 的可恢复展示（若现有状态 owner允许）；
3. 不把用户重启后提交的答案伪装成原 Tool result；
4. 新模型 continuation 需要时创建新的 `ask_user` request；
5. 可提供“让 Agent 重新提问”动作，但它启动新 turn/request；
6. 禁止沿用 geoqiao 的自动 user-message recovery 来假续接原 promise。

“恢复 UI”与“恢复 execution continuation”必须严格分开。

### 9.7 无 UI fail closed

- Session 创建时若 structured Host UI capability 不可用，不注册/不暴露 product `ask_user`，并生成准确 diagnostic。
- request 已发出后 UI 消失，settle 为 `ui_unavailable`；不能 fallback 为模型自行判断。
- generic third-party Pi Extensions 仍可使用 `ctx.ui.select/confirm/input` primitive bridge；product rich Ask 不降级成 primitive 后谎称 Notes/Review 已支持。
- Headless/automation surface 若未来要支持，必须建立真实交互 owner 或明确不支持，不能读取 stdin 假装用户。

### 9.8 同名 provenance 与 collision

Pi Registry 的真实 winner 决定哪个 `ask_user` 执行：

- Product projection 只信 exact `@omnimind/om-ask` sourceInfo / Extension instance 产生的 request 与 result。
- global/project/third-party 同名 Extension 若按 Pi precedence 成为 winner，可以执行自己的语义，但不得获得 OmniMind Product Question projection authority。
- product loser 时显示 capability unavailable / collision diagnostic；其余 Session 不应崩溃。
- 不通过偷偷提高 priority、改名或劫持所有同名 calls 来制造“产品可用”。
- reload 后旧 instance 的 answer token 失效；新 instance 重新判定 winner。

### 9.9 Branch / resume / reload / Session replacement

- branch/resume 新建或恢复 Session 时，Ask Extension composition 与 active set 可预测；
- 未决 Ask 不跨已经消失的 runner 自动 settlement；
- reload 清除旧 listeners、timers、RPC handlers、draft binding 与 context rewrite hook；
- Session replacement 后旧 UI 必须 stale；
- 不使用 process-global active request set，也不让一个 Thread 的事件清理另一个 Thread。

## 10. Result 与模型上下文诚实性

### 10.1 Tool result

结果应是结构化、可读但不含糊的 JSON/text content，至少回答：谁问的、用户是否提交、每题选择了什么、补充了什么、哪些跳过。模型不应需要解析 UI label 拼接字符串来恢复 option identity。

### 10.2 Selected-only context rewrite

可借鉴 pi9 的 selected-only rewrite，但必须满足：

- 只处理 product-owned、已验证成功、standalone 可定位的 Ask tool call；
- 保留 Tool result 与审计 provenance；
- 去除的是未来模型不需要重复看到的未选 alternatives，不是篡改历史用户答案；
- 遇到多个同名 call、并行 batch、未知 result 或 adapter serialization 时 fail closed，不 rewrite；
- 不创建第二 conversation history store。

如果无法唯一证明 rewrite 对象，就保持原上下文，先承担 token 成本，不冒险错改历史。

### 10.3 Prompt guidance

system guidance 应短、行为导向：

- 只有存在影响结果且无法安全发现的不确定性时才问；
- 能一起回答的问题批量问；
- 给出清晰、互斥或可组合的优质 options；
- 不生成“其他”选项，Host 总会补；
- 推荐项必须说明依据，不能伪装成默认；
- 不用 Ask 替代 Approval；
- 不写 1–3 题或最多 4 个 options 的限制；
- 不让模型 author UI-only Review/Notes controls。

这是一段最短 guidance，不建立 Ask planning framework 或复杂分类器。

## 11. Fork 形状：保存成熟产品，切掉重复 owner

### 11.1 Fork 原则

- 保留 Git ancestry、上游 package 目录、LICENSE、README/CHANGELOG、作者 tests；
- fork package identity 改为 `@omnimind/om-ask`，产品 profile 清晰；
- 尽量保留上游 domain model、validation、state transition 与 tests；
- 增加 headless Host entry，不让 TUI component 成为产品 UI owner；
- 上游源码保留、发行物导出、运行时注册三件事分别审计；
- patch 数量不是越少越好，但每个 patch 必须对应一个稳定 owner 边界且可独立删除。

### 11.2 明确保留

- 多问题 state model 与 navigation behavior；
- single / multiple selection；
- freeform 与 notes 的成熟状态处理；
- recommendation 与 preview domain fields；
- Review/edit/submit 状态机；
- validation 与 serialization 测试；
- 响应式行为测试思想；
- upstream lineage 与 attribution。

### 11.3 OmniMind profile 明确不注册/不执行

- Pi TUI custom Ask UI；
- `/answer`、`/answer:again`、`/ask:replay`、`/ask-settings`；
- TUI keyboard shortcuts/widgets；
- package settings/config store 与 migrations；
- skill/prompt payload entries；
- notifications；
- remote bus / remote UI；
- auto recovery 与 replay control plane；
- active-set reconciler、prewarm timer 或 process-global current request。

这些源码可以为 ancestry 暂时保留，但 shipped exports 与 runtime registration 必须证明关闭。入口隐藏不等于没有 listener/timer/writer。

### 11.4 Patch inventory

| Patch | 责任 | 目标 | 删除条件 |
| --- | --- | --- | --- |
| P1 Identity & product profile | package / composition | fork identity、bundled-only、禁用 TUI/commands/config/remote/recovery | upstream 提供官方 headless product profile |
| P2 Canonical contract | contracts / fork validation | 正交 kind/cardinality/presentation、无数量上限、sentinel、lossless result | upstream 与 canonical contract 等价且无降级 |
| P3 Structured Host seam | Pi runtime bridge | rich request/resolution/signal，不经 primitive fallback 丢字段 | Pi 提供 portable structured form API |
| P4 Workbench projection | canonical UI owner | 多题、Preview、Notes、Review、a11y/i18n/overflow | 不因 upstream UI 更新删除；它是 OmniMind owner |
| P5 Lifecycle correctness | Extension + narrow scheduler seam | sequential、sibling barrier、terminal/late/noUI/restart | Pi exact runtime 原生保证并有证据 |
| P6 Result/context honesty | Extension / adapter | structured result、selected-only safe rewrite | upstream 提供同等可验证行为 |
| P7 Provenance & reload | composition / event bridge | winner/sourceInfo、instance fencing、reload/branch/resume cleanup | Pi 暴露稳定 product provenance primitive |

P1–P7 是维护预算的边界。新增 P8 不是禁止，但必须解释为何既有 owner 无法承担、会新增什么长期责任、是否应重新选择母体，并重新经过维护者裁决。

## 12. 当前代码落点与目标调用链

### 12.1 现有相关路径

| 路径 | 当前责任 | 目标改动性质 |
| --- | --- | --- |
| `packages/contracts/src/providerRuntime.ts` | canonical User Input request/question | 演进 richer contract，保留跨 Provider 兼容迁移 |
| `apps/web/src/components/chat/ComposerPendingUserInputPanel.tsx` | 现有 Composer Question UI | 在同一 owner 内升级，不创建 Ask 私有 panel |
| `apps/server/src/provider/Layers/PiAdapter.ts` | Pi Session 与 primitive `ctx.ui` bridge | 保持薄；增加 structured projection seam，不拥有 tool definition |
| `apps/server/src/provider/omnimindSessionExtensions.ts` | OmniMind Session Extension composition | 显式装配 `@omnimind/om-ask` |
| `apps/server/src/provider/omnimindTaskListExtension.ts` | Todo provenance/registration precedent | 只借模式，不把 Ask 塞入 Todo module |
| Product State / pending interaction paths | request/resolution/stale truth | 扩展既有状态，不建第二 store |

### 12.2 目标链路

```text
omnimindSessionExtensions
  → named bundled @omnimind/om-ask factory
  → Pi Registry winner/sourceInfo
  → ask_user.execute(request, signal)
  → canonical user-input.requested
  → Product pending interaction
  → ComposerPendingUserInputPanel
  → canonical resolution(requestId, status, answers) + internal fence-token check
  → trusted Extension instance settlement
  → truthful tool result
  → canonical user-input.resolved
  → model continuation
```

PiAdapter 只接线与投影，不同时拥有 schema、prompt、lifecycle、UI 和 state。

## 13. 实施顺序：先闭合正确性，再声明体验

### Phase A — exact fork 与作者基线

- 建立 fork、保留 ancestry/license；
- 固定 upstream source/artifact；
- 运行 supi exact source 的 9 个作者 test files，并把 geoqiao 27 个 source test files 中与 adopted UX 相关的行为转为 donor regression baseline；
- 记录 source retained / shipped bytes / runtime activated 三张表；
- 创建 P1–P7 patch ledger（不是第二状态系统，只是 fork 维护清单）。

### Phase B — canonical contract 与 structured seam

- 收口 request/question/option/answer/status；
- 添加 stable IDs、sentinel invariant、lossless rules；
- 同步所有 Provider producer/consumer 与 compatibility migration；
- 加 structured Pi Host bridge、signal 与 terminal settlement；
- primitive third-party UI bridge 保持原职责。

### Phase C — shared UI 完整交付

- 移除单选自动跳转；
- 完成多题、自由输入共存、notes、preview、recommendation、review；
- 完成 Cancel、draft、background attention；
- 同一 diff 完成中英文、a11y、IME、overflow、reduced motion。

### Phase D — lifecycle 与 provenance

- sequential + exact same-turn barrier；
- abort/cancel/timeout/late/restart；
- collision/sourceInfo/instance fencing；
- reload/branch/resume/Session replacement；
- selected-only context behavior。

### Phase E —真实与 packaged 证据

- focused fixture；
- real Pi Session；
- MiMo / DeepSeek live；
- cross-provider regression；
- exact pushed SHA rebuild/install；
- fresh isolated profile complete journey；
- 才能更新 production adoption/status owner。

## 14. Required proof：必须能推翻自己

### 14.1 Source 与供应链

- exact source、artifact integrity、SLSA provenance、LICENSE 一致；
- fork 保留 ancestry 与 attribution；
- direct/peer dependency diff 经审计；
- author tests 未被无解释删除或改绿；
- shipped artifact 不意外包含 TUI demo/config/remote entry；
- runtime 实际只注册 product profile 的 tool/listeners。

### 14.2 Contract

- single / multiple / text / mixed multi-question roundtrip；
- preview + multiple、recommended + notes 等正交组合；
- sentinel 自动补、模型重复 sentinel 处理；
- single freeform replacement；
- multiple presets + freeform coexistence；
- selected preset + question/option supplements；
- exact whitespace/newline/Unicode preservation；
- stable option IDs 与 duplicate label；
- required/optional/skip；
- unknown field、duplicate ID、malformed payload；
- abnormal byte/depth/Markdown guard 明确失败、不截断。

### 14.3 UI / UX

- 1 题、3 题、10+ 合理题；2、10、50+ 合理 options 的 stress，不存在产品 cap；
- 480px、典型 desktop、超宽、200% zoom；
- long Chinese、long English、unbroken token、code/Markdown；
- tabs/progress/previous/next/review/edit 全程 draft 不丢；
- 单击 single 不自动提交；
- Cancel 在所有阶段可见；
- selected option deselect note 不静默丢失；
- keyboard-only、VoiceOver、IME、reduced motion；
- zh-CN/en catalog parity 与实际值；
- sanitized Preview 无 active content。

### 14.4 生命周期

- sequential registration；
- Ask + sibling read tool；
- Ask + sibling side-effect tool，回答前后都验证；
- submit/cancel/abort/timeout each once；
- late submit、double submit、duplicate IPC；
- UI unavailable before registration / mid-call；
- process restart stale，不伪造 Tool result；
- reload、branch、resume、Session replacement；
- two Threads simultaneous asks，不互相清理；
- same-name third-party winner 与 product winner；
- forged/replayed resolution fail closed。

### 14.5 模型与 Provider

- DeepSeek 与 MiMo 真实调用 `ask_user`；
- 模型不 author sentinel，若 author 也不会破坏 UI；
- 简单任务不会因 initial-active 被强制问；
- 真正含糊任务会先问再行动；
- 不用 Ask 替代 Approval；
- batch questions 合理，不受 1–3 人为限制；
- tool schema/prompt token 成本记录，不以单次偶然行为泛化。

### 14.6 Cross-provider regression

Canonical UI 升级必须覆盖：

- Codex native User Input；
- Claude native User Input；
- OpenCode、Grok、ACP 当前 supported journey；
- primitive Pi third-party Extension UI；
- Provider 不支持 richer fields 时的明确 capability/adapter 行为，不能 silent field loss。

### 14.7 Packaged App

- 从 exact pushed SHA 构建；
- 停止所有既有 OmniMind 实例；
- 使用任务专用 `userData`、home 与 Provider private home；
- 从主进程、Helper、bundled Server 运行证据证明隔离；
- launch → new Thread → Agent asks → user previews/answers/reviews/submits → model continues；
- background Thread attention；
- close/reopen stale/re-ask；
- App 正常关闭与残留进程清理；
- 不读取、迁移或改写真实 `.pi` / `.omnimind`。

## 15. 管理与长期维护

### 15.1 一个 runtime 母体、有界 donors、一个产品 owner

维护者只跟踪一个 runtime lineage：supi。geoqiao 是首要 UX/test donor，pi9、pi-ask-user 和 tian 只是更窄的 correctness/test donors；它们都不形成第二 runtime、第二 release cadence 或第二 UI。任何 donor copy 都要标 exact source、许可证、用途与回归 test，且只有已被 OmniMind 实际吸收的 donor 才进入日常更新队列。

### 15.2 上游更新的管理目标

每次 intake 不是问“能不能升级版本”，而是回答：

1. 上游新增了哪些用户结果？
2. 修复了哪些生命周期冰山？
3. 是否触碰 P1–P7？
4. 是否重新引入被关闭的 TUI/config/remote owner？
5. 哪些 downstream patch 可以删除？
6. 作者 tests 是否更强、是否出现删除或语义漂移？
7. source、shipped bytes、runtime activated 是否仍一致？

具体操作唯一见 [`pi-ask-user-intake.md`](pi-ask-user-intake.md)。

### 15.3 Patch budget 与复杂度红线

允许大改，但必须减少长期重复 owner。以下情况触发 stop-loss review：

- patch 不能再映射到 P1–P7；
- fork 开始复制 Pi scheduler、Product State 或 Workbench；
- 为兼容 upstream TUI 保留第二交互生命周期；
- selected-only rewrite 变成通用 history rewriting framework；
- active-set 管理扩张成全局 Session Tool Manager；
- 新 config/database/migration 只为 Ask 存在；
- fork 长期无法运行作者 tests；
- upstream 结构变化使保留成熟母体的成本超过重新选型。

### 15.4 维护者 dashboard

每个 adopted revision 至少能快速回答：

| 管理问题 | 必需证据 |
| --- | --- |
| 当前运行哪个 exact source？ | fork commit + upstream base + artifact integrity |
| 相对上游改了什么？ | P1–P7 patch map |
| 哪些上游能力保留但未发行？ | source/shipped/activated matrix |
| 哪些 UI 是 OmniMind 自己的？ | canonical contract + Workbench owner links |
| 同名冲突会怎样？ | winner/provenance tests |
| 重启会怎样？ | stale journey evidence |
| 哪些 Provider 真验过？ | 脱敏 live evidence |
| 当前安装 App 是否包含？ | exact pushed SHA packaged evidence |
| 下一次升级从哪里开始？ | `pi-ask-user-intake.md` baseline block |

### 15.5 回滚

Ask 的回滚必须简单：

- 从 OmniMind Agent composition 移除一个 product Extension factory；
- 不删除 canonical User Input UI，因为其他 Engine 仍消费；
- 不迁移数据库，因为 Ask 不拥有独立持久 store；
- pending product interactions 按 unavailable/stale 结束；
- fork source 可保留供修复，运行时注册必须可证明为零；
- 回滚不影响 Todo、Host tools、Approval 或其他 Provider native questions。

### 15.6 Re-open triggers

只在以下事实变化时重审核心决策：

- supi upstream 停止维护、许可证/ownership 改变或出现供应链事件；
- Pi Core 提供成熟、portable、structured Ask UI 与 lifecycle，足以删除多个 patch；
- 另一个候选在真实 journey 上明显超过 supi + adopted donors，且迁移成本有证据；
- canonical User Input contract 或 Workbench owner 发生根本变化；
- bundled Pi 的 tool batch、sourceInfo、reload/Session 语义变化；
- 用户明确改变“成熟、无上限、自由表达、一级公民”的产品 taste；
- patch inventory 超出 P1–P7，fork 已不再 bounded。

## 16. 犀利的反证与常见错误

### 16.1 “OmniMind 已经有 UI，所以只包一个 tool 就行”——错

现有 UI 是最小共享投影，不包含成熟 Ask 的完整行为；只包 tool 会导致 schema 接受字段、UI 丢字段、结果再丢一次，最终是公开假能力。

### 16.2 “直接装 supi 或 geoqiao，最快”——错

原装 supi 会把 TUI、`supi-core` prompt/config/session helpers、recommendation 预选、trim 和人为 cap 带入产品；原装 geoqiao 会把 TUI、commands、settings、remote、recovery 与 RPC downgrade 一起带进来，并缺失 sequential。两者都会立即产生双 UI/双 lifecycle，只有有界 fork 才能成为一级产品。

### 16.3 “pi9 更干净，从它扩展”——错

这把已经成熟的多题/Review/Notes/Preview 再开发一遍。所谓代码洁净只是把用户价值和生命周期成本藏到未来。

### 16.4 “限制 4 题更好用”——错

好用来自模型问得克制、UI 能组织复杂内容和异常 payload 有保护，不来自公共 schema 人为阉割。合理的 5 个选项不该因为实现偷懒被拒绝。

### 16.5 “有自由文本框就等于有其他选项”——错

如果单选点击立即提交、多选不能与 freeform 共存、用户不知道输入框会替代还是补充，UI 事实上仍然逼用户选预设。sentinel 与结果语义必须显式。

### 16.6 “重启后把答案发成 user message 就算恢复”——错

原 Tool Promise 已消失，新 user message 改变了模型协议与时序，还可能让旧 siblings 执行。必须标 stale，由新 turn 重新问。

### 16.7 “tool 叫 ask_user，所以就是产品 Ask”——错

同名第三方 Extension 可能成为 Pi winner。没有 sourceInfo/instance provenance，就可能把第三方结果投影成 Product Question，属于 authority 混淆。

### 16.8 “sequential 字段已经解决并发”——未经证明

必须测试 exact Pi 对 parallel siblings 的实际 dispatch。产品要求是同 turn 副作用屏障，不是 schema 上出现一个单词。

### 16.9 “Preview 是展示字段，丢了也不影响答案”——错

用户可能正是基于 Preview 做决定；schema 接受但 RPC/UI 丢弃会改变决策依据。不能 silent downgrade。

### 16.10 “Fork 很重，所以复制几个文件更省”——错

复制会丢 ancestry、作者 tests、未来更新路径和成熟状态机的关联。这个 package 的价值正是整体行为冰山；应保留母体并有界切 owner，而不是散抄。

## 17. 零记忆机器摘要

```yaml
product: OmniMind Ask User
status: source-matched_decision-complete_double-checked_not-implemented
importance: first-class_like-todo
runtime_scope:
  provider: omnimind
  surfaces: [agent, chat]
  registration: bundled_pi_native_session_extension
  activation: initial-active
ui_scope:
  owner: canonical_workbench_composer_question
  shared_by: [codex, claude, opencode, grok, acp, pi, future_engines]
  private_extension_ui: forbidden
fork:
  package: "@omnimind/om-ask"
  tool: ask_user
  upstream_package: "@mrclrchtr/supi-ask-user@5.0.0"
  upstream_commit: ce8af5f57304ad114319aa75c00920f029ceb8e7
  license: MIT
  strategy: fork_narrowly_preserve_ancestry_and_tests
donors:
  - package: "@geoqiao/pi-ask@1.3.0"
    commit: 26496c809870e349429bc2cae72d61b46d0e2bc3
    use: ux_state_transitions_sentinel_freeform_preview_notes_review_tests_only
  - package: "@pi9/ask@0.4.2"
    commit: 9cf2ee3df248ebc5a4dc5b535aef21d377115bc9
    use: lifecycle_and_selected-only_context_mechanisms_only
  - package: "pi-ask-user@0.14.0"
    commit: 2de7e145227f7a527e995e323a50e7ee9bf88b0e
    use: signal_timeout_provider-schema_safety_only
  - package: "pi-tian-ask-user@1.0.0"
    commit: 6e2b293d722fdce6803b33432919e3216cd6a845
    use: duplicate-sentinel_validation_tests_only
non_negotiables:
  - no_arbitrary_question_or_option_caps
  - host_synthesized_final_other_sentinel_for_every_choice
  - single_freeform_replaces_preset
  - multi_freeform_coexists_with_presets
  - selected_options_allow_notes
  - user_text_lossless
  - preview_recommendation_notes_review_end_to_end
  - ask_is_not_approval
  - sequential_plus_same-turn_side-effect_barrier
  - abort_cancel_timeout_late-answer_fencing
  - exact_tool_provenance
  - no_ui_fail_closed
  - restart_marks_stale_never_fakes_vanished_tool_promise
patches: [P1_identity_profile, P2_contract, P3_structured_host_seam, P4_workbench_ui, P5_lifecycle, P6_result_context, P7_provenance_reload]
forbidden_owners:
  - agentgateway_ask_tool
  - extension_private_ui
  - second_pending_store
  - ask_settings_or_config_database
  - tui_commands_shortcuts_notifications_remote_recovery
release_gate:
  - author_and_fork_tests
  - cross-provider_regression
  - mimo_and_deepseek_live
  - exact_pushed_sha_packaged_fresh_profile_journey
update_manual: research/pi-ask-user-intake.md
```
