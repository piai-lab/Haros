# Synara Intake Profile

> 本文只拥有 Synara 作为产品母体时的默认采用关系、domain split、reconciliation 与人工决策边界。公共 Gate、freshness、disposition、实施、验证和状态规则唯一见 [`SOURCE-INTAKE.md`](SOURCE-INTAKE.md)。

## 1. 核心立场

Synara 是 upstream product platform；OmniMind 是它的 downstream distribution，不是面对陌生 donor 的补丁集合。除固定 divergence 外，Synara 成熟且适用的产品机制默认进入 OmniMind。

每轮同时理解三层：

1. **产品保证**：用户 journey、owner、状态、失败、恢复和作者测试；
2. **母体实现**：exact source 如何交付这些保证；
3. **OmniMind 差异**：品牌与双语、OmniMind Agent/Provider、stock Pi 隔离、public identity/release/account，以及有证据的更强安全边界。

母体默认不等于盲目复制。采用优化的是相对 Synara 的长期偏离、owner 数量和未来修改半径；直接复制会制造第二 truth 时，应该把保证接入现有 canonical owner，并保留可推翻回退的作者回归。

## 2. Domain split

### 2.1 Synara 产品母体域

以下事实默认听 Synara：

- Product Orchestration、Project、Thread、Space、Conversation、Queue、receipt；
- Timeline、Workbench、Composer、Browser、Settings 和其他用户可见产品 projection；
- Provider 共同产品事实、恢复与公共交互模式；
- public surface、反馈边界和非 Agent 产品 journey。

归类为母体域后，exact Synara 与 OmniMind 现有实现、其他 donor、新抽象或个人偏好冲突时，**Synara 默认胜出**。只有维护者已明确决定并进入稳定 owner 的 fixed OmniMind divergence 可覆盖；不得取平均、保留两套 store/route/UI 或加 compatibility layer 逃避选择。

### 2.2 Pi 运行时机制域

OmniMind Agent 内部的 ModelRuntime/AgentSession、agent loop、context/compaction，以及 Extension/Package/Skill/Prompt/Tool/MCP 在 Pi 中的 discovery、registration、active set、reload 与 Provider wire，听 [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)。

这不转移业务 owner：

- AgentGateway 继续拥有 Host canonical catalog、schema、execution、credential、permission/turn authority、timeout 与 cancel；
- third-party Extension/MCP 继续拥有自己的 config、secret、transport、process 与 business state；
- Product Thread、Timeline、Workbench 与 Queue/receipt 仍属于产品母体域。

exact source 是 Synara commit 时，即使 diff 含 Pi adapter、Tool、MCP 或 Agent 行为，也只对该 Synara source set 运行一次本 profile；不要叠加第二次 Pi Gate。只有 exact source 本身来自 Pi Core/package/extension/skill/prompt/tool/MCP 或其他 Agent Engine donor 时才走 Pi profile。

### 2.3 来源形态不能被 adapter 洗白

Synara source set 带入 Pi-compatible Extension 时，必须识别它究竟是 Synara/OmniMind 自有随附、继承 fork/patch，还是由 Provider 原生 lifecycle 直接安装的第三方 package。文件出现在母体树中或被 adapter 加载，不会自动改变第一方归属、维护责任、分发 owner 或运行时注册事实。

直接安装与 fork/modify 之间的转换会改变 rights、安全/更新 owner、回滚和同步责任，属于需要维护者决定的重大 divergence。

## 3. 触发、意图与必读入口

用户主动要求审查、借鉴、吸收、同步、更新或跟进 Synara 时触发本 profile。不会自动轮询或静默追上游。

先按根 [`AGENTS.md`](AGENTS.md) 读取产品与任务 owner，再完整读取：

1. 公共 [`SOURCE-INTAKE.md`](SOURCE-INTAKE.md)；
2. 本 profile；
3. [`source-adoptions.json`](source-adoptions.json) 中 Synara exact adoption；
4. 与本轮责任相关的 architecture owner；
5. 只有来源、既往 disposition 或反证相关时，才读 [`research/source-review.md`](research/source-review.md)。

先声明本轮意图：

