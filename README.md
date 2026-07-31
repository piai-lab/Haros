# 独立 OmniMind：创立宪法

> 状态：新产品的唯一产品与架构真相源
>
> 仓库状态：本仓库就是文中定义的独立新产品仓库；创立文档已经迁入，生产实现尚未开始
>
> 适用对象：未来创建独立 OmniMind 仓库、选择移植物、搭建第一版内核与工作台的执行者
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
- 尚未完成的是来源核实、三个可丢弃探针、生产技术骨架和任何功能移植。

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
10. 产品最终服务所有能从通用 Agent 获益的人，科研用户优先，尤其重视生物医学科研；“科研优先”不得演变成在通用内核中硬编码生物医学对象。

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

**OmniMind 是一个本地优先、可连接远程计算环境、以可持续工作状态为中心的通用 Agent 工作台；它首先把科研和复杂工程工作做深，但不把任何模型供应商、科学领域或知识库后端变成产品本体。**

这句话包含六个不能拆开的判断：

- **本地优先**：界面、用户状态、凭据、信任决策和主要模型接入默认留在用户电脑；
- **远程可达**：文件、终端、进程和调度任务可以在 SSH/HPC 环境执行，且是第一阶段能力，不是以后再补的插件；
- **工作状态中心**：产品保存一项工作为什么走到这里、执行过什么、哪些副作用仍未知，而不只是聊天消息；
- **通用 Agent**：编码、科研、写作、数据分析和其他复杂工作共享同一内核；
- **科研优先**：用科研任务决定可靠性、远程计算、知识工作和可复现输出的优先级；
- **能力开放**：OmniData、OmniEngine、OmniScholar 等以标准工具能力进入，不塑造 OmniMind 的内部本体。

OmniMind 不是：

- 新的模型供应商或 API 网关；
- Claude Code、Codex、Cursor 或 Pi 的换皮；
- 一个聊天壳；
- 一个内置全套 RAG/知识库/生物医学平台的巨型套件；
- 一个把所有能力都插件化、自己不承担产品体验的空壳；
- 一个为了展示“多 Agent”而堆叠编排术语的框架；
- OmniHarness 的新实现。新产品中不创建 `OmniHarness` 模块、接口、兼容别名、占位符或未来扩展点。

## 4. 产品不变量

### 3.1 模型和执行引擎可更换

模型供应商是来源，不是身份。OpenAI、Anthropic、国产模型、兼容端点、Ollama、LM Studio 和未来来源应处于同一层级。

Pi 是当前最有希望的 Agent 引擎和生态入口，但也只是引擎。产品的持久状态、远程位置、信任决策、外部任务和文件所有权不能被 Pi 的暂时数据结构吞掉。

### 3.2 用户的文件仍是用户的文件

本地文件以本地文件系统为权威；远程文件以远程文件系统为权威。OmniMind 不偷偷复制一套“真正版本”，不透明全量同步，也不让数据库成为用户文档的唯一出口。

### 3.3 一件事实只有一个权威

- 对话消息在第一阶段由固定版本的 Pi session 格式拥有；
- 产品 journal 记录接纳、策略、动作、副作用、检查点、外部任务、恢复和分支；
- 远程文件由远程主机拥有；
- Slurm 等调度任务由调度器拥有；
- LLM Wiki 的可读 Markdown 是 Wiki 内容本体，可重建索引不是本体；
- 原始资料永远是资料事实源，生成 Wiki 只是可审查的综合物。

不得为了方便 UI 或“统一存储”再复制一套平行真相。

### 3.4 失败必须能被准确命名

“没有收到完成消息”不等于“没有执行”。副作用状态至少要能区分：

`proposed → policy_decided → started → settled | outcome_unknown`

SSH 断开不等于远程进程失败，界面关闭不等于 Slurm 任务终止，模型流中断不等于已启动的工具没有产生副作用。恢复逻辑不能用乐观猜测填补事实空洞。

### 3.5 扩展能力不得污染核心

Omni 系列科学能力、MCP、Skills、函数工具、外部服务和未来生态都通过统一的能力描述与调用路径进入。核心不因工具叫 OmniScholar 就出现 Scholar 专用类型，也不因工具能做生物信息学就出现生物医学分支。

但“统一调用机制”不意味着产品的一切都外置。定义工作台体验、文件与执行位置、恢复、Wiki 生命周期、远程连接和信任的能力可以原生存在。

## 5. 产品原生能力与外部能力的边界

### 4.1 必须原生

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

“原生”指产品对行为和用户体验负责，不要求所有实现都从零自写。原生能力完全可以由移植的优秀代码组成。

### 4.2 应作为外部能力进入

以下能力默认是工具、函数、MCP、Skill 或受控外部连接：

