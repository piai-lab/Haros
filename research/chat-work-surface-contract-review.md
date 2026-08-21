# Chat 工作面：Prompt、能力、文件、Skill 与 Agent 升级边界

> 研究与维护者裁决日期：2026-08-21
>
> 当前 OmniMind source snapshot：`533fa40f073e0903fc9c2e135e6c6fd48cb3b0c8`
>
> 对照 Synara source：`/Users/liuzaoqu/Desktop/Develop/πCode/synara`，clean exact `57f48ef1a3354ae7967d4a8f9f83a1105691ede6`
>
> Proma 只作为产品直觉与反例来源，不是 adopted source，也不授予复制其 Workspace、Memory、MCP 或 Agent 生命周期的权限。

> **2026-08-21 supersession：** `§10–§14` 仍是对 `533fa40…` 的历史源码观察，不能倒改；本文其余目标裁决已经被当前 architecture supersede 为“三个 ProductSurface、两个 Provider execution/trust surface、immutable surface Prompt + mutable Host guidance”。Chat→Agent 的历史、附件与失败呈现也已锁定为服务端权威完整可见历史、有界 Provider bootstrap、逐附件 target-owned 部分复制，以及“一条 Timeline activity + 发起时一次 Toast”。当前实现与验收状态只看 `execution-brief.md` 和 Campaign。

## 0. 本文的角色、权威与新会话读法

本文保存 2026-08-21 围绕 OmniMind `Chat` 工作面形成的完整认知：维护者已经确认的产品方向、当前代码事实、Synara/Pi/Proma 证据、互相冲突之处、明确否决的路线，以及未来重新进入施工时必须证伪的条件。

本文不是第二份产品宪法、当前施工计划或完成状态：

- 稳定 UI 与交互最终仍只由 [`architecture/workbench.md`](../architecture/workbench.md) 拥有；
- Project、Thread、Conversation、Queue 与恢复事实仍只由 [`architecture/product-state.md`](../architecture/product-state.md) 拥有；
- Provider、Prompt、Pi、Host 与进程边界仍只由 [`architecture/execution.md`](../architecture/execution.md) 拥有；
- 当前工作只看 [`execution-brief.md`](../execution-brief.md)；
- 验收状态只看 active Campaign。

新会话应按以下顺序理解本文：

1. `§1–§9` 是维护者已经锁定的目标认知；
2. `§10–§13` 是绑定上述 source snapshot 的当前事实与来源证据；
3. `§14` 是目标与当前实现之间的漂移，不能把目标误写成已经交付；
4. `§15` 是明确否决；
5. `§16–§18` 是未来同步 sole owner、施工与复验的入口，不是本文自行授予的实施许可。

如果本文与当前 `architecture/` 冲突，冲突本身是尚未同步的产品变更证据。未获授权的会话不得私自选边施工；获授权的实现必须先把稳定裁决同步回 sole owners，再改代码和验收。历史研究不得被倒改成“当时已经这样决定”。

## 1. 一页结论

这轮最重要的结论不是一张工具白名单，而是一条极简组合原则：

> **一个能力装配体系，三个产品 Prompt 工作面，两个 Provider 执行/信任面，一条唯一的 Project 升级入口。**

更完整地说：

1. OmniMind 产品导航应有三个一级工作面：`Agent / Chat / Studio`。Chat 不是 Agent 的空项目状态，也不是 Studio 的别名。
2. Provider/runtime 仍只需要 `agent / chat` 两种 work-surface 语义：普通 Project 是 `agent`；Chat 与 Studio 都是 `chat`。不得为 Studio 新增第三种 Provider mode。
3. OmniMind Agent 的 Engine-native/Pi-native 全局能力默认跨模式共用。未来安装的全局 Tool、Extension、Skill、Prompt，除非维护者明确要求或资源本身具有自然 scope，否则不要按 Chat/Agent 再维护两份注册、配置或 allowlist。
4. Agent、Chat 与 Studio 的 Prompt 侧重必须不同，但不能各写一整套互相漂移的“大 Prompt”。正确形状是 immutable 的共同 identity/cognitive core + 三个窄 ProductSurface overlay；Settings、availability 与实际 Host catalog 形成 per-turn mutable guidance，不能冻结进 Session Prompt。
5. Chat 不选择 Primary Folder、cwd 或 Project。它可以显式引用文件/文件夹，但引用不是 cwd、Project、Project trust 或 Project-local Skill 的激活器。
6. Chat 使用普通 Engine 文件工具处理自己的受管工作目录。现有 per-chat workspace 的 `work/` 与 `outputs/` 足够；不要新建 `chat_files.*` 工具、Artifact Manager、下载中心或第二文件生命周期。
7. Chat 的 OmniMind Host 默认只投影 Browser。线程协调、Automation、Diagnostics、Device 以及未来 Host capability 默认不投影给 Chat；`omnimind_update_tasks` 例外，因为它是 Pi Session Extension，不是 Host tool，并且研究、学习、规划等 Chat 任务同样可能需要 Todo。
8. 其他 Engine 保留自己的原生工具和生态。OmniMind 只通过真实 seam 投递短 Chat behavior overlay、Browser Host 能力与显式 Skill 引用；不模拟 OmniMind Agent，不承诺 tool parity，也不建立跨 Engine 兼容层。
9. 全局 Skill 可以在 Chat 使用；Project Skill 是“位于受信 Project scope 的 Skill”，不是一种新的 durable entity。普通 Chat 不 ambient-discover Project Skill。
10. `Send to Agent` 是 Chat 唯一的 Project 升级入口。它表达“把当前上下文继续为一个受边界、可持续的 Project 工作”，不只表达“修改已有项目”。
11. `Send to Agent` 应像概念上的 fork：保留原 Chat，创建新的 Agent Thread，带入对话上下文和明确引用；它不是原生 Provider Session clone、旧 operation replay 或静默 cwd 热切换。
12. Studio 继续 follow Synara 的既有产品职责与 workspace/output/reactor 语义。本轮不借 Chat 重构重新设计 Studio。

