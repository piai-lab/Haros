---
type: "Design"
title: "UI chassis source and authority takeover design"
---

# UI chassis source and authority takeover design

本 Design 实现 [PRD](prd.md) 的 T1–T4 边界，输入是已选定的
[research synthesis](research/synthesis.md)。它只定义未来施工与 proof，不改 production、T0 baseline、
Campaign 或 architecture owner，也不代表 QbD 1 或人类批准。
其中 T1 exception 与 T2 Pi-free Host shell 仅落实第一次 [QbD 1 audit](qbd/design-audit.md) 后确认的
[human calibration](decisions/qbd-1-calibration.md)；closed/advisory findings 继续生效，其他产品方向不重开。

## 1. Design summary

采用一条连续但分门的施工链：

```text
T0 exact evidence
  ↓
T1 rights-safe runnable source transplant (controlled local exception)
  ↓
T2 OmniMind identity + Product single writer + typed ingress
   + real Pi-free Native Host process/protocol/supervision shell
  ↓
T3 approved mother under real Agent | Chat
  ↓
T4 Pi adoption inside the established Native Host + duplicate authority deletion
  ↓
first production candidate
```

T1 保全物理依赖闭包，T2 更换产品事实入口并建立真实但 Pi-free 的 Host 故障边界，T3 更换用户心智，
T4 在同一个 Host 边界内更换执行权威。任何 checkpoint 都不通过长期双写或 buildable donor mirror 维持
回退；回退由 Git commit 与 immutable T0 object 提供。

## 2. Architectural invariants

1. **Source**：T0 是 immutable evidence；production 是 adapted source lineage，不伪装 exact copy。
2. **Rights**：代码许可与资产许可分开；完整 authorized icon corpus 逐字节保留并 source-neutral 化，donor brand 在 author root 边界前剔除。
3. **Product facts**：Conversation/Entry/Run/receipt 只有 Product Service 一个 durable writer。
4. **Engine facts**：从 T4 production candidate 起，Pi Session、accepted operation、native controls 与
   Package private state 只有 Native Host 内 Pi runtime 一个 authority。T1 mechanically moved backend 是
   唯一受控 local exception；它不能成为 merge/release/candidate target。T2 Product journey 不再可达旧
   execution route，T4 物理删除旧 authority 并使 Host 外 Pi dependency scan 无例外 green。
5. **UI**：Web 只收 typed Product read models，不消费 raw Pi/ACP/provider wire。
6. **Desktop**：Main 只拥有 OS/Desktop capability、secret access 和 supervision，不执行 Agent ecosystem code。
7. **External facts**：filesystem、Git、PTY、Remote/service 仍拥有真实状态；Product 只保存引用、观察和
   必要 receipt。
8. **Rollback**：checkpoint rollback 通过 Git；运行恢复通过 Product receipt/Engine fact，不能用 Git
   checkout/stash/reset 冒充。
9. **Deletion**：replacement proof 先于 source deletion；feature flag off 不等于 authority 删除。

## 3. Target source graph

目标责任沿用 Execution owner，并为独立 Host 增加一个真实 executable workspace；这不是第二 Runtime，
而是 native execution 的唯一进程边界：

```text
apps/web
  Product UI, route shell, typed read projections, workbench

apps/desktop
  Electron Main/preload/guest preload, OS capability, keychain, updater,
  Product Service + Native Host supervision and rendezvous

apps/service
  Product facts, outbox, projections, transport, Workspace/Git/PTY/attachment/
  automation product-control mechanisms

apps/native-host
  T2: real Pi-free executable, authenticated bounded protocol and health endpoint
  T4: same executable gains Pi SDK/runtime, native Session, ResourceLoader,
      accepted operations and Engine-to-Product fact translation

packages/contracts
  responsibility-scoped export surfaces; no catch-all barrel

packages/<specific-pure-domain>
  only where two real production consumers require the same pure mechanism
```

`apps/native-host` 是 Design 对“isolated Native Host build target”的具体实现 placement。T2 先建立真实、
Pi-free 的 process/protocol/supervision shell，T4 原位加入 native execution；两阶段使用同一 executable
identity、endpoint family 和 supervisor state machine。它是 Desktop 监督、Product Service 调用的 child，
不拥有新的产品本体。若 QbD/human 接受并进入实现，Execution owner 需要在同一 architecture change 中确认
这个物理 placement；实现不得仅凭本 Bundle 静默改变 sole owner。

`packages/contracts` 不提供 `NativeApi` 或 `GeneralEngine` 大接口。它只从明确 subpath 导出：

- product commands/facts/read models；
- Desktop IPC；
- Native Host ingress；
- External Engine ingress；
- system capability commands/receipts。

任一 subpath 只可引用其上游稳定事实。Native Host ingress 可以包含 Pi-specific namespaced fact，但 Product
core 和 React view model 不导出 raw Pi type。原 `packages/shared` 中只有出现第二个真实消费者且名称能描述
稳定纯职责的模块才保留；Thread/Provider/identity helper 在目标 domain 内改写或删除。

