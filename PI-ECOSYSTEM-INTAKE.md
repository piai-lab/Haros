# Pi Ecosystem Intake

> 状态：OmniMind 对 Pi Core、Pi-compatible package、extension、skill、prompt、tool、MCP，以及其他 Agent Engine 机制进行研究、采用、升级和 fork 时的长期治理手册。
>
> 本文只规定“如何得到可执行结论”。它不拥有产品架构、当前施工顺序、Campaign 状态或某个 package 的当前采用结论。

## 1. 目的

OmniMind 选择 Pi 作为默认 Agent 内核，不等于从零重写 Pi 已经解决的问题，也不等于把 Pi 生态原样塞进产品。正确策略是：

1. 先证明现有来源是否已经提供了需要的机制；
2. 优先复用公开、稳定、可隔离的原语；
3. 只把用户结果所需的最小表面接入现有 owner；
4. 用真实 journey、运行时证据和维护成本决定采用，而不是用 star、README 或功能数量决定；
5. 配置和窄桥能解决时不 fork，翻译机制能解决时不引入第二控制面；
6. 无法证明净收益时拒绝采用。

本文要防止两种同样昂贵的错误：

- **重复造轮子**：忽略 Pi/Engine 已有的 session、tool loop、compaction、skill、extension 等原语；
- **生态绑架产品**：为采用一个 package，引入第二份 Goal、Run、Scheduler、Memory、权限、UI、private home 或生命周期 owner。

## 2. 权威边界与必读顺序

每次 intake 必须在同一个精确工作区、同一轮上下文中按以下顺序完整读取：

