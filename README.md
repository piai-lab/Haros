# 独立 OmniMind：创立宪法

> 状态：新产品的唯一产品与架构真相源
>
> 仓库状态：本仓库就是文中定义的独立新产品仓库；M1 五个可丢弃探针已经形成 `candidate` 路线，生产实现尚未开始
>
> 适用对象：从已冻结 M1 路线搭建第一版内核与工作台、并继续验证生产验收的执行者
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
- M1 五个可丢弃探针已经在 `7041ccbaaf9eb0ecddb171408a59ed0bf42f6843` 形成 `candidate` 路线；§22.11–§22.15 保留其问题、证据、裁决与复验门，不得重新准备或运行同一轮研究；
- 当前仓库已有一条 M2 focused skeleton，但它仍是可删除、可改写的局部证据，不是 UI、桌面宿主或扩展 ABI 的冻结答案；
- UI 母体、ACP-first、多引擎、权限真实性、四层运行投影、专业双语与前端身份边界已经收敛；当前唯一入口是 `execution-brief.md §8` 的完整母体接管与 ACP 垂直 slice；
- 尚未完成的是实际进入产品来源的逐项权利/采用核实和产品验收；`source-adoptions` 仍为 0，F-24 等 production claims 仍为 `open`。

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

**OmniMind 是一个本地优先、可连接远程执行环境、能在同一工作区运行多个真实 Agent Engine、以可持续工作状态为中心的通用 Agent 工作台；不同领域共享同一套文件、工具、编排、恢复和外部执行能力。**

这句话包含七个不能拆开的判断：

- **本地优先**：界面、用户状态、凭据、信任决策和主要模型接入默认留在用户电脑；
- **远程可达**：文件、终端、进程和调度任务可以在 SSH/HPC 环境执行，且是第一阶段能力，不是以后再补的插件；
- **工作状态中心**：产品保存一项工作为什么走到这里、执行过什么、哪些副作用仍未知，而不只是聊天消息；
- **真实多引擎**：默认原生引擎集成最深，其他真实 Agent 通过 ACP 或薄 Bridge 进入；调用相同模型 API 不冒充兼容某个 Agent；
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
- 一个把 Agent 品牌、Provider 切换器或 ACP 调试信息放在用户工作之前的控制台；
- 一个以科研、编码、知识库或 Remote 为一级模式切割用户心智的套件；
- OmniHarness 的新实现。新产品中不创建 `OmniHarness` 模块、接口、兼容别名、占位符或未来扩展点。

## 4. 产品不变量

### 4.1 模型和执行引擎可更换

模型供应商是来源，不是身份。OpenAI、Anthropic、国产模型、兼容端点、Ollama、LM Studio 和未来来源应处于同一层级。

Pi 是默认、最深集成的 Agent 引擎和首要生态入口，但不是唯一引擎。其他真实 Agent 通过 ACP 或薄 Bridge 进入同一工作台。产品的持久状态、远程位置、信任决策、跨引擎关系、外部任务和文件所有权不能被任一引擎的暂时数据结构吞掉。

### 4.2 用户的文件仍是用户的文件

本地文件以本地文件系统为权威；远程文件以远程文件系统为权威。OmniMind 不偷偷复制一套“真正版本”，不透明全量同步，也不让数据库成为用户文档的唯一出口。

### 4.3 一件事实只有一个权威

- 对话消息由对应 Agent Engine 的原生 Session 拥有；OmniMind 只保存 Session 引用、必要游标、能力快照和产品投影，不复制第二份完整 transcript；
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
- 多引擎发现、ACP/Bridge 生命周期、Thread 与外部 Session 的关联、显式 Handoff 和能力真实性；
- 同一位置的 writer admission、隔离写入与唯一 integration owner；
- 原始运行证据到强类型产品事实、增量读投影和 UI view model 的可追溯管线；
- 性能、持久化和故障恢复所需的基础设施。

“原生”指产品对行为和用户体验负责，不等于全部硬编码进 kernel、常驻模型上下文或运行在同一进程。正确分层是：

- kernel 持有少量稳定原语、唯一状态权威、生命周期和回执；
- bundled first-party capability/strategy modules 随产品交付、无需安装、按需激活、可关闭；
- compatibility adapters 把外部生态映射到同一原语；
- Thread、ExecutionTarget、写入准入、权限决定、跨引擎关系和恢复回执保持产品权威；引擎或 package 可以拥有自己的 Todo、Team、Workflow 与子 Agent 状态，OmniMind 只做来源明确的投影，除非某项能力被显式提升为跨引擎产品事实，绝不双写一份看似统一的第二真相。

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
- Agent Engine 默认以独立进程通过 ACP 连接；
- Pi 随产品提供并通过受治理的 ACP Bridge 进入，与外部 ACP Agent 使用同一套可观察语义；
- 本地持久化与文件访问由主进程承担；
- renderer 与 main 之间使用窄、版本化、类型明确的 IPC；
- 远程通过系统 OpenSSH 建立一条连接，在其上运行一个极小 worker 和一条复用协议。

第一版不默认采用：

- Tauri + Bun sidecar；
- 本地 HTTP server；
- 本地 WebSocket；
- 为 Pi 发明第二套私有 Session/Event/Approval 协议；
- 一开始就拆常驻通用 daemon；
- REST + WebSocket + gRPC 三套远程协议；
- 为将来可能需要而建的微服务。

这不是对 Electron 的永久宗教承诺，而是最适合接管已批准 UI 母体、保持桌面体验完整的物理起点。ACP 是 Agent ingress，不是本地桌面传输万能化：renderer 仍只消费 OmniMind 的强类型 IPC 投影，不直接读取 ACP JSON-RPC。

### 7.2 何时允许原生快速路径

Pi 和外部 Agent 首版都遵守同一 ACP 行为契约。只有测量证明 Bridge/进程边界造成不可接受的启动、流式延迟、资源开销或扩展能力损失，才允许为默认引擎增加进程内或专用 transport 快速路径。

快速路径必须通过同一 conformance suite，并保持 Session、Update、Tool、Permission、Cancellation、Recovery 和错误的可观察语义一致。它是可删除的性能优化，不是 Pi 专用产品内核，也不能产生第二套 UI。

### 7.3 进程、状态与更新原则

- renderer 不拥有业务真相；
- main 不创建第二份任一 Engine transcript；
- 所有跨边界命令有 request/correlation ID；
- 大输出写入文件或对象存储，由 `OutputRef` 引用；
- IPC 传输增量、摘要和引用，不搬运巨型全文；
- 后台 Thread 只推送摘要状态，激活 Thread 才接收细粒度流；
- 恢复先根据 journal 重建产品状态，再重新观察外部权威。
- 活跃 Attempt 不热替换 Engine、Bridge、ACP SDK 或 package generation；更新先 stage、验证兼容，再在安全边界激活并保留 last-known-good。

## 8. Pi 的角色

### 8.1 当前裁决

Pi 是默认、最深集成的 Agent 引擎，也是首发必须可用的生态入口；它不是唯一 Engine，也不需要被 OmniMind 重写。第一版优先治理性 fork 已有 Pi ACP Bridge，并让 Pi 与外部 Agent 共用 ACP 语义；不能以“OmniMind 公共 SDK 尚未冻结”为由把最有价值的现成生态推迟到以后。

“默认、最深集成”是内部工程和生态判断，不是前端品牌。普通用户不需要知道当前能力由 Pi 实现，日常界面不得使用 Pi Session、Pi Tool、Pi Team、Pi Workflow 等宿主化命名，也不得复刻 Pi 的 TUI 心智。只有当用户主动选择/安装 Engine、查看 Package 来源、兼容诊断、权限真实性、版本或许可证时，才按事实显示真实名称。来源必须诚实，产品身份也必须独立。

可以：

- 直接依赖 Pi 包；
- fork Pi；
- 移植 Pi 局部源码；
- 给 Pi 上游贡献必要接口；
- 用 Pi extensions、skills、tools 和已有生态；
- 在固定 SHA 上做针对性修改。

不需要为了“独立感”重新实现 Pi 已经做得好的部分。

“一起打包”指默认 Engine 和经过选择的第一方能力随 OmniMind 发布、无需另装，但不意味着全部扩展常驻、全部塞进一个 mega extension 或全部注入模型上下文。Agent 按任务激活，用户可以查看、关闭、停止或固定。Pi package 可以保留自己的内部状态；OmniMind 只拥有跨 Engine 的产品关系、写入秩序、权限决定和可恢复投影。

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

- 第一轮可丢弃集成探针已经完成并进入 M1 `candidate`；后续执行者直接使用冻结结论，不重开同一轮研究；
- 固定 Pi repo、SHA、包版本和许可证；
- 证明 session 创建、流式事件、工具注册、取消、恢复和 branch；
- 证明如何关联 `ThreadId/TurnId/AttemptId/ActionId`；
- 证明不复制 transcript；
- 证明 Pi 单 cwd 限制如何通过 LocationRef/ExecutionTarget 在产品层表达；
- Agent 接入已经有多个真实消费者，直接采用 ACP；不再自创与 ACP 重叠的通用 adapter 树；
- 首发兼容 Pi 的 tool、skill、prompt、extension lifecycle、动态注册、active tools、AbortSignal、stream update、command、headless 降级和必要 journal 映射；
- 依赖 raw TUI、provider mutation、私有 session control、monkeypatch 或第二状态真相的 package 可以 fail-fast，但必须在加载前给出清楚 compatibility report；
- 不宣称虚假的“100% 所有 package 兼容”，也不因少数不兼容包而放弃生态；
- Pi compatibility surface 可以早期稳定，OmniMind 对第三方公开的原生 SDK 等多个 bundled modules 与真实 Pi package 验证后再冻结；
- 已有 Bridge 和编排 package 优先 fork、修正并回馈通用改进，不为了“原创”重写；但 README、测试数量和功能清单不替代真实源码、失败路径与 probe。

### 8.4 ACP-first 多引擎边界

ACP 是首选 Agent 接入标准，不是 OmniMind 的产品状态协议或前端数据模型：

1. 原生支持 ACP 的 Agent 直接接入；
2. 有正式 headless/app-server/SDK/RPC 协议的 Agent 使用薄 ACP Bridge；
3. 只有终端交互或权限边界无法验证的 Agent 只能作为受限 guest，不能伪装成完整受管 Engine。

一个 Thread 在第一次真实执行后绑定一个主 Engine Session。后续继续对话回到同一 Session；跨引擎审查、挑战或继续使用 child、fork、compare 或显式 Handoff，不在活跃 Thread 内热换 Engine，也不拼接两个 transcript 冒充连续心智。

Handoff 是有界事实包，至少包含目标、成功条件、LocationRef、ExecutionTarget、Git/Diff、已验证事实、当前 Todo、未决问题、禁止事项、审批状态、写入所有权和未知副作用。它不声称隐藏思维或原生 Session 被无损迁移。

### 8.5 ACP-first ingress，OmniMind-owned experience

运行数据必须经过四层，而不是让协议事件直通 React：

1. **Raw run evidence**：版本化保存必要的原始 ACP/Bridge envelope，经大小限制和脱敏，可追到来源；
2. **Typed product facts**：把可证明事实归一为 Attempt、Action、Tool、Permission、Question、Plan、Output、Terminal 和 Outcome 等强类型事件；
3. **Incremental projections**：派生当前活动摘要、时间线、工具数量、Todo、child tree、Diff、Viewer 引用、成本和恢复状态；
4. **Presentation view model**：决定图标、标签、折叠、分组、动效、布局和本地化文案。

ACP `ToolKind`、状态、位置、Diff、终端、文本、图片和资源为统一基础体验提供语义，但不是最终视觉 taxonomy。Engine 特有能力通过版本化、带命名空间的 capability projection/renderer 增强局部界面；不能形成 Pi 专用高级外壳和其他 Engine 的阉割外壳。

未知事件必须保留为有界、脱敏、可检查的原始证据，不能静默丢失；但“保留”不等于把全部 wire noise 倾倒进默认时间线。永久状态总线不得退化成 `Activity { kind, payload: unknown }`，UI 也不得按某个 Engine 的私有事件名分支。

### 8.6 Pi 调度其他 Agent