## 4. T1 — rights-safe runnable transplant

### 4.1 Source input

唯一输入是 T0 Git tree，不是当前 filesystem。实现先从 Git object 生成 tracked-path inventory，再把路径
分为：

| Class | Disposition |
| --- | --- |
| runnable authored source | Git-native move 到 target responsibility |
| build/lock/config/patch/script closure | 移入 root 并做最小 path/package edits |
| generated source | 只在 generator 可确定时重生成；否则按 authored snapshot 接管 |
| generated output/cache/dependencies | 不搬；从 frozen lock 重建 |
| donor plans/docs/audits/marketing/screenshots/CI policy | 不进入 runnable closure |
| authorized icon corpus | 4,014 files 全量进入 `line/fill` source-neutral paths；原文件名与 bytes 不变 |
| donor brand/other graphics | 不进入 author root；由 OmniMind-owned product assets 替换 |

路径主映射：

```text
vendor/ui/apps/web       -> apps/web
vendor/ui/apps/desktop   -> apps/desktop
vendor/ui/apps/server    -> apps/service
vendor/ui/packages/contracts -> packages/contracts
vendor/ui/packages/shared    -> retain only required modules, initially under its moved package
vendor/ui/{package.json,bun.lock,turbo.json,tsconfig*,vitest*,patches,scripts/...}
  -> root equivalent when dependency tracing proves required
```

`apps/server -> apps/service` 是 T1 允许的 mechanical responsibility rename；T1 不把其内部混合 authority
误称已解决。所有 import、workspace、static client、desktop spawn、artifact stage、test/smoke 和 package path
在同一 checkpoint 修改，否则 T1 不算 runnable。

### 4.2 Provenance transition

T1 之前的 README machine record 声明当前 exact path `vendor/ui`。移除该树时，同一变更必须改写现有
record，而不是留下 missing exact root 或新增 manifest：

- fixed `url`、`revision`、T0 repository commit/tree、MIT legal copy 和 update policy 保留；
- `paths` 变为实际 adopted production roots；
- 每个 root 能追溯 original prefix 和 material change class；
- adapted author roots 不拥有 exact-zone identity exemption；
- checker 只对仍存在且 declared tree 与 Git object 相等的路径授予 exact-zone 语义。

因此 T1 收口时 worktree 中不再存在 `vendor/ui`。T0 exactness 由已经提交的 Git object、fixed upstream
revision 和 legal evidence 继续证明；不得为了方便对照保留第二棵可构建源码树。

实现 evidence 可在本 Bundle 的后续 work Concept/handoff 中记录详细 rename/disposition 表；耐久来源真相
仍只进入 README machine record 与 Licenses。Bundle evidence 不是第二 registry。

### 4.3 Asset seam

完整 authorized icon corpus 与 donor brand 的处置不同：前者全量保留，后者不进入 author root。T1 同时建立：

```text
immutable fill/line Git trees
  -> complete path-independent digest registry (4,014 files)
  -> apps/web/public/icons/{line,fill}
  -> source-neutral Glyph/GlyphStyle resolver
  -> stable size/currentColor/mask/a11y wrapper
```

- registry 对 fixed Git tree、source 与 artifact 做全量 filename+byte comparison，不根据使用面裁剪。
- resolver 没有 generic lookalike/text fallback；unknown identity 使用 neutral OmniMind-owned mark。
- Provider/Engine 只在真实 selection/detail 边界使用可靠 official mark/color；Model 无独立 mark 时继承 Provider。
- T1 使用既有 OmniMind Agent Dock light/dark icon 完成 app/favicon/splash/About 与 artifact resource
  wiring；维护者随后将其锁定为当前一方 identity，source、形态、颜色、生成链和平台输出保持不变。

此 seam 只改变 path/API/product identity，不授权改变母体 geometry、density 或 interaction palette。T1 验证
尺寸、对齐、contrast、focus、light/dark 与 reduced-motion；T3 的 material visual review 只覆盖真实母体
接管，不再包含 mark/palette 替换。

### 4.4 T1 runtime profile

T1 只用独立、可删除的 OmniMind development profile 运行，不读写 donor global home、用户 `~/.pi` 或现有
CLI config。因为产品无旧用户，后续不迁移 donor DB。T1 可短暂运行原混合 backend 来证明 closure，但：

- 不连接真实用户数据、工作区或凭据；
- 不生成 release artifact，且 T1 SHA 不作为 merge、release 或 production-candidate target；
- 不把该 backend 的 state 迁入 T2 Product Store；
- T2 first-journey cutover 后旧 execution route 必须不可达；T4 再物理删除其 authority 与 dependency。

T1 是最终架构唯一的阶段例外，不是 architecture waiver。它的 runnable backend 可以直接/传递依赖 Pi，
因为此 checkpoint 只证明 source closure；Web/Main/Service 的 Host-only boundary 尚未完成。T2 的新 Host shell
自身必须保持 Pi-free，T4 candidate 才要求整个 Host 外 source、lock graph 与 artifact 全部 zero-Pi。

