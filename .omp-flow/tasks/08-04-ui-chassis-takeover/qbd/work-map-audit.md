---
type: "QbD Audit"
title: "QbD 2: UI chassis takeover work map"
entry: "../work/index.md"
verdict: "FAIL"
actor_id: "ui_chassis_qbd_2"
dispatch_receipt: "32f70c7d286e4894b9410de22b1f60dd"
predecessor_receipt: "f55cf51059b84b70a413dabadcf687fd"
---

# QbD 2: UI chassis takeover work map

> Historical audit note: after this audit and its scoped PASS, controlling maintainer calibration
> merged product identity and the authorized asset closure into the existing runnable-source Work.
> The live catalog therefore has seven Works. This bounded ownership merge is not a new QbD round
> and does not alter this audit's historical WM-01 verdict.

本审计独立挑战已批准 [PRD](../prd.md) 与 [Design](../design.md) 的
[Work Map](../work/index.md) 及其八个 Work Concepts。审计不重开已经通过的 QbD 1 产品方向，
不把实现未知、后续验证或可选精修本身升级为阻塞，也不修复被审内容。

## Verdict

**FAIL。** Work Map 的顺序、责任切分、T1 债务封口、T2/T4 连续边界、视觉校准、删除门与
同一 SHA 冻结路线总体可以实现批准的 Design；但当前存在一个 material authorization/ownership gap：
Design 明确要求实现时由唯一架构 owner 确认 `apps/native-host` 的物理 placement，而八个 Work 均未拥有
这次 owner 变更，Host Work 的允许路径也不包含 `architecture/execution.md`。

这不是文档洁癖。按仓库的 authority routing，执行者在创建 `apps/native-host` 前必须先让 Execution
owner 与实现一致；当前 Work contract 却禁止执行者修改该 owner。继续施工会静默越过 sole owner，遵守
仓库合同则会在 R6 的核心路径上停工。跳过真实 Host、把它留在 Service 内、或另建一个 T2 临时 Host
都会分别破坏 R6、批准的物理 placement 或 T2→T4 原位连续性，因此不能用 unavailable、narrowing 或
其他安全降级绕过。

除该 finding 外，本轮没有发现第二个 unresolved blocking finding。修复应限定于给现有 Host Work 增加
一次有界 architecture-owner confirmation；不需要重开 Converge、QbD 1、rights research、UI 方向或新增
实现 Work。

## Audit identity and scope

- Entry: [UI chassis takeover implementation work](../work/index.md)
- Approved requirements: [Runnable UI chassis takeover PRD](../prd.md)
- Approved implementation design: [UI chassis source and authority takeover design](../design.md)
- QbD 1 basis: [attempt 1](design-audit.md)、[scoped PASS](design-audit-recheck.md) 与
  [human approval](../decisions/qbd-1-approval.md)
- Work Concepts: Work Map 链接的八个 Concepts
- Output: `qbd/work-map-audit.md`
- Actor: `ui_chassis_qbd_2`
- Dispatch receipt: `32f70c7d286e4894b9410de22b1f60dd`
- Predecessor receipt: `f55cf51059b84b70a413dabadcf687fd`

## Material finding

### WM-01 — FAIL: `apps/native-host` 没有 architecture owner 更新的可执行责任

**Cause.** 根架构索引将详细进程 topology 与 target responsibility layout 唯一交给
[`architecture/execution.md`](../../../../architecture/execution.md)。当前 owner 的 target tree 把 isolated
Native Host 描述为 Product Service 监督/协调的 worker，并没有声明 `apps/native-host` workspace。
[Design §3](../design.md) 随后选择 `apps/native-host` 作为具体 production executable placement，并明确写明：
进入实现时必须在同一 architecture change 中由 Execution owner 确认这个 placement，实现不得仅凭 Bundle
静默改变 sole owner。

然而 [Establish the real isolated Host boundary](../work/establish-isolated-host-boundary.md) 直接要求创建
`apps/native-host/**`，其 allowed repository paths 不含 `architecture/execution.md`，in-scope、done、handoff
和 ordering 也没有 owner-confirmation step。其余七个 Work 同样没有该路径或责任。Work Map 的 path
succession 只声明谁创建、谁扩展 Host，并未解决架构授权。

**Concrete consequence.** 执行者只有两个不合格选择：

