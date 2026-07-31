# 独立 OmniMind：创立宪法

> 状态：新产品的唯一产品与架构真相源
>
> 仓库状态：本仓库就是文中定义的独立新产品仓库；创立文档已经迁入，生产实现尚未开始
>
> 适用对象：未来在本独立仓库选择移植物、验证探针、搭建第一版内核与工作台的执行者
>
> 附件：[施工任务书](execution-brief.md) · [决策与纠偏记录](discovery-record.md)
>
> 外部来源、移植物、固定 revision 与授权只能在本 README 的“来源与移植物披露”中出现。

## 0. 这份文档是什么

这不是当前 OmniMind 的改版需求，也不是一次渐进迁移计划。它定义的是一个同名但独立的新产品。

本仓库已经完成“创建独立仓库”这一步。下文保留创立时的完整裁决语境：

- “本仓库”指独立新产品；
- “当前仓库”或“旧仓库”指创立研究发生时的旧产品仓库；
- “创建新仓库”类表述从现在起视为已经完成；
- 尚未完成的是进入生产前的逐来源权利核实、五个可丢弃探针、生产技术骨架和任何功能移植。

新 OmniMind 应在全新的 Git 仓库中诞生。当前仓库继续作为另一个产品独立存在，二者不共享运行时代码、不维持兼容层、不做双向同步。当前产品在对外产生名称冲突以前应改名或明确标记为 Classic；新产品保留 `OmniMind` 名称。

本文件是新产品的创立宪法。附件只负责回答两类问题：

- `execution-brief.md`：一个没有本会话上下文的新 Agent 应按什么顺序把判断变成仓库；
- `discovery-record.md`：用户究竟表达过什么、纠正过什么，防止后来者把激进目标重新解释成保守重构。

所有 donor 身份、产品名称、供应商名称、模型家族名称、仓库地址和来源关系只在本 README 披露。附件使用中性角色代号，不重复外部身份。

若附件、旧文档或现存代码与本文件冲突，以本文件为准。若未来需要推翻本文件中的决定，必须用新证据明确改写本文件，不能在实现里悄悄形成第二套事实。

## 1. 创立者的真实授权与态度

执行者必须先接受以下事实，再做任何架构判断：

1. 当前产品尚无需要保护的用户群体。兼容性、迁移成本和旧功能覆盖率不是默认约束。
2. 时间不是主要约束。可以删除、重构、替换全部代码和文档，也可以放弃已经投入很多的功能。
3. “已经实现”“测试很多”“功能完整”“团队熟悉”都不是保留理由。只有面向未来仍然正确，才是保留理由。
4. 目标不是让别人看不出 Claude Code 的影子，而是从产品定义、核心概念、运行时边界和用户体验上真正不再由 Claude Code 决定。
5. 可以深度借鉴、直接搬运、抽取、改造或 fork 优秀实现。不得因为“必须原创”而重复造轮子。
6. 搬运不是无条件吞并。每一块移植物都要证明它比重写更合算，并切除不属于新产品的宿主概念。
7. 用户偏好极度激进、犀利、未来化、可扩展、高性能、优雅和易维护。执行者不应主动把这个偏好降格成“风险最小的常规重构”。
8. 简洁不是功能少，也不是把所有能力塞进一个类或一个进程。简洁是：少量稳定概念、清楚的所有权、单一事实来源、可删除的适配层。
9. 用户个人通常愿意给 Agent 最大权限。产品不应制造逐命令确认的权限戏剧，但必须如实区分工作区信任、第三方代码信任和不可逆外部动作。
10. 产品服务所有能从通用 Agent 获益的人。科研、生物医学、软件开发、合同分析、训练和仿真都只是 workload；任何领域都不得成为一级产品模式、运行时或内核本体。高强度科研任务可以做压力测试，但不能定义产品。

这些不是情绪性修辞，而是范围、兼容性、复用、权限和产品定位的正式输入。

## 2. 产品身份洁净度

创立者对产品身份、代码命名和设计一致性有极强洁癖。新仓库实行“作者区零外部产品身份残留”：

- 源码文件、目录、package 名、类型、函数、变量、接口、事件、数据库字段和 IPC channel 不出现前代产品、donor、供应商或其模型家族名称；
- 注释、测试、fixture、snapshot、命令、日志、错误文案、遥测字段和生成物不出现这些名称；
- UI 不硬编码这些名称，也不把某一来源变成产品默认身份；
- 除根 `README.md` 外，产品的 Markdown、设计说明、架构文档、任务书和示例不出现这些名称；
- adapter 按稳定职责命名，例如 `AgentEngineAdapter`、`ModelTransport`、`KnowledgeCapability`，不按来源命名；
- 用户配置、上游 API 或插件在运行时返回的真实 provider/model 名可以作为外部数据原样显示，但不得进入产品静态本体；
- 来源、固定 revision、移植范围、授权和致谢全部集中在根 `README.md` 的一个披露区；
- 法律要求保留的版权与许可证原文可放在 `LICENSES/`，只作为法定材料存在，不进入产品叙事或 namespace。

如果直接包依赖会让外部身份扩散到 import、lockfile、错误栈和生成代码，优先评估 fork/vendor：

- 用中性内部包名；
- 保持来源历史或固定原始 revision；
- 在 README 披露；
- 在 `LICENSES/` 保留法定原文；
- 不改写作者身份，不冒充原创。

洁净不是来源洗白。对外部名字的集中披露必须比普通项目更完整；对产品作者区的清理也必须比普通“换皮”更彻底。

通用基础库的包坐标属于供应链事实，不等于产品身份；它们只可出现在 import、manifest、lockfile 和法定材料等技术必需位置，不能进入领域命名、产品文案或设计说明。首选引擎、工作台 donor、旧产品、知识 donor、provider 和模型家族属于身份级来源，适用更严格的零残留规则。

新仓库的 cleanliness checker 应从根 README 中读取类似下面的机器块。实际名单按真实来源增删，匹配应覆盖大小写、空格和连字符变体；过宽的普通词用组合模式而不是裸词。

```identity-denylist
anthropic
claude
claude-code
haiku
sonnet
opus
proma
weknora
opencode
cursor
codex
pi-coding-agent
pi-agent
pi-adapter
pi-engine
pi-session
pi-protocol
pi-server
omniharness
slurm
sogen
openai
gemini
qwen
ollama
lm-studio
```

调度器、provider 和模型的真实名称可由用户配置或外部探测动态进入 UI。生产源码使用协议与职责名，例如 `batch-scheduler`、`chat-completions`、`messages`、`local-model`；不要把动态显示名写回 schema 枚举。

## 3. 一句话产品定义

**OmniMind 是一个本地优先、可连接远程执行环境、以可持续工作状态为中心的通用 Agent 工作台；不同领域共享同一套文件、工具、编排、恢复和外部执行能力。**

这句话包含六个不能拆开的判断：

- **本地优先**：界面、用户状态、凭据、信任决策和主要模型接入默认留在用户电脑；
- **远程可达**：文件、终端、进程和调度任务可以在 SSH/HPC 环境执行，且是第一阶段能力，不是以后再补的插件；
- **工作状态中心**：产品保存一项工作为什么走到这里、执行过什么、哪些副作用仍未知，而不只是聊天消息；
- **通用 Agent**：编码、科研、写作、数据分析、合同处理和其他复杂工作共享同一内核；
- **领域中立**：领域任务只验证能力强度，不产生 Research Mode、Scientific Thread、科研专用 Agent、记忆、Workflow 或 Remote；
- **能力开放**：OmniData、OmniEngine、OmniScholar 等以标准工具能力进入，不塑造 OmniMind 的内部本体。

OmniMind 不是：

- 新的模型供应商或 API 网关；
- Claude Code、Codex、Cursor 或 Pi 的换皮；
- 一个聊天壳；
- 一个内置全套 RAG/知识库/生物医学平台的巨型套件；
- 一个把所有能力都插件化、自己不承担产品体验的空壳；
- 一个为了展示“多 Agent”而堆叠编排术语的框架；
- 一个以科研、编码、知识库或 Remote 为一级模式切割用户心智的套件；
- OmniHarness 的新实现。新产品中不创建 `OmniHarness` 模块、接口、兼容别名、占位符或未来扩展点。

## 4. 产品不变量

### 4.1 模型和执行引擎可更换

模型供应商是来源，不是身份。OpenAI、Anthropic、国产模型、兼容端点、Ollama、LM Studio 和未来来源应处于同一层级。

Pi 是当前最有希望的 Agent 引擎和生态入口，但也只是引擎。产品的持久状态、远程位置、信任决策、外部任务和文件所有权不能被 Pi 的暂时数据结构吞掉。

### 4.2 用户的文件仍是用户的文件

本地文件以本地文件系统为权威；远程文件以远程文件系统为权威。OmniMind 不偷偷复制一套“真正版本”，不透明全量同步，也不让数据库成为用户文档的唯一出口。

### 4.3 一件事实只有一个权威

- 对话消息在第一阶段由固定版本的 Pi session 格式拥有；
- 产品 journal 记录接纳、策略、动作、副作用、检查点、外部任务、恢复和分支；
- 远程文件由远程主机拥有；
- Slurm 等调度任务由调度器拥有；
- LLM Wiki 的可读 Markdown 是 Wiki 内容本体，可重建索引不是本体；
- 原始资料永远是资料事实源，生成 Wiki 只是可审查的综合物。

不得为了方便 UI 或“统一存储”再复制一套平行真相。

### 4.4 失败必须能被准确命名

“没有收到完成消息”不等于“没有执行”。副作用状态至少要能区分：

`proposed → policy_decided → started → settled | outcome_unknown`

SSH 断开不等于远程进程失败，界面关闭不等于 Slurm 任务终止，模型流中断不等于已启动的工具没有产生副作用。恢复逻辑不能用乐观猜测填补事实空洞。

### 4.5 扩展能力不得污染核心

Omni 系列科学能力、MCP、Skills、函数工具、外部服务和未来生态都通过统一的能力描述与调用路径进入。核心不因工具叫 OmniScholar 就出现 Scholar 专用类型，也不因工具能做生物信息学就出现生物医学分支。

但“统一调用机制”不意味着产品的一切都外置。定义工作台体验、文件与执行位置、恢复、Wiki 生命周期、远程连接和信任的能力可以原生存在。

## 5. 产品原生能力与外部能力的边界

### 5.1 产品必须原生负责

以下能力定义了 OmniMind 是什么，应由产品自己承担：

- Thread 的创建、分支、恢复、重开和可审查历史；
- 本地与远程 `ExecutionTarget`；
- 文件浏览、搜索、打开、编辑、diff、检查点和恢复；
- 终端、进程、端口转发和远程任务可见性；
- 受信工作区与第三方扩展的信任状态；
- Agent 动作、工具进度、失败、未知副作用和恢复的呈现；
- 面向个人资料的文件原生 LLM Wiki；
- 工作台布局、导航、后台运行、排队、打断和通知；
- 能力发现、启用和本次 Thread 的最小工具注入；
- 性能、持久化和故障恢复所需的基础设施。

“原生”指产品对行为和用户体验负责，不等于全部硬编码进 kernel、常驻模型上下文或运行在同一进程。正确分层是：

