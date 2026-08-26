# `@omnimind/om-ask`：exact lineage、P1–P7 与更新反证

> 固定观察日期：2026-08-25
>
> 本文是 package-specific evidence owner，只保存 `@omnimind/om-ask` 的 exact lineage、减法 fork 边界、P1–P7 patch inventory、作者回归、stop-loss 和 revalidation trigger。它不定义公共 Gate，不维护当前分支、安装、发布或下一动作。

未来 intake 先读根 [`SOURCE-INTAKE.md`](../SOURCE-INTAKE.md) 与 [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md)，再只用本文回答 Ask 的 package-specific delta。canonical 产品合同、UI 和生命周期认知唯一见 [`omnimind-ask-user-cognition.md`](omnimind-ask-user-cognition.md)；exact production adoption 只由根 [`source-adoptions.json`](../source-adoptions.json) 决定。

## 1. 固定来源与角色

| 角色                         | Exact identity                                                                                                           | 用途                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| conditional runtime lineage  | `@mrclrchtr/supi-ask-user@5.0.0`；`mrclrchtr/supi@ce8af5f57304ad114319aa75c00920f029ceb8e7/packages/supi-ask-user`       | 当前减法 fork 的 controller/domain 来源；禁止 direct install    |
| OmniMind fork                | `@omnimind/om-ask@5.0.0-omnimind.1`                                                                                      | bundled OmniMind Agent Ask Tool；source-adopted private package |
| feasibility checkpoint       | `a96c60256bd6e391af57f4d2994b4a12d32aa6a5`                                                                               | 证明减法 fork 可行的固定观察                                    |
| source activation checkpoint | `36e3bec7e789122c731028c1a8b791a68a6c1fea`                                                                               | 证明 composition/activation 形状的固定观察                      |
| primary UX/test donor        | `@geoqiao/pi-ask@1.3.0`；`eko24ive/pi-ask` ancestry；commit `26496c809870e349429bc2cae72d61b46d0e2bc3`                   | 只提供 UX 与 regression insight，不承担 runtime lineage         |
| bounded donors               | `@pi9/ask@0.4.2`、`pi-ask-user@0.14.0`、`@qmahyar/pi-ask@1.4.0`、`pi-tian-ask-user@1.0.0`                                | lifecycle、compatibility、correctness tests 与 sentinel 反证    |
| Pi barrier                   | `@earendil-works/pi-agent-core@0.84.2` patch；SHA-256 `c63f6877299935fd9ee85c05b81d9e3f571f640704ff85a7f8e03209620e8e78` | same-turn preflight barrier；upstream 等价能力出现后删除        |

固定 artifact 事实：source/package 声明 MIT；supi npm integrity 为 `sha512-uBlvlXTvSrdvTvvdbpapwVwA4I3DMcIaHSGe18mtd4KdWAhd36yY1UwGvAbFXcS2NvJ18VIkaJpi112CSoabJQ==`，shasum 为 `cabb06df40ab95be1a67b4f3b32c83bc257ea38a`，tgz SHA-256 为 `d687d4d448cc115a67ceb473b8e9ceeb56dddb047901b1f2daa05d6ae0cb300e`。当时 artifact 缺失 LICENSE/NOTICE，因此 fork distribution 必须自行闭合法定文本；未来 source/artifact 变化要重新核验，不能继承这些 hash。

本文中的 commit、测试数量和状态只绑定上述历史观察，不证明今天的 HEAD、shipped bytes、安装 App 或 Release。

## 2. 当前减法 fork 的不可丢保证

未来更新默认积极吸收成熟 UX、bugfix、作者测试、a11y、lifecycle 和 security hygiene，但必须保护：