1. [`README.md`](README.md)：产品定义、承诺与总入口；
2. 本文 [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)：intake 方法与授权边界；
3. [`architecture/README.md`](architecture/README.md) 及任务涉及的专题 owner：唯一产品事实；
4. [`execution-brief.md`](execution-brief.md)：当前唯一施工顺序与准入门；
5. [`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)：仅在 active 时读取状态与证据指针；
6. [`research/README.md`](research/README.md) 路由的相关 evidence owner；
7. Agent Core 相关任务再完整读取：
   - [`research/omnimind-agent-core-design.md`](research/omnimind-agent-core-design.md)
   - [`research/omnimind-agent-core-execution-guide.md`](research/omnimind-agent-core-execution-guide.md)

权威关系不可倒置：

- `architecture/*` 决定“产品是什么”；
- `execution-brief.md` 决定“现在能做什么”；
- active Campaign 记录 claim 状态与证据；
- `research/*` 保存来源、观察、反证、候选裁决和未来施工参考；
- 本文决定“如何审查来源”，不决定采用。

若两个权威 owner 对同一产品事实给出冲突要求，停止产品施工，先修 sole owner。不得用更新时间、聊天记录、研究文档或 package 行为选边。

## 3. 触发条件与授权

以下任务必须完整执行本文：

- 审查、比较、跟进、升级或 fork bundled Pi Core；
- 引入或升级 Pi-compatible package、extension、skill、prompt、tool 或 MCP；
- 把 Codex、Claude Code、OpenCode 等 Engine 的机制移植到 OmniMind Agent Core；
- 让候选来源接触模型凭据、Provider private home、workspace 文件、网络、subprocess、持久状态、权限、设备或发行产物；
- 依据外部来源重构 Agent Runtime、delegate、workflow、memory、knowledge、goal、computer use 或 capability projection。

每轮分为两个独立授权门：

- **Gate A：只读 intake。** 可检索、下载到临时隔离目录、解包、审计、运行无产品写入的 focused probe，并形成 disposition。不得修改产品、owner 文档、依赖锁或发行配置。
- **Gate B：实施候选。** 只有维护者确认本轮 exact source set，且 `execution-brief.md` 明确准入该切片后才可进入。

“长期默认尽量吸收生态”“可以重构一切”不是 Gate B 授权。它们要求更严谨地比较，不授权跳过来源身份、隔离、产品 owner 或交付门。

## 4. Intake 的基本单位

Intake 的基本单位不是“一个仓库”，而是：

```text
exact artifact
+ exact source revision
+ exact dependency closure
+ exact runtime/profile/config
+ exact host adapter / Engine binary or SDK / protocol seam
+ exact OmniMind journey
+ explicit owner boundary
```

同一个 package 在不同版本、配置、入口、运行目录或依赖闭包下是不同候选。不得把“某仓库支持某能力”扩张为“当前发布物在 packaged OmniMind 中可安全提供该能力”。

默认 profile、产品拟采用的最小 profile 和 benchmark comparator profile 必须视为三个不同候选，分别记录完整配置、工具表、环境、目录和副作用。不能把默认行为关掉后仍称“默认对照”，也不能为了让不安全对照可运行而暗中模拟或改写其行为；无法安全隔离时应跳过该 arm 并记录没有结果。

来源分为五类：

1. **Bundled Pi Core**：OmniMind 默认内核的基线。优先使用公开 API，不复制其内部 owner。
2. **已采用来源**：已经进入 lockfile 或 shipped bytes。升级必须证明兼容、回归与删除旧 patch 的机会。
3. **未采用候选**：默认只读；热度只决定研究优先级。
4. **既有 fork/patch**：必须能追溯 upstream、补丁清单、删除条件和同步成本。
5. **其他 Engine donor**：可翻译机制或通过官方 seam 加法挂载，但不得伪造跨 Engine 相同语义。

## 5. Gate A：只读研究合同

### 5.1 先写可证伪问题

研究前必须用一句话写清：

```text
对哪个真实用户 journey，候选相对当前最简单基线提供什么可测增益？
```

同时给出：

- 当前最简单基线；
- 候选可能获胜的机制；
- 最强反证；
- 若失败，保留什么洞察、删除什么复杂度；
- stop-loss。

禁止以“功能很多”“生态成熟”“作者很强”“下载量高”作为问题定义。

### 5.2 Exact source identity

至少记录：

- package 名与 exact version；
- registry tarball URL、integrity、shasum；
- repository URL 与 exact commit/tag；
- tarball 与 source tree 的差异；
- license、notice、发布 provenance/signature；
- direct/optional/peer dependency exact closure；
- install script、`bin`、postinstall、动态下载与 native dependency；
- 发布物是否包含测试、源码、source map、demo 或多余资产。

若 registry 没有 `gitHead`，必须通过 provenance、tag、release workflow 或逐文件 hash 建立来源对应。无法闭合时只能标为“artifact-only evidence”，不能声称审计了 exact source。

证据成熟度必须逐级标注，不能从低层外推高层：

```text
metadata-only
→ artifact-verified
→ source-matched
→ isolated-runtime-observed
→ product-journey-proven
→ packaged-product-proven
```

- `metadata-only` 只证明 registry/API 返回了什么；
- `artifact-verified` 证明真实发布物的 digest、内容与权利；
- `source-matched` 证明发布物与 exact source revision 的对应；
- `isolated-runtime-observed` 证明 exact profile 的进程、文件、网络和生命周期；
- `product-journey-proven` 证明通过 OmniMind 现有 owner 接入后的真实用户结果；
- `packaged-product-proven` 才能支持已安装 Desktop 中的交付声明。

某层失败或未做时必须保留 `unknown`。source tests 通过不能替代发布物测试，隔离 CLI 通过不能替代现有 adapter journey，packaged 启动也不能自动证明失败、取消、恢复和 private-home 边界。

严禁：

- `latest`、浮动 tag、未锁分支；
- 执行来源自带的 `npx` installer 代替 exact artifact 审计；
- 只 clone Git 仓库而不检查真实发布 tarball；
- 只看 npm metadata 或 README 就判定可采用。

### 5.3 结构与 owner 审计

逐项回答候选是否创建或接管：

- Model/Auth/Provider；
- Session/Thread/resume/compaction；
- Run/Goal/Queue/Workflow/Scheduler；
- Memory/Knowledge/Index/Database；
- Tool/Skill/Prompt/MCP/Plugin registry；
- permission/approval/policy；
- UI/TUI/commands/notifications；
- process/network/cache/private home；
- update/install/telemetry/crash recovery。

对每个 owner 给出 disposition：保留候选 owner、桥到 OmniMind 现有 owner、翻译机制，或拒绝。不得用“隐藏 UI”“关闭自动模式”误当 owner 已消失；必须证明 schema、state、listener、timer、writer、command 和 recovery path 都没有注册。

冰山审计必须同时覆盖用户看不见但会形成长期责任的表面：startup/bootstrap、ambient discovery、hooks、slash commands、schema registration、watcher/listener/timer、background queue、cache/index、session entry、restore/repair、child process、network callback、update/uninstall。配置项、UI 开关和 README 没出现这些表面，不等于它们不存在；必须沿 exact entrypoint 和 shutdown path 证明。

### 5.4 运行边界审计

必须在 fresh、任务专用 profile 中观察：

- 实际读取和写入的 home、cwd、workspace 路径；
- symlink、ancestor discovery、global fallback；
- 环境变量继承与 secret 传播；
- subprocess tree、detached process、timer、watcher、listener；
- outbound host、redirect、proxy、OAuth、browser cookie/keychain；
- dynamic download、`npx --yes`、`uvx`、shell expansion；
- shutdown、abort、timeout、retry 与 late result；
- crash/restart 后 owner 的事实是否一致。

OmniMind Agent 的 private state 必须留在 `.omnimind` 或任务隔离目录。任何读取、写入、迁移或覆盖真实 `.pi`、`.codex`、`.claude`、`.config/opencode`、浏览器 cookie 或 keychain 的默认路径都视为阻断项，除非产品 owner 明确要求且 journey 有真实审批。

### 5.5 Prompt、Tool、Context 与 Cache 审计

至少测量：

- session 开始时注册的 tool 数、schema token 与确定顺序；
- system/developer prompt 的静态与动态部分；
- 每轮自动注入、footer、reminder、recall、status；
- tool output cap 与错误输出；
- capability 变化是否重写前缀；
- cacheRead、cacheWrite、input、output 与总成本；
- compaction、branch、resume 后的真实性；
- 模型是否能覆盖固定 route、权限或 provider 选择。

Cache 命中率不是成功指标。缓存大量无关上下文仍然浪费 attention 和 context window。正确目标是：任务成功、有效上下文更小、总成本更低、事实与恢复真实。

### 5.6 用户结果与维护成本

候选必须与当前最简单实现进行同条件比较。成本至少包括：

- 新增 owner、状态格式、后台进程与配置；
- 上游发布频率、维护者集中度、API 稳定性；
- fork 同步、补丁漂移、打包体积、native dependency；
- 新手默认体验、失败可解释性、卸载/回滚；
- 安全与隐私边界；
- 实际 token、延迟和 break-even 次数。

如果用户结果相同，选择更少 owner、更少常驻上下文、更少进程、更少持久状态的方案。

### 5.7 Gate A 输出

Gate A 必须输出一个可独立审阅的 intake 结论，至少包含：

1. exact identity 与权利；
2. 当前达到的证据成熟度以及不能外推的层级；
3. 用户 journey 与比较基线；
4. 真实结构、运行观察与最强反证；
5. owner 冲突；
6. disposition；
7. Required proof；
8. stop-loss、回滚与重开触发器；
9. 尚需维护者决定的真实分叉；没有则明确写“无”。

Gate A 不应制造实施 plan、改依赖或更新 Campaign claim。

## 6. Disposition 词汇

每个来源或机制只能使用以下主 disposition 之一；复杂 package 可按独立机制拆分：

| Disposition | 含义 | 适用条件 |
|---|---|---|
| **Preserve / adopt directly** | 保留或直接采用 exact artifact | owner 与产品一致，公开 seam 稳定，隔离和 journey 已证明 |
| **Configure / curate** | 原包保留，只用配置或资产策展缩小表面 | 关闭项真的不注册 owner，而非仅隐藏 |
| **Bridge narrowly** | 用窄 adapter 接入现有 owner | 不复制 lifecycle/state/policy，桥可删除 |
| **Translate mechanism** | 吸收算法、状态机 guard 或测试，不运行原包 | 原包 owner 冲突，但机制有独立价值 |
| **Donor / comparator** | 只作代码供体、对照组或实验基线 | 尚不具备产品准入条件 |
| **Defer with trigger** | 当前不采用；写明唯一重开条件 | 证据不足、时机未到或需要 upstream seam |
| **Decline, retain insight** | 拒绝运行时与长期责任，只保留洞察 | 净收益为负或违反 owner |
| **Fork narrowly** | 最后手段；只维护最小 patch inventory | 配置/桥/翻译均失败，基准证明收益，维护者再次授权 |

“Already covered”不是采用动作。若现有 OmniMind owner 已提供用户结果，应将候选判为 `Decline` 或只保留未覆盖机制，不能并行安装第二份实现。

## 7. 最小采用阶梯

按顺序尝试，前一级能闭合 journey 就停止：

1. 使用 bundled Pi/Engine 的公开 API；
2. 复用现有 OmniMind Product/Gateway/Workbench owner；
3. 使用一个按需 Skill、Prompt 或静态资产；
4. 通过配置裁剪 exact package；
5. 用进程内、session-scoped、无持久 owner 的窄桥；
6. 翻译可独立验证的机制和 conformance tests；
7. upstream issue/patch，争取稳定 public seam；
8. 只有 Gate A + benchmark + 维护者授权同时成立时做减法 fork；
9. 仍无法证明净收益则拒绝。

不得为了“以后可能用”建立 package registry、兼容实验室、第二插件平台、第二 workflow engine 或统一伪运行时。

## 8. 类型专项检查

### 8.1 Subprocess / subagent package

除通用检查外，必须证明：

- 首个 child 就使用 exact OmniMind launcher、model、auth、private home 与 cwd；
- child 不扫描 Provider private home，不继承不需要的凭据；
- foreground/background、abort、timeout、process group、orphan cleanup；
- usage、result、provenance、stderr、partial output 与 settlement 只有一个真相；
- worktree、Gist/share、schedule、mission、Fleet、intercom 等副作用没有进入最小表面；
- 项目目录没有写入硬编码 `.pi` 状态。

### 8.2 MCP / network tool

必须证明：

- canonical catalog 与 credential owner；
- transport、protocol、timeout、reconnect、shutdown；
- URL/command/socket/stdio 的明确准入范围；
- tool allowlist、schema、resources/prompts/instructions 的真实支持；
- SSRF、redirect、DNS rebinding、local-file、shell injection；
- secret 不进 argv、log、cache、child env；
- 不与现有 OmniMind Gateway 注册同名或重复工具；
- 同名冲突显式、可解释、无静默覆盖。

### 8.3 Knowledge / Memory

必须额外证明：

- 先声明候选是在做 **Knowledge**、**Memory**、Thread Recap 还是 resume state；四者不得因都使用 Markdown/索引而混成一个 owner；
- Knowledge 的 immutable evidence 与 derived knowledge 分离；provenance、scope、stale/deleted source、矛盾、版本与回滚可审计；外部来源永远是 data，不能升级为 instruction authority；这些是后台事实正确性，不应被实现成逐次用户审批；
- Knowledge 默认可以自动：用户在普通任务中实际提供或使用、并被判断为未来仍有复用价值的来源，可在 root turn 真正 settled 后触发有界 evidence capture、关联页面/index 更新和 conflict/stale maintenance；不要求用户另发“更新知识”命令，也不要求首次写入 review；
- 自动不等于 ambient 扫描：没有实际使用的 durable source 时不 bootstrap，不扫描 provider history/personal home，不 ingest 每个访问网页，不启动 daemon，不注入大段 prefix；触发器必须能追到当前 Product Thread 的真实 source use 或 workspace change；
- Memory 可以是自动过程，但必须是 root turn 真正 settled 后的有界、稀疏 candidate extraction，而不是自动保存完整 transcript、网页、raw reasoning、secret、personal directory 或 subagent 中间猜测；
- Memory 默认 project/workspace scope；日常写入与召回不要求逐条确认，也不要求每次生成 Timeline receipt，但必须可查看、纠正、遗忘、关闭并保留 provenance。提升到 personal/global 或冲突会改变当前任务且无法从现有证据裁决时才要求显式决定；
- Engine-native memory 与 OmniMind project context 必须按责任分开：native memory 保留其原目录、格式、管理和 retention；OmniMind 不读取、镜像或合并它。OmniMind 可以拥有一份跨 Engine 可见的 project-scoped file-world，只保存产品可审查的共享项目事实/知识，并通过各 Engine 的官方 additive seam JIT 提供；这不是第二 native Memory DB；
- 自动 Memory job 有 eligibility、budget、timeout、cancel、retry 上限与 shutdown，不能借“后台”引入常驻 daemon 或第二 scheduler；
- OmniMind-owned Knowledge/Memory 共用同一个 project-context owner 和写入队列；有单 writer/锁/原子性/幂等/崩溃恢复，forget 后不因 cache/index/replay 复活。候选 package 若分别创建 vault、database、events authority 或 background writer，必须拆除或拒绝；
- Knowledge 证明检索规模、遗漏、claim-level source support 与 compile/query break-even；Memory 另行证明跨任务复用收益、错误召回、scope 隔离与 write/recall token 成本；
- 两者正文均 JIT，不把完整 wiki/memory 塞入稳定 prefix；UI 默认安静且无需维护命令，但“没显示”不能替代后台 owner、文件、进程、失败和恢复审计。

### 8.4 Engine-native capability

Codex、Claude Code、OpenCode 等能力必须通过各自官方 seam 评估：

- 先记录 OmniMind 当前真实 adapter、锁定的 Engine binary/SDK 版本与调用路径，再讨论新增 launcher 或配置入口；
- 原生 auth/session/resume/permission/plugin 仍由 Engine 拥有；
- OmniMind 只加法挂载兼容的 versioned capability pack；
- `native`、`projected`、`unavailable` 逐项验真；
- Engine-specific hooks、commands、subagents、permission 不伪装成跨 Engine 通用能力；
- process-scoped seam 必须证明线程隔离或使用 dedicated process。
- official docs 只证明当前可能的公开 seam；生产结论还要 feature-detect exact installed version，并从 Engine 的 init/list/status 回报建立 loaded inventory；
- 同名冲突审计同时覆盖 native 配置、OmniMind session overlay、动态注册和 UI display name。即使不改 source home，session 层静默遮蔽仍是冲突；
- 现有 OmniMind 注入也受本节约束，不能因它是 first-party 就跳过 namespace、credential、settlement 和 shutdown 审计。

## 9. Gate B：实施与晋级

进入 Gate B 前必须同时满足：

1. Gate A exact source set 已闭合；
2. 维护者确认本轮 disposition；
3. `execution-brief.md` 已准入该独立切片；
4. owner、成功条件、失败条件和回滚明确；
5. 没有未解决的产品权威冲突。

实施规则：

- 一个切片只闭合一个用户结果；
- 先接最小表面，再用真实证据扩大；
- 不把候选 package 的 UI、state、scheduler、permission 一并带入；
- 不修改 Provider private home；
- 新用户可见文案同时交付简体中文和英文；
- 新状态必须证明现有 owner 无法表达；
- 候选只能提交为 candidate，不能自证 Campaign `verified`。

验证从窄到宽：

1. source/typecheck/unit/fixture；
2. exact package compatibility 与 negative tests；
3. isolated runtime journey；
4. 必要时匹配的 real-provider probe；
5. 从 exact pushed SHA 打包 Desktop；
6. fresh task profile 下启动、使用、取消/失败、关闭、重开；
7. private-home、process、network、usage 与恢复证据。

局部绿色不能扩张为完整产品采用。

## 10. Fork 的额外合同

Fork 只允许维护最小 patch inventory，并必须记录：

- upstream exact base 与 fork commit；
- 每个 patch 对应的产品不变量；
- 为什么配置、桥、翻译、upstream patch 都不足；
- upstream 同步方式与冲突预算；
- package rename、license、notice、SBOM、reproducible build；
- 删除 patch 和回归 upstream 的触发器；
- 停止维护时的卸载/迁移路径。

不得把多个相似项目拼成一条不可追溯 lineage。需要多个 donor 时，只吸收测试思想和机制；运行时代码最多保留一条明确 lineage。

## 11. 更新与长期维护

### 11.1 不自动追 latest

OmniMind 不静默轮询并采用上游变化。每次升级重新锁定 exact artifact/source/dependency/profile，只重跑受变化影响但足以推翻结论的 proofs。

### 11.2 Revalidation 触发器

出现以下任一变化时重开相关 intake：

- Pi Core、Node/Bun/Electron、Provider SDK 或 package major/minor 行为变化；
- source identity、dependency closure、installer、license 或 provenance 改变；
- private-home、network、subprocess、permission、state schema 改变；
- upstream 新增可删除 OmniMind patch 的 public seam；
- 用户 journey、产品 owner 或 execution topology 改变；
- benchmark 显示现有减法实现不再占优；
- 安全事件、数据损坏、恢复失败或 packaged journey 回归。

### 11.3 证据落点

- 固定版本、权利、构建/运行观察写入 `research/*` 对应 evidence owner；
- 产品事实只更新 `architecture/*` 的 sole owner；
- 当前顺序只更新 `execution-brief.md`；
- claim 状态只更新 active Campaign；
- 本文只在 intake 方法本身变化时更新。

不要在多个文档复制版本表、施工状态或完整风险登记。使用链接和精确路径，避免未来同步漂移。

研究设计与执行指南不得保存施工阶段名、next action 或当日进度快照。新会话必须实时读取 `execution-brief.md` 并引用当时原文；本文只规定未被 sole owner 明确准入时不得实施。这样修改施工顺序时无需同步重写研究文档。

## 12. Stop conditions

出现以下任一情况立即停止采用或升级：

- exact artifact 与 source 无法对应；
- license、provenance 或 dependency closure 不清；
- 需要读取/写入真实 Provider private home 才能工作；
- 需要第二份 Product Thread、Goal、Run、Queue、Scheduler、Memory、权限或更新 owner；
- 关闭配置只隐藏 UI，实际 writer/listener/schema 仍存在；
- secret 可能进入 argv、日志、cache、child env 或模型上下文；
- abort/timeout/retry/settlement 不能给出唯一 terminal truth；
- packaged journey 无法隔离、回滚或重现；
- 候选不优于更简单基线，或收益不足以覆盖长期维护；
- 当前 `execution-brief.md` 未准入；
- 相同失败在没有新假设时重复出现。

停止不等于研究失败。应保留可独立复用的机制、测试与反证，并删除运行时责任。

## 13. 新会话交接模板

新会话开始一轮 intake 时，首个工作输出应包含：

```text
Workspace / branch / HEAD / dirty paths:
Applicable authority owners:
Current execution-brief admission:
Candidate exact artifact/source/dependencies:
User journey and simplest baseline:
Owners touched:
Primary falsifier:
Gate A actions only:
Gate B authorization: absent | exact reference
```

Gate A 收口输出应包含：

```text
Exact identity:
Evidence maturity / unsupported higher claims:
Observed runtime/profile:
User outcome versus baseline:
Owner conflicts:
Strongest counterevidence:
Disposition:
Required proof:
Stop-loss / rollback:
Reopen trigger:
Unresolved maintainer choice: none | exact choice
```

## 14. 完成定义

一轮 intake 只有在以下事实全部成立时才算完成：

- exact source、权利和依赖闭合；
- 真实 owner、运行边界、用户收益与反证已记录；
- disposition 唯一且可证伪；
- Required proof、stop-loss、回滚和重开触发器明确；
- 没有把 Gate A 写成产品采用；
- 没有创建平行架构真相；
- 相关证据进入唯一 owner；
- 新会话无需依赖聊天记录即可复现结论与下一步。

最终原则只有一句：**先证明机制值得继承，再决定代码是否值得继承；先守住唯一 owner，再谈功能数量。**
