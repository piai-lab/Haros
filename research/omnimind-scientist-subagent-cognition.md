# OmniMind Scientist Subagent：产品认知、复用边界与运行时归属

> 证据日期：2026-08-25—2026-08-26
>
> 直接输入：维护者围绕 subagent、Skill、科学家团队、长期继续、递归派发、Thread 与 Host 工具边界的连续产品讨论
>
> 固定外部来源：production-adopted Synara `57f48ef1a3354ae7967d4a8f9f83a1105691ede6`；bundled OmniMind Agent 的 Pi exact source `914cf1472e715297caa30db4b9535d534a9eb718`，两者的 adoption truth 只见根 [`source-adoptions.json`](../source-adoptions.json)
>
> 当前代码环境：OmniMind workspace base HEAD `f939e34e919b204d827ca93681284093ce1144eb`；本文没有把当时工作树中与 Provider/Plan Mode 有关的未提交用户修改当作证据。代码与架构观察绑定本文列出的路径和上述 fixed revisions，不声称未来 upstream 或当前安装 App 仍保持同一行为
>
> 文档角色：保存维护者已经表达的产品判断、taste、术语澄清、当前来源反证、候选设计与复验触发器。它不拥有当前稳定架构、实施顺序、Campaign 状态或交付声明；接受后的稳定合同应分别进入 [`architecture/execution.md`](../architecture/execution.md)、[`architecture/product.md`](../architecture/product.md) 与必要的 Workbench owner

## 0. 一句话结论

维护者真正想要的不是“能创建很多聊天”的 OmniMind，也不是把一千个 Skill 塞给一个 Main Agent，而是：

> **OmniMind Agent 可以像组装 Pi Extension 一样安装和组合 N 位科学家；科学家在运行时成为 OmniMind Agent 自己的 child/subagent，完整继承 OmniMind Agent 的内置能力，按需携带各自的垂类 Skill、Tool、MCP、Extension 与上下文，但绝不获得 OmniMind Host 工具。**

其中最重要的修正是：

> **OmniMind 拥有这支团队，不等于 OmniMind 重写团队使用的每一颗螺丝。能复用的皆为复用。**

这句话同时拒绝两种错误：

1. 把 Gateway 创建的普通顶层 Thread 改名成 subagent；
2. 为了强调“OmniMind-owned”，重新发明 Package Manager、ResourceLoader、Session、Tool Registry、MCP、Thread、Scheduler 和恢复系统。

正确方向更薄：复用 Pi 与 OmniMind 已有的成熟生命周期，只补已证明缺失的“可安装科学家定义、OmniMind-owned child 关系、child 工具隔离”。

## 1. 维护者的原始问题是什么

维护者首先观察到一个很实际的问题：一个通用 Agent 不可能把所有专业能力常驻在自己的上下文里。

以科学研究为例，今天可能需要：

- 文献检索与证据综合；
- 公共生物数据发现；
- 生信分析；
- 统计推断；
- 机制建模；
- 图表与论文写作；
- 证据审计与反证搜索。

这些能力越垂直，越可能比“通用 Skill”好用。但如果把全部专业 Skill、MCP schema、说明和工作流同时放进 Main Agent：

- Main 的注意力会被大量无关能力稀释；
- tool schema 和 instructions 会持续占用上下文；
- 能力选择会变得不稳定；
- 一个通用 Agent 会被迫同时扮演所有专家；
- 安装一千个 Skill 并不等于能准确、及时地调用一千个 Skill。

因此维护者提出的不是简单的 lazy Skill loading，而是更自然的组织模型：

```text
一个通用的 OmniMind Root Agent
        ↓ 只看到很薄的专家目录
根据任务选择一位或多位科学家
        ↓
每位科学家拥有自己的专业 instructions、Skills、Tools、MCP、上下文与工作方式
```

维护者的长期愿景是拥有 N 位科学家，形成一支能够持续工作的顶级团队。这些科学家不是一次性 Prompt 模板，而是可以安装、调用、继续、相互提供新证据并再次工作的专业 Agent。

## 2. 维护者的 taste：必须完整保留的判断

这轮讨论中，维护者反复校正了几个容易被架构热情带偏的方向。新会话必须先理解这些判断，而不是只记住最终名词。

### 2.1 Main 保持 general，专业能力进入科学家

Main 不应常驻所有生物学、医学、统计和写作能力。Main 的核心职责是理解用户目标、选择科学家、组织协作、综合冲突并对最终结果负责。

Main 看见的是简洁的 scientist descriptor，而不是每位科学家的全部 Skill 正文与 MCP schema。科学家被真正选择后，完整专业资源才进入它自己的 context。

### 2.2 科学家属于 OmniMind Agent，不属于其他 Engine

