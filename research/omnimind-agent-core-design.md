# OmniMind Agent Core：最小运行时、能力包与跨 Engine 继承

> 证据日期：2026-08-12
>
> 文档角色：Agent Core 的研究设计与当前证据地图。本文解释“为什么这样收敛、现有代码真实到哪里、候选来源应如何处置”。
>
> 权威边界：本文不是产品架构 owner、施工顺序或 Campaign 状态。若与 `architecture/*`、`execution-brief.md` 或 active Campaign 冲突，以对应 sole owner 为准并停止实施。

## 0. 给新会话的结论

OmniMind 不应该再造一个“拥有 Agent Team、Goal、Workflow、Memory、Wiki、Resume、Computer Use 的超级 Agent 平台”。那会把本来可以组合的行为固化成多个 registry、数据库、scheduler 和状态机，既昂贵又难维护。

更强、更简单的结构是：

```text
OmniMind Product substrate + Workbench
├─ selected Engine native ecosystem
│  ├─ Codex / Claude Code / OpenCode: native runtime, session and ecosystem
│  └─ OmniMind Agent: Pi-derived runtime + minimal Agent Runtime Core
└─ verified additive OmniMind Capability Packs
   └─ rendered and mounted through each selected Engine's proven seam
```

其中：

- **Pi 是 OmniMind Agent 的默认内核**，因为它提供了足够小、可继承、可扩展的 runtime/session/resource/tool 原语；
- **Core 是运行保证，不是功能库存**；
- **Agent 团队、目标、动态工作流、知识库、记忆、会话恢复、Computer Use** 是原语的组合或能力包，不各自成为平台；
- **Codex、Claude Code、OpenCode 保留自己的完整 native ecosystem**，OmniMind 只通过官方 seam 加法挂载兼容能力；
- **Agent Runtime Core 只属于 OmniMind Agent**；它不是套在 Codex、Claude Code 或 OpenCode 外面的共同运行时；
- **开箱即用不等于常驻上下文**：能力可以预装、可见、零配置，但只有调用时才加载正文或启动运行时；
- **高 cache 不是另建 cache 系统**：靠稳定而瘦的前缀、确定工具顺序、JIT 读取、native compaction/resume 和准确 usage truth 获得；
- **外部项目先作为 exact comparator/donor 受控实验**。能配置就不 fork，能翻译机制就不运行整包，没有净收益就拒绝。

本文故意不保存任何施工阶段名或 next action。产品施工必须在当次会话实时读取 `execution-brief.md`；它没有明确准入对应独立 Slice 时，本文只支持研究、Gate A intake 与任务隔离实验，不构成实施授权。

## 1. 设计目标与约束

维护者希望得到的不是 feature checklist，而是一个可长期继承的 Agent：

1. 简单：最少常驻 owner、状态、进程和 prompt；
2. 可扩展：Skill、Tool、MCP、package、Engine seam 可按需增加；
3. 能力强：能委派、并行、继续、恢复、使用设备和积累知识；
4. 高性能：少搬运上下文，输出有界，失败及时收口；
5. 高 cache、低 token 成本：稳定前缀但不缓存垃圾；
6. 好维护：上游能力可继承，patch 可删除，来源可复验；
7. 对新手友好：安装后能看见、能理解、能直接使用，不要求配置一套 Agent 工程。

这些目标之间有真实张力：

- 更多默认工具和说明会提高“看起来能做什么”，却增大 schema、注意力和 cache invalidation；
- 自动 memory 是新手开箱即用的合理默认，却要求稀疏抽取、scope、provenance、遗忘与 native owner 边界；Knowledge 围绕任务实际使用的 durable source 自动编译时，又有遗漏、陈旧、并发与内容污染风险。两者可以共用一个 file-world 和 writer，但不能用一个开关或页面类型混掉；
- 多 Agent 平台提高编排表达力，却引入协调 token、第二 Run/Goal/Scheduler 和恢复状态；
- fork 能快速得到控制，却把上游高频变化变成永久追赶成本。

因此奥卡姆剃刀的判据不是“代码行最少”，而是：**用最少长期责任闭合完整用户结果。**

## 2. 术语与权力边界

### 2.1 Product Thread 与 Engine Session

- **Product Thread** 是 OmniMind 产品事实，包含可见对话、队列、receipt、恢复与 Workbench 投影；
- **Engine Session** 是 Codex、Claude Code、OpenCode、Pi 等运行时的 native session；
- Product Thread 同时最多绑定一个 foreground Engine Session，但两者不能伪装成同一状态机；bounded child/independent Engine Session 只能以显式 parent/origin 旁生存在；
- 切换 Engine 只对下一次发送生效，并先停止旧运行；跨 Engine 只能共享可审查 artifact/handoff，不能声称恢复了另一个 Engine 的 latent reasoning。

### 2.2 Model delegation 与 Engine orchestration

- **Model delegation**：在 OmniMind Agent/Pi 语义内启动一个有界 child，使用指定 model、tool、context 和预算，返回结果给 root；
- **Engine orchestration**：创建独立 Codex/Claude/OpenCode native Session/Thread，保留其原生 auth、permission、resume、plugin 和工具语义。

默认应该使用前者。只有任务必须依赖另一个 Engine 的 native semantics 时，才使用现有 Host Gateway 创建独立 Product Thread。不能为了“多模型”把所有 delegate 都升级成跨 Engine Thread。

### 2.3 Core、Capability Pack 与 native ecosystem

- **Agent Runtime Core**：OmniMind Agent 能力运行所依赖的最小、稳定保证；不包裹其他 Engine；
- **Bundled Capability Pack**：OmniMind 策展、预装、可见、按需激活的行为与资产组合；
- **Engine-native ecosystem**：每个 Engine 自己的 skills、plugins、hooks、commands、MCP、auth、session 与 permission；
- **OmniMind Library**：带 provenance、版本和兼容声明的 OmniMind-owned skills/能力资产；
- **Workbench**：把真实来源、可用性、运行、结果和失败投影给用户，不替代底层 owner。

### 2.4 “可用”必须拆成五种状态

```text
packaged → available → activated → invoked → context-loaded
```

