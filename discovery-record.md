# OmniMind — Discovery & Decision Record

本文件只保存为什么作出当前裁决，以及哪些判断仍需证据。产品定义和架构以 `README.md` 为唯一真相；本文件不得成为第二份规格。

## 1. 当前收敛摘要

创立者明确确认：

- 战略上重注 Pi，目标是承接其未来成熟生态；
- OmniMind 要成为 Pi 使用体验最好的 GUI 和桌面发行层；
- 产品公开 `Powered by Pi`，不刻意隐藏来源，也不冒充官方产品；
- Pi 获得唯一 Gold Path；其他 Coding Agent 保持真实 Engine 出口，但不追求同深度；
- U1 的颜值、交互和多 Engine 心智值得整体吸收，但其 Runtime/Provider ontology 不值得继承；
- 没有用户和兼容负担，允许删除、重命名、重构全部错误代码、文档、状态与投入；
- 长期可维护性、真实失败、来源权利和工程证据高于短期拼装速度。

一句话裁决：

> OmniMind 是 Pi-native desktop distribution + experience/governance layer + external-engine escape hatch。

## 2. 本轮外部与源码证据

### 2.1 Pi 已经从 coding loop 向生态底座演化

固定本机研究 revision `c6eb6281a806a9c5d7ec41d2850692f7f7ebcb59` 显示：

- monorepo 已有 AI/provider、agent core、coding agent、TUI、client、protocol、experimental server 和通用 AgentHarness；
- Provider、Model、Thinking、Session、Compaction、Branch、Tool、Skill、Extension 与 Package 已形成真实生态；
- AgentHarness 正在加入 repository abstraction、locking、durable accepted prompts/runs、queue、recovery、effect boundary 等能力；
- durability v2 同时存在不同候选设计，生命周期、settlement 和部分 API 仍明确 provisional；
- 供应链、固定依赖、发布 artifact 和 smoke test 正在增强。

影响：Pi 已经足够强，OmniMind 不应再建设竞争内核；但 Harness v2 尚不足以成为现在的持久 schema 宪法。

### 2.2 Package 数量是机会，也是风险

2026-08-03 的官方目录显示数千个 Package，覆盖 MCP、Subagent、Workflow、Permission、Browser、LSP、Memory、Observability 等方向；官方 Model catalog 也已达到千级规模。

同时，Pi Package/Extension 可以执行任意代码，gallery 发现不能证明成熟、兼容或安全。生态真正缺少的是：

- exact artifact 与来源；
- rights、install scripts、native dependency 和权限检查；
- Pi/Node/platform 兼容矩阵；
- Headless、structured UI、PTY 与 unsupported 分级；
- safe-boundary activation 与 LKG rollback；
- 面向普通用户的安装、诊断和恢复。

影响：OmniMind 的核心机会不是复制 Package，而是成为最可信的 Pi 桌面分发与体验层。

### 2.3 SDK、RPC 与进程边界

Pi SDK 能直接访问 native Session、ResourceLoader、Extension lifecycle 和状态；RPC 适合隔离、测试和语言中立，但当前 UI/control/package 管理覆盖不能代表全部 Pi 能力。社区项目给出的共同证据是：

- 直接把 SDK 放入 Electron Main 会共享崩溃域、环境和第三方代码权限；
- 成熟实现逐渐转向 Node backend、utility process 或 sidecar；
- official client/protocol/server 正在形成，但仍是 experimental；
- 最稳的当前边界是 SDK in isolated worker，产品 IPC 可替换。

影响：Gold Path 锁为 SDK worker，不锁内部传输；Electron Main 只做桌面控制和监督。

### 2.4 U1 的价值与危险

固定候选 revision `6aca3dcc505894481430967c2acb762b3dd1b358` 证明 U1 已有成熟 renderer、设计语言、桌面工作台和多 Engine 体验；也存在大量 provider-specific adapter、静态 defaults/capability 分支和 donor runtime/state 假设。

其 LICENSE 文本版权指向 T3 Tools Inc.，README 又说明项目源自另一个上游工作台。实际采用必须复核 Git history、原始来源、第三方贡献和资产，而不能只相信当前仓库的 MIT 标签。

影响：完整接管 UI 物理母体，保留 runnable baseline；随后换脑，不继承 ontology。权利审计是进入条件，不是收尾补文档。

## 3. 核心推断

以下是基于证据的产品/架构推断，不冒充已经验证的事实：

1. Pi 最可能持续快速扩大生态，但 API 与 durable Harness 仍会变化；OmniMind 应靠进程和投影边界吸收变化，而不是冻结内部 shape。
2. Pi 上游如果推出 GUI，单纯“漂亮客户端”会被商品化；Package trust/distribution、桌面工作流、Remote、恢复和跨 Engine 才能形成独立价值。
3. Engine 平权会迫使产品采用最低公分母，直接损失 Pi Package、Thinking、Branch、Compaction 和 Session 优势。
4. 产品仍需可见 Conversation 与轻量 Run receipt，否则无法跨 Engine、解释权限/副作用或在 Session 丢失后保持用户工作可读；但这不需要第二套 execution journal。
5. Package full compatibility 与强安全隔离是冲突目标。首版必须以 trust lane 和诚实能力分级处理，不能用“沙箱”文案掩盖平台不足。

