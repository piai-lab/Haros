---
type: "QbD Audit"
title: "QbD 1: UI chassis source and authority takeover"
entry: "../design.md"
verdict: "FAIL"
actor_id: "ui_chassis_qbd_1"
dispatch_receipt: "b1c8d6ec40004ebbbac65cf2bcaa5ae2"
---

# QbD 1: UI chassis source and authority takeover

这是对 [Design](../design.md)、[PRD](../prd.md) 与其引用的
[research synthesis](../research/synthesis.md) 的独立设计审计。审计同时以根 README、Workbench、
Product State、Execution、execution brief、active Campaign 和固定源码为约束，不修改 production、
architecture、research、Campaign 或 implementation work。

## Verdict

**FAIL。** 选择“完整 runnable dependency closure 直移，再以 Product typed ingress、真实
`Agent | Chat` 和 isolated Native Host 绞杀旧权威”的方向成立；rights-safe asset 处置、单写者
Product cutover、typed receipt/uncertainty、UI 母体保全、按域删除和 frozen-candidate gate 也都具备
可实现的主体设计。

但当前 T1–T4 checkpoint 合同有两个无法同时满足的前置矛盾：

1. T1 一方面必须原样运行 mechanically moved mixed backend，另一方面又受“Pi 只在 Native Host、
   Product Service 依赖为零”的无阶段限定 binding constraint 约束；固定源码证明这两件事不能在同一
   T1 SHA 同时成立。
2. T2 必须完成真实 Native Host 的独立监督和 kill/restart/circuit-breaker fault gate，但负责创建和接入
   Native Host 的实现被明确放在 T4；按当前四个 Concept 顺序，T2 没有可以接受的验收对象。

这不是一般实施难度，而是两个 declared checkpoint 的 exit proof 不可判定。若直接 Decompose，执行者
只能擅自豁免 binding constraint、提前吞并 T4、制造假 Host，或把要求的 fault gate 写成未执行。以上
任一条都会让 checkpoint 及后续 same-SHA candidate 的证据失真。它们都可用很小的阶段边界修复，不需要
重开产品方向、增加研究轮次或改变 Pi-native 架构。

本 verdict 只供人类校准；它不授权修复、Decompose、Execute、Campaign 状态变化或生产删除。

## Audit identity and scope

- Entry: [UI chassis source and authority takeover design](../design.md)
- Requirements: [Runnable UI chassis takeover PRD](../prd.md)
- Selected direction: [UI chassis qualification and takeover synthesis](../research/synthesis.md)
- Rights evidence: [Fixed-source rights and asset disposition](../research/rights-and-assets.md)
- Source/authority evidence: [UI chassis source-domain and authority audit](../research/source-domain-audit.md)
- Slice evidence: [First production takeover slice study](../research/takeover-slice.md)
- Durable owners: root README, Workbench, Product State and Execution
- Promised output: `qbd/design-audit.md`
- Actor: `ui_chassis_qbd_1`
- Dispatch receipt: `b1c8d6ec40004ebbbac65cf2bcaa5ae2`

本审计重点挑战 source-rights feasibility、T1 non-candidate/runnable 语义、Product single writer、
acceptance/uncertainty、Desktop–Service–Native Host 隔离、UI 母体保全、删除门与同一候选 SHA proof。
未把 Windows/Linux、全部 Package、Remote、外部 Engine 或 V1 发行提前纳入本 slice。

## Blocking findings

### F-01 — FAIL：T1 的 runnable mixed backend 与无阶段限定的 Host-only dependency constraint 互斥

**Cause and evidence.** PRD binding constraint 4 要求 Pi SDK 与 executable ecosystem code 只存在于独立
Native Host，且 Web、Electron Main、preload 和 Product Service 的直接/传递 production dependency 为零
（PRD lines 77–90）。Design 也把“Pi accepted operation 只有 Native Host 内 Pi runtime 一个 authority”列为
architecture invariant（Design lines 33–46）。

但 T1 的明确施工是把 `vendor/ui/apps/server` mechanically move 为 `apps/service`，并说明内部 mixed
authority 在 T1 不解决（Design lines 108–122）；为了证明 runnable closure，T1 还明确允许短暂运行原混合
backend（Design lines 163–176），checkpoint gate 进一步写明 T1 允许 donor execution authority 继续存在
（Design lines 509–520）。

固定源码直接证明这不是抽象风险：

- `vendor/ui/apps/server/package.json:30-32` 让 Server 直接依赖 Pi agent-core、pi-ai 和
  pi-coding-agent；
- `vendor/ui/apps/server/src/provider/Layers/PiAdapter.ts:2516-2524` 在该 Server 进程中直接调用
  `runtime.session.prompt(...)` 并立即返回 donor turn identity；