- kernel 持有少量稳定原语、唯一状态权威、生命周期和回执；
- bundled first-party capability/strategy modules 随产品交付、无需安装、按需激活、可关闭；
- compatibility adapters 把外部生态映射到同一原语；
- 第三方 package 不得夺取 Thread、Todo、Team、Workflow、文件、外部任务或更新治理的状态权威。

原生能力完全可以由 package、fork、移植或重写组成。实现来源不决定产品所有权。

### 5.2 应作为外部能力进入

以下能力默认是工具、函数、MCP、Skill、Pi package 或受控外部连接：

- OmniData；
- OmniEngine；
- OmniScholar——在这里把它理解为知识能力，不赋予它特殊本体地位；
- OmniSage 或其他科学问题形成能力；
- 文献解析、数据库查询、组学分析、统计方法和领域工作流；
- 用户现有的 WeKnora；
- 其他机构数据、软件、实验和知识服务。

这些能力共享同一套能力协议：描述输入输出、进度、取消、错误、输出引用、执行位置和信任需求。第一版不为每类能力创建专用插件框架，也不因能力属于某个领域而获得内核特权。

### 5.3 暂不建立原生 UI 插件 ABI

第一版扩展返回统一的进度、日志、结构化结果和 `OutputRef`，并可在工作区写入普通文件。第一方 bundled modules 可以使用产品内部 UI contract，但这不等于对第三方承诺稳定 ABI。只有至少两个真实第三方扩展无法用公共呈现方式表达时，才冻结自定义 UI 插槽。

现在提前定义复杂 UI 插件 ABI，会把尚未理解的产品形态冻结成长期兼容负担。

## 6. 极小而耐久的领域内核

丰富的产品不需要丰富的持久领域本体。第一版只承认两个聚合根。

### 6.1 `Thread`

`Thread` 是一段可持续、可分支、可审计的人机协作历史。它不是一个临时网络 session，也不等于单次模型请求。

最小字段：

- `ThreadId`
- 主要 `LocationRef`
- 可选父 `ThreadId` 与分支起点事件
- `engineKind`
- `engineSessionRef`
- 创建、更新和归档时间

Thread 之下可以产生：

- `TurnId`：用户接纳的一轮意图；
- `AttemptId`：为完成某一 Turn 发起的一次引擎尝试；
- `ActionId`：有可观察后果的一个动作；
- `CheckpointRef`：文件/状态恢复点引用；
- `OutputRef`：大输出、报告、图片、数据或其他产物引用；
- `ExternalExecutionRef`：外部进程或调度任务引用。

这些是精确引用或 journal 事件，不应被升级成万能聚合。

### 6.2 `ExecutionTarget`

`ExecutionTarget` 表示文件和执行实际发生的环境：

- local；
- SSH 主机；
- 经跳板机到达的远程环境；
- 未来经证据证明需要的其他执行环境。

`LocationRef = executionTargetId + absolutePath`

这一个引用应统一表达本地目录、远程目录、附加位置和 Wiki 所在位置。不要再造一个含混的 Workspace 数据库对象去复制文件系统事实。

### 6.3 明确拒绝的核心聚合

以下名称在证明不可替代以前不得成为持久核心对象：

- `Workspace`：用 `LocationRef`、信任/授权和 UI 投影表达；
- `Work`：语义过宽；
- 持久 `Session`：持久协作叫 Thread，Session 留给短命协议、进程、SSH、MCP 或引擎会话；
- `Run`：通常只是 Turn/Attempt 的投影；
- `Resource`：改用精确引用；
- `Job`：调度器拥有 Job，核心只保存 `ExternalExecutionRef`；
- `Artifact`：生产者或文件系统拥有实体，核心保存 `OutputRef`；
- `Project`：从位置、VCS 和可选用户别名投影；
- `ChangeSet`：从 journal 与版本控制投影；
- `Evidence`：证据是工具输出、测试结果和 journal 视图，不先建一个万能证据数据库；
- `Wiki` 聚合：Wiki 是普通可见文件、manifest 与可重建索引；
- `RecoveryPoint`：使用 `CheckpointRef`。

同样避免 `Manager`、`Helper`、`Utils`、`GeneralContext`、`GeneralAgentEngine` 这类把边界含混化的命名。

### 6.4 Journal 的职责

产品 journal 追加记录：

- turn 被接纳；
- 引擎尝试与相关 ID；
- 动作提出、策略决定、开始、完成或结果未知；
- 检查点与恢复；
- 输出引用；
- 外部执行引用与状态观察；
- 中断、崩溃恢复和分支；
- 位置、信任与能力选择的必要变化。

Journal 不复制 Pi 的完整消息文本，不复制远程文件内容，不伪造调度器状态。它保存的是产品必须独立掌握的行为事实。

## 7. 第一版运行时形态

### 7.1 默认技术形态

第一版优先采用：

- Electron；
- React renderer；
- TypeScript/Node 主进程；
- Pi SDK 直接运行在 Electron main；
- 本地持久化与文件访问由主进程承担；
- renderer 与 main 之间使用窄、版本化、类型明确的 IPC；
- 远程通过系统 OpenSSH 建立一条连接，在其上运行一个极小 worker 和一条复用协议。

第一版不默认采用：

- Tauri + Bun sidecar；
- 本地 HTTP server；
- 本地 WebSocket；
- Pi RPC；
- 一开始就拆独立 daemon；
- REST + WebSocket + gRPC 三套远程协议；
- 为将来可能需要而建的微服务。

这不是对 Electron 的永久宗教承诺，而是当前最少边界、最容易直接使用 Pi TypeScript 生态、最适合移植 Proma 工作台的起点。

### 7.2 何时拆出 Pi 进程

只有出现可测证据时，才把 Pi 移到 Electron utility process 或独立本地服务，例如：

- Agent 崩溃显著拖垮桌面；
- 主进程长任务阻塞无法通过 worker/异步边界解决；
- 需要独立热升级；
- 多窗口/多客户端确实共享一个长寿命 Agent；
- 安全边界需要操作系统级隔离。

不能用“架构看起来更专业”作为多进程理由。

### 7.3 进程和状态原则

- renderer 不拥有业务真相；
- main 不创建第二份 Pi transcript；
- 所有跨边界命令有 request/correlation ID；
- 大输出写入文件或对象存储，由 `OutputRef` 引用；
- IPC 传输增量、摘要和引用，不搬运巨型全文；
- 后台 Thread 只推送摘要状态，激活 Thread 才接收细粒度流；
- 恢复先根据 journal 重建产品状态，再重新观察外部权威。

## 8. Pi 的角色

### 8.1 当前裁决

Pi 是新内核的首选 Agent 引擎，也是首发必须可用的生态入口。第一版既要围绕成熟 session SDK 建立很薄的中立引擎边界，也要提供 Pi-compatible package bridge；不能以“OmniMind 公共 SDK 尚未冻结”为由把最有价值的现成生态推迟到以后。

可以：

- 直接依赖 Pi 包；
- fork Pi；
- 移植 Pi 局部源码；
- 给 Pi 上游贡献必要接口；
- 用 Pi extensions、skills、tools 和已有生态；
- 在固定 SHA 上做针对性修改。

不需要为了“独立感”重新实现 Pi 已经做得好的部分。

“一起打包”指最重要的第一方能力随 OmniMind 发布、无需另装，但不意味着全部扩展常驻、全部塞进一个 mega extension 或全部注入模型上下文。Agent 按任务激活，用户可以查看、关闭、停止或固定；状态仍由 OmniMind 原生运行时拥有。

### 8.2 不能交给 Pi 的事情

Pi 当前自我定位仍偏最小终端 coding harness。以下内容必须由 OmniMind 保持所有权：

- Thread 的稳定身份和产品生命周期；
- ExecutionTarget 与 LocationRef；
- 远程连接与 HPC 调度；
- 信任和不可逆外部授权；
- 产品 journal 与副作用状态；
- 文件/输出/外部任务引用；
- 工作台投影；
- LLM Wiki 的文件生命周期；
- 移植物和扩展治理。

Pi 的 API、实验性 remote protocol 和未来 `AgentHarness` 抽象可以演化，不能直接当作 OmniMind 永久宪法。

### 8.3 集成纪律

- 第一轮只做可丢弃集成探针；
- 固定 Pi repo、SHA、包版本和许可证；
- 证明 session 创建、流式事件、工具注册、取消、恢复和 branch；
- 证明如何关联 `ThreadId/TurnId/AttemptId/ActionId`；
- 证明不复制 transcript；
- 证明 Pi 单 cwd 限制如何通过 LocationRef/ExecutionTarget 在产品层表达；
- 不在探针通过以前大规模搬旧 UI 或旧 runtime；
- 不为了兼容多个引擎提前造抽象森林。第二个真实引擎出现后，再从差异中提炼接口。
- 首发兼容 Pi 的 tool、skill、prompt、extension lifecycle、动态注册、active tools、AbortSignal、stream update、command、headless 降级和必要 journal 映射；
- 依赖 raw TUI、provider mutation、私有 session control、monkeypatch 或第二状态真相的 package 可以 fail-fast，但必须在加载前给出清楚 compatibility report；
- 不宣称虚假的“100% 所有 package 兼容”，也不因少数不兼容包而放弃生态；
- Pi compatibility surface 可以早期稳定，OmniMind 对第三方公开的原生 SDK 等多个 bundled modules 与真实 Pi package 验证后再冻结。

## 9. 本地与远程执行

Remote 预计只占总体使用的一部分，但它是不能后补的高价值通用能力。生物信息、训练、构建、仿真、部署和数据处理共享同一语义。Remote 不是独立模式、特殊 Workspace 或永久导航；只有当前位置、终端、文件或外部任务实际位于远端时才进入用户视野。

### 9.1 默认拓扑

默认形态是：

- OmniMind UI、用户凭据、模型接入和主要 Agent loop 在本地电脑；
- 项目文件、终端命令、分析进程和调度任务可以位于远程；
- 本地通过系统 OpenSSH 建立连接；
- 远程部署极小、可校验、可升级的 worker；
- 一个 SSH 连接上复用文件、PTY、进程、端口、输出、传输和调度消息；
- 模型请求默认仍从本地发出。

这与“把完整 OmniMind server 安装到远端”是两种不同架构。后者不是默认。

### 9.2 OpenSSH 与凭据

优先复用系统能力：

- `~/.ssh/config`；
- ProxyJump；
- ssh-agent / 系统钥匙串；
- known_hosts；
- 交互式 2FA/askpass；
- ControlMaster 或等价连接复用；
- 用户已有安全策略。

凭据永远不进入命令行参数、日志、journal、截图、崩溃报告或可分享证据。

主机密钥变化默认 fail closed。不能为了“连接顺滑”静默接受中间人风险。

### 9.3 远程 worker 的最小职责

第一版 worker 只承担结构化远程原语：

- 文件 stat/read/write/list/search/watch；
- PTY 与非交互进程；
- 取消、信号和退出状态；
- 二进制流传输；
- 端口转发信息；
- 大输出落盘与引用；
- Slurm submit/query/cancel/log/reconcile；
- worker 版本和能力协商。