### 4.5 T1 proof

路径/topology 变化已触发受影响复验：frozen install、root build、typecheck、root macOS desktop launch、
static client serving、packaged-path resolution focused test、no-import-to-vendor scan、source rights/identity scan。
已知 T0 Web failures 保留事实；只迁移/运行受影响 focused tests，不把 T1 写成 upstream all-green。

T1 evidence 必须把 scan outcome 分成 hard-green 与 expected-red，不能用“scan 已运行”冒充 production green：

| Gate | T1 required result | T4 candidate result |
| --- | --- | --- |
| authorized corpus filename/byte/source/artifact delta | hard green: zero | green: zero |
| donor product binary in author roots or artifact | hard green: zero | green: zero |
| fixed source, lineage, MIT text and applicable notices | hard green: complete | green: complete |
| root import/runtime dependency on `vendor/ui` | hard green: zero | green: zero |
| Product Service direct/transitive Pi executable dependency | expected red, exact package/path set recorded | green: zero |
| donor code identity in adapted source | expected red, exact bounded finding set recorded | green: zero unrelated identity |

任何 expected-red 集合之外的新 dependency/identity finding 都使 T1 失败。expected red 只允许后续 T2–T4
继续在同一受控施工链上工作，不允许 T1 SHA 单独 merge、push 为 release source 或被描述为 candidate。

## 5. T2 — identity, Product State and typed ingress

### 5.1 Product persistence cutover

产品没有用户或 donor data 兼容义务，因此采用 fresh schema，不搬 88 个 donor migrations。最低持久集合
围绕 Product State 七对象实现；Package metadata 可作为现有对象中的值/关系，不抢先造新 aggregate。

第一条 journey 在一个 bounded cutover 中切换：

```text
old Thread command/reducer/store writer ── removed from journey
                                      X  (no dual write)
new Product command -> outbox -> facts -> projection -> Web read model
```

若为了机械迁移必须读取旧 snapshot，translator 只能是一次性、输入只读、输出新 schema 的 bounded tool，
不进入 runtime candidate；当前无用户数据时默认不实现。生产路径绝不同时写 donor Thread 和 Product
Conversation。

T2 只让真实 Pi-free Host shell 发出 handshake/health/unsupported execution 事实。下列 acceptance、stream、
control 与 settlement schema 在 T2 先以封闭类型和边界 fixture 固定；只有 T4 接入真实 Pi 后才能把这些
variant 作为 runtime journey proof。类型已存在不等于 Engine 已接受，也不得用 fixture 制造成功态。

### 5.2 Product commands and facts

最小 command surface：

- create/open Conversation；
- update draft and Product Queue；
- submit Entry with next-Run selection；
- reorder/edit/delete pre-dispatch intent；
- request supported cancel/control；
- open/reveal ResourceRef and invoke scoped system capability。

最小 durable fact/receipt surface：

```text
ConversationCreated
EntryAdmitted
RunRequested(requested selections, workspace observation, generation)
DispatchPending
DispatchAccepted(engineBinding, operationRef, resolved selections)
DispatchRejected(reason, retryability)
DispatchDeliveryUnknown(last confirmed boundary)
RunFactObserved(versioned typed fact)
RunSettled(outcome | outcome_unknown)
ResourceObserved / OperationReceiptRecorded
```

事件名是 Design 级语义示例，不要求一事件一表或公共 event-sourcing framework。实现应选最少结构守住
原子 admission、receipt 确定性和恢复不变量。

### 5.3 Transactional outbox

一次 submit transaction 原子保存：用户 Entry、requested Engine/Model/Thinking/permission/target/resources/
package generation、Run identity 和 pending dispatch。Dispatcher 使用稳定 dispatch id：

1. 未越过 Host send boundary：可从 outbox 重试；
2. Host 明确 rejected：记录 reason，输入保留但不自动改选；
3. Host 明确 accepted：记录 opaque operation/session reference，删除 editable Queue ownership；
4. send 后无 ack 且无法 query：记录 `delivery_unknown`，停止自动派发；
5. accepted 后失联：记录 `outcome_unknown`，只用 Engine/external receipt 收敛。

所谓 stable dispatch id 只用于 dedupe/查询，不授权 Product 模拟 Engine retry。T4-connected Native Host 若能
用 Pi 原生事实确认同一 dispatch 已 accepted，应返回原 receipt；无法确认就保持 unknown。T2 Pi-free shell
对 execution request 只返回 typed unsupported，不产生 accepted/indeterminate runtime 证据。

### 5.4 Typed ingress and projection

Native Host wire 先经过 bounded schema validation，再转成 small typed facts，例如 assistant text delta、
thinking status、tool started/progress/result summary、structured question、usage、control state、settlement、
capability/health。每个 fact 有 protocol version、Run/operation identity、monotonic sequence 或明确 snapshot
semantics、size limit 与 redaction policy。

