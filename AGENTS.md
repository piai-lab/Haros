# OmniMind — Founding Agent Contract

本仓库是独立新产品，不是旧产品的重构分支。

## 必读顺序

开始任何设计、代码或移植以前，完整读取：

1. `README.md`
2. `execution-brief.md`
3. `discovery-record.md`
4. `missions/independent-omnimind-v1.md` when its status is active

`README.md` 是唯一产品与架构真相。其余文件分别只提供施工顺序、纠偏背景与 Campaign 完成状态。

## 当前状态

- 仓库已有创立文档、active Campaign spec、M0 地基、M1 `candidate` 路线证据和一条可删除的 M2 focused skeleton；
- `source-adoptions` 仍为 0，F-24 等未验证 production claims 仍为 `open`；
- 不存在需要兼容的用户、状态或 API；
- Campaign 状态只写入 `missions/independent-omnimind-v1.md`，不得创建平行 ledger、handoff 或进度报告；
- `E0` 生态七类源码审判已经完成；结论必须从根 README 与现有附件读取，不能依赖历史对话；
- M1 五个可丢弃探针已经是 `candidate`；不得重新准备或运行同一轮研究，也不得把 `candidate` 写成生产兼容、跨平台或产品验收已通过；
- 用户已否决 M2 `quiet-inline` / `balanced-tabs` UI 方向，并批准根 README §12.2 定义的 UI 母体；旧 skeleton 不得因 sunk cost 成为新边界的隐性前提；
- UI 母体、`Agent | Chat` 一级信息架构、Conversation-owned timeline、Run snapshot、ACP-first、多真实 Agent Engine、默认原生引擎、权限真实性、Models/Agents 设置边界和四层运行投影已经收敛；不得再退回单引擎私有 adapter、Engine-owned 产品 transcript 或旧 M2 UI；
- 下一唯一入口是根 README 与 `execution-brief.md` 定义的 M2 接管 slice：固定完整源码树导入并保持可运行，先建立中英双语地基、`Agent | Chat` 真实导航、Conversation/Run 权威、ACP ingress 和强类型运行投影，再按裁决换脑、重命名、删除和重构；
- 不手工挑拣组件以致遗失隐性行为，也不因为物理上搬入就默认保留 donor 的 Agent loop、状态权威、Provider ontology 或弱类型 Activity payload。

## 身份、结构与冰山

- 外部产品、供应商、前代产品、模型、作者和 donor 身份只允许进入根 `README.md` 的来源/致谢/固定 revision/权利披露、`LICENSES/` 法定原文，以及用户主动进入的真实 Engine/Package 选择、来源、诊断和权限真相边界；动态显示名必须来自外部数据。
- 生产源码、路径、目录、文件名、package、类型、事件、schema、持久字段、IPC、注释、测试、fixture、snapshot、日志、错误、UI 文案、普通说明和可控生成物保持零无关身份；研究代号不得进入生产 namespace。
- 大规模搬入前先扩展 identity/structure checker。完整固定源码树可以在唯一 Campaign branch/worktree 上形成一个 exact provenance baseline commit，用于证明 unchanged build/run 并保住隐性行为；它必须同时记录来源、权利、法定文本和致谢，但不得进入 main/production candidate。随后立即在同一条链完成稳定职责重命名、结构净化和状态换脑；最终 adoption candidate 必须给出 source、path/name、generated-output 与 structure scan 证据。baseline 例外不得承载新产品代码或演变成 donor archive。
- 文件树必须少、浅、单责；名称必须短、精确、耐久。禁止 donor 路径镜像、品牌缩写、研究题目、一次 Goal/波次/编号、`legacy`、`misc`、`common`、`utils`、`manager`、`helper`、`adapter2`、`new-ui`、`temp-migration` 等进入生产树。自动规则以根 README 的机器策略为下限。
- 坏命名直接重命名并删除旧名；除非已证明存在外部公共兼容义务，不留 alias、wrapper、deprecated 双轨或迁移考古。
- 洁净不能洗白来源：实际采用时在同一提交更新根 README 披露与 `LICENSES/`，受控 fork 保留上游历史和作者权利。
- 冰山法则是实现门：日常表面克制、精确、丝滑；每个可见状态、进度、权限、恢复和动效都必须由水下唯一权威、writer admission、回执、失败语义、性能和跨平台证据支撑。不得用字符串猜测、假进度或漂亮模拟代替真实能力，也不得把内部复杂度倾倒给用户。
- 用户已经明确触发、且结果能从界面立即看见的动作，界面状态变化本身就是反馈；不得再用 Toast、系统消息、Timeline 记录或“已切换至……”等文案复述用户刚做过的事。只有失败、异步等待、不可逆后果、隐含副作用或结果无法自然看出时才额外提示；必要的来源与审计事实沉入可检查的详情层。

## 工程判断