## 2. 维护者 taste：奥卡姆剃刀、模块化与 Pi 哲学

### 2.1 “可插拔”首先是责任可替换，不是把一切实现成 Extension

维护者希望 Prompt、Tool、Skill 与工作面规则都像 Pi 生态一样容易组装、替换和维护。但这不表示 Prompt 必须伪装成 Extension，也不表示每种模式都需要一个新的 registry。

正确抽象是稳定片段可以独立拥有和组合：

```text
OmniMind identity / cognitive core
  + Chat behavior overlay 或 Agent behavior overlay
  + Engine-native dynamic prompt / tools / context / skills
  + 当前真实交付的 Host guidance
```

Prompt 可以按类似插件的方式维护，但生命周期仍是 Prompt；Tool、Extension、Skill、Host projection 也继续由各自真实 owner 管理。模块化不能变成“一切皆插件”的新总平台。

### 2.2 默认共享，例外按自然 scope 而不是产品 tab

未来给 Pi 安装常驻 Tool 或 Extension 时，默认对 Chat、Agent、Studio 共用。这样只有一份安装、更新、冲突、reload、provenance 和测试责任。

自然例外是 scope：

| 资源位置/身份                                   | 默认可见范围                          | 原因                                                  |
| ----------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| OmniMind/Pi 全局 Tool、Extension、Skill、Prompt | 所有模式                              | 用户级能力，不应按 tab 复制生命周期                   |
| Project-local Tool、Extension、Skill、Prompt    | 明确选择并受信的 Project work surface | 依赖 Project root 与 trust，不是全局能力              |
| Studio workspace instructions/outputs           | Studio managed scope                  | 跟随 Synara Studio owner；不构成 ambient Pi discovery |
| 维护者明确批准的例外                            | 按明确裁决                            | 不能由 adapter 静默推断                               |

不得为了模式差异建立 `chatPiTools`、`agentPiTools`、第二 Package 配置、重复 Extension factories 或 per-mode 全量 allowlist。

### 2.3 能力存在不等于必须使用

维护者的类比是：有剑不等于一定杀人，但剑也会增加负担。对应到 Agent：

- Tool schema 存在不等于模型必须调用；
- Prompt 负责告诉模型该工作面追求什么、什么情况下值得用工具；
- authority/runtime mode 继续负责真正高风险的调用准入；
- Tool 数量和 schema 会占上下文、分散注意力，这是现实成本；
- 但不能仅凭“可能有成本”提前建设动态工具平台或粗暴裁剪 Engine-native 能力。

只有真实 wire/schema、质量、延迟或误调用证据证明成本显著时，才重审具体能力的装载策略。首版不建立模式级动态 Tool Manager。

### 2.4 “general、Agent-native”优先于场景化功能堆叠

不要为“Chat 可能读文件”“Chat 可能生成文件”“Chat 可能调研”各造一组工具和 UI。优先让普通 Engine 工具、明确路径引用、受管 cwd、RightDock 和 Prompt 合作完成。

用户结果优先，内部术语退后：普通界面不需要理解 adapter、Host inline、source scope、artifact lifecycle 或 ResourceLoader。

## 3. 三个产品工作面与两个 runtime work surfaces

### 3.1 产品工作面

维护者已明确要三个一级入口：

| 产品工作面 | 用户目的                                  | canonical Project kind | runtime workSurface |
| ---------- | ----------------------------------------- | ---------------------- | ------------------- |
| Agent      | 在明确 Project 边界内持续执行、修改和验证 | `project`              | `agent`             |
| Chat       | 开放式理解、探索、决策、学习、调研与产出  | `chat`                 | `chat`              |
| Studio     | Synara 既有受管开放式创作/Agent 工作台    | `studio`               | `chat`              |

Studio 是独立产品 surface，但不是第三种 Provider protocol。它的特殊性来自 Studio container、workspace、output、reactor、draft cwd 与本地环境，不来自一个新的 `workSurface: studio`。

### 3.2 最小导航形状

已形成的最小 route 认知是：

```text
/          → Agent landing
/chat      → Chat landing
/studio    → Studio landing
/$threadId → 共享 Thread route，由 Thread 所属 Project kind 恢复产品 surface
```

`Project kind` 是 surface 的唯一事实来源。不得从 cwd、路径、Provider、模型、当前 pane、URL 字符串或 UI tab 猜测。

### 3.3 采用 Synara 的描述式 Menu/Radio

工作面选择应 follow Synara 的 `Menu / MenuRadioGroup / MenuRadioItem` 描述式交互：当前工作面名称作为 trigger，菜单中每项显示 title、description 与选中态。不要继续 OmniMind 当前的双 segmented control，也不要新建平行 picker。

Agent、Chat、Studio 的列表、空态、新建动作、恢复和范围必须真正分离；不能继续把 Chat 藏在 generic `threads` 或把 Studio 标成 Chat。

### 3.4 尚未被本轮锁死的导航细节

以下是已有 Synara/讨论候选，但本轮没有必要为了 Chat contract 伪装成最终实施裁决：

- `showChatsSection` / `showStudioSection` 的精确设置与 migration；
- 隐藏 Chat 时是否仍 prewarm Home Chat；
- 是否继续只保存一个 `lastThreadRoute`，还是需要其他最小恢复字段；
- 各 surface 的 keyboard shortcut 与 Recent View 细节。

未来应优先继承 Synara 现有 state owner，不新增数据库 mode 或三套 restore store。

## 4. Prompt 合同：共同核心 + 不同侧重

### 4.1 当前真实组合

当前 [`PiAdapter.ts`](../apps/server/src/provider/Layers/PiAdapter.ts) 已经有正确的模块化骨架：

```text
OMNIMIND_IDENTITY_AND_COGNITIVE_CONTRACT
  + OMNIMIND_CHAT_CONTRACT 或 OMNIMIND_AGENT_CONTRACT
```

共同 core 负责：

