# OmniMind V1 — Execution Brief

本文件只回答“按什么顺序施工、何时进入、何时停止、需要什么 proof”。产品宪法以 [`README.md`](README.md) 为准；完整 UI、公共表面、产品事实和详细 topology 分别以 [`architecture/workbench.md`](architecture/workbench.md)、[`architecture/public-surface.md`](architecture/public-surface.md)、[`architecture/product-state.md`](architecture/product-state.md) 和 [`architecture/execution.md`](architecture/execution.md) 为准；claim 状态只见 active Campaign。

## 1. 读取与施工规则

施工前按统一路由读取：README → architecture index 与全部相关专题 owner（公共出口任务包含 Public Surface owner）→ 本 brief → active Campaign（仅状态）→ 与来源、既往裁决或潜在反证相关的 research evidence。

阶段文本只能引用 owner，不得在这里创建产品对象、物理树、Engine 语义或 UI 行为。若 owner 冲突、进入条件不成立、proof 不可执行或新证据命中结构性 falsifier，停止并修复权威图；不得靠本 brief 覆盖架构。

开发期使用最窄可证伪检查。阶段候选固定 SHA 后才运行对应 final gate；producer 只能提交 `candidate`，不能自证 `verified`。

## 2. 当前证据入口

首个本地、未签名 macOS arm64 Pi-native 纵切候选固定为 `248b3316651e681d9d4c78f81bec0c84a4cc822c`。[`Freeze handoff`](.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/freeze-first-production-candidate.md) 记录同一 SHA 的 source/review chain、完整 build/typecheck/quality/test、真实 Chromium/Electron、MiMo/DeepSeek Pi journeys、fault matrix、实际 ZIP/process tree、legal/SBOM/glyph 与脱敏结果；[`different-actor review`](.omp-flow/tasks/08-04-ui-chassis-takeover/reviews/freeze-first-production-candidate.md) 的结论为 `PASS`。该 checkpoint 接受 Stage 0–3 的当前纵切，不等于签名、notarization、Windows/Linux、Package、外部 Engine、Remote 或 V1 完成。

[`research/source-review.md`](research/source-review.md) 仍单独拥有 fixed imported tree 的 exact comparison、frozen install、build、typecheck、unchanged baseline 与复验触发器。历史 baseline evidence 不得改写成当前候选 proof，当前候选 proof 也不得扩张为未覆盖的平台或产品结论。

首个真实 headless Pi Package checkpoint 固定为 `16f14d188e38134f6f45c46bfcb57ff36c1e8565`。其 [归档 Bundle](.omp-flow/tasks/archive/2026-08/08-06-pi-package-lifecycle/) 保存 exact source/rights、Product-owned stage/current/LKG/quarantine/lease、Pi-native ResourceLoader/private state、fault recovery、真实 MiMo/DeepSeek 与实际 macOS arm64 ZIP/ASAR 证据，以及 different-actor `PASS`。该 checkpoint 只支持当前 Package 纵切，不证明完整 Catalog/compatibility taxonomy 或后续阶段。

只有 Source Review 的复验触发器发生变化时才重跑受影响检查：source revision/tree、rights/history/assets、Pi/SDK/package format、Bun/Node/platform/packaged Electron path、Native Host boundary、structured UI bridge contract，或可复现的新反例。没有触发器时不得重复 unchanged baseline smoke。

## 3. Stage 0 — Durable contract freeze

**进入条件**

- 已接受的 product doctrine、architecture design 与 QbD calibration 可从仓库读取；
- 变更边界明确，用户已有修改可保留；
- 本阶段不声称产品 UI 或 Runtime 已实现。

**施工顺序**

1. 让 README、architecture、research、execution order 与 Campaign status 各有唯一 owner；
2. 在 Workbench 冻结完整用户可见契约与 source-domain 删除门；
3. 建立 declared exact-source/identity boundary 和 bounded document-contract validator；
4. 运行 focused fixtures、source/identity checks、immutable path/tree proof 与独立 review；
5. 候选冻结后在同一 clean SHA 运行一次相关 total gate。

**停止条件**

- 任一事实仍有两个可执行 owner；
- Workbench 可在缺少替代行为时删除获准母体域；
- exact provenance 与 production identity 的 gate 仍互相矛盾；
- Campaign claim 被文档生产者自行提升。

## 4. Stage 1 — Evidence and rights review

**进入条件**：Stage 0 的 owner graph 与 proof path 已通过独立 review。

**顺序与 proof**

1. 复核 Source Review 中已记录的 F-03/F-04 evidence，不重做未触发的 probe；
2. 闭合 original-upstream lineage、contributors、license 与 production assets 的剩余 gaps；
3. 在同一 immutable candidate 上核 exact tree、rights disclosure、legal text 和 unchanged baseline 边界；
4. 只有独立 reviewer 接受证据后，才按 Campaign 规则改变相关 claim 状态。

