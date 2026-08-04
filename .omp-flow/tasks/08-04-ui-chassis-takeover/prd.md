---
type: "PRD"
title: "Runnable UI chassis takeover"
---

# Runnable UI chassis takeover

本 PRD 将已选定的 [UI chassis synthesis](research/synthesis.md) 转成可观察、可证伪的 T1–T4
要求。来源和权利事实来自 [rights and assets review](research/rights-and-assets.md)，物理依赖与事实
权威来自 [source-domain audit](research/source-domain-audit.md)，checkpoint 选择来自
[takeover slice study](research/takeover-slice.md)。对应实现设计见 [Design](design.md)。
第一次 [QbD 1 audit](qbd/design-audit.md) 发现的两个 checkpoint 矛盾，按已确认的
[human calibration](decisions/qbd-1-calibration.md) 仅在 T1/T2/T4 阶段合同中修复；其余方向与 findings 不重开。

本 Bundle 不是耐久产品权威。产品宪法、完整 UI、产品事实、进程 topology、施工顺序和 Campaign 状态
仍分别由根 README、Workbench、Product State、Execution、execution brief 和 active Campaign 拥有。
本 Architect assignment 只写 Bundle，不修改 production、fixed baseline 或 Campaign。

## 1. Outcome

把现有 `vendor/ui` exact baseline 接管为 OmniMind 自有、可维护、无 buildable donor mirror 的产品底盘，
并在同一 frozen production candidate 上贯通：

```text
Chat / folder-backed Agent Composer
→ Product-owned durable admission and next-Run snapshot
→ accepted | rejected | delivery_unknown receipt
→ supervised isolated Pi Native Host
→ Pi-native Session / Model / Thinking / Tool stream
→ typed Product facts
→ preserved Timeline / Queue / Workbench
→ cancel, Host crash/restart and safe recovery
```

该 candidate 必须同时保住获准母体的 shell、导航、Composer、Timeline、Queue、workbench panes、
stream/scroll 和失败/恢复行为；清除 donor identity、未经 clearance 资产、Provider-first ontology、raw
Engine payload 入 React，以及 Product Service 内与 Pi 竞争的 accepted-operation 权威。

T1–T3 都只是可回退施工 checkpoint。T1 还是仅用于证明 mechanically moved dependency closure 的受控
local exception；该 SHA 不得单独 merge、发布或提升。T4 通过本 PRD 的 candidate gate 之前，不得宣称
production adoption、UI 完成、F-03/F-04/F-05/F-06/F-09/F-10 成立或 Campaign 完成。

## 2. Users and decisions supported

- 普通用户：无需安装或理解 Pi，即可从真实 onboarding 进入一个 Chat 或 folder-backed Agent。
- 产品用户：在 Host/Engine 不可用时仍可打开已有 Conversation 和 Workbench，并看见准确恢复入口。
- 实现者：可以按 T1–T4 顺序搬运、换权威、证明和删除，不依赖历史聊天猜测保留范围。
- reviewer：可以判定某个旧 source domain 是否已有唯一 target owner、完整 normal/failure/recovery
  replacement 和足够 proof，而不是根据目录已改名作结论。
- 维护者：可以从 fixed revision、原路径、目标路径、changed-byte class、rights 和 legal notice 追溯实际
  production adoption，同时不维护第二份来源 registry。

## 3. Scope

### In scope

- fixed U1 runnable dependency closure 的 Git-native source transplant；
- source rights、attribution、brand、authorized glyph corpus、generated source 和最终 artifact 处置；
- `apps/web`、`apps/desktop`、`apps/service`、独立 Native Host build target 与有真实消费者的 typed
  contract surfaces；
- Product State-owned first-journey schema、single-writer projection、transactional dispatch receipt；
- `Agent | Chat` 母体接管、中英关键路径、键盘/屏幕阅读器、CJK/IME 与同状态视觉 proof；
- isolated Pi Native Host、独立 supervision、真实 Provider/Model/Thinking、Session continue/rebuild、
  stream/tool/queue/cancel 和 crash/uncertainty proof；
- 旧 Provider/Session/accepted queue/retry/Package execution authority 与 buildable donor mirror 删除；
- 为本 slice 受影响的 build、typecheck、test、desktop smoke、artifact/source/identity scans。

### Non-goals