所有 helper 都按 OS/arch、协议版本和 content digest 固定。活跃 Attempt 或外部任务租用既有 generation；更新不得中途替换其 helper 或 adapter。

它不承担：

- 模型供应商配置；
- OmniMind 用户设置；
- 完整插件商店；
- 本地 Thread 数据库；
- 完整 Pi runtime；
- UI；
- 用户全部扩展的自动镜像。

### 9.4 先做本地耐久进程与一个具体调度器

不要先建 `SchedulerFramework`。先把本地进程的 PID/日志/退出状态/重启对账做对，再把 Slurm 做成第一个外部调度器：

- 登录节点与计算节点分离；
- 提交产生远程 manifest 和本地 `ExternalExecutionRef`；
- SSH 断开、电脑休眠、应用退出后任务仍独立生存；
- 重连后通过 `sacct` / `squeue` 等权威来源对账；
- stdout/stderr 和产物可增量查看；
- cancel 是显式外部副作用；
- 状态不确定时显示 `outcome_unknown`，不伪造失败或成功；
- Thread attempt 结束不自动杀死已提交任务，除非用户明确选择并获得相应授权。

第二个真实调度器出现以后，再提炼公共接口。

### 9.5 文件权威与同步

远程文件留在远程。编辑、搜索、Wiki 生成和分析都可在原位置执行。

允许：

- 明确下载一个输出；
- 明确上传一个输入；
- 用户配置的目录同步；
- 为性能做有校验的局部缓存。

不允许：

- 默认透明镜像整个项目；
- 本地和远程同时声称是权威；
- 用 base64 JSON 搬运大二进制；
- 因网络断开把缓存误写回旧版本。

## 10. 文件原生知识与 Agentic Wiki

### 10.1 产品判断

OmniMind 不默认把个人或项目资料送进传统 chunk-embedding-vector RAG。对几十到约一千份论文、代码、合同、笔记、网页、数据说明、会议材料和混合文件，优先采用可见 Markdown Wiki + exact/FTS + agentic search。

这不是宣称 RAG 永远无效。OCR/扫描件、多语言语义召回、超大规模知识库、机构权限检索和已有专业系统可以通过按需 bundled backend、curated extension 或外部能力提供。是否升级必须由真实 recall、latency、更新成本和权限边界证明，不能由“文件数量超过某阈值”决定。

### 10.2 信息所有权

- 原始来源文件不可被 Wiki 修改；
- source manifest 记录来源位置、哈希、版本和摄取时间；
- 生成的 Wiki 是用户可见、可编辑、可版本化的 Markdown；
- `index.md` 是入口目录；
- `log.md` 记录重要摄取、刷新、修复和来源变化；
- 搜索索引、缓存和 FTS 数据可删除重建；
- 来源变更使依赖页面变成 stale，而不是静默覆盖；
- 生成内容是综合与导航，不替代原始材料；
- Wiki 中的结论必须能回到来源引用或明确标为未核实综合。

### 10.3 原生但模块化

文件原生知识是 OmniMind 原生负责的产品能力，因为用户需要统一的初始化、摄取、查询、保存、刷新、lint、diff 和恢复体验。其实现可以是 bundled first-party module，不要求所有知识逻辑驻留 kernel。

它不需要成为领域聚合或独立知识平台。实现可由普通文件、manifest、Git/检查点、FTS 和一组确定性 helper 组成。

概念操作：

- `init`
- `ingest`
- `query`
- `save`
- `refresh`
- `lint`

这些不一定成为公开 CLI 命令，但行为边界应清楚。

### 10.4 Agent 与确定性 helper 的分工

Agent 负责：

- 阅读和比较来源；
- 规划 Wiki 结构；
- 生成或重构页面；
- 沿索引和链接做 agentic search；
- 发现矛盾、空白和待刷新内容；
- 把一次高质量查询保存为可复用页面。

确定性 helper 负责：

- 来源哈希与 manifest；
- 原子写入；
- FTS；
- 链接、引用和 schema lint；
- 依赖与 staleness；
- diff、checkpoint 和 rollback；
- 并发锁与失败恢复。

不要让 LLM 负责本可确定验证的完整性，也不要让数据库吞掉人可读的 Wiki。

### 10.5 编辑与后台行为

在受信工作区，Agent 可以一次修改多个 Wiki 页面，不逐文件弹确认；所有变化都通过普通 diff、journal 和回滚可见。

第一版不默认静默夜间重写。定时 refresh/lint 必须由用户显式开启，并有范围、预算和失败可见性。

### 10.6 搜索演进

初始使用：

- `index.md` 和目录结构；
- grep/ripgrep；
- 文件名、标题、链接与引用；
- SQLite FTS 或同等级本地全文索引。

Embeddings、QMD、reranker、语义索引或混合检索是按真实召回失败加入的可删除投影，不设武断的“超过 N 篇就切 RAG”阈值。外部大型知识服务保持自己的数据库、权限和生命周期；删除连接不能删除外部知识。

## 11. 权限与信任

### 11.1 基本立场

受信工作区中的 Agent 默认拥有完成工作所需的完整文件和命令权限。产品不把每一个 `git diff`、测试或普通编辑变成确认仪式。

但“我信任 Agent”不等于“我信任任何第三方代码”，也不等于“任何不可逆外部动作都无需边界”。

### 11.2 三种不同信任

1. **工作区信任**

   该目录中的代码、指令和工具是否允许执行。未受信工作区只能被查看，不运行其代码或自动加载其扩展。

2. **扩展信任**

   Pi extension、plugin、Skill、MCP server 或移植代码以什么权限运行。若原生扩展与主进程同权限，产品必须直接说明“它以你的用户权限执行”，不能用“沙箱”字样制造错觉。

3. **外部不可逆授权**

   发布、凭据轮换、高费用计算、删除远程持久数据、取消关键调度任务、改生产权限等动作需要独立授权和清楚影响范围。

第一版不为了形式完整实现巨大跨平台 sandbox 矩阵。先保证信任语义真实、默认简单、危险外部后果可控。

## 12. 工作台与交互

### 12.1 不是聊天应用

界面应围绕“正在做的工作”组织，而不是围绕消息气泡组织。稳定骨架包括：

- 导航与位置；
- 当前 Thread 和 Agent 过程；
- 文件、预览、终端、diff、输出和远程任务；
- 后台 Thread 的运行、阻塞和未读状态；
- 能力与信任的渐进披露。

### 12.2 Proma 的地位

Proma 是首要工作台设计与代码移植物来源之一，不只是灵感板。

可以直接移植：

- 整个 renderer 子树；
- 布局和组件；
- 状态逻辑；
- stream/scroll/diff/queue 等机制；
- preview、文件树、会话导航、后台状态和用户提问交互；
- 其他经探针证明值得保留的前端块。

移植时必须剥离：

- Claude SDK/Claude Code 产品概念；
- Proma 自己的巨型 `electronAPI` 边界；
- 把所有状态聚进一个会话对象的设计；
- 与旧 IPC、Jotai 全局状态、旧 runtime router、旧模型注册表的无必要耦合；
- 与新领域内核冲突的命名。

判断单位可以是一组文件、一个组件域、一个完整 renderer，甚至 fork；不人为限定为“只能搬纯函数”。真正标准是移植后的概念纯度和总维护成本。

### 12.3 必须保留的交互能力

- 工作按位置组织，但不把位置变成臃肿 Workspace 聚合；
- running / blocked / unread 一眼可见；
- 后台运行不会消失；
- 用户可以 queue、append、interrupt；
- Agent 可在流程中提出结构化问题；
- 文件树、搜索、reveal、拖拽和多标签/分屏；
- Markdown、PDF、Office、图片等预览；
- changes、diff、checkpoint、recovery；
- 本地/远程位置和能力状态清楚；
- 受信与未受信状态不含糊；
- 长输出不会把对话和渲染拖垮。

视觉上追求克制、精确、密集、有秩序的 IDE 工作台；拒绝营销式 hero、渐变光球、装饰卡片和只为“AI 感”存在的动画。

### 12.4 已锁定的工作台心智

- 普通 Chat 可以没有文件夹；工作型 Thread 的主要位置通常是一个目录，但目录不是聊天的强制前提；
- 每个 Chat 独立保存自己的工作台标签、打开文件、分屏和浏览上下文，离开后重新进入可以恢复；
- 主 Thread 是稳定中心，右侧是按需出现的上下文工作台，不是永久 Dashboard、Remote 面板或编排控制台；
- 用户在 Agent 运行时随时可以打开它刚生成或修改的文件，“审阅”首先就是普通查看，不创造新的 Review 对象；
- 文件、diff、终端、浏览器、子 Agent、临时问题和输出共享标签系统，不为每种能力建立一个一级产品区；
- 文件树、标签与内容视图之间保持熟悉的 IDE 心智，同时允许更少步骤、更好的恢复和更自然的 Agent 活动投影；
- Remote 只有在当前位置或动作实际位于远端时才通过轻量位置标识、连接状态和相关操作出现，不支配默认布局；
- 所有稳定控制尺寸固定、状态切换不跳动；动效短、快、可打断，只解释空间关系。

### 12.5 文件与输出查看

第一版查看契约：

- Markdown 原生渲染标题、代码、表格、引用、公式和内嵌图片；
- 图片支持缩放、平移、多图切换、比较、尺寸和来源；区域选择后交给 Agent 修改属于后续可插拔能力，不把科学图像标注硬编码进 viewer；
- PDF、Office、表格、音视频和其他常见文件尽量在工作台内高质量预览；
- 未知文件至少提供元数据、可提取文本、十六进制或安全摘要，并可调用系统默认应用打开；
- 大文件、二进制和流式日志不得完整塞进 renderer、transcript 或模型上下文；
- 所有 viewer 都使用同一 `Open / Preview / Reveal / System Open` 语义，自定义 renderer 在真实消费者出现后再扩展。

### 12.6 Agent、临时问题与通讯

- 子 Agent 是完整、可进入、可追问、可纠偏、可停止的 child Thread，不是只显示最终摘要的黑箱；
- 用户可以给父子或同级 Agent 发送消息；所有 message、delivered/read/ack 和 attention 都进入同一原生 message event stream，Thread/Attempt journal 只通过相同 event ID 引用，不另存第二份消息；
- 子 Agent 可以继续委派，但必须受深度、并发、预算、权限、停止和单一集成所有者约束；
- 临时提问是轻量分支，可以把结论带回主 Thread，不必总是创建新的普通 Chat；
- 子 Agent、临时分支和动态编排只在发生时进入活动树；普通任务不展示团队、Workflow 或多 Agent 术语；
- 同一工作区写入默认只有一个明确 owner；并行读取可以 fan-out，隔离写入必须由唯一 integration owner 收口。

### 12.7 视觉、性能与跨平台

- 气质：冷静、精确、克制，在高信息密度中保留少量温度；
- 动效：快、短、可打断，只解释层级、展开、切换和返回关系；
- 性能：建立可测预算和回归门，严重退化不能靠“体感尚可”交付；
- 平台：macOS、Windows、Linux 保持相同品质和语义，同时尊重各自窗口、快捷键、菜单、文件选择、通知和系统打开习惯；
- 创新必须降低理解或操作成本。不能因为追求“未来感”破坏已有成熟工作台心智。