Pi 可以通过其扩展生态调度其他 ACP Agent。这类执行默认是当前 Pi Attempt 下的 child Attempt/Thread 投影，记录 parent、origin、depth、cost、权限和 ExecutionTarget，并受深度、并发、turn、duration、cost 和循环检测上限约束。

同一外部 Agent 即使既能被 OmniMind 直接启动、也能被 Pi 间接启动，两条路径也不能自动互相回入。被 Pi 调度的 Agent 未经显式 promote 或 Handoff 不成为并列主 Thread；用户仍可在工作台进入、查看、追问、纠偏和停止它。Pi package 的 DAG、mailbox、task 和 worktree 状态继续由 package 自己拥有，OmniMind 只投影可观察事实，不双写一套 Team/Workflow/Todo 真相。

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

### 11.3 权限交互与真实强制边界

所有 Engine 使用同一组用户心智：`Approval required`、`Auto`、`Full access`。这三个选项描述用户希望采用的策略，不自动证明宿主技术上能拦截 Agent 的全部操作。

每个 Engine/ExecutionTarget 组合必须另外记录并可检查：

- `host-enforced`：敏感文件、终端、网络或进程能力确实由 OmniMind/受控宿主执行和拦截，拒绝可被证明为不执行；
- `agent-enforced`：依赖 Agent 自身权限系统，OmniMind 可以呈现请求但不能独立证明所有副作用；
- `mixed`：部分能力由宿主强制，部分由 Agent 执行；界面必须显示具体分界；
- `unverified`：当前无法证明完整拦截，只能在用户明确知情的受限模式运行。

ACP permission request 是协作通道，不是安全证明。未经路径审计和拒绝副作用测试，不得把支持 ACP 宣称成 `host-enforced`。需要更强保证时，使用进程沙箱、ExecutionTarget 隔离、文件边界和 writer admission 增强，而不是改一行 UI 标签。

## 12. 工作台与交互

### 12.1 不是聊天应用

界面应围绕“正在做的工作”组织，而不是围绕消息气泡组织。稳定骨架包括：

- 导航与位置；
- 当前 Thread 和 Agent 过程；
- 文件、预览、终端、diff、输出和远程任务；
- 后台 Thread 的运行、阻塞和未读状态；
- 能力与信任的渐进披露。

### 12.2 UI 母体与源码接管

Synara 是已批准的 UI 母体，不是普通参考图或可选灵感板。它的 renderer、设计系统、布局、导航、交互、执行过程表达和必要的桌面桥接构成默认基线。默认物理施工方式不是人工挑拣若干组件，而是把固定 revision 的完整源码树作为可运行基线导入 OmniMind，保留溯源后再大规模换脑、删减和重构。这样可以先保住跨 UI、事件、桥接和服务的隐性耦合，再用测试证明哪些应保留。

“完整复制”只冻结物理起点，不冻结产品权威。边界审判未批准的 provider runtime、Agent loop、工具/扩展生命周期、持久状态或产品 ontology 仍必须在导入后整层删除或替换；不得把“为了不 miss 信息而完整搬入”偷换成“永久保留整仓架构”。

M2 的 `quiet-inline` / `balanced-tabs` 方向已被用户明确否决，不再是候选路线。旧探针、旧文档和旧代码只能提供失败案例与可证明的领域约束，不得作为保护已投入工作的理由。

UI 母体不自动获得产品状态和 Agent 内核权威。已经收敛的边界是：Pi 生态是首要 Agent 能力来源；OmniMind 拥有 Thread/Attempt 关系、权限决定、writer admission、receipt、跨引擎关系与恢复投影；Engine/package 可以继续拥有自己的 transcript、Todo、Team 和 Workflow。完整源码树先保持可运行，再以 ACP-first 和四层运行事实逐条替换 provider/runtime/Activity 边界；符合单一权威与恢复契约的 server、transport 或 SQLite 机制可以保留，不符合者整层删除，不形成长期双轨。

Proma 降为次级机制和组件 donor：只在某个已证明子系统显著优于 UI 母体或补齐其缺口时采用，不再定义整体工作台心智。所有冲突都必须明说、原型化并收敛，不在实现中偷偷折中或建第二套视觉语言。

### 12.3 必须保留的交互能力

- 工作按位置组织，但不把位置变成臃肿 Workspace 聚合；
- running / blocked / unread 一眼可见；
- 后台运行不会消失；
- 用户可以 queue、append、interrupt；
- Agent 可在流程中提出结构化问题；
- 文件树、搜索、reveal、拖拽和多标签/分屏；
- Kanban、Automations、Git 和 pull request 都是重要工作面；具体首发深度由固定源码与产品边界决定，不得仅因后端尚未接线就在 UI 中删除、隐藏或降格；
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
- 默认导航、Chat、运行状态、Todo、Team、Workflow、Viewer 和错误文案以 OmniMind 的中性产品语言表达，不让首选引擎的品牌、TUI 术语或实现结构支配前端；Engine 名称只在用户需要选择、诊断或核实来源时渐进披露。

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

界面遵守冰山法则：用户看到的是少量稳定、丝滑、容易理解的表面，水下必须有准确的状态权威、事件证据、权限强制等级、writer ownership、恢复路径、性能预算和失败语义。不能把水下复杂度全部暴露成控制台，也不能用漂亮动画、假进度、乐观状态或静态 UI 掩盖没有实现的能力。每个重要可见状态都应能回答“事实来自哪里、断电后怎样恢复、失败时显示什么、性能由什么证据保证”。

### 12.8 中英双语是一开始的可用性契约

UI 母体当前的单语言假设不具有继承权。OmniMind 第一版必须让简体中文和英文用户都能顺畅完成关键工作，但目标是功能与理解等价，不是追求“每一个英文词都被翻译”的覆盖率：

- 稳定产品文案、菜单、快捷键说明、空态、权限、错误、通知、更新和恢复路径使用集中、类型安全的 locale resources，不允许在组件中散落无法治理的硬编码字符串；
- 首次启动默认跟随操作系统语言，用户可在设置中即时切换；选择持久化，切换不要求重启，也不改变 Workspace、Thread 或 Engine 状态；
- 产品文案本地化与工作内容分离：不自动翻译用户文件、终端输出、Git 内容、Agent 原始回答、实时 Thinking/Planning 叙述或外部资源；动态内容使用其原始语言，稳定的动作骨架和解释可以本地化；
- `Thinking`、`Planning`、Git、Diff、PR、Token、ACP、API、模型名、命令、代码、路径和文件名等专业词保留英文更自然、更精确时不强译。中文界面允许“中文动作/说明 + 英文技术对象”的克制混排，避免生硬术语和身份错乱；
- 建立小而明确的术语表，逐项决定“翻译、保留英文、首次双写、跟随外部名称”。同一个稳定概念在同一语境保持一致，但不以语言纯度压过专业用户心智；
- 日期、时间、数字、相对时间、复数、排序、搜索和快捷键按 locale 与平台处理，不能只替换字符串；
- 中文验证 CJK 字体回退、标点、换行、混排、输入法 composition、搜索和文件名；英文验证较长标签、窄窗口、截断和可访问名称；
- 所有关键旅程以中文和英文各跑一次：打开文件夹、创建 Chat、启动/停止 Agent、审批、查看文件/Diff/Terminal、Todo/child Agent、Git、Remote、错误恢复和更新；
- 两种语言共享同一信息架构和功能集合。不得出现中文用户无法理解或无法到达的关键操作、只有一种语言存在的功能，或用自动机器翻译掩盖产品文案判断；允许两种 locale 对同一专业词都使用英文。

国际化基础设施应在完整 UI 母体导入后的第一轮改造中建立，早于大规模文案和组件重命名；否则后续每次 UI 修改都会扩大硬编码债务。

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

不害怕大规模复制或引发架构争论；应害怕的是在“原创感”掩护下重造更差的轮子，或在“整仓搬运”掩护下吞入第二状态真相。对真正提供了产品基础的上游，根 README 应以人可读的方式说明贡献并真诚致谢，同时完整保留来源、固定 revision、版权和许可证；感谢不代替权利核实，身份洁净也不允许洗白来源。

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

当前导航：下列五个探针定义保留为历史验收结构；其路线已经是 M1 `candidate`，不是下一执行入口，也不等于生产通过。M1 之后的 UI 母体、ACP-first、多引擎、权限真实性和双语裁决已经收敛；下一入口是 M2 完整 UI 母体接管与 ACP 垂直 slice。

### 探针 A：引擎与 Pi 生态兼容

- 通过 ACP 创建、恢复和分支引擎 session；
- stream、cancel、tool lifecycle、dynamic registration 和 headless 降级可映射；
- transcript 不重复存储；
- Thread/Turn/Attempt/Action 关联清楚；
- 至少两个真实 Engine 通过同一 conformance contract，Pi Bridge 不形成私有快速语义；
- 至少一个 Todo、一个 delegated Agent、一个 dynamic workflow 和一个普通工具 package 经过兼容报告；
- Pi 调度另一个 ACP Agent 时 child relation、循环上限、权限、成本和写入 owner 可观察；
- raw TUI、session control 和第二状态真相能够在加载前被准确拒绝；
- 只把当前任务需要的 tool schema 放入上下文。

### 探针 B：工作台移植与交互骨架

- 完整 renderer transplant 与新状态边界垂直切片同场比较；
- 每 Chat tabs 恢复、文件查看、右侧上下文工作台、diff/terminal/browser/child Thread 成立；
- queue、append、interrupt、临时问题分支和 background attention 可用；
- ACP 原始证据经过强类型事实与增量投影进入 UI，React 不解析 ACP 或 Engine 私有 wire event；
- 长 Thread、Markdown 表格、图片和大输出有测量证据；
- 简体中文与英文关键旅程功能等价，可即时切换，CJK 输入/排版和较长英文布局均通过；
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

- 独立仓库、来源纪律和 M1 五个可丢弃探针已经完成到 `candidate`，不要重复；
- 从 `execution-brief.md §8` 开始：完整导入固定 UI 母体并恢复可运行基线，再建立 locale、ACP 和四层运行投影的 focused vertical slice；
- 使用探针已经裁决的引擎、工作台、远程和文件原生知识边界；
- 每一次只引入一块有明确所有权的能力；
- 搬来后立即删除宿主概念和重复真相；
- 没有旧用户，就不要花未来维护成本保护过去；
- 不要把“简洁”误解为牺牲远程、恢复、知识工作和高强度任务质量；
- 不要把“生态”误解为把所有扩展预装进核心；
- 不要把“授权充分”误解为可以省略来源和质量判断；
- 不要重新发明一个披着中性名词的 Claude Code。

当前不需要凭空设计“核心优势”或护城河。先把成熟工作台和首选生态接好，做到好用、丝滑、漂亮、稳定；内核小、生态可吃、远程真实、知识可积累、更新自动和失败诚实都是产品质量，不是要求团队重造已有能力的口号。

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
| `U1` | Synara 工作台仓库 |
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

#### ACP 正向 Bridge

- 上游：`https://github.com/svkozak/pi-acp.git`
- 固定研究 revision：`d1cffc047ab37a096ee70ca39cfc1de463db8d12`
- 许可证：MIT。
- 方向：把 Pi 作为 ACP Agent 暴露给 Workbench；通过 ACP JSON-RPC/stdio 驱动 `pi --mode rpc`。
- 已观察价值：Session 映射与恢复、消息流、tool lifecycle、文件位置、结构化 Diff、终端、模型/思考配置、skills/prompts/extensions 和部分交互映射。
- 已观察缺口：官方也明确标为 MVP；ACP filesystem/terminal delegation 尚未接入，MCP 配置没有注入 Pi，独立 thought stream 与部分扩展命令/输入 UI 不完整，若干路径仍是 best-effort。
- 裁决：优先治理性 fork 并补 conformance、权限真实性、恢复和扩展兼容；通用修复尽量回馈上游。它是高价值基础，不是未经验证即可宣称“Pi GUI 全兼容”的完成品。

#### ACP 反向 Orchestrator

