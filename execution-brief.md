# 独立 OmniMind：施工任务书

> 本文给没有前序会话上下文的执行者使用。
>
> 产品与架构真相只在 [README](README.md)。本文只规定施工顺序、证据和停止条件。
>
> 外部来源一律使用 README 定义的研究代号；不得把这些代号带进生产代码。
>
> 当前执行状态：独立仓库已经创建，阶段 0 的固定源码审判与阶段 1 的身份/质量地基已经完成。阶段 0–1 以下保留为历史门槛，不得再次创建仓库、重做初始化或把旧产品搬进来。下一执行入口是阶段 2 的五个可丢弃探针。

## 1. 任务的正确理解

目标不是：

- 清理当前仓库；
- 把当前仓库逐模块迁入新目录；
- 先复制全部功能，再逐步中性化；
- 让旧测试全部在新架构上通过；
- 造一个兼容旧产品的新壳；
- 用改名掩盖来源。

目标是：

1. 在这个已经创建并通过初始质量门的独立 Git 仓库中继续建设；
2. 先证明五个高风险边界，再确定生产结构；
3. 从多个来源果断移植最好的实现；
4. 在进入生产作者区以前切掉所有来源身份和宿主概念；
5. 建立极小领域内核、强工作台、真实远程执行和文件原生 Wiki；
6. 用多种差异很大的高强度 workload 检验同一个 general Agent，不为任何领域建立专用模式或内核。

创立研究发生时的旧产品仓库继续独立存在。本仓库不与其维护双向同步、兼容 adapter、旧状态迁移或功能对齐。

## 2. 开工前必须完整读取

按顺序：

1. [常驻执行约束](AGENTS.md)；
2. [README](README.md)全文，包括来源披露；
3. 本文件；
4. [决策与纠偏记录](discovery-record.md)；
5. [Campaign 状态源](missions/independent-omnimind-v1.md)；
6. README 披露的目标来源中，与当前探针直接相关的最小路径；
7. 旧产品仓库中仅与 Remote、安全或测试 oracle 相关的精确入口。

不要扫描旧产品仓库所有历史文档来“补全背景”。旧产品的概念密度会把新产品重新拖回原路径。

## 3. 不可协商的施工纪律

### 3.1 独立仓库身份洁净

产品作者区中，外部产品、供应商、前代产品和模型家族名称只允许出现在根 README 的来源披露。法定原文只允许出现在 `LICENSES/`。

检查范围至少包括：

- source paths；
- source text；
- comments；
- tests、fixtures、snapshots；
- configs；
- package names；
- generated code；
- UI copy；
- schemas、events、database columns；
- errors、logs、telemetry；
- Markdown 和其他说明文件；
- build artifacts 中可由作者代码控制的内容。

本仓库的第一条可执行质量门是通用 identity cleanliness checker。checker 从根 README 的机器可读披露块加载禁用身份，不在自身源码中复制名单。

允许的动态事实：

- 用户配置的 provider/model 显示名；
- 上游在运行时返回的真实名称；
- 用户自己的文件内容。

这些名称必须以外部数据流经系统，不能成为静态常量、类型分支或默认 UI 身份。

### 3.2 探针与生产隔离

需要直接引用外部 package 名、旧路径或 donor 类型的探针，放在本仓库之外的临时研究目录。本仓库只接收：

- 经选择的中性实现；
- 中性 contract tests；
- README 来源披露；
- 法定许可证原文。

探针不是生产祖先。失败探针在结论冻结后删除。

### 3.3 一个事实一个权威

每次设计持久字段前回答：

- 这件事实本来属于谁？
- 是否已有外部权威？
- 本地需要保存事实、引用，还是仅保存缓存投影？
- 崩溃后如何重新观察？
- 两份事实冲突时谁赢？

答不出来，不得新增持久对象。

### 3.4 一个真实消费者以前不造框架

- 第一个 Agent 引擎：具体 adapter；
- 第一个调度器：具体 adapter；
- 第一个外部知识连接：具体 capability；
- 第一个 UI 特殊输出：用公共输出；
- 第二个真实消费者出现以后才从差异中提炼接口。

不要把“未来可扩展”误写成十层抽象。可扩展性来自小边界和可删除适配层。

## 4. 中性来源代号

README 的来源披露定义：