## 13. 移植原则

### 13.1 搬运是一等工程手段

允许并鼓励：

- 直接复制完整目录或子系统；
- 保留上游 Git 历史后 fork；
- subtree/submodule/包依赖；
- 抽取组件；
- 机械迁移后大幅删改；
- 参考机制后重写；
- 把多个来源的最好部分组合。

不设置“目录级搬运禁止”“只能参考不能复制”“必须 clean-room 重写”一类形式主义约束。

### 13.2 源码证据先于项目叙事

README、包页面、作者宣传、示例截图、功能清单、自报 benchmark、stars 和下载量只能用于发现候选、理解作者声称和判断生态采用度，不能证明实现质量。

任何进入采用结论的重要能力，都必须固定 revision 并核对与该结论直接相关的实际代码：

- 真正的入口、导出 API、注册和激活路径；
- 核心状态模型、事实权威、持久化与恢复；
- 调度循环、终止条件、取消、超时、重试和幂等；
- 错误、重启、并发和部分失败路径，而不只看 happy path；
- 测试是否覆盖真实行为，是否通过 mock 绕开关键风险；
- 依赖图、安装脚本、运行时副作用和供应链面；
- 最近实际提交、未解决问题，以及文档是否已经漂移。

文档与代码冲突时，以固定 revision 的源码和可复现实验证据为准。源码无法取得或声称无法核验时，标记为 `unverified`，不得进入推荐结论。主动淘汰只有 prompt wrapper、不可恢复内存态、无终止边界、无真实测试或已经失养，却用完整叙事包装的项目。

### 13.3 每块移植物的四个判断

1. **目标适配**：它是否直接服务本宪法定义的产品；
2. **解耦成本**：切掉宿主概念后是否仍比重写更划算；
3. **长期所有权**：团队能否理解、测试、升级和删除它；
4. **来源与权利**：许可证、额外授权、第三方贡献和 notice 是否清楚。

一块代码可以很大，只要四项都成立。一个函数也可以被拒绝，只要它把错误概念带进核心。

### 13.4 受治理 fork

受治理 fork 是一等工程路径，不是最后不得已的补丁。一个实现的主体已经优秀，瑕疵属于可以逐条命名的性能、交互、可靠性、测试、发布节奏或局部边界问题，并且长期分叉成本低于最小重写时，应当果断 fork 后接管。

采用 taste 是：**所有权高于原创姿态，诚实来源高于伪装原创，自动感知高于自动信任，最小可持续分叉高于最大化搬运。**

先按总维护成本选择采用方式，而不是把 fork 当默认答案：

1. 上游边界干净、发布可靠且不需要长期补丁时，使用 package + thin adapter；
2. 缺陷很小、上游活跃且合并路径合理时，优先贡献上游；
3. 主体优秀但需要长期掌握修复、性能、用户体验、安全或发布节奏时，采用 managed fork；
4. 只需要一个边界清楚的子系统，整仓依赖和宿主概念太重时，使用 bounded transplant/adapt；
5. 上游本体、状态权威、生命周期、安全/恢复模型或权利路径根本不适合时，只采用机制或重写。

推荐 managed fork 前必须全部回答：

- 固定 revision 的源码和真实测试是否证明主体质量显著高于最小重写；
- 缺陷与预期维护差异是否可以逐条命名、测试和 review；
- 宿主概念能否切除，而不迫使 OmniMind 扭曲自己的核心；
- 依赖、安装脚本、运行时副作用和攻击面是否可接受；
- 许可证、版权、第三方贡献和 notice 是否清楚；
- 团队能否理解关键路径、补齐测试、持续升级并在必要时删除；
- 上游是否仍有值得吸收的演进，或我们是否明确愿意完全接管；
- owner、同步频率、回退和删除计划是否明确；
- 是否避免旧实现与 fork 永久双轨；
- 长期分叉成本是否确实低于重写和长期 patch 层。

fork 的 `origin` 指向受控仓库，`upstream` 指向原仓库；产品始终锁定不可变 commit 或 tag，不追随浮动分支。自动化可以发现上游变化、生成差异或候选 PR，并运行测试、许可证与身份扫描，但不得自动把上游代码合入产品。每次吸收上游都重新审查源码、测试、状态权威、性能、恢复、身份洁净和权利边界。

通用修复可以回馈上游，但等待上游不得阻塞产品。长期差异按能力或修复拆成清楚提交；分叉一旦大到无法解释、测试或审阅，或同步上游需要持续扭曲 OmniMind，就重新选择局部移植或重写。

受控 fork 仓库必须诚实保留 upstream 关系、历史、作者和法律文本，不能伪装原创。OmniMind 产品作者区仍按稳定领域职责命名；来源、固定 revision、采用路径、主要删改与授权集中在根 README 披露，法定原文进入 `LICENSES/`。身份洁净阻止 donor 支配产品本体，不抹除真实来源。

### 13.5 真正禁止的事情

- 来源不明或授权不清却冒充原创；
- 未审阅依赖图就整仓吞入；
- 为了迁就移植物而扭曲核心概念；
- 同时保留旧实现和新实现形成永久双轨；
- 复制以后不再跟踪上游、修改和许可证；
- 因为拥有授权就把质量判断取消。

AGPL/GPL 不是技术禁区。可以选择兼容许可证、隔离交付边界或取得额外授权。法律路径要明确记录，但许可证不能替代产品判断。

## 14. 来源诚实与新仓库

新仓库不是历史清洗。第一笔产品提交就应包含：

- `README.md`：产品定义；
- 根 `README.md` 中唯一的来源披露区：来源、固定 SHA、路径、许可证、授权和处理方式；
- `LICENSES/`：法律要求保留的原始许可证与版权文本；这些不是产品说明；
- 本创立宪法的冻结副本；
- 最小可运行探针或其结论。

创立宪法进入新仓库时必须完成身份清理：根 README 保留本文件中的来源披露，宪法正文和其他文件改用中性角色名。不得把当前研究附件原样复制到新仓库。

每个移植物至少记录：

| 字段 | 含义 |
| --- | --- |
| Source | 仓库和上游地址；只出现在根 README |
| Revision | 固定 commit SHA / tag |
| Paths | 实际使用的路径 |
| Rights | 许可证与额外授权 |
| Mode | copied / adapted / forked / reimplemented / mechanism-only |
| Changes | 核心删改 |
| Update policy | 是否跟踪上游、如何更新 |

Proma 的额外授权必须写下来；同时核查被移植文件是否含第三方贡献，以及授权是否覆盖这些贡献。Pi、WeKnora 和其他参考物按其真实许可证处理。

当前仓库与新仓库：

- 不共享运行时代码依赖；
- 不做持续同步；
- 不为旧数据或旧插件提供默认兼容；
- 旧仓库只作为固定 SHA donor 和测试 oracle；
- 需要再次移植时重新做来源记录；
- 不能把旧仓库整个 Git 历史伪装成新产品历史。

## 15. 性能预算是架构约束

新 OmniMind 的“高性能”必须由路径纪律保证，不靠最后优化。

1. Provider stream 只读取一次、规范化一次。
2. main → renderer 增量帧批量发送，禁止逐 token JSON/WS 往返。
3. 文本增量缓存；长 Markdown、语法高亮和 Mermaid 不在每个 token 全量重算。
4. 长 Thread 虚拟化；激活 Thread 细粒度更新，后台 Thread 只更新摘要。
5. 启动路径不探测远程、不全量扫描插件、不加载重解析器/高亮器。
6. 大工具输出落盘并返回 `OutputRef`，不塞进 transcript、journal 或 IPC。
7. 远程二进制使用流，不使用 base64 JSON。
8. Slurm 生命周期独立于界面、SSH 和一次模型 attempt。
9. 只把当前可用、被选择的工具 schema 放进模型上下文。
10. 用户输入先持久接纳，首个模型增量不被非必要 UI 和持久化工作阻塞。
11. 性能结论必须能归因到 provider、agent、tool、remote、persistence、IPC 或 render 中的具体一段。

任何移植物进入后都要接受这些约束；“上游就是这样”不是豁免理由。

## 16. 领域只是 workload

OmniMind 不设置科研优先的产品层。科研、生物医学、编码、合同审阅、数据分析、训练、仿真和部署都使用同一套：

- Thread / Attempt / Action；
- 文件、终端、浏览器和外部能力；
- Todo、Delegated Agent、Team 与 Dynamic Workflow；
- 本地/远程 `ExecutionTarget`；
- checkpoint、receipt、恢复和耐久外部执行；
- 文件原生知识与按需检索。

领域任务可以作为高强度验收，例如千篇混合资料、远程长计算、复杂代码修改或多文件合同审阅；但不得由此创建 Research Mode、Scientific Thread、领域专用 Agent、记忆、Workflow、Remote 或导航入口。

领域系统通过普通 capability/function-call 进入，与 Git、浏览器、MCP server 和 CLI 同级。它们可以返回结构化结果和来源引用，但不拥有 OmniMind 的 Thread、Todo、验收、文件或外部任务状态。

患者级诊断、治疗建议、金融交易、生产发布等高后果行为若未来进入产品，应按外部副作用和专业治理单独处理；不能借某个领域标签自动获得或失去权限。

## 17. 明确斩断的旧路径

新仓库不要搬入下列旧产品结构，除非新的实证推翻本裁决：

- 旧 OmniMind Agent loop；
- 旧 provider/model 概念直接进入产品身份；
- Claude、Claude Code、Haiku、Sonnet、Opus、permission mode 等继承命名；
- Tauri + Bun server + WebSocket 的本地拓扑；
- 完整远程 OmniMind server；
- 远程复制本地 provider/settings/extensions；
- 旧 Workspace/Session/Run/Artifact/Job 等领域本体；
- “所有能力都插件化”的空壳架构；
- 为兼容旧版保留的 adapter、alias、migration 和双轨；
- 重型内置 RAG；
- WeKnora 的租户、RBAC、模型管理、Agent/chat 产品；
- Proma 的 Claude runtime router、巨型 IPC 与会话聚合；
- OmniHarness 的任何残留；
- 没有第二个真实消费者就建立的通用 framework；
- 仅因测试数量大就保留的旧实现。

旧测试、fixtures 和失败案例可以成为新实现的 oracle，但不能让测试反过来冻结旧架构。

## 18. 第一阶段的成功定义

第一阶段不是“功能与旧产品相同”，而是五个可丢弃探针和一个极薄 walking skeleton 给出可信答案：

### 探针 A：引擎与 Pi 生态兼容

- 创建、恢复和分支引擎 session；
- stream、cancel、tool lifecycle、dynamic registration 和 headless 降级可映射；
- transcript 不重复存储；
- Thread/Turn/Attempt/Action 关联清楚；
- 至少一个 Todo、一个 delegated Agent、一个 dynamic workflow 和一个普通工具 package 经过兼容报告；
- raw TUI、session control 和第二状态真相能够在加载前被准确拒绝；
- 只把当前任务需要的 tool schema 放入上下文。

### 探针 B：工作台移植与交互骨架