- 不完成所有 Packages、Remote、外部 Engine、三平台发行或整个 Workbench 的真实接线；
- 不新建与 Pi 竞争的 Runtime、Session store、Package loader、Tool executor 或通用 Engine Harness；
- 不把 donor Thread journal 原样改名成 Product State，也不保留长期 compatibility translator；
- 不迁移 donor 用户数据、配置或数据库；当前产品没有此类兼容义务；
- 不重画母体、挑少数组件做薄 shell，或因首个 slice 未接通就永久删除 Viewer、Git、PR、Kanban、
  Automations、Browser、Terminal、child 或 Package discovery presentation；
- 不重新运行未触发的 unchanged T0 baseline probe；
- 不由 producer 提升 Campaign claim，不在本 Bundle 创建第二套 adoption manifest、Campaign ledger 或
  architecture owner。

## 4. Binding constraints

1. 固定 revision、T0 tree 和法定 MIT 文本保持可追溯；来源清洁不能删除 attribution。
2. 完整 4,014-file authorized icon corpus 保留并获准在 source/artifact 中适配和再分发；必须逐文件保持
   filename/bytes 并移动到 source-neutral `line/fill` paths。donor brand binaries、screenshots、share handle
   和 marketing assets 不进入新的 author roots 或 production artifact。
3. T1 必须保持 runnable dependency closure，但不得通过 `apps/* -> vendor/ui/*`、复制第二棵母体或静默
   runtime asset fallback 达成。
4. **T4 production-candidate invariant**：Pi SDK 与 executable ecosystem code 只存在于独立 Native Host
   build target；Web、Electron Main、preload 和 Product Service 的直接/传递生产依赖扫描均为零。唯一的
   阶段例外是 T1 mechanically moved backend：它可以为 runnable closure 暂时保留已枚举的 mixed Pi
   dependency，但只能使用隔离、可删除的 local profile，不得接触真实用户数据、workspace 或凭据，不得
   生成 release artifact，也不得以 T1 SHA 为目标 merge 或 promote。该 dependency gate 在 T1 必须记录为
   expected red，在 T4 必须变为无例外 green；rights/asset/legal gates 从 T1 起始终为 hard green。
5. 从 T2 Product journey cutover 起，Product 只拥有 pre-dispatch intent、可见 Conversation/Run/receipt 和
   typed projection；旧 donor execution route 不可达。从 T4 接入起，Pi 拥有 accepted operation、native
   Session/transcript/compaction/branch、native controls 与 Package private state。T1 mixed backend 只能按第 4
   条受控运行，不构成已实现的 Product/Engine authority boundary。
6. 第一条真实 journey 切换为 Product facts 时只有一个持久 writer 和一个 live projection writer；旧
   orchestration/provider reducer 不得继续写同一 Conversation。
7. UI 必须消费 typed Product facts。raw Pi/ACP/provider event 和永久 `payload: unknown` 在 ingress 边界终止。
8. 物理接管、identity green、视觉接管和 execution 接管是不同 proof；前者不能冒充后者。
9. 每次删除必须晚于替代路径的 normal、failure、recovery 和适用视觉 proof。
10. 不可判定是否送达的派发必须结算为 `delivery_unknown`，保留用户输入且禁止自动、跨 Engine 或盲目
    replay。

## 5. Requirements

### R1 — T0 remains immutable evidence

实现不得改写 `vendor/ui` 后继续声称它是 exact baseline。T0 的 revision、tree、6,425 tracked files、
MIT legal copy、已记录 build/typecheck/macOS smoke 和 38 项 Web test failure 保持原含义。

T0 只有 source/tree/toolchain/packaged path/rights/Host boundary 等既有 trigger 改变时才复验受影响结论。
T1 发生路径与构建 topology 变化后，应运行新的 affected-path proof；这不是重复 unchanged baseline。

**Acceptance**：T1 候选可从 Git object 证明 T0 commit/tree 未被重写；Source Review 仍能引用原 tree；
实现记录明确区分 reused T0 evidence 与 T1 新 proof。

### R2 — T1 transplants one runnable dependency closure

T1 通过 Git-native move 接管 Web、Desktop、Server→Service、contracts/shared 中实际需要的职责，以及
root lock/config/patch/build/package scripts 的真实闭包。marketing、donor plans/audits/docs/screenshots、
CI policy、ignored `node_modules`/dist/cache 和无运行依赖的 repository debris 不进入 author roots。