T2 的真实 Host 只产生 handshake、health 与 unsupported execution 相关的这一子集；assistant/Thinking/Tool/
settlement 等运行事实由 schema fixture 验证边界，但必须等 T4 real journey 才构成能力证据。

Product projection 保留 donor 已证明有价值的 lease/cursor/buffer/resnapshot、tombstone 和 hot-path batching
机制，但 schema 只认识 Product facts。Web subscription 分为 shell summary 与 active Conversation detail；
active stream 增量更新，后台只更新有界摘要。React reducer 对未知 fact version fail closed 到 diagnostic/
resnapshot，不 generic render payload。

Host acceptance observation 与 Product receipt 使用封闭 discriminated union；至少具备下列可判定形状：

```text
HostAcceptance =
  | accepted { operationRef, engineBinding, resolvedSelection }
  | rejected { code, retryability }
  | indeterminate { lastConfirmedBoundary }

ProductDispatchReceipt =
  | accepted { operationRef, engineBinding, resolvedSelection }
  | rejected { code, retryability }
  | delivery_unknown { lastConfirmedBoundary, reconciliationHint? }
```

`delivery_unknown` 是 Product 对持久派发事实的判断，不是 renderer 或 Host 私自拥有的第二状态。它来自
Host 的 indeterminate observation，或 Product Service 在 send 后、accepted ack 前失联且无法查询的事实。
任何 variant 增加都要求 protocol/version 与 recovery fixture，不能落回 free-form error string。

### 5.5 Health model

Desktop supervisor 输出独立 health facts：

```text
renderer: ready | crashed | recovering | unavailable
service: starting | ready | degraded | restarting | unavailable
nativeHost: starting | ready | restarting | circuitOpen | unavailable
engineSelection: available | degraded | unsupported | unauthenticated | unknown
```

Product Service unavailable 时 Web 可从已有本地 snapshot 进入只读/恢复态；Native Host unavailable 时
Product facts和 Workbench 仍可读，Composer 准确禁用派发并保留 draft/Queue。单个 Engine unavailable 不
推导 Host 或 Service down。

### 5.6 Real Pi-free Native Host shell

T2 建立 `apps/native-host` 的真实 production-path executable，而不是 test stub、fake heartbeat 或未来会被
替换的临时 transport。它由 Desktop 独立 spawn/stop/supervise，与 Service 通过 T4 将继续使用的 endpoint
family 建立 channel。T2 最小 protocol 只包含：

```text
handshake(protocol version, process instance, one-time authentication proof)
readiness / liveness / health snapshot
controlled shutdown
unsupported execution response for any Run/Engine operation
```

- Desktop 创建 scoped endpoint 与一次性 secret/handle，分别传给 Service/Host；secret 不写 argv、日志、
  Product Store 或 artifact。
- Host 与 Service 双向验证 protocol version、instance identity、message type 和 size bound；认证或版本失败
  时 fail closed，UI 显示 `nativeHost: unavailable`，不能降级到 unauthenticated channel。
- T2 Host build graph 对 Pi SDK、Pi runtime、Package/Extension executable code 为零；它不创建 Session、不接纳
  Run、不发伪造 accepted receipt，也不执行 Tool。
- Product first journey 的旧 donor execution route 在 T2 cutover 后不可达；Composer 保留输入并准确显示
  Engine unavailable。mechanically moved mixed code/dependency 仍是 non-candidate physical debt，T4 删除。
- T4 在这个 executable 内增加 runtime/catalog/Session/dispatch message families；保留 executable target identity、
  endpoint family、authentication、supervision、health 和 shutdown contract，不新建第二 Host/transport 或
  永久 translator。

T2 fault proof 使用真实 child process：分别 kill Service 与 Host，验证 Window/Product snapshot 不受 Host
crash 影响；Host 按独立 restart budget 重启，超限进入 `circuitOpen`；用户可重试/重新进入；stderr ring
buffer 和 health reason 归到正确 process。测试同时拒绝 fake child、in-process Host 和仅修改 read model 的
模拟状态。

## 6. T3 — UI mother takeover

### 6.1 Route and navigation

authored routes 成为唯一 source；`routeTree.gen.ts` 确定性再生成。默认 route 与 navigation order 固定：

```text
Agent  |  Chat
```

- Agent 首次可在受管目录创建 Conversation，之后显式 Open Folder；Primary Folder 实质改变走新
  Conversation/Handoff。
- Chat 创建空 Conversation，不创建用户可见目录；Engine 真需要 cwd 时使用内部可回收 scratch。引用默认
  只读，需要写时显式 Send to Agent。
- Agent/Chat 共用 component/store projection，不 fork 第二套 Composer/Timeline/Queue。

现有 `_chat` shell 可作为几何 transplant anchor，但 donor route name 不成为产品 ontology。Provider/Studio/
Plugin route 只有 mapped behavior replacement 后删除；Package discovery 暂未接通时进入 Settings › Packages
truthful unavailable，而不是空成功页。