- 完整 renderer transplant 与新状态边界垂直切片同场比较；
- 每 Chat tabs 恢复、文件查看、右侧上下文工作台、diff/terminal/browser/child Thread 成立；
- queue、append、interrupt、临时问题分支和 background attention 可用；
- 长 Thread、Markdown 表格、图片和大输出有测量证据；
- macOS、Windows、Linux 语义一致且尊重平台习惯。

### 探针 C：持久运行时、文件与恢复

- Thread 接纳先于引擎执行落盘；
- Todo 只是可重建计划投影；
- child Thread、Team message 和 Dynamic Workflow 引用不复制彼此状态；
- observed-version/CAS 写入阻止盲目覆盖；
- checkpoint 覆盖新增、修改、删除、rename 和未跟踪文件；
- restart、rewind、branch、notification 和 `outcome_unknown` 准确；
- Git 存在时只是外部权威投影，不自动 commit/stash/reset/clean。

### 探针 D：Remote 与耐久外部执行

- 使用真实 OpenSSH 配置连接测试主机；
- 版本化 helper 提供远程文件、PTY、进程、binary transfer 与 CAS write；
- 提交一个 Slurm 任务；
- 关闭 OmniMind/断开 SSH 后任务继续；
- 重开后准确对账并查看日志、产物与取消回执；
- submit acknowledgement 丢失、传输中断和 helper 升级都不伪造结果。

### 探针 E：知识、扩展 artifact 与自动更新

- 混合资料生成可见 Markdown Wiki；
- exact/FTS/agentic search 与按需语义检索做真实 recall/latency 对比；
- 来源改变触发 stale，用户编辑不被静默覆盖，索引可删除重建；
- bundled、curated 和任意第三方 artifact 经过 staging、trust-envelope diff、safe-boundary activation 与 LKG rollback；
- active Attempt、browser target 或 external execution 能继续租用旧 generation；
- 新 generation 只接新工作，失败可自动恢复上一版本。

探针代码可删除。探针的目的不是成为第一版生产架构，而是让真正昂贵的决定在大规模移植前有证据。

## 19. 决策准则

后续遇到分叉时，按以下顺序判断：

1. 哪个选择更忠实于一句话产品定义？
2. 哪个选择让事实所有权更单一？
3. 哪个选择删除更多错误概念和边界？
4. 哪个选择更容易在本地与远程同时成立？
5. 哪个选择能支撑多个差异很大的高强度 workload，而不引入领域专用核心？
6. 哪个选择可以通过移植成熟实现更快获得高质量，而不带来宿主债？
7. 哪个选择的失败和恢复更可解释？
8. 哪个选择能用真实探针证伪？
9. 哪个选择长期更容易替换 Pi、模型、UI 或外部能力？
10. 若没有证据证明需要抽象，哪个选择更具体、更小、更可删除？

“业界常见”“旧产品已经有”“以后也许需要”“看起来更完整”都不是充分理由。

## 20. 给未来执行会话的最后提醒

不要把这份宪法执行成一次大爆炸搬仓。激进指对错误路径不留恋，不指在没有证据时同时承诺一百个模块。

正确动作是：

- 先建立独立仓库和来源纪律；
- 先做五个可丢弃探针；
- 用探针决定 Pi、Proma、远程和 Wiki 的真实移植边界；
- 每一次只引入一块有明确所有权的能力；
- 搬来后立即删除宿主概念和重复真相；
- 没有旧用户，就不要花未来维护成本保护过去；
- 不要把“简洁”误解为牺牲远程、恢复、知识工作和高强度任务质量；
- 不要把“生态”误解为把所有扩展预装进核心；
- 不要把“授权充分”误解为可以省略来源和质量判断；
- 不要重新发明一个披着中性名词的 Claude Code。

新 OmniMind 的优势不应来自功能列表更长，而应来自：内核小、工作台强、生态可吃、远程真实、知识可积累、能力开放、更新自动、失败诚实、移植果断。

## 21. 来源与移植物披露

本节是所有外部产品身份的唯一研究披露区。新仓库创建后，根 README 应保留与实际采用代码相符的精简披露；没有采用的研究候选不应继续出现在新产品仓库。

下列机器块是生产采用清单。研究候选不等于已采用来源；只有代码、资源或法定材料实际进入仓库时，才在同一提交中增加记录和对应 `LICENSES/` 原文。

```source-adoptions
{
  "adopted": []
}
```

### 21.1 采用方式

| 方式 | 含义 |
| --- | --- |
| package | 直接依赖上游发布包 |
| fork | 保留上游历史并持续维护分叉 |
| transplant | 复制一个完整目录、组件域或子系统 |
| adapt | 复制以后按新边界显著重构 |
| mechanism-only | 只采用机制，重新实现 |

这五种方式没有道德高低。一个完整 renderer 可以比重写更干净；一个看似独立的 helper 也可能把错误本体带入核心。

每个实际移植物在 README 披露：

- 来源 URL；
- 固定 SHA/tag；
- 实际采用路径；
- 许可证和额外授权；
- 第三方贡献覆盖情况；
- 采用方式；
- 主要删改；
- 是否跟踪上游；
- 如何回退或删除。

其他文档只能使用下列中性研究代号：

| 代号 | 本 README 中披露的来源 |
| --- | --- |
| `E0` | Pi 引擎仓库 |
| `E1` | pi-dynamic-workflows 与同类引擎生态 |
| `U0` | Proma 工作台仓库 |
| `L0` | 当前 OmniMind 旧产品仓库 |
| `K0` | WeKnora |
| `K1` | Karpathy LLM Wiki 提案 |
| `K2` | `lucasastorian/llmwiki` |
| `K3` | `junbjnnn/llm-wiki` |
| `K4` | `atomicstrata/llm-wiki-compiler` |
| `A0` | OpenCode |
| `R0` | `remote-cockpit` 远程研究池 |

这些代号只用于当前研究和施工附件，不得成为新产品生产 namespace、事件名或持久字段。

### 21.2 Pi

- 本地研究镜像：`/Users/liuzaoqu/Desktop/Develop/πCode/pi`
- 上游：`https://github.com/earendil-works/pi.git`
- 本次研究 SHA：`74caa2649f10ed71b4378ce69f5d9fbfd2466ca5`
- 候选角色：首选 Agent 引擎与生态入口。
- 允许方式：package、fork、完整源码移植或组合。

优先验证并复用：

- `pi-coding-agent` session 创建、恢复与分支；
- provider 适配；
- 流式消息和工具调用事件；
- context compaction；
- tools、skills、extensions；
- 已成熟的文件与终端交互。

不能直接冻结为 OmniMind 本体：

- Pi session 等同 Thread；
- Pi 单 cwd 等同产品工作位置；
- Pi CLI 心智等同桌面产品；
- 实验性 `pi-protocol` / `pi-server` 成为永久远程协议；
- provisional/TODO 的 `AgentHarness` 成为产品宪法；
- native extension 被误称为安全沙箱；
- 当前社区扩展组合被当成稳定 ABI。

集成探针必须回答：

- 当前 `createAgentSession()` 或等价 API 能否稳定嵌入 Electron main；
- Turn/Attempt/Action 如何关联；
- tool call 开始前能否生成稳定 ID；
- cancel、崩溃、branch、session 尾部损坏如何表达；
- 如何注入本地或远程 ExecutionTarget；
- 如何不重复存储 transcript；
- 如何只把当前选择的工具 schema 放进上下文；
- provider stream 如何一次消费后批量交给 renderer。

若 package 无法满足，优先向上游补接口；仍不足则 fork。不要在 OmniMind 内部重写一个没有名字的半套 Pi。

### 21.3 Pi 生态

本地研究池包括：

- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-dynamic-workflows`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-workflow`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-subagent`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-subagents`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-skills`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-tasks`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-rewind`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-review`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-diff-review`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-tool-display`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-memory`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-hermes-memory`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-agent-browser-native`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-web`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-web-access`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-permission-system`
- `/Users/liuzaoqu/Desktop/Develop/πCode/pi-desktop`

`pi-dynamic-workflows`：

- 上游：`https://github.com/Michaelliv/pi-dynamic-workflows.git`
- 本次 SHA：`31b2aca0f1cb195aafbfc5e3ee2b8c83ad3f21a2`

它可直接作为 extension/package/fork 候选。验证重点：

- 是否依赖不稳定 API；
- 流程状态是否只投影到产品 journal；
- 取消、恢复、硬上限和失败传播；
- 远程位置是否可用；
- 公共进度/日志/输出是否足以表达 UI。

生态是能力池，不是预装清单。新仓库不应为了展示生态而装入全部扩展。

### 21.4 Proma

- 本地研究镜像：`/Users/liuzaoqu/Desktop/Develop/πCode/Proma`
- 上游：`https://github.com/ErlichLiu/Proma.git`
- 本次 SHA：`aa02c16819399e7683533f15cfe202754d6b156c`
- 仓库许可证：AGPL-3.0
- 额外事实：用户是核心参与者并已取得作者完整授权；作者明确表示 Claude SDK 只用于用户迁移，未来不再使用 Claude SDK。
- 候选角色：工作台和前端的首要代码移植物。
- 允许方式：完整 renderer、多个组件域、状态逻辑、纯机制、Electron shell，均可探针后直接移植。

权利要求：

- 把额外授权保存为可审计证据；
- 明确覆盖的 revision、文件和使用方式；
- 检查第三方贡献者；
- 未被额外授权覆盖的部分按原许可证；
- README 披露来源，`LICENSES/` 保存法定原文。

本次审计事实：

- renderer 约 337 个 TS/TSX 文件；
- 约 111 个文件直接调用 `window.electronAPI`，累计约 618 次；
- 约 102 个文件依赖 Jotai atoms；
- `@proma/ui` 只导出极少组件；
- 应用边界是 shared types → 大型 IPC → preload → `window.electronAPI` → Jotai/React；
- `AgentSessionMeta` 聚合大量职责；
- Pi adapter、内置工具桥、模型注册表、消息 adapter 均较大；
- runtime router 当前仍默认 Claude；
- 没有真正的 SSH/HPC/PTY/调度任务领域能力；“remote”主要指 IM，外部 Terminal 也不是远程工作台。

必须并行比较两个可丢弃探针：

1. **保留完整 renderer，替换宿主**

   复制 renderer，用窄 IPC facade 接入新事件流，删除旧 runtime/provider/session 概念，记录修改比例、依赖切口、性能和 Remote/Wiki 适配性。

2. **保留设计和组件，用新状态边界重建垂直切片**

   实现位置/Thread 导航、一个流式 Thread、文件树、diff/preview、后台状态和远程任务；尽量直接搬组件与交互机制。

比较标准：

- 六个月后的边界清晰度；
- 外部身份残留；
- 跨进程路径长度；
- Remote/Wiki 是否自然；
- 未来替换状态库和 IPC 的成本；
- 保留了多少原交互品质；
- 总删除量和持续维护成本。

应保留的设计合同：

- 导航 / 当前工作 / 上下文与输出三域；
- Thread 按位置组织；
- running / blocked / unread；
- 后台执行可见；
- queue / append / interrupt；
- 流程中结构化提问；
- 文件树、搜索、reveal、拖拽；
- Markdown/PDF/Office/图片预览；
- tabs/split；
- changes/diff/recovery；
- 位置能力和信任可见；
- stream smoothing 与滚动稳定。