- source-domain audit 已确认同一 Server composition 同时拥有 Product control 和 Pi/其他 Provider
  execution authority。

因此，按当前文义，T1 同一 SHA 若 runnable，就必然让 mechanically moved Product Service 直接包含 Pi
executable dependency；若先满足 Host-only/zero-dependency constraint，就不再是所定义的 T1 mechanical
closure，而是提前实施 T4 的 authority split。

**Concrete consequence.** T1 的 reviewer 没有一个可满足的 exit predicate：依赖扫描必红，或实现者必须
把本应属于 T4 的 Host 切割偷偷塞进 T1。前者使“required binding constraints + runnable checkpoint”证据为
假，后者使 T1 不再能承担受控物理搬运、回退和 provenance 分类的单一职责，并让后续 Concept ownership
失真。

**Affected decisions.** PRD binding constraint 4、R2、R8 和 checkpoint table；Design invariants 3–6、
T1 source/runtime profile、T1/T4 gates 与四-Concept decomposition；Execution 的 Native Execution Plane。

**Smallest remedy.** 在 PRD/Design 中二选一，并只修阶段语义：

1. 推荐：明确 Host-only/zero-Pi dependency 是 **T4 production-candidate invariant**；T1 是受控的
   local non-candidate exception。为 T1 写死 expected-red production dependency/identity gates、独立 disposable
   profile、无真实 workspace/credential、无 release artifact、不可 merge/promote，T2 first-journey cutover
   后旧 execution path 不再可达，T4 才必须物理删除并使 dependency scan 绿；或
2. 把最小真实 Native Host extraction 提前到 T1，并相应重写 T1 的“mechanical mixed backend”目的和后续
   Concept 顺序。

第一条是更小且更符合当前选择的修复；它不改变最终架构，也不允许 T1 冒充 candidate。

**Why safe degradation is insufficient.** 把旧 UI 标成 unavailable、关闭 provider route 或不连接真实凭据
可以降低 T1 的运行风险，却不会让 `apps/service` 的直接 Pi dependency 消失，也不能使互斥的 acceptance
同时为真。跳过 T1 launch 又会破坏“每个 declared checkpoint runnable”的核心选择。必须修正阶段合同，
不能靠隐藏或口头豁免。

### F-02 — FAIL：T2 要求真实 Host fault proof，但 Native Host 的可执行实现被排到 T4

**Cause and evidence.** PRD R6 明确属于 T2，却要求 Electron Main 独立监督 Renderer、Product Service 和
Native Host，并要求分别 kill Renderer、Service、Host，验证 restart budget、circuit breaker、re-entry 和
日志归因（PRD lines 180–195）。Design 的 T2 health model同样输出 `nativeHost: starting | ready |
restarting | circuitOpen | unavailable`（Design lines 271–284），T2 checkpoint gate 要求 independent health
faults（Design lines 509–520）。

另一方面，Design 直到 T4 才定义 Native Host process topology、authenticated rendezvous、ingress、Pi
Session 和真实 fault matrix（Design lines 346–426），四个 dependency-ordered Concepts 也把“isolated Native
Host, real vertical slice”全部交给第 4 个 Concept（Design lines 587–597）。T2 章节没有创建一个真实
Host executable、supervisor endpoint 或可 kill 的 process shell；target graph 只说明最终 placement，不能替代
checkpoint implementation ownership。

**Concrete consequence.** 第二个 implementation Concept 无法独立达到自己的 exit：

- 若只在 read model 中写 `nativeHost: unavailable`，没有进程可 kill，不能证明 crash containment、restart
  budget 或 circuit breaker；
- 若造一个假 child/heartbeat 让测试过绿，就会用模拟状态冒充 Execution boundary；
- 若在 T2 实现真实 Host supervision/IPC，则现有 Work 4 scope 和依赖顺序被暗中提前，QbD 2 无法给每个
  Concept 建立不冲突的 path ownership 和 done conditions。

**Affected decisions.** PRD R6、R8、T2/T4 exit table 与 same-SHA fault proof；Design T2 health model、T4
topology/fault matrix、checkpoint gates 和 decomposition readiness；Execution 的 independent failure domains。

**Smallest remedy.** 在进入 Decompose 前明确选择一个边界：

1. 推荐：T2 交付一个**真实、无 Pi dependency 的 bounded Native Host protocol/process shell**，连同 Desktop
   independent supervision、authenticated rendezvous、health state 和 kill/restart/circuit-breaker proof；T4
   只把 Pi runtime/Session/Package execution 接入该真实边界并完成 dispatch fault matrix；或