- 没有题目/选项的人为产品上限；
- single/multi、Preview、recommendation、selection 与 freeform 正交；
- 永远存在自由表达出口，且原文不 trim、不 Unicode rewrite、不静默归并；
- recommendation 只是 metadata，不预选、不预填；
- Ask 与 Approval 分离，不能从选项推断权限；
- Ask 等待期间 same-turn sibling side effect 被阻断；
- submit/cancel/abort/timeout/no-UI/reload/restart 都有真实 terminal 与 late-settlement fence；
- Pi Tool/Session 拥有执行 promise，Product owner 拥有 canonical pending interaction、Composer/Timeline projection 与 receipt；
- provenance 来自 exact registry winner/source token，不由 tool name 猜测；
- stock Pi、AgentGateway 和 cross-Engine 不自动获得该 fork；
- package 不引入第二 Settings、config database、slash command、skill、notification、remote bus、TUI widget 或 recovery owner。

若候选恢复 question cap、关闭 freeform、把 single/multi/preview 混成互斥 type、用模型 authored `自定义` sentinel、no-UI 时猜答案、重启后伪造 vanished promise、process-global request/timer/listener，或把 Ask 分发给所有 Engine，默认 disposition 是 decline；若维护者要改变产品结果，必须按公共 decision surface 重新裁决。

## 3. Source / shipped / activated 基线

| Surface                                                                      | Source retained                             | Root export / shipped intent     | Runtime activation          | Owner                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------- | --------------------------- | --------------------------------------------- |
| controller、normalize、types、lock、structured result、Host-neutral kernel   | 是，按 exact upstream module 保留或 adapted | 只由 product `api.ts` 可达图带出 | bundled Ask factory 使用    | fork maintenance / Pi Session                 |
| author tests 与 donor regressions                                            | 是                                          | 不进入 runtime                   | 不激活                      | source maintenance                            |
| upstream TUI、transcript、supi-core、config、events、timer、terminal helpers | 删除或仅作历史证据                          | 否                               | 否                          | canonical Workbench / Product / Pi owner 替代 |
| upstream registration、schema、prompt guidance                               | 不作为运行时 owner                          | 否                               | 否                          | OmniMind tool definition + Pi Registry        |
| slash commands、settings、notifications、remote/recovery lifecycle           | 否                                          | 否                               | 否                          | 明确不采用                                    |
| canonical Question UI、Timeline receipt                                      | 不在 fork 内                                | OmniMind App                     | Presenter/provenance 成立时 | Workbench / Product State                     |

包构建必须先清理该 package 的精确 `dist`，防止旧 declaration/JavaScript 冒充当前发行面。controller/kernel/normalize/result 与 donor comments/`needs_discussion` 可以留在 source/测试图中，但不能无意重新进入根 export。

“没有入口按钮”不能证明未激活；未来更新仍要检查 import、registration、listener、timer、filesystem writer、network channel 与 process singleton。

## 4. P1–P7 patch inventory

每轮更新只记录候选相对这些 seam 的 delta：`keep / rewrite / delete`、理由、作者回归、OmniMind falsifier 与新增责任。若需要 P8，说明为什么 P1–P7 和既有 owner 都无法承担、全链影响、长期成本与回滚；维护者决定前不实施。

### P1 — Identity and product profile

保护 fork identity、bundled-only registration、compatible presenter + exact product provenance 双门，以及零 TUI/commands/skills/settings/config/notifications/remote ambient activation。记录 source retained / shipped / activated 三层，不把 fork 变成 direct-installed upstream package。

### P2 — Canonical contract and freedom invariants

保护：question/option 无产品 cap；单选 sentinel `自定义` / `输入自己的答案`，多选 sentinel `自定义` / `补充自己的答案`；selection 与 `customText` 独立；single replacement、multi coexistence、lossless freeform；recommendation 不预选；`required` 真正 enforce；new field 全链兑现。transport/security guard 不能反向成为 prompt guidance cap。

### P3 — Structured Host seam

rich request/answer/status 必须无损穿过 Pi → canonical event → UI → settlement；abort signal、request identity 与 opaque attempt/fence token 保持稳定。primitive/RPC fallback 不得用于 product Ask；UI unavailable 时 fail closed；模型不能写入或猜测 provenance/fence token。

### P4 — Canonical Workbench projection

