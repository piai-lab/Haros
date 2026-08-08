# OmniMind V1 — Execution Brief

本文件只回答“按什么顺序施工、何时进入、何时停止、需要什么 proof”。产品宪法以 [`README.md`](README.md) 为准；完整 UI、公共表面、产品事实和详细 topology 分别以 [`architecture/workbench.md`](architecture/workbench.md)、[`architecture/public-surface.md`](architecture/public-surface.md)、[`architecture/product-state.md`](architecture/product-state.md) 和 [`architecture/execution.md`](architecture/execution.md) 为准；claim 状态只见 active Campaign。

## 1. 读取与施工规则

施工前按统一路由读取：README → architecture index 与全部相关专题 owner（公共出口任务包含 Public Surface owner）→ 本 brief → active Campaign（仅状态）→ 与来源、既往裁决或潜在反证相关的 research evidence。

阶段文本只能引用 owner，不得在这里创建产品对象、物理树、Engine 语义或 UI 行为。若 owner 冲突、进入条件不成立、proof 不可执行或新证据命中结构性 falsifier，停止并修复权威图；不得靠本 brief 覆盖架构。

开发期使用最窄可证伪检查。阶段候选固定 SHA 后才运行对应 final gate；producer 只能提交 `candidate`，不能自证 `verified`。

### Synara-first 复用门

[`architecture/workbench.md`](architecture/workbench.md) 已确认 adopted Synara UI mother 是完整物理产品基座，而不是只供参考的截图。File tree/search/reveal、Viewer、Diff/Changes、Terminal/PTY、Git/PR、Conversation/stream/output、简体中文/英文、可访问性以及 Electron 桌面/发行基座已经存在时，Campaign 的 `open` 只表示 OmniMind 语义与证据尚未闭合，不得据此推断“功能不存在”并从零施工。

每个后续 Work 在改代码前必须在同一 Work 或 handoff 中简短回答：

1. 当前 adopted Synara/仓库基座的精确入口与已保留行为是什么；
2. architecture owner 要求而现有基座尚未满足的差异是什么；
3. 本次处置是直接复用、接线、局部修复还是替换；
4. 若选择替换，哪个可复现反例证明接线、authority 收口或局部修复不足；
5. 哪个 focused proof 能证明差异已闭合且既有能力没有回退。

无法回答第 2 或第 4 项时，不得重构既有机制。不得为了命名统一、未来可能需要、Campaign 术语或更容易写测试而建立第二套 File、Viewer、Diff、Terminal、Conversation、Package、updater、platform adapter 或状态权威。新发现的 Synara 上游能力按 [`research/source-update-intake.md`](research/source-update-intake.md) 先做只读 intake；未经维护者对当次 bounded update set 再确认，不进入 production，也不打断当前唯一 checkpoint。

治理脚本、meter、fixture 与文档 gate 只是施工工具，不是第二个产品。若同一证明工具连续两轮只有相邻同类 finding、没有 acceptance 状态迁移，立即停止逐形态补丁并回到 Design：要么改成声明式、闭合、可生成穷举矩阵的有限规则，要么缩小静态证明范围，把组合行为交给真实 capability、fault/live tests 与 different-actor source review。控制者不得把“再补最后一个例外”自行豁免于此门。

## 2. 当前证据入口

首个本地、未签名 macOS arm64 Pi-native 纵切候选固定为 `248b3316651e681d9d4c78f81bec0c84a4cc822c`。[`Freeze handoff`](.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/freeze-first-production-candidate.md) 记录同一 SHA 的 source/review chain、完整 build/typecheck/quality/test、真实 Chromium/Electron、MiMo/DeepSeek Pi journeys、fault matrix、实际 ZIP/process tree、legal/SBOM/glyph 与脱敏结果；[`different-actor review`](.omp-flow/tasks/08-04-ui-chassis-takeover/reviews/freeze-first-production-candidate.md) 的结论为 `PASS`。该 checkpoint 接受 Stage 0–3 的当前纵切，不等于签名、notarization、Windows/Linux、Package、外部 Engine、Remote 或 V1 完成。

[`research/source-review.md`](research/source-review.md) 仍单独拥有 fixed imported tree 的 exact comparison、frozen install、build、typecheck、unchanged baseline 与复验触发器。历史 baseline evidence 不得改写成当前候选 proof，当前候选 proof 也不得扩张为未覆盖的平台或产品结论。

首个真实 headless Pi Package checkpoint 固定为 `16f14d188e38134f6f45c46bfcb57ff36c1e8565`。其 [归档 Bundle](.omp-flow/tasks/archive/2026-08/08-06-pi-package-lifecycle/) 保存 exact source/rights、Product-owned stage/current/LKG/quarantine/lease、Pi-native ResourceLoader/private state、fault recovery、真实 MiMo/DeepSeek 与实际 macOS arm64 ZIP/ASAR 证据，以及 different-actor `PASS`。该 checkpoint 只支持当前 Package 纵切，不证明完整 Catalog/compatibility taxonomy 或后续阶段。