### 6.2 Preserved behavior map

| Preserved behavior | Target owner | Required proof before old anchor deletion |
| --- | --- | --- |
| shell/sidebar geometry, row grammar | Web Product UI | same-state visual + keyboard/a11y |
| draft, Composer, editable Queue | Product UI + Product State | edit/reorder/delete/admission/crash tests |
| virtual Timeline, stream smoothing, scroll anchor | typed projection + Web | burst/100k profile + reduced motion |
| tabs/splits/open target/pane recovery | Workspace Product facts + Web | per-Conversation recovery e2e |
| Viewer/Diff/Terminal/Git/Browser surfaces | Product UI + scoped system capability | normal/failure/re-entry per domain |
| subscription cursor/buffer/resnapshot | Product Service + Web | race/overflow/reconnect tests |
| desktop window/reload/update recovery | Desktop Host | process fault tests |

首个 slice 不要求所有行 fully operational，但每行必须保留 source lineage、target owner 和真实 unavailable
state。不得用永久 dead code 或 hidden route 充当 lineage；后续 domain 接管仍要按照 Workbench 删除门完成。

### 6.3 Locale and accessibility

稳定 copy 使用集中 locale key；dynamic Engine/tool/process output 保留真实原文。Agent/Chat、Composer、Queue、
unavailable/recovery 和 first-run 在 `zh-CN`/`en` 均有完整可理解路径。自动测试覆盖：

- roving focus、Home/End、Enter、disclosure、menu/keyboard drag alternatives；
- unique `aria-current`、screen-reader name、focus restore、focus-visible；
- IME composition 不提前 send，CJK/Latin/path mixed truncation；
- reduced motion 不删除 loading/progress/space semantics。

### 6.4 Performance budgets

T3 candidate 的具体预算在实现开始时从 T0 同机 profile 冻结为 Bundle evidence；不得事后选择宽松阈值。
最低可证伪条件：

- 100k+ 字符 Conversation 使用 bounded DOM，节点数不随历史字符线性增长；
- burst stream 按 animation-frame/有界周期批处理，不逐 token 触发 root/sidebar render；
- active Conversation stream 不使未变 row 或 hidden xterm 重渲染；
- Conversation switch、scroll anchor、top hover 和 split resize 无可感知长任务；
- 连续 burst/切换后的 heap 在 GC 后回到预先声明的有界增量；
- IME composition 与 stream 同时发生时输入不丢失。

报告必须给出硬件、build mode、fixture、测量方法、absolute number 和 T0/target comparison；“看起来流畅”
不算 proof。

T1 glyph path/API takeover 已由维护者校准关闭：完整 corpus 保留，既有一方 icon 与全部平台输出保持
锁定，不再等待或授权 replacement。T3 material product surgery 仍遵守 Workbench 的人类视觉门：
baseline/同状态 evidence → 维护者校准 → surgery → renewed proof → 删除；该门不包含品牌重设计。
QbD 1 不替代这次真实母体校准。

## 7. T4 — Pi adoption inside the established Native Host

### 7.1 T2 boundary and T4 runtime topology

```text
Renderer
  ↕ typed Product commands/read models
Product Service
  ↕ authenticated, versioned, bounded Host IPC
Native Host process
  ↕ native SDK calls
Pi runtime / Session / ResourceLoader

Electron Main
  ├─ supervises Product Service
  ├─ supervises Native Host
  ├─ provides OS/keychain capability
  └─ establishes scoped rendezvous; does not proxy raw Engine facts
```

图中的 Native Host executable、Service↔Host endpoint、one-time authentication、独立 readiness、restart
budget、circuit breaker 和 stderr ring buffer 已由 T2 的 Pi-free shell 真实建立并通过 fault test。T4 在
同一 process/transport boundary 内增加 Pi runtime 和 run message families；不得替换 endpoint family、并行
启动第二 Host 或让 temporary translator 成为 runtime path。运行 command/fact 直接在 Service↔Host typed
channel 流动，Main 不解析 Pi payload。

### 7.2 Native Host ingress

请求 envelope 至少包含：protocol version、dispatch id、Conversation/Run id、requested Engine/Model/Thinking、
permission policy + enforcement truth、ExecutionTarget/Resource refs、workspace observation、exact Package
generation、opaque prior EngineBinding。Host：

1. 验 schema/size/version 和 selected capability；
2. 解析 exact runtime/catalog/Session/generation；
3. 在调用可能被 Pi 接纳前不得伪造 accepted；
4. 获得 Pi accepted operation reference 后返回 accepted observation；
5. 将 native events 转为 typed facts并按 sequence/snapshot 发回；
6. settlement 后释放 per-Run lease/secret material。

若 Pi API 没有强 acceptance ack，Host boundary 必须通过一次可查询的 native Session/operation fact 建立，
否则 Host 返回 indeterminate，或 disconnect 由 Product Service 归为 `delivery_unknown`；不得用“prompt call
returned void”推断未送达。