## 4. 决策账本

### 已确认

- Pi 是唯一 bundled-native Gold Path；
- OmniMind 公开 Powered by Pi；
- SDK 运行在 isolated worker/sidecar，不进入 Electron Main；
- Pi 拥有 native Session/Package 执行事实；
- OmniMind 拥有桌面产品、可见 Conversation、Package 分发治理和跨 Engine 连续性；
- 外部 Engine 通过 ACP/official protocol 进入，能力不强求齐平；
- U1 完整源码先作为 runnable UI baseline，再换脑；
- 旧自研 runtime/journal/extension skeleton 删除；
- Package Catalog/Curated/Verified 与 Native/Bridged UI/PTY/Unsupported 分级；
- 无用户兼容义务，不为错误命名和 schema 留迁移双轨。

### 假设

只剩两个高影响假设，均有验证方法：

1. **Pi SDK 能在隔离 Host 中无损承接首批成熟 Package。** 通过一个 headless Package、一个 raw-UI Package、Session/restart/cancel 和三平台路径验证。
2. **U1 的权利链允许完整接管并显著改造。** 通过 Git history、原始 upstream、贡献者和资产 license 审计验证；失败则保留交互规格，改用 clean implementation，不带入受疑代码或资产。

### 待验证，不需要创立者先回答

- Pi AgentHarness 当前哪一层 API 已足够稳定；
- 官方 package/API 与 fixed source/fork 哪条提供最小长期 delta；
- Host 按 profile、generation 还是 Conversation 隔离的性能/故障最优点；
- OS Secret Store 注入与 Pi OAuth/AuthStorage 的正式 seam；
- structured package UI 的最小上游 contract；
- Windows/Linux 的强制边界和 PTY/worker 差异；
- 第一个真实 Package 和第一个外部 ACP Engine 的候选。

### 被否决

- Pi 可替换性优先的中立工作台；
- 所有 Engine 平权；
- 隐藏 Pi 身份或冒充 Pi 官方 GUI；
- Pi SDK in Electron Main；
- direct RPC 作为 bundled 产品宪法；
- Pi-through-ACP 作为 bundled 主链；
- 自研 Extension Loader/Agent Harness/完整 execution journal；
- U1 Provider/runtime/state 整体继承；
- Package 数量等于成熟度；
- 静默信任、静默更新、静默 fallback；
- 把进程隔离宣传成安全沙箱。

## 5. 反方压力测试

### Strategy

反方：Pi 可能改变 API、转向别的协议，或上游直接推出 GUI，OmniMind 的投入会被吃掉。

裁决：如果价值只来自 embedding，这个反方成立。因此 OmniMind 的独立资产必须是 Package trust/distribution、桌面工作流、文件/Remote、恢复、跨 Engine 和上游关系。Pi integration 只存在于窄 Host 边界，产品事实不依赖某个 wire shape。

### Execution

反方：完整 U1 接管、Pi 快速演化、Package 任意代码和三平台隔离叠加，范围极易失控。

裁决：不并行做“大平台”。先 provenance baseline，再交付一个 Pi Chat vertical slice，再做一个真实 Package，再接一个外部 Engine。每一步删除替代路径，不建立长期双轨。最脆弱的 U1 rights 和 Pi Host seam 在最前面证伪。

### Adoption

反方：只偏爱 Pi 会失去不喜欢 Pi 的用户；暴露真实能力差异会让多 Engine 体验不统一。

裁决：OmniMind 不需要服务所有人。默认用户选择的是最好用的 Pi 产品；其他 Engine 是逃生口和扩展面。统一的是 Conversation、文件、输出、权限诚实和桌面体验，不是伪造每个 Engine 都有相同 Branch、Package 或 Thinking。

## 6. 成功与失败信号

成功信号：

- Pi 新 Model/Thinking/Package 能以小边界更新进入 OmniMind；
- 一个成熟 Package 无需改包即可原生运行，并能准确报告权限与兼容；
- worker 崩溃不击穿桌面与产品存储；
- 可见 Conversation 与 Pi Session 各自恢复且不竞争权威；
- U1 的流畅体验被保留，donor runtime/identity 被删除；
- 第二个 Engine 接入没有迫使 native path 重写或产生 switch 蔓延。

失败信号：

- OmniMind 开始维护 Provider/Model/Thinking 静态镜像；
- Package 必须改写成 OmniMind 私有格式；
- renderer 理解 Pi/ACP raw events；
- 产品数据库复制 Pi transcript、queue、Todo 或 Workflow；
- 每加一个 Engine 都增加跨全仓库分支；
- “安全”“恢复”“兼容”只由 UI 或单元测试宣称，没有真实拒绝/崩溃/跨平台证据。

## 7. 本轮收口

Converge gate 已满足：产品身份、主路径、权威、失败边界、阶段、验收和长期维护均已明确；两个剩余高影响假设都有前置验证路径。后续不再重复战略发现，直接按 `execution-brief.md` 施工，只有 U1 rights 失败或 Pi SDK 无法支撑 native Package 这类结构性反证才重新进入收敛。