- `packaged`：随软件交付；
- `available`：当前 Engine/profile/权限真实兼容；
- `activated`：用户或产品已让当前任务可使用该能力；
- `invoked`：模型或用户实际调用；
- `context-loaded`：正文、schema 或知识被放入活动上下文。

不能用一个 `enabled` 混淆五种状态。默认策略是：**batteries included, context excluded**。

## 3. 最小 Agent Runtime Core

Agent Runtime Core 只定义 OmniMind Agent 必不可少的运行保证。它不是用户功能目录，也不是跨 Engine orchestration。任何新增 Core 项必须证明无法由现有保证、Product substrate 或按需能力包组合得到。

| Core guarantee | 真实职责 | 不拥有 |
|---|---|---|
| Model/Auth target truth | exact provider/model/options/auth readiness | Model marketplace、第二凭据库 |
| AgentSession lifecycle | prompt、steer、follow-up、abort、idle/settlement | Product Thread、Goal queue |
| Native durability | session JSONL、resume、branch、compaction | 跨 Engine latent continuation |
| Capability discovery | ResourceLoader、Skill/Tool 可用性、权限与来源 | 统一伪 plugin runtime |
| Minimal workspace tools | `read/bash/edit/write` | 重型 IDE/runtime platform |
| Bounded delegate | focused child、exact model/tools/context、result/provenance、cancel/timeout/usage | Fleet、Mission、Scheduler、第二 Team state |
| Result-driven native loop | root 看到工具/child 结果后继续决策，允许有界并行 | DSL、DAG、Workflow DB |
| Runtime economics truth | input/output/cacheRead/cacheWrite/latency/settlement | 新 cache service |

Core 的核心不变量：

1. 只有一个 Product Thread/Queue/receipt/recovery owner；
2. 每个 Engine Session 只有一个 native lifecycle owner；一个 Product Thread 同时最多绑定一个 foreground Engine Session；
3. bounded child 或独立 Engine Session 可以并存，但每个都有明确 parent/origin/cancel/settlement，且不能接管 foreground lifecycle；
4. 一个运行只有一个 terminal settlement；
5. child 的 model、tools、context、budget、origin 可追溯；
6. capability 不可用时明确失败，不偷偷退化；
7. private home、auth、permission 留给真实 owner；
8. tool/schema/prompt 顺序在 session 内尽量冻结；
9. 正文 JIT 读取，工具输出有界；
10. OmniMind-owned derived durable state 必须可审查、可导出、可删除；Engine-native session durability 服从其 native owner 的 retention 与 restore 语义。

### 3.1 Product integration boundary，不属于 Core

以下机制重要，但已有更高层 owner，不能塞进 Agent Runtime Core：

| 机制 | 真实 owner | Core 只需要提供什么 |
|---|---|---|
| Exact Engine escape hatch | 现有 Product Orchestration、Provider adapters 与 Host child Thread | child/result/provenance 可投影，不把它变成默认 delegate backend |
| Product Thread、Queue、receipt、recovery | `architecture/product-state.md` 对应产品 owner | native lifecycle 与 terminal truth |
| Workbench availability/origin/status | `architecture/workbench.md` 与现有 projection | 可查询的真实 capability/result/diagnostic |
| Browser/Device/Automation | 现有 Gateway、Thread runtime mode 与 Product Automation owner | 受 caller mode、scope 和当前 turn authority 约束的 tool call |

边界层可以翻译、投影和路由，不能复制 Engine lifecycle 或建立第二控制面。

## 4. 用户能力如何由 Core 组合

下表是机制拆解，不是固定功能清单、导航数量或承诺“必须有十项”。真实 journey 若证明两个概念应合并、一个概念不需要独立入口，或出现新的能力组合，应修改产品表面而不是新增 Core owner。判断标准始终是用户结果与唯一 lifecycle，不是沿用今天的名词。

| 用户可见能力 | 最小机制 | 不应新增的实体 |
|---|---|---|
| Agent 团队 | 多个 bounded delegate + root synthesis + Workbench origin | Team registry、Fleet scheduler |
| 目标 | 一个 active objective 的 continuation/complete/blocked/wait policy | Goal database、Goal queue、第二 lifecycle |
| 动态工作流 | root 读取结果后在同一 native loop 决定下一步；必要时并行 tool calls | 默认 workflowScript/DSL/DAG/journal |
| 知识库 | 普通任务实际使用 durable sources 后，自动维护 workspace-scoped evidence、linked Markdown 与 index；JIT search/read | “更新知识”按钮、首次写入审阅、向量库、graph、daemon、全局 vault |
| 记忆 | settled 后有界、稀疏、自动提取高价值 preference/constraint/project fact；按需召回并可查看/纠正/遗忘 | 保存全部 transcript、逐条回执、复制 Engine-native memory、第二数据库 |
| 会话恢复 | Engine-native resume/compaction；跨 session 用 artifact/handoff | OmniMind 伪造 latent state |
| Computer Use | 现有 Browser/Device Gateway tools + caller Thread runtime mode | 第二设备控制栈、每个 Host tool 再发明一层 approval |
| Todo | 当前步骤的轻量任务资产；继续复用已采用 `pi-todo` | 项目管理平台 |
| Review/Verification | 按需 Skill + tests/checks + 可审查 receipt | 常驻 reviewer daemon |
| Search | 本地 `rg/read`；未来可选固定、窄 web route | 多 provider 自动 fallback 平台 |
| Automation | 现有产品 scheduler/automation owner | Agent Core 内第二 scheduler |

“Goal、Agent Team、Dynamic Workflow、Memory、Wiki”是产品语义，不是必须常驻的入口。多数应由自然语言或运行条件自动触发，只在有可行动状态时投影；UI 名称更不授权后台各建一套系统。

## 5. OmniMind 现有架构的真实起点

本节是代码导航，不替代 `architecture/*`。路径变化时先重新搜索 owner，不能依赖旧行号。

### 5.1 Pi runtime 与 session

`apps/server/src/provider/Layers/PiAdapter.ts` 已经：

