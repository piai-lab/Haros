# OmniMind Agent 能力表面：基于现有产品的前端执行规格

> 证据日期：2026-08-12
>
> 文档角色：把 Agent Runtime、Bundled Capability Pack 与 Engine-native capability 映射到 **当前 OmniMind 已有界面**。新会话应先用本文判断“是否需要新增 UI、出现在哪里、何时退场”，再进入组件实现。
>
> 权威边界：[`architecture/workbench.md`](../architecture/workbench.md) 仍是完整 UI owner；runtime、session、capability 与权限事实属于 [`architecture/execution.md`](../architecture/execution.md)；Product Thread、Run、Queue 与恢复事实属于 [`architecture/product-state.md`](../architecture/product-state.md)。本文是可执行研究规格，不创建第二份状态真相，也不改变施工准入。

## 0. 裁决

上一版“能力表面”方向作废。错误不在颜色、图标或卡片细节，而在产品模型：它先假设 Goal、Agent 团队、动态工作流、知识库、记忆、会话恢复与 Computer Use 都需要独立入口和展示，再把这些入口装进一个虚构的能力控制台。那会让 OmniMind 比实际能力更复杂，让自动能力变成用户操作，并复制现有 Composer、Timeline、Activity、Workbench、Files、Diff、Browser 与 Settings 的责任。

正确方向是：

```text
当前 OmniMind 外壳保持稳定
  + 自然语言触发大多数能力
  + 只在运行时投影真实、可行动的状态
  + 阻塞时复用现有介入面
  + 完成后让过程退场、结果留在现有文件与活动表面
```

**能力进入执行，不进入导航。** 普通用户不需要先认识能力名、配置工作流或组建团队，才可以完成任务。开箱即用的含义是默认能力已经可用，而不是默认把所有能力展示出来。

[交互原型](prototypes/omnimind-agent-capability-surface.html) 已在 2026-08-12 的 host-reuse 复审后收缩为 **Workflow right-dock focused storyboard**。它不再重画 Todo、子智能体、审批、Browser、Device、Files/Diff、Memory 或恢复界面；这些责任已有宿主，重复画一套会误导新会话建立第二组件树。原型只验证当前唯一有新增视觉设计价值的表面：现有 `WorkflowRunCard` 打开现有 RightDock 后的只读阶段地图。评审工具不进入产品。

## 1. 当前产品事实：先承认宿主，再谈新增

以下是 2026-08-12 当前代码已经存在的真实宿主。实现前必须重新核对 exact HEAD，不能把本文当静态截图规范。

| 用户责任 | 当前宿主 | 关键代码 | 约束 |
|---|---|---|---|
| 输入任务、选择 Engine/model、附加上下文 | 主 Composer | `apps/web/src/components/ChatView.tsx` | 不新增第二 Composer、能力工具栏或前置配置向导 |
| 当前步骤/Todo | Composer 上方 task list | `ComposerActiveTaskListCard.tsx`、`ActiveTaskListCard.tsx` | 不升级成 Goal 数据库或项目规划器 |
| 子 Agent | Composer 上方 subagent strip + child Thread | `ComposerSubagentStrip.tsx` | 成员、状态、后台、停止、打开 Thread 已有宿主 |
| Claude Code 原生动态工作流 | Composer 上方 workflow card | `WorkflowRunCard.tsx` | 只显示真实 Claude workflow，不伪装成跨 Engine 通用 DAG |
| 文件变化 | Composer live changes + Files/Diff | `ComposerLiveChangesHeader`、现有 Files/Diff | Knowledge、Review 等结果继续回到文件世界 |
| 权限请求 | Composer 前的 detached approval card | `ComposerPendingApprovalPanel.tsx` | 不另建通知中心、全屏 modal 或 capability-specific approval |
| 用户问题 | Composer 前的 pending input panel | `ComposerPendingUserInputPanel` | 只有确实阻塞时出现 |
| 工具与过程详情 | Timeline/Activity detail | `TimelineWorkEntryRow.tsx`、`AgentActivityDetailView.tsx` | 默认不暴露 raw log、tool schema 或内部状态机 |
| 环境、说明、便笺、Recap、编辑器 | 右上 Workbench 浮层 | `chat/environment/EnvironmentPanel.tsx` | 当前是约 288px 的浮层卡，不是全高 inspector |
| Browser/Device/Terminal/Diff 等工作面 | 现有 right dock | `architecture/workbench.md` 路由的现有 pane | Computer Use 不创建新浏览器或设备面板 |
| Skills/Plugins | 既有 Library/Settings | `PluginLibrary.tsx`、`SkillsSettingsPanel.tsx` | 同一资产跨入口保持同名、同图标、同来源 |
| 稳定偏好与诊断 | Settings | 现有设置路由 | 日常运行不应要求用户先来设置页 |

### 1.1 Host-reuse 审计：哪些不许再画，哪个才是缺口

静态 HTML 曾把“解释能力”误写成“为能力重新制作 UI”。新会话必须先执行下面的 disposition；不能因为原型更容易改就绕过 production host：