T1 必须：

- 有 old path → target path → disposition 的完整映射；
- 从 Git tracked source 而非当前 working-tree outputs 构造；
- 更新所有 build/static/package/smoke path，不留下 root production import 指向 `vendor/ui`；
- 在 root frozen install、build、typecheck 与 macOS desktop launch 上可运行；
- 标记为 local non-candidate rollback checkpoint，不进入 release artifact；
- 只使用隔离、可删除的 development profile，不接触真实用户数据、workspace、凭据或用户既有 Pi 配置；
- 记录精确 expected-red debt：Product Service 的 mixed Pi dependency 与 donor code identity；除这份有界
  清单外，新增 identity/dependency finding 使 checkpoint 失败；
- 在同一 checkpoint 删除 worktree 中的 `vendor/ui` buildable mirror，同时保留 Git/object-level provenance。

**Acceptance**：依赖图和 filesystem scan 均无 root→`vendor/ui` import；root build/launch 使用目标路径；
generated/dist/cache 未作为 authored source；authorized corpus delta 与 donor product binary 为零且 legal/provenance gate 为绿；
Product Service Pi dependency 与 execution-code identity scan 只命中预先枚举的 expected-red debt；T1 不生成 release
artifact，且没有 merge、release 或 promotion 以该 SHA 为目标；evidence 不含 production/candidate 声明。

### R3 — Rights-safe assets and product identity from the first author-root checkpoint

T1 完整接管 authorized icon corpus，但不接管 donor identity assets：

- 1,979 line + 2,035 fill files 全部进入 `apps/web/public/icons/{line,fill}`；semantic filename 与 bytes 不变；
- path-independent registry 对 fixed Git trees、source 与 artifact 三方校验，不按实际调用裁剪；
- functional icon 只经 source-neutral `Glyph`/`GlyphStyle` API，保留 mask/currentColor/a11y，不维护第二套通用系统；
- Provider/Engine 使用真实 official mark/color 或 currentColor glyph；Model 无独立 mark 时继承 Provider；unknown
  identity 使用 neutral OmniMind-owned fallback，不用纯文字、lookalike 或其他品牌；
- 既有 OmniMind Agent Dock light/dark icons 作为当前锁定的一方 identity 接入 app、Dock/Taskbar、favicon、
  splash、About 与 default Agent；其 source、颜色、生成链和平台输出保持不变，donor binary、被否决的新
  mark/color 和 guessed replacement 为零。

T1 完成并锁定 visible product identity/resource wiring；T3 不承担 brand form/palette 替换。Production artifact 从实际 bundle 生成 SBOM/notices，
覆盖 icon、font、Electron/native dependency 和 redistributed artifact。`routeTree.gen.ts` 从 authored routes 再生成；
`theme.seed.generated.ts` 必须找到确定性 generator，或去掉虚假 generated 身份并按 authored source 管理。

**Acceptance**：source/artifact 各含完整 4,014 files，fixed/source/artifact 的 filename+byte delta 为零；
旧 path/API、donor identity assets 和第二 functional icon system 为零；Provider/Model/Engine matrix 与 neutral
fallback 通过；MIT legal text、fixed source、original lineage 和 actual third-party notices 可追溯。

### R4 — Production adoption has one disclosure, not a parallel manifest

实际搬运的同一变更必须更新根 README 的现有 `source-adoptions` 记录和必要 legal text。记录必须区分：

- T0 immutable source revision/tree（历史 evidence）；
- 当前实际 adopted production paths；
- 每个 target path 的 source prefix、mode、material change class 和 rights disposition；
- 不再存在的 exact zone 与仍受 author identity/structure scan 的 adapted paths。

不得为了让 root author paths 获得豁免而把 adapted bytes 描述为 exact tree。若现有 checker schema 只能把
`provenance.trees` 解释为当前 path 的 exact-zone assertion，实现必须在同一接管变更中收窄该语义；不能
保留一个不存在的 `vendor/ui` 路径或另建 source registry。

**Acceptance**：一个机器块即可解析 fixed source、current adopted paths、legal text 和 update policy；
current paths 全部接受正常 author identity/structure scan；不存在 declared-but-missing exact root。

### R5 — T2 establishes Product facts and a single typed ingress