- OmniMind / πAI-Lab identity；
- 理解用户最终目标，不把第一句话当完整规格；
- 区分可以调查的事实与只能由用户决定的意图；
- 发现盲点、风险和更好路径；
- 低风险可逆歧义用合理假设前进，实质分叉必须对齐；
- 独立、诚实，不伪造执行或验证；
- 使用用户语言，结论先行，简洁但完整，并尊重用户 taste。

Chat overlay 当前强调：理解、探索、决策、学习、产出；能先给可靠起点时先给；学习时补足必要前置；多路径时推荐主路径；工具能显著改善准确性、时效性或完整性时使用。

Agent overlay 当前强调：对齐目标、边界与成功标准；安全调查先行；对齐后主动执行；高风险动作确认；检查现状、保留已有工作、验证并闭环。

### 4.2 已确认需要修正的 Chat 语义

当前 Chat contract 的最后一句只在“需要修改已有用户 Project”时建议 `Send to Agent`。这过窄，也容易把 Chat/Agent 误解成只读/可写二分。

目标语义应是：

> 当对话自然成长为一个需要明确 Project 边界、持续文件上下文和可继续执行的任务时，建议用户 `Send to Agent`；目标可以是新建 Project、进入已有 Project，或在用户指定文件夹中继续。

这不等于 Chat 不能调用工具、不能生成文件、只能回答问题，或模型看到大任务就自动升级/改变 cwd。

### 4.3 Prompt 负责行为侧重，不能冒充安全沙箱

Chat 对外部引用默认采取“读取和理解，不主动修改”的语义。若用户明确要求把结果写到某个路径，可按真实权限与风险执行；如果任务已经具有持久 Project 工作的性质，应建议 `Send to Agent`。

这是一条产品与 Prompt 边界，不是 OS filesystem sandbox。Pi 的 `bash`、`read`、`write` 等工具在进程权限范围内可能访问其他路径；产品不得把 Prompt 宣传为强隔离。

真正破坏性、不可逆、权限扩张或外部副作用仍由 runtime mode、tool admission、系统权限和用户确认约束。

### 4.4 其他 Engine 的最小统一

不同 Engine 的 system prompt seam、native tools、Skill 发现和 continuation 能力不同。最小策略是：

1. 保留 Engine-native tool 与生态，不删、不模拟、不重命名；
2. adapter 有真实 seam 时，投递短的 Chat behavior overlay；
3. 有真实 Host projection seam 时，按 Chat policy 投递 Browser；
4. 显式选择的全局 Skill 走现有 inline/reference 路径；
5. 没有 seam 时准确降级，不声称行为完全一致；
6. 不为“统一”复制 OmniMind Agent 的 Tool schema、handler、Session 或 Package lifecycle。

跨 Engine 可统一的是高层产品认知和 canonical UI facts，不是伪造底层能力同构。

## 5. 能力装配全貌

### 5.1 必须分开的四层

| 层                          | owner                                                         | Chat 默认                        |
| --------------------------- | ------------------------------------------------------------- | -------------------------------- |
| Engine-native tools         | 各 Engine runtime                                             | 保持 Engine 真实提供的集合       |
| Pi/global ecosystem         | Pi ResourceLoader/Package/Extension/Skill/Prompt owner        | 全局资源默认与其他模式共用       |
| OmniMind Host tools         | AgentGateway catalog/execution/authority + adapter projection | Browser only；其他 Host 默认关闭 |
| Project-local Pi resources  | 受信 Agent Project root                                       | Chat/Studio 不 ambient 激活      |
| Studio instructions/outputs | Synara Studio workspace owner                                 | Studio 专用，但不升级 Pi trust   |

这四层不能因为 UI 都叫“工具”就合并为一个 Mode Tool Registry。

### 5.2 OmniMind Agent / Pi-native tools

当前 bundled Pi coding agent 的默认核心工具包含 `read / bash / edit / write`；runtime 还支持 `grep / find / ls` 等 built-ins。OmniMind 当前没有为 Chat 传入一份 native tool allowlist。

目标继续是：Chat 可以直接使用 OmniMind Agent 内核真实提供的普通工具。不要新建 Chat-only 的受限文件工具来替代它们。

未来给 Pi 安装的常驻 Tool 或 Extension，默认所有模式共用。只有下列情况需要维护者重新裁决：能力天然依赖受信 Project root；schema/context 成本有显著实测反证；安全或外部副作用无法由现有 authority 正确约束；或需要专用 UI/lifecycle。

### 5.3 Chat 的 Host 默认

维护者锁定的产品结果：

| Host 能力                   | Chat 默认 | 说明                                 |
| --------------------------- | --------- | ------------------------------------ |
| Browser                     | 开        | 调研与信息获取是 Chat 的普遍能力     |
| 创建/发送/等待/中断其他会话 | 关        | 不把普通 Chat 默认升级为多会话编排器 |
| Automation                  | 关        | 首版 Chat 不默认创建或管理自动化     |
| Diagnostics                 | 关        | 不把内部运行诊断塞入普通 Chat        |
| Device                      | 关        | 不把设备控制默认暴露给 Chat          |
| 未来 Host capability        | 关        | 需要时再按真实需求明确开启           |

Browser 不是“无风险工具”。导航、输入、上传和下载仍服从真实 runtime mode、现有 Browser owner 与用户意图；这里只决定 Chat 默认是否获得该能力。

### 5.4 Todo 是明确例外，但不是 Host 例外

`omnimind_update_tasks` 应进入 OmniMind Chat。理由不是“Chat 也像 Agent”，而是 Todo 的用户价值由任务复杂度决定：领域调研、学习路线、比较决策、长文规划等 Chat 任务也可能需要可见进度。

规则保持极简：非平凡工作且进度可见有帮助时使用；简单问答不用；必要时先调查；Todo 只记录用户目标和有意义成果；仍使用现有三态完整快照与 canonical `turn.tasks.updated`；不新增 Chat Todo store、Settings 或 UI。

Todo 是 product-bundled Pi Session Extension，不属于 AgentGateway Host policy。把它开放给 Chat 应修改既有 extension composition admission，而不是把它搬进 Host。