- 上游：`https://github.com/buihongduc132/pi-acp-agents.git`
- 固定研究 revision：`cb4315135b1fbbc529399bc0f598e5ee356d9060`
- 许可证：MIT。
- 方向：让 Pi 作为 ACP Client 启动、控制和协调其他 ACP Agent；它与“把 Pi 暴露为 ACP Agent”的正向 Bridge 方向相反，可以同时存在。
- 已观察价值：Session lifecycle、delegate/broadcast/compare、DAG、persistent workers、mailbox、health monitor、circuit breaker、取消、超时和 worktree 等机制。
- 已观察风险：拥有自己的 task/team/session/worktree 状态；部分清理和 shell 路径需要重新审判；包页面和 README 只用于发现，最终以固定源码、测试和失败路径为准。
- 裁决：作为可安装的 Pi 能力、managed fork 或机制 donor；它可以让 Pi 指挥其他 Agent，但不能成为 OmniMind 的跨引擎状态权威，也不能绕过 writer admission、权限等级、嵌套上限和唯一 integration owner。

ACP 官方协议与架构：`https://agentclientprotocol.com/`。当前研究以稳定 v1 的 capability negotiation、Session update、tool call/update、permission、Diff、location、terminal 和 content 语义为基线；实验能力必须显式降级，不得提前冻结进产品持久化。

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

### 21.4 工作台来源

#### Synara

- 本地研究镜像：`/Users/liuzaoqu/Desktop/Develop/πCode/synara`
- 上游：`https://github.com/Emanuele-web04/Synara.git`
- 当前固定研究 revision：`ab33931da4c8da884b1445244085f4eeee3eafb6`
- 仓库许可证：MIT；实际采用前仍要核第三方贡献与资产。
- 已批准角色：UI 母体，包括 renderer、设计系统、工作台布局、导航、交互、执行过程投影与必要桌面桥接。
- 允许方式：fork、整个 renderer/子系统 transplant、adapt，或在证据支持时接管更广的桌面宿主机制。
- 已收敛边界：固定完整源码树先作为可运行物理基线接管；renderer、设计系统、布局、导航、执行表达和必要桌面桥接默认保留。server、transport、SQLite、runtime event 与 orchestration 只可作为过渡实现或经测试证明的机制 donor，生产状态必须服从 ACP-first、四层运行事实、单一权威和恢复契约；不符合者整层删除，不维持双轨。
- 硬边界：不得夺取 Pi 的 Agent 引擎/生态地位，不得夺取 OmniMind 的产品状态权威，不得把旧 provider/产品 ontology 移入生产命名。

该裁决不表示已有代码进入生产。`source-adoptions` 仍为空；真正移植时必须在同一提交增加采用路径、法定文本、主要删改、回退方式与人可读致谢。

#### Proma

- 本地研究镜像：`/Users/liuzaoqu/Desktop/Develop/πCode/Proma`
- 上游：`https://github.com/ErlichLiu/Proma.git`
- 本次 SHA：`aa02c16819399e7683533f15cfe202754d6b156c`
- 仓库许可证：AGPL-3.0
- 额外事实：用户是核心参与者并已取得作者完整授权；作者明确表示 Claude SDK 只用于用户迁移，未来不再使用 Claude SDK。
- 候选角色：次级工作台机制和组件 donor；只在具体子系统证明更优或能补齐 UI 母体缺口时采用。
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
- 候选角色：Remote 安全机制、失败案例、测试 oracle，以及可选的 OmniMind icon 几何母形/品牌资产来源。

旧 icon 只是候选资产：使用前要核实溯源与权利，并重做小尺寸辨识、单色、深浅主题、macOS/Windows/Linux 应用图标与托盘适配。旧配色、视觉令牌、界面风格和工程架构没有继承权，可以全部删除并重建。

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
- managed Pi ACP Bridge；
- Synara renderer、工作台或更广桌面宿主机制（实际边界等固定源码审判收敛）；
- Proma 中经证明更优或能补齐缺口的有界机制/组件域；
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
| Native durable primitives | Thread/Attempt/Action、journal、receipt、cancel/resume、引用、权限、writer admission 和 generation lease | 状态唯一、最少、可恢复；只拥有跨引擎产品事实，不抢夺 Engine/package 私有状态 |
| Bundled first-party modules | 文件工作台、Handoff、必要的跨引擎投影、Review、Browser、HTTP、MCP bridge、知识和 Remote adapters | 随 App 发布、无需安装、按需加载、可关闭；不要求常驻或同进程；已有成熟生态能力不重造 |
| ACP ingress + managed Bridge | 翻译 Session、tool、permission、plan、content、usage 与 capability；Pi 也经受同一语义约束 | 首发可用；ACP 不直通 React；Bridge 不继承 Engine TUI、session ontology、provider mutation 或第二状态真相 |
| Curated optional packages | 经真实场景证明有独特价值、可被清楚治理的 package | exact artifact；默认可在既有 trust envelope 内自动更新；可随时禁用和回滚 |
| Arbitrary third-party packages | 用户选择的任意完整权限代码 | 首次 exact artifact 明确选择；加载前 compatibility report；不伪称 sandbox |
| External services | 机构知识库、远程调度器、MCP server、浏览器和其他系统 | 外部系统继续拥有自己的数据、会话、任务和凭据；OmniMind 只保存引用、观察和回执 |

“零第三方默认 runtime”只表示核心状态不依赖某个社区包，不表示排斥 Pi 生态。Pi compatibility 是首发产品要求；能直接运行的包直接运行，优秀但有有界瑕疵的实现可以 fork，边界不合适的只移植机制。

### 22.2 唯一状态权威总表

| 事实 | 唯一权威 | 其他层只保存什么 |
| --- | --- | --- |
| 对话内容 | engine transcript / child transcript | parent 只保存 child ref、摘要和 attention，不复制全文 |
| 产品动作与副作用 | Thread/Attempt journal | UI、通知和扩展只投影 lifecycle/receipt |
| 当前执行计划 | 创建它的 Engine/package；若用户创建跨引擎计划，则为 product journal | OmniMind 保存来源引用和可重建投影；不把各生态 Todo 强行双写成统一数据库 |
| child Agent 内容 | child Thread | parent journal 保存 relation、lifecycle、steer/stop/follow-up |
| Team | 创建它的 Engine/package；显式跨引擎 Team 才由 product message event stream 拥有 | OmniMind 投影 member、assignment、message receipt 和 attention；不复制 Engine mailbox/task board |
| Dynamic Workflow | 创建它的 Engine/package run journal；显式跨引擎 Workflow 才进入 product journal | OmniMind 保存 child relation、Action receipt、hard-cap 和恢复引用；不复制步骤正文 |
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

- Todo 首先是来源明确的计划投影：Pi/package 原生 Todo 继续由其原生 session/state 拥有，OmniMind 显示和纠偏它；只有用户创建的跨引擎 Todo 才由 product journal 拥有；
- 最小状态为 pending / in-progress / completed / deleted，加必要 dependency 引用；
- 产品拥有的计划中，悬空、自依赖和环必须被 reducer 拒绝；Engine-owned 计划按 capability 与真实性降级，不能谎称可编辑或可恢复；
- 不创建独立 Todo 数据库、核心 Task 聚合、验收系统或第二完成治理。

**Delegated Agent**

- 一个委派产生一个真正的 child Thread，可前台或后台运行；
- 支持进入、追问、steer、stop、continue、resume 和 crash reconciliation；
- child 只向 parent 返回 compact result/attention ref，不把完整 transcript 灌回父上下文；
- 允许嵌套委派，但必须有深度、并发、turn、duration、cost 和 spawn 上限；
- 读可 fan-out；共享写入和最终集成只有一个 owner。

**Persistent Team**

- 优先使用已经审判通过的 Pi Team/ACP orchestration 生态；只在用户明确创建、任务需要持续协作或跨引擎能力确实缺失时建立产品级 Team；
- 对 Engine-owned Team 只做成员、assignment、message、delivered/read/ack、attention 与成本的 typed projection；跨引擎产品 Team 才拥有自己的 native message event stream；
- 不增加第二 Todo、依赖图、acceptance、Workflow DAG、自动 commit 或自动 merge；
- 用户可以向父子或同级 Agent 发消息，所有通讯进入同一可审计 ledger。

**Dynamic Workflow**

- 优先由 Pi 的成熟 Workflow/automation 生态根据当前任务和实时结果生成、追加、删除、改序、分支、循环、并行、汇总和终止编排；OmniMind 负责展示、用户干预、权限、写入和恢复真相，不先重写一个竞争 runtime；
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

Evidence level：除后续 probe 小节明确升级的行以外，下列候选均只表示固定源码和相关测试文件已经阅读，**不能写成“测试已通过”**。实际运行命令、计数和停止位置只以对应 probe 小节为准。Metadata-only、源码与发布物无法对应或仓库不可取得的候选不进入本表。

| 类别 | 固定来源 | 已观察价值 | 当前裁决 |
| --- | --- | --- | --- |
| Engine / extension seam | Pi `74caa2649f10ed71b4378ce69f5d9fbfd2466ca5` | session、tool lifecycle、dynamic tools、AbortSignal、headless、operation injection | thin engine/compatibility adapter；首发兼容，产品状态原生 |
| Package governance | `pi-extmgr` `9a0cf32ab83dcf00d6878c09c80aad85a4dd5687` + Pi core `74caa2649f10ed71b4378ce69f5d9fbfd2466ca5` | 31/31 fixed-source update/install tests 与实际 mutation 路径证明 discovery、package lifecycle、mutable checkout 边界；不证明正式 artifact runtime | 原生 immutable artifact/LKG 治理；只移植 discovery/source-normalization/error-display 机制，不采用第三方 manager runtime |
| Todo | `@99percentpeople/pi-todo` `0d85185fc1af2c66df54fcd9347c6e53d10e83f6` | reducer、branch/replay 基线 | native Todo + bounded transplant；无社区 Todo runtime |
| Delegation | `pi-submarine` `5bebbc52ef18f0da092b28f404cd389cfd3577f0` | child transcript、episode、replay/resume | child Thread donor；补 background、locks、limits |
| Background Agent | `pi-subagents` `89de10e4bc8895e7948704c38620a5b35ddcd17e` | reconcile、steer ack、supervisor、control inbox | 只移植 lifecycle/reducer；拒绝巨型 runtime |
| Team mailbox | `pi-agentteam` `3b3b1e4b599cbc6dad2c6202eec5025edb4ed363` | typed message、outbox、TTL、idempotency、attention | 移植 mailbox/receipt；拒绝 task board 与 tmux 本体 |
| Dynamic Workflow | `pi-dynamic-workflows` `31b2aca0f1cb195aafbfc5e3ee2b8c83ad3f21a2` | Agent 现场生成 JS 编排、条件/并行/pipeline | 灵魂正确；native + bounded transplant；补 journal/replan/receipt/hard caps |
| Workflow reliability donors | `pi-extensible-workflows` `1e05e223e5894ad7d81eb8fe615504607df7b9ef` + `@agwab/pi-workflow` `c3fb83cc3204bf171b4461b84a6e0b7532a7bed7` | reducer、launch snapshot、journal/replay、lease、stop intent、非幂等 fence | 只移植可靠性不变量；固定图 ontology 不定义产品 Workflow |
| File rendering | `pi-tool-display` `91cef7580078371f8dc49a8607222807ad6a424d` | Unicode/BOM/CRLF/binary 边界、pending diff | bounded renderer transplant |
| Diff review | `pi-diff-review` `de3fa5983a64cd98f09c95af7426152253f5ed4c` | parser、split view、stale relocation | 只移植 parser/interaction；拒绝 comments 状态 |
| Conditional search | FFF `686a84959ddc72185a7cacaf00145af5ccac7a83` | Rust index/watch/fuzzy/frecency | 只在大仓性能 probe 证明需要后采用底层 library |
| MCP | `pi-mcp-adapter` `6a3e840219a49f9ae5350542b7a707aa1e83fedf` | connection owner、stdio/HTTP、OAuth、recovery、schema conversion | 最强 donor/compatibility probe；不原样成为内核 |
| Browser | `pi-agent-browser-native` `211a012c9b199d758768e8ba729f35e11e661f65` | process cleanup、session/page projection、真实 contract tests | disposable adapter probe；移植不变量，非默认 runtime |
| HTTP/web | `pi-web-access` `c702b3be11bfbc832489eb7cfe31d9bbbbb2cc27` | SSRF、manual redirect、extraction、error handling | bounded transplant；拒绝 research/curator/credential 复合 runtime |
| Optional semantic knowledge | `pi-knowledge` `c18a6bf4f6468566e8ed878dd971c98c2ccf471d` | 183 个 fixed-source unit 中 126 passed / 57 failed：parser、FTS、symbol、watch 与 contract 路径成立，默认本地模型 fetch 使 engine suite 失败 | parser/FTS 可作 bounded donor；semantic 只在真实 recall probe 后成为 curated optional，不默认内置 |
| External knowledge | WeKnora `e99a4dd498d6847817b7c568e7cb4f1d0460179e` | fixed source 显示 durable queue、retry/dead-letter、revision CAS 与 citation；本轮 Go test 未进入执行，不能写成 passed | ordinary external connector + bounded mechanism donor；拒绝整套捆绑，不定义默认知识本体 |
| Remote shell probe | `pi-ssh` `426baa1223ebad0ec399045a4b3675babbaab293` | 系统 SSH、operation replacement、ControlMaster | 只作 system-SSH seam 证据；拒绝 package runtime，shell-only 不足以成为 Remote |
| Remote protocol | Distant `ba58064593ecb9e1b046c7e0d4626f39aa5c2633` | structured FS/search/watch/process/PTY、capability 与 reconnect | bounded protocol/host mechanism donor；不 fork，产品补 CAS、artifact、generation 与 scheduler receipt |
| Local durable backend | `pi-tmux-task` `4514689b7b4917dff8d4bc130d781c2e5f2e7014` | tmux 权威、restart scan、real integration tests | curated optional local backend；不定义通用 Job、日志或 receipt |
| Workbench | Proma `aa02c16819399e7683533f15cfe202754d6b156c` | renderer、event coalescing、background activity、file change UI | 新 shell + bounded component-domain transplant；完整 renderer 仅作 shell/机制参考，不承接产品状态 |

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