| 语义/旧原型场景 | 当前真实 owner | Disposition | 允许新增的最小差异 |
|---|---|---|---|
| 空闲 shell、header、Composer | `ChatView.tsx` 及当前 route/shell | **Direct reuse；原型不重画** | 无 |
| Todo / 当前步骤 | `ComposerActiveTaskListCard.tsx`、`ActiveTaskListCard.tsx` | **Direct reuse；原型不重画** | 只允许在现有 compact mode 内修文案、密度与 disclosure |
| 子智能体 | `ComposerSubagentStrip.tsx`、child Thread、现有 right dock/sidechat | **Direct reuse；原型不重画** | 在 `subagentPresentation.ts` 现有 identity owner 上增加稳定低密度 glyph；替换单一 leading visual，不叠加第二图标 |
| Workflow 摘要、pause/stop/resume | `WorkflowRunCard.tsx` | **Direct reuse；原型不重画** | compact header 点击打开详情；不复制 action/state |
| 审批 | `ComposerPendingApprovalPanel.tsx` | **Direct reuse；原型删除该场景** | 只修 runtime-mode truth、双语和真实 task scope 文案 |
| Computer Use | `BrowserPanel.tsx`、`DevicePanel.tsx`、现有 Timeline/Artifact | **Direct reuse；原型删除该场景** | 无第二 Browser/Device surface |
| Knowledge 结果 | Explorer、File、Diff、Changes、Activity detail | **Direct reuse；原型删除专用知识面板** | 仅补 provenance/stale/conflict 的缺失事实 |
| 自动 Memory | 当前尚无 durable runtime owner；未来落在 existing Environment row/section + Activity detail | **Backend truth first；不得先画 fixture UI** | runtime owner 闭合后只组合现有 section/row primitive |
| Resume / recovery | Product Thread + Engine native session + Timeline/Activity primitive | **通常无 UI；原型删除正常恢复场景** | degraded/ambiguous 时组合现有介入 primitive，不建恢复中心 |
| Workflow 空间详情 | RightDock 尚无 `workflow` pane；`WorkflowRunState` 已有 phase/agent/status/usage | **唯一新 UI** | 在现有 RightDock 增加 bounded pane projection；不新增 workflow store/runtime |

这张表的目的不是冻结具体 DOM，而是阻止责任重复。production 修改必须从上述 owner 原位发生；研究 HTML 不再被当成组件 donor。

### 1.2 Composer 的真实堆叠顺序

当前 `ChatView.tsx` 的顺序是：

```text
ComposerLiveChangesHeader
ComposerActiveTaskListCard
WorkflowRunCard
ComposerSubagentStrip
ComposerQueuedHeader
pending approval / pending user input（detached card）
Composer input shell
```

这是一组共享视觉语法但各自由真实 owner 投影的组件，不是一个新的“统一 Run”。未来可以去重标题、压缩重复元信息和优化 attached chrome；不能为了视觉统一把 Task、Workflow、Subagent、Approval 合并成一份前端状态。

### 1.3 当前 Recap 不是耐久记忆

`apps/web/src/lib/threadRecap.ts` 与 `apps/web/src/hooks/useThreadRecap.ts` 已有低频、空闲时生成的 Thread Recap，并在 Workbench 的 `EnvironmentRecapSection` 展示。它的当前事实是：

- 只在相关 Environment 表面启用时准备；
- 只总结有限的最近消息和状态；
- 浏览器 `localStorage` 有界缓存；
- 用于当前 Thread 的 UI recap；
- **没有被证明会作为未来 Agent 的 durable memory 自动召回。**

因此不能把 Recap 改名为“记忆”就宣称 Memory 已完成，也不能直接扩张 localStorage 成第二 Memory owner。

## 2. 产品显示法则

### 2.1 四种出现级别

每项能力只能选择满足用户任务所需的最低级别：

| 级别 | 何时使用 | 表面 |
|---|---|---|
| 无 UI | 能力自动发生且没有可行动信息 | 不显示；只保留可审计内部事件 |
| 低噪声 receipt | 自动行为产生了用户此刻确实需要知道的结果或可逆动作 | Timeline/Activity 一行，可查看、撤销或定位；日常后台维护不占 Timeline |
| 运行投影 | 用户需要知道正在做什么或可停止 | 复用现有 Composer stack / Timeline / right dock |
| 阻塞介入 | 登录/2FA/系统授权必须由人完成，或任务意图真实分叉且 Agent 无法继续 | 复用 approval、question 或 Diff review |

禁止把“后端有一个 part”自动翻译成“前端有一个 card”。如果一个能力在绝大多数 turn 都没有可行动信息，它不应常驻。

### 2.2 默认生命周期

```text
available + dormant  → 不显示
invoked              → 只显示真实活动
needs user action    → 唯一高优先介入面
settled              → 运行面退场，留下结果/receipt
failed/partial       → 保留影响范围和恢复动作
```

不展示 packaged、registered、context-loaded、cache breakpoint 等内部生命周期。`native / projected / unavailable / conflict` 只在用户要选择资产、诊断不可用或检查来源时出现。

### 2.3 一个时刻只突出一个主动作

视觉优先级固定为：

```text
登录、系统授权或用户问题
  > 会改变当前结果且无法自动裁决的冲突
    > 失败后的恢复动作
      > 正在运行
        > 自动行为 receipt
```

同一事件不能同时用 toast、banner、modal 和 Timeline row 四次提醒。自然成功不 Toast；自动记忆也不 Toast 风暴。

### 2.4 Runtime mode 与权限请求必须一致

Composer 已经显示当前 runtime mode，权限卡不能与它自相矛盾：

| 当前模式 | Provider command/file approval | 允许出现的其他权限 |
|---|---|---|
| 完全访问（`full-access`） | 不显示；Codex 是 `approvalPolicy: never` / `danger-full-access`，Claude Code 是 `bypassPermissions` | Browser、Device、下载和 Gateway 普通 mutation 同样不显示 approval；OAuth/2FA/系统原生权限按 human-presence 呈现 |
| 自动批准（`auto`） | 仅在 exact Engine/model 有真实 reviewer 时显示 | Host 也只有在存在可验证 reviewer 时参与；否则该 Engine+Host 组合不提供此项 |
| 需要时询问（`approval-required`） | 显示 Engine 实际发出的 request | Host 也必须有可完成 request/response bridge；没有 bridge 时该模式不可选 |

因此，同一个 Composer 若显示“完全访问”，就不能再展示普通 `bun test`、文件读写、网络请求、网页点击、设备输入或任务内下载的 approval。登录、2FA、macOS/Windows 原生权限、物理设备到场等不是“再批准一个工具”，应准确写成“需要你完成登录/系统授权”。当前 Pi-family 没有 approval request path 时，只显示它能真实执行的 mode，不能给用户一个无效选项。

### 2.5 Codex 参考图真正值得吸收的结构

2026-08-12 维护者提供的四张 Codex app 截图不是新母版，也不授权照抄视觉资产；它们揭示了四个可迁移的产品结构：