首个真实 OpenCode external-Engine checkpoint 固定为 `02979ff7488e0491b04f29876b253de3b96540b1`。其 [归档 Bundle](.omp-flow/tasks/archive/2026-08/08-06-opencode-external-engine/) 保存 Product protocol/store v2 迁移、literal Pi/OpenCode gateway、官方 ACP SDK、truthful next-Run Workbench、故障/恢复矩阵，以及同 SHA 的 OpenCode observed-delivery 与 Pi accepted-operation production journeys；两条旅程均证明 sibling Engine 调用为零、attempt 为一、replay/fallback 为零，different-actor Review r9 结论为 `PASS`。该 checkpoint 只支持 F-13 的当前外部 Engine 纵切，不证明 Remote、发行或通用多 Engine framework。

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

## 7. 后续顺序与复用边界

已接受的 headless Package 与 external-Engine checkpoints 是后续施工输入，不重复建设。Product truth consolidation 完成后，剩余阶段按下表顺序推进：

| 阶段 | 默认复用的现有基座 | 只补的 OmniMind 差异 | 禁止重造 | 主要 proof |
| --- | --- | --- | --- | --- |
| Product truth consolidation | 当前 SQLite/LevelDB、原子文件、锁、Package generation 与 owner 实现 | sole authority、direct first-public boundary、稳定职责拆分和可证明净减 | 通用 migration/restore 平台、第二状态轨、无界语义 meter | 精确 destructive allowlist、真实 fault/race tests、不同 actor source review |
| F-12 完整 Package surface | 已接受的 headless lifecycle、现有 Catalog/Package UI、stage/current/LKG/lease | Curated/Verified 与 Native/Bridged UI/PTY/Unsupported 的真实分类、失败回到 LKG | 第二 marketplace、第二 loader、热更新 active generation | compatibility/update/fault matrix 与真实 Package journeys |
| F-14–F-16 File/Remote/permissions | Synara File tree/search/edit、Viewer、Diff/Changes、Terminal/PTY、Git 与现有 Remote 入口 | observed-version writer admission、一个真实 SSH authority、断连恢复、policy 与 enforcement truth | 新文件浏览器、编辑器、Diff、Terminal、Git 客户端或远端状态权威 | Git/concurrency tests、真实 SSH journey、deny-side-effect/security audit |
| F-17 质量闭合 | 现有 Conversation/stream/output、scroll、CJK/i18n、accessibility 与性能基座 | 100k Conversation、burst stream、large/unknown output、双语关键旅程和三平台预算的实测缺口 | 第二消息渲染管线、为 benchmark 重写产品、静态平台能力镜像 | profiler、dual-locale/a11y e2e、三平台 measured budgets |
| F-18 发行与终审 | 当前 Electron build/package/updater 与各平台 adapter | 签名/notarization、可信 feed、真实 artifact install/update/rollback、同 SHA 审计 | 第二 build/updater pipeline、平台行为假镜像 | macOS/Windows/Linux artifact matrix、rollback 与 fresh completion audit |

上游 v0.6.7 之后已发现但尚未自动 adopted 的三项高价值输入——Explorer observed-version guarded editing、long-thread composer latency proof、Windows terminal polling——分别进入 F-14、F-17、F-18 的 source intake。它们现在只作为后续阶段的优先证据候选，不插队修改 Product truth；到达对应阶段时按 source-update gate 给维护者提交精确 commit/path/rights/disposition 清单。

每个阶段的产品含义仍由 architecture owner 定义；本表只规定施工依赖与复用边界。未经前一阶段真实 proof，不提前制造 Package marketplace、通用多 Engine framework、重型知识库或固定 Workflow designer。

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

Stage 0–3 已在 `248b3316651e681d9d4c78f81bec0c84a4cc822c` 形成并独立接受首个纵切候选；真实 headless Pi Package checkpoint 已在 `16f14d188e38134f6f45c46bfcb57ff36c1e8565` 形成并独立接受；真实 OpenCode external-Engine checkpoint 已在 `02979ff7488e0491b04f29876b253de3b96540b1` 形成并通过 different-actor Review。

进入 Remote 前，当前唯一 bounded checkpoint 固定为 Product truth consolidation 与 direct first-public rebuild：在 Desktop、Product Service 与 Native Host 停止后，只对 canonical 默认 `~/.omnimind` 中逐项证明为 pre-baseline 的旧 Product、Automation/service、OmniMind Web-draft 和重复/过期 Package 状态执行精确删除，由当前 owner 直接创建 first-public state；不创建 backup、migration、restore 或双轨兼容，并严格排除 credential、当前 canonical Package generation、Pi-native state、attachments、外部 ResourceRef、用户 workspace、Git、全局配置、其他 home 与未知路径。同时确立 Product Service 的唯一 Package-root authority，按稳定职责拆分 `ProductControlPlane`，并证明 production code 与概念复杂度实质净减。完成并独立接受该 checkpoint 后才进入文件/Diff/Terminal/Artifact 与真实 Remote target；不得提前扩建 Marketplace、通用多 Engine framework 或三平台发行，也不重复未触发的 unchanged baseline smoke。

该 checkpoint 同样受 Synara-first 复用门与治理工具止损门约束：它只允许收口 Product authority、first-public 行为和职责边界，不授权重写已采用的 Workbench 能力，也不允许 complexity meter 继续通过逐个 AST 形态扩张来替代 B1 的真实 capability、fault tests 与源码审查。