### 22.11 M1 Probe A：引擎核心与 artifact provisional choice

> Probe 日期：2026-08-01
>
> 范围：引擎生命周期、context cost、源码/发布物 lineage、真实生态 package matrix 与采用方式。本节收口 M1 的 launch route，不表示生产 compatibility bridge 或 F-24 已验收。

**固定源码链。** 从 Pi `74caa2649f10ed71b4378ce69f5d9fbfd2466ca5` 的洁净 archive 运行 `npm ci --ignore-scripts`。该 revision 不携带 `packages/ai/src/providers/data`，声明的 `build:offline` 会在 model-data check 处失败；`hydrate:model-data` 的目录请求本次超时，命令却以 0 退出且没有生成数据。这是源码复现性与失败语义缺口，不是 runtime 行为失败。

为覆盖固定源码路径，probe 明确从官方 0.83.0 `pi-ai` artifact 复制生成数据；其 manifest SHA-256 为 `68fddb01b38c7abc7c579103da455475593fd788b3dbbf79c04b95bb5a4bb3a7`。该临时产物随后完成 workspace build。它不是官方发布物，只能证明“`74caa…` 源码 + 该外来生成输入”这条路径。

实际目标测试命令只覆盖 `agent-session-dynamic-tools`、`agent-session-runtime-events`、`sdk-session-manager`、`session-file-invalid`、`suite/agent-session-runtime`、`6162-extension-active-tools-next-turn` 与 `7187-malformed-package-manifest`：

```text
npm --prefix packages/coding-agent exec vitest -- --run test/agent-session-dynamic-tools.test.ts test/agent-session-runtime-events.test.ts test/sdk-session-manager.test.ts test/session-file-invalid.test.ts test/suite/agent-session-runtime.test.ts test/suite/regressions/6162-extension-active-tools-next-turn.test.ts test/suite/regressions/7187-malformed-package-manifest.test.ts
npm --prefix packages/coding-agent exec vitest -- --run test/suite/agent-session-runtime.test.ts -t 'updates the runtime session cwd on cross-cwd session replacement' --testTimeout=20000
```

第一条实际运行 28 个测试：27 passed；跨 cwd session replacement 在默认 5 秒 timeout。第二条只复跑该项，在 20 秒仍 timeout。这个计数不证明未运行的 provider、真实 package、UI/headless、Remote 或 live model 行为，不得写成上游测试全绿。

**发布 artifact 链。** registry 中 `@earendil-works/pi-coding-agent@0.83.0` 的 integrity 是 `sha512-uYhF+FsZxogoSX/AxBcUdiY+ZklubwaXyAoEGA2eQwsHcyEAhUYIKh/WLXe/a8+k8eTCmxb+ZN2Zo9mzQtzbWw==`；`@earendil-works/pi-ai@0.83.0` 是 `sha512-m3IZD4g3er0V8TC9+Vpgw/sjTKqcJlkcIBy/JvsgRubuuik3tAVzyugUg4rVrShIkkOT69mEd34NEqKUIsl6JQ==`。两者 registry `gitHead` 都是 `845d6ff1f6643aba440341cce877ce1c43ebbc39`，不是冻结源码；二者之间有 36 个 commits，`packages/ai`、`packages/agent`、`packages/coding-agent` 共 49 个文件变化。因此 0.83.0 的运行结果不能自动证明 `74caa…`。

0.83.0 artifact 的确定性实际运行覆盖创建、流式事件、工具开始/结束、运行时 active-tools 切换、取消、持久恢复、分支和损坏尾部。一个 active schema 的序列化大小为 152 bytes；未选择工具没有进入请求。128 KiB 工具文本在下一次 provider context 中变为 131,781 bytes，session 文件为 133,643 bytes；引擎不会自动把大结果变成引用。6 条消息可恢复，分支上下文为 2 条，非法末行被忽略且保留 6 条有效消息，取消在 127 ms 内得到 `aborted`。

artifact 的 shrinkwrap 在 probe consumer 中产生了顶层与嵌套的同版本模型包实例；通过顶层公开包注册的测试 provider 没有进入引擎实际使用的 registry。改从 artifact 私有嵌套路径注入后上述行为成立。私有路径只用于覆盖 artifact 内部运行，不能成为生产 adapter 合同；这也是当前发布物不能直接采用的原因之一。

**M1 provisional implementation choice。** 当前 package + thin adapter 不足：公开 artifact 与已审源码无法对应，源码构建输入不自足，公开包实例无法可靠注入 probe transport，且跨 cwd replacement 的固定源码测试稳定挂起。暂选以 `74caa…` 为基线的最小 managed fork / upstream patch branch；它不是永久 fork 宪法，也不是生产 adoption。补丁面只限于：

- 让生成输入 content-addressed、可离线验证，并让 hydrate 失败非零退出；
- 修复并锁定跨 cwd session replacement；
- 生成 source revision、artifact digest 与测试结果可对应的 exact artifact；
- 保持 public package 单实例或提供公开、实例安全的 provider/transport 注入边界；
- 保留上游更新价值，差异按复现性、嵌入边界和错误路径拆分，不把 fork 身份带进产品 namespace。

这条小分支优于 bounded transplant 或重写，因为已运行的核心生命周期路径大部分成立，当前负证据集中在 artifact lineage、生成输入、registry 边界和一个 session replacement 路径；局部移植会迫使产品接管内部 session tree、extension loader 与更新合并，重写则重复已经成立的流式、工具、取消、恢复和分支行为。若这些缺口能作为有界上游补丁解决，fork 只承担出包和补丁所有权。§8.3、§15 与 §22.2 已定义 thin adapter、transcript、Thread/journal 和 `OutputRef` 权威；本 probe 只证明 128 KiB 结果会真实穿透到下一次 context，因此既有大输出 fence 是进入 M2 的硬门，不另造一套 doctrine。

**回退与重新验证。** `source-adoptions` 保持为空，因为本 probe 没有把 donor 代码或 artifact 放入生产仓库。降回正式 package 的门是：source 与 artifact 的 `gitHead` 或等价 provenance 可核；同一 revision 能用 content-addressed 生成输入复现；public transport/registry 保持单实例或提供正式注入点；跨 cwd replacement 稳定通过；上述目标 lifecycle tests 在对应 artifact/source 上通过；真实 ecosystem package matrix 通过。满足后删除 patch branch，采用 package + thin adapter。若小分支开始接管 transcript、Thread、位置、第二状态真相，或 maintained delta 不再有界，则拒绝该路线，重新比较 bounded transplant 与替代引擎。

**真实 ecosystem package matrix。** 首轮脚本错误地从 package 根请求 `loadExtensions`；0.83.0 根导出实际为 `undefined`，所以六个样本都在载入前失败。根公开导出中 `discoverAndLoadExtensions`、`DefaultResourceLoader`、`createAgentSession` 和 `ExtensionRunner` 均存在。该失败保留为 host API evidence；正式矩阵只使用这些根公开 API 和 manifest 声明的 extension/skill/prompt 路径，没有从私有 deep import 猎取绿色。

发布物在一个仓库外临时 consumer 中用 exact versions 物化；命令边界是 `npm install --ignore-scripts --legacy-peer-deps`，随后每个样本以独立 Node 进程、独立 `mktemp` workspace/agent/config 目录运行 `node matrix-case.mjs <package>`。`--legacy-peer-deps` 只允许观察不满足 peer range 的 artifact，不豁免产品预检；所有 lifecycle scripts 均被关闭。矩阵没有运行下表 package 自带的 upstream test scripts，不能把“存在 test script”写成测试已通过；对应 fixed-source test 结果仍只由 §22.12 等已记录证据承担。

| 样本 | fixed source ↔ official artifact | 完整 integrity | manifest、依赖与 lifecycle 事实 |
| --- | --- | --- | --- |
| ordinary HTTP/web tool：`pi-web-access@0.17.1` | source `c702b3be11bfbc832489eb7cfe31d9bbbbb2cc27`；artifact `gitHead 2a186dbebab7be605d8c615ae33dd3f2e649666b`，lineage 未证明 | `sha512-AZaDlr6HE4Mn3P7/bokbukGcTqlqGqy/Am+vurxfk9g6L2iZMERLIEAMcZI7aFamrNBBcJ+js1B70ZSgye2xEQ==` | 7 个 runtime deps：`@mozilla/readability`、`linkedom`、`p-limit`、`promise.try`、`turndown`、`typebox`、`unpdf`；三个 0.83.0 host peers 满足；无 install lifecycle script |
| Todo：`@99percentpeople/pi-todo@1.2.3` | source / `gitHead 0d85185fc1af2c66df54fcd9347c6e53d10e83f6`，matched | `sha512-bTSQNUFjrB3ENxe/HsBeLJRQMdONJ6jh6K7telu4v2tQi6zxQ1AYUgtt1dmSq6IuRnMAJ2fbKCUgCGt9hCpBmA==` | 1 个 runtime dep；四个 host/type peers 满足；有 `prepack` / `prepublishOnly`，本轮均未执行 |
| child/background Agent：`pi-subagents@0.38.0` | source / `gitHead 89de10e4bc8895e7948704c38620a5b35ddcd17e`，matched | `sha512-8wGQiX6rkR5J4V+AnWtQg3+LmC+cHnZIM1f/VWTjCTkVmcoKdeLsTAYG6BS2yKAugyEUjNUGj3vE5d9nj9m61A==` | 3 个 runtime deps：`jiti`、`typebox`、`yaml`；四个 peers 满足；无 install lifecycle script |
| Dynamic Workflow：`pi-dynamic-workflows@1.0.1` | source `31b2aca0f1cb195aafbfc5e3ee2b8c83ad3f21a2`；artifact `gitHead dbc6800d1f725f7439e51705e2664c59484afcd1`，lineage 未证明 | `sha512-mZMhco86q3xdwKl5pohfwCJwe2mL15bJ4b+8aacprWq8KFu+W80vK63Xa436yrhAZfq7VRdQULR+49Awcrq16A==` | 1 个 runtime dep `acorn`；三个 host peers 只声明 `^0.78.0`，均排除 0.83.0；无 install lifecycle script |
| browser/web-like：`pi-agent-browser-native@0.2.72` | source / `gitHead 211a012c9b199d758768e8ba729f35e11e661f65`，matched | `sha512-p3uLyFD0RUYbVJII/URooQxRozmKxQdJdVkkIyzHgF/biXcuH9QRzYCXifSjkW3AGX6NVcMDTMjwdA6Y9/xtkw==` | 0 个 runtime deps；四个 peers 满足；manifest 有 `prepare`，本轮关闭；真实 browser process、binary 和三平台 smoke 未运行 |
| Team fail-fast：`pi-agentteam@0.6.8` | source / `gitHead 3b3b1e4b599cbc6dad2c6202eec5025edb4ed363`，matched | `sha512-2U78q5vOjLCk0GUHoWqfxBbXK19IM0kclyoGDLM1GM4uj5R/sZYipOmYch5zxuDbO9mO7fJEvoc7lP+VCv+63w==` | 0 个 runtime deps；四个 peers 满足；无 install lifecycle script，但 artifact 自带 task/mailbox/outbox/team stores 与 tmux host ontology |
| renderer fail-fast：`pi-tool-display@0.5.0` | source / `gitHead 91cef7580078371f8dc49a8607222807ad6a424d`，matched | `sha512-XiDiQ+pCiiR977DZgGKrOTDhGfJO/t8mmMM46tW+9G+BWHmvEl2fxlGpdhSGcvj++m37zvCS/CQG4xKg87Lsuw==` | 0 个 runtime deps；两个 host peers 的声明上限为 0.80，排除 0.83.0；存在 `postinstall` mutation，并截获七个 builtin tool owners |
| shell seam fail-fast：`pi-ssh@0.3.2` | source / `gitHead 426baa1223ebad0ec399045a4b3675babbaab293`，matched | `sha512-0VVyGrUctKu7d1rnETw9phBtt6eHA0T1z+9dcnuEfqIuAkQpWOYphN68HbNYIW3FR1sh72TitbrVtq9BPhBs9g==` | 0 个 runtime deps；唯一 peer 指向另一 host package scope，在本 consumer 中不存在；无 lifecycle script；shell-only 仍不满足 §22.14 的结构化 Remote 边界 |