- `E0`：首选 Agent 引擎来源；
- `E1`：动态工作流与引擎生态来源；
- `U0`：工作台来源；
- `L0`：旧产品来源；
- `K0`：成熟知识系统来源；
- `K1`：文件原生 Wiki 原始模式；
- `K2`–`K4`：三个不同重量的 Wiki 实现；
- `A0`：中立 Agent 产品比较来源；
- `R0`：远程工程样本池。

这些代号只属于研究文档。生产中使用领域职责：

- `AgentEngine`
- `Thread`
- `ExecutionTarget`
- `LocationRef`
- `Capability`
- `RemoteWorker`
- `ExternalExecutionRef`
- `WikiManifest`

不得创建 `E0Adapter`、`U0Shell`、`K0Connector` 等生产名称。

## 5. 阶段 0：冻结研究输入（已完成，保留为历史门）

### 5.1 建立一次性研究清单

在本仓库外创建临时研究目录，记录：

- 每个候选来源 URL、revision、许可证；
- 实际准备读取的路径；
- 额外授权证据的位置；
- 第三方贡献核查结果；
- 探针入口与删除日期；
- 对应 README 来源代号。

完整候选清单、下载量和临时笔记不进入产品仓库。跨类别架构结论、被采用为探针入口的固定源码证据和重新验证条件可以进入根 README；真正进入生产代码的来源仍只有 `source-adoptions` 机器块拥有采用事实。

### 5.2 固定真实样本

准备最小但有杀伤力的样本：

- 一个普通本地代码目录；
- 一个有大输出、长 Thread 和取消行为的任务；
- 一个需要交互式认证或跳板的测试远程；
- 一个可提交批处理任务的测试环境；
- 一个包含 Markdown、代码、PDF、Office、表格、图片和约千份混合资料的 corpus；
- 一个会在处理期间修改、删除和新增来源的增量场景；
- 一组旧产品中已经证明重要的安全/恢复 fixtures。

不得用只会成功的 toy demo 决定架构。

### 5.3 阶段 0 退出条件

- 所有候选 revision 固定；
- 权利路径可描述；
- 样本可重复；
- 五个探针的可观察结论明确；
- 还没有在本仓库写生产架构。

## 6. 阶段 1：创建洁净仓库（已完成，禁止重做）

### 6.1 第一提交

第一提交只建立：

- 根 `README.md`；
- `LICENSES/`；
- 最小 package/workspace 配置；
- identity cleanliness checker；
- formatter、typecheck 和最小 test runner；
- 空的职责目录；
- 一条能在干净 checkout 运行的质量命令。

根 README 包含：

- 一句话产品定义；
- 产品不变量；
- 唯一来源披露；
- 机器可读禁用身份块；
- 当前真实采用来源；
- 法定文本索引。

不要把当前研究 README 原样复制。它包含未采用候选和研究语境。根据真实第一提交裁剪。

### 6.2 推荐目录骨架

这是可删改起点，不是永久模块清单：

```text
apps/
  desktop/
packages/
  domain/
  journal/
  engine/
  workbench/
  remote/
  wiki/
  capabilities/
  shared/
scripts/
LICENSES/
README.md
```

纪律：

- `domain` 只放两个聚合根与精确 ref/value types；
- `journal` 不放 UI 状态；
- `engine` 不拥有 Thread；
- `remote` 不拥有模型配置；
- `wiki` 不拥有原始资料；
- `capabilities` 不为领域工具建专用本体；
- `shared` 不能变成垃圾桶。

若一个目录尚无真实代码，不要只为“架构完整”创建空 index 和 interface。

### 6.3 身份检查器

检查器应：

1. 从 README 特定 fenced block 解析大小写不敏感词形；
2. 扫描 tracked 作者文件；
3. 排除 README 自身与法定原文；
4. 对 lockfile/generated vendor metadata 单独报告；
5. 检查文件名和内容；
6. 支持允许的运行时测试数据通过显式 fixture 注入，而不是硬编码；
7. CI 中阻断；
8. 输出位置和命中类别，不回显秘密。

如依赖 metadata 无法避免外部包坐标，先做 fork/vendor 评估。只有技术或法律上不能消除时，才在 README 明确列为机器元数据例外；不能悄悄放宽全局规则。

### 6.4 阶段 1 退出条件

- fresh checkout 一条命令通过；
- 除 README/法定文本外没有外部身份；
- 目录中没有旧产品代码；
- README 只披露实际已进入的来源；
- 仓库没有兼容、迁移和旧状态概念。

## 7. 阶段 2：五个可丢弃探针

