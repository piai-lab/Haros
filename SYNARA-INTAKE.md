# Synara Intake

本文件是 OmniMind 持续审查、借鉴、吸收和更新 Synara 的唯一操作手册。它长期有效，适用于未来每一次由维护者发起的 Synara intake；不保存某一轮更新的具体结论，也不取代产品、架构、研究证据、施工顺序或 Campaign 的既有 owner。

OmniMind 会持续吸收 Synara。这里的“持续”表示长期保持 source-first、主动理解和优先采用的产品战略，不表示自动轮询、静默拉取、无人批准合并或永久授权未来未知代码进入产品。

本手册允许两种必须准确区分的结果：

- **scoped source review**：只读研究维护者指定的 commit、PR、机制或责任域，形成可复核的理解、风险与建议；它不得进入 Gate B、更新 production-adopted head，或把研究结论写成产品已经采用；
- **adopted-head advancement**：准备把新的 Synara 母体机制正式吸收进 OmniMind，并推进 README 中的 production-adopted revision；它必须闭合完整 range、whole-tree path/behavior、作者测试、权利、维护者偏离确认与交付证据。

触发本手册只表示开始按 source-first 方法工作，不自动把 scoped review 升级为 adopted-head advancement，也不允许把正式采用降格成局部代码借鉴。Agent 必须按维护者的真实意图判断：仅要求“看看、比较、研究”时默认停在 scoped source review；明确要求“吸收、同步、更新”时进入 adopted-head advancement。若语境无法唯一判断是否授权产品采用，先用 `$converge` 收敛这一项，不按关键词机械推断。

## 1. 核心立场

Synara 是 upstream product platform；OmniMind 是它的 downstream distribution，而不是面对陌生 donor 的补丁集合。OmniMind 负责品牌与双语、OmniMind Agent/Provider 增强、stock Pi 隔离、发行/account/public identity，以及有证据的更强安全差异。除这些固定 divergence 外，Synara 成熟且适用的产品机制默认进入 downstream。每次 intake 都必须同时理解三层内容：

1. 上游代码在 Synara 当前架构中的具体实现；
2. 实现携带的机制、不变量、失败模型和测试；
3. 作者解决问题时体现的产品判断、交互品味和用户结果。

### 1.1 OmniMind 非 Agent 产品面以 Synara 为母体

OmniMind Agent 内核之外的产品部分——包括 Desktop shell、Workbench、Project/Thread/Space、Product Orchestration、Queue/receipt/recovery、Settings、Provider 共同投影与其他母体已有用户旅程——默认以 exact Synara 的产品判断、owner、数据流、生命周期、失败/恢复和作者测试为主。优先完整继承、接线或做必要的 OmniMind 品牌/双语/身份翻译，不因本地代码已经分叉、抽象不同或重写更容易就改变母体路线。

只要出现任何拟议偏离，或对 Synara 原行为、用户结果、owner、数据/生命周期、安全、交付证据存在会改变结论的不确定，Agent 都必须先暂停该分支，用 junior 能理解的方式向维护者说清：

1. Synara 原本怎么工作，用户会看到什么；
2. OmniMind 当前与它哪里不同，或哪个事实还没查清；
3. 可选路线各自会带来什么用户结果、风险和长期维护成本；
4. Agent 推荐哪条及具体理由，如何验证和回滚。

维护者是这类偏离与真实分叉的最终决策者。获得明确决定前不得以“更现代”“更简洁”“OmniMind 已经不一样”或 Agent 自己的审美替代裁决。这个提问门只针对真实偏离或会改变结论的不确定；已明确的母体语义内、不增加长期责任的局部实现继续直接完成。

OmniMind Agent 的内核、Pi-native Session/Extension/Package/Skill/Prompt/Tool/MCP 与模型执行路线改由 [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md) 深度对齐 Pi；但 Agent 产生的 Thread、Timeline、Workbench 和其他 Product projection 仍属于 Synara 母体产品 owner，不因 runtime 采用 Pi 就另建产品世界。

### 1.2 冲突裁决没有中间地带

先按责任而不是文件名、代码所在模块或实现方便程度归类：

- Desktop shell、Workbench、Project/Thread/Space、Product Orchestration、Queue/receipt/recovery、Settings、跨 Provider 的用户事实与产品投影属于 **Synara 产品母体域**；
- OmniMind Agent内部的ModelRuntime/AgentSession、agent loop、context/compaction，以及Extension/Package/Skill/Prompt/Tool/MCP进入Pi时的注册、active set、reload与Provider wire属于 **Pi运行时机制域**。这不转移它们的业务owner：AgentGateway仍拥有OmniMind Host catalog/execution/credential/permission/turn authority/cancel；third-party Extension/MCP仍拥有自己的config、secret、transport与business state。

归类为 Synara 产品母体域后，当 OmniMind 现有实现、其他 donor、新抽象或个人偏好与 exact Synara 冲突时，**Synara 默认胜出**；只有维护者已明确批准并记录的 fixed OmniMind divergence 可以覆盖该默认。不得把两套语义取平均、部分各留一套、加 compatibility layer 或新建第二 owner 来逃避选择。