| 截图事实 | 深层作用 | OmniMind target | 不应误读为 |
|---|---|---|---|
| Environment card 把 changes、local/git、子智能体和 sources 分 section 压在约 288px 卡中 | 当前任务的“目录/索引”，不是详情面 | 继续扩展现有 `EnvironmentPanel` row/section；Workflow 也只占一行摘要 | 把所有能力塞进新 dashboard |
| “子智能体”右侧详情按运行中/完成分组，每个 Agent 有不同彩色小纹样 | identity 是跨表面的视觉 join key | 集合 tab 用 `agent-duo`，实例用 deterministic identity glyph；同一 glyph 贯穿 Environment、right dock、Timeline、child Thread | 为每种 role 画一个能力 icon；用一个机器人图标复制所有行 |
| Timeline 用带 identity glyph 的 Agent chip 串起“谁读取、谁更新、谁完成” | 低成本表达 causality/provenance | 只有真正需要 attribution 的 activity 才出现 chip；名称与 glyph 同时保留 | 给每条工具事件加彩色 badge 制造噪声 |
| Todo 平时只有 `第 x/n 步` 一行，点击后向上展开完整步骤 | Composer 只保留 glanceable current truth | 收敛现有 `ActiveTaskListCard` 的 compact mode；详情用 anchored popover/disclosure，状态仍来自原 task owner | 新建 Todo 页面、Goal card 或第二任务 store |

由此形成统一空间语法：

```text
Environment = 当前任务目录
Composer stack = 正在运行且可干预的一句话
Timeline = 发生过什么、由谁完成
RightDock = 用户点开的空间详情
```

Workflow proposal 正好遵循这套语法：Environment/Composer 显示一句；right dock 才显示动态图。Memory/Knowledge 则通常没有运行中可干预状态，不能因为 Workflow 适合 right dock 就连带升级成常驻 pane。

## 3. 能力逐项裁决

“能力”不是固定七项，也不是越多越强。以后新增能力也必须按相同问题判断：用户是否需要主动选择、运行时是否可干预、结果属于哪个现有 owner、失败如何恢复。

| 能力/机制 | 默认触发 | 平时界面 | 运行中 | 完成/恢复 | 明确禁止 |
|---|---|---|---|---|---|
| 目标 | 用户自然语言中的任务目标；必要时 runtime continuation policy | 无独立入口、无常驻 Goal 卡 | 复用 task list 与当前对话；仅当目标状态本身可行动时显示一句 | 进入任务总结/Activity | Goal 页面、目标队列、Goal picker、第二 store |
| Todo/计划 | Agent 为当前任务拆步 | 已有 task list | Composer 默认只显示一行真实进度；点击弹出完整步骤 | 完成后折叠 | 为了“目标”再复制一份步骤或 Todo pane |
| Agent 团队 | Agent 判断并行有收益，或用户要求分工 | 无 team builder、无默认成员配置 | `ComposerSubagentStrip` + Environment 身份纹样簇；点击打开 child/right dock | Timeline 汇总结果，身份纹样贯穿引用 | 独立团队仪表盘、第二 Run/permission owner、所有 Agent 共用同一图标 |
| 动态工作流 | Engine 确实创建结构化 workflow | 无通用 workflow 入口 | Environment/Composer 一行摘要；点击 right dock 的只读动态流程图 | 原生 resume/结果 receipt | 把普通 tool sequence 画成 DAG；跨 Engine 伪统一；V1 workflow editor |
| 自动记忆 | settled 后有高价值、可复用的项目事实/偏好/约束 | 无 picker、无每次确认、无常驻卡 | 通常无 UI；只有实质影响回答或发生冲突时显示来源 | 在 Workbench existing Environment card 中查看、纠正、遗忘、关闭 | 保存所有聊天、逐条 receipt、复制 native Memory、第二数据库 |
| 知识库 | 普通任务实际使用了值得长期复用的文件、链接或 workspace evidence | 无知识仪表盘、无“更新知识”按钮 | 当前任务照常执行；settled 后自动有界维护 | Sources/Markdown/index/Diff 回到 Files/Workbench；日常更新安静 | ingest 每个访问网页/全部历史；首次写入审批；把 derived page 当事实源 |
| 会话恢复 | 用户重开 Product Thread；native Engine 能真实 resume | 正常恢复不弹问句 | 安静继续；只有 degraded/ambiguous 才出现恢复条 | 一行 native resume 或 artifact handoff receipt | 每次“继续上次任务？”modal；跨 Engine 冒充同一 latent state |
| Computer Use | 任务自然触发，或用户明确要求浏览器/设备 | 无 capability card | 现有 Browser/Device pane；过程折叠进 Activity 并继承 Thread runtime mode | 只有截图、文件、下载或任务结果进入现有 artifact/Timeline | 新 Computer Use 页面、重复浏览器、Host 二次 permission layer |
| Review/Verification | 用户请求、提交前检查、真实 policy 触发 | Files/Diff/PR 的已有入口 | Timeline、Diff、checks | findings 与可行动结果 | “Review Agent”常驻能力卡 |
| Skills/Plugins | 用户或 Agent 选择已发现资产 | Library/Settings 统一 | 仅调用时显示真实资产名/来源 | 普通 receipt | 因 Engine 不同而改名、换图标或复制 catalog |

### 3.1 Goal 为什么几乎不需要新 UI

用户说“把这个功能做完并验证”时，目标已经存在于任务语言。Agent 可用 continuation/complete/blocked/wait 语义保证执行，但这不等于用户需要先创建一个叫“目标”的实体。

只有三类情况值得额外显示：

1. 当前 task list 无法表达的目标变化，需要用户确认范围；
2. 目标被阻塞且必须由用户解决；
3. 目标完成/终止，需要准确总结未完成部分。

其余情况复用 Task list、Timeline 和最终回答。UI 不应让实现机制反向教育用户。

### 3.2 Agent 团队为什么不需要 team builder

小白用户最自然的操作是“帮我并行查一下”或直接提出一个复杂任务。OmniMind/Engine 判断是否委派，并把真实 child 投影到现有 subagent strip。用户只需要：

- 看见有几个 Agent 在工作；
- 区分角色/模型/状态；
- 停止、转后台或打开某个 child Thread；
- 知道最终哪些结论来自哪个 child。