五个探针可以并行研究，但每个只有一个所有者。它们在仓库外运行，不合并成生产代码。

### 7.1 探针 A：Agent 引擎

目标：证明 `E0` 能否以薄边界成为嵌入式引擎。

必须覆盖：

- 创建会话；
- 一轮流式输出；
- 文件工具；
- 终端工具；
- 自定义 capability；
- cancel；
- 崩溃/重启；
- branch；
- transcript 尾部损坏；
- provider 错误；
- 大工具输出；
- 单工作目录限制；
- 本地与远程执行环境注入；
- `E0`-compatible tool、skill、prompt、extension lifecycle 与 headless 降级；
- 一个兼容 package 与一个 fail-fast package 的真实报告；
- Todo、child Agent 和 Dynamic Workflow 的最小边界；
- tool/schema 按任务激活而不是全部常驻。

采集：

- 从用户输入到首增量的时间分解；
- provider stream 被读取次数；
- 事件数量与批量策略；
- 内存增长；
- session 文件和恢复语义；
- 为关联 Turn/Attempt/Action 所需改动；
- 需要 fork 的最小上游面。

选择门：

- package + thin adapter；
- package + 小补丁；
- fork；
- 源码移植。

选择总边界最小、事实最清楚的一条，不优先“改动最少”。

证据必须拆成三条不可混用的链：

1. **固定源码链**：从精确 revision 的洁净 archive 开始，记录依赖安装、生成输入、构建命令、失败退出码和目标测试；缺失的生成输入或联网前置属于源码复现性事实；
2. **发布 artifact 链**：固定版本、content digest、registry provenance、`gitHead`、公开入口和实际运行行为；只有 revision 可对应时，artifact 行为才能反证或支持该源码；
3. **临时本地产物链**：记录额外输入、生成方式和与固定源码/官方 artifact 的差异；它只能证明实际覆盖的源码路径，不得冒充官方发布物或正式 runtime compatibility。

本探针的最小证伪样本固定包含：一个被选工具和一个未选工具、运行时工具切换、128 KiB 工具结果、持久恢复、分支、损坏尾部、取消，以及跨工作目录 session replacement。生态样本另含普通工具、Todo、child Agent、Dynamic Workflow 和一个加载前拒绝案例；兼容报告必须说明 public/headless/UI/session-control/second-truth 依赖。

停止条件：一旦证据足以在 package + thin adapter、package + bounded patch、managed fork 与 bounded transplant 之间选择，就冻结引擎路线；不得为了把源码和发布物强行说成一致而进行无界构建考古。生态 package matrix 未实际运行以前，不能把“引擎核心路线已选”扩张成“首发生态兼容已完成”。

### 7.2 探针 B：工作台移植

必须同时做两条路径：

1. **保留完整工作台，替换宿主边界**；
2. **提取组件与设计合同，用新状态模型重建一个垂直切片**。

统一垂直切片：

- 位置/Thread 导航；
- 流式回复；
- 文件树；
- 预览；
- diff；
- queue/interrupt；
- 后台 running/blocked/unread；
- 一张远程外部任务视图；
- trust 状态；
- 每 Chat 独立恢复 tabs/open files/split；
- 运行中打开 Agent 生成文件；
- 可进入、追问、纠偏和停止的 child Thread；
- 临时问题分支和结论回带；
- Markdown 表格、图片、多格式与未知文件 viewer contract；
- Remote 仅在实际使用时渐进出现。

记录：

- 复制和修改文件数；
- 外部身份清除命中数；
- 旧 IPC/状态依赖数；
- 新增 adapter 数；
- 首屏启动；
- 流式渲染；
- 长 Thread 滚动；
- 后台 Thread 更新；
- Remote/Wiki 接入自然度；
- 六个月维护判断。

决策可以是完整 renderer、多个组件域或新壳；不得预先限制移植大小。

本探针先固定一份工作台源码 archive，并在 archive 内核对物理路径、revision 与 manifest 后安装依赖；不得在研究镜像中安装。样本分成四栏，互不替代：

1. renderer shell/state/IPC：统计 shell spine、atom/state owner、direct host calls、persist/restore 与 message mapping；
2. viewer/stream/activity：读取实际 format dispatch、watcher、large-file/unknown-file failure path、stream batching、scroll anchoring、queue/background activity 与对应 tests；
3. pure-function failure matrix：只验证目标 per-Thread state contract 和固定源码暴露的持久化缺口，不替 donor 证明 runtime；
4. UI hypothesis search：ordinary Chat、work Thread、child control、recovery/location 四个 feature family 各做两个真实 workflow archetype；micro-axis 只能检验信息密度、motion、control placement 等单变量，不能凑数。