既有 probe 记录其 function envelope 约 754 UTF-8 bytes、guidance 约 154 bytes。这个数字只是历史局部测量，不是永恒阈值；它支持“先共享、出现真实注意力损失再重审”，而不是先造动态 loader。

### 5.5 当前 Host 分组不足以直接表达目标

当前 contracts 只有三个 Built-in group：

```text
omnimind / browser / device
```

而 `omnimind` group 内混有 thread read/write、Automation、Diagnostics、Goal/title/archive 等工具。维护者的 Chat 裁决是能力级的 Browser-only，不能靠当前三组直接表达。

未来实施必须同时满足：不新建 Chat 工具系统、第二 catalog 或 per-tool UI matrix；在现有 AgentGateway catalog/projection owner 内，使用已有结构化事实做最窄 surface admission。

现有每个 Tool 已有 `requiredCapability`（`thread:read`、`thread:write`、`automation:write`、`diagnostics:read`、`browser:control`、`device:control`），这比英文名字匹配更接近正确 seam。但最终选择“按 capability 过滤 projection”还是调整既有 group taxonomy，属于未来架构同步与实现裁决；本文不提前新增公共 contract。

同时必须保留 call-time authority：未投影的能力不能靠旧 Session stale schema 成功调用；已接受的 in-flight 调用也不能因普通设置切换被伪取消。

### 5.6 Automation-off 的已接受取舍

Chat 默认关闭 Automation，意味着普通 Chat 暂时不能直接兑现“帮我设置提醒/定时任务”这类请求。正确行为是准确说明当前能力边界或建议进入支持该能力的工作面；不要静默创建、伪造完成或为了一个场景重新打开整个 Host `omnimind` 大组。

未来若维护者决定 Chat 需要 Automation，应复用同一 Gateway capability，不创建 Chat Automation。

### 5.7 上下文与性能约束

轻量不是“工具越少越好”，而是每一份 schema、扫描和生命周期只有一个 owner：

- Browser 虽然 schema 较多，仍按维护者裁决默认进入 Chat；是否动态化只由真实 token/latency/quality 反证重开；
- Chat surface filter 应在现有 catalog/projection 链路裁剪交付集合，不能复制或逐 turn 重建 Gateway catalog；
- 全局 Pi resources 继续由一次 ResourceLoader composition 管理，不按模式重复扫描；
- unified Skills catalog 当前有 15 秒短缓存和最多 64 个 cache entries，未来 global-only admission 应复用同一发现结果/输入边界，不再建 Chat cache；
- 显式 file/folder references 不触发对未选目录的自动递归扫描或常驻 watcher；
- 只有测量到真实 schema attention loss、首 token 延迟、误调用或内存/扫描放大，才引入更窄的 owner-local lazy loading。

## 6. 文件、文件夹与受管 Chat workspace

### 6.1 Chat 没有 Primary Folder

Chat Composer 上方或下方都不应出现“选择工作项目/工作目录”作为持续 cwd 选择器。原因不是视觉简化，而是产品语义：Chat 与具体 Project 无关；选择一个文件夹用于理解不等于升级为 Project；cwd 会隐式激活 Project context/trust/local resources；如果 Chat 自己能选 Project cwd，`Send to Agent` 会变成重复入口。

因此应退休当前 Chat landing 的 `ProjectPicker` / “选择工作项目”语义。

### 6.2 文件/文件夹是显式引用，不是 cwd

Composer 的 `+` 或现有 mention seam 可以提供“添加文件/文件夹引用”。目标行为：

- 形成明确、可见的引用 chip；
- 用户知道当前消息/会话带了什么；
- 不自动扫描未选择的路径；
- 不把路径变成 Project、cwd 或 Project trust；
- 不激活路径祖先中的 Project-local Skill/Extension/Prompt；
- 默认语义是读取、理解和引用，而非主动改写；
- 生命周期优先复用现有 message/session attachment 与 reference owner，不新建 Reference database。

“只读引用”首先是语义与 admission 边界，不应伪装成 Pi bash 的强 OS sandbox。

### 6.3 生成文件的真实落点

当前 source 在普通 Chat 首次发送时创建一个 per-chat managed Project，真实路径形状为：

```text
~/Documents/OmniMind/YYYY-MM-DD/<slug>/
  work/
  outputs/
```

最小目标合同：`work/` 承载中间工作文件，`outputs/` 承载用户可见结果；文件由普通 Engine filesystem tools 直接创建；一旦成功写入就存在，不等对话结束后再“生成 Artifact”；路径和目录是普通文件事实，不新增 Artifact database、status machine、download receipt 或 export pipeline；用户明确指定其他目标路径时按真实权限、风险和意图处理，不暗中复制到 Project。

维护者所说的 Chat“不产生 artificial/artifact”，正确理解不是禁止 Chat 生成文件，而是：不默认写入用户 Project，不把普通文件强行包装成一套新的 Artifact 产品对象。

`managed workspace/outbox` 是产品抽象；当前 shipped bytes 的普通 Chat 目录名是 `work/outputs`，不能把 Studio Outbox 或未来 Artifact 设计反向伪造成已存在。

### 6.4 明确否决 `chat_files.*`

不要新增：

```text
chat_files.list
chat_files.read
chat_files.search
chat_files.create_artifact
```

OmniMind 与 Synara 当前都没有这套工具。它们会复制 Pi `read/find/grep/write`、workspace RPC 和 RightDock 的责任，并引入第二 schema、第二权限解释、第二 provenance 与长期跨 Engine 兼容负担。只有将来出现普通 Engine 工具无法闭合、且不能通过现有 filesystem/attachment owner 修补的确定反例，才允许重开。

### 6.5 RightDock 是文件入口，不是 Artifact Manager

Chat workspace 文件应在现有 RightDock Explorer 实时可见：

- 文件主点击继续打开预览，保持现有桌面文件浏览语法；
- 右键或更多菜单提供 `Reveal in Finder / Open containing folder`；
- 不把“下载”“另存为”塑造成桌面端默认主动作；
- 用户需要复制、移动或另存时，通过正常文件系统或未来已证明必要的窄动作完成。