“预先挑选队员、编排组织结构、命名军团”属于高级 workflow authoring，不是默认 Agent 团队体验。

但“不做 team builder”不等于把所有 child 压成同一个机器人图标。Codex 的成熟点在于把**集合语义**和**实例身份**分开：标题/tab 使用统一“子智能体”图标；每个 child 使用稳定、不同、低密度的彩色几何纹样。这个纹样在 Environment 小簇、子智能体列表、Timeline chip、来源引用和 child Thread 间保持连续，因此用户无需反复读长名称也能追踪“谁做了什么”。

OmniMind 已有 `subagentPresentation.ts` 的确定性 `accentColor`，正确实现是为同一 presentation 增加 `glyphVariant`/identity seed，并由 canonical child/thread id 保持稳定；不是随机 emoji，不是按 role 固定一个头像，也不是另建 avatar registry。`agent-duo` 继续只表示集合。

### 3.3 动态工作流必须保留 Engine provenance

当前 `WorkflowRunCard.tsx` 明确服务 Claude dynamic workflows。它已有 phase、agent、model、effort、usage、暂停、停止、resume 与详情。只有当 exact Engine 回报这个真实对象时才显示。当前卡片本身已经提供 compact header；正确路径是让这个既有 header 打开空间详情，不是再造一张“更漂亮的 workflow card”。

普通 Pi loop、Codex subagent 或一串 tool calls 不应被前端包装成同一 workflow。未来其他 Engine 有正式结构化 run 时，可以共享视觉 token 与交互原则，但 adapter 仍分别映射真实字段；不先发明一个最小公倍数 Workflow state。

Workflow 的正确空间关系是：

```text
Environment / Composer 一行摘要
              ↓ click
existing RightDock → workflow pane → 当前真实 phase order / Agent membership / status / usage / provenance
```

right dock 只是同一 `WorkflowRunState` 的只读可视化投影。当前真实类型只有有序 `phases`、每个 Agent 的 phase membership、状态、usage、model/effort、child Thread 与最近工具信息；**没有任意 dependency edge**。因此 V1 只能画阶段顺序和成员归属，不能把 root、fan-out、fan-in、汇总节点或 Agent 间依赖从文案/时间顺序猜出来。V1 不做拖拽编排、画布保存、模板市场或跨 Engine workflow DSL。

### 3.4 Renderer intake：先匹配真实数据，再决定是否需要图引擎

“当前仓库没有直接依赖”不等于“互联网没有成熟组件”。网络上已有成熟 workflow/graph renderer；但“有组件”也不等于“当前数据必须套进图引擎”。V1 分两条不并行的准入路径：

1. **当前 phase-only truth**：使用现有 RightDock、Button、Disclosure、token、Agent identity glyph 组合一个轻量 `WorkflowPhaseMap`。布局是有序 phase lanes，Agent 由 containment 表达 membership；不画跨 Agent edge。这是产品特有 composition，不是自研 graph engine，也不引入第二 Zustand/runtime。
2. **未来 explicit-graph truth**：只有 exact Engine/adapter 上报稳定 node ids 与 dependency edges 时，才进入成熟 graph renderer intake；React Flow 是第一 challenger，X6 只在真实路由/嵌套/规模反例下升级。

候选表因此不是当前 V1 的 dependency list，而是 explicit-graph 进入门后的选择顺序：

| 候选 | 网络一手证据 | 与 OmniMind 的匹配 | 当前裁决 |
|---|---|---|---|
| React Flow 12 / `@xyflow/react` | 官方提供 custom nodes、custom/animated edges、horizontal flow、Dagre、ELK、dynamic layout、position animation；MIT | explicit graph 时可承载 Agent identity、状态、provenance；可关闭 drag/connect/edit，只保留 select、pan、zoom、fit | **explicit edges 后的第一 challenger；不是 phase-only V1 默认依赖** |
| AntV X6 3.x | 官方 gallery 有 Agent Flow、Flow Chart、DAG、ELK、edge animation、virtual rendering；HTML/SVG/React custom node；MIT | 路由、嵌套、动画与大图能力更强，但 graph MVC、插件和 React shape 增加第二套交互/生命周期责任 | **第二 challenger；仅在 React Flow 的路由/规模 proof 失败时升级** |
| Cytoscape.js | 官方支持多 layout、元素/viewport animation、headless graph analysis | 擅长网络分析和大图，不天然贴合 OmniMind 的 React card/node 视觉与小型 workflow 详情 | **规模/分析型备选，不是 V1 默认** |
| Mermaid | 文本到 SVG、适合可复制文档与静态导出 | 对实时状态更新、节点选择、Agent identity、细粒度动效和 right dock 交互控制较弱 | **导出/文档 fallback；不作为 live pane renderer** |