必须切除：

- Claude SDK、Claude Code、Haiku、Sonnet、Opus 等进入产品静态身份；
- 旧 runtime router 和 provider registry；
- 巨型会话聚合；
- 无边界的 renderer API；
- 每个组件直接耦合全局 atoms；
- IM remote 冒充 SSH Remote；
- 迁移期兼容路径。

这不是禁止整块搬运。若“保留 renderer、替换宿主”探针更优，就以完整 renderer 为移植物。

### 21.5 当前 OmniMind

- 本次研究基线 SHA：`5f37d75542b53152c215349c8b1c12b7e7482d22`
- 上游：`https://github.com/SolvingLab/OmniMind.git`
- 候选角色：Remote 安全机制、失败案例和测试 oracle。

独立审计量级：

- 约 4,358 个 commits，集中在约两个月；
- 约 5,017 个 tracked files；
- TS/TSX/Rust 约 1,027,265 行；
- 初始提交 `45178c2f` 一次带入约 3,183 文件；
- 当前仍约 311 个生产文件包含 Claude/Claude Code/Haiku/Sonnet/Opus/permission 概念；
- 约 157 个 TS/TSX 文件导入 `@anthropic-ai/sdk`；
- 初始与当前完全相同 blob：`src/` 约 763 个，`desktop/src/` 约 79 个；
- 测试资产约 1,210 个测试、约 301k 测试行；
- 根许可证历史发生变化，来源清单和 third-party notices 不充分。

Remote 候选面：

- 窄口径约 52 个生产文件、11,921 行，加 25 个测试、9,855 行；
- 广口径约 161 个文件、34,272 行。

可大块移植：

- 系统 OpenSSH；
- askpass/2FA 秘密通道；
- host-key fail closed；
- ControlMaster；
- 结构化连接状态；
- reconnect；
- reverse local model proxy；
- redaction；
- 远程失败 fixtures 和 contract tests。

移植时切除：

- 完整 server 部署到 `$HOME/.omnimind/server`；
- APP/PROTOCOL 版本锁步；
- provider/settings/extensions 远程镜像；
- 当前本地 Bun server/WebSocket 契约；
- 旧 Workspace/Session/permission 本体。

旧 Agent loop、旧产品命名、Tauri + Bun sidecar、本地 WebSocket、旧 provider/model registry、旧领域聚合和兼容路径不默认进入新仓库。

旧测试可转成 oracle：

- host key；
- 2FA；
- 断线重连；
- 凭据脱敏；
- provider 协议转换；
- deny precedence；
- persistence corruption/recovery；
- stream/scroll；
- diff/checkpoint；
- 远程文件、端口和失败分类。

只迁输入、预期事实和错误语义，不迁旧对象模型。

### 21.6 WeKnora

- 本地研究镜像：`/Users/liuzaoqu/Desktop/Develop/πCode/WeKnora`
- 上游：`https://github.com/Tencent/WeKnora.git`
- 本次 SHA：`e99a4dd498d6847817b7c568e7cb4f1d0460179e`
- 本次所见版本：v0.7.1
- 根许可证：MIT；部分发布元数据出现 Apache 标记，移植前逐文件核实。
- 候选角色：用户已有大型知识系统的外部连接；Wiki/知识工程成熟模块的移植物来源。

本次审计量级：

- 约 1,560 个 Go 文件；
- 约 621 个测试；
- 约 331 条 routes；
- 约 60 个 service constructors；
- Lite SQLite 约 46 张表；
- 约 167 个 Vue 文件和 193 个 TS 文件；
- AutoWiki 相关实现约 13.4k LOC，并与 DB、queue、tenant 紧耦合；
- 简单 parser 主要覆盖 MD/TXT/CSV/JSON 和媒体占位；PDF/Office 依赖外部解析服务或 OCR 路线。

作为外部连接：

- 优先使用其 CLI/MCP/Skill 或最小 API；
- 失败只降级该能力；
- 删除连接不删除知识库；
- 不为一个连接提前造 connector framework；
- 不内置或暗中启动完整服务。

允许整块移植：

- AutoWiki 纵向子系统；
- stable slug；
- source refs；
- delete retract；
- revision/revert；
- lint/repair；
- durable pending ops / dead letter；
- map/reduce concurrency、retry、reclaim；
- candidate + citation 两阶段生成；
- typed CLI errors；
- dry-run；
- ingest status UI；
- 解析器、队列或 MCP/Skill 子系统。

移植探针要测：

- 抽取后需保留多少表和 service；
- 是否比 Markdown + manifest + FTS 更小；
- 恢复和并发是否明显更可靠；
- 能否在远程文件原地运行；
- 是否制造第二份 Wiki 真相；
- 权利与依赖是否适合。

默认不搬：

- 多租户；
- 用户/RBAC；
- 自有 Agent/chat/session；
- 模型管理；
- 完整 RAG 产品；
- 机构知识库产品外壳。

若纵向整块移植仍然更优，可以搬；不是“只能借鉴”。

### 21.7 Karpathy 的 LLM Wiki 提案

- 原始链接：`https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f`
- 本次观察：创建于 2026-04-04。

核心模式：

- raw sources 永不修改；
- LLM 维护持久 Markdown Wiki；
- `AGENTS.md`/schema 定义约定；
- ingest / query / lint；
- `index.md` 为目录；
- `log.md` 为演进记录；
- 中等规模先用目录和文本工具；
- 好查询结果可保存回 Wiki；
- 用户决定资料和方向，Agent 维护结构；
- Git/版本化提供审查和恢复。

新产品采用的是这套信息所有权，不是机械复制某个实现。

### 21.8 `lucasastorian/llmwiki`

- 上游：`https://github.com/lucasastorian/llmwiki`
- 本次所见许可证：Apache-2.0
- 候选方式：整仓 fork 探针、搬运 manifest/FTS/Wiki 模块或作为 helper。

价值：

- source 不动；
- `wiki/` 可见；
- `.llmwiki/` SQLite FTS/cache 可重建；
- MCP tools；
- 后台 watcher；
- 完整度较高。

风险：

- Python + Node 较重；
- watcher 和后台运行可能超过第一版需要；
- MCP 与产品原生 Wiki 生命周期可能重复；
- 需要验证远程原地运行、staleness 和失败恢复。

### 21.9 `junbjnnn/llm-wiki`

- 上游：`https://github.com/junbjnnn/llm-wiki`
- 本次所见许可证：MIT
- 候选方式：fork 或大块搬运成最小基线。

价值：

- Git + Markdown + Python；
- 无 server/DB；
- 极小。

风险：

- 成熟度低；
- 增量刷新、并发、复杂来源和引用完整性未必足够。

它用于证明“最少需要什么”，不能未经真实 corpus 测试就成为生产结论。

### 21.10 `atomicstrata/llm-wiki-compiler`

- 上游：`https://github.com/atomicstrata/llm-wiki-compiler`
- 本次所见许可证：MIT
- 候选方式：搬 provenance、lint、refresh、context pack 模块。

价值：

- claim/paragraph 级来源；
- lint/eval/refresh；
- context pack；
- 可核验性设计较深。

风险：

- 可能把个人 Wiki 做成过重编译系统；
- 中间 schema 可能损害 Markdown 直接可编辑性。

没有真实失败证据前不搬整条复杂编译管线。

### 21.11 OpenCode

- 本地研究镜像：`/Users/liuzaoqu/Desktop/Develop/πCode/opencode`
- 上游：`https://github.com/anomalyco/opencode.git`
- 本次 SHA：`ceb4890ca3651899dd3e2b1564168ab098ac540d`
- 候选角色：provider-neutral contracts、工具、权限、UI 和流式实现的比较对象。

可移植：

- provider/protocol 模块；
- 工具或 MCP/Skill 机制；
- UI 组件；
- 事件和性能路径中的独立模块。

它不是需要并行保留的第二内核。只有首选引擎出现真实能力缺口或第二个真实消费者时，才形成多引擎产品抽象。

### 21.12 `remote-cockpit`

- 本地研究池：`/Users/liuzaoqu/Desktop/Develop/πCode/remote-cockpit`
- 父聚合仓本次 SHA：`8343a9580d50fe61d44c7978280502a236b7b0d4`
- 父仓：`https://github.com/Zaoqu-Liu/piCode.git`

其中每个子目录可能是独立上游。真正采用时必须记录子仓自己的 URL、SHA 和许可证，不能只写父聚合仓。

重点研究：

- VS Code / Cursor：本地 UI + remote services/extension host；
- Zed：本地模型/UI + 远程 project/task/terminal；
- Distant：结构化 FS/process 协议；
- DevPod / Coder：provision 与 connect 的分离；
- Mosh / Eternal Terminal：断线、漫游和终端连续性；
- Mutagen：显式同步与冲突；
- Wave / WispTerm / WezTerm：终端、文件、预览和端口 UX。

产品结论：

- 第一版只连接已有 SSH 环境，不做云工作区 provisioner；
- 默认系统 OpenSSH；
- 默认远程文件权威，不做透明同步；
- 可以移植 PTY、复用协议、二进制流、重连和 UX 模块；
- GPL/AGPL 可通过兼容发布许可或额外授权采用，不因许可证否定技术；
- 没有权利路径时只采用机制或选择替代实现。

### 21.13 对每个移植物的验收

新仓库 README 对每个实际采用来源都应回答：

```text
Problem:
Source URL + revision:
Source paths:
Rights/license:
Mode:
Claimed capability:
Observed implementation:
Code/test evidence:
Why better than the smallest rewrite:
Host concepts removed:
Stable owner/boundary:
Truth source affected:
Performance evidence:
Failure/recovery evidence:
Tests/fixtures adopted:
Expected maintained delta:
Upstream value:
Upstream update policy:
Deletion/rollback plan:
```

若回答不出“删除了哪些宿主概念”“事实现在归谁”，即使能够运行也不算移植完成。

### 21.14 当前最值得验证的组合

探针开始前的首选假设：

- Electron + React；
- Pi session SDK；
- Proma renderer 或组件域；
- 当前 OmniMind Remote 的安全与重连机制；
- 极小 TypeScript remote worker；
- Slurm；
- Markdown + manifest + FTS；
- Karpathy 的信息所有权；
- WeKnora 或其他 LLM Wiki 实现的成熟模块；
- OmniData、OmniEngine、OmniScholar、OmniSage 通过统一 tool/function/MCP/Skill 进入；
- pi-dynamic-workflows 等生态按需启用。

它们只是首选实验组合。最终仓库只披露实际采用者，并在生产作者区保持零身份残留。

## 22. Pi 生态七类源码审判冻结

> 冻结日期：2026-07-31
>
> 本节把跨会话研究转成产品约束。它记录源码判断和探针入口，不表示任何候选已经进入生产；`source-adoptions` 仍是实际采用的唯一机器清单。

研究覆盖：Todo/plan、delegation/team、dynamic workflow/goal、package governance、file/Git/checkpoint/review/notification、browser/web/MCP、knowledge/remote/durable external execution。下载量、stars 和 gallery 排名只用于发现候选；永久判断来自固定 revision 的入口、状态权威、错误路径、依赖和测试。