正式矩阵先解析 identity、integrity、source lineage、peer、scripts、resources、UI/headless、provider/session mutation 和持久状态 footprint，再决定是否允许执行 package code。下表中的 load 时间只是同一台机器的一次局部观测，不是启动性能 benchmark：

| 样本 | public discover/load 与资源 | 实际 tool / failure / cancel 路径 | context、UI 与状态权威 | provisional route |
| --- | --- | --- | --- | --- |
| ordinary HTTP/web tool | 19.345 ms，0 loader errors；4 tools、4 commands；无 skill/prompt | `fetch_content` 对非 HTTP(S) 输入发出 1 次 stream update 后返回错误文本；预先取消在 0.229 ms 返回 `Error: Aborted`。两者都错误地保持 `isError=false`，并各写一条私有 result entry | 四个 tools 共 8,627 bytes；公开 session allowlist 只激活 `fetch_content` 2,476 bytes，另外三个未进入 active set；源码 footprint 有 UI/headless guards 和 session-entry/result store | `compatible-with-adapter` 行为成立，但 source/artifact lineage 阻止 adoption；adapter 必须规范化 failure、把大内容映射为 `OutputRef`，不接受私有 result store 为权威 |
| Todo | 5.110 ms，0 loader errors；1 tool、1 command | revision 0 写入得到 revision 1；第二次仍带 base revision 0，准确抛出 stale revision | active descriptor 2,286 bytes；headless 可执行，plan state 留在 package closure，并在 lifecycle 中用 session entry/message 恢复 | `bounded-transplant` renderer/CAS 机制或直接 Engine-owned projection；不复制社区 Todo state，只有显式跨引擎计划才进入 product journal |
| child/background Agent | 64.422 ms，0 loader errors；2 tools、18 commands、1 skill、7 prompts | `list` 在 175.307 ms 返回可执行 child 定义；不存在的 run status 以 `isError=true` 返回 | 只激活 `subagent`，仍有 24,504 bytes，其中 schema 14,981 bytes；未激活的 wait tool 被排除。artifact 有大量 UI/headless、session mutation、provider/model 和 private status/session/artifact store 路径 | `bounded-transplant` lifecycle/control/reconcile；不加载其完整 runtime，不让其拥有 child transcript、worktree、acceptance 或 workflow graph |
| Dynamic Workflow | 31.304 ms，0 loader errors，尽管三个 peer ranges 均不接受 0.83.0 | 静态脚本被拒绝为“必须调用 agent”；预先取消的有效脚本抛 `Workflow was aborted`，但先流出一次 `Workflow completed`，暴露进度诚实度缺口 | active descriptor 4,067 bytes；有 headless guards，无 durable journal；artifact 与 fixed source 无 lineage | `bounded-transplant` parser/现场 JS 编排/display；M2 用 product Attempt journal 补 mid-run replan、receipt、hard caps 与 truthful terminal state |
| browser/web-like | 26.776 ms，0 loader errors；1 tool；未启动 browser | 空输入准确 `isError=true`；预先取消在输入校验前不改变相同错误，AbortSignal 仍需在真实 process 路径复验 | descriptor 22,123 bytes，其中 schema 19,283 bytes；artifact 管理 process/session/page/output files，不能常驻默认 context | `curated-optional`，由 target ownership、generation lease、receipt/`OutputRef` adapter 包住；真实 binary、crash、download 与三平台仍 open |
| Team fail-fast | 正式矩阵未调用 loader；早期无治理 discovery 曾能载入，反证“host loader 成功”等于产品兼容 | machine report：`SECOND_TASK_AND_MAILBOX_STATE_AUTHORITY`、`TMUX_HOST_ONTOLOGY_AND_PLATFORM_LIMIT`、`PRODUCT_TEAM_IS_NATIVE_MESSAGE_PROJECTION` | wildcard peers 不能证明状态边界；源码扫描命中 task/mailbox 持久状态、UI 与 session-entry mutation | `reject-before-activation`；只保留 §22.12 已验证的 mailbox/receipt 不变量作为 bounded transplant |
| renderer fail-fast | 未调用 loader | machine report：`ENGINE_PEER_RANGE_EXCLUDES_0_83`、`POSTINSTALL_MUTATION_PRESENT`、`BUILTIN_TOOL_OWNERSHIP_INTERCEPTION` | raw TUI、builtin ownership 和 install mutation 超过 compatibility bridge 边界 | `reject-before-activation`；renderer 机制仍按 §22.8 作 bounded transplant donor，不等于生态失败 |
| shell seam fail-fast | 未调用 loader | machine report：`HOST_PACKAGE_SCOPE_MISMATCH`、`SHELL_ONLY_REMOTE_TOOL_DOES_NOT_SATISFY_STRUCTURED_REMOTE` | 依赖失败与产品能力不足分开；没有把网络或远端环境缺失误写为行为失败 | `reject-before-activation`；system-SSH seam 证据仍由 §22.14 承担 |

五个 admitted observations 的 tool set 在 resource load 与 session startup 前后没有发生变化；manifest skill/prompt 实际由公开 resource loader 载入，child 样本得到 1 skill 和 7 prompts。这个结果只说明本轮 lifecycle 没有发生 late registration，不能推断所有 package 都是静态注册；M2 仍必须在 dynamic registration 后重算 registry、policy、active set 和 request context。

这组样本没有任何 artifact 直接晋级 `direct-compatible`：不是“生态不兼容”，而是本轮恰好每个可运行样本仍有 lineage、错误规范化、context 体积或状态 ownership 的额外边界。`direct-compatible` 类继续保留给无 install mutation、peer/API 相容、headless 完整、错误语义正确且不触碰 provider/session/产品状态的纯 package；不能为了填满分类而伪造一个绿色样本。

**M1 当时的 launch route。** M1 选择“最小 managed engine fork / upstream patch branch + 产品拥有的 compatibility bridge”，不是 full ecosystem runtime，也不是每个 package 各写一条兼容轨。后续收敛已经把通用 Agent ingress 修正为 ACP-first，并把整体 M2 入口移到 `execution-brief.md §8`；下列内容仍作为 package compatibility 子链证据保留：

1. artifact resolver 先固定 version/source/`gitHead`/integrity，再复用 §22.15 的 immutable generation、trust diff、safe boundary 与 LKG；任意 package code 执行前生成机器报告；
2. preflight 拒绝 host scope/peer 不相容、install mutation、native dependency/权限扩张、provider/session control、builtin interception 和第二状态权威；被拒绝项不进入 resource loader；arbitrary third-party 仍是完整权限代码，不伪称 sandbox；
3. 通过预检后只走 package 根公开 resource loader；extension lifecycle、tools、skills、prompts、commands、dynamic registration、AbortSignal 与 stream update 映射到一条中性 bridge；UI 只有 capability view contract，raw TUI 不进入产品本体；
4. model request 只取得当前 Action 允许的 active tools。前述 0.83.0 deterministic provider request 已证明未选择 schema 不进入 request；本矩阵再用公开 session allowlist 证明真实 package registry 只激活指定 tool。每次 request 记录 active schema/description bytes。22,123-byte browser 和 24,504-byte child monolith 不得默认常驻，必须按任务激活或由更窄 first-party facade 承接；
5. `appendEntry`、`sendMessage`、provider mutation、session replacement 和 package 持久目录默认是 compatibility effects，不自动成为事实。adapter 只可写 product journal refs、`OutputRef`、external target refs 与 generation receipt；Todo/Team/Workflow/transcript 仍遵守 §22.2；
6. 分类只有 `direct-compatible`、`compatible-with-adapter`、`bounded-transplant`、`curated-optional` 与 `reject-before-activation`。单包失败按 host API、lineage、dependency/environment、behavior 和 state-authority 分因，不扩张成整个生态失败，也不声称 100% 兼容。

这条链现在是 M2 内的 extension/package compatibility 子切片：content-addressed generation → machine preflight → public resource load → active-only schema → stream/cancel/failure normalization → receipt/`OutputRef` → workbench projection。整体 M2 必须先按 `execution-brief.md §8` 接管完整 UI 母体并贯通 managed ACP Session。子切片重新验证门仍是：正式生成物 lineage；public API 不靠私有实例；supported 与 rejected exact artifacts 各一；inactive schema 不进 provider payload；dynamic registration 后 active set 准确；abort/stream/error/result ref 诚实；provider/session mutation 被拦截或显式适配；App restart 后不复制 package 私有真相；macOS/Windows/Linux headless 与有 UI 路径。失败时 pin 旧 generation、卸载 package projection并保留产品 receipt；若 Bridge 为兼容一个包开始接管其私有 ontology，则降为 bounded transplant 或拒绝。

### 22.12 M1 Probe C：原生 journal、动态编排与 recovery seam

> Probe 日期：2026-08-01
>
> 范围：Todo、child Agent、Team message、Dynamic Workflow、文件 CAS、checkpoint 与崩溃恢复。本节是 M2 的 provisional implementation choice；没有生产代码或 donor 进入 `source-adoptions`，也不把 M1 推进为完成。

**固定源码 / artifact 证据。** 每个源码候选都从冻结 SHA `git archive` 到新的 `mktemp`，首行核对物理路径、manifest 与 revision；依赖只安装在 archive。发布 artifact 另以 registry `gitHead` 与 tarball digest 固定。实际结果如下，不得跨列扩张：