- OmniData；
- OmniEngine；
- OmniScholar——在这里把它理解为知识能力，不赋予它特殊本体地位；
- OmniSage 或其他科学问题形成能力；
- 文献解析、数据库查询、组学分析、统计方法和领域工作流；
- 用户现有的 WeKnora；
- 其他机构数据、软件、实验和知识服务。

这些能力共享同一套能力协议：描述输入输出、进度、取消、错误、输出引用和信任需求。第一版不为每类能力创建专用插件框架。

### 4.3 暂不建立原生 UI 插件 ABI

第一版扩展返回统一的进度、日志、结构化结果和 `OutputRef`，并可在工作区写入普通文件。只有至少两个真实扩展无法用公共呈现方式表达时，才设计自定义 UI 插槽。

现在提前定义复杂 UI 插件 ABI，会把尚未理解的产品形态冻结成长期兼容负担。

## 6. 极小而耐久的领域内核

丰富的产品不需要丰富的持久领域本体。第一版只承认两个聚合根。

### 5.1 `Thread`

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

### 5.2 `ExecutionTarget`

`ExecutionTarget` 表示文件和执行实际发生的环境：

- local；
- SSH 主机；
- 经跳板机到达的远程环境；
- 未来经证据证明需要的其他执行环境。

`LocationRef = executionTargetId + absolutePath`

这一个引用应统一表达本地目录、远程目录、附加位置和 Wiki 所在位置。不要再造一个含混的 Workspace 数据库对象去复制文件系统事实。

### 5.3 明确拒绝的核心聚合

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

### 5.4 Journal 的职责

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

### 6.1 默认技术形态

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

### 6.2 何时拆出 Pi 进程

只有出现可测证据时，才把 Pi 移到 Electron utility process 或独立本地服务，例如：

- Agent 崩溃显著拖垮桌面；
- 主进程长任务阻塞无法通过 worker/异步边界解决；
- 需要独立热升级；
- 多窗口/多客户端确实共享一个长寿命 Agent；
- 安全边界需要操作系统级隔离。

不能用“架构看起来更专业”作为多进程理由。

### 6.3 进程和状态原则

- renderer 不拥有业务真相；
- main 不创建第二份 Pi transcript；
- 所有跨边界命令有 request/correlation ID；
- 大输出写入文件或对象存储，由 `OutputRef` 引用；
- IPC 传输增量、摘要和引用，不搬运巨型全文；
- 后台 Thread 只推送摘要状态，激活 Thread 才接收细粒度流；
- 恢复先根据 journal 重建产品状态，再重新观察外部权威。

## 8. Pi 的角色

### 7.1 当前裁决

Pi 是新内核的首选 Agent 引擎和生态入口。第一版应围绕成熟、可用的 `pi-coding-agent` session SDK 做一个很薄的 `PiAdapter`，而不是复刻旧 OmniMind Agent loop。

可以：

- 直接依赖 Pi 包；
- fork Pi；
- 移植 Pi 局部源码；
- 给 Pi 上游贡献必要接口；
- 用 Pi extensions、skills、tools 和已有生态；
- 在固定 SHA 上做针对性修改。

不需要为了“独立感”重新实现 Pi 已经做得好的部分。

### 7.2 不能交给 Pi 的事情

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

### 7.3 集成纪律

- 第一轮只做可丢弃集成探针；
- 固定 Pi repo、SHA、包版本和许可证；
- 证明 session 创建、流式事件、工具注册、取消、恢复和 branch；
- 证明如何关联 `ThreadId/TurnId/AttemptId/ActionId`；
- 证明不复制 transcript；
- 证明 Pi 单 cwd 限制如何通过 LocationRef/ExecutionTarget 在产品层表达；
- 不在探针通过以前大规模搬旧 UI 或旧 runtime；
- 不为了兼容多个引擎提前造抽象森林。第二个真实引擎出现后，再从差异中提炼接口。

## 9. 本地与远程执行

远程服务器不是附属功能。对生物信息学和许多科研任务，它与本地文件一样基础。

### 8.1 默认拓扑

默认形态是：

- OmniMind UI、用户凭据、模型接入和主要 Agent loop 在本地电脑；
- 项目文件、终端命令、分析进程和调度任务可以位于远程；
- 本地通过系统 OpenSSH 建立连接；
- 远程部署极小、可校验、可升级的 worker；
- 一个 SSH 连接上复用文件、PTY、进程、端口、输出、传输和调度消息；
- 模型请求默认仍从本地发出。

这与“把完整 OmniMind server 安装到远端”是两种不同架构。后者不是默认。

### 8.2 OpenSSH 与凭据

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

### 8.3 远程 worker 的最小职责

第一版 worker 只承担结构化远程原语：