失败注入至少包含：preview/open-file memory map 在 restart 时清空、切换 session 后顶层 entry replacement、unknown/binary/oversized/missing viewer、file change during Attempt、watch storm、长 Thread 无界 DOM、child running 时 follow-up/interrupt/stop、temporary question 在 App restart 后恢复、Remote 未使用时不占默认布局。不能实际运行的项保持 open，不得用源码机制推断通过。

施工顺序固定为：先证伪完整 renderer 的状态/IPC/性能边界；再按 viewer、stream feedback、diff/file change、activity/queue 四个组件域确定可抽取文件和依赖；随后比较“保留 shell、替换状态边界”与“新 shell、移植组件域”的文件数、host concepts、adapter、平台/build ownership 和六个月维护成本；最后才用临时 UI 检验该路线是否能承载产品语义。先不做完整生产 UI，也不把被否定的 object-workbench 原型当候选。

成功条件是得到一个可施工的 provisional route：明确 M2 第一条工作台切片、Thread-owned persistence、message virtualization、viewer contract、generated-file refresh、child/temporary-question control、local-default/Remote-on-demand 与三平台复验门。若 full renderer 能在一个有界 adapter seam 后准确满足这些 contract，可以选择它；若状态、IPC 和 host ontology 横跨 renderer，则保留确有证据的 shell/组件机制，状态与 message list 由产品拥有。

停止条件是路线已足以消除 M2 的 full-renderer/new-shell 分叉，并列出 bounded transplant 与 open gates；不继续为布局/配色生成近重复候选，不等待视觉批准，也不把临时原型扩成产品。临时源码 archive、UI artifacts、failure matrix 与过程笔记在稳定结论落盘后删除。

### 7.3 探针 C：持久运行时、文件与编排

目标：证明内核原语足够小，同时能承担 Todo、child Agent、Team message、Dynamic Workflow、文件并发和恢复。

必须覆盖：

- Todo 从当前 Thread branch 重放，不建立第二数据库；
- foreground/background child Thread 使用同一 lifecycle reducer；
- steer、stop、continue、crash reconcile 与嵌套 hard caps；
- Team mailbox 的 message ID、delivered/read/ack、TTL 和 idempotency；
- Dynamic Workflow 中途 replan、retry lineage、cancel、hard caps 和 single integration owner；
- observed-version/CAS file write；
- 新增、修改、删除、rename、symlink、未跟踪文件和大文件 checkpoint；
- restore safety checkpoint、失败 rollback 与 `outcome_unknown`；
- Git 只作可选权威投影，不自动 commit/stash/reset/clean；
- attention 四态、去重、前台抑制和 deep link。

探针必须证明各状态只有一个所有者，不能因为 package 已经实现就接受其私有 Todo、task board、workflow graph、comments database 或 transcript copy。

本探针按两条互不替代的证据链施工：先在全新固定源码 archive 中运行 plan reducer、child lifecycle、mailbox/receipt 和动态编排的最窄目标测试，记录精确命令、通过计数与首个停止位置；再用不含 donor 的 disposable native simulator 验证产品自己的 journal/filesystem/recovery 不变量。source test 不能证明产品 reducer，simulator 也不能证明 donor。

simulator 的最小事件样本是两个 Thread branch、前台与后台 child、重复/过期 Team message、一次 evidence-driven route replacement、同一步的两个 attempt、一次 dispatched 未 settled 的非幂等动作，以及四态 attention。文件样本固定含 create/modify/delete/rename/symlink/untracked/large file，并在动作前后记录用户 Git 的 HEAD、index tree、refs 与 stash。

失败注入顺序固定为 plan 自依赖/悬空/环、旧 observation CAS write、crash replay、未确认 dispatch、step hard cap、restore 中途失败和 rollback 再失败。成功条件是 restart projection 相同、route 真正换路、retry lineage 保留、未知副作用不重放、用户 Git 元数据不变、单次 restore 失败回到 safety checkpoint、双重失败留下 `outcome_unknown`。达到这些条件并能决定 M2 的唯一 journal/recovery seam 后立即停止；不继续为不可取得的 checkpoint 候选做来源考古，也不把 simulator 扩成生产 runtime。

### 7.4 探针 D：远程与批处理