Ask 使用 shared Composer/Question card，不恢复 package TUI 或第二私有 panel。保护 direct submit、显式 Preview、recommendation、sentinel、Cancel、keyboard/IME/a11y/reduced-motion/overflow 与 zh-CN/en。custom 输入在 sentinel row 内展开；自由回答属于 Question card，不把主 Composer 变成 answer owner。

### P5 — Lifecycle and same-turn barrier

保护 `executionMode: sequential`、Ask-first preflight、Ask 前后未执行 siblings 作废、回答后新 continuation、submit/cancel/abort/explicit-timeout/ui-unavailable/stale terminal、validation rejection 非 terminal、late/double settlement fence、two-Thread isolation、restart 不伪造 promise、timer/listener 精确清理。

### P6 — Truthful result and context

模型只收到 selected decisions 与 exact `customText`；unknown/unselected alternatives 不冒充答案。selected-only rewrite 精确定位 product-owned call，Provider serialization 保留 IDs/原文，rewrite 失败 fail closed，token 优化不创建第二 history owner。

### P7 — Provenance, collision and reload

保护 Pi Registry winner/sourceInfo、Product exact instance token、third-party same-name winner 无 product authority、reload/branch/resume/Session replacement 清理、old fence submission stale，以及 collision diagnostic 不使整个 Session fatal。

Patch 记录模板：

| Patch | Upstream delta | Keep / rewrite / delete | Author regression | OmniMind falsifier | New responsibility |
| ----- | -------------- | ----------------------- | ----------------- | ------------------ | ------------------ |
| P1–P7 |                |                         |                   |                    |                    |

## 5. 作者回归与最强反证

固定 feasibility 观察曾记录 upstream 9 suites / 152 tests、fork feasibility 5 / 61、当时 fork 6 / 71；其中 55 preserve/adapt、9 reverse、88 delete。数字只用于解释减法 fork 的来源结构，不能作为未来绿色阈值，也不能用 fork tests 替代作者测试。

每轮至少：

1. 建立 exact candidate 的作者测试 baseline，解释失败与删除；
2. 将 retained module/hunk 映射到 upstream module/test；
3. 对 P1–P7 命中项运行 focused fork/contract/lifecycle/UI falsifier；
4. 作者增加更强 regression 时优先吸收；作者删除关键生命周期测试时提高风险；
5. controller/normalize 持续大面积冲突、retained kernel 无法映射 upstream、或同一 seam 连续多轮冲突时，重新比较 lineage/fork，而不是继续堆 patch。

最强反证不是“上游版本更高”，而是候选已原生交付等价 Host-neutral seam、same-turn barrier、provenance 或 canonical product projection，从而证明某个本地 patch 可以删除。

## 6. 本 package 命中的风险标签

按 Pi profile 只读取并验证相关项：

- **R4 Engine-native / Host projection**：Host definition/execution 与 Pi registration/wire 不夺权；
- **R5 package UI / Workbench**：上游 TUI 只作行为与测试 donor；
- **R6 Prompt / Tool / Context**：schema、description、result、continuation 与 context rewrite 无损；
- **R7 Fork / patch lifecycle**：exact ancestry、P1–P7、reload、collision、rollback；
- **R8 Rights / distribution**：artifact legal-file 缺口、copied/adapted attribution、packaged byte scan。

只有候选新增网络、子进程或持久存储时才追加 R1/R2/R3，不能把未命中的风险变成固定测试税。

## 7. Claim-driven revalidation

按根 proof matrix 选择证据：

- 仅 source/artifact/rights 或 P1–P7 diff：exact diff、author/fork tests、document/adoption contract；
- registration、provenance、active set、reload/collision：真实 Pi loader/session focused integration；
- schema/result/context/same-turn continuation：diagnostic fixture；若 claim 涉及真实 Provider wire，再用匹配协议的最小 live probe；
- 跨 Provider 默认 Ask 体验：才优先覆盖 MiMo 与 DeepSeek，不把两次 schema call 写成两个完整 Composer journey；
- Composer presentation：focused browser/component/a11y + 必要时人工视觉；
- bundled bytes、task-only profile、shutdown/reopen：才对冻结的 exact pushed SHA 做一次 isolated packaged journey；
- Release/update authority：永远独立。