**停止条件**：rights 无法成立、exact tree 不一致、资产不能合法进入 production，或 evidence 被误写成产品兼容结论。

## 5. Stage 2 — UI source-domain takeover

**进入条件**：获准 baseline 与 rights boundary 已固定，Workbench 的 preserve/adapt/delete gate 可执行。

按 Workbench 逐域建立 source anchor、目标职责、正常/失败/恢复行为、视觉与性能 proof。产品事实接入只消费 Product State，进程接入只消费 Execution；不在本 brief 定义替代状态机或 topology。替代路径未运行并通过 proof 前，不删除源域，也不在旁边另建薄 shell 或长期 donor mirror。

**停止条件**：域映射缺失、行为只能靠截图证明、typed boundary 不存在、failure/recovery 被省略，或删除会造成已批准能力回退。

## 6. Stage 3 — Native Host vertical slice

**进入条件**：首批 UI 域已映射，Execution-owned Host boundary 与 Product-State-owned admission/receipt contract 可实现。

先交付一个真实 Chat 与一个 folder-backed Agent journey。实现必须遵守 Execution 的隔离、typed ingress、Engine authority 和故障边界，以及 Product State 的 Conversation/Run/Queue/receipt/unknown-delivery 规则。本阶段的 proof 至少覆盖真实 Provider/Model/Thinking、Session continue/rebuild、stream/tool/queue/cancel、Host crash/restart、文件写前提和不可盲目重放。

**停止条件**：Native code 进入 Desktop/renderer、出现第二套 Session/queue/Package authority、raw wire 进入 React，或 uncertain dispatch 被自动重放。

## 7. 后续顺序

1. 一个真实 headless Package，加 staged activation、lease、LKG 与 fault proof；
2. 一个真实外部 Engine，证明 capability/permission difference、next-Run choice 与 no silent fallback；
3. 文件/Diff/Terminal/Artifact、一个真实 Remote target 和 durable external process；
4. 大 Conversation/Output、双语、可访问性和三平台性能；
5. macOS、Windows、Linux install/update/rollback 与同一 final SHA completion audit。

每个阶段的产品含义仍由 architecture owner 定义；本列表只规定依赖顺序。未经前一阶段真实 proof，不提前制造 Package marketplace、通用多 Engine framework、重型知识库或固定 Workflow designer。

## 8. Proof gates

### 每次局部改动

- 运行受影响的最窄类型检查/单测与 source/identity/document gate；
- 检查允许路径、意外 generated files、debug residue 和用户未知修改；
- 不把局部绿色扩张成未覆盖结论。

### 每个阶段候选

- 固定 base/candidate SHA，核 changed-path allowlist 与 `git diff --check`；
- worktree clean，source rights 与 lockfile 完整；
- relevant unit/integration/e2e 与当前新增副作用的 fault injection 通过；
- 真实进程、Package、Provider 或平台场景按本阶段范围通过；
- producer 只提交 `candidate`，独立 reviewer 决定是否支持下一状态。

### V1 final candidate

- 所有 required claims 在同一 final SHA 为 `verified`，`blocked = 0`；
- 三平台相关 final gates 各运行一次；
- fresh-context completion audit 无 material finding；
- 没有 donor identity、双 Runtime、平行 Package loader、静默 fallback、虚假权限或不可恢复迁移。

## 9. 当前唯一下一动作

Stage 0–3 已在 `248b3316651e681d9d4c78f81bec0c84a4cc822c` 形成并独立接受首个纵切候选；真实 headless Pi Package checkpoint 已在 `16f14d188e38134f6f45c46bfcb57ff36c1e8565` 形成并独立接受。现在只进入一个真实外部 Engine：通过 ACP、官方 headless protocol 或经证据选择的最薄真实路径，证明 capability/permission difference、next-Run choice、外部 Session authority 与 no silent fallback；不得把 Pi Gold Path 压成最低公分母，也不得先造通用多 Engine framework。

该外部 Engine proof 未完成前，不提前进入 Remote、三平台发行或 Marketplace 扩建；除非 Source Review 的复验触发器变化，不重复 unchanged baseline smoke。

F-13 被接受并完成 generation rotation 后、进入 Remote 前，下一 bounded checkpoint 固定为 Product truth consolidation：先创建并验证全部受影响开发 store 的 backup/export，再确立 first-public-schema baseline、删除未发行 schema 的 steady-state compatibility、按稳定职责拆分 `ProductControlPlane`，并证明 production code 与概念复杂度实质净减。该施工不属于当前 F-13，也不得在本 generation 提前实现。