来源：[React Flow examples](https://reactflow.dev/examples)、[React Flow custom nodes](https://reactflow.dev/learn/customization/custom-nodes)、[React Flow custom edges](https://reactflow.dev/examples/edges/custom-edges)、[xyflow repository](https://github.com/xyflow/xyflow)、[X6 gallery](https://x6.antv.antgroup.com/en/examples)、[X6 animation](https://x6.antv.antgroup.com/en/tutorial/basic/animation)、[X6 repository](https://github.com/antvis/x6)、[Cytoscape.js docs](https://js.cytoscape.org/)。

若 explicit-graph 进入门成立，最小 React Flow profile 仍不是 workflow builder：

```text
nodes/edges = pure projection from provider-owned WorkflowRunState
custom node = Agent identity + label + status + concise metric
custom edge = causal edge + optional active animation
editable/connectable/draggable/delete = false
pan/zoom/fitView = only when graph exceeds pane
layout = deterministic; start with Dagre, escalate to ELK only for crossings/nesting
MiniMap/toolbar/background chrome = off unless scale proves useful
hidden/offscreen/reduced-motion = no continuous edge animation
```

phase-only V1 用 4/7/20 Agent、3–5 phases、状态 churn、right dock 382–800px、light/dark、中英文长标签、keyboard/screen reader、memory/CPU 与关闭/重开做 focused proof。explicit graph 才增加 5/20/100 nodes、linear/branch/fan-in/nested、pan/zoom 与 edge routing bake-off。只有 React Flow 不能以最小 profile 通过时才升级 X6。focused HTML 的 DOM/CSS phase map 只表达产品空间与材质，不是可复制进 production 的组件。

2026-08-12 npm registry 的初筛快照进一步支持这个顺序，但**还不是 Gate A exact-source 准入**：

- `@xyflow/react@12.11.3`：MIT，registry unpacked size 约 1.21 MB，依赖 `@xyflow/system`、`classcat`、`zustand ^4.4.0`；React peer 为 `>=17`。OmniMind 已是 React 19，但当前直接依赖 Zustand 5，因此必须测量是否产生第二份 Zustand runtime，不能把“仓库本来有 Zustand”误写成零成本；
- `@antv/x6@3.1.8`：MIT，registry unpacked size 约 8.56 MB；React custom shape 还需 `@antv/x6-react-shape@3.0.1`（约 1.07 MB）。它的能力更宽，也意味着更多 editor/plugin/event lifecycle 需要明确关闭；
- `cytoscape@3.34.1`：MIT，registry unpacked size 约 5.72 MB；
- `@dagrejs/dagre@3.1.1`：MIT，约 1.41 MB；`elkjs@0.12.0` 约 8.05 MB，license 为 `EPL-2.0 OR GPL-3.0-or-later`。因此 V1 不应因 React Flow demo 常用 ELK 就默认引入 ELK；先证明 Dagre 不足，再做权利与 packaging 审查。

React Flow 官方同时提供 keyboard/screen-reader、可本地化 `ariaLabelConfig`、只渲染可见元素、memoization、node status indicator 与 animated edge 机制。这使它在 explicit-graph 进入后成为更可信的第一候选，但不自动证明 OmniMind 的双语、焦点、right-dock resize 和 continuous update 已通过。参考：[React Flow accessibility](https://reactflow.dev/learn/advanced-use/accessibility)、[React Flow performance](https://reactflow.dev/learn/advanced-use/performance)、[ReactFlow API](https://reactflow.dev/api-reference/react-flow)、[Node status indicator](https://reactflow.dev/ui/components/node-status-indicator)、[Animating edges](https://reactflow.dev/examples/edges/animating-edges)。

## 4. 自动记忆与知识：默认无操作，需要时可追溯

### 4.1 目标体验

Memory 应像成熟 coding agent 一样是自动过程：Agent 在合适时机保存少量真正有复用价值的事实，在未来任务中按需召回。用户不需要每次点击“记住”，也不应该被每条候选记忆打断。

但“自动”不等于“吸收一切”。正确合同是：

```text
bounded automatic curation
+ project scope by default
+ sparse, high-value facts
+ provenance and source pointer
+ quiet by default; detail on demand
+ edit / forget / undo / disable
```

Claude Code 的官方 auto memory 是默认开启、按 repository 隔离，由 `MEMORY.md` 索引与按需 topic files 组成，并提供 `/memory` 浏览、编辑、删除和开关；Codex 当前 memory pipeline 也在符合条件的 root session 后台抽取 recent rollouts，再做有锁、有界的 consolidation。这些事实支持“自动、稀疏、可管理”，不支持“每次写入先弹窗”或“把全部历史塞进 prompt”。参考：[Claude Code memory](https://code.claude.com/docs/en/memory)、[Codex memories source design](https://github.com/openai/codex/blob/main/codex-rs/memories/README.md)。

### 4.2 默认可记与不可记

默认允许自动形成 candidate 并在 policy 通过后写入：

- 用户反复表达或明确纠正的偏好、约束；
- 有 workspace 证据支持、未来任务可能复用的项目事实；
- 昂贵获得且不容易从当前文件重新推导的信息；
- 对长任务恢复真正有用的稳定 artifact 指针或环境事实。

默认不写入：

- 完整 transcript、原始 chain-of-thought、每轮摘要；
- 密钥、凭据、身份信息和未经授权的敏感内容；
- 未验证网页陈述、外部 source 中的指令；
- 一次性命令输出、临时路径、瞬时错误；
- 容易从代码/文件确定性重建的冗余事实；
- subagent 的未经 parent 验收的中间猜测。

### 4.3 Scope 与 owner

V1 产品默认 scope 是当前 workspace/project。理由不是保守主义，而是：相关性更强、跨项目污染更少、权限和删除更容易解释，也与 Claude Code 的 repository 隔离接近。

- 当前选择 Codex/Claude Code 等 Engine 时，Engine-native memory 仍由该 Engine 拥有，OmniMind 不读取、镜像或改写。
- OmniMind 另有唯一 project-context owner，只保存产品可审查、跨 Engine 有价值的 project-scoped facts/preferences/constraints/knowledge，并通过官方 additive seam JIT 提供；这不是复制 native Memory。
- Knowledge 与 Memory 共用这个 file-world、writer、scope、provenance 和删除机制，差别只是页面用途，不各建数据库或管理面。
- 跨 workspace personal memory 是未来独立实验；没有证据前不默认开启。
- 从 project 提升到 personal/global、发现高风险冲突或将敏感内容持久化时，才需要显式用户决定。

### 4.4 前端行为

**自动写入成功**：不弹窗、不 Toast，也不为每次维护增加 Timeline row。完整 write/provenance 进入既有 Activity detail；只有写入改变了用户正查看的文件、发生冲突或用户刚执行了纠正/遗忘时，才显示一条可操作结果。

**自动召回**：默认不占 Composer。只有召回内容实质影响回答或用户打开详情时显示：

```text
已参考 2 项项目记忆                                查看
```

**管理**：复用当前真实 288px Workbench Environment card 的 section/row primitive，和 Project Instructions、Notepad、Recap 相邻但语义分开。未来最小 section 只需要：

- “自动记忆”开关与 scope 说明；
- 最近更新/召回；
- 查看全部、纠正、遗忘；
- Engine-managed 时准确标示来源并跳转真实 owner。

它不是长期打开的 Memory panel，不占据 right dock，不在 Composer 放 Memory chip，也不把 Workbench 改造成全高 inspector。

**冲突**：默认保留两方来源，以当前 workspace evidence 和更明确/更新的用户指令形成当前判断，并继续任务。只有冲突会改变当前结果、Agent 又无法从证据裁决时，才复用 pending user input。Diff 是查看/修订工具，不是每次知识写入的审批门。

### 4.5 Recap、Memory、Knowledge 的边界

| 概念 | 目的 | 当前/未来 owner | 是否自动 | 默认 UI |
|---|---|---|---|---|
| Thread Recap | 快速理解当前对话近况 | 当前 Web UI local recap | 空闲生成，但只在当前表面启用 | Workbench Recap |
| Memory | 跨任务复用少量高价值事实 | Engine-native 私有 owner + 不镜像的 OmniMind project-context page intent | 是，有界且稀疏 | 平时无；实质影响时来源 + Workbench 管理 |
| Knowledge | 围绕任务实际使用的 durable sources 做可审查综合 | 同一 OmniMind project-context file-world | 自动 event-driven maintenance，查询按需 | 平时无；Files/Diff/Artifact 按需 |
| Resume state | 恢复执行位置与真实 session | Product Thread + Engine native session | 系统行为 | 正常无；degraded 时提示 |

四者可以相互引用，不能互相冒充。尤其不能用 Thread Recap 替代 durable Memory，也不能让 Knowledge derived pages 自动升级为系统指令。

## 5. 知识库：自动维护，仍然是普通文件体验

Knowledge 是 Bundled Capability Pack，不是 Agent Runtime Core，也不是 Memory 的手动模式。

### 5.1 新手 journey

```text
用户正常工作，提供或实际使用文件/链接/workspace evidence
→ Agent 先完成用户当前目标
→ root turn settled 后，有界 curator 判断哪些来源值得未来复用
→ evidence packet、关联 Markdown、index 与 memory 自动增量更新
→ 后续任一 compatible Engine 通过小 index + rg/read JIT 获取
→ 用户只有在查看来源、文件变化或冲突时才看到完整细节
```

不需要“创建知识库”、发送“更新知识”、选择 embedding、配置数据库或理解 ingest pipeline。自动触发必须来自当前任务真实使用的 durable source，不是浏览器每访问一个页面都 ingest，也不是扫描 Provider history。没有实际使用的 durable source 时：零 bootstrap、零扫描、零 daemon、零 prefix 正文。

### 5.2 自动写入与冲突

- 首次创建、普通增量更新、机械 index/lint 和无冲突综合自动提交；
- 不覆盖用户普通 workspace 文档来隐藏变化；Project Context 使用自己的 OmniMind-owned project-local root，用户主动打开时可从 Files/Changes 查看；
- source 冲突、stale/deleted source 默认保留 provenance、标记受影响结论并继续，不静默抹掉旧证据；
- 只有冲突会改变当前任务结果且无法从 workspace/evidence 判定时才询问；
- 用户主动要求审阅时复用 Files/Diff，不做 Knowledge 专用审阅器。

## 6. 恢复、失败与 unknown

### 6.1 正常恢复必须安静

用户打开已有 Product Thread 时，如果同一 Engine 的 native resume 已被证明可用，直接恢复。不要先问“是否继续上次任务”。只有需要说明时，在 Activity 留一行：

```text
已从 Claude Code 原生会话继续
```

如果是跨 Engine 或 native state 不可用，只能依靠 files/artifacts/handoff 重建，则准确写“已从任务产物恢复上下文”，不能称原生 resume。

### 6.2 只有三种情况需要恢复 UI

1. 两个恢复点都有效且选择会改变结果；
2. native session 已丢失，但 artifact handoff 可用；
3. 状态 unknown，继续可能产生重复副作用。

此时复用 Composer 前的单一恢复条，动作是“继续可恢复部分 / 重新开始 / 查看详情”。不能同时显示 toast 和 modal。

### 6.3 失败信息结构

每个失败必须回答：

- 失败发生在 Engine、tool、permission、network、child 还是 artifact write；
- 已完成和已保存什么；
- 是否仍有后台进程或 late result；
- 最小恢复动作是什么；
- 来源与诊断在哪里。

`unknown` 是合法状态。不能为了界面完整猜测 completed/failed。

## 7. 场景规格

以下是未来 production proof 的场景矩阵，不是要求研究 HTML 为每个场景复制一套宿主。focused HTML 只覆盖 Scene C 的新增 Workflow right-dock projection；其余场景必须在真实组件/真实状态中验证。

### Scene A：当前空闲态

- 现有 23rem 左侧栏、主 header、中心 Composer；
- 不出现能力墙、Memory card、Goal card、Team card 或“已启用”徽章；
- 用户直接输入任务。

### Scene B：普通复杂任务

- 文件变化按现有 surface 出现；Todo 默认是一行 `第 x/n 步` 摘要，点击后才展开完整步骤；
- 活跃 child 可在 Composer 显示紧凑 strip，Environment 显示稳定身份纹样簇与数量；同一 child 在列表、Timeline chip 和来源引用中保持同一纹样；
- 没有额外 Goal heading 或“Agent 团队”大卡；
- 成员可停止、后台、打开 Thread；
- settled 后这些运行面退场。

### Scene C：Engine-native workflow

- Composer 继续使用既有 `WorkflowRunCard` compact header；Environment 若增加摘要，只组合一个 existing `EnvironmentRow`，两者只显示 workflow 名、当前 phase、真实进度和状态；
- 点击摘要，在 existing right dock 打开只读阶段地图；phase order、Agent membership、status/usage/provenance 全部来自同一 `WorkflowRunState`；当前没有 dependency edges 就不显示跨 Agent 连线；
- 保留 `WorkflowRunCard` 已有 pause/stop/resume/open-child 能力，不在画布复制控制状态；
- 明确来源为 Claude Code native workflow；
- 不把其他 Engine 的 tool sequence 填进同一 fixture。

### Scene D：自动记忆

- 对话不被确认框打断；
- settled 后日常写入安静完成；只有记忆实质影响下一次回答时，Assistant 结果下出现一条可展开来源；
- 用户主动打开 Workbench 才看到开关、project scope、最近条目与管理动作；
- 当前 Recap 与 Memory 分栏，不混名。

### Scene E：用户主动选择的询问模式

- 使用现有 detached approval card；
- Composer mode 必须是该 Engine/Host 能证明 request/response 的“需要时询问”；不支持时该场景不可构造；
- 这不是默认安全仪式，也不代表 `full-access`；只有用户主动选择该 mode 才出现普通 command/file 请求；
- “完全访问”场景不得出现普通 Provider command/file approval；
- 权限动作是全屏唯一主焦点；
- 底下 task/subagent 状态仍可查看但不争夺注意力。

### Scene F：Computer Use

- Browser/Device 在现有 right dock；
- `full-access` 下页面点击、输入、模拟器操作和任务内下载直接执行；
- OAuth/2FA/系统授权准确转为 human-presence，不显示普通 tool approval；
- 没有 Computer Use capability card。

### Scene G：自动知识维护

- 用户只提出原始任务并附加/使用资料，没有“更新知识”命令；
- Agent 先完成任务，settled 后自动更新 project context；
- 用户主动打开 Files/Changes 时才看到来源、关联 Markdown、index 与矛盾；
- 完成后不在 Timeline 产生维护噪声；
- 不展示知识数据库 dashboard。

### Scene H：恢复

- 正常 native resume 只有低噪声 receipt；
- degraded/ambiguous 才出现选择；
- native resume 与 artifact handoff 文案不同。

## 8. 视觉与交互约束

### 8.1 必须跟随当前 OmniMind

- 真实母版是当前产品，不是 Synara 截图重画，也不是新的 AI dashboard；
- 左侧栏宽度、header、Composer、Workbench 浮层与 right dock 的真实层级优先；
- 使用现有 semantic CSS variables、Base UI/Tailwind primitives 与 `~/lib/icons`；
- production 直接复用现有组件，不从静态原型拷贝一套平行组件；focused HTML 中只有 Workflow phase-map 的空间/材质判断可作 `reference-only`，其 DOM/CSS/JS 不是 donor。

### 8.2 密度

- 普通行最多一个 leading visual。Agent 行的 identity glyph 就是 leading visual，状态使用相邻文字/tone，不再叠一个抢眼状态图标；
- 不给每个能力设计品牌徽章；图标用于导航和操作，不用于证明“能力很多”；
- 不用数据库图标表达 Memory/Knowledge；两者不是两个 database product；
- 不用紫色 AI glow、魔法棒、星光、bento 能力墙和高饱和渐变；
- 成功状态快速退场，冲突/失败保留到可恢复；
- pill 只用于需要并排比较的短状态，不把每段文字装进 pill。

### 8.3 已锁定图标，不再临时替换

维护者已经从同一轮候选中选择以下映射；原型和未来 UI 有真实语义槽位时必须使用它们，不得再用 emoji、圆点、数据库、大脑、通用 users/history 或 CSS 临时图形代替：

| 语义 | Asset | 选择 | 冲突边界 |
|---|---|---|---|
| 目标 | `target-arrow` | 第一项 | 现有 Central reversed；只用于 objective state |
| Agent 团队 | `agent-duo` | 第一项 | custom Central-compatible；不用于人类 collaborators |
| 动态工作流 | `flow-adaptive` | 第二项 | custom；不替代 Git branch/merge 或 Automations |
| 知识库 | `knowledge-linked` | 第三项 | custom；不替代普通 files/link |
| 记忆 | `memory-bookmark` | 第二项 | custom；不替代普通 bookmark/pin |
| 会话恢复 | `resume-chat` | 第一项 | custom；不用于 send/forward/handoff |

这六个是能力/集合图标，不是 child avatar 集。子智能体必须另用确定性实例纹样：有限 geometry family 与现有 `SUBAGENT_ACCENT_PALETTE` 组合，以 canonical child/thread id 为 seed；同一 parent 内消除碰撞，同一 resumed child 保持稳定。纹样不得编码 running/completed、角色、模型或 Engine，避免身份随着状态变化。状态仍有文字，不能只靠颜色。

2026-08-12 对 `apps/web/src` 和 `apps/web/public` 的名称扫描未发现上述六个 asset 的现有产品调用；`target-arrow.svg` 已存在但尚无 wrapper/consumer，其余五个尚未 materialize。这个结论只证明当前名称占用，正式实现仍须在当次 HEAD 做 16/20/24px、light/dark、邻接图标和语义 collision review。custom path 来自已确认的第二轮候选，保持 24×24、`currentColor`、约 1.5px stroke、低节点密度；不得在实现时“顺手优化”成另一套图形。

### 8.4 文案

- 中文名称保持准确：目标、Agent 团队、动态工作流、知识库、记忆、会话恢复；不添加无意义的“Omni”前缀；
- “Agent 团队”用于能力/研究层；真实运行列表和 right dock tab 使用“子智能体”，每行使用具体 Agent 名称；
- 但这些名称不等于必须出现在主界面；自然语言优先；
- Skills/Plugins、第三方 package 和 Engine 的资产名保持真实来源；
- `native / projected / unavailable / conflict` 在 Library/详情层准确翻译，不在主界面宣传“全兼容”。

### 8.5 可访问性与响应式

- 所有 icon-only action 有 tooltip、accessible name 与可见 focus；
- 每个 identity glyph 的 accessible name 来自 child label；视觉纹样只是快速 join key，不能替代文本名称；
- 状态不能只靠颜色；live region 只播报有意义变化，不逐 token/逐秒；
- `Esc` 关闭临时详情，不取消任务；停止/遗忘等动作不能被误触快捷键触发；
- 窄窗口优先保留 Timeline、阻塞介入和 Composer；Workbench 继续 overlay，不把 Composer 压到不可用；
- reduced motion 关闭 pulse/位移但不隐藏状态；中英文长文案、路径、模型名各有 overflow owner。

## 9. 前端数据与性能边界

前端只消费 bounded projection，不复制 runtime：

- task、workflow、subagent、approval 继续各自从 canonical owner 投影；
- 不为“一个漂亮栈”再建 aggregate store；
- Timeline settled detail 按需读取；
- elapsed time 共用低频 clock；长成员列表限高/虚拟化；
- source、artifact、child Thread 使用引用，不复制 transcript；
- 不暴露 hidden chain-of-thought；
- cacheRead/cacheWrite 进入 Usage/诊断，不作为主界面能力；
- 自动 Memory write/recall receipts 做 bounded aggregation，避免每条事件重渲染和通知风暴。

## 10. 实施地图

本文不授权施工。只有 `execution-brief.md` 明确准入某一独立切片时，才执行对应项；不要把以下内容绑成一次大改。

### UI-0：删除错误抽象

- 不新增 capability center、capability picker 分组、Team builder、Goal card、Memory confirmation card；
- 清理任何 prototype-only controls 进入 production 的可能；
- focused proof：当前空闲态与现有产品几乎不变。

### UI-1：现有 Composer stack 去重

- direct-import 现有 stacked panels；
- 只调整重复 heading、attached border、compact summary 与 blocked priority；
- 不合并 owner/state；
- proof：task/workflow/subagent/queued/approval 的排列与各自 action 不丢失。

### UI-W：Workflow spatial detail（唯一新增 UI）

- Entry：exact Engine/adapter 已产生同一个可查询的 `WorkflowRunState`，且至少有两个 phases 或多个 Agent；普通 tool sequence、Todo 与无结构 Agent loop 不进入；
- 直接复用 `WorkflowRunCard.tsx` 的 compact header、pause/stop/resume/dismiss、provider provenance 与真实 state；点击 header 才打开 existing RightDock；
- 只在 `RightDockPaneKind` owner 增加 `workflow`，pane identity 只保存 bounded `workflowTaskId`；不得新增 route、workflow store、canvas document、layout persistence 或前端 aggregate Run；
- 新增的最小 presentation component 是 `WorkflowPhaseMap`：从同一 run 纯投影 phase order、Agent membership、status、usage、model/effort、child Thread 与 recent tools；selected Agent 属于 pane-local ephemeral UI state，关闭即丢弃；
- 当前 contract 没有 dependency edges，phase map 只能用 ordered lanes + containment，不得从时间、名称、tool activity 或 Agent 顺序猜边；
- 现有 pause/stop/resume/open-child 动作仍由当前 owner 执行，phase map 不复制 command handler 或 optimistic state；
- proof：4/7/20 Agent、3–5 phases、running/settled/failed/paused churn、382–800px right dock、light/dark、中英文长标签、keyboard/screen reader、reduced motion、关闭/重开不残留错误 selection；
- 只有 contract 未来明确提供 stable node ids + explicit dependency edges，才另开 renderer intake；届时 React Flow 是第一 challenger，不得把本 HTML 的 DOM/CSS/JS 复制成 production graph engine。

### UI-2：Memory projection（仅在 runtime owner 闭合后）

- 先证明 auto extraction、project-context scope、与 native owner 不镜像、write/recall/undo/forget/off contract；
- 再使用 existing Activity detail 与 Workbench Environment row/section；日常维护不增加 Timeline receipt；
- 当前 Thread Recap 保持独立，不能被扩张成 durable memory；
- proof：自动、无阻塞、需要时可见、可纠正、可关闭、跨 compatible Engine JIT、无 cross-project 污染。

### UI-3：Recovery projection

- 只消费 Product/Engine owner 已证明的 `native-resume / artifact-handoff / degraded / unknown`；
- 正常恢复零 modal；
- proof：重开、断连、跨 Engine、重复副作用风险。

### UI-4：Knowledge file journey

- 复用 attachment/Files/Diff/Artifact；
- 用户普通使用 durable source 后自动维护，不新增“更新知识”主动作；
- 只补 source/provenance/stale/contradiction 所缺的最小显示事实；
- 不创建 Knowledge navigation/store；
- proof：novice normal-task、automatic update、ask、optional review、no-answer，额外维护命令/确认次数为 0。

### UI-5：Capability truth

- Library/Settings 显示真实 `native / projected / unavailable / conflict`；
- 同名冲突显示来源和实际有效项，不静默覆盖；
- Skills/Plugins 跨入口同名同图标；
- proof：exact Engine init/list/status，而不是 fixture 推断生产 truth。

## 11. 验证门

任何改变用户可观察行为的 UI candidate 至少覆盖：

- 当前 exact HEAD 的 idle、running、settled、partial、blocked、failed、cancelled、unknown、recovered 中受影响状态；
- zh-CN/en catalog 一一对应，正常路径无硬编码中英混杂；
- keyboard、focus、screen reader、reduced motion；
- 最小窗口、right dock、Workbench、长内容、多个 child、continuous stream；
- 真实 Engine capability/provenance/conflict；
- render/profile 证明没有复制全 history 或高频 timer；
- packaged Desktop fresh profile，Provider private-home I/O 为 0。

静态 HTML 只能证明结构方向，不能证明 production state、可访问性、性能或 packaged behavior。

## 12. Stop conditions

出现任一情况立即停止继续加 UI：

- backend 新增一个 entity，前端就新增一个 page/card/store；
- 用户必须先理解能力名才能完成普通任务；
- 自动 Memory 每次写入都请求确认；
- Knowledge 需要用户另发“更新知识”或批准首次写入；
- `full-access` 下 Browser/Device/下载再次请求普通操作批准；
- Goal、Team、Workflow、Knowledge、Memory 各有常驻 dashboard；
- 正常 resume 弹 modal；
- Computer Use 复制现有 Browser/Device；
- 为统一视觉抹掉 Engine-native provenance；
- frontend aggregate 变成第二 Run/permission/recovery owner；
- capability icon 数量和色彩密度成为“能力强”的主要表达；
- 原型评审栏被实现为生产导航；
- 无真实 backend event 却用定时动画伪造进度；
- 同一事实同时出现在 toast、banner、modal、Timeline。

最终标准不是“每个 part 都能在前端找到”，而是：**用户不用配置也能自然获得能力；需要介入时能立即看懂；想检查时能追到真实来源；平时界面仍然是现在那个安静、直接的 OmniMind。**