目标：证明本地产品能对远程文件、终端和长寿命批处理任务保持准确状态。

最小 worker：

- 版本/能力握手；
- 文件 stat/list/read/write/search；
- PTY；
- 非交互进程；
- 二进制流；
- 大输出引用；
- 首个具体批处理调度器；
- remote manifest；
- reconnect/reconcile。

必须模拟：

- 首次 host key；
- host key 变化；
- 交互认证；
- 跳板；
- 网络抖动；
- 应用强退；
- SSH 断开；
- 提交响应丢失；
- 任务排队、运行、完成、失败、取消；
- 登录节点与执行节点不同；
- 大日志；
- 远程文件并发变化；
- 本地缓存过期。

高风险结论：

- 凭据是否只在本地安全边界；
- 请求是否具备 correlation ID；
- 何时能重试；
- 何时只能标记 outcome unknown；
- 如何从远程权威对账；
- worker 升级是否需要与整个应用锁步；
- 一条连接是否足以复用控制和数据。

### 7.5 探针 E：知识与扩展自动更新

目标：同时证伪默认重型检索和不可维护的 package 更新路径。

知识样本使用论文、代码、合同、PPT、会议材料和混合文件，不把本探针写成科研专用能力。必须比较：

- visible Markdown Wiki + manifest + exact search；
- FTS；
- Agent 按需导航与回到原文；
- 可选语义索引或外部知识服务；
- 初始化、增量、删除、staleness、人工编辑、召回、延迟、存储和远程原地运行。

更新样本至少包含 bundled、curated 和任意第三方三种 artifact：

- registry metadata 自动发现；
- exact source/revision/content digest；
- staging 与 compatibility/headless/recovery checks；
- owner/source/license/install script/native dependency/capability/state schema diff；
- trust envelope 内 Auto；扩张时 Staged；用户可 Pinned；
- safe-boundary activation；
- active Attempt/browser target/MCP connection/remote process/external job generation lease；
- health check、quarantine、LKG rollback；
- package self-updater 被关闭或 immutability 检测拒绝。

### 7.6 阶段 2 退出条件

每个探针有一个简洁结论，直接写入 Campaign evidence 或稳定 doctrine，不创建平行报告：

- 选择；
- 证据；
- 被拒方案；
- 未知风险；
- 进入生产的最小移植物；
- 必须切除的宿主概念；
- 回退方案。

没有结论的探针不能因“已经写了很多”进入生产。

## 8. 阶段 3：极薄 walking skeleton

只实现一条端到端路径：

1. 用户打开一个受信本地位置；
2. 创建 Thread；
3. 输入被 journal 接纳；
4. Agent 引擎开始 Attempt；
5. 工具读取/修改一个文件；
6. renderer 批量显示增量与动作；
7. 生成 checkpoint 与 diff；
8. 应用重启；
9. Thread 准确恢复；
10. 用户 branch 并继续。

### 8.1 最小持久对象

只允许：

- `Thread`
- `ExecutionTarget`
- `LocationRef`
- `TurnId`
- `AttemptId`
- `ActionId`
- `CheckpointRef`
- `OutputRef`
- `ExternalExecutionRef`
- append-only journal events

新增对象必须证明不能由这些事实投影。

### 8.2 写入顺序

必须满足：

1. persist turn accepted；
2. start engine attempt；
3. persist action proposed；
4. persist policy decision；
5. persist action started；
6. 执行副作用；
7. persist settled 或 outcome unknown；
8. persist output/checkpoint refs。

对只读动作可以安全重试；对副作用只有在有 idempotency key 或远程 receipt 时自动对账。其余保持未知。

### 8.3 恢复

- 重启不把旧 Attempt 显示为仍在运行；
- journal 损坏尾部可在展示层跳过，但恢复操作 strict fail；
- rewind 创建分支，不改写历史；
- 大输出只存引用；
- engine transcript 和产品 journal 不互相复制；
- active Thread 与 background summary 分开订阅。

### 8.4 阶段 3 退出条件

- 强退点覆盖接纳前后、工具前后、写文件前后；
- 每个状态都能解释；
- identity checker 通过；
- 无旧兼容代码；
- fresh checkout 可复现；
- 端到端路径没有本地 HTTP/WS 等无必要中转。

## 9. 阶段 4：Remote 成为一等位置

把阶段 3 同一条路径放到远程位置，不创建第二套 Remote 产品：