维护者不希望 Scientist 平台被 Codex、Claude、OpenCode 或其他 Engine 拥有。它们可以提供模型、协议、算法或可复用的底层执行原语，但科学家的：

- 身份；
- 团队归属；
- parent-child 关系；
- 派发与返回；
- 生命周期；
- 工具面；
- 上下文与结果；

必须由 canonical `provider === "omnimind"` 的 OmniMind Agent runtime 拥有。

“使用某个模型”不等于“被该模型供应商拥有”。模型是推理资源，OmniMind Agent 才是科学家的运行环境和组织 authority。

### 2.3 不要为了 ownership 重新发明一切

维护者明确反对把“OmniMind-owned”理解成“必须全部自研”。

Pi 已经拥有成熟的 Package、Extension、Skill、Prompt、Tool、MCP、ResourceLoader、AgentSession 与模型运行基础；OmniMind 已经拥有 Product Thread、Workbench、事件投影和 Host 服务。只要 owner 与失败语义不被偷换，这些都应该复用。

因此应最大化拥有的是**产品语义和团队控制权**，不是复制外部生命周期冰山。

### 2.4 不要过早把 Scientist Pack 设计成重平台

第一反应不应是建设：

- 第二 Package Manager；
- Scientist Marketplace 数据库；
- Capability Pack 体系；
- 新的 Agent Registry；
- 新的 MCP 管理器；
- 新的常驻 Scheduler；
- 新的 Memory 平台；
- 新的 Workflow DAG 产品。

一个 scientist 最初完全可以是 Pi-compatible Package/Extension 对既有能力的组合，并通过一个很薄的 descriptor 或 factory 向 OmniMind Agent 声明“我是一位可被派发的 Agent”。

只有真实实现证明 Pi 的现有 public seam 无法表达稳定变化轴，才增加新的 typed contract。

### 2.5 完整 Agent 能力，但零 Host authority

维护者对工具边界的要求非常明确：

> Scientist child 应拥有 OmniMind Agent 的全部内置工具，但 OmniMind Host 的工具一个都不要。

这是能力与 authority 的分界，不是“给 child 少一点能力”。Scientist child 应该是完整的 OmniMind Agent execution context，而不是阉割版 Prompt worker；但它不是 Product Host，也不能直接管理整个应用。

### 2.6 可以继续、可以再次调用，但不要谎称进程永生

维护者希望 Literature Scientist 完成一轮后暂时停下，Biodata Scientist 带回新发现后，再把同一位 Literature Scientist 叫回来继续。之前的上下文应保留，并且它应知道团队中间发生了什么。

用户体验可以诚实地称为“继续同一位科学家的工作”，但底层不能因此宣称原模型进程、KV cache 或 native Session 永远存活。能真实 resume 时 resume；只能 rebuild 时必须由已有记录和明确 handoff 重建，并准确表达 fresh/rebuilt 边界。

## 3. 先把五个容易混淆的概念拆开

### 3.1 Scientist Package / Agent Definition

这是可以安装、更新和移除的持久资产，描述“这位科学家是谁、擅长什么、需要什么资源、如何被调用”。

它可能包含或引用：

- identity 与简短 descriptor；
- system instructions；
- Skills 与 Prompts；
- Pi Tools 与 Extensions；
- MCP connections；
- 可选执行代码；
- 默认模型或模型选择建议；
- context policy；
- 输入和结果约定。

它是科学家的**定义或组装配方**，不是一个正在运行的 subagent。

### 3.2 Scientist Instance / Working Identity

同一 Scientist Package 可以在不同研究问题或不同 Root 工作中被多次实例化。某次具体研究中的 Literature Scientist 是一个工作身份：它有当前任务、已有发现、上下文和与 Root 的关系。

这层是否需要独立持久对象，必须由真实 continuation 与恢复证据决定；本文不预先批准新的数据库 aggregate。初版可以复用 native child identity、Session 与现有 projection，只要能够准确完成用户旅程。

### 3.3 Subagent / Child Agent

Subagent 不是一种安装包，也不是一种聊天页面。它首先是一种运行时关系：

```text
Parent Agent
    └── 为一个有界目标创建并拥有 Child Agent
```

严格的 child/subagent 至少意味着：

- 有明确 parent；
- parent 发出 delegation；
- child 在自己的 execution context 中工作；
- child 的状态和结果回到 parent；
- stop、steer、budget、terminal 与失败能落到 exact child identity；
- parent 最终对用户结果负责。

安装的是 Scientist Package；运行时被实例化出来的才是 Scientist subagent。

### 3.4 Product Thread

Thread 是用户可见、可继续、可诊断的会话与工作记录，不是 Agent 本体。

一条 Thread 可以承载多个 turn、不同时间的 runtime、甚至不同 Provider provenance。native Session 丢失后 Thread 仍然可读，这已经证明二者不是同一个东西。