- 文件 stat/read/write/list/search/watch；
- PTY 与非交互进程；
- 取消、信号和退出状态；
- 二进制流传输；
- 端口转发信息；
- 大输出落盘与引用；
- Slurm submit/query/cancel/log/reconcile；
- worker 版本和能力协商。

它不承担：

- 模型供应商配置；
- OmniMind 用户设置；
- 完整插件商店；
- 本地 Thread 数据库；
- 完整 Pi runtime；
- UI；
- 用户全部扩展的自动镜像。

### 8.4 Slurm 是第一个具体调度器

不要先建 `SchedulerFramework`。先把 Slurm 做对：

- 登录节点与计算节点分离；
- 提交产生远程 manifest 和本地 `ExternalExecutionRef`；
- SSH 断开、电脑休眠、应用退出后任务仍独立生存；
- 重连后通过 `sacct` / `squeue` 等权威来源对账；
- stdout/stderr 和产物可增量查看；
- cancel 是显式外部副作用；
- 状态不确定时显示 `outcome_unknown`，不伪造失败或成功；
- Thread attempt 结束不自动杀死已提交任务，除非用户明确选择并获得相应授权。

第二个真实调度器出现以后，再提炼公共接口。

### 8.5 文件权威与同步

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

## 10. 文件原生 LLM Wiki

### 9.1 产品判断

OmniMind 不默认把个人资料库送进传统 chunk-embedding-vector RAG。对几十到约一千篇文献、笔记、网页、数据说明和项目资料，优先采用文件原生的 LLM Wiki + agentic search。

这不是宣称 RAG 永远无效。超大规模知识库、机构检索和已有专业系统可以通过外部能力提供。OmniMind 自己不因为那些场景背负一个重型知识库后端。

### 9.2 信息所有权

- 原始来源文件不可被 Wiki 修改；
- source manifest 记录来源位置、哈希、版本和摄取时间；
- 生成的 Wiki 是用户可见、可编辑、可版本化的 Markdown；
- `index.md` 是入口目录；
- `log.md` 记录重要摄取、刷新、修复和来源变化；
- 搜索索引、缓存和 FTS 数据可删除重建；
- 来源变更使依赖页面变成 stale，而不是静默覆盖；
- 生成内容是综合与导航，不替代原始证据；
- Wiki 中的结论必须能回到来源引用或明确标为未核实综合。

### 9.3 原生但模块化

Wiki 是 OmniMind 的原生产品能力，因为用户需要统一的初始化、摄取、查询、保存、刷新、lint、diff 和恢复体验。

它不需要成为领域聚合或独立知识平台。实现可由普通文件、manifest、Git/检查点、FTS 和一组确定性 helper 组成。

概念操作：

- `init`
- `ingest`
- `query`
- `save`
- `refresh`
- `lint`

这些不一定成为公开 CLI 命令，但行为边界应清楚。

### 9.4 Agent 与确定性 helper 的分工

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

### 9.5 编辑与后台行为

在受信工作区，Agent 可以一次修改多个 Wiki 页面，不逐文件弹确认；所有变化都通过普通 diff、journal 和回滚可见。

第一版不默认静默夜间重写。定时 refresh/lint 必须由用户显式开启，并有范围、预算和失败可见性。

### 9.6 搜索演进

初始使用：

- `index.md` 和目录结构；
- grep/ripgrep；
- 文件名、标题、链接与引用；
- SQLite FTS 或同等级本地全文索引。

Embeddings、QMD、reranker 或混合检索是按真实召回失败加入的可选投影，不设武断的“超过 N 篇就切 RAG”阈值。

## 11. 权限与信任

### 10.1 基本立场

受信工作区中的 Agent 默认拥有完成工作所需的完整文件和命令权限。产品不把每一个 `git diff`、测试或普通编辑变成确认仪式。

但“我信任 Agent”不等于“我信任任何第三方代码”，也不等于“任何不可逆外部动作都无需边界”。

### 10.2 三种不同信任

1. **工作区信任**

   该目录中的代码、指令和工具是否允许执行。未受信工作区只能被查看，不运行其代码或自动加载其扩展。

2. **扩展信任**

   Pi extension、plugin、Skill、MCP server 或移植代码以什么权限运行。若原生扩展与主进程同权限，产品必须直接说明“它以你的用户权限执行”，不能用“沙箱”字样制造错觉。

3. **外部不可逆授权**

   发布、凭据轮换、高费用计算、删除远程持久数据、取消关键调度任务、改生产权限等动作需要独立授权和清楚影响范围。

第一版不为了形式完整实现巨大跨平台 sandbox 矩阵。先保证信任语义真实、默认简单、危险外部后果可控。

## 12. 工作台与交互

### 11.1 不是聊天应用

界面应围绕“正在做的工作”组织，而不是围绕消息气泡组织。稳定骨架包括：