- 使用 bundled Pi 的 ModelRuntime、AgentSession、SessionManager 和 ResourceLoader；
- 保留 Pi native session、compaction、extension/skill/tool 基础；
- 为 OmniMind Agent 使用独立 private state，不应触碰 stock Pi `.pi`；
- 把现有 OmniMind Gateway tools 转成 Pi native custom tools；
- 以 root session 运行最小 workspace tools。

当前重大缺口：adapter 在 `agent_end` 就释放 Gateway turn authority、清理 active turn 并发出 `turn.completed`，尚未消费 Pi `agent_settled`。`agent_end` 后仍可能存在 retry、follow-up、compaction 或 package continuation，因此 terminal proof 可能过早。任何 delegate/Goal continuation 之前，必须先用 `agent_settled`/`isIdle` 语义闭合唯一 settlement。

### 5.2 Usage 与 cache truth

`packages/contracts/src/providerRuntime.ts` 的 `ThreadTokenUsageSnapshot` 有 `cachedInputTokens`，但没有 `cacheWrite` 字段；`PiAdapter.ts` 只投影 Pi `cacheRead`。这会丢失 cache 写入与真实费用，不能用当前 Product 快照证明“高 cache、低成本”。

应先修投影真实性，再讨论策略：

- 保留 provider/Pi native usage；
- 区分未报告、真实 miss、branch/compaction 合法重置；
- 统计 input/output/cacheRead/cacheWrite/总价/TTFR；
- 不新建 cache owner。

### 5.3 Skill Library 已有但兼容声明过宽

现有链路：

- `apps/server/src/provider/skillsCatalog.ts`：统一 catalog、`~/.omnimind/skills`、selected provider native roots、exact physical identity 去重；
- `apps/server/src/provider/Layers/ProviderDiscoveryService.ts`：给所有 provider 投影 Skills discovery；
- `apps/server/src/codexAppServerManager.ts`：Codex app-server 用 `skills/extraRoots/set` 挂载 OmniMind root；
- `apps/server/src/provider/skillPromptInjection.ts`：非 native arbitrary roots 的 Engine 通过 turn-time text projection 使用 selected Skill；
- `packages/contracts/src/providerDiscovery.ts`：Composer 保存 `{name,path}`。

两项必须先修的 truth gap：

1. `ProviderSkillReference` 只验证任意非空 path，dispatch 随后直接读取该路径。被篡改的 client 可把任意可读本机文件 inline 给模型。必须改成 server-issued opaque identity，或在 dispatch 时重新证明 canonical catalog membership、allowed root 和 symlink containment。
2. `ProviderDiscoveryService` 让所有 provider 都看起来 `supportsSkill=true`，但 Claude/OpenCode/Pi 的部分来源其实只是 text projection，脚本、资产、依赖与 allowed-tools 未做 compatibility preflight。UI 必须区分 `native / projected-text / unavailable`，不能声称完整运行兼容。

### 5.4 OmniMind Gateway 已经跨 Engine

`apps/server/src/agentGateway/mcpInjection.ts` 与相关 transport 已经拥有：

- canonical OmniMind Gateway endpoint；
- per-thread bearer 与 active-turn authority；
- Codex overlay、Claude SDK MCP、ACP/OpenCode seam；
- Pi custom-tool projection；
- OmniMind threads/projects/browser/device/automation 等固定工具。

因此不要再用第三方 MCP adapter 指向同一个 Gateway。那只会产生第二 client、schema cache、credential、cancel 和 lifecycle owner。

当前还有一个必须在扩张 Capability Pack 或 external MCP 前修复的真实冲突债务：Gateway wire identity 固定为 `omnimind`。Codex session overlay 会替换其中原有的 `[mcp_servers.omnimind]`，Claude SDK 以 `mcpServers.omnimind` 注入，OpenCode 也以同名动态注册。它们通常不改写 Provider source home，但仍可能在有效 session 配置中静默遮蔽用户的 native same-name server；这违反 [`architecture/execution.md`](../architecture/execution.md) 的显式冲突要求。修复必须同时覆盖 wire namespace、existing-native detection、loaded inventory、origin 和用户可见诊断，不能只改 UI display name。

当前尚未存在的是：用户在 OmniMind 配置任意第三方 MCP 后，安全地投影到所有 Engine 的 canonical catalog。它需要独立的 credential、trust、isolation、conflict、transport 与 lifecycle gate，不能从“已有 Gateway”推断完成。

### 5.5 Provider-native child 与 workflow 已有投影

- `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts` 已把 Provider-native child materialize 成带真实 `creationSource` 的 Product Thread；
- `apps/server/src/provider/Layers/ClaudeAdapter.ts`、`claudeWorkflowRuntime.ts`、`claudeWorkflowScript.ts` 已处理 Claude private workflow projection。

这些实现证明 OmniMind 已有 Workbench truth 层，不需要再建 Team/Workflow registry。Claude workflowScript 是 provider-private 能力，不应被提升为所有 Engine 的默认 workflow 原语。

### 5.6 Runtime mode 当前只贯穿了一半

`packages/contracts/src/orchestration.ts` 已把默认 `RuntimeMode` 定义为 `full-access`；Codex 映射到 `approvalPolicy: never + dangerFullAccess`，Claude Code 映射到 `bypassPermissions`，OpenCode 映射到 allow-all。Provider command/file 主路径已经基本符合“用户选一次自动化程度”。

Host 路径却仍分裂：

- Device mutation 依赖 `isExplicitlyApproved`，production Gateway 未传 bridge，默认永远返回 false；因此所有 Agent tap/type/install/launch 都被拒绝；
- Browser effecting action 一旦触发 download 就无条件取消并返回 `BrowserDownloadApprovalRequired`；
- Pi-family session 保存 `runtimeMode`，但 adapter 明确不暴露 OmniMind approval request，因此 `approval-required` 只是被记录、没有可完成的行为；
- approval UI 的 “Always allow this session” 实际会把持久 Thread 切成 `full-access`，跨 runtime restart 保留。

这是当前最高优先级的用户真实性修复，不是新权限平台：沿现有 Thread mode 把 caller fact 传给 Gateway/Browser/Device，隐藏底层不能真实支持的模式，并把 UI 文案改成实际 scope。完整产品合同见 `architecture/product-state.md`、`architecture/execution.md` 与 `architecture/workbench.md`。