| 候选 | 实际运行证据 | 只证明什么 | 不证明什么 |
| --- | --- | --- | --- |
| `@99percentpeople/pi-todo` source `0d85185fc1af2c66df54fcd9347c6e53d10e83f6` / artifact `1.2.3` | registry `gitHead` 与 source 相同；artifact integrity `sha512-bTSQNUFjrB3ENxe/HsBeLJRQMdONJ6jh6K7telu4v2tQi6zxQ1AYUgtt1dmSq6IuRnMAJ2fbKCUgCGt9hCpBmA==`。固定源码先 build shared package，再运行 `node --import tsx --test --test-isolation=process tests/todo.test.ts`：14/14 passed | snapshot 原子更新、stale revision、自依赖/环/悬空依赖拒绝、branch replay、compaction checkpoint 和 read-only UI 基线 | 包只公开默认 extension 与 schema version，reducer 不是公共 adapter contract；不能让 package transcript entry 成为产品 plan 权威 |
| `pi-subagents` source `89de10e4bc8895e7948704c38620a5b35ddcd17e` / artifact `0.38.0` | registry `gitHead` 与 source 相同；artifact integrity `sha512-8wGQiX6rkR5J4V+AnWtQg3+LmC+cHnZIM1f/VWTjCTkVmcoKdeLsTAYG6BS2yKAugyEUjNUGj3vE5d9nj9m61A==`。10 个 targeted unit files 共 107/107 passed | resume ownership、stop/steer inbox、ack、stale-run reconcile、session lease、nested routing 和 spawn budget 的源码路径 | 约 2.7 MB unpacked artifact 还包含自己的 runtime、TUI、acceptance、workflow graph 和 worktree ontology；没有证明可原样成为 child Thread runtime |
| `pi-agentteam` source `3b3b1e4b599cbc6dad2c6202eec5025edb4ed363` / artifact `0.6.8` | registry `gitHead` 与 source 相同；artifact integrity `sha512-2U78q5vOjLCk0GUHoWqfxBbXK19IM0kclyoGDLM1GM4uj5R/sZYipOmYch5zxuDbO9mO7fJEvoc7lP+VCv+63w==`。固定 archive 不含 lockfile；test runner 还硬编码作者机器的 TypeScript fallback。仅在 archive 临时补 TypeScript 后，前 17 suites（含 message policy、outbox idempotency/retry/claim、mailbox attention）通过；随后因 archive 缺少 `docs/baseline-v0.5.0.md` 停止 | typed message、idempotent outbox、claim recovery、compact attention projection 的被执行路径 | 不能称全套测试通过；自带 task store、task history、mailbox/outbox/team stores 和 tmux/runtime 会制造第二状态真相，只可移植 mailbox/receipt 不变量 |
| `pi-dynamic-workflows` source `31b2aca0f1cb195aafbfc5e3ee2b8c83ad3f21a2` | 固定 archive 的 `npm ci --ignore-scripts` 后运行声明的 `npm test`，`check + build + 24/24 unit tests` passed | runtime-created phase、条件/循环 phase、parser hazard rejection、abort 和未等待 child promise 拒绝 | 发布 artifact 的 lineage 不对应此 SHA；源码 runtime 以内存 route 为主，没有证明 mid-run replan、crash resume、receipt、retry lineage 或副作用 fence |

此前 §22.8 的 checkpoint 行已降级并移除：原研究披露没有可核来源 URL，错误候选 `https://github.com/acidsugarx/oh-my-pi.git` 不存在；纠正后的可能上游 `https://github.com/can1357/oh-my-pi.git` 也不包含冻结 SHA `c84e9c020035c7814a834e91993a7ce15865a3b7`，GitHub commit API 返回 `422 No commit found for SHA`。因此该 SHA 不能继续被称作固定源码已阅读、不能承担 adoption 或 probe proof。网络/lineage 失败不说明 private bare Git 机制好坏；重新进入候选表的门是来源 URL、固定 revision、许可证、完整 archive 与目标 recovery tests 全部可复核。

**原生 simulator 证据。** 仓库外 disposable Node probe 以一个 append-only JSONL journal、可重建 reducers、真实 filesystem 和独立 private bare Git recovery store 运行 8/8 tests；它没有导入上述 donor，也不证明 donor。覆盖矩阵为：

- main 与 question branch 分别 replay Todo；自依赖、悬空依赖和环 fail-fast；restart 前后 projection 完全相同；
- foreground/background child 共用一个 lifecycle reducer，steer、stop、settle 可重放；Team message ID 去重并投影 delivered/read/ack/expired，attention 的 completed/attention/failed/outcome_unknown 四态去重并保留 deep link；
- 初始 route 在收到真实 evidence ref 后删除 route A、加入 route B；retry 创建带 `retryOf` 的新 attempt，hard cap 停止继续生成；已 dispatched 未 settled 的非幂等 attempt 在 replay 后成为 `outcome_unknown`，没有自动重放；
- observed-version token 含 identity/type/size/mtime/digest，外部修改后 CAS write 被拒绝；fresh observation 才能原子替换；
- private recovery store 实际覆盖 create/modify/delete/rename/symlink/untracked 与 1 MiB 文件；两次 restore 前后用户 repo 的 HEAD、index tree、refs 与 stash 完全不变；
- restore 中途失败会恢复 safety checkpoint；restore 与 rollback 都注入失败时保持 `outcome_unknown`。

**M2 provisional implementation choice。** 采用一个产品自有 append-only Thread/Attempt journal 加小型纯 reducer；Todo、child lifecycle、Team receipt、Workflow run/step/attempt、attention 与 `CheckpointRef` 都是同一事件流的不同投影，不建立社区 Todo DB、Team task board、固定 Workflow graph 或 transcript copy。first-party modules 可以 bounded transplant 上表已执行的不变量，但 package 不拥有 canonical state。Dynamic Workflow 固定的是 journal、caps、retry/receipt/fence，步骤继续由 Agent 根据 evidence 实时改写。checkpoint backend 保持可替换 seam；首个实现可以使用 per-Location/per-Attempt private recovery store，但必须由产品实现 safety transaction，不再依赖当前不可验证 donor。

止损点已经达到：Probe C 足以排除“直接采用状态型 package”“固定 DAG/YAML”“用户 Git checkpoint”和“每种编排一个数据库”，不再扩大 donor 考古。仍保持 open 的是生产 journal 的并发/损坏尾部/跨进程实现、真实 engine package bridge、跨 OS 文件权限与锁、目录/更大文件性能，以及 production recovery backend 的 crash-at-every-boundary matrix；这些属于 M2 实现验收，不允许把 8-test simulator 冒充生产通过。

### 22.13 M1 Probe B：Thread-owned workbench 与有界 renderer 移植

> Probe 日期：2026-08-01
>
> 范围：固定 workbench 源码的 renderer、状态、IPC、stream/scroll、viewer、file change、background activity 与 child control；以及仓库外的交互假设搜索。本节是 M2 的 provisional implementation choice，不是视觉批准、源码采用或跨平台验收。

**固定源码与实际命令边界。** 从 Proma `aa02c16819399e7683533f15cfe202754d6b156c` 的全新 `git archive` 运行 `bun install --ignore-scripts`，安装 1,184 packages；`bun run --cwd apps/electron build:renderer` 通过，Vite 处理 5,382 modules，用时 9.72 秒。产物共 22,548,793 bytes，其中 356 个 JavaScript 文件合计 18,266,249 bytes，最大两个 chunk 为 4,421,937 与 1,542,127 bytes。该命令只证明固定源码在本次 macOS 主机可构建，不证明首屏、长 Thread、viewer runtime 或 macOS/Windows/Linux 打包运行。

Focused command 只运行外部 pure-function matrix 与以下 donor tests：collaboration utils、agent atoms、session-list merge、external run、completion presence、process grouping 和 default-app fallback。结果是 8 files、53/53 tests、113 expects、53 ms；其中 donor tests 49 个，probe matrix 4 个。它们覆盖 delegation idempotency、retry/stream state、child-preserving session merge、external activation freshness、background completion presence、process grouping 与 fallback label。没有运行或证明 viewer 渲染、watcher 集成、长滚动、三平台 package 或 durable temporary-question recovery。

外部 matrix 直接调用固定源码的纯函数，实际证明四个状态边界：持久化会丢弃 preview/open-file 并把 active preview 映回 agent tab；同进程 memory map 能重建 preview；清空 memory 模拟重启后 preview contract 消失；打开另一 session 会替换之前的顶层 session entry。它只证伪现有 state contract，不能替 donor 或未来产品证明恢复能力。

**为什么完整 renderer 不能承接 M2 状态。** renderer 有 434 files，其中 339 个 TS/TSX/CSS 文件；111 files 直接调用 `window.electronAPI`，共 620 occurrences，公开 host surface 有 335 property signatures。135 files 导入 Jotai；31 个 atom 文件共 3,882 lines。`AppShell`、`Panel`、`LeftSidebar`、`MainArea`、`TabBar`、`TabContent` 与 renderer `main` 这条 shell/state spine 共 6,769 lines，其中 `LeftSidebar.tsx` 单文件 4,517 lines，并以持久化的全局 app mode 区分 Chat/Agent。

失败不是“一个 session store 不够好”这么局部，而是六个相互耦合的边界：

| 边界 | 固定源码事实 | 对完整移植的影响 |
| --- | --- | --- |
| Session store | `apps/electron/src/renderer/main.tsx:704-855` 只持久化 tabs 与 active tab；启动时只恢复一个有效 session 加 scratch | 无法准确恢复每 Chat 的完整工作台 |
| Per-Chat workbench | `atoms/tab-atoms.ts` 明示 session view map 只在 runtime memory；`atoms/preview-atoms.ts` 的 open-file map 也只在内存，split/mode 反而是全局 storage | tabs/open files/active pane/split 没有同一个 Thread-owned authority |
| IPC | renderer 跨 111 个文件直接依赖 335-property host surface | “替换宿主边界”会变成广域侵入式重构，难以证明没有第二状态真相 |
| Message mapping | `AgentMessages` 同步读取整份 JSONL，合并、分组、过滤后把全部可见 group 与 minimap 映射到 DOM | 无 virtualization、pagination 或 history cap；长 Thread 性能未成立 |
| Streaming/scroll | `packages/ui/src/hooks/useSmoothStream.ts` 使用 `Intl.Segmenter`、`requestAnimationFrame` 与动态 drain；Conversation 使用 stick-to-bottom | 可移植的是 batching/anchoring 机制，不是无界 message list |
| Platform/build ownership | scripts 声明 mac/win/linux，但固定 revision 的 release CI 只构建 macOS arm64/x64 与 Windows x64；本次只构建 renderer | Linux 与三平台 runtime、window chrome、shortcut/path/watch 行为仍是产品责任 |

因此“保留 renderer shell、替换状态边界”最多是一个有界 shell 选项：三栏几何和 panel chrome 可作为参考或在清除全局 mode、host identity 与直接 IPC 后移植；若保留现有 6,769-line spine，则必须重写散布的 atoms、message mapping 与 IPC，预计比表面复制更难持续合并上游。它不是零成本复用，也不能让 donor settings 或 JSONL 成为产品状态真相。

**可有界移植的组件域。** 当前证据也不支持“状态有缺陷，所以全部重写”。以下固定源码域有可抽出的机制，但生产采用前仍须缩到明确文件、依赖、adapter 和 rights 边界：

- viewer/file change：`apps/electron/src/renderer/components/diff/` 19 files、5,724 lines、19 次直接 IPC；`components/file-browser/` 11 files、2,584 lines、29 次直接 IPC。`DiffTabContent.tsx` 已有 text/Markdown/PDF/Office/image 分流、50-entry LRU、per-session/file scroll cache、500,000-character plain-text fallback 与 refresh-version reload；workspace watcher 用 recursive `fs.watch`、300 ms debounce、噪声目录过滤与 error restart。它证明值得抽取 renderer/viewer contract 与 watcher mechanics，不证明整目录可直接复制：未知文件仍按最多 50 MB UTF-8 读取，错误和 binary contract 不完整，scroll cache 也不耐久。
- stream feedback：`useSmoothStream.ts` 的 segment batching 与 rAF drain、Conversation 的 scroll anchoring 可以 bounded transplant；新的 message list 必须另行 virtualization/pagination，不能继承整份同步 JSONL 与全量 DOM mapping。
- diff/file activity：file write 后的 refresh-version、process block grouping、background completion presence 与 default-app fallback 有源码和本次 targeted tests 支撑；产品以 `OutputRef`、journal projection 与 capability adapter 接入，不复制 donor atoms。
- queue/activity：message queue、external run、process group、background/active task surface 合计候选约 1,407 lines。只采用 retry/activation/grouping/presence 的纯机制与组件行为；本次没有运行 message-queue 自身测试，不能把整个 queue 记为已验证。
- child control：侧栏按 `parentSessionId + sourceDelegationId` 建一层 child tree，点击能进入真实 child session；Thread 内已有 follow-up、interrupt/stop 路径。父级 child row 没有专用 steer/stop/ask 控件；AskUser 仅是 main-process 内存 Map，App 进程重启会丢失。因此 M2 要保留“compact row → real child Thread”的交互基因，自行实现 durable temporary-question branch 与 receipt。