1. 按 Host Work 创建新 workspace，由 Bundle 实现反向覆盖唯一架构 owner，形成未授权 topology truth；
2. 遵守仓库 routing，在 owner 不一致时停工，导致真实 Pi-free Host、认证 channel、独立 supervision、
   kill/restart/circuit-breaker 证据无法交付。

第二种直接使 R6 不可实现，并连锁阻断 R8 的同 Host 原位接入、R10 的旧 authority 删除和 R12 的 frozen
candidate。第一种则使通过测试的实现仍不能成为合法 product candidate，因为 durable authority 与生产树
不一致。

**Affected decision.** 受影响的是
[Host boundary Work](../work/establish-isolated-host-boundary.md)、
[Pi adoption Work](../work/adopt-pi-native-execution.md)、R6、R8，以及依赖它们的 T4/candidate route；
不是已批准的 Pi-native、进程隔离或 `Agent | Chat` 产品方向。

**Smallest remedy.** 在现有 Host boundary Work 中完成一次有界修复即可：

- 将 `architecture/execution.md` 加入该 Work 的精确 allowed paths；
- 在 in-scope/ordering 中把“先由 Execution owner 确认 `apps/native-host` 是既有 isolated Native Host
  职责的物理 executable workspace，再创建生产路径”写成第一项；
- 限定这次架构变更只确认 placement、build target 与既有 Desktop supervision / Service client 关系，
  不改变已批准的职责、产品对象或 topology；
- 在 done/handoff/review 中要求 owner 与实际 target、进程树和 T4 continuity 同一变更保持一致。

不需要新增 architecture Work：该 owner confirmation 与 Host 可执行路径是同一原子职责，由 Host Work
及其 reviewer 承担即可。Work Map 的 path ownership 段应同时标出这次 succession，避免后续实现者把
Bundle Design 误当作架构授权。

**Why safe degradation is insufficient.** R6 要求真实 production-path process，不允许用 read-model-only、
fake heartbeat 或 truthful unavailable 替代 process proof；把 Host 留成 Service 内 in-process worker 会失去
独立 kill/restart fault domain；为 T2 创建临时 path、T4 再换路径会违反已关闭 F-02 的 same executable/
endpoint/supervisor 约束。核心验收无法通过 removal、disable、narrowing 或 refusal-to-write 保留，因此
该 finding 是 blocking `FAIL`，不是 advisory。

## Requirement and carried-finding coverage

除 WM-01 的 owner 授权缺口外，Work Map 对批准要求的 executable ownership 完整：

| Requirement | Executable owner judgment |
| --- | --- |
| R1 | Source-closure Work 保持 T0 object/evidence；freeze Work 防止把历史 SHA 改写成 candidate proof。 |
| R2 | Source-closure Work 原子拥有 tracked dependency closure、路径改写、runnable proof 与 donor mirror removal。 |
| R3 | 现行 Source-closure 完整保留获授权图标 corpus，并原子拥有 asset/artifact/notices closure；freeze Work 复验。 |
| R4 | 现行 Source-closure 演进根 README 的唯一 adoption record 并完成最终产品 identity；retirement 仅作后续验证/必要校正。 |
| R5 | Product-facts Work 拥有 fresh store、admission/outbox、single writer 与 typed ingress；Pi Work 提供真实 acceptance。 |
| R6 | Host Work 的行为、协议、fault proof 足够精确；仅缺 WM-01 的架构 owner 授权。 |
| R7 | Agent/Chat Work 独占 Web surgery，消费 T2 read model，不另造 Product truth。 |
| R8 | Pi Work 原位扩展 T2 Host；retirement Work 完成 Host-external dependency 清零。 |
| R9 | Product-facts Work固定 durable uncertainty，Pi Work提供真实 crash windows，freeze Work绑定最终 fault gate。 |
| R10 | Retirement Work 以已接受 replacement handoff 为前置，按 domain 删除并复验。 |
| R11 | T1 保全完整 lineage；T2/T3 切换事实和表面；retirement 先 characterization 再 relocation/deletion。 |
| R12 | Freeze Work 只读选择 commit `C`，在 clean disposable repository 对同一 SHA 和 artifact 验证。 |