## 6. Bounded Delegate 设计

### 6.1 最小合同

一次 delegate 至少包含：

```text
task
exact model target
allowed tools/capabilities
context references (not whole transcript by default)
cwd/workspace scope
token/time/output budget
origin/provenance
cancel/timeout policy
```

结果至少包含：

```text
status: completed | failed | cancelled | timed_out
bounded result
artifacts/references
usage
model/origin
diagnostic without secrets
single terminal settlement
```

Root 拥有拆分、并行上限、验收、综合与是否继续。Child 不拥有 Product Goal、Scheduler、Engine switch 或长期 Team state。

### 6.2 默认执行路径

研究优先路径是复用 bundled Pi 的 runtime/session public seams，做一个有界 child executor 或最窄 extension surface。不要先引入完整 subagent platform。

只有任务明确需要 Codex/Claude/OpenCode native plugin、permission、resume 或工具语义时，才用现有 Host Gateway 创建独立 Engine Thread。Workbench 必须展示真实 origin，不能把 Host Thread 与 Pi child 混称为同一种 Agent。

### 6.3 并行与取消

- 并发是有界资源，不是越多越好；
- 同一 root 的 delegate 共享只读 context reference，避免复制全 transcript；
- workspace 写入默认需要显式 scope，冲突由 root 处理；
- root abort 必须传递给所有未 settled child；
- timeout 之后的 late result 不得重新推进 root；
- terminal settlement 必须晚于所有 retry/follow-up/cleanup；
- result 与 usage 进入现有 Product receipt/Thread 投影，不建第二 journal。

## 7. Dynamic Workflow：从结果驱动，而不是先建 DSL

最小 Dynamic Workflow 就是 native Agent loop：

1. root 形成当前假设；
2. 调用 tool 或多个 delegate；
3. 观察真实结果；
4. 根据结果选择继续、分支、验证、降级或结束；
5. 产出 artifact 和 terminal receipt。

这已经覆盖大多数“动态”价值：下一步由运行结果决定，而不是在开始前写死 DAG。

V1 不需要：

- 默认 `workflowScript`；
- 通用 JS workflow sandbox；
- DAG designer；
- Mission/Run/Step 数据库；
- background schedule；
- Team communication bus；
- workflow recovery journal。

如果代表性 journey 证明 native loop 无法提供确定并行、可恢复检查点或可审计控制流，再单独提出一个可证伪切片。不得从 package 已有 DSL 推断产品需要 DSL。

## 8. Goal、Todo 与 continuation

Goal 的最小语义是：一个 active objective 在当前 session 中何时继续、完成、阻塞或等待。它可以组合：

- current Product Thread；
- Pi native session/settlement；
- Todo 当前步骤；
- complete/blocked/wait tool/policy；
- stale completion、busy edit、queued input、retry/compaction guards。

Goal 不应拥有：

- 第二 Product Goal store；
- ordered Goal queue；
- 独立持久 session owner；
- 自动 schedule；
- 与 Product Queue 竞争的 continuation owner。

`@narumitw/pi-goal` 的状态机与测试是优秀机制供体，但原 runtime 自己持久化 activeGoal/queuedGoals/continuation/wait/budget，无法把 state owner 交给 OmniMind。因此当前只翻译 guards 与 conformance fixtures，不运行或 fork 整包。

## 9. Knowledge 与 Memory：相邻但不同的持久上下文

### 9.1 准确定位

Karpathy 的 LLM Wiki 是一个可证伪的知识工作模式，不是 Agent runtime：

```text
immutable raw sources
  → LLM-maintained derived Markdown pages
    → small schema + ingest/query/lint workflow
```

其价值是假设性地把反复 query-time 综合“编译”为可复用 artifact。它没有自动解决多人权限、事实正确性、时效、并发、崩溃恢复或 prompt injection。

OmniMind 不否定 Karpathy，也不迷信 Karpathy。我们把它从“产品答案”降为“可控实验中的候选机制”。

### 9.2 最小自动 Project Context Pack

Knowledge 与 Memory 使用同一个 OmniMind-owned、workspace-scoped file-world 和单 writer，但按 page intent 分开：evidence 是事实源，knowledge 是可重建的综合，memory 是稀疏的项目约束/偏好/昂贵上下文。它们不是三个数据库，也不复制 Engine-native memory。

首版需要的最小机制是：

1. 一个很小、稳定的 session policy/trigger，告诉 Engine 当前 workspace 有 project-context pointer，并允许在 root turn settled 后触发有界维护；
2. 一个按需加载的 Skill，负责综合、冲突判断与何时值得沉淀；
3. 一个确定性、stateless、无 daemon 的机械层，负责 source id、provenance、index、lint、diff/status、stale/deleted detection 与原子提交；
4. 继续复用 `read/bash/edit/write` 与本地 `rg`，通过各 Engine 已证明的 additive seam 挂载。

仅有 on-demand Skill 不足以形成小白期待的自动体验，因为模型在用户没有显式调用时不知道何时沉淀；完整 ambient extension 又会把大工具表、个人 vault、watcher 和后台 authority 常驻化。正确中间点是 **小而稳定的触发 policy + event-driven post-settlement job + JIT Skill/body**，没有常驻 daemon。

默认 journey：

```text
用户正常工作并实际使用文件/链接/workspace evidence
→ Agent 完成当前任务
→ settled 后的 bounded curator 判断哪些内容值得长期复用
→ 自动保存 immutable source packet，更新关联页面/index/memory
→ 后续任一 compatible Engine 只读取小 index，并按需 rg/read 正文
```

用户不需要“创建知识库”“更新知识”或批准第一次写入。普通变更自动、版本化且可回滚；来源冲突默认保留双方、标记当前判断并继续，只有冲突会改变当前任务且无法从 workspace/evidence 裁决时才询问。外部 source 内容永远是 data，不是 system/developer instruction；这属于事实正确性，不是用户权限流程。V1 使用 OmniMind-owned workspace scope；没有实证前不做 personal global vault。