child 的事件可以投影成 Product child Thread，方便用户打开、观察和继续，但 projection 不会反向把任意 Thread 变成 child Agent。

### 3.5 Native Session / Execution Container

Session 是某个 Engine 在当前时刻真正运行模型、工具与上下文的容器。它可能被保留、恢复、替换、压缩或丢失。

因此最诚实的关系是：

```text
Scientist Package 说明“它可以是谁”
Child identity / working context 说明“它在这项研究中是谁”
Native Session 说明“它此刻如何运行”
Product child Thread 说明“人如何观察这段工作”
```

把这四层混成一个 durable Agent 对象，最终一定会在 crash、resume、Provider replacement 和 Package update 时说谎。

## 4. Thread 为什么不等于 subagent

这是本轮讨论的关键转折。

### 4.1 当前 Gateway 的代码事实

当前测试明确写死：AgentGateway 创建的是 ordinary top-level Thread，不是 subagent：

- [`apps/server/src/agentGateway/Layers/AgentGateway.test.ts`](../apps/server/src/agentGateway/Layers/AgentGateway.test.ts) 的 `2143–2168` 行断言创建结果没有 `parentThreadId`；
- 同一测试注释直接写明 `Gateway-created threads are ordinary top-level threads, not subagents`；
- 创建 command 同样没有 `subagentNickname`。

`creationCoordinator` 保存 `sourceThreadId/sourceTurnId` 只是创建来源 provenance，见 [`apps/server/src/agentGateway/creationCoordinator.ts`](../apps/server/src/agentGateway/creationCoordinator.ts) 的 `1093–1114` 行。它没有因此建立 parent-owned lifecycle。

这意味着：

```text
Root 通过 Gateway 创建 Thread B
```

只能证明 Root 触发了另一个独立产品任务，不能证明 Thread B 是 Root Session 的 child Agent。

### 4.2 Gateway 与 native child 是两种尺度

Synara 的完整历史还表明两条能力是分别形成的：

- `fdaf33cf7138cdf14f651adbae93d4baacddf2f7`：对齐 Codex upstream child identity，把 Engine-native child event 投影到 parent-linked child Thread；
- `407981969cd90736a313b8263ee37741c7449cba`：增加 Agent Gateway，让各 Provider Thread 可以通过 MCP 操作宿主应用、创建和管理独立任务；
- `f01a85ea444bb8bf7529a5993a8ffe1d58dcb32f`：增强 Gateway operation、target resolution、provenance 和 session orchestration；
- `ef16dee917722d27782e95bba9c286967d61d5ed`：另行增加 Claude native CLI subagents 与 dynamic workflows。

时间与代码责任都说明：Gateway 不是“尚未加 parent 字段的 subagent”。Synara 同时拥有：

1. Provider 内部的微观 child；
2. Host 层的宏观独立 worker/task。

二者都能用于多 Agent 工作，但生命周期、context ownership、停止、恢复和用户可见性不同。

### 4.3 为什么不能给 Gateway Thread 补一个 parentThreadId 就结束

一个字段不能创造以下事实：

- parent Session 是否真正拥有 child；
- child 是否继承 parent 的 Agent-native resources；
- child 是否能精确 stop/steer；
- parent stop 是否传播；
- child terminal result 是否有正式 return channel；
- child 的工具和权限是否与 parent 同一 runtime family；
- crash 后由谁恢复 native context。

如果只补关系字段，产品会得到“看起来像 child、实际仍是独立 Thread”的语义假象。

## 5. 当前稳定架构已经允许什么

当前 [`architecture/product.md`](../architecture/product.md) 已接受以下事实：

- 产品顶层 Agent 不是 durable entity；
- OmniMind Agent 可以在当前 Root turn 内创建 bounded child Session；
- Root 始终对最终结果负责；
- child identity、状态和结果复用既有 Provider runtime event 与 Thread projection；
- crash 后 active child 恢复为 `interrupted`，不自动 mid-flight replay；
- Product Orchestration 恢复产品 event/projection，Provider adapter 恢复 native Session，二者不能互相伪造。

当前 [`architecture/execution.md`](../architecture/execution.md) 还确认：

- OmniMind Agent 是 Pi-native multi-Extension composition host；
- Pi `AgentSession`、`ResourceLoader` 与 Tool Registry 是 OmniMind Agent runtime 内唯一的 Extension 注册、active、reload、Session 与 Provider wire 真相；
- 团队、用户与第三方 Extension 继续由 Pi ResourceLoader 的原生 package/extension lifecycle 加载；
- 产品随附 Extension 通过有限的 Session composition seam 接线，不新建 Plugin/Extension Manager；
- Package install/remove/update/settings/trust/cache/reload 由 bundled Pi-compatible runtime 原生生命周期拥有。