| Carried item | Judgment |
| --- | --- |
| A-01 exact T1 scan truth | Source-closure Work要求扫描前预枚举 exact package/path/identity set，额外 finding 立即失败；T4 必须无例外清零。 |
| A-02 queryable acceptance | Pi Work把可查询 native acceptance 设为第一 falsifier；retirement 在 replacement review 前无删除授权。 |
| A-03 visual calibration | Source-closure 对 icon seam、T3 对 material UI surgery 均要求 baseline → human calibration → surgery → renewed proof → deletion。 |
| A-04 SHA separation | Source-closure 绑定历史 T0 object；freeze Work把 current evidence、artifact 与 review 绑定到一个 `C`。 |

## Work-map quality judgment

### Scopes and ordering

- T1 虽然物理范围大，但它的原子性由“完整 runnable closure、无 root→vendor dependency、无第二 buildable
  tree”证明；把它拆成多个可运行中间树反而会制造错误生产边界。
- 现行 source/identity closure → Product facts → Host 顺序明确处理了 root/Desktop/Web/Service/contracts
  composition overlap。后继 Work 对同一路径是 succession，不是并发 writer。
- T3 只修改 Web presentation/projection；缺少 Product fact 时明确退回 T2 owner，而不是在 renderer 补状态。
- T4 的 Pi adoption 先建立 replacement proof，authority retirement 后删除，避免 replacement 与 destruction
  由同一未经复核步骤自证。
- Freeze Work 不修 production code；失败回到 owning Work 并使 candidate/review 失效，防止 final gate 变成
  排除项收集器。

### T1 expected-red boundary

T1 expected-red 不是 open waiver：允许集合限定为实现前预枚举的 Product Service Pi dependency 与 donor
code identity；rights/assets/legal/root-to-vendor 从 T1 起 hard green；任意额外 finding 失败；T1 SHA 不得成为
merge/release/candidate target；T4 source/lock/artifact gate 没有 exception set。

实现 review 应把“预枚举发生在首次相关 scan 之前”作为可审计时间事实，不能从 scan 结果反向生成 allowlist。
这是现有 Work 已表达的执行义务，不构成新的 blocking finding。

### T2/T4 continuity and truthful authority

Host Work 交付真实但 Pi-free 的 process/protocol/supervisor seam，只能返回 typed unsupported；Pi Work 必须
复用 executable identity、endpoint family、authentication、health、shutdown 与 supervisor，并新增真实
runtime message families。第二 Host、alternate transport、fixture acceptance 与 permanent translator 均有
negative gate。WM-01 修复后，这条阶段路线不存在 QbD 1 已关闭矛盾的回归。

### Visual and destructive gates

图标/identity 方向已由后续维护者校准锁定，现行 source-closure 要求保留全部获授权 corpus 并完成 renewed
same-state proof；material UI surgery 仍在删除交互锚点前要求 visual calibration。Retirement 必须消费 current Pi replacement review，并为每个删除域记录
normal/failure/recovery/visual/post-delete proof；rename、dead import、feature flag 或 hidden route 不算删除。

### Frozen candidate

Freeze Work 在全部 handoff/review/visual decision 当前有效后选择 immutable `C`，以 detached disposable
repository 验证同一 tree、artifact、journey、fault、UI 和 disclosure；任何内容变化产生新 candidate 并重跑
受影响 gate/review。它没有给 producer 自行标记 Campaign `verified` 的权限，也没有把 T0 evidence 冒充
final-SHA probe。

## Non-blocking precision observations

1. 后续维护者校准已经关闭当时的 A-03 索引精度问题：现行 Work Map 将已锁定的 icon/identity 方向与
   source-closure 的 renewed proof、Agent/Chat 的 material UI calibration 分开表达。
2. Retirement Work 允许有价值机制迁入“new concrete Service domain”前由 reviewer 接受 target path。
   实现时若路径超出其 allowlist，应先更新该 Work 的精确 path boundary，而不能只在 handoff 里默许。
   这已有 stop/review 路径，不阻塞当前 map。

## Human calibration options

当前适用选择只有三类：

1. 接受 WM-01，并对 Work Map/Host Work 做上述最小 owner-path 修复后发起一次仅限该 delta 的 QbD 2 复核；
2. 改为由现有 Execution owner 内已声明的物理路径承载 Host，但这会改变已批准 Design placement，需要先
   明确校准并同步 PRD/Design/Work，而不能由实现者自行选择；
3. 停止 Execute。

在 WM-01 未修复前，`FAIL` 不授权进入 Execute。修复不需要增加第四轮 source/rights evidence audit，也
不应重开 QbD 1 已通过的产品架构。