这仍不是 greenfield 授权。实现前先对 `kfchou/wiki-skills` 的最小行为、`plasma-ai/wiki` 的机械层与 `pi-llm-wiki` 的 automatic recall/maintenance 做 exact-source Gate A。能直接复用、配置、移植单用途机制或 upstream 一个窄 seam 就不重写；若完整 package 带来 personal home、MCP owner、trajectory、events authority 或并发损坏，则拒绝整包而保留获胜机制。

### 9.3 Memory 不是第二套系统

Memory 是自动、稀疏的跨任务上下文机制，不是 Knowledge 的手动写入按钮，也不是每轮 recap。允许在 root turn 真正 settled 后自动形成 candidate，并由唯一 owner 按 policy 写入高价值、可审查内容：

- 用户明确表达、反复体现或用于纠错的 preference/constraint；
- 有证据的项目事实；
- 昂贵获得且难以从 workspace 重新推导的信息；
- 对恢复真正有用的稳定 artifact 指针。

“自动”不等于保存 transcript 或从网页/聊天学习一切。默认不写完整对话、原始推理、密钥、瞬时输出、未经验证的网页陈述和 subagent 中间猜测；不把 derived summary 当 immutable evidence。project/workspace 是 V1 默认 scope；提升到 personal/global、持久化高风险内容或无法裁决冲突时才需要显式用户决定，日常写入不弹确认框。

Memory 有两个不竞争的责任域：

- Codex、Claude Code 等 native memory 继续由 Engine 拥有，保存其私有优化、格式、retention 与管理语义；OmniMind 不读取、镜像或迁移；
- OmniMind project memory 只保存产品可审查、跨 Engine 有价值的 project facts/preferences/constraints，与 Knowledge 共用 project-context owner，并通过官方 seam JIT 提供。

这不是第二 native Memory DB：它不保存 Engine transcript/latent state，也不声称 native resume。当前 Web `ThreadRecap` 继续只是 UI recap。