### 7.3 Credentials and permissions

Provider credential 存于系统 Keychain。Native Host 只在对应 Engine/Provider/Run 获得最小、短期 secret
material或 opaque broker handle；不获得其他 Engine credential，不写 argv、env dump、Product DB、Session
diagnostic、crash log 或 artifact。若具体 SDK 只能读 env，Desktop 使用 child-private env 注入并在日志层
按 key/source redaction；该限制必须记录为 enforcement truth，不能宣传成 host sandbox。

permission policy 与 enforcement source 分开进入 Run snapshot。Host-enforced 只有 deny-side-effect test
证明实际 call path 阻止副作用时可使用；否则是 engine-enforced/mixed/unverified。独立进程本身只证明
crash containment。

### 7.4 Session and lineage

- Conversation 可有多个 `EngineBinding`，每个只保存 opaque lineage reference 和 compatibility facts。
- compatible Pi Session 存在时 Host 原生 open/continue；Product 不复制 transcript/compaction。
- Session 丢失时 Conversation 仍可读；UI 说明 hidden context/private state loss，并从可见 facts 创建新
  lineage。
- 从其他 Engine 返回 Pi 且旧 lineage 已分叉时新建 Pi lineage，不恢复陈旧 Session。
- Host restart 后先 query/open native Session，再收敛 Product receipt；任何非幂等 operation 不盲 replay。

### 7.5 Control semantics

Product command 只有用户意图与目标 operation ref。Host 根据 Pi 当前 capability/state 映射 native
steer/follow-up/abort；unsupported/too-late/unknown 分别返回 typed result。Product Service 不维护第二个
accepted queue 或 retry policy。运行中普通新输入仍留 Product Queue，直至新的 admission；只有 UI 明确
选择且 Pi native capability 支持时，才将某个操作解释为 steer/follow-up。

### 7.6 Fault matrix

| Fault window | Required durable result | UI behavior | Replay rule |
| --- | --- | --- | --- |
| before admission commit | no Run/dispatch; draft/Queue intact | editable | none needed |
| after commit, before Host send | pending outbox | sending/recovering | safe retry same dispatch id |
| after send, before native acceptance | pending or delivery_unknown based on provable boundary | retained input + accurate status | only retry if Host proves not accepted |
| after native acceptance, before Product ack | accepted if queryable, otherwise delivery_unknown | not editable Queue | no blind replay |
| during stream | accepted Run + last sequence | reconnect/resnapshot | resume facts, not operation |
| after side effect, before settlement | outcome_unknown + external refs | attention/reconcile | never re-execute effect |
| Host crash idle | Product Store intact | Host restarting; read-only workbench | none |
| Host crash with Run | accepted/unknown according to receipts | recover/reconcile | query Session/operation first |
| Service crash | outbox and receipts durable | shell recovery/read-only snapshot | dispatcher rules above |

### 7.7 Old-authority strangulation

删除按 domain，不按目录一刀切。每项使用同一表结构：

```text
old source anchor
current authority conflict
target owner/interface
normal replacement proof
failure/recovery replacement proof
visual proof when user-visible
deletion commit and post-delete proof
```

强制删除集包括 donor Provider registry、static Provider union、Provider Session directory/runtime event
journal、accepted turn queue/steer/retry/interrupt、PiAdapter 的 donor gateway wrapper、React raw event reducer、
generic payload renderer、Package/Skill cross-provider loading authority、temporary translator 和 donor mirror。

保留但改写集包括 HTTP/WS backpressure、projection repair pattern、Workspace containment、Git/checkpoint、
PTY、attachments、automation scheduler、Desktop supervision/update/recovery。保留的是 mechanism 和 failure
behavior，不是旧 Thread/Provider aggregate。

主要 source-domain 的预定替代关系如下；implementation handoff 必须把每行扩成可复核 proof，而不能另造
永久 ledger：