**交互假设搜索。** 仓库外共生成 8 个真实 workflow candidates，覆盖 ordinary Chat、folder-bound work Thread、child control 与 recovery/location 四个 feature family，每组两个不同 archetype；另做 micro-axis 与重复饱和轮。桌面 1440×900、light/dark、normal/reduced-motion 共审计 80 种组合，最终是 0 errors、0 warnings；首轮发现 workbench 关闭态仍有 clipped Close control，修正后复跑通过。这个结果只证明临时原型自洽，不能证明产品 UI 已获 maintainer approval。

暂留三个交互基因：普通 Chat 使用安静、熟悉的 conversation-first 导航且可无目录；工作 Thread 以 chat 为主、右侧工作台按需打开，balanced split 是同一 Thread 的持久状态而非另一种 shell；child 以 compact row 出现并可进入 focused child Thread。淘汰 focus-card 的 card-inside-card、永久 child tree/dashboard、独立 recovery route、永久 Remote/Workflow dashboard、装饰性差异和重复候选。Location inspector 只在实际 remote/external execution 时渐进出现；旧 object-workbench prototype 不复活。临时 UI artifacts 已删除，不进入仓库。

**M2 provisional route。** 选择“产品新 shell + bounded component-domain transplant”，不是“全部重写”：

1. 普通 folderless Chat 与通常绑定文件夹的 work Thread 共用一个 Thread 模型，不再以全局 app mode 分裂产品；
2. Thread journal projection 唯一拥有 tabs、open files、active pane、semantic split 与 execution location，filesystem 继续拥有文件 bytes；
3. 新 message list 采用 batched stream、bounded DOM virtualization/pagination 与 scroll anchoring；
4. watcher event 通过小型 capability adapter 刷新 exact generated-file `OutputRef`，让 Attempt 运行中可以打开刚生成文件；
5. 右侧 workbench 按需出现，先交付 text/unknown fallback 与 diff，再把 Markdown、image、PDF、table/office 等放进显式 viewer adapter；
6. compact child row 进入真实 child Thread；follow-up、interrupt、stop 作用于当前 child；temporary question 是可重放分支，结论带 back-reference 回父 Thread；
7. local 是默认 execution location；Remote/external inspector 只在需要时出现，不成为永久模式；
8. layout 使用平台中立的语义状态，window chrome、shortcut、path 与 file watching 由 OS adapter 承担。

进入 M2 前不搬入 donor renderer；第一条真实 vertical slice 决定具体采用文件。性能门至少覆盖 first visible/first delta、high-frequency stream batching、100k+ character Thread、bounded DOM、background update、500k+ text/unknown/binary viewer、watcher storm 与内存增长。恢复门必须 crash/restart 后逐 Chat 精确还原 tabs/open files/split。平台门必须在 macOS、Windows、Linux 的 package runtime 走同一 folderless Chat、folder-bound Thread、generated-file open、child control 与 local/Remote-on-demand 场景。viewer 还要覆盖 oversized、corrupt、unknown binary、missing 与 concurrent change。只有 bounded 文件/依赖/rights、adapter contract、targeted source tests 和这些产品门都明确后，才把实际代码写入 source adoption。

止损点已经达到：完整 renderer transplant 作为 M2 状态底座被排除；新 shell 与哪些机制值得继续移植已经足够施工。仍保持 open 的是最终视觉 approval、实际 vertical slice 文件选择、长列表/stream 基准、durable temporary question、viewer failure matrix 与三平台 package runtime；这些不能由本次 build、53 tests 或临时 UI 冒充通过。

### 22.14 M1 Probe D：system-SSH transport、结构化 helper 与外部 Job receipt

> Probe 日期：2026-08-01
>
> 范围：Remote 文件/进程/PTY、连接恢复、本地耐久 backend、submit-ack-loss、外部 Job 对账、日志/下载与 helper generation。本节是 M2/M3 的 provisional implementation choice；没有真实 HPC/Slurm 运行、生产代码或 source adoption。

**固定源码与 artifact lineage。** 三个 donor 都从精确 revision `git archive` 到独立临时目录，首行核对物理路径、revision 与 manifest；依赖只进入 archive。`pi-ssh@0.3.2` registry `gitHead` 与源码 `426baa1223ebad0ec399045a4b3675babbaab293` 相同，integrity 为 `sha512-0VVyGrUctKu7d1rnETw9phBtt6eHA0T1z+9dcnuEfqIuAkQpWOYphN68HbNYIW3FR1sh72TitbrVtq9BPhBs9g==`，上游为 `https://github.com/hjanuschka/pi-ssh.git`。`pi-tmux-task@0.2.1` 的 `gitHead` 与源码 `4514689b7b4917dff8d4bc130d781c2e5f2e7014` 相同，integrity 为 `sha512-XHREK5HPzbRG6/+19xvbQLMKCqQryOwzCNE++5xi/iT3VS7GUAJxCcgFPLkRIzWRFvzsSezCfw5jFZriWz7msA==`，上游为 `https://github.com/ttttmr/pi-tmux-task.git`。Distant 使用本地镜像的固定源码 `ba58064593ecb9e1b046c7e0d4626f39aa5c2633`，上游为 `https://github.com/chipsenkbeil/distant`；本 probe 没有把它的源码行为越级写成任何发布 artifact 行为。

**实际运行 suite。** 每行只证明该命令覆盖的固定源码路径；passed/skipped/failed 不跨行相加成未运行能力。

| 固定 revision | 实际命令 | Passed / skipped / failed | 证据边界 |
| --- | --- | --- | --- |
| Distant `ba5806…` | `cargo test -p distant-core --test api_tests -- --nocapture` | 6 / 0 / 0 | single、parallel 与 sequence request，失败继续/中断语义 |
| Distant `ba5806…` | `cargo test -p distant-core --lib reconnect -- --nocapture` | 50 / 0 / 0 | reconnect state/strategy、typed/untyped failure triggers、in-memory/TCP/Unix reconnect；不等于真实 SSH/HPC 漫游 |
| Distant `ba5806…` | `cargo test -p distant-host --lib api::tests -- --nocapture` | 68 / 1 / 0 | FS metadata/read/write/append/copy/rename/remove、watch、process、stdin/kill、version/capability。唯一 skipped 是 `set_permissions_should_set_readonly_flag_if_not_on_unix_platform`，因为当前测试主机是 Unix，该非 Unix 分支不适用 |
| Distant `ba5806…` | `cargo test -p distant-host --lib api::state::search::tests` | 32 / 0 / 0 | path/content、pagination/limit/depth/include/exclude、binary match、cancel 与 search state |
| Distant `ba5806…` | `cargo test -p distant-host --lib api::state::process::instance::tests::spawn_should_succeed_with_pty` | 1 / 0 / 0 | 当前主机的 local PTY spawn；不证明远端 PTY/resize |
| Distant `ba5806…` | `cargo test -p distant-ssh --lib -- --nocapture` | 318 / 0 / 0 | SSH config/ProxyJump parsing、host-key policy、first-key record、changed-key reject、keyboard/password/key auth logic、binary helpers 与 failure paths；大部分是 unit/mock，不是实际 jump/2FA/host-key-change connection |
| Distant `ba5806…` | `cargo test -p distant-ssh --test lib connect_with_verbose_should_succeed -- --nocapture` | 1 / 0 / 0 | 本机临时 OpenSSH server 的 key-auth loopback connect |
| Distant `ba5806…` | `cargo test -p distant-ssh --test lib read_file_should_send_blob_with_file_contents` | 1 / 0 / 0 | 同一类本机 loopback 的 SFTP blob read |
| Distant `ba5806…` | `cargo test -p distant-ssh --test lib proc_spawn_should_send_back_stdout_periodically_when_available -- --nocapture` | 1 / 0 / 0 | 同一类本机 loopback 的 process stdout |
| Distant `ba5806…` | `cargo test --test stress_tests should_handle_abrupt_client_disconnects -- --nocapture` | 1 / 0 / 0 | loopback manager/server 在一个 client 强退后仍可接受新 write/read；不证明已 dispatch side effect 的 settlement |
| `pi-tmux-task` `451468…` | `npm ci --ignore-scripts && npm run check` | 10 个 shell integration checkpoints、5 个 Node test scripts 与最终 import 均通过；0 个命令失败 | tmux window create/reuse/output、explicit session、C-locale snapshot、delayed task、start/exit/input/disappear events、stale scan 与 cleanup。没有统一 test case 计数，不伪造总数 |

三条本机 OpenSSH integration 只证明当前 macOS 环回 server 上的 connect/blob/process 路径；不证明真实远端、system OpenSSH client、ProxyJump、2FA、host-key change、网络抖动、Windows/Linux 控制端或 HPC。`distant-ssh` 自己使用 `russh` 并拥有一套认证/host-trust 实现；这与产品已经冻结的“system OpenSSH 拥有认证、host trust、agent、2FA 与 ProxyJump”边界不同，所以整套 SSH client 不进入产品。

**候选边界。** `pi-ssh` 的全部实现是一个 943-line `index.ts`，直接替换 read/write/edit/bash 四个工具、改写 system prompt，并以 `/tmp/pi-ssh-%C` ControlPath/600-second ControlPersist 复用 system SSH。它没有源码测试、capability/version handshake、request correlation、CAS、artifact、reconcile 或 scheduler；timeout/abort 只杀本地 SSH child，不能证明远端副作用未发生。它准确证明 system-SSH + operation injection seam 可行，但 package runtime 会把 Remote 变成引擎 mode，故拒绝直接采用。

Distant 的 request 有唯一 ID，response 有 `origin_id`；host 与 SSH backend 暴露 protocol version/capabilities，实际源码和上表 tests 覆盖 FS/search/watch/process/PTY/reconnect。其 `FileWrite` 是普通 overwrite，protocol 没有 observed-version/CAS precondition，也没有 scheduler submit token、artifact download transaction、helper generation lease 或 Job receipt；manager/server/SSH client/CLI 又远大于产品需要。因此不 fork 整体，只把 protocol framing、request correlation、capability negotiation、binary stream、watch/search/process/PTY 与 reconnect failure handling作为 bounded mechanism donor。

`pi-tmux-task` 的固定源码能从 tmux 权威扫描 running/dead/disappeared 状态，并在 app/session shutdown 后保留 active window；但 runtime session map 在内存，日志只有 `capture-pane -S -20` preview，没有 cursor/完整 OutputRef、submit receipt、idempotency token、remote reconcile 或 scheduler state。它可作为 curated local process backend 的机制参考，不能定义通用 Job，也不能替代 native local process 与 Slurm adapter。

**产品外部 simulator。** 一个不含 donor 的 disposable Node probe 运行 10/10 tests。它以真实临时文件和 append-only JSONL 验证：固定 protocol/capability/artifact manifest；binary observed-version CAS、staging 与 concurrent-change rejection；submit intent 在 ack 丢失后按 token reconcile 且只 dispatch 一次；没有 correlation token 的 disconnect 留下 `outcome_unknown` 且不盲重试；App restart 后从 scheduler authority 恢复 running Job；queued/running/completed/failed/cancel-requested/cancel-acknowledged 分离；512 KiB log 只返回 digest/size/4 KiB preview/cursor；download 在断连后保留 `.partial`，续传后校验 exact size/hash 再 atomic rename，错误 digest 不激活；旧 Job 保留 helper generation lease，新 generation health check 失败 quarantine 并回滚 LKG；journal 只保存 redacted connection ref。它证明 OmniMind 的 receipt/reconcile seam 可实现与可证伪，不证明 Distant、tmux、真实 Remote 或 Slurm。

**M2/M3 provisional implementation choice。** Remote 保持普通、按需出现的 `ExecutionTarget`，不创造 Remote mode、Workspace 或 dashboard。连接分成三个所有者：

1. 本机 system OpenSSH 只拥有 host trust、config、ProxyJump、agent、2FA、ControlMaster 与 credential interaction；凭据不传给 helper，不进入 journal、日志、错误或 UI；
2. content-addressed、可版本并存的极小 helper 只拥有 capability/version handshake、stat/list/read/search/watch、observed-version CAS write、PTY/process、binary stream 与 bounded cursor；helper 没有账号、模型、Thread、Todo、Job DB 或 updater；
3. 产品 Thread/Attempt journal 唯一拥有 Action intent/receipt、connection ref、helper generation lease、`OutputRef` 与 reconcile state；native local process 是第一个 backend，first-party Slurm adapter 是第一个外部 scheduler，Slurm ID/state/log/artifact 保持远端权威。