- 同一个 Thread；
- `LocationRef` 指向远程；
- 文件树/搜索/编辑走 worker；
- 终端走 PTY；
- Agent 工具使用同一 ExecutionTarget；
- checkpoint 在远程权威上建立；
- output 可留远程并返回引用；
- UI 明确当前位置和连接状态。

随后加入批处理：

1. Agent 生成提交内容；
2. 用户或策略决定是否提交；
3. 本地 journal 记录 proposed/started；
4. 远程保存 manifest；
5. 调度器返回外部 ID；
6. 本地保存 `ExternalExecutionRef`；
7. 关闭应用并断网；
8. 任务独立继续；
9. 重开后权威对账；
10. 查看日志和产物；
11. 明确下载所需输出。

Remote 完成条件不是“命令跑通”，而是断线、重开、未知结果和大输出仍然准确。

## 10. 阶段 5：文件原生 Wiki

### 10.1 最小目录

建议从普通文件开始：

```text
wiki/
  index.md
  log.md
  pages/
  .state/
    sources.json
    dependencies.json
    search.db
```

`.state/` 全部可重建。若 manifest 包含用户手工决定的来源范围，则把不可重建部分拆出并纳入普通版本控制。

### 10.2 第一个闭环

1. 用户选择来源目录；
2. helper 哈希并登记来源；
3. Agent 阅读来源并规划结构；
4. 生成 `index.md` 和少量页面；
5. 页面包含可回到来源的引用；
6. 用户查询；
7. Agent 先导航 Wiki，再按需回到原文；
8. 高质量结果可保存为页面；
9. 用户修改一个来源；
10. 依赖页面变 stale；
11. refresh 生成可审查 diff；
12. rollback 恢复整次多页改动。

### 10.3 千份级混合资料压力

真实约千份混合 corpus 至少测：

- 初始化耗时；
- 增量一篇/十篇/删除一篇；
- 索引大小；
- FTS 召回；
- Agent 导航上下文；
- 冲突和重复；
- 中断恢复；
- 用户手工页面；
- 远程原地运行；
- PDF/Office 解析作为外部 capability 失败时的降级；
- 论文、代码、合同、会议材料和混合目录是否使用同一知识语义。

没有召回证据，不加入 embeddings；加入后也只是可重建投影。

### 10.4 与 `K0`–`K4` 的移植竞赛

对每个候选用同一 corpus、同一失败注入比较：

- 原始资料零修改；
- Markdown 脱离程序可读；
- 来源追溯；
- 增删改传播；
- staleness；
- 并发；
- dead letter；
- 远程执行；
- 用户编辑保护；
- rollback；
- 运行时重量；
- 代码所有权。

可以整块搬最优子系统。不能为了保留候选而引入租户、RBAC、自有 Agent、模型管理或第二份 Wiki 真相。

## 11. 阶段 6：统一能力入口

### 11.1 Capability contract

第一版公共能力只需描述：

- stable capability id；
- human description；
- input schema；
- output schema 或 `OutputRef`；
- progress/log；
- cancellation；
- required trust；
- execution location constraints；
- cost/irreversibility hints；
- error categories。

数据、分析、知识、浏览器、外部工具和其他专业能力都用同一 contract。

### 11.2 上下文纪律

- 只向模型提供当前启用、与任务相关的能力；
- 大 schema 延迟加载；
- capability discovery 不等于全部 prompt 注入；
- 结果过大时返回引用；
- 外部能力失败不拖垮 Thread；
- 删除连接不删除外部系统数据；
- 第一版没有自定义 UI ABI。

实现层分为 native durable primitives、bundled first-party modules、`E0` compatibility bridge、curated optional、任意第三方和 external service。产品原生负责不等于所有能力常驻 kernel；bundled 也不等于 mega extension、独立状态权威或全量 prompt 注入。

### 11.3 动态工作流

先通过 `E1` 生态验证 Agent 动态编排，而不是传统固定工作流：

- 主 Agent 能否按实时结果生成、追加、删除、改序、分支、循环和并行；
- child 结果返回以后能否 mid-run replan；
- 是否有可恢复 run/step/attempt journal；
- retry 是否创建新 attempt，并只 replay 纯、幂等或有 receipt 的动作；
- 循环是否有机器可解释的终止条件和 steps/workers/concurrency/wall/cost 硬上限；
- 多 Agent 写入是否只有一个集成所有者；
- 是否能调度远程或外部任务而不复制其状态权威；
- 普通任务是否完全不暴露 Workflow；
- 公共进度/日志/输出是否足够。