如果 Agent 无法确定一项责任属于哪个域，发现两份权威文档给出不兼容要求，或一个变更同时改变 Synara 产品事实与 Pi 内核生命周期，必须立即停止做产品假设，把冲突两边各自的原行为、用户影响、代价和推荐用通俗语言说给维护者，并等待裁决。不存在“先做个折中版本”或“等实现后再选 owner”的中间状态。

默认假设是上游改动有价值，并尽可能吸收。不同架构只说明需要翻译，不构成拒绝理由；合并困难、改动较大、文件冲突或 OmniMind 已经改过同一位置，也都不是拒绝理由。

这项偏好不是盲从。任何直接或语义吸收都必须证明：

- 它解决的真实问题在 OmniMind 中仍成立；
- 它不会取代 OmniMind 已确认的唯一产品权威；
- 它不会引入第二个 Registry、Orchestration、Session、settings、permission、update、storage 或 recovery owner；
- 它不会泄漏 donor 品牌、发行身份、凭据或不适用的迁移语义；
- 它的用户结果、失败边界和长期维护成本优于不吸收或现有实现；
- 它有与风险相称、能证伪结论的验证路径。

最终目标不是让 OmniMind 的 Git diff 看起来像 Synara，而是让 Synara 最强的产品判断和工程保证以 OmniMind-native 的方式真实存在。

长期 invariant：**默认完整继承母体；增强必须窄、可证伪、复用既有 owner，且不得增加第二权威或不成比例的长期同步责任。**“比母体更好”只能由更顺的用户 journey、更可靠的恢复、更清楚的诊断、更完整的双语、更自然的 OmniMind Agent/Provider/Group 集成，或可证明的安全/性能提升来说明；文件、抽象、设置和 wrapper 更多不算提升。若收益不足以覆盖新增长期责任，保持上游机制。

“唯一 owner”必须按真实继承关系判断。Synara 已经位于 OmniMind 继承的同一 Product Orchestration、Thread、command/event/projection 与 Workbench 内时，其成熟字段和生命周期是母体产品能力，不因名称是 Goal、Todo、Queue 或 Scheduler 就自动成为“第二控制面”。只有候选另建并行数据库、writer、command path、timer/recovery authority 或用户事实时，才构成第二 owner。不得先把母体能力切碎，再以避免第二 owner 为由重建较弱版本。

若拟议的 OmniMind 自创或母体偏离会新增 owner、state、lifecycle、public contract、control plane 或长期兼容责任，进入施工前必须先用新手可理解的语言向维护者说明母体原行为、当前精确缺口、拟议偏离、全局影响与回滚，并获得明确授权；既有 owner 内不增加长期责任的普通局部翻译无需逐变量请示。禁止单一 adapter/module 静默横跨 definition、prompt、lifecycle、authority 与 event projection 形成“独行侠”。

Synara source set 中若带入 Pi-compatible Extension，还必须识别其真实来源模式：Synara/OmniMind 自有字节、继承的上游 fork/patch，或由 Provider 原生 lifecycle 直接安装的第三方 package。不得因为文件出现在母体树中或被 adapter 加载，就静默改写其第一方归属、维护责任或运行时注册事实；source retained、shipped bytes 与 runtime registered 仍必须分开。直接安装与 fork/modify 之间的转换是会改变权利、安全/更新 owner、回滚和长期同步责任的重大 divergence，必须先说明并获得维护者授权；详细 intake 只由 [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md) 拥有。

## 2. 触发与长期授权边界

以下维护者表达都触发本文件：审查、看看更新、比较、借鉴、吸收、同步、跟进、移植、更新 Synara，或意思等价的指令。

触发后，Agent 必须完整阅读本文件，不能只依赖历史聊天、自动摘要、旧 handoff、commit 标题或上一次 intake 记忆。

触发词不单独决定本轮结果类型：scoped source review 与 adopted-head advancement 的授权边界只按上文的真实用户意图裁决。前者始终只读；后者才消费本节关于 standing-default adoption 的长期授权。

长期授权边界固定如下：

- 不自动轮询 Synara，不创建定时检查、后台监控或自动更新 PR；
- 不因为远端出现新 commit 就自行修改 OmniMind；
- 每一轮 intake 由维护者明确发起；
- 每一轮先完成只读研究和共同决策，再实施；
- 分支、worktree、直接在 `main` 施工、等待并发任务结束、加快执行、继续已有工作或使用某个执行 Skill 的授权，只决定**在哪里/何时/如何施工**，不等于维护者批准“吸收什么、暂缓什么、拒绝什么”；
- 维护者对当次明确更新集的批准只覆盖该更新集，不自动扩张到更新后的新 commit；
- `execution-brief.md` 只协调真实并发、依赖、阻塞和下一动作，不能在维护者确认完整 decision surface 后另设阶段门或否决已确认采用；
- 后续新 commit 重新从当时 README 记录的 exact adopted head 开始；
- “尽量全部吸收”是 standing default：母体内可安全吸收、没有越过固定 divergence 或新增真实高风险的机制默认进入当前 adoption set，不需要逐个 accepted patch 再等口令；Agent 必须把每个建议不吸收、延期、已有覆盖或新增高风险变化的损失和理由列给维护者确认。

