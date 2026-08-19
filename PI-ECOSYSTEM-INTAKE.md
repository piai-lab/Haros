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
5. 配置和窄桥能解决时不 fork；候选已经属于 OmniMind 明确继承的同一 Product Orchestration/Thread 生命周期时，优先保留母体 owner，不把它误判为第二控制面；
6. 无法证明净收益时拒绝采用。

### 1.1 OmniMind Agent 深度对齐 Pi

OmniMind Agent 的默认技术哲学、规则和路线以 exact bundled Pi 为主，不只追求函数签名或工具 schema 表面兼容。必须优先对齐 Pi 已有的：

- `ModelRuntime` / `AgentSession` 与 native turn、stream、abort、settlement、branch、resume、compaction 生命周期；
- `ResourceLoader` / `PackageManager` 的 Extension、Package、Skill、Prompt、Tool、MCP 发现、优先级、冲突、reload、install/update/remove 与 private-state 边界；
- Pi Tool Registry 的 registered/active truth、Extension-owned name set、dynamic loading 和 Provider-native/fallback wire 语义；
- Pi 的 context/instruction composition、Session event、tool result provenance、permission/approval 与失败恢复方式；
- 上游公开 seam、原始来源身份、作者测试、默认行为和可删除的最小 OmniMind patch。

“深度对齐”不表示把 Pi CLI/TUI 品牌或所有 package 原样暴露给普通用户，也不表示 Pi 可以取代 Synara 的 Product Orchestration/Thread/Workbench owner。OmniMind 可以使用独立产品 identity、`.omnimind` private state、双语 Workbench projection、AgentGateway 执行与产品随附 Extension，但这些增强应通过 Pi 公开或已证明的 native seam 窄接入，不在 adapter 外重建 Pi 已拥有的 Session、Registry、loader、active store、package lifecycle 或第二 Agent runtime。把自建系统改名为“Pi-compatible Extension”不算对齐；真实 owner、调用链和生命周期必须进入 Pi native composition。

只要拟议偏离 Pi 的哲学、公开 API、owner、生命周期或技术路线，或对 exact Pi 实际行为存在会改变结论的不确定，Agent 必须先停在只读/可逆安全边界，用 junior 能理解的方式向维护者说清：

1. Pi 原生是怎么工作的，现在 exact source/runtime 已经提供了什么；
2. OmniMind 真正遇到的用户结果缺口或安全/交付缺口是什么；
3. 为什么配置、原生 Extension/Package/Tool seam、窄 bridge 或 upstream patch 不足以解决；
4. 拟议偏离会改变哪些调用链、默认行为、同步成本、兼容性、安全与回滚路径；
5. Agent 推荐什么、理由是什么，以及如何用 exact-source conformance 和真实 journey 证伪。

维护者是这类偏离与真实分叉的最终决策者。获得明确决定前，不得因为 OmniMind 能够 fork、代码更容易重写、或抽象看起来更整齐就离开 Pi 路线。已经清楚属于 Pi 原生 owner 内的局部实现、不会增加长期责任的窄接线和经授权的固定产品 divergence 继续直接完成，不需要对每个变量重复请示。

### 1.2 冲突裁决没有中间地带

归类为 OmniMind Agent 的Pi运行时机制后，当现有adapter、自建机制、其他Engine donor、第三方package或新抽象与exact bundled Pi的公开seam和生命周期冲突时，**Pi在ModelRuntime/AgentSession、agent loop、context/compaction、资源注册、Tool Registry/active set、reload与Provider wire范围内默认胜出**；只有维护者已明确批准并记录的fixed OmniMind divergence可以覆盖该默认。

不得用一个“中间层”同时保留 Pi 与自建的两套 Registry、Session truth、active store、Package lifecycle、Tool authority、Prompt composition 或 resume/recovery；不得用改名、wrapper、双写、兼容双轨或“以后再切换”逃避 owner 裁决。如果 Pi 的 exact 机制还没查清、冲突两边都有重要用户结果，或责任同时跨越 Pi 内核与 Synara Product projection，Agent 必须停在只读/可逆边界，用通俗语言把冲突、选项、损失和推荐说给维护者，等待唯一决定。

这个默认不转移业务owner：AgentGateway继续唯一拥有OmniMind Host canonical catalog、schema、execution、credential、permission/turn authority、timeout与cancel；Pi Extension只负责把这些definitions投影进Pi的注册/active/wire lifecycle。Product Thread、Timeline、Workbench、Product Orchestration、Queue/receipt与跨Provider用户事实听Synara。third-party Extension/MCP仍由各自来源拥有config、secret、transport、server/process lifecycle与business state，进入Pi Registry不使其成为Pi或Host业务能力。仍不能唯一归类时，不允许Agent自行选边或建立折中双轨，只能请维护者裁决。