2. 把所有 Host-specific supervision、health state 和 kill/restart acceptance 从 T2 移到 T4；T2 只证明
   Renderer/Service separation，并以真实 `engineSelection: unavailable` 保留 UI re-entry。

若选择方案 1，shell 必须是 T4 会原位接管的真实 transport boundary，而不是测试专用 stub 或第二套 Host。

**Why safe degradation is insufficient.** truthful unavailable 可以安全保留 UI，但它不能证明一个尚不存在的
进程崩溃后不会带崩 Window/Product Store，也不能产生 restart/circuit-breaker evidence。省略 fault test 会
直接削弱 R6；假进程则违反冰山法则。必须把真实 process shell 或真实 fault gate 放到同一 checkpoint。

## Non-blocking observations

### A-01 — rights path is viable, but T1 evidence must state what is deliberately not green

Rights review 对 fixed code/MIT/history 的采用路径给出了充分支持，并在当时的公开证据中发现 4,014 raw
SVG 缺少可继承 redistribution 证明。该 evidence finding 保留；后续维护者授权已 supersede 当时的零-corpus/
used-only 工程处置。当前 binding path 是完整 corpus、source-neutral line/fill + Glyph API、fixed/source/artifact
integrity 和 donor-product-asset exclusion，不再是 replacement gate。

不过 T1 同时被称为 rights-safe runnable checkpoint、non-candidate、not identity-green，并安排 source
rights/identity scan。Decomposition 应明确每个 T1 scan 的预期结果：authorized corpus delta 与 donor product binary 必须为零，legal
attribution 必须存在；donor code identity 与 mixed authority 则是 bounded non-candidate debt，不得把“scan 已跑”
写成“production identity green”。该澄清可随 F-01 一次完成，不需要新增权利研究。

### A-02 — Pi acceptance truth remains an implementation falsifier, not a reason to invent a receipt

Design 正确拒绝从 `prompt()` 返回或断连猜测 acceptance，并为 `accepted | rejected | indeterminate`、
`delivery_unknown`、`outcome_unknown` 和 no-blind-replay 提供了封闭类型与 fault matrix。固定 0.81.1 SDK 的
公开类型把 `prompt` 表达为 `Promise<void>`，donor PiAdapter 也在不等待 completion 的情况下返回自造
`turnId`；这些都不是可直接继承的 authoritative operation receipt。

同一 SDK 实现存在 preflight callback、SessionManager entries 与原生 stream/session facts，因此当前证据
没有证明该路径不可实现。QbD 2 应把“在任何 destructive authority deletion 前证明 queryable acceptance
boundary”放在 Host Concept 的首个 falsifier；若只能猜测，必须按 Design stop condition 收缩/停止，不能
让 local UUID 冒充 Pi accepted operation。由于当前 Design 已提供 indeterminate 安全路径和停止条件，这一项
是 residual implementation risk，不升级为 `NEEDS_EVIDENCE`。

### A-03 — UI 删除门需要把视觉人类校准放进执行顺序，而不是把 QbD approval 当视觉批准

Workbench 要求 same-state visual review 与 founder approval 先于 material product surgery/source-domain
deletion。PRD R11 已引用完整 approval gate，Design 的 preserved-behavior table 也要求 visual/a11y proof，
所以不存在授权缺口；旧 anchor 可以继续保留或 truthful unavailable，安全降级充分。

T1 glyph/path/temporary-brand calibration 后续已由维护者关闭，不再等待 replacement 选择；T3 IA 与最终品牌
surgery 仍必须明确 baseline/同状态 proof、维护者视觉校准、surgery、renewed proof、再删除旧 anchor。
QbD 1 人类 PASS 只批准设计方向，不能替代对真实 T3 候选的同状态视觉校准。

### A-04 — same-SHA gate must distinguish current candidate proof from historical T0 evidence

PRD R1 正确保留 T0 Git object 和既有 unchanged evidence，R12 又要求 T4 frozen candidate 的现状 gates、
artifact、journey、fault、UI 和独立 review 全部绑定同一 SHA。这两类证据可以共存：final SHA 验证祖先 T0
object/revision pointer 与当前 adapted source，而旧 unchanged build/smoke 继续只证明 provenance baseline。

Work map 不应把历史 T0 smoke 重新标成 final-SHA test，也不应为追求字面“所有日志同 SHA”重复未触发的
unchanged probe。R12 的“每个 AC”在分解时应写成“每个 current-candidate AC”；R1/F-04 的历史 object proof
使用显式来源 SHA，并由 final candidate 的 disclosure/integrity gate引用。

## Adversarial coverage results