T2 为首条 journey 实现 Product State 既有七对象所需的最少持久结构，不新造第八个公共本体。Web 使用的
read model 至少能表达：

- `Conversation`、可见 `Entry` 和当前/历史 `Run`；
- next-Run requested choice 与 receipt 中 resolved Engine/Model/Thinking/Permission/Target/Package generation；
- `EngineBinding` opaque lineage；
- `ResourceRef` 与 `OperationReceipt`；
- Queue item 仍可编辑、已 admission、accepted/rejected、`delivery_unknown`、running、settled、
  `outcome_unknown` 的准确分界。

Product Service 的 transactional outbox 原子保存 Entry、选择和 pending dispatch。Native/external ingress
各自把 wire 转为版本化 typed facts；React 只消费 Product read models。第一条 journey 采用一次性 cutover，
不双写 donor Thread/orchestration state。

T2 以封闭 contract/schema fixture 固定 accepted/rejected/`delivery_unknown` 等边界，但真实 Pi-free Host 只
返回 authenticated health 或 typed unsupported execution；fixture 不构成 Engine acceptance 或 runtime journey
证据。真实 acceptance、stream 与 uncertainty fault proof 属于 T4。

**Acceptance**：contract/schema tests 覆盖不变量；type/dependency test 证明 raw Engine payload 不进入 Web；
同一 Conversation 的持久与 live writer 各唯一；outbox fixture 可分辨未派发与派发不确定，且 T2 real-path
e2e 只产生 unsupported，不伪造 accepted/indeterminate；T4 real-path crash matrix 再证明真实派发边界。

### R6 — T2 separates process health and process responsibility

Electron Main 独立监督 Renderer/Window、Product Service 与 Native Host，不用一个 backend boolean 代表全部
健康。UI 至少区分：

- Renderer/Window 是否可用；
- Product Service 是否可读取产品事实；
- Native Host 是否存活/可重启；
- 当前选中 Engine/Model 是否可用。

Product Service down 可以使写入不可用但不得伪装 Engine fault；Native Host down 不得带崩窗口/Product
Store，也不得阻止已有 Conversation 的只读恢复。Desktop Main 只负责 OS capability、secret access、
process supervision 和有界 rendezvous，不理解 Pi Session 或 raw stream。

T2 必须交付一个真实、可执行、**不含 Pi SDK/runtime/Package code** 的 Native Host process shell。它不是
test stub：Desktop 使用未来生产路径启动并独立监督它，Service 与它通过有版本、有界、认证的真实 channel
完成 handshake、readiness、liveness 与 controlled shutdown。T2 的 protocol 明确拒绝尚未实现的 Run/Engine
operation，并以 truthful unavailable 返回；T4 必须原位扩展这一个 executable 与 channel，不能换成第二套
Host 或永久 translator。

**Acceptance**：Pi/executable-ecosystem dependency scan 对 T2 Host shell 为零；真实 process test 分别 kill
Renderer、Service、Host，验证 Host 的 authenticated rendezvous、独立 readiness、restart budget、circuit
breaker、用户可见 re-entry 和日志归因。Host crash 不带崩 Window/Product Store；没有测试专用假进程或
第二 transport。Product Service 的 T1 mixed Pi debt 此时仍是明确 non-candidate expected red，且旧 execution
route 已从第一条 Product journey 不可达；物理依赖与旧 authority 在 T4 删除。

### R7 — T3 puts the approved mother under real `Agent | Chat`

T3 保持批准的 shell/panel geometry、row grammar、Composer、Timeline、Queue、Workbench、pane lifecycle、
stream batching、scroll anchoring、xterm sleep/reconnect 和 route recovery，同时完成：

- 一级入口 `Agent | Chat`，Agent 左、Chat 右；键盘、a11y name 和测试顺序相同；
- Agent 有受管目录或 Primary Folder；Chat 无 Primary Folder，引用默认只读；
- 两者共用一个 Conversation renderer、Composer、Timeline、Queue 和 Workbench grammar；
- provider-first tabs、donor Studio/Home/Plugin ontology 不再是一级产品事实；
- 未接通的成熟域保留真实 unavailable/re-entry，不显示假按钮/假数据；
- 稳定中英 copy 集中管理，CJK/IME、keyboard、screen reader、focus-visible 与 reduced motion 可用。