一次 live 鉴权失败、代理异常、模型未调用或 flaky test 先归因；不得写成静态 Provider blacklist、schema downgrade、自动重试 daemon 或通用补偿逻辑。

## 8. Revalidation triggers

只有以下变化需要重读本文并重放相应 patch：

- supi exact version/commit/artifact、license、maintainer、provenance、exports、dependency 或发布 workflow 改变；
- bounded donor 出现能删除 P1–P7 的成熟机制或更强 regression；
- Pi Core 改变 Extension API、tool scheduling、`ctx.ui`、RPC、sourceInfo、reload、Session replacement 或 context storage；
- canonical User Input、Workbench Question UI、Product pending lifecycle 或 Agent composition 改变；
- P1–P7 任一 seam 持续冲突、需要 P8，或作者测试大面积删除；
- 安全事件、supply-chain 异常，或维护者要求比较新 Ask 生态。

普通 a11y/CSS/i18n、既定 contract 下的局部 serialization bug、test fixture 修正和不改变 source decision 的内部整理，不重跑生态 intake；若它们暴露来源理解错误、新长期 patch、产品语义或安全边界变化，再升级。

Todo、Web Access 与 Approval 各有独立 owner；Synara exact source 只走 Synara profile；普通 Provider-native Question adapter 由其 runtime owner 处理，除非它改变 canonical Ask contract。

## 9. Stop-loss 与回滚

除公共/Pi profile stop conditions 外，出现以下任一项停止升级：

- P1–P7 无法容纳新增长期责任；
- same-turn side-effect barrier、restart stale 或 late settlement 无法证明；
- 新 field 在 schema、Host seam、UI、result 任一层 silent loss；
- retained runtime kernel 不再映射 upstream modules/tests；
- direct dependency、install hook、native binary 或 network behavior 未审计；
- package 想重新拥有 Product pending state、Workbench UI、permission 或 recovery；
- fork divergence 已需要永久 rebase framework 或第二 lifecycle platform。

最小回滚单位是一个 fork revision + 一个 composition factory：回到上一 adopted fork，canonical UI/store 不切回第二系统，新 pending interaction 以 unavailable/stale 收口，lock/dependency 只回滚本轮闭包，不建立 Ask 数据迁移平台。

## 10. 固定证据摘要

```yaml
manual: pi-ask-user-intake
role: package_specific_evidence_only
general_gate_authority: SOURCE-INTAKE.md
pi_profile_authority: PI-ECOSYSTEM-INTAKE.md
product_truth: research/omnimind-ask-user-cognition.md
conditional_runtime_lineage:
  package: "@mrclrchtr/supi-ask-user@5.0.0"
  commit: ce8af5f57304ad114319aa75c00920f029ceb8e7
  direct_install: forbidden
  fork_shape: subtractive_not_narrow
current_fork_snapshot:
  package: "@omnimind/om-ask@5.0.0-omnimind.1"
  feasibility_commit: a96c60256bd6e391af57f4d2994b4a12d32aa6a5
  activation_commit: 36e3bec7e789122c731028c1a8b791a68a6c1fea
  runtime_dependencies_at_observation: 0
  retained_lineage_distribution: source_and_author_tests_only_not_root_api_or_dist
pi_barrier:
  package: "@earendil-works/pi-agent-core@0.84.2"
  patch_sha256: c63f6877299935fd9ee85c05b81d9e3f571f640704ff85a7f8e03209620e8e78
  delete_when: upstream_provides_equivalent_preflight_barrier
patch_inventory:
  [P1_identity, P2_contract, P3_host_seam, P4_workbench, P5_lifecycle, P6_result, P7_provenance]
rollback: one_fork_revision_plus_one_composition_factory
```