- **scoped source review**：停在只读建议；
- **adopted-head advancement**：目标是前移 production-adopted Synara revision。

历史聊天、旧 handoff、研究中的阶段字段和更新时间都不能补齐当前 authority。`execution-brief.md` 只协调真实并发、依赖与阻塞，不能在维护者已决定完整 decision surface 后另设准入门。

## 4. Synara standing default

### 4.1 默认进入，不逐项请示

在母体域内，且不越过 fixed divergence、不引入新的高风险责任时，以下变化默认进入 Gate B：

- bugfix、性能、可访问性、稳定性和错误/恢复改进；
- 既有 journey、owner、state machine 与 interaction pattern 的成熟延续；
- 作者测试、失败覆盖和生命周期修复；
- 与 OmniMind 当前结果相同或更强、可由现有 owner 承接的保证；
- 上游已提供等价 public seam 后，删除本地 patch、adapter、fallback 或第二 truth；
- 必要的品牌、双语、namespace 和窄 typed product translation。

`Adopt directly`、`Adopt via existing owner` 与固定边界内的 `Translate semantically` 都是采用结果。尤其是 existing-owner adoption：必须写清上游保证进入哪个 owner、保留哪条作者 regression 或等价 falsifier；不能再用 `already covered` 把一个混合 commit 的有效机制整块跳过。

### 4.2 必须展示并取得维护者决定

只有以下 decision surface 需要再次确认：

- material defer、decline 或 identity/legal/release exclusion；
- fixed divergence 的新增、删除或实质变化；
- 新的一级入口、用户概念、持久对象、默认外部副作用；
- 新 owner、state、lifecycle、public contract、control plane 或长期兼容责任；
- migration、权限、秘密、安全、发行、高费用或不可逆外部动作；
- 两个方案都会改变用户结果，且现有 owner 与证据不能唯一裁决。

展示时必须说清“不纳入会失去什么、为什么仍建议不纳入、什么证据会改变建议”。安全风险可以阻止实施，但不能被写成维护者已经同意的产品取舍。

触发器、适用范围、损失与风险均未变化的 standing divergence 自动继承；报告命中与证据即可，不重复索取口令。确认后 candidate、base、owner、真实调用链或建议发生 material 变化，只重开变化行。

### 4.3 不该问维护者的事

来源版本、changed paths、调用链、作者测试、rights、现有 owner、当前实现是否已覆盖等可搜索事实由 Agent 查清。默认吸收项也不应被拆成几十个“是否同意”。维护者只裁决真实损失、风险承担与产品分叉。

## 5. Reconciliation mode

### Linear incremental advancement

candidate 是 adopted head 的 descendant，且上轮全树基线、manifest substrate、关键 owner、fixed divergence 和 rights 边界仍有效时：

- 闭合新的 exact commit range 与全部 changed paths；
- 按 observable guarantee + owner + failure boundary + author regression 拆分混合 commit；
- 审查受影响 consumer 和被本轮变化触发的历史 divergence；
- 复用触发器未变化的既有全树证明，不重新枚举整棵树。

### Baseline reconciliation

出现以下任一情况时升级为 baseline：首次建立可信基线；candidate 非 descendant 或历史改写；manifest production substrate、关键 owner、来源/rights 边界 material 变化；既有全树证据被反例推翻。

baseline 对 `source-adoptions.json` 声明的 Synara production substrate 完成 whole-tree accounting，至少覆盖 upstream-only、downstream-only、同路径分叉，以及依赖、构建、生成物、资产和法律 transitive closure。

不能证明 linear 前提时不得假设旧证据仍有效；前提成立时也不得把全树重算变成仪式。

## 6. 完整覆盖算法

### 6.1 Range 证明

使用 commit 与 changed-path 清单证明来源范围无遗漏。对 merge、revert、binary asset、lockfile、generated/release 文件明确归类。

### 6.2 行为证明

对每个 material guarantee 记录：

| Observable guarantee | Canonical owner / current evidence | Disposition | Loss or divergence | Required proof | Decision if needed |
| -------------------- | ---------------------------------- | ----------- | ------------------ | -------------- | ------------------ |