| Old anchor | Conflict / value | Target owner and replacement | Deletion gate |
| --- | --- | --- | --- |
| `vendor/ui/apps/server/src/orchestration/**` → mechanically moved `apps/service/src/orchestration/**` | Product receipt/projection pattern 与 Engine queue/interrupt/Session 混合 | `apps/service` 只保留 admission/outbox/Product projection；accepted controls 走 Host | admission/crash/replay matrix + no accepted-operation writer in Service |
| `vendor/ui/apps/server/src/provider/runtimeLayer.ts` and provider registry | 平级 Provider ontology、static catalog、Session directory | Pi native catalog 在 Host；未来 external Engine 走独立 ingress | real runtime catalog + no registry import/runtime route |
| `vendor/ui/apps/server/src/provider/Layers/PiAdapter.ts` | 高价值 native SDK integration 被 donor Harness 包裹 | native calls、Session、ResourceLoader 进入 `apps/native-host`；只发 typed facts | real Chat/Agent + Session/control/Package-boundary proof + Service/Desktop zero dependency |
| `vendor/ui/apps/server/src/agentGateway/**` and execution parts of `externalMcp/**` | Product capability 与 Engine Tool/Package execution 混成总线 | scoped system capability broker 留 Service/Desktop；Engine invocation 留 Host | deny-side-effect/fault proof + no general execution bus |
| `vendor/ui/apps/server/src/persistence/Migrations/**` | Product/Engine 混合 schema 和无兼容义务的历史 | fresh Product schema；Engine lineage 仅 opaque binding | fresh-start/restart/recovery proof + no donor schema read/write |
| `vendor/ui/apps/web/src/routes/__root.tsx` provider/orchestration reducers | valuable cursor/resnapshot 直接理解 raw Engine | typed Product shell/detail subscriptions and projection | race/overflow/resnapshot proof + raw-payload negative test |
| `vendor/ui/apps/web/src/components/ChatView.tsx` turn dispatch/accepted queue | UI 同时做 Product/Engine dispatch authority | Composer/Product Queue commands + receipt-driven controls | Queue/acceptance/control e2e + old dispatcher unreachable and deleted |
| `vendor/ui/packages/contracts/src/{orchestration,provider*,ipc}.ts` mixed surfaces | schema mechanics 有价值，ontology 混合且含 unknown payload | responsibility-scoped Product/Desktop/Host/external/system contract exports | import-boundary/type fixtures + no catch-all barrel/raw payload |
| `vendor/ui/apps/desktop/src/main.ts` single backend supervision | mature recovery，单 boolean 混淆 Service/Host/Engine | independent supervisors + typed health/rendezvous | kill/restart/circuit-open matrix for each process |
| donor brand and historical icon paths/build manifests | build-coupled identity 与来源命名 | complete line/fill registry + stable Glyph API + OmniMind-owned product assets | fixed/source/artifact digest scan + visual/a11y proof + notices |

## 8. Migration and compatibility

### Source transition

- T0 Git object 是 rollback/provenance source；T1 不复制第二树。
- Git rename evidence 是辅助，不依赖 Git heuristic 作为唯一 provenance；README adoption record 明示 source
  prefix/target/disposition。
- T1–T4 每个 commit 可回退，但只有 T4 candidate 可被 review 为 production adoption。

### Data transition

- 没有用户与公开 schema，采用 fresh Product Store；不交付 donor DB importer。
- T1 dev profile 可删除，不进入 T2；不读取或污染 `~/.pi`/donor global state。
- Native Pi Session 由 Host 原生创建/打开；Product 只存 opaque binding。

### API transition

- first journey 一次性从 donor transport/store 切到 Product command/fact surface；不双写。
- 未接管成熟域使用 truthful unavailable 或保留现有 Product-control query，但不能调用旧 Agent execution。
- 临时 adapter 只能在一个 bounded implementation change 内存在，接受前删除；不保留 alias/deprecated API。

### Release compatibility

T4 只形成 first production candidate，不证明 Windows/Linux/install/update。root path、identity、child topology、
Pi version 和 asset set 的变化分别触发其受影响的 packaged/cross-platform proof；后续按 execution brief
执行，不从 macOS evidence 外推。

## 9. Verification strategy

### Focused development checks

| Area | Fast falsifier |
| --- | --- |
| source move | tracked-path map completeness; no root import to vendor; workspace graph |
| rights/assets | complete fixed/source/artifact glyph digest; donor-asset negative scan; actual notices |
| contracts | compile-time import boundaries; schema fixtures; unknown-version rejection |
| Product facts | admission atomicity; single-writer test; Queue/Run invariants |
| projection | sequence gap, duplicate, stale snapshot, overflow, reconnect/resnapshot |
| Desktop | T2 real Service/Host child start/kill/restart/circuit-open fixtures; no fake child |
| Native Host shell | T2 zero-Pi dependency, authenticated handshake/version/size rejection, readiness/shutdown |
| Native Host runtime | T4 exact SDK dependency, acceptance receipt, Session continue/rebuild, crash windows |
| UI | route/keyboard/locale/IME/failure state e2e; targeted same-state screenshots |
| deletion | dependency/source scan plus old-entry negative integration test |

### Checkpoint gates

**T1**：tracked closure、provenance transition、rights-safe assets、frozen install/build/typecheck、macOS launch、
static/package path、no vendor dependency。authorized-corpus integrity、donor binary、rights/legal 和 root→vendor 为 hard green；
Product Service mixed Pi dependency 与 donor code identity 只能命中已枚举的 expected-red set。T1 使用隔离
disposable profile，不接真实数据/workspace/credential，不产 release artifact，且该 SHA 不可单独 merge、
release 或 promote。