当前 `fileReferenceContextMenu.ts` 已经拥有跨平台 reveal action；但 RightDock Explorer row 只传相对 path，没有传 absolute `revealPath`，因此 reveal 不出现。Chat Markdown 的绝对文件引用已经能走 reveal。这是现有 owner 的小接线缺口，不是新文件系统需求。

### 6.6 Proma 给出的正确启发与错误复制方式

Proma 显示了两条有价值的产品直觉：受管目录中的文件可以就是普通文件，不必先发明 Artifact 类型；显式 attached files/directories 可以作为会话输入，并在侧栏/文件浏览器中可见。

但 Proma 同时拥有自己的 AgentWorkspace、workspace-files、Memory、MCP、IPC 与 session lifecycle。OmniMind 不能因为产品直觉相似就复制这些 owner，应复用 Synara 已有 Project/Thread/workspace/attachment/RightDock 链路。

### 6.7 文件异常路径

- 引用路径在发送前消失或不可读：保留用户可理解的失效引用/警告，不把它转成 Project，也不自动扩大到父目录；
- managed workspace 创建失败：当前 turn 不得假装已经拥有输出目录，应沿既有 first-send error/recovery 处理；
- `work/outputs` 中写入失败：作为真实 filesystem/tool error 呈现，不创建空 Artifact receipt；
- RightDock 预览不支持某格式：仍可 reveal/open containing folder，不为单一格式创建下载链；
- 绝对路径无法安全解析到当前 workspace：不伪造相对路径或扩大 filesystem root；
- App 重开时文件仍在但索引/preview 暂不可用：以文件系统为事实重新读取，不维护第二份 Artifact truth。

## 7. Skill、Project Skill 与 Chat

### 7.1 全局 Skill 可以在 Chat 使用

用户安装在全局 scope 的 Skill，默认对 Chat 可用。显式选择 Skill 时：OmniMind Agent 继续使用现有 Host inline seam；原生支持 reference/mention 的 Provider 使用真实 native seam；回执只证明 Host 已把完整指令或引用交给已接受该 turn 的 Provider，不证明模型读取、调用、执行或遵循；不因为 Chat 再复制一份 Skill catalog 或安装状态。

Engine 是否自动发现、主动调用或怎样呈现 Skill 是 native 差异；产品不伪造一致。

显式 Skill 不可读、单项超限或剩余预算不足时，按项显示稳定失败回执，继续尝试后续 Skill，并仍发送用户原始请求；Provider 接受 turn 前整体失败时不写虚假成功，回执持久化失败也不重发已经接受的 turn。Chat 不为这些异常另建 retry workflow。

### 7.2 “Project Skill”到底是什么

OmniMind 与 Synara 中确实有 `scope: "project"`，但它不是独立 durable 类型、表、Package 或产品对象。它表示 Skill 来自 cwd/Project root 的祖先路径，只有在该 Project 被明确选择并受信时才应该进入有效资源集合。

当前 OmniMind unified catalog 会在 cwd 祖先中扫描：

```text
.omnimind/skills
.codex/skills
.claude/skills
.cursor/skills
.grok/skills
.factory/skills
.kilo/skills
.opencode/skills
.pi/skills
.agents/skills
```

Synara 对应使用 `.synara/skills`，其余兼容 roots 相同。Pi 自身约定全局 `~/.pi/agent/skills`、`~/.agents/skills`，Project 则从 cwd/ancestors 的 `.pi/skills`、`.agents/skills` 发现。

干净合同：Chat 与 Studio ambient Pi discovery 只含全局 Skill/Prompt/Extension；Agent 在明确受信的 Project root 中增加 Project-local resources。Studio workspace instructions/outputs 继续由 Synara Studio owner 管理，但不因此扫描 managed cwd 内的 ambient Pi resources。用户在 Chat 中显式选择某个 Skill 是本 turn 的输入，不等于开启该路径周围全部 Project discovery。

### 7.3 当前有一个真实不一致

canonical OmniMind Chat 的 Pi ResourceLoader 已使用 `projectTrusted:false`、`projectContextRoot:false`，正确表达了 Chat global-only。但统一 Host Skills catalog 只要收到一个 `cwd` 就会扫描 cwd 祖先的 Project skill roots。普通 Chat 当前又拥有 managed cwd，因此 Composer catalog 可能把 managed workspace 祖先中的 `scope: project` 资源显示出来。

未来实现必须让 Chat catalog admission 与 runtime ResourceLoader 的 global-only 语义一致。不能通过名称过滤、隐藏 chip 或“模型未必用”掩盖；也不能因此删除统一 catalog。应在现有 discovery input/scope owner 内修正。

## 8. `Send to Agent`：唯一 Project 升级入口

### 8.1 它解决的不是单纯“写代码”

`Send to Agent` 表示当前对话值得进入明确、持久、可持续执行的 Project 边界。可以是把调研发展成新项目、在已有项目落实结论、在用户指定文件夹继续、需要 Project-local context/Skills/Extensions/Git/Terminal，或只是把当前 Chat 作为 Agent 任务起点。

所以 Prompt 不能只写“要修改现有 Project 时发送到 Agent”。

### 8.2 交互

右上角只保留一个 `Send to Agent` 入口，采用 Synara 的描述式 Menu/Radio：创建新 Project、发送到已有 Project、选择一个文件夹作为 Project。

Composer 的 `+ 添加文件夹引用` 不承担上述职责：

```text
添加文件夹引用 = 看这个材料
Send to Agent   = 在这个 Project 边界内继续工作
```

### 8.3 概念上的 fork，而不是原生 Session clone

维护者认可“像 fork Agent 一样把 session 弄过去”的体验，但实现必须准确：原 Chat 保留；创建新 Agent Thread；带入当前对话所需上下文、明确 refs 和 managed output refs；新 Thread 进入目标 Project 的真实 workSurface/cwd/trust；不重放历史动作；不热切 Chat cwd；不承诺跨 Provider native continuation；不复制 Engine private session/memory store。