## 3. 唯一权威与必读顺序

### 3.1 各类事实的 owner

| Fact                                                                           | 唯一 owner                                                                                   |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 当前 production-adopted Synara revision、采用路径、模式、rights 与总体排除边界 | 根 [`README.md`](README.md) 的 `source-adoptions` 机器块                                     |
| 持续 intake 的方法、判断原则、提问门与交付要求                                 | 本文件                                                                                       |
| 固定源事实、逐轮 commit disposition、失败、反例、权利与复验触发器              | [`research/source-review.md`](research/source-review.md)                                     |
| UI、产品状态、公共出口、执行 topology 等稳定约束                               | [`architecture/`](architecture/README.md) 对应专题 owner                                     |
| 当前工作目标、并发协调、真实阻塞和下一动作                                     | [`execution-brief.md`](execution-brief.md)                                                   |
| Claim 状态与 exact-SHA evidence pointer                                        | active [`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md) Campaign |
| 法定文本                                                                       | [`LICENSES/`](LICENSES) 及必须随 artifact 保留的对应位置                                     |

本文件不得复制当前 adopted SHA 作为长期真相。每轮都从 README 的机器块读取；README 未更新时，不得把研究候选称为 production-adopted head。

### 3.2 每轮必读顺序

1. 根 [`AGENTS.md`](AGENTS.md)；
2. 根 [`README.md`](README.md)，特别是 `source-adoptions`；
3. 本 [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md)；
4. [`architecture/README.md`](architecture/README.md) 以及本轮所有受影响专题 owner；
5. [`execution-brief.md`](execution-brief.md)；
6. active Campaign，只用于识别当前状态、证据触发器和并发施工边界；
7. [`research/README.md`](research/README.md) 与 [`research/source-review.md`](research/source-review.md) 中相关历史证据；
8. Synara exact source commit、完整 diff、测试和必要的上下文实现。

这个顺序先建立当前产品与架构 authority，再读取历史来源证据；research 中被 supersede 的旧 disposition、阶段顺序或下一动作不得反向覆盖现行 owner。

若 sole owners 对同一事实给出冲突要求，停止产品施工。先在本轮授权范围内修复 owner 与路由；无法安全修复时，通过 `$converge` 向维护者说明精确冲突并请求裁决，不能按更新时间或个人偏好选边。

## 4. 每轮 intake 的两个门

### Gate A：只读研究、辩证判断与维护者确认

维护者发起 intake 只授权证据收集和方案讨论。在 Gate A 内不得 cherry-pick、merge、patch、格式化、更新 adoption record 或以其他方式修改 OmniMind 产品代码。

Gate A 必须完成：

1. 解析 README 中 exact adopted head；
2. 解析维护者要求检查的 exact source set：scoped source review 可以是固定 commit、PR、机制或路径；adopted-head advancement 必须解析 exact candidate head；
3. 记录 source set 与 adopted head 的 ancestry；adopted-head advancement 的线性增量路径必须验证 candidate 是 adopted head 的 descendant；
4. scoped source review 枚举指定 source set 及其必要依赖和后续修正；adopted-head advancement 枚举完整 commit range，包括 merge、revert、删除和后续修正；
5. 阅读每个 material commit 的完整 patch、测试和关键上下文；
6. 按稳定责任分组，而不是按文件数量或 commit 标题归纳；
7. 识别跨 commit 相互作用，防止分别合理的补丁组合后恢复竞争 authority；
8. 检查依赖、lockfile、构建、发行、IPC/preload、native、网络、auth、权限、凭据、存储、迁移、rollback、telemetry、资产和法律文本；
9. 将范围内每个 material commit 和重要 changed path 放入明确 disposition；
10. scoped source review 闭合受影响 owner、consumer、依赖与失败边界；adopted-head advancement 对 candidate 全树完成 path/behavior accounting，至少覆盖 upstream-only、downstream-only 与所有同路径分叉，不能用 commit range 代替；
11. 对适用范围内的作者 tests/harness 做 retention/adaptation accounting；adopted-head advancement 必须闭合完整候选能力的作者测试，不得只保留容易移植的子集；
12. 用 `$converge` 消除所有会影响范围、产品结果、安全、权利或验证方式的不确定性；
13. 向维护者展示完整而紧凑的 decision surface：默认吸收项可以按稳定责任分组说明；每个 material defer/decline/already-covered/exclusion 必须逐项说明“不纳入会失去什么、为什么仍不建议纳入、什么证据会改变建议”；
14. adopted-head advancement 必须明确询问维护者是否同意**全部建议未纳入项与高风险偏离**，并等待维护者确认；没有建议未纳入项或新增高风险分叉时，可在报告“无待确认偏离”后直接进入 Gate B。scoped source review 只标明仍待决定的分叉，不取得实施授权。

scoped source review 在完成指定范围的证据、owner、风险与建议后即停在只读结论，不进入 Gate B，也不更新 README、Campaign 或产品代码。只有 adopted-head advancement 才适用第 14 项及“无待确认偏离后进入 Gate B”的 standing default。

Gate A 完成前必须停在讨论，不得用以往“都可以吸收”的偏好替代当次确认。

#### Gate A 确认的对象与有效表达

以下确认合同只适用于 adopted-head advancement。scoped source review 可以提出 `proposed / pending maintainer decision` 的 disposition，但不得凭 standing default 自行进入实施。

Gate A 的确认对象不是“开始写代码”，而是当次 exact source range 的完整 disposition。以下规则没有例外：

- `adopt directly` 与 `translate semantically` 在 standing default 和固定 divergence 内自动进入；`already covered`、`defer`、`decline`、identity/release/legal exclusion 的新增或变化，以及任何高风险变化属于维护者必须确认的偏离面。Agent 不能只汇报 accepted subset，再自行冻结其余项；
- 任何 material change 只要建议不进入当前产品，即使理由是施工顺序、现有 owner、更强覆盖、产品品味、复杂度或安全边界，也必须先把建议和损失明确告诉维护者并获得确认；安全或权限风险可以阻止实施，但不能被写成维护者已同意的产品取舍；默认吸收项不需要逐项批准；
- Agent 必须先明确问清“是否同意刚展示的全部未纳入项与高风险偏离”。维护者紧接该问题作出的肯定答复——包括“可以”“继续”“开始吧”“OK，你干吧”等自然表达——只要语境唯一指向这些偏离，就构成有效批准，不要求背诵固定口令。只有 Agent 未问清、期间出现新的 material 变化，或回答可能只指进度、位置、时机或执行方式时，才必须重问；
- 候选 head、OmniMind base、相关 owner、真实调用链或建议 disposition 在确认前后发生 material 变化时，旧确认不覆盖变化行。Agent 必须展示差异并只对变化部分重新确认，不能把“重新 review”后的新硬排除塞进旧授权；
- 沉默、未反对、催进度、允许写入、允许 push、允许编排或历史总体偏好都不是确认。存在合理歧义时必须判定为“未确认”，而不是推定授权；
- Agent 不得在维护者确认前使用“硬性排除”“disposition 已固定”“maintainer-approved”“intake complete”或意思等价的状态。研究建议只能标为 `proposed / pending maintainer decision`；
- 既有记录若找不到对应的明确确认，必须准确标记为“历史实现/记录存在，但 disposition 未获有效确认并已重新打开”，停止继续扩大该结果，并通过 `$converge` 重新提交决策面。不得用已经写入、测试、打包或推送的事实倒推批准。

确认结果写入既有 `research/source-review.md` 的当轮证据段即可：记录 exact range、被确认的 decision surface 与明确决定；不创建第二 approval ledger，也不依赖未来 Agent 猜测历史聊天。

### Gate B：实施、验证、交付与权威收口

Gate B 只属于 adopted-head advancement。完整 decision surface 展示后，standing-default 的可吸收项直接进入 Gate B；存在建议未纳入项或高风险偏离时，Agent 必须先明确询问并在维护者于唯一语境下肯定答复后进入。确认按上下文判断，不依赖魔法措辞。若实施中发现的新事实会实质改变已批准偏离、产品行为、安全边界、迁移策略或排除项，只将变化部分退回 `$converge`，其余已确定工作无需重问。

Gate B 必须：

1. 重新核对精确 workspace、适用指令、branch、HEAD 和 `git status --short`；
2. 避免与当前活跃施工、未知修改或同文件并发任务互相覆盖；
3. 选择最小但完整的直接移植、语义翻译、责任级替换或无代码处置；
4. 同步移植或翻译上游测试，保存同一可观察保证；
5. 完成适用的双语、品牌、namespace、rights、security 和 owner 适配；
6. 运行最窄的 falsifier，再按风险扩展到相关 unit、browser、typecheck、lint、build、native、live 或 recovery proof；
7. 对用户可观察 Desktop 行为，从最终 exact pushed SHA 重建、安装，并用任务专用 fresh profile 完成真实 journey、关闭和重开；
8. 更新唯一权威和证据引用，不建立平行 manifest、ledger、wiki 或第二 Campaign；
9. 一个关注点一个 commit，只 stage 本轮路径；代码、README adoption、research disposition 与当前状态可以形成一组有序 commits，但必须作为一个事实闭合的 adoption set 推送，不能把已实现与仍 pending 的权威冲突留在共享分支；
10. 明确报告已证明、未证明、阻塞和触发后续复验的条件。

Gate B 优化的是相对 Synara 的长期偏离、owner 数量和未来修改半径，不是本次 diff、文件数或净行数。若上游变化暴露 OmniMind 在同一获准责任内已有重复 truth、consumer 特判、万能 adapter、第二 cache/writer 或待退休旧支持图，必须选择幸存 owner、切换全部当前 consumer 并删除旧路径；不得用逐 consumer 补丁、永久 compatibility facade 或同步 framework 完成“表面吸收”。完整 owner cut 可以跨很多文件和有序 commits，但每一步都必须可验证、可回滚且不夹带无关格式化或相邻产品债务。

候选冻结前必须做与本轮责任相称的未来变更与删除演练：至少检查上游新增/删除一个成员、改变协议/schema、替换实现，以及能力整体退休时，修改是否集中在真实 owner、测试能否定位漂移、回滚或删除是否不牵连无关 owner。若 Synara 已提供等价或更强 public seam，应优先退休对应 OmniMind divergence、patch、adapter 与专属测试，而不是为历史投入继续供养两套实现。

Gate B 的完成不等于自动发布、合并受保护分支、更新 feed、签名或创建 Release。这些动作继续遵循各自授权。

## 5. 完整覆盖算法

每轮 adopted-head advancement 不能只回答“重要更新已经吸收”。必须建立可复核的闭合计数：

```text
range 中的全部 commits
= 直接吸收
+ 语义吸收
+ 已有更强覆盖
+ 带触发条件延期
+ 拒绝代码但保留洞察
+ 明确排除的品牌/发行/法律无关字节
```

左右计数必须相等。任何未归类 commit、revert、binary asset、lockfile 变化或 generated/release 文件都使 intake 未完成。

Commit accounting 只是第一张表；同一轮 adopted-head advancement 还必须闭合：

```text
candidate apps/packages 全树路径
= byte-identical inherited
+ direct/semantic adoption
+ confirmed current-stronger divergence
+ confirmed identity/release/legacy-migration exclusion
+ confirmed defer/decline
```

每一组都必须能回到精确路径、行为 owner 和作者测试。相同文件名不证明行为相同，不同文件名也不证明未覆盖。历史状态必须区分“从未移植”“移植后删除”“语义覆盖”“延期”“拒绝”，禁止用含混的“移除/删除”掩盖事实。

每个 material change 至少回答：

- 精确 upstream commit 是什么？
- 它解决什么问题？
- 最强产品/工程洞察是什么？
- 忽略它会损失什么？
- 它依赖哪些 Synara 假设？这些假设在 OmniMind 是否仍成立？
- OmniMind 的唯一 owner 和当前证据是什么？
- disposition 是什么？
- 目标代码、测试与用户可观察结果在哪里？
- 风险和维护成本是什么？
- 什么证据能证明它被正确吸收？
- 什么反例会推翻当前决定？
- 维护者是否确认？

推荐使用以下表格讨论，不把它保存成新的永久 ledger：

| Upstream change | 问题与最强洞察 | OmniMind owner/evidence | 建议 disposition | 风险/代价 | Required proof | 维护者决定 |
| --------------- | -------------- | ----------------------- | ---------------- | --------- | -------------- | ---------- |

## 6. Disposition 定义

### Adopt directly

上游机制、authority、数据边界和生命周期与 OmniMind 一致。尽量保留原 patch 结构和测试，完成必要的 package namespace、双语、品牌与路径适配。

### Translate semantically

上游洞察成立，但实现依赖的对象、进程或 authority 不同。必须明确写出保留的问题、机制、不变量、交互结果和 falsifier；只有界面相似或 happy path 相同不算吸收。

### Already covered

当前 OmniMind 已有等价或更强保证。必须给出真实代码与测试证据，不能凭名称相似判断。若上游带来更好的 regression test、错误文案或边界说明，仍应吸收这些价值。

`Already covered` 仍是“不再移植该上游实现”的 disposition，必须作为未纳入项交给维护者确认；不能把“当前更强”当作 Agent 单方面跳过的许可证。

### Defer with trigger

价值成立，但缺少当前 prerequisite、平台资源、provider contract、权限 receipt、rights 或验证环境。必须写出重新打开决定的精确触发条件；defer 不是永久 backlog，也不能被记成 adopted。

Defer 只是一项建议，维护者确认前不得固化为施工顺序或后续 intake 的既定前提。

### Decline code, retain insight

直接或翻译实现会造成可证明的产品、安全、法律或长期复杂度损害。必须保留问题陈述、上游测试思想或设计教训，并说明什么新证据会改变决定。

除非实施本身越过安全、权限或法律硬边界，decline 仍须维护者明确确认；Agent 必须先说明具体损失与自己的推荐，不能静默替维护者做产品取舍。

### Explicitly exclude identity/release bytes

donor icon、品牌、version、Changelog、What’s New、release metadata、账号和发布身份默认不进入 OmniMind。若同一 commit 同时包含产品机制，必须拆开处置，不能因 release/brand 字节被排除而丢掉机制。

`revision` 更新到 candidate head 只表示该完整范围已经逐笔审查并形成闭合 disposition，不表示所有字节原样进入 OmniMind。README 必须准确说明选择性边界。

## 7. 默认判断原则

### 7.1 优先吸收

- 上游修复的可靠性、交互细节、failure handling、performance、accessibility 和 regression test 默认优先进入；
- 上游新设计应先寻找 OmniMind-native 表达，而不是先寻找拒绝理由；
- 上游删除或 revert 是一等证据，必须理解为什么撤回；
- OmniMind 现有实现若没有更强证据，不因“已经写了”而优先；
- 一个上游大 commit 可以按责任拆分吸收，但不能只取视觉表面丢掉状态与失败语义。

### 7.2 必须辩证

- source-first 不高于真实用户数据、安全、凭据、权限和法律边界；
- 不为视觉齐平伪造 Provider capability、approval、Session continuation 或 Package lifecycle；
- 不把 Synara 的 profile、storage、migration、updater、release、brand 或账号直接变成 OmniMind 权威；
- 不因为上游用了某种 abstraction，就在 OmniMind 创造第二 Registry、control plane、permission broker、settings owner 或 migration rail；
- 不把单一 Provider、单一平台或单一渠道的偶然行为写成跨 Provider 通用逻辑；
- 不用文档叙事掩盖代码、测试、打包或真实 journey 缺口。

### 7.3 复杂度举证

新增持久化、迁移、兼容层、公共 abstraction、跨进程 owner、第二 writer 或长期双轨时，必须先证明最小接线或 owner 内翻译不能解决。需要时按根 `AGENTS.md` 路由 `$zq-dev-rules`；Synara intake 本身不豁免复杂度和 stop-loss 规则。

不得为同步预建通用 framework、兼容双轨、ledger/manifest、新 package、逐 commit wrapper 或复制生产语义的永久测试平台。不同命名的现有 owner 必须先按用户结果和作者测试验证 parity，不能再建一套并行 UI/store/API。

## 8. `$converge` 不确定性门

维护者已经明确要求：存在会改变 intake 结果的不确定性时，必须使用 `$converge`，直到理解和决定足够确定后才全面实施。

### 必须进入 `$converge` 的情况

- candidate 范围、目标版本或 ancestry 不清楚；
- 上游设计意图存在两种合理解释；
- 直接吸收与语义翻译会产生不同用户结果；
- 是否影响 OmniMind 主逻辑或唯一 owner 无法确定；
- 是否应迁移、保留或覆盖用户显式设置不清楚；
- Provider capability、approval、receipt、Session、replay 或 fallback 语义不清楚；
- 涉及数据、安全、隐私、凭据、网络、native、权限、法律或发布风险；
- 无法判断一个 commit 应拆分、延期还是排除；
- 所需 proof、真实环境或成功标准不明确；
- 实施中新证据推翻维护者批准时的关键假设。

### 不应丢给维护者的问题

能通过源码、Git、测试、官方资料、既有 owner 或安全的只读 probe 查明的事实，Agent 必须先自行研究。`$converge` 用于真实产品选择和高影响未知，不用于让维护者代做检索。

### 对话方式

每轮只问影响最大的一个未知，并提供基于证据的推荐答案。维护紧凑决策账本：

- 已确认；
- 待确认；
- 假设及验证方式；
- 被否决方案及理由。

高影响矛盾未消除时不得生成“看起来完整”的实施方案。收敛后立即执行，不继续仪式化提问。

## 9. 风险升级检查

以下变化必须单独点名、阅读完整 diff 并增加相应 proof：

| 风险面                | 必查内容                                                          | 最低证明                                                 |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| Dependencies/lockfile | 新增、删除、版本、postinstall、native closure、license            | frozen install、构建、legal/SBOM、实际 artifact closure  |
| Electron/preload/IPC  | channel、schema、origin/auth、renderer authority                  | typed contract、negative auth、packaged call path        |
| Native/OS             | 编译工具链、private API、sandbox、filesystem/process/network 权限 | 支持平台 probe、失败关闭、真实设备/模拟器或明确 blocker  |
| Provider/Session      | resume/fork/acceptance/settlement/replay/capability               | normal/failure/restart、native truth、无 silent fallback |
| Settings/defaults     | fresh default、显式选择、migration、rollback                      | fresh 与 existing profile 分开验证；不强制覆盖用户选择   |
| Storage/migration     | schema、reader/writer、namespace、旧字节                          | exact owner、备份/恢复、零误读/误删、fresh/reopen        |
| Network/telemetry     | endpoint、payload、redirect、credential、retry                    | allowlist、timeout/cancel、无秘密、失败不伪成功          |
| UI/interaction        | state、focus、scroll、a11y、locale、motion、performance           | unit + browser + 中英 + 真实 journey，必要时视觉复核     |
| Release/update        | version、feed、signature、artifact、changelog                     | authority separation、exact SHA、install/retry/reopen    |
| Assets/legal          | 来源、作者、license、notice、品牌归属                             | exact revision/path、保留文本、packaged inclusion        |

Generic typecheck 或 happy-path 单测不能关闭上述专门风险。

## 10. 实施方法

OmniMind 是 Synara 的 downstream fork。当前缺少可用共同 Git ancestry，因此本轮仍按责任安全接线；完整 parity/disposition 闭合后，才可在隔离分支实验恢复真实 ancestry。按下列顺序选择实现方式：

1. owner 完全匹配时直接移植；
2. owner 不同但保证可保留时测试先行做语义翻译；
3. 零碎 patch 会留下两个模型时做干净的责任级替换；
4. 只有无代码处置最诚实时才保留证据而不实现。

这里的“最小”指相对母体的最小长期 divergence 和最小未来修改半径，不是最少文件或最小 diff。直接移植会把同一事实继续散落到多个 consumer 时，应在获准责任内做一次干净的 owner consolidation；语义翻译只允许作为窄 typed seam，不能成长为长期并行模型。每轮还必须反向检查既有 divergence：上游已经承担同一生命周期时，删除下游 patch 和兼容轨本身就是优先级最高的吸收结果。

禁止：

- whole-repository merge/rebase 作为默认方案；
- 为了方便下一次同步保留永久 compatibility facade；
- 新建第二份 source manifest、update ledger 或平行 adoption wiki；
- 用 generated diff、release notes 或 commit subject 代替源码阅读；
- 为追测试绿色无证据修改稳定交互；
- 把 source-only、dev Electron 或 HMR 结果报告为用户已获得更新；
- 为没有真实 receipt 的动作推断批准；
- 修改真实用户 `.pi`、`.omnimind`、credential 或 Provider private home 做验证。

## 11. 验证与交付矩阵

验证必须与本轮改动匹配，而不是机械跑最大测试集。

### 11.1 Focused proof

- 上游原 regression 在 OmniMind 中的直接或翻译版本；
- normal、failure、recovery/restart；
- 受影响 owner 的 negative authority/identity scan；
- 新增默认与显式旧设置的对照；
- UI 的中英、keyboard、screen reader、focus、reduced motion；
- native/IPC/network/security 的失败关闭；
- dependency、license 与 artifact inclusion。

### 11.2 Candidate proof

- 相关 workspace typecheck、unit、browser、lint/format；
- build 与 source provenance；
- final candidate worktree clean；
- current branch pushed，remote SHA 与 local SHA 一致；
- 用户可观察 Desktop 行为从该 exact SHA 重新打包安装；
- fresh task profile 首启、真实 journey、关闭和重开；
- 真实用户 homes 未读取、迁移或修改；
- 无法运行的真实平台/native/live proof准确标为 blocker，不用 mock 冒充。

涉及 Provider、Model、Thinking、stream、tool、usage、abort、恢复或兼容协议时，遵循根 `AGENTS.md` 的 live-resource 规则，用最小真实请求证伪结论并严格脱敏。

### 11.3 状态真实性

- 普通、focused、可逆的母体同步可由执行者在 owner、测试、adoption authority 与交付证据闭合后关闭对应 claim；
- 发行、签名、安全、迁移、权限、秘密及其他高风险 claim 仍须独立裁决和所需 final gate，实施者不能自证 `verified`；
- adopted head、实现状态、packaged evidence 和 public release 是四个不同事实；
- 局部绿色不能外推到未运行的平台、native helper、签名、notary 或 update feed。

宣称 adopted head 必须同时闭合 exact source、commit-range accounting、whole-tree path/behavior accounting、作者测试/必要适配、OmniMind focused gates，以及 shipped behavior 的 pushed-SHA packaged/live journey。缺一项只能称 `candidate/pending`。

## 12. 每轮必须更新的现有 owner

只更新实际受影响的文件：

1. 根 README `source-adoptions`：candidate 成为真实 production adoption 时更新 exact revision、paths、mode、changes、rights、exclusions 与 update policy；
2. `research/source-review.md`：保存本轮 exact range、逐责任 disposition、风险、外部来源和复验触发器；
3. architecture owner：只有稳定产品约束确实改变时更新；
4. `execution-brief.md`：只有当前目标、并发、真实阻塞或下一动作发生变化时更新；
5. active Campaign：只更新受影响 claim 的 candidate evidence 与 exact SHA；
6. `LICENSES/` 和 packaged notice：存在新的采用字节或法律义务时更新；
7. 本文件：只有长期 intake 方法本身变化时更新，不能为每轮结果追加日志。

旧 intake 不倒改成全量采用。新的 exact head 必须描述真实选择性边界；未实现或明确排除的字节不能因 revision 前进而被悄悄算入产品。

## 13. 完成定义

### 13.1 Scoped source review complete

一次 scoped source review 只有同时满足以下条件才可称为 `review-complete`：

- exact source set、ancestry 关系与研究范围明确；
- 指定范围内的代码、测试、owner、依赖、失败边界与 material 风险已经理解；
- 已准确区分外部事实、OmniMind 当前证据、推断、假设和待维护者决定；
- 输出明确声明它没有进入 Gate B、没有更新 production-adopted head，也没有证明产品已经采用；
- 没有用局部研究替代正式 adoption 所需的完整 range、whole-tree、rights、作者测试或 packaged 证据。

`review-complete` 是真实完成状态，不应被写成“adoption 尚未闭合”的失败；但任何产品写入、移植、README revision 前进或 adoption claim 都必须重新进入 adopted-head advancement。

### 13.2 Adopted-head advancement complete

一次 adopted-head advancement 只有同时满足以下条件才可称为 `adoption-complete`：

- adopted head 与 candidate head 精确、ancestry 已验证；
- range 内全部 commit 和风险文件计数闭合；
- upstream-only、downstream-only 与同路径分叉的全树 path/behavior disposition 闭合；
- 作者 tests/harness 已保留、适配，或其不适用结论已按未纳入项确认；
- 每个 material change 已理解代码、机制和产品判断；
- 所有高影响不确定性已通过研究和 `$converge` 收敛；
- 维护者明确确认当次每项 material already-covered、defer、decline、exclusion 与新增高风险偏离；默认吸收项不要求逐项口令；
- 所有 accepted mechanisms 已直接或语义实现；
- exclusions/defer/decline 均有具体理由和触发器；
- tests、rights、owner、identity 与 packaging 适配完成；
- 获准责任内的重复 truth、consumer 特判、待退休 divergence 与旧支持图已经收口，未来变更和删除演练通过；
- focused 和 candidate proof 与风险匹配；
- 用户可观察改动完成 exact pushed-SHA packaged fresh-profile journey，或准确标明 blocker；
- README adoption、research evidence、Campaign pointer 与代码一致；
- worktree clean，当前分支已按项目规则提交并推送；
- 最终报告明确区分：完整审查、机制吸收、原始字节采用、交付验证和公开发行。

上述 adoption 条件任何一项未满足，都应报告“adopted-head advancement 尚未闭合”，不能使用“全部完美吸收”作为概括；这不否定一个严格停在只读边界内的 scoped source review 已经 `review-complete`。

## 14. Stop conditions

遇到以下情况立即停止当前路径并说明阻塞：

- adopted-head candidate 不是 adopted head 的 descendant，或 tag/history 被改写时，必须停止线性 commit-range 推理；在解析 exact merge-base/tree、历史改写原因、rights 与 whole-tree disposition，并重新展示变化后的 decision surface 前，不得更新 adopted head；
- exact source、rights、license 或资产来源无法确认；
- workspace 存在无法归因的重叠修改；
- owner 冲突无法在授权范围内修复；
- 新设计需要维护第二 authority、第二 writer 或永久双轨但缺乏充分证据；
- migration、删除、发布、权限扩张或高费用外部动作超出授权；
- 关键真实环境不可用且 mock 无法证明用户结果；
- 同一失败没有新假设，继续 probe 只会重复旧结果；
- 实施发现会实质改变维护者批准过的 decision surface。

停止不等于拒绝 Synara。保留已确认洞察和重新进入的精确条件，通过 `$converge` 获得下一步裁决。

non-descendant 或 history rewrite 不阻止 scoped source review 继续收集只读证据，但该结果只能标为 `review-complete`。若维护者仍希望推进 adopted head，必须改用可复核的全树比较闭合新旧来源关系，并对变化后的偏离面重新确认，不能把非线性历史伪装成普通增量更新。

## 15. 反方压力测试

每次提交 Gate A 建议前至少自问：

### Strategy

我们是否真的吸收了 Synara 最强的用户价值，还是只拿了容易合并的代码？若不采用，会具体失去什么？

### Execution

最脆弱的边界是什么：数据、并发、native、Provider truth、迁移、权限、法律还是 packaging？现有 proof 是否真的能击穿它？

### Adoption

用户会感知为自然的 OmniMind 改进，还是 donor 品牌、第二套设置、能力假象或交互回退？维护者是否明确接受所有重大差异？

任何挑战推翻关键假设时，继续研究和 `$converge`，不能带着结构性缺口进入 Gate B。

## 16. 后续更新的重新进入点

下一轮维护者发起 Synara intake 时：

1. 从 README 读取当时 exact adopted head；
2. 解析维护者指定或当次共同确认的 candidate head；
3. 验证 ancestry；
4. 只审查新的 exact range；
5. 读取历史 source-review 中仍可能受影响的 defer trigger、反例和已知风险；
6. 不重复已经证明且触发器未变化的旧 probe；
7. 若新 commit 修改了上轮尚未完成的责任，只将该变化部分重新进入 Gate A；
8. adopted-head advancement 完成新的 Gate A、`$converge`、维护者确认和 Gate B；scoped source review 在只读结论处停止。

若 candidate 不再是 adopted head 的 descendant，第 4 步不得声称“只审查新的 exact range”；必须切换到 merge-base 与 exact tree 的非线性重进路径，重新闭合来源、rights、全树行为和维护者 decision surface。若本轮只是 scoped source review，则只读取与指定范围相关且触发器已变化的证据，不启动 Gate B。

这使 OmniMind 可以长期、认真且高吸收率地跟进 Synara，同时始终保持产品权威、证据真实性和可逆性。