**T2**：OmniMind-owned visible identity 与 T2 新/改写表面的 source/identity/document gates、artifact asset scan、
Product schema/outbox/single writer、typed ingress、raw-payload negative compile test；真实 Pi-free Host executable、
authenticated/versioned/bounded channel、independent Desktop supervision、kill/restart/circuit-open/re-entry fault
proof；旧 execution route 对 Product journey 不可达。枚举的 donor code identity 与 Product Service mixed Pi
dependency 仍是 non-candidate expected red，不能宣称 complete identity 或 Host-only green。

**T3**：Agent/Chat journey、Queue/selection/pane recovery、bilingual/a11y/IME、same-state visual、performance profile。

**T4**：在 T2 同一 Host executable/transport/supervisor 内接入 real Pi Provider/Model/Thinking、Chat+Agent、
Session continue/rebuild、stream/tool/control/cancel，完成 process and dispatch fault matrix、secret leakage scan、
no-Pi-dependency outside Host、old-authority deletion；第二 Host/transport scan 为零。

### Frozen candidate gate

候选 SHA 冻结后：

1. 核 base/candidate SHA、allowlist、clean tree、lock/legal/source disclosure；
2. 运行一次相关 root quality/build/typecheck/focused+integration/e2e；
3. 运行真实 process/Engine journey 和全部新增 fault injection；
4. 运行 source/identity/structure/generated/final artifact/SBOM/notices scan；
5. 运行 dual-locale/a11y/IME/performance/same-state visual proof；
6. 交给独立 reviewer，producer 不自证 verified。

## 10. Rejected alternatives

### Keep `vendor/ui` and build new code beside it

拒绝：形成永久 donor mirror、root→vendor dependency 和双权威；回退应由 Git object 而非第二产品树提供。

### Promote the whole exact tree, including assets, then clean later

拒绝：会把 donor identity、former product graphics、static Provider ontology 和旧 Runtime 写入可传播
history。授权 corpus 是显式保留项，但必须先完成 source-neutral path/API 与 exact registry。

### Move Web first and mock the backend

拒绝：丢失 root projection repair、Desktop/Service packaging、failure/recovery 和 workbench behavior，并制造
React-only fake Product State。

### Rename Server to Service and retain its aggregate

拒绝：路径不改变 accepted queue、Session、retry、Provider/Package authority；T2/T4 必须按事实所有权切割。

### Delete the Server and rebuild from scratch

拒绝：会丢 WS backpressure、projection repair、Workspace containment、Git/checkpoint、PTY、attachment、
automation 和 Desktop recovery 等成熟冰山机制。

### Put Pi in Electron Main for simpler packaging

拒绝：Package/Extension crash 与第三方 executable code 会进入最高权限长期进程，违背产品宪法和 F-05。

### Use ACP as the Pi Gold Path

拒绝：会压平 Pi native Session/Package/Thinking semantics；ACP 保留给外部 Engine ingress。

### Preserve donor database and migrations for safety

拒绝：当前没有用户兼容义务，保留混合 aggregate 只会把错误 authority 永久化。行为 tests 可迁移，旧
schema/migration 不进入新 Product Store。

## 11. Risks and stop conditions

| Risk | Containment | Stop condition |
| --- | --- | --- |
| locked brand or glyph wiring drifts | complete registry + digest guard + same-state review | asset/source/platform digest changes without explicit maintainer reopening |
| Product and donor writers overlap | bounded journey cutover + negative writer scan | 两个 durable writers 可接受同一 command |
| Host API lacks acceptance truth | queryable Session/operation fact or delivery_unknown | 只能靠猜测判断已送达并需要 blind replay |
| Main/Service accidentally bundle Pi | package/lock/artifact dependency scans | Pi executable dependency 不能从 Host target 隔离 |
| Service split discards mature recovery | characterization tests before deletion | normal/failure/recovery replacement 无法证明 |
| source disclosure becomes second manifest | evolve existing README record only | current paths/exact-zone 语义无法在一个 record 中准确表达 |
| UI preservation hides unavailable fake state | real capability/health read model | 首个 slice 只能靠 mock/假按钮保持母体 |
| performance regression is structural | freeze budget before surgery, profile each seam | typed projection 无法在母体几何下满足预算 |

命中 stop condition 时不得增加兼容双轨或第四轮同类证据审计。若它推翻 rights、single-authority、Native
Host 或母体可行性，按现有 reopen condition 回到 Converge；否则收缩具体 implementation Concept 并继续。

## 12. Decomposition readiness

本 Design 可在 scoped QbD 1 与人类校准通过后分解为四个 dependency-ordered implementation Concepts：

1. rights-safe runnable source transplant；
2. identity/Product facts/typed ingress cutover，以及真实 Pi-free Native Host process/protocol/supervision shell；
3. real `Agent | Chat` mother takeover and visual proof；
4. 在 T2 Host 边界原位接入 Pi，完成 real vertical slice and old-authority deletion。

每个 Concept 必须只拥有自己允许的 production paths，并在 handoff 中附 source-domain deletion rows、focused
proof 和未提升的 Campaign evidence。未经 QbD 1 人类批准不得创建 implementation work。