一个 commit 可以有多行；一个保证也可以引用多个 commits。完成条件是 commit/path coverage 完整、material guarantee 未分类项为零，而不是人为让 change-unit 计数相等。

### 6.3 Tree / path reconciliation

linear mode 闭合 changed paths、受影响责任和复用基线；baseline mode 闭合 whole tree。两者都必须解释：

- upstream 新增但 downstream 未保留的内容；
- downstream-only 的 fixed divergence；
- 同路径不同实现是否是窄 translation、`Adopt via existing owner`，还是未获批准的漂移；
- source retained、shipped bytes 与 runtime activated 的差异。

## 7. Gate B 的 Synara 实施顺序

在公共 Gate B 规则上，按以下优先级选实现：

1. 同版本配置或接线；
2. 直接采用母体 public seam / component / state machine；
3. 在现有 owner 内 semantic translation；
4. 必要的 upstream-compatible patch；
5. 只有维护者明确批准时才建立新的 OmniMind divergence。

若上游变化暴露同一获准责任内的重复 truth、consumer 特判、万能 adapter、第二 cache/writer 或旧支持图，必须完成 owner cut，不能用逐 consumer 补丁把“吸收”做成新的同步税。

任何新自创或母体偏离若会增加长期 owner、state、lifecycle、public contract 或 control plane，施工前用新手可理解的语言说明母体原行为、当前缺口、拟议偏离、全局影响、维护成本与回滚，再取得明确授权。

## 8. Synara claim 的证据选择

沿用公共 claim-driven matrix，不因为 source 是母体就固定跑完整 packaged journey：

- 文档、来源、rights：文档合同、exact range/tree、artifact/license；
- 纯 presentation：focused browser/component/pixel + 必要时人工视觉；
- Product state/恢复/权限：对应 owner 的 contract/integration fixture；
- Provider wire：只有本轮修改真实触及 wire/stream/tool/usage 时做 live；
- packaged/profile/reopen：只有 shipped bytes、Electron seam 或安装后行为是 claim 时，对冻结的同一 SHA 做一次 fresh isolated proof；
- release/signing/feed：始终独立。

OmniMind Agent 的 MiMo/DeepSeek 与全链路只在本轮 Synara source 真实改变跨 Provider 或 Agent runtime claim 时进入，不是所有母体 intake 的默认税。Computer Use 只作为无法用程序化或可靠人工证据覆盖的 OS-surface fallback。

## 9. 完成定义

### Scoped review complete

- exact scope、freshness、rights 与真实 journey 已固定；
- 建议按 guarantee/owner/failure boundary 可证伪；
- material decision surface 已清楚；
- 明确声明未进入 Gate B、未更新 adopted head、未证明产品已采用。

### Adopted-head advancement complete

- linear 或 baseline accounting 与前提匹配；
- 所有 material guarantee 有唯一 disposition；
- 默认采用项已进入真实 owner，建议未纳入项与新增高风险已获决定；
- rights、author regression、产品适配和 claim-matched proof 闭合；
- `source-adoptions.json`、相关 architecture、`research/source-review.md` 与当前状态没有互相冲突；
- 重复 truth 与被上游替代的 divergence 已退休；
- source retained、shipped、activated 与 release 状态表述准确。

## 10. Stop 与重新进入

除公共 stop conditions 外，以下情况立即停止 adopted-head advancement：

- candidate 不是 adopted head 的 descendant，却仍声称只审查新 range；
- 不能区分 Synara 产品母体 owner 与 Pi runtime / third-party business owner；
- 试图用新 compatibility layer、第二 store 或平行 UI 同时保留冲突语义；
- 历史实现存在，但找不到对应的有效 divergence 决定；
- 一个混合 commit 被单一 disposition 掩盖了 material loss。

后续更新从 `source-adoptions.json` 的 exact adopted revision 进入。descendant 且基线有效则 linear；否则 baseline。普通实现若只是维护已采用保证，不自动重开 source intake；只有 exact source 前移、保证解释有争议、准备改变 divergence，或 architecture/tests 已不能证明当前结果时才重进。