不要因固定 DAG 引擎恢复成熟就让它重新定义 Workflow，也不要因动态 donor 思想正确就把其内存实现误当生产证据。

### 11.4 扩展 artifact 与自动更新

先实现治理，再开放生态安装：

1. content-addressed artifact store；
2. exact revision/digest resolver；
3. installed/activation pointer 与 generation lease；
4. staging 与 trust-envelope diff；
5. focused compatibility/headless/recovery check；
6. safe-boundary atomic activation；
7. health observation；
8. quarantine 与 LKG rollback；
9. Auto / Staged / Pinned 策略；
10. 24 小时异步 metadata refresh 与手动即时刷新。

Bundled 随 App 原子更新。Curated 与已经批准 envelope 的第三方默认可以 Auto；扩张时停在 Staged。任何 package self-updater 必须关闭或被 immutability check 拒绝。一个 Attempt、browser target、connection、remote process 或 external job 从开始到结束使用同一 generation。

## 12. 阶段 7：跨领域通用验收

选择至少三个差异显著的真实任务，例如代码改造、混合资料综合和远程长任务。可以包含生物医学任务，但它只作为 workload：

1. 普通 Chat 在无目录时完成轻量任务；
2. 工作型 Thread 打开一个本地目录，运行 Agent 并随时查看生成文件；
3. 复杂任务自动委派 child Agent，用户进入、追问、停止或纠偏；
4. Dynamic Workflow 根据中间结果改变路线；
5. 混合资料使用 visible Wiki、exact/FTS/agentic search，不默认启用 RAG；
6. 远程位置运行文件、PTY 和长任务；
7. 提交一个外部调度任务，断线和 App 重启后恢复观察；
8. 用户否定或修改方向，branch 尝试另一条路径；
9. 打开 Markdown 表格、图片、PDF/Office 和未知文件；
10. 输出可复现的文件、日志、来源和回执；
11. 一个生态 package 成功兼容，另一个在加载前得到准确 compatibility report；
12. package 在 safe boundary 自动升级，失败后回到 LKG。

验收关注：

- 数据/知识/方法和其他专业工具都只是 capability；
- Thread 保留判断过程；
- 文件与任务有权威来源；
- 人可以接管；
- 外部系统可替换；
- 失败可解释；
- 没有任何领域字段或模式进入 core。

## 13. 性能验证

每条关键流记录：

- admission；
- engine queue；
- provider；
- first delta；
- tool dispatch；
- local/remote execution；
- persistence；
- IPC；
- render。

至少验证：

- 首次启动；
- 首次 Thread；
- 100k+ 字符长 Thread；
- 每秒高频增量；
- 大工具输出；
- 多个后台 Thread；
- 远程高延迟；
- 大目录搜索；
- 千份混合资料 Wiki；
- 大日志；
- renderer crash/reload。

硬纪律：

- provider stream 单读；
- IPC 批量；
- 不逐 token 全量 Markdown；
- 长列表虚拟化；
- background summary；
- 启动零远程探测；
- 大输出落盘；
- 二进制不 base64 JSON；
- 远程文件不透明全量同步。

只有测量结果能证明优化，不用“架构上应该快”验收。

## 14. 安全与恢复验证

### 14.1 信任

- 未受信位置不执行代码或自动扩展；
- 受信位置不逐命令确认；
- 第三方扩展显示真实权限；
- 不宣称不存在的 sandbox；
- 不可逆外部动作有独立授权；
- 高费用长任务范围清楚。
- compatibility manifest 只解释能力，不宣称 sandbox；
- exact artifact 在已批准 trust envelope 内安静运行，不重复逐命令授权；
- owner/source/license/install script/native dependency/capability/state schema 扩张时停止自动激活；
- active Attempt 或外部任务不热替换 extension/helper generation。

### 14.2 秘密

- 凭据不进 argv；
- 不进日志、journal、错误、截图和测试；
- 不复制到远程配置；
- host key 变化 fail closed；
- 交互认证经安全通道；
- crash report 默认脱敏。

### 14.3 恢复矩阵

在以下点强制终止并重开：

- turn 接纳前/后；
- attempt 开始前/后；
- action proposed/started 之间；
- 本地写入期间；
- 远程请求已发送但响应未到；
- 外部任务提交期间；
- Wiki 多页写入期间；
- checkpoint 建立期间；
- 大输出传输期间。

每种情况必须得到 settled、明确失败或 outcome unknown；不能凭推测补成功。