submit 必须先写 intent 与 idempotency/correlation token，再 dispatch；ack 丢失只能按 token、用户与有界时间窗向 scheduler 对账。可定位同一 Job 才写 acknowledged/reconciled；无法定位则 `outcome_unknown`，禁止自动重提。cancel requested 与 scheduler acknowledged 分开。大日志按 cursor 读取，下载使用 `.partial → size/hash → atomic rename`。helper 更新遵守 exact artifact、generation coexistence、safe boundary、health check、quarantine 与 LKG rollback；活跃 process/Job 始终租用旧 generation 到结清。

**复验门与真实未决风险。** 进入生产 adoption 前，必须在一台非本机 Linux target 上用 system OpenSSH 实跑首次 host key、changed key reject、key/agent/交互认证、ProxyJump、断连/重连与 binary CAS；在 macOS/Windows/Linux 控制端核路径、权限、watch、PTY、sleep/wake 与 helper bootstrap/rollback。必须对真实 Slurm 实跑 submit response 丢失后的 token reconcile、queued/running/completed/failed、login/execute node 分离、cancel request/ack、App 强退、长日志 cursor、artifact partial resume/hash/rename。还要注入 helper health failure、两代并存和 LKG rollback。当前机器没有 `sbatch`/`squeue`/`sacct`/`scancel`/`slurmrestd`，所以真实 Slurm、真实远端 ProxyJump/2FA/host-key-change/HPC 全部保持 open；网络或环境缺失不算能力失败，也不允许 simulator 代替实测。

止损点已经达到：M2/M3 不再在“shell package”“完整 remote protocol fork”“tmux 定义 Job”与“产品 receipt + system SSH + bounded helper”之间分叉。生产路线选择最后一项；未决项已经变成上述明确的真实环境复验门，没有 donor 代码或 artifact 进入仓库。

### 22.15 M1 Probe E：文件原生知识与 immutable extension generations

> Probe 日期：2026-08-01
>
> 范围：约千份 mixed corpus 的 filename/glob/exact/FTS/来源导航边界，以及 bundled、curated、任意第三方 extension 的自动更新治理。本节给出 M2/M5 provisional implementation choice；临时 corpus、索引、artifact 和 donor 代码均未进入仓库，真实 Agent/model 与正式 registry/package 仍按下列复验门保持 open。

**固定源码、发布 metadata 与测试等级分离。** 三个候选都从固定 revision 导出到全新临时目录；安装只发生在 archive。实际结果如下：

| 固定证据 | 实际命令与结果 | 已证明 | 未证明 / 负证据 |
| --- | --- | --- | --- |
| `pi-extmgr` source `9a0cf32ab83dcf00d6878c09c80aad85a4dd5687` | `pnpm install --frozen-lockfile --ignore-scripts && node --import=tsx --test ./test/auto-update.test.ts ./test/install-remove.test.ts`：31 passed / 0 skipped / 0 failed | update discovery、source identity normalization、宿主 install/update 调用、失败历史、reload 提示、URL timeout、临时解包 cleanup 与依赖缺失拒绝的固定源码路径 | registry 只读取 version/tarball URL；standalone 路径未核 integrity，直接 URL 写最终路径，本地安装先删目标再复制，managed update 原地委托宿主。没有 trust-envelope diff、safe-boundary activation、generation lease、health/quarantine 或 LKG；不能采用为更新权威 |
| `pi-extmgr@0.3.0` registry metadata | integrity `sha512-5vR0qFFhIBYvfzBHfp4jAe2saMtvFF8lNP/V/23w6VbRQShC8AP/HE+qRWinZM8b1EnaBNneCYAsO7LsUJUGPg==`，`gitHead dfc30ff8afbf8c70ea850ec981bdeb0c580b7e2c`；它是固定源码的父 commit，二者 `src/` 与 `test/` 无 diff，release commit 只改 package/changelog | source/runtime files 的 lineage 差异可界定 | 本轮没有下载、检查或运行该正式 artifact；31 tests 仍是 source evidence，不得越级成为发布物 runtime proof |
| `pi-knowledge` source `c18a6bf4f6468566e8ed878dd971c98c2ccf471d` | `npm ci && npm test -- --reporter=verbose`：17 个 test files 中 16 passed / 1 failed；183 tests 中 126 passed / 57 failed / 0 skipped | SQLite FTS/CJK、vector storage primitives、parser/chunker、symbol、watch exclusions、diagnostics/tool contract、API failure/abort 与 model-worker failure paths | 57 个 engine tests 都以 model worker `fetch failed` 失败；初始化/增量/删除/staleness/semantic engine 不能写成 passed。默认本地模型仍需 fetch，直接证伪“默认重型语义索引可离线可靠启动” |
| WeKnora source `e99a4dd498d6847817b7c568e7cb4f1d0460179e` | 固定源码核对 `internal/types/task.go`、`task_dead_letter.go`、`internal/application/repository/task_queue.go`、`chunk.go`、`wiki_page.go`、`internal/application/service/knowledge_process.go`、`chat_pipeline/references.go` 与对应 tests。两次有界 `go test ... ./internal/types` 都只停在依赖下载/编译，未进入任何 test，随后主动终止 | 源码存在独立 worker-pool/queue registry、持久 pending/dead-letter、有限 retry、chunk/wiki optimistic revision 与 source/citation mapping；tests 定义了 queue uniqueness、dead-letter、CAS/revision 与 citation 场景 | 没有 passed/skipped/failed 计数，不能把 test 文件存在写成运行通过；这些机制不证明整套服务应接入，也不定义 OmniMind 默认知识本体 |

**文件原生实际 probe。** 仓库外 disposable Node probe 每次生成无秘密、可重建的 1000-source corpus：250 个 filler code、250 个 filler Markdown、250 个 filler contract text、243 个 filler meeting Markdown，加上 paper、code、contract、meeting 四个命中样本、一个真实 zip OOXML presentation、一个安全 PDF fixture + extraction metadata、一个真实 zip OOXML document + extraction metadata。source manifest 对每个原件记录相对路径、source digest、projection digest（如有）、size、mtime、extractor 与可见 Wiki path；SQLite FTS 和 1000 个可见 Markdown pages 全部位于同一 `Location` 的 `.omnimind` projection，不复制原件。

真实命令 `node --test ./probe-e-native.test.mjs` 运行 15/15 tests；其中 6 条属于 knowledge。最后一次运行结果：

- 初始化 1000 sources：629.054 ms；manifest 1000 条、可见 Wiki 1000 页，projection 总计 1,002,334 bytes；
- filename 查询 1/1，0.898 ms；glob 查询 251/251，0.783 ms；四个 content query 的直接 exact scan 为 4/4，47.066 ms，真实 `rg --fixed-strings` 为 4/4，60.219 ms；七个含 PDF/Office projection 的 FTS query 为 7/7，1.025 ms；这些是本机单次 deterministic probe，不是跨平台 benchmark；
- 修改单篇后只重建 1、复用 999：17.823 ms，1,002,307 bytes；修改十篇后只重建 10、复用 990：28.571 ms，1,002,327 bytes；
- 删除原件后 manifest、FTS 与生成页同时移除；源文件在更新前改变会明确列为 stale；更新生成区时保留人工保护区；
- 删除 manifest/index 后全重建 1000 条：635.575 ms、1,002,350 bytes；FTS 命中和人工保护区仍成立；
- FTS 结果携带 source path，deterministic navigation 实际回读原件；索引被断言留在目标位置且没有 `sources/` mirror。这不等于真实 Agent/model 已经按需导航，agentic search 仍未实测；
- synonym query `maximum damages` 对只含 `LiabilityCap` 的合同，exact 与 FTS 都是 0。该真实 recall gap 只打开“评估可选 semantic projection”的门，不自动证明某个 embedding/model 会改善它，也不因 1000 files 默认启用 RAG。

**自动更新 contract probe。** 同一外部脚本生成并真实打包三个最小 tar artifacts，分别代表 bundled、curated 和任意第三方；每次以 registry metadata 中的 exact revision、artifact path 与 SHA-256 resolver 驱动 content-addressed store。另加 recovery-check failure、active-health failure 与 self-updater 三个故障版本。9/9 update tests 实际通过：

- digest mismatch 在解包前拒绝；正确 artifact 进入独立 staging，逐项运行 compatibility、headless、recovery 与 stage-health 子进程；
- owner/source/license/install script/native dependency/capability/state schema 全部进入 trust-envelope diff；任一扩张停在 `Staged`，`Pinned` 不激活，unsafe boundary 也只保持 staged；
- envelope 内版本在 safe boundary 激活；已经开始的 Attempt、browser target、MCP connection、remote process 与 external Job 五类 lease 都继续引用旧 generation，新 Attempt 才取得当前 generation；
- activation 后 health failure 将新 generation quarantine 并恢复 LKG；recovery check failure 在 staging quarantine；package self-updater 无法静默改变 immutable generation，写入被拒绝或一旦检测到 tree digest 变化即 quarantine + LKG rollback；
- 100 个 artifact ID 的 discovery schedule 都落在 24 小时到 26 小时之间，同一 ID 的 jitter 稳定且样本分散；即时手动 refresh 仍由 §22.7 定义。

这 9 tests 只证明 OmniMind 计划中的 update contract 可实现和可证伪，不证明真实 registry、签名、任意 package 安装脚本、native ABI、状态迁移或三平台激活已经通过。`pi-extmgr` 的现有 auto-update 只做 discovery/timer，不提供上述 artifact authority；因此只能 bounded transplant source normalization、discovery projection 与错误呈现，不能持有第二套 package/current 状态。

**M2/M5 provisional implementation choice。** M2 先实现 file-native vertical slice：原文件保持唯一内容权威；同位置的 manifest、FTS 与可见 Markdown Wiki 都是可删除重建的 projection，人工区用明确 ownership fence 保留。默认查询顺序是 filename/glob/`rg`/exact → FTS → 带 source path 的 deterministic navigation；真实 Agent navigation 在 M2 用同一 source ref 实跑以后才可声称 agentic。semantic index 和 WeKnora 之类外部知识服务都是普通、按需 capability，不进入 kernel、不创建知识模式；只有冻结 query set 显示 lexical recall 不足，且真实 semantic probe 在 recall、latency、storage、离线与来源回溯上净胜，才生成可删除 projection。

M5 按 §22.7 直接施工五个清楚边界：metadata resolver、content-addressed artifact store、staging inspector、generation activator、LKG/quarantine registry。产品 journal/extension state 是 current/pinned/envelope/lease 的唯一权威；package manager 或 package 自带 updater不得持有第二真相。Bundled 跟随 App 原子版本；curated 与第三方都走同一 exact-artifact pipeline，只在批准 envelope 与 safe boundary 上有不同自动化策略。

**复验门与回退。** M2 进入生产前必须在一份可公开重建但更接近真实分布的 corpus 上，使用真实 PDF/Office parser（不能只用 fixture metadata），于 macOS/Windows/Linux 和一个 remote-in-place target 复跑初始化、1/10-file incremental、delete/stale/rebuild、人工页保护、source trace 与 query-set metrics；必须再用真实 Agent/model分别跑 deterministic navigation 与 semantic projection。semantic 只有在预注册失败 query 上改善 recall，且 latency/storage/离线/来源可核成本可接受时才进入 curated optional；否则删除 semantic projection，回退 filename/`rg`/FTS。

M5 进入 production adoption 前必须用 bundled、curated、任意第三方三个正式 exact artifacts，核 registry provenance/digest、install-script/native dependency/permission/state-schema diff、无 UI headless check、真实状态迁移、App crash during staging/activation、五类活跃 lease、三平台 rollback 与 restart LKG；self-updater 必须在实际安装路径被禁用或拒绝。任何失败都回退旧 LKG 并 pin 当前 generation；无法复核 lineage 的 artifact 不进入 staging。Probe E 已消除 M2/M5 的默认重型 RAG、整套外部服务和 mutable package-manager 分叉；Probe A 的真实 ecosystem package matrix 随后在 §22.11 收口并使 M1 成为 `candidate`。这不表示 M5 或 production adoption 已通过。