这说明新的 Scientist 能力并不是从空白开始。当前母体已经提供：

```text
Pi package/resource lifecycle
+ OmniMind Agent Session composition
+ bounded child architecture direction
+ child Thread/UI projection
+ Product Orchestration 与恢复边界
```

真正尚待证实的是：现有 exact Pi runtime 能否以足够窄的 public seam，把安装的 Agent Definition 实例化为拥有正确工具面的 child context。

## 6. 最薄的 Scientist 形态

维护者修正后的最佳起点不是“Scientist Platform”，而是一个 Pi-compatible Package/Extension 贡献一份很薄的 Agent Definition。

概念上可以是：

```ts
registerAgent({
  id: "literature-scientist",
  description: "检索、精读、证据综合与反证搜索",
  create: (context) => createLiteratureScientist(context),
});
```

或由已有 Extension factory 以等价方式注册。这里的 API 名称只是帮助理解，不是已批准公共合同。

一个科学家包可以自然复用既有资源：

```text
Literature Scientist
= 专业 instructions
+ literature/search/read/audit Skills
+ Web 或数据库 Tools
+ 所需 MCP
+ 可选 Extension code
+ 输出习惯与科学质量约束
```

```text
Biodata Scientist
= 专业 instructions
+ dataset discovery Skills
+ Python/R/Bash 与生信 Tools
+ 数据库 MCP
+ 可选分析 Extension
+ 可重复性与结果交付约束
```

同一个 Skill、Tool、MCP 或 Extension 可以被多个科学家引用，不为每位科学家复制一份。

### 6.1 安装很多，不等于常驻很多

安装一千位科学家也不应该把一千份完整定义塞进 Root context。Root 只需要一个由当前 ResourceLoader truth 派生的薄发现面，例如：

```text
Literature Scientist
用于：文献检索、证据综合、idea generation

Biodata Scientist
用于：公共数据发现、生信分析、假设验证
```

只有 Root 选择某位科学家时，其完整 instructions、Skill 正文、Tool/MCP schema 和工作上下文才进入 child context。

这个发现面应从现有 resource truth 派生，不能先建设第二份持久 Scientist Catalog。若 Pi upstream 已有合适的 extension metadata/discovery seam，优先直接采用；只有其无法表达可安装 Agent 的稳定身份时，才增加最窄 descriptor contract。

### 6.2 科学家可以携带代码

本文不接受“Scientist Package 必须是纯声明式”的先验限制。Pi Extension 本来就允许可执行代码，OmniMind 没有理由为了新名词另造一个弱化生态。

第一方、团队和受信来源可以按现有 package、trust、permission 与 source intake 规则携带代码。若未来开放陌生第三方 Marketplace，再由真实分发与供应链需求决定是否增加签名、审核或更强隔离，不能提前建设幻想式沙箱平台。

## 7. “OmniMind 拥有”到底拥有什么

最准确的口径是：

> **OmniMind 拥有团队语义和 child authority；成熟来源继续拥有各自内部生命周期。**

### 7.1 OmniMind Agent 必须拥有

- Scientist identity 在 OmniMind Agent 中的可发现性；
- Root 对 child 的 delegation；
- parent-child identity 与结果回传；
- child 的实际 tool surface；
- exact model/resource/context snapshot；
- stop、steer、wait、return 和 terminal truth；
- child 创建后由谁负责；
- Root 的最终综合责任；
- 与 Product child Thread 的可信投影。

### 7.2 既有成熟 owner 继续拥有

- Package 安装、更新、移除与 source precedence：Pi-compatible PackageManager/ResourceLoader；
- Extension 注册、active、reload 与 Tool Registry：Pi AgentSession/ResourceLoader；
- Skill/Prompt 展开：Pi 原生资源生命周期；
- MCP 协议和外部服务状态：对应 MCP/Extension owner；
- 模型推理、认证和 wire：Pi ModelRuntime 与 exact provider/model；
- Product Thread、event 与 Workbench：Product Orchestration/Workbench；
- Host 服务与 Host authorization：AgentGateway 和对应 Host service。

“OmniMind-owned Scientist”不能成为吞掉上述责任的总 manager。

### 7.3 其他 Engine 的边界

Codex、Claude、OpenCode 等 Engine 可以继续拥有自己的 native subagents，但它们不是 OmniMind Scientist 平台的 identity owner。

Scientist Package 的发现、实例化与 child relationship 默认只发生在 canonical OmniMind Agent runtime。其他 Engine 不因为运行在 OmniMind App 中就自动获得这些科学家，也不能把自己的 native Task/child 冒充成 OmniMind Scientist。

复用其他 Engine 的算法或 public primitive 不会转移所有权；关键在于最终 identity、tool surface、lifecycle 与 event authority 落在哪里。

## 8. Scientist child 的工具面：完整 Agent，零 Host