| Counter-case | Result | Reason |
| --- | --- | --- |
| fixed code、lineage、legal text 可以进入接管链 | PASS | exact MIT、continuous history、legal copy 与 fixed source 相互支持；资产另行处置 |
| authorized corpus 必须 used-only pruning 才能保持 runnable | Rejected by later calibration | 完整 4,014-file corpus 已授权；line/fill path、Glyph API 与 exact artifact proof 是当前约束 |
| Web-only 或 component cherry-pick 足以保全母体 | Rejected correctly | Web/Desktop/Service/contracts/build closure 存在真实恢复、stream、packaging 耦合 |
| T1 同时满足 runnable mixed backend 与 Host-only zero dependency | **FAIL** | 固定 Server 直接依赖并执行 Pi；F-01 的两个 gate 在同一 T1 SHA 互斥 |
| Product State 与 donor Thread 可长期双写 | Rejected correctly | bounded cutover、fresh schema、single writer 和 negative scan 均明确 |
| raw Pi/provider payload 可以进入 React 后再类型化 | Rejected correctly | ingress validation、typed facts、unknown-version fail closed 与 raw-payload negative test完整 |
| local operation UUID 可以证明 Pi 已 accepted | Rejected correctly | Design 要求 queryable native fact，否则 indeterminate/delivery_unknown |
| uncertain dispatch 可自动 replay | Rejected correctly | outbox boundary与 fault matrix要求 uncertain replay count = 0 |
| T2 可以对尚不存在的 Host 完成真实 kill/restart proof | **FAIL** | T2 exit 依赖 T4 implementation；F-02 未给可验收对象 |
| Pi/Package crash 会带崩 Electron Main/renderer | PASS as a design path | independent executable、separate supervision、zero-dependency scan 与 kill fault gate形成可证伪路径，需先修 F-02 排期 |
| `Agent | Chat` 可通过另画薄 shell 完成 | Rejected correctly | full mother、single renderer/Composer/Timeline/Queue、same-state proof 与 no-dead-lineage 门均明确 |
| 未接线成熟域可以被永久删除 | Rejected correctly | target owner + truthful unavailable/re-entry + normal/failure/recovery/visual deletion rows |
| old authority 可用 feature flag off 代替删除 | Rejected correctly | runtime/dependency/source negative scans和 post-delete behavior/fault proof均要求物理退出 production graph |
| T0/T1 局部绿色可外推为 F-03/F-10/V1 | Rejected correctly | non-candidate labels、same-SHA T4 gate、independent review与 Campaign producer boundary明确 |

## Requirement judgment

| Requirement area | QbD judgment | Reason |
| --- | --- | --- |
| R1 exact T0 evidence | PASS | historical object、reused evidence 与 affected-path revalidation 区分清楚 |
| R2–R4 transplant/provenance/rights | FAIL only through F-01 | source/asset路径成立；T1 execution dependency contract 当前互斥 |
| R5 Product facts/single writer | PASS as design | fresh schema、atomic outbox、one writer、typed projection 和 no-dual-write 都可证伪 |
| R6 health separation | FAIL | T2 没有真实 Native Host implementation owner，却要求 Host fault proof |
| R7 UI mother | PASS with A-03 | preserved geometry/behavior、双语/a11y/perf和 deletion gate充分；需保留真实视觉人类校准 |
| R8 Native Host | PASS after F-02 sequencing repair | topology、credential、Session/control ownership与dependency scan完整 |
| R9 uncertainty | PASS as design with A-02 | typed receipt/fault windows/no replay成立；真实 acceptance 是实施首要 falsifier |
| R10–R11 deletion/preservation | PASS as design | old-anchor rows、target owners、failure/recovery/visual和 post-delete negative proof 完整 |
| R12 same-SHA verification | PASS with A-04 | frozen candidate gate充分；历史 T0 evidence 需保持显式不同来源 SHA |

## Human calibration options

当前 Design 不应原样进入 Decompose。可选治理路径是：

1. 采用 F-01 的推荐修复，把 T1 明确为受控 non-candidate exception；同时采用 F-02 方案 1，在 T2 建立
   无 Pi 但真实的 Host process/protocol/supervision shell，T4 原位接入 Pi 并完成 authority deletion；然后只对
   这两个 checkpoint delta 做 scoped QbD 1 re-audit；
2. 采用 F-01/F-02 的其他最小组合，保持最终 Pi-native/isolated boundary、母体和 single-writer 不变，再做
   同样范围的复核；
3. 收缩或停止本 task。

不需要重开 Converge、重做 rights/source-domain research 或制造新的 UI 方向。修复只应澄清真实施工阶段和
可执行 proof，不得顺势扩大 Package、Remote、外部 Engine 或发行范围。