- 激进删除错误概念，不保护旧功能和旧投入；
- 创立者已授权修改、删除、重构全部代码、测试、文档、目录、状态 schema 和产品功能；当前没有用户与兼容义务，任何 sunk cost 都不是保留理由。激进意味着精确斩断错误本体并保持里程碑可运行、可回退、可证伪，不意味着无目标破坏；
- 允许 package、fork、整目录移植、显著改造或重写；
- README、包页面、作者宣传、截图、stars 和下载量只能发现候选，不能证明能力；重要结论必须落到固定 revision 的实际源码、依赖、失败路径和测试；
- 受治理 fork 是一等工程路径：主体优秀、必要差异可界定且长期维护成本低于重写时可以果断接管；错误本体不得靠无限分叉掩盖；
- 上游自动化只负责发现变化、生成候选差异和运行检查，不得把未经审阅的上游更新自动合入产品；生产使用固定 revision；
- fork 必须保留诚实来源、历史和法定文本；OmniMind 作者区仍按中性领域职责命名，不让 donor 身份进入产品本体；
- fork、package、transplant、adapt 与 mechanism-only rewrite 的完整裁决门以 `README.md`“移植原则”为唯一真相；
- 搬入前核实来源和权利，搬入后切除宿主概念；
- 一件事实只有一个权威；
- 第一位普通能力消费者使用具体实现，第二位出现后再提炼抽象；Agent 接入是已经确认的多消费者边界，直接采用 ACP，不再自造平行通用协议；
- 极小领域内核不等于弱工作台；
- OmniMind 是 general agent；领域只提供压力测试，不创建科研、编码或其他专用模式、本体和运行时；
- Remote 约占少数但重要的工作场景：它是通用执行目标，不是永久产品模式，也不能支配默认 UI；
- 恢复、文件原生知识、异构高强度任务和耐久外部执行属于早期验收；
- 数据、知识、分析和其他领域能力使用同一 capability 入口，不进入通用核心；
- 产品原生指产品对体验负责，不等于全部硬编码进 kernel：稳定原语原生，策略和适配器优先作为随产品发布、按需激活的 first-party modules；
- `E0` 扩展生态是首发一级兼容目标；兼容桥不得继承其宿主身份、TUI、本体或第二状态真相；
- 默认前端不以首选引擎组织用户心智：日常表面只出现 Agent、Chat、Tool、Skill、Package、Team、Workflow 等中性产品概念；真实引擎名称仅在用户选择/安装、来源、兼容诊断、权限边界和法定披露中按需出现；
- ACP 是 Agent 第一接入标准但不是 React 数据模型：原始协议证据先进入强类型产品事实，再形成增量读投影和 UI view model；禁止 generic `payload: unknown` 成为永久状态总线；
- 一级入口固定为 `Agent | Chat`，Agent 在左、Chat 在右；导航、默认入口、键盘顺序、可访问名称和测试不得交换。二者共用 Composer、Engine、Model、Reasoning、Timeline、Activity 与队列，稳定区别只在主要工作文件夹和执行权威：Chat 无 Primary Folder，Agent 有 Folder 或独立 OMStudio 目录；
- Conversation 是产品拥有的长期用户对象和规范可见 timeline；一次 Run 冻结 Engine、Model、Reasoning、Permission、ExecutionTarget、资源引用与 workspace revision。Engine Session 只是可抛弃、可重建的执行 lineage/cache，不是 Conversation 身份或产品真相；
- 同一 Conversation 可在 Run 边界直接切换 Engine/Model；用户主动切换不创建 Conversation、不弹确认、不生成 handoff、不写 Timeline 或 Toast。当前 Run 不热换，Composer 选择只影响 next Run；跨 Engine 产生分叉后返回旧 Engine 必须从当前 Conversation/Workspace 事实重建 Session，不恢复陈旧 lineage；
- 每个 Agent Conversation 只有一个顶层前台 Run；运行中普通发送进入可编辑、可删除、可排序且自带冻结选择快照的队列。真正并行通过 child、Team、Workflow、新 Conversation 或隔离位置，读取可 fan-out，共享写入与最终集成只有一个 owner；
- 默认原生引擎调度的其他 Agent 是有 parent/origin/depth/cost 的 child Run/Conversation 投影，未经显式提升不成为并列顶层 Conversation；
- 权限界面统一为 Approval required / Auto / Full access，但必须另外记录 `host-enforced` / `agent-enforced` / `mixed` / `unverified`，未经证明不得把 ACP permission 宣称成宿主强制；
- 中英双语是首发可用性契约，不是机械汉化率：稳定产品文案集中管理，中文与英文关键路径同等可理解；`Thinking`、`Planning`、Git、Diff、PR、Token、ACP、路径、代码和 Agent 原始过程等保留英文更准确时不强译，中文界面允许克制混排；
- 按冰山法则审判 UI：可见界面必须简洁丝滑，但每个状态、进度、权限、恢复和动效都要有水下真实状态、回执、性能和失败语义支撑；不把复杂度泄漏给用户，也不以漂亮模拟掩盖未实现能力；
- Todo 是当前执行计划投影；Delegated Agent 是 child Conversation/Run；Team 只增加成员和消息；Dynamic Workflow 由 Agent 实时生成和改写，拒绝默认固定 DAG/YAML；
- Settings › Models 管理 Chat 与内置 OmniMind Agent 使用的 ModelConnection；Settings › Agents 管理外部 Agent 的发现、官方认证、版本、能力和权限真实性。外部 Agent 凭据仍归其自身，任何不可用选择都不得静默 fallback；
- Chat 的文件/文件夹引用保持可证明的只读边界；新 Chat 不创建目录，Engine 首次真正需要 cwd 时才按需建立不可见、可回收的内部 scratch。无法证明隔离的 Engine 不得获得用户原始可写路径；需要修改用户文件时显式 Send to Agent；
- 扩展自动更新使用 exact artifact、staging、trust envelope、safe-boundary activation、generation lease 与 LKG rollback；活跃 Attempt 或外部任务中不得热替换；
- 不建立兼容双轨、重型默认知识库或虚假安全边界。

## Git

- `main` 是当前唯一分支；
- 一个提交一个关注点；
- 不引入来源不明的文件；
- 每次生产移植都在同一提交更新根 README 的来源披露和必要法定文本；
- 不添加 AI attribution 或生成声明；
- 发布、远端创建、旧仓改名和许可证选择由维护者明确决定。