本文要防止两种同样昂贵的错误：

- **重复造轮子**：忽略 Pi/Engine 已有的 session、tool loop、compaction、skill、extension 等原语；
- **生态绑架产品**：为采用一个 package，引入与既有产品事实并行的第二份 Goal、Run、Scheduler、Memory、权限、UI、private home 或生命周期 owner。成熟母体已在同一 Orchestration 内拥有的字段和生命周期不属于这一类。

专用手册优先：exact source 是 Synara commit 时，即使变更触及 Pi adapter、Tool、MCP 或 Agent 行为，也只按 `SYNARA-INTAKE.md` 完成一次 intake；本文只适用于 exact source 本身来自 Pi Core/package/extension/skill/prompt/tool/MCP 或其他 Agent Engine donor 的情况。

## 2. 权威边界与必读顺序

每次 intake 必须在同一个精确工作区、同一轮上下文中按以下顺序完整读取：

1. [`README.md`](README.md)：产品定义、承诺与总入口；
2. 本文 [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)：intake 方法与授权边界；
3. [`architecture/README.md`](architecture/README.md) 及任务涉及的专题 owner：唯一产品事实；
4. [`execution-brief.md`](execution-brief.md)：当前工作目标、并发协调、真实阻塞与下一动作；
5. [`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)：仅在 active 时读取状态与证据指针；
6. [`research/README.md`](research/README.md) 路由的相关 evidence owner；

权威关系不可倒置：

- `architecture/*` 决定“产品是什么”；
- `execution-brief.md` 协调“现在正在做什么、有哪些真实冲突或依赖”；维护者对完整 decision surface 的明确确认拥有采用决定，brief 不能再设第二否决权；
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
- **Gate B：实施候选。** 维护者确认本轮 exact source set 的完整 decision surface，且没有未解决的真实 owner/并发/安全冲突后即可进入。`execution-brief.md` 负责记录和协调这些事实，不另行授予或撤销维护者授权。

“长期默认尽量吸收生态”“可以重构一切”不是 Gate B 授权。它们要求更严谨地比较，不授权跳过来源身份、隔离、产品 owner 或交付门。

## 4. Intake 的基本单位

Intake 的基本单位不是“一个仓库”，而是：

```text
exact artifact
+ exact source revision
+ exact dependency closure
+ exact runtime/profile/config
+ exact host adapter / Engine binary or SDK / protocol seam
+ exact current OmniMind integration path and stable symbol, or explicit absence/proposed owner
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

Pi Extension 进入 OmniMind Agent composition 前还必须明确其来源与长期责任模式，不得因为最终都是 Pi `ToolDefinition` 就混同 owner：

| 模式                              | 产品与运行时边界                                                                                                                                | 必须承担                                                                                    | 不自动获得                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| OmniMind 自有、产品随附 Extension | OmniMind 编写并维护，只在明确的 Provider/Session surface 注册                                                                                   | definition、prompt、lifecycle、回归、发行与回滚                                             | AgentGateway owner、跨 Engine 分发或 Host Built-in policy                                   |
| OmniMind Host 投影 Extension      | OmniMind只拥有AgentGateway canonical definitions到Pi Registry的投影；loading lifecycle服从该具体Extension已确认的eager或owner-local dynamic语义 | 投影、collision/provenance、Session装配、Pi wire兼容；当前Host eager时直接注册并active      | Gateway tool的执行、状态、credential、权限、全局search或其他Extension的active-set authority |
| Fork 后修改上游 Extension         | 保留 exact upstream lineage，OmniMind 发行并维护有界 patch                                                                                      | license/notice、作者测试、patch inventory、安全与兼容修复、upstream sync、回滚/退出         | 被重命名为第一方、成为 Host tool、跨 Engine 分发或新的产品控制面                            |
| 直接安装上游 Extension            | 保留上游 package identity、version、provenance 与语义，由 Pi 原生 package/extension lifecycle 管理                                              | exact artifact、rights、兼容/安全证据、原生 install/update/remove/reload 与准确 unavailable | OmniMind 对其业务状态的所有权、默认预装、静默修改、Host search 或跨 Engine 投影             |

同一上游 Extension 不能同时被记为“直接安装”和“fork 后修改”。两者之间切换会改变法定来源、更新与安全 owner、回滚方式和长期同步成本，必须重开 exact-source intake 并获得维护者确认。这个分类是证据与 owner 合同，不授权新建 Extension registry、manifest、Settings 或安装控制面。

Dynamic Tool Loading不是OmniMind Agent或Host的全局默认策略。每个具体Extension必须由自己的工具规模、稀疏使用、schema/attention成本、activator和恢复语义决定eager或dynamic；没有可信activator的tool不得设为inactive。owner-local loader只能发现和激活该Extension自己的tools。未来Pi upstream若提供真正的全局发现机制，先复核并采用upstream owner；不得以“生态统一”为由恢复OmniMind Host/global search、第二索引、dependency graph或Plugin Manager。

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

若候选接入方案会重大自创或偏离上游，并新增 owner、state、lifecycle、public contract、control plane 或长期兼容责任，进入 Gate B 施工前必须先用新手可理解的语言向维护者说明上游原行为、当前精确缺口、拟议偏离、全局调用链与维护影响、以及回滚方式，并获得明确授权；既有 owner 内不增加长期责任的普通局部实现无需逐变量请示。不得让单一 adapter/module 静默同时拥有 definition、prompt、lifecycle、authority 与 event projection。

每个采用结论必须分别记录三层事实，不能互相外推：

- **source retained**：上游 ancestry、目录、作者测试和未激活源码保留了什么；
- **shipped bytes/exports**：真实发行依赖包含、导出了什么；
- **runtime activation**：OmniMind product code实际 import、注册和启动了哪些 tool/schema/listener/timer/process/owner。

源码或发行包中存在 Mission/Fleet/Schedule/VM 不等于产品激活；反过来，仅隐藏入口也不能证明 runtime没有 ambient副作用。

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

| Disposition                   | 含义                                      | 适用条件                                                |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| **Preserve / adopt directly** | 保留或直接采用 exact artifact             | owner 与产品一致，公开 seam 稳定，隔离和 journey 已证明 |
| **Configure / curate**        | 原包保留，只用配置或资产策展缩小表面      | 关闭项真的不注册 owner，而非仅隐藏                      |
| **Bridge narrowly**           | 用窄 adapter 接入现有 owner               | 不复制 lifecycle/state/policy，桥可删除                 |
| **Translate mechanism**       | 吸收算法、状态机 guard 或测试，不运行原包 | 原包 owner 冲突，但机制有独立价值                       |
| **Donor / comparator**        | 只作代码供体、对照组或实验基线            | 尚不具备产品准入条件                                    |
| **Defer with trigger**        | 当前不采用；写明唯一重开条件              | 证据不足、时机未到或需要 upstream seam                  |
| **Decline, retain insight**   | 拒绝运行时与长期责任，只保留洞察          | 净收益为负或违反 owner                                  |
| **Fork narrowly**             | 最后手段；只维护最小 patch inventory      | 配置/桥/翻译均失败，基准证明收益，维护者再次授权        |

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
- child 继承 canonical Root effective instructions；若关闭 child 自行扫描 context files，必须证明 Root 的 `AGENTS.md`/project instructions、cwd 与适用 authority 已通过唯一 prompt owner 准确投影，不能让两条 instruction discovery 路径并存；
- exact model 解析遵循“本次明确指定 → 已配置的角色默认 → inherit Root”，不可用时准确失败；不同 provider/model 只是 exact selection，不产生 Router、模型池或 silent fallback；
- foreground/background、targeted child abort、parent stop-all、timeout、process group、orphan cleanup 与 late-result suppression；不得把 Root steer、child steer、内部 resume 和 App crash recovery混成一个“control 已支持”；
- `completed / failed / cancelled / timed_out / crashed / interrupted` 等终态、usage、result、provenance、stderr、partial output 与 settlement 只有一个真相；未知不能伪装成失败或成功；
- 同一 Root delegation tree 内只有 Root 或一个 foreground child 写；不同 Thread 与外部编辑器可以并存，但结构化写入必须复用现有 observed-version/atomic conflict truth，冲突时 fail closed，除非真实 falsifier 证明不足，不建立 workspace-global writer DB/lock service；
- Root capability ceiling ∩ role ceiling ∩ per-call allowlist 在 Extension/Skill/MCP bind 后再次收口；角色名本身不是权限证明；
- session-only secret 没有安全桥时准确 unavailable，不经 argv、日志或宽环境变量传给 child；
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

Knowledge、Memory、Thread Recap 与 Engine-native resume/memory 是四种不同责任。首次公开发行默认继续使用 raw workspace files + `rg/read` + Product Thread + native session/compaction；自动 Project Context 不因“可以写 Markdown”而自动准入。

只有代表性重复任务证明最小 source packet 或 derived Markdown 相对 raw files 明显改善任务质量、token/latency/cost 或恢复结果，且收益覆盖长期 writer 的维护责任时，才重开独立 Gate A。重开后必须额外证明：

- provenance、scope、correction、forget、staleness、source deletion、矛盾、版本与崩溃恢复；
- 外部来源始终是 data，不能升级为 instruction authority；
- 最多一个 project-local writer；无 personal/global vault、vector/graph DB、常驻 daemon或第二 scheduler；
- 不保存完整 transcript、raw reasoning、secret、personal directory 或 subagent 中间猜测；
- 不读取、镜像或合并 Engine private home；native memory 继续拥有自己的目录、格式、retention 与 lifecycle；
- 正文 JIT，不把 wiki/memory 塞入稳定 prefix；forget 后不会因 cache/index/replay 复活；
- 自动默认开启前，必须在可用环境得到代表性 PASS，不能用“准确 unavailable”替代产品能力。

在该 Gate 通过前，不预建 Memory/Knowledge path、index、setting、图标、后台 job、writer queue 或 UI pane。

### 8.4 Engine-native capability

Codex、Claude Code、OpenCode 等能力必须通过各自官方 seam 评估：

- 先记录 OmniMind 当前真实 adapter、锁定的 Engine binary/SDK 版本与调用路径，再讨论新增 launcher 或配置入口；
- 原生 auth/session/resume/permission/plugin 仍由 Engine 拥有；
- OmniMind 只通过已证明的官方 seam 加法挂载兼容的普通 Skill、Prompt、Tool、MCP 或其他可替换 component；不建立 Capability Pack 产品、runtime、registry、安装单元或控制面；
- `native`、`projected`、`unavailable` 逐项验真；
- Engine-specific hooks、commands、subagents、permission 不伪装成跨 Engine 通用能力；
- process-scoped seam 必须证明线程隔离或使用 dedicated process。
- official docs 只证明当前可能的公开 seam；生产结论还要 feature-detect exact installed version，并从 Engine 的 init/list/status 回报建立 loaded inventory；
- 同名冲突审计同时覆盖 native 配置、OmniMind session overlay、动态注册和 UI display name。即使不改 source home，session 层静默遮蔽仍是冲突；
- 现有 OmniMind 注入也受本节约束，不能因它是 first-party 就跳过 namespace、credential、settlement 和 shutdown 审计。

### 8.5 用户可见 projection / package UI

外部 package 带有 TUI、card、command、status view、notification 或完整 dashboard 时，**默认只把它当机制证据，不把它当 OmniMind 产品母版**。Gate A 必须把“runtime/state/action 值得继承”与“原作者 UI 值得继承”拆成两个独立结论：可以保留公开 state/action seam，同时拒绝其可见组件、导航、术语和聚合模型。

每个候选能力在进入 Gate B 前必须完成一张最小 projection map，并链接到 [`architecture/workbench.md`](architecture/workbench.md) 的现有 owner：

| 问题                 | 必须得到的结论                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 平时是否需要 UI      | `none / quiet receipt / active control / blocking intervention` 四选一，以最低充分级别为准                                                               |
| 用户此刻为什么看见它 | 当前可行动、可恢复、可追溯或必须人工介入；“package 注册了功能”不是理由                                                                                   |
| 现有宿主是谁         | Timeline、Composer stack、Environment、RightDock、Files/Diff、Browser/Device、Settings/Library 或现有 child Thread；没有证据不得新增顶层 route/pane/card |
| 同一事实如何避免重复 | 每个投影必须有独占职责和生命周期；共享 canonical identity/state/action，不复制 timer、list、optimistic command 或 terminal truth                         |
| 完成后留下什么       | 运行控制退场；durable result 回到文件、Thread、Activity 或已有索引；不靠常驻“已完成卡”证明能力存在                                                       |
| 规模与维护如何证明   | 用真实最小/典型/压力 fixture 验证密度、搜索/筛选、键盘、双语、reduced motion、hidden/background 和 continuous update；不能只看作者 demo                  |

对 subagent/workflow 类候选还要额外证明：同一 child 在 Composer、Timeline、详情和 child Thread 保持稳定 identity；产品只显示真实可用的 stop/background/message 等动作。默认使用现有列表、child Thread、Timeline、Files/Diff 和低噪声摘要；只有真实规模与 dependency facts 证明列表无法完成判断时，才重开 renderer bake-off。不能从时间顺序、文案或 tool activity 猜 DAG，也不得借 renderer 引入 editor、canvas document、第二 Workflow runtime 或 layout database。

名称与图标属于产品词汇 owner，而不是 package/Engine 私有皮肤：Skill、Plugin 以及同一 canonical asset 跨入口保持同名、同义、同一图标；`native / projected / unavailable / conflict` 可以准确显示来源差异，但不得把一个概念复制成多个用户对象。图标先审计并复用现有产品/Central 资产；只有没有语义可用、尺寸可读且不冲突的既有资产时，才允许提出 custom glyph，并且必须先证明新增资产比经典行业语义更清楚。任何新用户可见文案同时闭合简体中文和英文。

## 9. Gate B：实施与晋级

进入 Gate B 前必须同时满足：

1. Gate A exact source set 已闭合；
2. 维护者确认本轮 disposition；
3. 当前工作区、并发与 owner 没有未解决的真实冲突，`execution-brief.md` 已准确反映本轮目标；
4. owner、成功条件、失败条件和回滚明确；
5. 没有未解决的产品权威冲突。

实施规则：

- 一个切片只闭合一个用户结果；
- 先接最小表面，再用真实证据扩大；
- 不把候选 package 的 UI、state、scheduler、permission 一并带入；
- 不修改 Provider private home；
- 新用户可见文案同时交付简体中文和英文；
- 新状态必须证明现有 owner 无法表达；
- 普通、focused、可逆的采用可在 owner、测试和交付证据闭合后关闭对应 claim；发行、签名、安全、迁移、权限、秘密及其他高风险 claim 仍需独立裁决，不能由实施者用局部绿色自证。

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
- 当前目标、并发、阻塞与下一动作只更新 `execution-brief.md`；
- claim 状态只更新 active Campaign；
- 本文只在 intake 方法本身变化时更新。

不要在多个文档复制版本表、施工状态或完整风险登记。使用链接和精确路径，避免未来同步漂移。

代码证据必须记录仓库完整路径与稳定 symbol，不以 basename 或旧行号作为唯一定位。若 `Layers/` 与 `Services/` 存在同名文件，必须明确区分运行实现与接口/tag；若代码只是移动而 owner 不变，只更新 evidence 路由，不改写产品 architecture。外部 README、官方文档和类型声明只能证明候选能力；OmniMind 已接入与否仍必须由当前 adapter wiring、init/list/status 或真实 journey 证明。

研究设计与执行指南可以保存长期稳定的 falsifier、proof protocol 与 stop-loss，但不得保存固定阶段门、授予当前准入或把证据快照冒充 current progress/next action。新会话实时读取 `execution-brief.md` 只为识别当前目标与真实冲突；维护者确认过的完整 decision surface 不需要再由 brief 或研究指南二次批准。

## 12. Stop conditions

出现以下任一情况立即停止采用或升级：

- exact artifact 与 source 无法对应；
- license、provenance 或 dependency closure 不清；
- 需要读取/写入真实 Provider private home 才能工作；
- 需要与 OmniMind 当前 sole owner 并行的第二份 Product Thread、Goal、Run、Queue、Scheduler、Memory、权限或更新 owner；继承母体在同一 Orchestration 内的既有 owner 不触发本条；
- 关闭配置只隐藏 UI，实际 writer/listener/schema 仍存在；
- secret 可能进入 argv、日志、cache、child env 或模型上下文；
- abort/timeout/retry/settlement 不能给出唯一 terminal truth；
- packaged journey 无法隔离、回滚或重现；
- 候选不优于更简单基线，或收益不足以覆盖长期维护；
- `execution-brief.md` 暴露尚未解决的同文件并发、owner 冲突、安全阻断或外部依赖；仅有历史阶段/顺序不构成阻断；
- 相同失败在没有新假设时重复出现。

停止不等于研究失败。应保留可独立复用的机制、测试与反证，并删除运行时责任。

## 13. 新会话交接模板

新会话开始一轮 intake 时，首个工作输出应包含：

```text
Workspace / branch / HEAD / dirty paths:
Applicable authority owners:
Current execution goal / real conflicts:
Candidate exact artifact/source/dependencies:
Exact OmniMind integration path/symbol: existing | absent/proposed owner
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