现有架构已经明确没有 Handoff platform、Session copy 或 replay。未来应实现 contextual fork/new Thread，而不是新增跨 Provider Session protocol。

### 8.4 已锁定的 contextual fork 事实

`thread.fork.create` 只接收 Chat→Agent intent；服务端从 canonical source Thread 派生完整产品层可见 user/assistant 历史、mentions 和确定性目标消息 id，Web 不提交 transcript。目标 UI 永久保留完整历史；第一次手动发送才使用有界 recent+earlier bootstrap，长历史不会新增 all-or-fail。

历史 managed binary 在既有 ManagedAttachmentStore 内按确定性 id、既有限额和目标消息归属逐项 clone/claim；失败不阻断 Thread，成功项成为 target-owned，失败项进入一条可展开 Timeline activity，发起动作只 Toast 一次。当前 Draft 仍属于 Composer owner；outputs 仅在存在且可读时作为可移除 directory mention。不得产生第二 Handoff store、attachment migration service 或 replay ledger。

## 9. Studio 的边界

Studio 默认继承 Synara 的 container、managed workspace、output、reactor、draft cwd、local environment、no-worktree/branch、visibility 与 restore 语义；Provider workSurface 仍是 `chat`，但 ProductSurface/Prompt overlay 是独立的 `studio`。全局 Pi Tool/Extension/Skill/Prompt 默认共享；Studio managed cwd 与 workspace instructions 不授予 project-local Pi trust，也不触发 ambient local Skill/Prompt/Extension discovery。Chat Host Browser-only 不扩张到 Studio；Studio 使用当前全局启用且运行时可用的 Host 集合。

## 10. 当前 OmniMind source 事实

以下观察绑定 `533fa40f…`，不是目标设计。

### 10.1 已经存在且方向正确

- `PiAdapter.ts` 在该历史 snapshot 已有共同 identity/cognitive contract 和 Chat/Agent 两个窄 overlay；当时 Studio 仍误用 Chat contract；
- `ProviderCommandReactor.ts` 已按 `project.kind === "project" ? agent : chat` 投影；
- Chat 首次发送会创建日期/slug 管理目录并 scaffold `work/outputs`；
- RightDock 已复用 workspace Explorer，文件变化进入现有查询/刷新链路；
- `Send to Agent` 已在 Chat header 有入口；
- Chat ResourceLoader 已是 `projectTrusted:false`、`projectContextRoot:false`；
- 显式 Skill 已有 structured delivered/failed 与 Timeline receipt；
- AgentGateway 每个 Tool 已有结构化 `requiredCapability`；
- `omnimind_update_tasks` 已是独立 Pi Session Extension，并投影现有 canonical task event；
- filesystem reveal 已有跨平台 owner。

### 10.2 当前实现与目标不一致

- Sidebar 仍只有 `threads | studio`，并把 `studio` 文案映射为 Chat；普通 Chat 不是独立一级 surface；
- 当前 OmniMind 使用 segmented control，没有采用 Synara 描述式 Menu/Radio；
- Chat landing 仍显示 Project/folder picker；
- `chatFirstSend.ts` 中 Home Chat 选择 folder 会进入已有普通 Project或创建 `kind:"project"`，隐式升级为 Agent；
- 当前 `Send to Agent` 打开 Project picker/fresh Project draft，但尚未证明带入完整 contextual fork；
- Todo extension 只在 `workSurface === "agent"` 注册；
- AgentGateway Host projection 没有 work-surface filter，所有 Provider Session 使用同一全局 exposed Host surface；
- current Built-in group 粒度无法直接表示 Chat Browser-only；
- unified Skills catalog 给 cwd 时扫描 Project roots，与 Chat ResourceLoader global-only 不完全一致；
- RightDock Explorer row 缺 absolute `revealPath`；
- current Chat prompt 只在“修改 existing project”时提示 `Send to Agent`。

### 10.3 当前架构文档也尚未同步

当前 README/architecture 仍把 `Agent | Chat` 写成唯一两个一级入口，并把 Home/Studio 合在 Chat；`architecture/execution.md` 与旧 Todo 研究仍写 Todo Agent-only；Host 研究仍写 all-agent strong Host parity，没有区分 Chat surface policy。

这些文件代表当前有效架构，不代表维护者 2026-08-21 的新目标已经实现。未来获授权变更必须同步 sole owners，不能只改代码或只依赖本文。

## 11. Synara exact-source 事实

Synara clean exact `57f48ef…` 提供：描述式 `SidebarSurfacePicker`；独立 `showChatsSection/showStudioSection`；Home Chat 与 Studio container/list/landing；普通 Chat `work/outputs`；普通 Engine tools，无 `chat_files.*`；Project Skill discovery scope；以及 Home Chat folder mention 自动升级 Project。

因此本轮不是完全照抄 Synara：应吸收 Synara 已有的 Chat/Studio container 分工与 Menu/Radio 交互，并按维护者裁决把 Agent/Chat/Studio 组织成 OmniMind 三个一级 surface；同时明确否决 folder mention 自动升级 Project，以 `Send to Agent` 作为唯一升级入口。这是窄 OmniMind divergence，不授权重写 Synara substrate，也不能把“三个一级 surface”倒写成 Synara 已经存在的原生结构。

## 12. Pi 生态事实

- Pi ResourceLoader 原生拥有 global/project Skill、Extension、Prompt、Package 的发现、precedence、冲突与 reload；
- OmniMind 不 fork/patch Pi 来实现 Chat 模式；
- product-bundled inline Extensions 只装配自己拥有的 Todo 与 Host projection；
- Tool source、active set、available、authorized、executed 是不同事实；
- global resource 默认跨工作面共享，与 Pi 的单一 lifecycle 更一致；
- Project trust 应由明确 Project admission 产生，不能由 Chat 引用路径或 managed cwd 猜测；
- stock Pi 与其他 Engine 继续拥有自己的 identity/private home/native ecosystem。