前端默认比上一版更安静：普通 automatic write/recall 不新增 Timeline row；完整审计事件进入既有 Activity detail，只有记忆实质影响回答、发生冲突、用户执行 forget/correct 或主动打开 Workbench 时才显示来源和管理动作。完整交互合同见 [`omnimind-agent-capability-surface.md`](omnimind-agent-capability-surface.md#4-自动记忆与知识默认无操作需要时可追溯)。

### 9.4 受控消融与止损

同一模型、语料、tool/cache/时间预算下比较：

- **A**：raw files + agentic `rg/read`；
- **B**：OmniMind 最小 Knowledge Pack；
- **C**：exact pinned `pi-llm-wiki` read-only MCP profile；只暴露 recall/search/status，在预构建的同 corpus vault fixture 上测 retrieval；
- **D**：exact pinned `pi-llm-wiki` 原装默认 extension comparator；只在 disposable fake home/project 和可信合成语料中运行，保留其真实 ambient/bootstrap/recall/tool 行为；
- **E（可选）**：exact pinned full non-vector profile；只有它与 D 有可记录的实质差异且能安全隔离时才运行。

每个 arm 都要冻结并记录 exact bytes、配置、工具表、prefix、后台活动、文件写入、网络和安全限制。A/B/C 可比较 query-time 检索；D/E 同时改变写入、ambient behavior 和工具面，必须把 compile economics 与 query economics 分开报告，不能用一个总分掩盖变量。若 D/E 无法在不触碰真实 home、凭据或不可信输入的前提下运行，应跳过并记录 `no result`，不能先关闭默认行为再仍称“默认对照”。

任务集：single fact、cross-source synthesis、incremental update、contradiction、stale/deleted source、no-answer honesty、cross-session reuse、novice zero-config。

指标：claim-level support、omission、contradiction/stale correction、compile cost、break-even reuse count、input/output/cacheRead/cacheWrite、TTFR、总时间、文件/工具/后台进程数量、private-home I/O=0、crash/restart correctness。

裁决：

- B 不劣于 C/D/E 的可比部分且更便宜、更简单，减法成立；
- D/E 独有优势，则逐项 ablate 获胜机制，不能整包吞入；
- B 在摊销编译成本后不能稳定优于 A，就不发布 Wiki 产品，只保留 Markdown + Agentic Search。

## 10. Context 与 Cache 经济学

### 10.1 稳定但瘦的前缀

Session 开始只放：

- 小而稳定的 policy；
- capability 名称、来源、可用性和 pointer；
- 确定顺序的最小工具表；
- 当前 workspace/objective 的必要元数据。

不要放：

- 所有 Skill 正文；
- 整个 wiki/memory；
- 大量 MCP schema；
- 自动生成的 repository encyclopedia；
- 每轮变化的能力清单与动态状态。

### 10.2 JIT 与 progressive disclosure

先通过 index/path/description 发现，再按需 `rg/read`。Capability 新可用时尽量在 history 尾部追加 observation；如果模型、tool、sandbox、permission 或 capability set 实质改变，应诚实新开 Engine Session，并用结构化 handoff，而不是回写旧前缀。

### 10.3 Native compaction 与 durable artifacts

- 同 Engine 长任务优先 native compaction；
- 跨 session 靠文件、测试、spec、artifact、结构化 handoff 恢复；
- opaque compaction/persisted reasoning 属于 Engine，不是 OmniMind durable memory；
- 不为了 cache 命中阻止必要 compaction。

### 10.4 北极星指标

至少同时观察：

- task success 与 evidence correctness；
- effective context tokens；
- input/output/cacheRead/cacheWrite 与总成本；
- TTFR 与总时长；
- abort/settlement/recovery correctness；
- capability availability truth。

高 cache ratio 可能只是缓存了大量无关内容，不能单独作为优化成功。

## 11. 跨 Engine 的 OmniMind 能力

正确命题不是“所有 Engine 运行一套 OmniMind 插件系统”，而是：

```text
Engine native ecosystem
+ verified compatible OmniMind Capability Pack
+ OmniMind Workbench
```

### 11.1 可移植与不可移植边界

相对可移植：

- Agent Skills 的 `SKILL.md` name/description/body/resources common core；
- MCP 的基础 tools/resources/prompts/instructions；
- reviewable workspace artifacts 与 capability provenance。

不可伪装通用：

- Engine-specific commands、hooks、plugins、subagents、permission；
- OAuth/cache/reconnect/tool-search/approval 语义；
- Codex dependency metadata、Claude agent fields、OpenCode plugin hooks；
- native resume/compaction/latent state。

因此 Library 必须保存 canonical asset + per-Engine renderer/compatibility declaration，而不是无脑复制文件。

“Skill/Plugin 全局一致”指一份 canonical identity、名称、版本、来源、用户语义与图标词汇；per-Engine renderer 只处理不可避免的加载格式和能力差异。不能为每个 Engine 复制成多个用户概念，也不能为了表面一致隐藏 `native / projected / unavailable` 的真实差别。

### 11.2 Engine seam 结论

接入必须从 OmniMind 当前 adapter 往里延伸，不能另起一个 CLI launcher 绕过既有 Session、credential、cancel 和 projection owner。

- **Codex**：当前产品已经通过 `codexAppServerManager.ts` 使用 app-server，并用 `skills/extraRoots/set` 挂 OmniMind Skill root、用 native skill turn input 调用。官方 app-server 文档当前确认 `skills/list`、process-scoped `skills/extraRoots/set` 和 explicit skill input；`dynamicTools` 等实验表面只能 feature-detect。产品路径是扩展既有 app-server contract，并为 process-scoped roots 证明 dedicated process 或严格 replace/reset；不能写 source `~/.codex`，也不能把官方文档未稳定列出的字段写成生产依赖。[Codex app-server protocol](https://developers.openai.com/codex/app-server/)
- **Claude Code**：当前 `ClaudeAdapter.ts` 通过锁定的 `@anthropic-ai/claude-agent-sdk@0.3.207` 执行 `query({ options })`，已经使用 `settingSources`、hooks、agents 与 session MCP，但尚未接入 OmniMind plugin bundle。官方当前 SDK 文档支持 `plugins: [{ type: "local", path }]`，并在 `system/init` 回报 loaded plugins 和 commands；未来 Capability Pack 应沿现有 `queryOptions` 证明这一 seam，而不是另启 `claude --plugin-dir`。文档能力不能自动外推到锁定 `0.3.207`，实施前必须核 exact type/runtime 或单独升级 intake。CLI flags 只能作为手工 comparator 证据，不是产品 implementation seam。[Claude Agent SDK plugins](https://code.claude.com/docs/en/agent-sdk/plugins)
- **OpenCode**：当前产品拥有 managed `opencode serve` process pool 和 `@opencode-ai/sdk/v2` client（workspace lock 当前解析 `1.15.13`），并用 `client.mcp.add` 管理 thread-isolated Gateway。SDK 版本不等于实际 spawned CLI/server 版本，两者都要记录。显式 Skill/config 如需 process-start 注入，应扩展现有 `buildOpenCodeServerProcessEnv` 和 managed process contract；不能再起平行 launcher。OpenCode 配置会与 global/project sources 合并，Skills 还会发现 `.claude/.agents` compatibility roots，V2 plugin API 仍是 beta，因此不存在 Claude strict-MCP 等价的隔离声明；必须 exact-version、fresh-profile、loaded inventory 实证。[OpenCode config](https://opencode.ai/v2/docs/config) · [Skills](https://opencode.ai/v2/docs/skills) · [Plugins](https://opencode.ai/v2/docs/build/plugins)

这些是证据日期的 seam 观察，不是永久兼容承诺。Engine binary/SDK、官方协议、当前 adapter 调用路径或 init/status 回报任一变化，都要只重验受影响路径。

产品价值不只是“别处也能手动装同一 Skill/MCP”，而是：

- 一次策展、跨 Engine 可达；
- 无需重复安装与迁移 private home；
- 版本、来源、权限、兼容性已验证；
- native/projected/unavailable 准确；
- 结果进入同一 Workbench。

## 12. Exact-source 处置矩阵

生产 adoption 的唯一根级身份在 [`README.md`](../README.md) 的 `source-adoptions`：bundled Pi `0.84.1` lineage 与 adopted `pi-todo` 是当前基线，不在本研究表复制版本真相。以下只记录截至证据日期的外部候选裁决；升级或重开必须按 `PI-ECOSYSTEM-INTAKE.md` 重新验证。

| 来源 | Exact identity | 证据成熟度 | 当前裁决 | 最强原因与重开触发器 |
|---|---|---|---|---|
| `pi-subagents` | `0.47.0`; [commit `2243d13c…`](https://github.com/nicobailon/pi-subagents/commit/2243d13c052e2aa87353ad7c1c896062b657a7a5); integrity `sha512-7ihuBxK052+CWvk1EuJDAjwrFou0Y7JXsDYRzEdRiGVS+fUGh/+ziUUdpfkAlFnmdg/9b4WARz66aPe7z+5Xlw==`; shasum `969e4ac1b6c8a846e5ace51a282c374ae91e810a`; MIT | source-matched；source tests 部分闭合；product/packaged 未证明 | **Defer with trigger**；保留 delegate/Role/recovery 洞察 | 无法配置成真正 execution-only；仍注册 Fleet/Mission/Schedule/management/state/UI，默认写 `.pi/subagents`，installer clone/pull `~/.pi`。只有 upstream 提供 public leaf executor/真实 core profile，或 benchmark 证明收益足以支持 upstream patch 时重开 |
| `@narumitw/pi-goal` | `0.51.0`; [commit `c98af43a…`](https://github.com/narumiruna/pi-extensions/commit/c98af43a6c71c5839b2e0671db71ed1cc1fc0c51); integrity `sha512-JeEu+iCT4zMP41LLYfZxHsHG6ghhLA0Fb6pCQL/hzLyQVYd3E/Op+qJyMDOwU8dqdtEf92hrN5G9Gr0XP24hLw==`; shasum `3e2fec1cf97ca4e9edda5e6ef8e564c0c98e46ef`; MIT | source-matched；source tests 闭合；product/packaged 未证明 | Runtime **Decline**；guards **Translate mechanism** | 原包持有第二 Goal/session continuation state；复用 complete/blocked/wait/stale-id/settled-idle 测试思想 |
| `@zosmaai/pi-llm-wiki` | `0.11.3`; SLSA source commit `42d6fd15912bd3eea71abb0d7a017bab462dc4aa`; integrity `sha512-Xn8ZJjXFKtCm0cE8yjN+Y549Q/ZGpprDX0xmLNA0fMIL/O3/HMIDJfRwIRWzmnhNV3oH9aAtlgAZU8mI1y640g==`; shasum `38d79d0e7ebea66d2c6df109aeef8c95cf392eda`; MIT | source-matched；阻断行为已从 exact runtime/source 观察；product/packaged 未证明 | **Donor / read-only comparator**；默认 runtime **No-go** | extension 无真正 ambient gate，自动 personal vault/recall/tool surface；capture 有 SSRF/local exfil/shell injection；写入缺少可靠锁/事务。只允许绝对隔离 root 下的受控对照，不能原装打包 |
| `pi-mcp-adapter` | `2.23.0`; [commit `49e25be1…`](https://github.com/nicobailon/pi-mcp-adapter/commit/49e25be1cb917329980eb7a40786c5b91dddb277); integrity `sha512-4jtofg55o6tEP47XGYGkR2oykKMlQiJBqZcx4y9SeguNHOdBJ3sr5gT8DktLSTdZX8XGj/A6BITgV6/vLz8TGA==`; shasum `c9ea49075979319ec943fd0f7072014f794e1a0f`; MIT | artifact/release-source identity closed；exact tests 与 packaged 未证明 | Existing Gateway owner **Decline**；external MCP **Defer/narrow bridge** | 不能与现有 Gateway 重复；未来只考虑 programmatic、URL-only、无 ambient discovery 的 outbound client |
| `pi-web-access` | `0.22.0`; [commit `7e488620…`](https://github.com/nicobailon/pi-web-access/commit/7e488620f32de239992d45eac83235d03c9c6bbd); integrity `sha512-xzeU0q9OCYJv3yufK3vqIoelvPT/1/aoV5Pj7NbsQiW2QnB0FOlMxhP29TBTWkPJdleRnch6/MH8P2ebhwUTBQ==`; shasum `189e04a0d0b0957145e4fefcd6ac627f12591c05`; MIT | artifact/release-source identity closed；exact tests 与 packaged 未证明 | **Defer**；search mechanism donor | stock schema 允许模型覆盖 provider，且 cookies/fetch/curator 表面过大；未来只接受 OmniMind-owned fixed SearXNG search-only wrapper、无 fallback |

审计完备性必须保守表达：

- `pi-subagents@0.47.0` 从 exact commit repack 与 registry tarball 逐字节一致；typecheck 通过，unit 为 1770 pass / 1 fail / 1 skip，integration 726/726。唯一失败项是 Node 25 下 malformed LSP watchdog 预期 `failed`、实际 `timeout`；E2E 未运行，registry tarball 不含 tests，因此不能称 unit suite 或完整验证全绿。审计后 upstream 已继续发布，不能把 `0.47.0` 观察外推到新版本。
- `pi-goal@0.51.0` exact package tree 与 registry 解包内容一致，但本机 repack 的 gzip/tar bytes 不完全可复现；exact source 的 typecheck、runtime smoke 与 342 tests 通过，registry tarball 不含测试文件，且 runtime dependency range 会漂移。
- `pi-llm-wiki@0.11.3` 通过 npm provenance 绑定 source commit；除发布时生成/改写内容外逐文件 source 对应闭合。tarball 约 13.77 MB，绝大部分是 demo/assets；版本发布频繁，默认 extension、MCP capture 与 writer 仍有阻断项。
- `pi-mcp-adapter@2.23.0` 与 `pi-web-access@0.22.0` 的 registry identity 和 release commit 已闭合，但发布 tarball 不含 tests；尚未完成 exact commit 的完整 packaged compatibility/E2E，不能宣称 production-ready。

### 12.1 尚未闭合 Intake 的假设

`pi-hermes-memory` 目前只有初步 source hypothesis：其 SQLite FTS、后台 review/flush/consolidation、correction 与 skill writer 可能与最小 file-world 冲突。由于 exact artifact/source/dependency/runtime Gate A 尚未在本文闭合，它不能进入上表，也不能形成正式 adoption 或 decline 结论；若未来重开，必须从 exact identity 和最简单 Memory baseline 开始，不能继承这句初判。

### 12.2 Knowledge donor/comparator shortlist

- `pi-llm-wiki`：Pi-native 完整 comparator/code donor；
- [`kfchou/wiki-skills`](https://github.com/kfchou/wiki-skills)：最小行为与 write-before-diff donor；
- [`plasma-ai/wiki`](https://github.com/plasma-ai/wiki)：确定性 tree/index/update/lint mechanics reference。

若未来 fork，只保留一条明确 runtime lineage；其他项目贡献 acceptance tests 和 spec ideas，不拼装多套依赖。

## 13. 科学证据与准确含义

- [Karpathy, LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)：支持 immutable raw → derived Markdown → small schema、index-first、可选模块；不支持默认全自动 memory runtime。
- [Retrieval as Reasoning](https://arxiv.org/html/2605.25480v2)：在选定 benchmark 中，结构化 wiki、progressive traversal、Error Book 的消融有贡献，LLM-Wiki 比强基线高约 2.0–8.1 F1，最多 15 次 tool calls；证明方向有潜力，不证明桌面产品已成熟。
- [WiCER](https://arxiv.org/html/2605.07068v1)：blind compilation 的灾难性丢失约 53–60%，1–2 轮 targeted diagnose/refine 可追回约 80% 丢失质量并减少约 55% 灾难失败；因此必须保留 source-grounded probe、诊断和修复。
- [Vector RAG vs LLM-Compiled Wiki](https://arxiv.org/abs/2605.18490)：Wiki 在跨论文综合和 claim-level citation support 更好，但 query tokens 更高，没有 universal winner。
- [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988)：静态 context files 未带来普遍成功率提升，平均推理成本增加超过 20%；支持 JIT 而非大 prefix。
- [Do Context Files Help Coding Agents?](https://arxiv.org/abs/2607.27250)：288 次运行中 context strategy 没有改变正确性，许多失败来自执行能力而非知识缺失；Knowledge 不能替代工具和实现能力。

准确结论：**compiled knowledge 是重复知识任务的可选经济优化，可能提升综合、可审查性与复用，也会引入遗漏、陈旧、治理和额外 token；自动体验是产品目标，但是否保留编译机制仍必须按任务证明 break-even。**

## 14. UI 与产品语言边界

用户可见名称应准确、克制，不用无意义的 “Omni” 前缀：

- Goal：目标；
- Agent Team：Agent 团队或智能体团队；
- Knowledge：知识库；
- Memory：记忆；
- Dynamic Workflow：动态工作流；
- Resume：会话恢复。

Skill 与 Plugin 属于全局一致的基础概念，不应为每个 Engine 或能力重复设计不同语义或图标体系。

完整的能力表面映射、状态矩阵、现有组件复用与方向原型见 [`omnimind-agent-capability-surface.md`](omnimind-agent-capability-surface.md)。它仍是 research 设计，不取代 `architecture/workbench.md`。

图标资产的最终 owner 是 `architecture/workbench.md` 和对应 UI 实现。维护者已经锁定：目标 `target-arrow`、Agent 团队 `agent-duo`、动态工作流 `flow-adaptive`、知识库 `knowledge-linked`、记忆 `memory-bookmark`、会话恢复 `resume-chat`。其中目标来自现有 Central asset，其余为已确认的低密度 Central-compatible SVG；正式进入产品前在当次 HEAD 复验占用和视觉冲突。知识库/记忆不得改成 database/brain glyph，Skill/Plugin 的同一概念必须跨入口保持同名、同义和同一图标词汇。能力强度不能靠 icon 数量和色彩密度表达。

`agent-duo` 只表示“子智能体集合/入口”，不能成为每个 child 的相同头像。每个真实 child 需要一个确定性的低密度身份纹样，并在 Environment、right dock、Timeline、Composer 和来源引用中连续；这属于现有 `subagentPresentation.ts` 的 UI identity projection，不是 Agent Core 状态。Workflow 同理：继续复用现有 `WorkflowRunCard` 的 compact header、动作和 state，点击后才在 existing right dock 打开同一 Engine-owned run 的只读空间详情；不新增通用 Workflow owner、DAG database 或 editor。当前 `WorkflowRunState` 只有有序 phases 与 Agent membership，没有 dependency edges，因此 V1 只组合既有 UI primitives 形成 phase map，不猜测 Agent 间连线，也不先引入 graph dependency。只有 exact Engine/adapter 将稳定 node ids 与 explicit dependency edges 提升为真实产品事实时，React Flow 才是第一 challenger，AntV X6 才是复杂图升级候选；完整裁决与 proof 见 `omnimind-agent-capability-surface.md`。

## 15. 主要风险与反架构清单

任何设计若出现以下信号，应默认做减法复核：

- 为一个 UI 能力新增一个 registry/database/scheduler；
- package 的 `enabled:false` 只隐藏 UI，但 schema/listener/writer 仍在；
- 把 Engine-native resume 宣称为跨 Engine 无损恢复；
- 把 Skill 文本注入宣称为脚本/资产/权限完整兼容；
- 用同一 MCP 名静默遮蔽 native server；
- 为 cache 命中把全部知识和工具塞进 prefix；
- 自动把外部网页、完整聊天或未经 policy/provenance 约束的模型总结写成长期事实；
- 为多模型默认创建多个 Product Thread；
- 用 workflow DSL 解决 native tool loop 已能解决的问题；
- 使用 package installer 写入真实 `~/.pi` 或浮动 clone/pull；
- 为 fork 复制上游全部 UI、状态和后台任务；
- 把 focused test 绿色扩张成 packaged Desktop 可用；
- 用“未来可能需要”替代当前可证伪 journey。

## 16. 尚未解决的实验问题

没有新的概念性产品问题需要维护者现在拍脑袋决定。剩余不确定性应转为实验门：

1. 在 OmniMind 真实知识任务上，最小 Knowledge Pack 是否比 raw files + `rg/read` 有足够摊销收益？
2. `pi-llm-wiki` 的哪个具体机制（若存在）能稳定击败最小 Pack？
3. V1 是否需要跨 workspace personal knowledge scope？当前研究建议“不需要”，没有证据前保持 workspace-only。

## 17. 复验触发器

新会话不能把本文件的 dated observation 当永久事实。以下变化必须重验相关章节：

- bundled Pi、Provider SDK、Engine app-server/CLI seam 变化；
- package exact version、source、dependency、installer 或 license 变化；
- `PiAdapter` settlement、usage、skill discovery、Gateway 注入实现变化；
- `architecture/*` 改变 Product Thread、private home、capability composition 或 Workbench owner；
- `execution-brief.md` 正式准入某个 Agent Core/Capability Pack 切片；
- upstream 出现 true execution-only profile、host-owned state sink、ambient disable、safe capture 或 atomic writer；
- controlled benchmark 推翻当前减法结论。

重验时只更新本文件拥有的研究事实和 disposition；产品事实、施工顺序和 claim 状态仍回到各自 sole owner。

## 18. 新会话应如何理解本文

新会话读完后应能准确说出：

1. 本文不授予实施权；是否可施工只能由当次读取的 `execution-brief.md` 决定；
2. Core 是 OmniMind Agent 必要运行保证，不是所有 Engine 的共同内核或十几个功能平台；
3. Agent 团队、目标、动态工作流、知识库、记忆和恢复如何由现有原语组合；
4. OmniMind 当前真实代码已经有哪些 seam，settlement、usage、Skill identity/availability 与 Gateway MCP identity/conflict 缺口在哪里；
5. 为什么不原装采用 `pi-subagents`、`pi-goal`、`pi-llm-wiki`；
6. 什么条件下可重开这些候选；
7. Knowledge Pack 如何做受控消融与 stop-loss；
8. 跨 Engine 能力为什么是 additive pack，而不是统一伪 runtime；
9. 任何下一步都只能遵循 `research/omnimind-agent-core-execution-guide.md` 的 preflight 和 `execution-brief.md` 当时的真实准入门。

最终设计原则：**继承原语，组合能力，延迟上下文，保留 native truth，拒绝第二控制面。**