## 15. 生产移植流程

每块移植物只走一次完整路径：

1. 在仓库外固定来源；
2. 画依赖与权利边界；
3. 与最小重写比较；
4. 选择 package/fork/transplant/adapt/mechanism；
5. 搬入临时分支；
6. 删除宿主概念和外部身份；
7. 改为稳定职责命名；
8. 补中性 contract tests；
9. 跑 identity、性能、失败/恢复检查；
10. 更新根 README 的实际来源披露；
11. 放入法定文本；
12. 删除研究探针；
13. 合并。

不得：

- 保留旧名 alias；
- 留一套旧实现兜底；
- 把来源 ID 写进生产；
- 以“以后可能用”保留宿主模块；
- 让 license/provenance 在代码里散落；
- 等所有搬运结束再做身份清理。

## 16. 阶段验收表

| ID | Claim | Proof |
| --- | --- | --- |
| F-01 | 独立仓库身份洁净 | checker 扫描 tracked 作者区 |
| F-02 | 来源诚实且集中 | README 披露 + 法定文本 |
| F-03 | 领域内核只有必要事实 | schema/API review + persistence tests |
| F-04 | 引擎 transcript 不重复 | recovery/branch inspection |
| F-05 | 动作副作用状态准确 | crash matrix |
| F-06 | 工作台可承担真实长任务 | vertical slice + measured UI |
| F-07 | Remote 是同一产品位置 | local/remote parity tests |
| F-08 | 外部任务跨断线存活 | 真实调度环境重连 |
| F-09 | 远程文件保持权威 | conflict/cache tests |
| F-10 | Wiki 原始资料不变 | hash proof |
| F-11 | Wiki 可见、可追溯、可回滚 | corpus scenario |
| F-12 | 千份级混合资料不依赖默认重型 RAG | scale/search evidence |
| F-13 | 所有专业能力使用统一入口 | multiple capability contract tests |
| F-14 | 受信工作区无确认戏剧 | end-to-end policy test |
| F-15 | 第三方扩展信任独立 | untrusted extension test |
| F-16 | 性能路径可归因 | flow spans + UI measurement |
| F-17 | 没有旧兼容双轨 | dependency/search audit |
| F-18 | 多种异构 workload 使用同一 core，无领域模式或本体 | domain surface audit + scenarios |

任何 claim 只能由与它同一 frozen SHA 的证据证明。

## 17. 何时停止或推翻当前假设

出现以下证据时，允许推翻 README 的具体技术选择，但必须先改 README：

- 首选引擎无法提供稳定恢复/工具事件，且 fork 成本高于替代；
- 完整工作台移植残留宿主概念明显多于新壳；
- 选定桌面进程形态产生可重复崩溃或阻塞；
- 极小 worker 无法满足必须的远程扩展本地性；
- 文件原生 Wiki 在真实 corpus 上无法提供可接受召回；
- 首个调度器证明公共协议设计错误；
- identity 规则与法定依赖无法同时满足，需要重新选择分发方式；
- 两个真实消费者证明现有具体 adapter 需要提炼。

“做起来麻烦”“旧产品本来有”“已经投入很多”“别人都这样”不能推翻。

## 18. 给新会话的启动指令

新会话不应一次承诺完成全部产品，也不得重新执行已经完成的阶段 0–1。第一轮只做：

1. 确认工作目录就是本独立仓库，分支、工作树和远端状态可解释；
2. 按本文件第 2 节读取五份权威文档，确认 README 的七类源码审判冻结仍是当前决策；
3. 运行现有 `npm run quality`，确认身份、来源和最小测试地基没有退化；
4. 只为即将开始的探针核对固定 revision、许可证与真实代码入口；不根据上游宣传文档替代源码和测试审判；
5. 为五个探针分别写清一个可证伪问题、样本、失败注入、成功条件、停止条件和临时目录；
6. 先运行最便宜且最可能推翻架构的探针，不把探针代码写入生产作者区；
7. 每个探针只把稳定结论、固定证据和重新验证条件回写到根 README；临时候选清单、下载量和过程笔记留在仓库外；
8. 五个边界有足够证据以后，才进入阶段 3 walking skeleton；未完成的 Campaign claim 只进入 `candidate`，不得由生产者自证完成。

如果新会话试图再建仓库、重做第一提交、先搬旧仓库、先做完整 UI、先造通用插件系统、先做所有 provider 或先复刻全部功能，应立即停下，重新读取创立宪法。