## 13. Proma 证据的适用范围

Proma 源码中存在受管 `workspace-files/`、session/workspace attached files/directories、文件浏览与 `showInFolder`。它支持“对话围绕普通文件和显式引用工作，不必把每个结果产品化为下载任务”的直觉。

但 Proma 的 AgentWorkspace 与 OmniMind inherited Project/Thread/Studio owner 不同。本文只吸收用户结果，不吸收它的 store、IPC、Memory、MCP、Workspace manager 或权限模型。

## 14. 目标—现状漂移表

| 主题                | 维护者确认目标                        | `533fa40f…` 当前事实                                             | 未来 owner                                  |
| ------------------- | ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| 一级工作面          | Agent / Chat / Studio                 | Agent / 被称为 Chat 的 Studio                                    | Workbench + Product State                   |
| Sidebar picker      | Synara 描述式 Menu/Radio              | 双 segmented control                                             | Workbench                                   |
| Chat Primary Folder | 不存在                                | landing 可选择 Project/folder                                    | Workbench + Product State                   |
| folder 引用         | read-oriented reference，不升级       | 首发自动进入/创建 Project                                        | Product State                               |
| Chat workspace      | per-chat managed `work/outputs`       | 已存在                                                           | Product State + filesystem                  |
| Chat file tools     | 普通 Engine tools                     | 已存在，无 `chat_files.*`                                        | Engine native owner                         |
| RightDock reveal    | preview + explicit reveal             | preview 已有，Explorer reveal 缺接线                             | Workbench                                   |
| Chat Prompt         | Project 化时建议 Send to Agent        | 仅 existing-project modification                                 | Execution                                   |
| Pi global resources | 默认全模式共享                        | 大体共享；Todo 是例外                                            | Execution                                   |
| Chat Todo           | 开                                    | 仅 Agent 注册                                                    | Todo Extension owner                        |
| Chat Host           | Browser-only                          | 全局 Built-in policy，无 surface filter                          | AgentGateway + adapter projection           |
| Chat Skills         | global ambient + explicit selection   | runtime global-only；catalog 可能扫 managed cwd 的 project roots | Skills discovery + ResourceLoader admission |
| Send to Agent       | contextual fork 到新/旧/指定 Project  | 打开 Project draft/picker；上下文续接未闭合                      | Product State + Workbench                   |
| 其他 Engine         | native 保留 + 最小 overlay/Host/Skill | 各 adapter 能力不一                                              | Provider adapters                           |
| Studio              | follow Synara                         | 已有特殊 workspace/output/reactor                                | 既有 Studio owners                          |

## 15. 明确否决与 stop-loss

### 15.1 明确不做

- 不新增 `chat_files.list/read/search/create_artifact`；
- 不新增 Chat Artifact Manager、download center、export pipeline 或第二 outbox store；
- 不为 Chat/Agent 各维护一套 Pi global Tool/Extension/Skill/Prompt；
- 不建立 Mode Tool Registry、Tool dashboard 或 per-tool UI permission matrix；
- 不按英文 tool 名称猜能力；
- 不用 cwd、路径、pane 或 Provider 猜 surface；
- 不让 `+ 添加文件夹` 自动创建/切换 Project；
- 不让 Chat folder picker 与 `Send to Agent` 并存为两个 Project 入口；
- 不把 Prompt 当安全沙箱；
- 不复制或 fork Engine native Session；
- 不为 Studio 新增第三 Provider workSurface；
- 不因其他 Engine 能力不同而建 compatibility layer；
- 不重做 Studio；
- 不复制 Proma 的 Workspace/Memory/MCP owner；
- 不把本研究写成已经交付、已安装或已验收。

### 15.2 必须停下重新对齐的信号

- 实现需要新增持久对象、数据库 migration、第二 Skill/Tool/Artifact owner；
- Chat Browser-only 只能靠工具名硬编码或复制 catalog 才能做到；
- folder reference 会隐式获得 Project trust 或 project-local resources；
- `Send to Agent` 需要 replay 已执行 operation 或复制 Engine private state；
- 其他 Engine 为了统一被删掉 native 能力或注入伪造工具；
- RightDock 为 reveal 新建第二文件浏览器；
- Todo 为 Chat 新建 store/schema/UI；
- Studio 行为因共享 Chat runtime overlay 被降格；
- Product 文案出现 Host、ResourceLoader、scope、adapter 等内部术语；
- 只通过 Prompt 测试就宣称 filesystem 隔离或 authority 闭合。

## 16. 未来 owner 同步顺序

本轮实施与后续复验的最小完整顺序：

1. 先把 `README.md` 与 `architecture/workbench.md` 的一级工作面从两面同步为三面，并明确 Synara Menu/Radio；
2. 在 `architecture/product-state.md` 固定 `Project kind → product surface → provider workSurface`、Chat reference 与 `Send to Agent` contextual fork；
3. 在 `architecture/execution.md` 固定 shared Pi-global default、Chat Todo、Chat Host Browser-only、Skill global/project admission 与其他 Engine honest-degrade；
4. 更新被本轮 supersede 的 Todo/Host research 路由，但保留历史证据；
5. 沿真实调用链做最小实现，不新建 owner；
6. 更新 `execution-brief.md` 只描述当时真正正在做的关注点；
7. 最后按 active Campaign 记录证据，不在研究文档里冒充状态。

## 17. 未来最小验证矩阵

### 17.1 Prompt 与能力

- Agent/Chat/Studio identity core exactly once；三个 overlay 不串面，Studio 不误吃 Chat contract；
- immutable Prompt 不含动态 Host catalog；下一 Turn 的 mutable guidance、tools/list 与 tools/call 共同反映最新 admission；
- Chat 在任务 Project 化时推荐 `Send to Agent`，不是只匹配“修改项目”；
- OmniMind Chat 真实 request 含 native tools、Todo、Browser，不含 thread/Automation/Diagnostics/Device Host tools；
- OmniMind Agent 既有能力不回归；
- simple Chat 不被强制调用 Todo；long research 可以更新 Todo；
- stale Session 的被禁 Host call 在 Gateway admission fail closed；
- 其他 Engine 保留 native tools，支持 seam 时获得最小 Chat overlay/Browser，缺 seam 时诚实降级。