### 22.1 一个统一分层

| 层 | 职责 | 更新与状态纪律 |
| --- | --- | --- |
| Native durable primitives | Thread/Attempt/Action、journal、message、receipt、cancel/resume、引用、权限和 generation lease | 状态唯一、最少、可恢复；不按 donor 或领域命名 |
| Bundled first-party modules | 文件工作台、Dynamic Orchestration、Delegation/Team、Durable Goal、Review、Browser、HTTP、MCP bridge、知识和 Remote adapters | 随 App 发布、无需安装、按需加载、可关闭；不要求常驻或同进程 |
| Pi compatibility bridge | 翻译 Pi tool/skill/prompt/extension lifecycle 与通用 UI/headless 行为 | 首发可用；不继承 Pi TUI、session ontology、provider mutation 或第二状态真相 |
| Curated optional packages | 经真实场景证明有独特价值、可被清楚治理的 package | exact artifact；默认可在既有 trust envelope 内自动更新；可随时禁用和回滚 |
| Arbitrary third-party packages | 用户选择的任意完整权限代码 | 首次 exact artifact 明确选择；加载前 compatibility report；不伪称 sandbox |
| External services | 机构知识库、远程调度器、MCP server、浏览器和其他系统 | 外部系统继续拥有自己的数据、会话、任务和凭据；OmniMind 只保存引用、观察和回执 |

“零第三方默认 runtime”只表示核心状态不依赖某个社区包，不表示排斥 Pi 生态。Pi compatibility 是首发产品要求；能直接运行的包直接运行，优秀但有有界瑕疵的实现可以 fork，边界不合适的只移植机制。

### 22.2 唯一状态权威总表

| 事实 | 唯一权威 | 其他层只保存什么 |
| --- | --- | --- |
| 对话内容 | engine transcript / child transcript | parent 只保存 child ref、摘要和 attention，不复制全文 |
| 产品动作与副作用 | Thread/Attempt journal | UI、通知和扩展只投影 lifecycle/receipt |
| 当前执行计划 | product journal 中属于当前 Thread branch 的 canonical plan event stream | engine transcript 只保存 ref；Todo 是可重建投影；Team、Workflow、Goal 不复制正文 |
| child Agent 内容 | child Thread | parent journal 保存 relation、lifecycle、steer/stop/follow-up |
| Team | 单一 native message event stream + membership/assignment index | Thread journal 共享 event ID；只保存 member、assignmentRef、owner、delivered/read/ack；无第二 mailbox 或通用 task board |
| Dynamic Workflow | parent Attempt 的 run/step/attempt journal | child 内容在 child Thread；外部任务状态在外部系统 |
| 显式 Durable Goal | product journal 中的 `GoalRef`、claim 与 verification events | Goal strategy 负责 continuation，不拥有独立聚合或模型自证完成权；普通 Chat 不自动成为 Goal |
| 文件 bytes/metadata | local 或 remote filesystem | watcher、hash、cache、diff 都是观察或投影 |
| Git commit/index/ref | 用户 Git repository | status/diff/history 是投影；默认不自动 commit/stash/reset/clean |
| checkpoint | journal 中的 `CheckpointRef` + immutable recovery material | recovery material 不是第二个日常工作区 |
| review | 当前文件/Git/diff/receipt 的临时投影 | 不建立 comments database、acceptance ledger 或第二任务状态 |
| attention/unread | Thread/Attempt journal | OS toast、terminal/tmux 通知只是传输投影 |
| Browser tab/profile/cookie/DOM | browser process/profile | journal 保存 TargetRef、Action receipt 和 ownership/handoff |
| MCP resource/tool/session | MCP server | adapter 保存 connection generation 和可丢 metadata cache |
| 原始知识资料 | 用户文件或外部知识服务 | saved Wiki 是可见 Markdown；FTS/vector/cache 可删除重建 |
| 本地/远程进程和调度任务 | OS process / external scheduler | `ExternalExecutionRef` 保存 ID、观察、日志/产物引用和回执 |
| 凭据 | OS credential store、ssh-agent 或外部 provider | journal、argv、日志、截图和证据不保存秘密 |
| extension artifact | content-addressed artifact store + activation pointer | project 只请求 artifact；Attempt 租用精确 generation |

### 22.3 Todo、Agent、Team、Workflow、Goal 与 Review

**Todo**

- canonical mutation/checkpoint 是 product journal 中、按 Thread branch 归属的 plan event；Todo UI 和 tool result 都是该 event stream 的可见、可纠偏、可重建投影；engine transcript 只保存 event ref，不复制完整计划；
- 最小状态为 pending / in-progress / completed / deleted，加必要 dependency 引用；
- 悬空、自依赖和环必须被 reducer 拒绝；branch、reload、compaction 和 child isolation 必须可重放；
- 不创建独立 Todo 数据库、核心 Task 聚合、验收系统或第二完成治理。

**Delegated Agent**

- 一个委派产生一个真正的 child Thread，可前台或后台运行；
- 支持进入、追问、steer、stop、continue、resume 和 crash reconciliation；
- child 只向 parent 返回 compact result/attention ref，不把完整 transcript 灌回父上下文；
- 允许嵌套委派，但必须有深度、并发、turn、duration、cost 和 spawn 上限；
- 读可 fan-out；共享写入和最终集成只有一个 owner。

**Persistent Team**

- 只在用户明确创建或任务确实需要持续协作时出现；
- 增加成员生命周期、assignmentRef 和对单一 native message event stream 的 typed projection，包括 delivered/read/ack、TTL、idempotency 和 bounded attention；
- 不增加第二 Todo、依赖图、acceptance、Workflow DAG、自动 commit 或自动 merge；
- 用户可以向父子或同级 Agent 发消息，所有通讯进入同一可审计 ledger。

**Dynamic Workflow**

- Agent 根据当前任务和实时结果即时生成、追加、删除、改序、分支、循环、并行、汇总和终止编排；
- 普通任务直接完成，不要求用户写 DAG、YAML、模板或理解 Workflow；
- 固定的是 journal、resume、cancel、hard caps、retry lineage、receipt、single integration owner 与 `outcome_unknown`，不是工作步骤；
- retry 创建新 attempt，不覆盖旧 attempt；只有纯、幂等或有外部 receipt 的动作可自动 replay；
- 成功运行可以保存为 Skill/策略模板，但不冻结机器路径、凭据、外部状态或整次运行真相。

**Durable Goal**

- 是显式创建的 first-party strategy，不是每个普通 Chat 的默认包装；
- `GoalRef`、claim、预算、验证引用和状态变化仍是 product journal events，不创建 Thread/ExecutionTarget 之外的第三聚合；strategy module 只负责长期 continuation；
- 不能把模型自报“完成”当成完成权；完成必须来自声明的外部验证或人类裁决；
- repository Campaign 是开发治理机制，不应被社区 Goal package 偷换成产品 Todo 或 Workflow 状态。

**Review**

- 默认含义是打开文件、查看结果和 diff；不创造 Review 聚合；
- 动态多 Agent review 可以作为按需 first-party strategy，无感调度 child Agent，并把发现投影到同一活动树；
- review extension 不拥有 transcript、comments database、acceptance ledger、checkpoint 或任务板。

### 22.4 文件、Git、checkpoint 与通知

文件读取返回 observation token，至少包含 identity/type/size/mtime/content hash。create/replace/edit/delete 必须携带 expected observation；外部变化导致 conflict，而不是盲目覆盖。

写入和恢复纪律：

1. 同目录临时文件；
2. 写入并校验；
3. fsync；
4. atomic rename；
5. journal 写 settled receipt；
6. 无法确认则 `outcome_unknown`。

多文件 checkpoint 使用 `prepared → applying → verifying → committed`；restore 前建立 safety checkpoint，失败进入 rollback，rollback 也失败时保持未知。第一探针可以使用 per-Location/per-Attempt 私有 bare Git 作为 recovery material，但不得触碰用户 repo 的 HEAD、index、refs 或 stash。

Exact search 首选固定版本的 rg/fd 或小型 library；fuzzy navigation 是 UI 能力；语义索引只有真实规模和召回证据后按需出现。Notification 只表达 completed / attention / failed / outcome_unknown，去重、前台抑制、无敏感内容，并能跳回原 Thread/Attempt。

### 22.5 Browser、Web 与 MCP

- 人类浏览器 view 与 Agent browser control 可以共享一个可见 target，但 ownership 和 lifecycle 分开；用户已有 tab 默认不归 Agent 所有；
- Browser、HTTP/web 和 MCP 是 bundled first-party adapters，不是新的 Thread、Workflow 或产品身份；
- 首发 MCP 支持 tools/resources/prompts、stdio、Streamable HTTP 和 OAuth；legacy SSE 只作 fallback；sampling、elicitation、interactive app UI 和 experimental tasks 等真实消费者出现后再开；
- 只暴露当前任务需要的 tools；大量 server schema 不得常驻模型上下文；
- 下载成功必须有 filesystem `OutputRef`、path、size、digest 和 source；“浏览器报告路径”不等于文件已落盘；
- 上传、提交、支付、删除等动作在用户意图明确时可以安静执行，但必须留 receipt；意图不明确才询问；
- dispatch 后 timeout、disconnect、cancel 或 process exit 不能自动解释为未执行；非幂等动作在 `outcome_unknown` 时禁止盲目重试。

最小外部 Action receipt：

```text
actionId / attemptId
adapterGeneration / artifactDigest
targetRef / connectionRef
operationClass / idempotencyKey?
redactedRequestFingerprint
proposed / policyDecided / started / dispatched / settled timestamps
dispatchCertainty = not_dispatched | dispatched | acknowledged
settlement = settled | failed_before_dispatch | outcome_unknown
externalReceiptRef / outputRefs / reconcile method
```

### 22.6 Knowledge、Remote 与耐久外部执行

正确分类是 `knowledge / remote / durable external execution`。已撤回 `research / knowledge / remote / long compute`；领域只是 workload。

**Knowledge**

- 默认路径是 visible Markdown Wiki + source manifest + filename/glob/ripgrep + links/metadata/FTS + agentic search；
- 原始资料保持权威；用户编辑的 Wiki Markdown 是可见持久综合；FTS/vector/cache 是可删除投影；
- source 变化标 stale，不能静默覆盖人工修订；
- embeddings、reranker 或外部知识服务只有 recall、latency、权限或规模证据后加入；
- transcript memory package 不得逐轮复制并注入第二份隐藏记忆真相。

**Remote**

- UI、Agent loop、模型调用、Thread 和凭据默认留在本机；远端是普通 `ExecutionTarget`；
- `LocationRef = executionTargetId + absolutePath`；Remote 不创建特殊 Workspace 或 Thread；
- 系统 OpenSSH 处理 host key、ProxyJump、2FA、agent 和连接复用；
- shell-only 只用于 bootstrap/诊断；结构化 helper 负责 stat/list/read/search/watch、CAS write、PTY/process、binary stream、bounded logs、scheduler 与 capability negotiation；
- helper 按 OS/arch/protocol/content digest 固定，可版本并存、可回滚，无独立账号、UI、任务系统或模型配置；
- 远端文件保持权威，默认不透明镜像；上传、下载和 opt-in sync 都必须显式、可校验和可恢复。