这是维护者已经明确锁定、未来实现最容易出错的边界。

### 8.1 目标集合

```text
Scientist Child Tool Surface
= OmniMind Agent Core built-ins
+ 该 Scientist Package 提供或引用的 Skills / Tools / MCP / Extensions
+ Agent-native collaboration tools
- OmniMind Host tools
```

“OmniMind Agent Core built-ins”包括实际由 Agent runtime 拥有的通用能力，例如：

- read、search、edit/write；
- supervised Bash、代码执行；
- Agent 自身的 context/resource 能力；
- native spawn/send/wait/stop/return 等 child 协作能力；
- 其他明确属于 OmniMind Agent Core、而非 Host 的内置工具。

具体名单必须从运行时唯一 Tool Registry 派生，不能在 research、Prompt 或 child profile 中复制一份静态清单。

### 8.2 必须排除的 Host 工具

Scientist child 不得直接获得：

- AgentGateway 创建、读取、等待、发送、归档 Product Thread 的工具；
- Tasks、Diagnostics、Goals、Automations、Browser、Device 等 Host capability；
- Settings、Provider 管理、应用导航、窗口、更新、发行和 Plugin Library 控制；
- 任何 Host app-control MCP 或 Host IPC authority。

这些工具的 owner 仍是 Host。child 如果判断某个 Host 动作有价值，只能通过 native return/message channel 告诉 parent：

```text
Scientist child
  → 返回“建议创建一个长期 Automation / 打开某个 Product 任务”
  → OmniMind Root 判断是否符合用户意图
  → Root 再通过自己的 Host 边界执行，或请求用户决定
```

这保证 scientist 能完整研究和执行专业工作，却不能绕过 Root 直接重组整个产品。

### 8.3 不能用 Prompt 或调用时黑名单实现

目标不是：

```text
把 Host schemas 都给 child
然后在 system prompt 中说“请不要调用”
```

也不是：

```text
child 看得见全部 Host tools
调用后统一返回 denied
```

真正验收标准是：

> **Scientist child 的模型 tool schema 中 Host tool 数量为 0，且 child 没有 Host transport、credential、IPC handle 或可猜测调用入口。**

因此应在真实 composition/registry 边界构造 child tool surface，而不是事后过滤行为。

### 8.4 当前 Host Projection 形成的最强反证

当前 [`architecture/execution.md`](../architecture/execution.md) 明确：canonical OmniMind Agent Session 会通过一个 named、hidden、session-scoped AgentGateway Host Projection Extension，把允许且可用的 Host definitions eager 注册进 Pi Tool Registry。

这对 Root Session 是当前已接受架构，但对未来 Scientist child 形成了一个必须验证的反证：

```text
如果 native child 直接共享 Root Session 的 active tool set，
那么它也可能看见 Host tools。
```

所以不能因为“Pi child 能创建”就宣称 Scientist child 已成立。必须沿 exact Pi child/session API 证明至少一种情况：

1. child 可以从 Agent-native base composition 建立独立 Tool Registry，不装 Host Projection；或
2. child 有真实 per-child active/tool-surface seam，能够在 schema 形成前排除 Host source；或
3. 复用其他已有 Pi public primitive建立独立 child Agent context，同时保持 parent-owned lifecycle。

如果 exact adopted Pi runtime 无法做到 schema 级隔离，该 native child primitive就不能原样成为 Scientist child runtime。只允许补一条最窄、可删除的 isolation seam，不能为此复制 AgentSession 或建设第二 Tool Registry。

### 8.5 “拥有工具”不等于“无限授权”

Scientist child 可以拥有 Bash、write、network 等 Agent-native工具，但仍受当前 Project、filesystem、runtimeMode、用户授权、外部 credential 和不可逆副作用边界约束。

这是同一能力的真实 authorization，不是把 child 降格成半个 Agent。可以用一句英文准确概括：

> **Scientist subagents are full OmniMind Agents in capability, but never OmniMind Hosts in authority.**

## 9. 科学家如何协作、返回和继续

### 9.1 Literature → Biodata → Literature

维护者给出的代表性旅程是：

```text
用户提出科学问题
  ↓
OmniMind Root 派发 Literature Scientist
  ↓
Literature Scientist 检索文献并提出可验证 idea
  ↓ 返回 evidence + hypothesis
OmniMind Root 派发 Biodata Scientist
  ↓
Biodata Scientist 检索对应数据并完成生信分析
  ↓ 返回 findings + artifacts + limitations
OmniMind Root 把新发现交回同一 Literature Scientist
  ↓
Literature Scientist 基于新证据继续检索、修正解释或主动寻找反证
  ↓
Root 综合并向用户负责
```

关键点不是让两个 Thread 互相聊天，而是 Root 保持团队 authority，并把上一阶段的结构化结果送入下一阶段。