### 17.2 文件与 workspace

- `/chat` 无 Primary Folder picker；
- `+` 可添加 file/folder reference chip；
- reference 不改变 Project kind、cwd、trust 或 project-local resources；
- 首轮创建唯一 per-chat managed workspace 与 `work/outputs`；
- 写入后 RightDock 实时出现；点击 preview；context menu reveal 到正确 absolute path；
- 用户明确指定目标路径时不暗中复制；
- 关闭重开后 workspace、引用和文件展示按现有 owner 恢复；
- 不出现 `chat_files.*` 或第二 Artifact 状态。

### 17.3 Skill

- Chat ambient catalog 只含 global scopes；
- managed cwd 祖先中的 `scope: project` 不泄漏到 Chat；
- Agent 在受信 Project 中正常发现 project-local Skills；
- Chat 显式选择全局 Skill 可 delivered/failed，回执不宣称模型遵循；
- Pi/global Tool/Extension/Skill/Prompt 在 Chat、Agent、Studio 默认共享；
- same-name conflict 继续服从 native precedence/provenance。

### 17.4 `Send to Agent`

- 右上角是唯一 Project 升级入口；
- 可新建、选已有或选 folder；
- 原 Chat 保留；新 Agent Thread 属于正确 Project；
- 带入经过明确裁决的上下文与 refs；
- 不 replay、不开旧 Session clone、不热切 Chat cwd；
- 引用丢失、Project 创建失败、Provider 不支持 continuation 时准确呈现；
- 关闭重开后两个 Thread 身份和 Project 归属准确。

### 17.5 三面 UI

- Agent/Chat/Studio 菜单 title、description、check、keyboard、focus return、reduced motion；
- 三类列表、new action、Recent View、missing-thread fallback 不串面；
- 815px 与 390px 无横向溢出；
- Activity/PR/Kanban 只使用 Agent Project 集合；
- Studio output/reactor/draft cwd 不回归；
- 中英文 catalog parity，普通表面无内部实现术语。

## 18. 复验触发器与证据索引

只在以下事实变化时重审对应部分：OmniMind HEAD、adopted Synara head 或 bundled Pi runtime；Pi discovery/precedence/tool composition；AgentGateway group/capability/catalog/projection；Project kind/Home Chat/Studio/route/restore；attachment/reference/workspace/RightDock/filesystem authority；`Send to Agent` 的真实 handoff seam；代表性 Chat journey 出现显著 schema/attention、误调用、安全或跨 Engine 反证；或维护者改变全局 Pi 资源共享、Chat Host Browser-only 裁决。

主要证据入口：

- Prompt 与 Pi composition：[`apps/server/src/provider/Layers/PiAdapter.ts`](../apps/server/src/provider/Layers/PiAdapter.ts)
- inline Extension composition：[`apps/server/src/provider/omnimindSessionExtensions.ts`](../apps/server/src/provider/omnimindSessionExtensions.ts)
- Todo Extension：[`apps/server/src/provider/omnimindTaskListExtension.ts`](../apps/server/src/provider/omnimindTaskListExtension.ts)
- workSurface projection：[`apps/server/src/orchestration/Layers/ProviderCommandReactor.ts`](../apps/server/src/orchestration/Layers/ProviderCommandReactor.ts)
- Chat first-send：[`apps/web/src/lib/chatFirstSend.ts`](../apps/web/src/lib/chatFirstSend.ts)
- Header handoff：[`apps/web/src/components/ChatView.tsx`](../apps/web/src/components/ChatView.tsx)
- Skills catalog：[`apps/server/src/provider/skillsCatalog.ts`](../apps/server/src/provider/skillsCatalog.ts)
- AgentGateway catalog：[`apps/server/src/agentGateway/Layers/AgentGateway.ts`](../apps/server/src/agentGateway/Layers/AgentGateway.ts)
- Host capabilities：[`apps/server/src/agentGateway/Services/AgentGatewaySessionRegistry.ts`](../apps/server/src/agentGateway/Services/AgentGatewaySessionRegistry.ts)
- managed Chat workspace：[`apps/server/src/wsRpc.ts`](../apps/server/src/wsRpc.ts)
- RightDock Explorer：[`apps/web/src/components/chat/workspaceExplorer.tsx`](../apps/web/src/components/chat/workspaceExplorer.tsx)
- filesystem context menu：[`apps/web/src/lib/fileReferenceContextMenu.ts`](../apps/web/src/lib/fileReferenceContextMenu.ts)
- 历史 Prompt 证据：[`omnimind-prompt-management-review.md`](omnimind-prompt-management-review.md)
- 历史 Todo 证据：[`pi-native-todo-extension-review.md`](pi-native-todo-extension-review.md)
- 历史 Host 证据：[`agent-tools-mcp-settings-review.md`](agent-tools-mcp-settings-review.md)

## 19. 最终研究裁决

`CONVERGED PRODUCT DIRECTION / NOT YET ARCHITECTURE-SYNCHRONIZED OR IMPLEMENTED`

维护者的 taste 可以归结为：让能力像 Pi 一样只有一个真实生命周期，让 Prompt 像模块一样组合，让工作面只表达用户意图，不用模式名复制底层系统。

Chat 应强大但不着相：它拥有 Engine-native 能力、全局生态、Browser 和 Todo；没有 Project cwd、ambient Project trust、默认多会话编排和一堆 Chat 专属工具。文件就是受管目录里的普通文件，外部材料就是明确引用，项目化只有一个 `Send to Agent`。Agent 与 Chat 的区别主要来自目标、上下文边界和 Prompt 侧重，而不是两套内核。

这条路线同时最小化用户认知、Prompt 漂移、schema 负担、owner 数量、跨 Engine 伪统一和长期维护成本。