**Acceptance**：真实 route/store e2e 证明两条入口、next-Run selection、Queue 编辑和 pane recovery；
同状态、同 viewport 视觉复核无未经批准 material drift；100k Conversation 与 burst stream 达到 Design
定义的可观察性能预算。

### R8 — T4 adopts the established Host boundary and preserves native authority

T4 在 R6 已证明的同一个 Native Host executable、authenticated channel、Desktop supervisor、health model、
restart budget 与 circuit breaker 上接入 Pi；不得新建替代 Host、旁路 transport 或测试后门。自 T4 candidate
起，该 Host 是唯一允许 import Pi SDK、Pi Agent runtime 与 executable Package/Extension code 的产品进程。它：

- 使用 exact Pi revision/version；
- 通过 Pi 原生 Provider/Model/Thinking catalog 和 Session API 执行；
- 返回可证明的 accepted/rejected/indeterminate acceptance observation、opaque Session/operation refs 和
  typed facts；Product Service 据此或据断连边界写入 accepted/rejected/`delivery_unknown` receipt；
- 保留 Pi 对 Session/transcript/compaction/branch、accepted queue/steer/follow-up/retry/abort、Tool 和
  Package private state 的权威；
- 不直接读写 Product Store，不获得无关 Engine credential；
- crash/restart 后基于 receipt/Session fact 恢复，不自行盲目重放。

Desktop、Web、Product Service 的 source、lock graph 和 bundled artifact 对 Pi executable dependency 均为零；
Desktop 可向 Host 提供单次、最小范围 secret handle/material，但不把凭据写入 argv、日志、DB、artifact
或 renderer。

**Acceptance**：真实 Chat 与 folder-backed Agent 使用 runtime-backed Model/Thinking；Session compatible
时 continue，丢失/分叉时准确 rebuild；dependency scan 和 process fault test 通过；Package/Host crash 不
带崩 Desktop/Product Store；T2 的 executable target identity、endpoint family、supervision state machine 与 health
语义被原位沿用，未出现第二 Host/transport；Product Service 的 T1 expected-red Pi dependency 与旧 execution
authority 均已删除，最终 source/lock/artifact scan 无例外 green。

### R9 — Dispatch uncertainty and controls are truthful

发送路径必须覆盖：

1. admission 前 validation/rejection：Queue item 保留可编辑；
2. Product admission 成功、Host 未接收：outbox 可安全重试；
3. Engine 明确 accepted：转移到 Engine-owned operation；
4. acceptance 边界断连：`delivery_unknown`，输入可见但不回 editable Queue、不自动 replay；
5. accepted 后结果不可判定：`outcome_unknown`，等待外部/Engine receipt 收敛；
6. cancel/abort：仅在 capability 与实际 operation state 允许时发送并显示真实 settlement。

运行中再次发送仍使用 Product pre-dispatch Queue；Engine 接受后的 steer/follow-up/queue semantics 不由
Product 模拟。Engine/Model 不可用时不 silent fallback。

**Acceptance**：可确定地注入每个 crash window；断言 writer、receipt、UI state、retry policy 与副作用
次数；任何 uncertain case 的自动 replay 次数为零。

### R10 — Old execution authority is deleted only after replacement proof

T4 production candidate 前删除或从 production graph 完全移除：

- donor Provider registry/static provider union/provider-first settings；
- Product Service 内 accepted turn queue、steer/retry/interrupt、Provider Session directory、runtime event
  journal、model/provider static authority；
- 与 Pi 竞争的 Session/Package/Skill loading/private-state authority；
- React raw orchestration/provider reducer、generic payload renderer；
- 临时 translator、alias/wrapper、donor storage/protocol/env/update namespace；
- buildable `vendor/ui` mirror。

每个删除域必须有 old anchor、target owner、normal/failure/recovery replacement 和 proof reference。仅
“改名”“不再路由到此 UI”或 feature flag off 不构成删除完成。

**Acceptance**：source/dependency/runtime scan 找不到上述生产 authority；删除表每一行都有可运行 proof；
移除旧域后重复相关 behavior/fault checks 仍绿。

### R11 — Mature non-Engine behavior remains in lineage