**Durable external execution**

- 第一版只做 native local process 与一个 Slurm adapter，不先造 Scheduler Framework；
- submit intent 先入 journal，取得 external ID 后记录 acknowledged receipt；ack 丢失时按 token/用户/时间窗 reconcile，不能直接重提；
- observe 使用事件流或指数退避；完整日志用 cursor/`OutputRef` 按需读取，不塞进模型上下文；
- cancel requested 与 cancel acknowledged 分开；SSH 断开、本地 timeout 或 App 退出都不等于远端取消；
- artifact 下载使用 `.partial`、size/hash 校验、原子 rename，并能续传或明确丢弃 partial；
- macOS、Windows、Linux 控制端共享协议；首个 remote target 是 Linux/OpenSSH。tmux、PowerShell 和未来其他 scheduler 只是 backend/donor，不定义通用 Job 本体。

### 22.7 自动更新是首发机制

此前“禁止静默更新”的准确含义是：禁止未经验证、越过 trust envelope 的静默激活；不禁止安全、可回滚的自动更新。

```text
observed
→ exact_candidate_resolved
→ staged
→ inspected
→ compatible
→ waiting_safe_boundary
→ activating_generation
→ health_check
→ current (LKG)
```

异常分支：

- owner/source/license/install script/native dependency/capability/state schema 实质扩张：`blocked_for_decision`；
- ABI、测试、迁移或健康检查失败：`quarantined`；
- 激活失败：`rollback_to_LKG`；
- Pinned 只观察；Staged 下载和验证但不激活；Auto 在已批准 envelope 内完整自动运行。

默认时机：App ready 后异步检查；距上次检查超过 24 小时才访问 registry；长期开机每日带 jitter 检查；打开扩展管理或用户手动操作时可即时刷新。Registry/gallery 只是 discovery projection，最终 artifact 必须由官方 metadata/source、exact revision 和 content digest 解析。

Bundled first-party 随 App 原子更新和整版回滚。Curated package 在既有 envelope 内默认 Auto。任意第三方第一次选择 exact artifact；以后可 Auto/Staged/Pinned。任何 package 自带 updater 必须关闭或被 immutability 检测拒绝。

一个 Attempt 从开始到结束租用同一 generation。Browser lease 绑定 target/profile/connection 的完整 lifetime，直到 target 关闭或显式迁移，而不只绑定单次 Action；MCP 等待旧 connection drain；HTTP 等待零请求；remote helper 与 scheduler Job 保留旧 generation 直到引用结清或显式迁移。活跃工作中绝不热替换。

### 22.8 固定源码证据与当前采用裁决

下表是研究 evidence，不是 `source-adoptions`。`runtime = none` 表示没有社区 package 成为默认状态权威，不表示其生态被排除。

Evidence level：下列候选均为固定源码和相关测试文件已经阅读，**研究任务没有执行上游测试**。表中结论只能升级为 probe candidate，不能写成“测试已通过”。Metadata-only、源码与发布物无法对应或仓库不可取得的候选不进入本表。

| 类别 | 固定来源 | 已观察价值 | 当前裁决 |
| --- | --- | --- | --- |
| Engine / extension seam | Pi `74caa2649f10ed71b4378ce69f5d9fbfd2466ca5` | session、tool lifecycle、dynamic tools、AbortSignal、headless、operation injection | thin engine/compatibility adapter；首发兼容，产品状态原生 |
| Package governance | `pi-extmgr` `9a0cf32ab83dcf00d6878c09c80aad85a4dd5687` + Pi core `74caa2649f10ed71b4378ce69f5d9fbfd2466ca5` | discovery、package lifecycle、mutable checkout 与更新风险的真实边界 | 原生 immutable artifact/LKG 治理；只移植机制，不采用第三方 manager runtime |
| Todo | `@99percentpeople/pi-todo` `0d85185fc1af2c66df54fcd9347c6e53d10e83f6` | reducer、branch/replay 基线 | native Todo + bounded transplant；无社区 Todo runtime |
| Delegation | `pi-submarine` `5bebbc52ef18f0da092b28f404cd389cfd3577f0` | child transcript、episode、replay/resume | child Thread donor；补 background、locks、limits |
| Background Agent | `pi-subagents` `89de10e4bc8895e7948704c38620a5b35ddcd17e` | reconcile、steer ack、supervisor、control inbox | 只移植 lifecycle/reducer；拒绝巨型 runtime |
| Team mailbox | `pi-agentteam` `3b3b1e4b599cbc6dad2c6202eec5025edb4ed363` | typed message、outbox、TTL、idempotency、attention | 移植 mailbox/receipt；拒绝 task board 与 tmux 本体 |
| Dynamic Workflow | `pi-dynamic-workflows` `31b2aca0f1cb195aafbfc5e3ee2b8c83ad3f21a2` | Agent 现场生成 JS 编排、条件/并行/pipeline | 灵魂正确；native + bounded transplant；补 journal/replan/receipt/hard caps |
| Workflow reliability donors | `pi-extensible-workflows` `1e05e223e5894ad7d81eb8fe615504607df7b9ef` + `@agwab/pi-workflow` `c3fb83cc3204bf171b4461b84a6e0b7532a7bed7` | reducer、launch snapshot、journal/replay、lease、stop intent、非幂等 fence | 只移植可靠性不变量；固定图 ontology 不定义产品 Workflow |
| File rendering | `pi-tool-display` `91cef7580078371f8dc49a8607222807ad6a424d` | Unicode/BOM/CRLF/binary 边界、pending diff | bounded renderer transplant |
| Diff review | `pi-diff-review` `de3fa5983a64cd98f09c95af7426152253f5ed4c` | parser、split view、stale relocation | 只移植 parser/interaction；拒绝 comments 状态 |
| Checkpoint | `oh-my-pi` checkpoint `c84e9c020035c7814a834e91993a7ce15865a3b7` | private bare repo、lock、snapshot/replay | 第一 recovery donor；必须补 safety transaction 和失败回滚 |
| Conditional search | FFF `686a84959ddc72185a7cacaf00145af5ccac7a83` | Rust index/watch/fuzzy/frecency | 只在大仓性能 probe 证明需要后采用底层 library |
| MCP | `pi-mcp-adapter` `6a3e840219a49f9ae5350542b7a707aa1e83fedf` | connection owner、stdio/HTTP、OAuth、recovery、schema conversion | 最强 donor/compatibility probe；不原样成为内核 |
| Browser | `pi-agent-browser-native` `211a012c9b199d758768e8ba729f35e11e661f65` | process cleanup、session/page projection、真实 contract tests | disposable adapter probe；移植不变量，非默认 runtime |
| HTTP/web | `pi-web-access` `c702b3be11bfbc832489eb7cfe31d9bbbbb2cc27` | SSRF、manual redirect、extraction、error handling | bounded transplant；拒绝 research/curator/credential 复合 runtime |
| Optional semantic knowledge | `pi-knowledge` `c18a6bf4f6468566e8ed878dd971c98c2ccf471d` | parser、FTS、symbol、optional embedding、staging/locks | recall probe 后的 curated optional；不默认内置 |
| External knowledge | WeKnora `e99a4dd498d6847817b7c568e7cb4f1d0460179e` | durable queue、retry/dead-letter、revision、source/citation | ordinary external connector + bounded donor；拒绝整套捆绑 |
| Remote shell probe | `pi-ssh` `426baa1223ebad0ec399045a4b3675babbaab293` | 系统 SSH、operation replacement、ControlMaster | disposable protocol probe；shell-only 不足以成为 Remote |
| Remote protocol | Distant `ba58064593ecb9e1b046c7e0d4626f39aa5c2633` | structured FS/search/watch/process/PTY 与 reconnect | strongest protocol donor；alpha，缺 CAS/scheduler，不 fork |
| Local durable backend | `pi-tmux-task` `4514689b7b4917dff8d4bc130d781c2e5f2e7014` | tmux 权威、restart scan、real integration tests | curated optional backend；不定义通用 Job |
| Workbench | Proma `aa02c16819399e7683533f15cfe202754d6b156c` | renderer、event coalescing、background activity、file change UI | 继续 full-renderer vs vertical-slice probe；旧 SDK 只属迁移，不是未来方向 |

明确拒绝的模式：独立 Todo/Team task DB、固定 DAG/YAML Workflow、模型自报 Goal 完成、自动 commit/merge、用户 Git 上 reset/clean checkpoint、复制 transcript 的 memory、默认向量/RAG、完整远程产品 server、透明目录 mirror、MCP 作为唯一扩展协议、capability manifest 冒充 sandbox、在 active work 中热更新。

### 22.9 行为验收而不是竞品功能表

外部优秀产品只提供可观察行为 oracle，不提供生产命名、模式或内部数据结构。V1 至少必须通过以下品牌中立场景：

1. 一个普通任务不显示 Workflow/Team，却能自然完成；
2. 一个复杂任务自动委派并并行读取，用户可进入、追问、停止任一 child Thread；
3. 新证据出现后 Dynamic Workflow 能中途改路，而不是继续执行冻结步骤；
4. App 重启后 Todo、child lifecycle、checkpoint、attention 和外部任务引用准确恢复；
5. dispatch 后断连的非幂等动作显示 `outcome_unknown`，不盲重试；
6. 用户在 Agent 运行时打开刚生成的 Markdown、表格、图片、PDF 或未知文件；
7. local/remote 共享同一 Thread 和工作台，Remote 不变成独立产品；
8. 一个长期 Goal 经过多次会话继续，但普通 Chat 不被强制 Goal 化；
9. 一个 Pi package 成功兼容，另一个因 raw TUI/第二状态真相在加载前得到准确拒绝报告；
10. 一个 package 在 safe boundary 自动升级并通过健康检查，另一个因 trust envelope 扩张停在 Staged；
11. 一个约千份混合资料目录先用 exact/FTS/agentic search，只有真实召回失败才启用可选语义投影；
12. 同一内核完成代码、知识、Remote 长任务和另一种非科研工作，不出现领域专用类型。

### 22.10 仍必须由 disposable probe 决定

- Pi bridge 对真实 package 的兼容范围、headless/UI 降级和 schema cost；
- Dynamic Workflow 真正的 mid-run replan、crash resume、receipt、hard caps 和副作用 fence；
- child Agent 后台恢复、跨进程锁、steer/stop/supervisor 与嵌套上限；
- private recovery backend 对新增/删除/rename/大文件/restore failure 的事务行为；
- Browser crash、MCP disconnect、Remote submit-ack loss 的 `outcome_unknown`；
- exact/FTS/agentic knowledge 与可选语义检索的真实 recall/latency/storage；
- OpenSSH helper 的 CAS write、binary integrity、reconnect、host-key、跨平台和版本并存；
- Slurm submit/query/cancel/log/artifact reconciliation；
- full renderer transplant 与 clean vertical slice 的六个月维护成本；
- artifact staging、generation lease、health check 与 LKG rollback。

这些是工程证据问题，不再反问创立者做技术偏好选择。若 probe 推翻当前主线，先改本 README，再改实现。