父子 handoff 至少应保留：

- 当前目标；
- 已知证据；
- 新发现；
- 产物引用；
- 不确定性；
- 待证伪点；
- 成功条件；
- 建议下一动作。

完整 transcript 可以留在对应 child context/Thread projection 中；Root 不必把所有历史复制进自己的 context，也不应把整段原始 transcript 无差别灌给另一位科学家。

### 9.2 child 能否再派发 child

从概念上可以。既然 Scientist child 是完整 OmniMind Agent execution context，并继承 Agent-native collaboration tools，它可以为自己的有界专业任务再创建 child。

例如：

```text
Biodata Scientist
├── Dataset discovery child
├── QC child
└── Statistics verification child
```

但递归必须保持同一 OmniMind Agent ownership tree，而不是偷偷切到 Gateway 创建一组普通顶层 Thread。至少需要证明：

- exact parent identity；
- stop one 与 stop subtree 的真实传播；
- budget/permission 不因递归升级；
- terminal child 能准确 return；
- parent 或 Root crash 后不自动 replay；
- 子孙不能获得 Host tools。

本文不先规定最大深度，也不预建 durable hierarchy 数据库。先复用 native recursive child 语义；真实规模证明需要新的预算或可视化合同后，再在既有 owner 内增加。

### 9.3 完成后是否“死亡”

用户需要的是可继续的科学家工作，不是永远占用进程的 daemon。

合理语义是：

- child 完成当前 delegation 后进入 terminal/parked-like 用户体验；
- 它的 identity、结果和必要工作上下文仍可被 Root 找到；
- 新证据到来时，Root 向同一工作身份发起 continuation；
- native Session 可真实 resume 时复用；
- native Session 丢失时，以现有 Thread/context/artifacts 和明确 handoff 重建，并标为 fresh/rebuilt；
- 不声称原 KV cache、进程内对象或所有隐藏上下文仍然存在。

是否需要新增正式 `parked` 状态，必须等 exact runtime 事实和 UI 需要证明；本文只锁定用户结果，不预先批准第二 child 状态机。

## 10. 与 AgentGateway 的长期分工

Gateway 仍然有价值，但它解决的是另一类问题。

| 机制 | 真实形态 | 适合解决 | 不应冒充 |
| --- | --- | --- | --- |
| OmniMind Scientist child | OmniMind Agent-owned parent/child execution | 科学家团队、专业 context、递归 delegation、结果返回 | 独立顶层产品任务 |
| AgentGateway-created Thread | Host-owned ordinary top-level Product Thread | 独立任务、跨 Provider dispatch、长期用户可进入的工作 | native subagent |
| Provider-native child | 对应 Engine runtime 私有 child | 该 Engine 内部 bounded delegation | OmniMind Scientist identity，除非被 OmniMind Agent 正式组合并满足全部边界 |

当前 Gateway 还有一项动态编排限制：capabilities 明确暴露 `oneCreationPlanPerActiveTurn: true`，而 `creationCoordinator` 会以 `creation_plan_locked` 拒绝同一 caller turn 的第二份不同创建计划。这进一步说明它当前并不是 Literature → Biodata → Literature 的完整同 turn Scientist runtime。

不要删除 Gateway，也不要把 Scientist 强塞进去。二者并存，分别服务 Host-level independent task 与 Agent-native child。

## 11. 哪些东西明确不要新建

除非未来新证据推翻，Scientist 方向不授权：

- 第二 Package Manager 或 Package install database；
- 第二 ResourceLoader、Extension Registry 或 Tool Registry；
- 跨 Provider Scientist Package authority；
- 把 AgentGateway 改名为 subagent runtime；
- 为 Scientist 再建一套 Product Thread/Run ledger；
- 永生 Agent 进程或隐藏 daemon；
- 通用 Capability Pack 平台；
- Scientist 专属 MCP Manager；
- 自动 Memory/Knowledge writer；
- 为想象中的千 Agent 规模预建 DAG、Team Builder 或图数据库；
- 靠 Prompt、静态 denylist 或 duplicated tool-name catalog 隔离 Host。

这些不是永远禁止，而是没有当前证据时不得借 Scientist 愿景顺带采用。

## 12. 未来变化演练

以下场景用于检验设计有没有真正复用 owner，而不是提前规定实现文件。

### 12.1 新增一位科学家

理想修改半径：新增/安装一个 Pi-compatible Package/Extension 或 Agent Definition；Root 的发现面自动从当前 resource truth 派生。

不应修改：AgentGateway catalog、其他 Engine adapter、Product Thread schema、Web 中的硬编码 scientist switch。

### 12.2 OmniMind Agent 新增一个内置工具

若它属于 Agent-native built-ins，Scientist child 应通过同一 Agent composition 自然获得，不要求逐个 Scientist profile 更新静态清单。