HTTP/static/attachment safety、WS admission/backpressure/resnapshot、Workspace containment、Git/checkpoint、
PTY、attachment crash recovery、automation scheduler、Desktop window/update/restart、Viewer/Diff/Terminal/
Browser/panes 等成熟机制不能因位于 donor Server 或尚未完全接入而整域删除。

首个 candidate 未激活的面必须保留 source lineage 和 truthful unavailable/re-entry。任何后续删除仍需
Workbench 的 source-anchor → direct transplant/replacement → behavior proof → visual review → approval gate。

**Acceptance**：domain map 对每个受保护面有 target responsibility 与状态；root build 不依赖 dead donor
tree；UI 不显示伪造 ready/empty success。

### R12 — Candidate verification is bounded and same-SHA

开发期按 checkpoint 运行最窄 checks。T4 candidate 冻结后，在同一 SHA 运行一次相关 gate：

- changed-path allowlist、`git diff --check`、worktree/source/legal/lock integrity；
- frozen install、build、typecheck、focused unit/integration/e2e；
- source/identity/structure/generated/artifact/dependency scan；
- real Pi Chat + Agent journey、Host/process/crash/uncertainty fault matrix；
- UI behavior、same-state visual、dual locale、a11y、CJK/IME、stream/scroll/performance；
- independent implementation review。

Producer 最多把受影响 Campaign claim 提交为 `candidate`。F-03/F-04 或其他 claim 是否改变由独立
reviewer 依据同一 immutable candidate 决定。

**Acceptance**：每个 current-candidate AC 都引用同一 candidate SHA 的 artifact/log/test；T0 historical
object/evidence 以明确 source SHA 被该 candidate 的 disclosure/integrity gate 引用，不伪装成 final-SHA
unchanged probe；没有把 T0、T1 或局部绿色扩张为未覆盖的平台、Package、外部 Engine 或 release 结论。

## 6. Checkpoint exit criteria

| Checkpoint | 可观察 exit | 明确禁止的声明 |
| --- | --- | --- |
| T0 | exact source/tree 与既有 baseline evidence 可读 | production adoption / compatible / tests all pass |
| T1 | target paths 从 tracked source 构造、complete corpus/product identity/rights/legal hard green、root build/typecheck/macOS launch、无 root→vendor dependency；mixed Pi dependency 与 execution-code identity 仅为枚举的 expected red | zero-Pi Service / merge or release / visual parity / product candidate |
| T2 | single Product writer、typed ingress；真实 Pi-free Host shell、认证 channel、独立 supervision/health/fault proof；旧 execution route 对 Product journey 不可达；枚举的 execution-code/Pi-dependency debt 仍明确 red | zero-Pi Service / Pi journey complete / UI complete |
| T3 | 真实 `Agent | Chat`、母体行为与视觉保全、双语/a11y/perf gate | native execution authority complete |
| T4 | 在 T2 Host 边界原位接入真实 Pi Chat+Agent，完成 process/dispatch/crash/uncertainty proof；Host 外 Pi dependency、旧 Engine authority 和 donor mirror 为零 | full V1 / cross-platform release / all Packages compatible |

## 7. Unresolved questions and decision rules

以下问题不阻塞 decomposition，也不授权提前造公共本体：

- Browser automation host 的最终落点：由最小 scoped capability 与 fault test 选择；renderer presentation、
  Desktop enforcement、Product receipt 和 Engine invocation 仍分别拥有。
- Git/checkpoint 是否生成 durable OperationReceipt：仅对需要恢复/解释的已批准副作用持久化；即时查询的
  Git external fact 不复制进产品状态。
- Brand form/palette 不再是当前开放问题：既有一方 icon 与平台输出保持锁定；只有维护者以后明确重开
  品牌校准时才允许改变，T3 不得自行引入 replacement candidate。
- Windows/Linux/webview/PTY/update：路径和 identity 改变已触发未来复验，但它们不阻止 macOS first-slice
  design；它们会阻止相应 release claim。
- donor storage-mock/attachment test failures：受影响测试迁移时归因；不得提前改写为 baseline 全绿，也
  不得无新假设重复整套 probe。

没有 unresolved product choice 会改变 T1–T4 的顺序、母体、rights boundary 或事实权威。若实现证据
证明 Product/Native authority 无法单写者切割，或 Native Host 必须把 Pi code 放入 Main/renderer 才能工作，
立即停止并回到 Converge，而不是增加 compatibility layer。