- 导航与位置；
- 当前 Thread 和 Agent 过程；
- 文件、预览、终端、diff、输出和远程任务；
- 后台 Thread 的运行、阻塞和未读状态；
- 能力与信任的渐进披露。

### 11.2 Proma 的地位

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

### 11.3 必须保留的交互能力

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

## 13. 移植原则

### 12.1 搬运是一等工程手段

允许并鼓励：

- 直接复制完整目录或子系统；
- 保留上游 Git 历史后 fork；
- subtree/submodule/包依赖；
- 抽取组件；
- 机械迁移后大幅删改；
- 参考机制后重写；
- 把多个来源的最好部分组合。

不设置“目录级搬运禁止”“只能参考不能复制”“必须 clean-room 重写”一类形式主义约束。

### 12.2 每块移植物的四个判断

1. **目标适配**：它是否直接服务本宪法定义的产品；
2. **解耦成本**：切掉宿主概念后是否仍比重写更划算；
3. **长期所有权**：团队能否理解、测试、升级和删除它；
4. **来源与权利**：许可证、额外授权、第三方贡献和 notice 是否清楚。

一块代码可以很大，只要四项都成立。一个函数也可以被拒绝，只要它把错误概念带进核心。

### 12.3 真正禁止的事情

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

## 16. 科研优先但核心通用

科研优先体现在任务选择和验收上：

- 千篇级文献和项目资料可形成可检查 Wiki；
- 本地 Agent 能在远程服务器工作；
- Slurm 任务能跨断线恢复；
- 分析输出有来源、有文件、有日志、可重复；
- 科学工具通过能力接口进入；
- 人可以在关键判断点接管、修改和否定；
- 最终输出可被复查，而不是只有一段回答。

它不体现在：

- 给 Thread 增加 `Hypothesis` 字段；
- 在核心数据库建立 `Evidence`、`Paper`、`Cohort`、`Gene`；
- 让 OmniScholar 成为所有知识的唯一入口；
- 把生物医学流程硬编码成通用 Agent loop；
- 用 Omni 前缀为每个模块命名。

临床研究可以使用同一通用工作台；患者级诊断、治疗建议和自主临床动作若未来进入产品，必须作为独立治理表面处理，不能借“科研 Agent”默认获得授权。

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

第一阶段不是“功能与旧产品相同”，而是三个可丢弃探针和一个极薄 walking skeleton 给出可信答案：

### 探针 A：Pi 集成

- 创建并恢复 Pi session；
- 本地文件/终端工具可用；
- stream、cancel、branch 和 tool lifecycle 可映射；
- transcript 不重复存储；
- Thread/Turn/Attempt/Action 关联清楚；
- Proma 候选工作台能消费这一事件流。

### 探针 B：远程与 Slurm

- 使用真实 OpenSSH 配置连接测试主机；
- 远程文件与 PTY 可操作；
- 提交一个 Slurm 任务；
- 关闭 OmniMind/断开 SSH 后任务继续；
- 重开后准确对账并查看日志；
- 未知副作用不被误报。

### 探针 C：持久内核与 Wiki

- Thread 接纳先于引擎执行落盘；
- 崩溃后能恢复到准确状态；
- 文件改动能 checkpoint/branch/rollback；
- 一组真实资料生成可见 Markdown Wiki；
- 来源改变触发 stale；
- FTS/索引可删后重建；
- 远程位置也能原地执行同一流程。

探针代码可删除。探针的目的不是成为第一版生产架构，而是让真正昂贵的决定在大规模移植前有证据。

## 19. 决策准则

后续遇到分叉时，按以下顺序判断：

1. 哪个选择更忠实于一句话产品定义？
2. 哪个选择让事实所有权更单一？
3. 哪个选择删除更多错误概念和边界？
4. 哪个选择更容易在本地与远程同时成立？
5. 哪个选择让科研任务更可靠，同时不污染通用核心？
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
- 先做三个可丢弃探针；
- 用探针决定 Pi、Proma、远程和 Wiki 的真实移植边界；
- 每一次只引入一块有明确所有权的能力；
- 搬来后立即删除宿主概念和重复真相；
- 没有旧用户，就不要花未来维护成本保护过去；
- 不要把“简洁”误解为牺牲远程、恢复、知识工作和科研质量；
- 不要把“生态”误解为把所有扩展预装进核心；
- 不要把“授权充分”误解为可以省略来源和质量判断；
- 不要重新发明一个披着中性名词的 Claude Code。

新 OmniMind 的优势不应来自功能列表更长，而应来自：内核小、工作台强、远程真实、知识可积累、能力开放、失败诚实、移植果断。

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
Why better than the smallest rewrite:
Host concepts removed:
Stable owner/boundary:
Truth source affected:
Performance evidence:
Failure/recovery evidence:
Tests/fixtures adopted:
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