### 12.3 OmniMind Host 新增一个工具

Root 的 Host Projection 可以按现有 Host policy演进，但 Scientist child 的 tool schema 仍必须保持零 Host。不得要求为每个 Scientist 增加新的 deny name。

### 12.4 更换科学家使用的模型

Scientist identity 与工作关系保持不变；只替换 exact model/session execution resource。模型不可用时准确失败，不 silent fallback，也不把 Scientist 改名成 Provider。

### 12.5 App 在 child 运行中退出

Product child Thread 和已落盘结果仍可读；active child 恢复为 `interrupted`。只有 native adapter 能证明 continuation 时才 resume，否则明确 rebuilt，不自动重放可能产生副作用的工作。

### 12.6 Scientist Package 被更新或移除

历史 Thread/result 不应因此消失或被改写。新 Session 按当前原生 Package lifecycle解析；无法再实例化时准确 unavailable。是否冻结旧资源 snapshot、能否从 exact package version恢复，遵循 Pi 原生能力和未来真实产品决定，不先建设 LKG/lease/migration 平台。

### 12.7 整体退休 Scientist 能力

理想删除边界是：移除 Agent Definition/child composition seam 与对应投影；Pi package、普通 Extension、AgentGateway、其他 Engine 和 Product Thread 主体不需要迁移或保留兼容双轨。

## 13. 当前事实、已确认判断与未知项

### 13.1 已由代码或 adopted source 证实

- Gateway-created Threads 是 ordinary top-level Threads，不是 subagents；
- Gateway creation provenance 不建立 parent lifecycle；
- Gateway 当前每个 active caller turn 只允许一份 creation plan；
- Synara 的 native child projection 与 Agent Gateway 是两条不同历史能力；
- OmniMind 当前稳定架构区分 Product Thread、Provider Session 与 bounded child；
- Pi AgentSession/ResourceLoader/Tool Registry 是 OmniMind Agent runtime 内的 Extension/Tool 生命周期 owner；
- 当前 OmniMind Root Session 通过 hidden Host Projection Extension 获得 eager Host tools；
- Host catalog/execution/authorization 归 AgentGateway 与 Host service，而非 Pi Extension Registry。

### 13.2 维护者已经明确的产品判断

- 长期方向是可安装、可组合的 N 位科学家；
- Main 保持 general，不常驻所有垂类能力；
- 科学家只属于 OmniMind Agent，不属于其他 Engine；
- 能复用的皆为复用，不因 ownership 重写成熟机制；
- scientist 是可安装定义，subagent 是运行时形态；
- Thread 是工作记录/投影，不是 Agent 本体；
- Scientist child 默认拥有完整 OmniMind Agent 内置工具；
- Scientist child 拥有零 OmniMind Host 工具；
- child 可以继续、再次调用，并应保留真实可恢复的上下文；
- child 可以递归派发 child，只要仍在 OmniMind Agent ownership tree 内。

### 13.3 尚未证实、不得写成已交付

- exact adopted Pi runtime 是否已有可直接使用的 Agent Definition/agent factory seam；
- exact Pi child API 是否支持独立/per-child Tool Registry 或 active surface；
- child 是否会自动继承 Root 的 hidden Host Projection Extension；
- 所有 OmniMind Agent built-ins 在 child 中的实际继承行为；
- recursive spawn、steer、stop subtree、budget 与 permission propagation 是否完整；
- native Session 完成后的真实 resume/park 能力；
- Scientist identity 是否只靠 native child refs 和 Thread projection就足够，还是需要一个更窄持久 working identity；
- 大量已安装 Agent Definitions 的发现、schema/context成本与真实选择准确率；
- first-party、team 和第三方 Scientist Package 的分发与信任表面。

这些未知需要 exact-source audit、focused harness 与真实 journey 回答，不能由本文替实现作答。

## 14. 最强反方压力测试

### 14.1 这是否只是 Role/Prompt 换名

如果一位 Scientist 只需要一段 Prompt 和几个已有 Skill，而且不需要独立 context、递归 delegation、继续和精确 child control，那么它可以只是 Role/Skill 组合，不应升级成新的 Agent Definition。

Scientist identity 的准入证据来自维护者明确购买的稳定变化轴：未来会持续安装 N 位专业科学家，并要求它们拥有独立专业资源与可继续的 child 工作关系。实现仍应先尝试最薄 Extension descriptor，不默认建立重对象。

### 14.2 完整继承 built-ins 会不会再次造成注意力稀释

维护者担心的是一千份垂类 Skill/MCP 同时进入 Main，而不是少量、稳定的 Agent Core built-ins。Scientist child 继承通用 read/edit/Bash/collaboration 等基础工具是完整 Agent 能力；专业资源仍按 scientist/任务解析。

若未来 Agent built-ins 本身膨胀到显著 schema 成本，应在 Agent Core owner 内解决工具表面，而不是让每位 Scientist 维护一份排除列表。

### 14.3 为什么 Root 可以有 Host，而 child 不可以

Root 代表当前用户任务，负责把 Agent 结果投影到产品、创建长期任务或操作 Browser/Goals/Automations。Scientist child 是被委托的专业执行者；让它直接获得 Host authority 会绕过 Root 的范围判断，并把专业 Package 变成 app-control principal。

这不是安全等级高低，而是职责不同。child 可以提出 Host 建议，但由 Root 决定是否执行。

### 14.4 如果某个 Provider-native child 很成熟，为什么不用

可以复用它的实现，前提是它能满足 OmniMind Scientist 的 identity、tool isolation、event projection、stop/resume 和 ownership contract。来源或底层 primitive 不决定 owner，实际 lifecycle 才决定。

如果 child 永远属于 Claude/Codex parent Session、只能使用其私有工具面，或者无法剥离 Host schemas，就仍只是该 Engine 的 native child，不能因 UI 相似而冒充 OmniMind Scientist。

### 14.5 为什么不让 Scientist 直接使用 Gateway 创建其他专家

Gateway 可以创建独立顶层任务，但会改变 context ownership、恢复、用户可见性与 parent responsibility。Scientist 间真正的嵌套派发应优先使用 Agent-native collaboration；只有用户明确需要独立、可单独进入的跨 Provider任务时才走 Gateway，并准确称为独立 Task，而不是 child。

## 15. 候选设计的最小 owner cut

若未来维护者授权实现，本研究支持的最小责任切口是：

```text
Demand
  安装和组合 N 位科学家；由 OmniMind Agent 自己派发；完整 Agent tools；零 Host tools。

Non-goals
  不建设第二 Package/Thread/Gateway/Scheduler/Memory/Registry；不统一其他 Engine 的 subagents。

Existing truth
  Pi resource/session/tool lifecycle + OmniMind bounded-child/Product projection + Host Projection。

Only missing seams to prove
  1. package/extension 如何贡献一个可发现的 Agent Definition；
  2. Root 如何用 existing child primitive实例化它；
  3. child 如何在 registry/schema形成前排除 Host Projection。

Proof
  安装两位示范科学家；Root只见薄descriptor；Literature→Biodata→Literature continuation；
  recursive bounded child；stop one不杀Root/sibling；crash后interrupted；child Host schema精确为0。
```

如果现有 Pi public seam 已经能表达其中某项，就直接接线，不再为那一项增加新 abstraction。

## 16. 最终 disposition

本轮结论是 `retain insight / candidate product cognition`，不是 Gate B 或当前架构变更。

最值得长期保留的产品定义是：

> **OmniMind Scientist Ecosystem 是 Pi-compatible 资源在 OmniMind Agent 中形成的可安装 Agent 组合。Scientist Package 描述一位科学家；OmniMind Agent 将其实例化为自己拥有的 child。科学家完整继承 Agent-native能力，按需加载垂类资源，但从未成为 OmniMind Host。**

最值得长期保留的工程判断是：

> **先复用，再补 seam；拥有团队，不重写螺丝；用真实 child lifecycle 定义 subagent，不用 Thread 名称或 UI 外观定义。**

## 17. 复验与重新进入触发器

只有以下变化发生时，下一会话才需要重新打开本文的来源结论：

- Pi upstream 新增或改变 child Agent、Agent Definition、Session fork、per-child tool surface 或 resume API；
- bundled OmniMind Agent 的 exact Pi revision 变化；
- Host Projection 不再是 session-scoped eager Extension，或 Host catalog/tool owner 改变；
- Synara/OmniMind 的 native child identity、Thread projection、stop/steer/background/recovery合同变化；
- Gateway-created Thread 开始建立真实 parent-owned lifecycle，而不只是 provenance 字段；
- 维护者授权将 Scientist cognition 接受为稳定架构或进入实现；
- 真实科学任务证明“Role/Extension descriptor + existing child primitive”不足；
- 真实第三方分发带来新的签名、权限、供应链或沙箱要求。

若方向被接受，稳定合同应进入：

- Agent/Session/Tool/Extension/Host ownership：[`architecture/execution.md`](../architecture/execution.md)；
- child identity、Thread projection、恢复与结果真实性：[`architecture/product.md`](../architecture/product.md)；
- Scientist child 的列表、控制、继续和失败呈现：[`architecture/workbench.md`](../architecture/workbench.md)；
- exact Pi/Synara source adoption：根 [`source-adoptions.json`](../source-adoptions.json) 与对应 intake。

本文继续只承担“为什么这样判断、最强反证是什么、什么变化会要求重审”，不成为第二架构 owner。
